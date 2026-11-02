/*
  OS CONTACT TRACKER
  People a partner talked to about The Operator Standard, who's due for a follow-up,
  and what was said. Ported from the reference build (Internal/Contact Tracker Source).

  Local mode (default): saved in this browser only. No account, no server.
  Google mode: set GOOGLE_CLIENT_ID below. Each partner's list then lives in a
  spreadsheet called "OS Contact Tracker" on their own Google Drive; this page is
  just the easy face on top of it.

  Google setup (only for Google mode):
  1. Create a Google Cloud project. Enable the Google Sheets API and the Google Drive API.
  2. Create an OAuth 2.0 Client ID (Web application). Add https://os-partners.pages.dev
     to its Authorized JavaScript origins, then paste the client ID below.
  3. Scope used: drive.file only (the brief listed spreadsheets too; drive.file alone is enough
     to create and edit the tracker's own sheet, and it's non-sensitive, so no Google review).
  4. Sign-in is per session (no backend, no refresh tokens). An expired session
     just asks the partner to sign in again.
*/
(function () {
  // Google Cloud project "OS Contact Tracker" (matt@andyfrisella.com), client "Partner Portal". Empty = local mode.
  const GOOGLE_CLIENT_ID = "863288836678-pb95a79oht2vcvri5hlujv4ns5d63qj1.apps.googleusercontent.com";
  // Only "files this app creates" (non-sensitive), so Google doesn't require an app review.
  // It covers everything the tracker does: it only ever reads and writes the one sheet it creates.
  const SCOPES = "https://www.googleapis.com/auth/drive.file";
  const SHEET_TITLE = "OS Contact Tracker";
  const CONTACT_HEADERS = ["ID", "NAME", "1ST CONTACT", "7 DAY FOLLOW UP", "14 DAY", "LAST CONTACT DATE", "JOINED", "PHONE #", "SOCIAL HANDLE", "EMAIL", "HOW CONTACTED", "LETTER SENT", "NOTES"];
  const NOTE_HEADERS = ["ID", "DATE", "NOTE"];
  const KEY = "osTrackerV1";
  const SHEET_KEY = "osTrackerSheetId";
  // People deleted while signed out, so their sheet rows can be cleared at the next sign-in.
  const DELETED_KEY = "osTrackerDeletedV1";

  const root = document.getElementById("ct-tracker");
  if (!root) return;
  const esc = window.OS.esc;

  let people = load();
  let currentId = null;
  let showForm = false;
  let query = "";
  let status = "Saved on this phone.";
  let accessToken = null;
  let sheetId = null;
  let tokenClient = null;

  /* ---------- Storage & dates ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(people)); } catch {}
  }
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const todayISO = () => iso(new Date());
  function parseDate(s) {
    const p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function addDays(s, n) {
    const d = parseDate(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  const fmt = (s) => (s ? parseDate(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const current = () => people.find((x) => x.id === currentId);

  /* Where a person is in the follow-up cycle, and when they're next due. Joined people are never due. */
  function stage(p) {
    if (p.joined) return { label: "Joined", due: null, kind: "joined" };
    if (!p.f7) return { label: "7-day follow-up", due: addDays(p.firstContact, 7), kind: "step" };
    if (!p.f14) return { label: "14-day follow-up", due: addDays(p.firstContact, 14), kind: "step" };
    return { label: "Monthly check-in", due: addDays(p.lastContact, 30), kind: "step" };
  }

  function badge(p) {
    const st = stage(p);
    if (st.kind === "joined") return `<span class="ct-badge ct-joined">Joined</span>`;
    if (st.due <= todayISO()) return `<span class="ct-badge ct-due">${esc(st.label)} due ${esc(fmt(st.due))}</span>`;
    return `<span class="ct-badge ct-soon">${esc(st.label)} ${esc(fmt(st.due))}</span>`;
  }

  const meta = (p) => [p.howMet, "First talked " + fmt(p.firstContact), "Last contact " + fmt(p.lastContact), p.letterSent ? "Letter sent" : ""].filter(Boolean).map(esc).join(" · ");

  /* ---------- Views ---------- */
  function card(p) {
    return `
      <button class="ct-card press" data-ct-open="${esc(p.id)}">
        <span class="ct-name">${esc(p.name)}</span>
        <span class="ct-meta">${meta(p)}</span>
        ${badge(p)}
      </button>`;
  }

  function authHTML() {
    if (!GOOGLE_CLIENT_ID) return "";
    return accessToken
      ? `<div class="ct-auth"><button class="btn press" data-ct="sync">Sync Now</button><button class="btn press" data-ct="signout">Sign Out</button></div>`
      : `<div class="ct-auth"><button class="btn ${sheetLinked() ? "btn-ember " : ""}press" data-ct="signin">Sign In With Google</button></div>`;
  }

  function listHTML() {
    const today = todayISO();
    const week = addDays(today, 7);
    const q = query.trim().toLowerCase();
    const dueNow = [], dueWeek = [];
    people
      .slice()
      .sort((a, b) => ((stage(a).due || "9999") < (stage(b).due || "9999") ? -1 : (stage(a).due || "9999") > (stage(b).due || "9999") ? 1 : 0))
      .forEach((p) => {
        const st = stage(p);
        if (!p.joined && st.due && st.due <= today) dueNow.push(p);
        else if (!p.joined && st.due && st.due <= week) dueWeek.push(p);
      });
    // Everyone: the full list, A to Z, including people who are also due above. Search filters it.
    const everyone = people.slice().sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    const found = q ? everyone.filter((p) => p.name.toLowerCase().includes(q)) : everyone;
    const section = (title, list, empty) => `
      <section class="ct-section">
        <div class="block-head"><h2>${title}</h2><p class="label">${String(list.length).padStart(2, "0")}</p></div>
        ${list.length ? list.map(card).join("") : `<p class="ct-empty">${empty}</p>`}
      </section>`;

    return `
      <section class="head">
        <p class="label">Contact Tracker</p>
        <h1>Follow Up.</h1>
        <p class="ct-intro">People you talked to. Who's due. What you said.</p>
        <p class="label ct-status" id="ct-status">${esc(status)}</p>
        ${authHTML()}
      </section>

      <button class="btn btn-ember press" data-ct="toggle-form">${showForm ? "Close" : "+ Add A Person"}</button>
      ${showForm ? `
        <form class="ct-form" id="ct-form">
          <label><span class="label">Name</span><input name="name" type="text" placeholder="e.g. Mike" autocomplete="off"></label>
          <label><span class="label">How we met</span><input name="how" type="text" placeholder="e.g. Gym, DM, crew call" autocomplete="off"></label>
          <label><span class="label">First talked</span><input name="date" type="date" value="${todayISO()}"></label>
          <label><span class="label">Phone (optional)</span><input name="phone" type="tel" placeholder="(555) 010-1234" autocomplete="off"></label>
          <label><span class="label">Email (optional)</span><input name="email" type="email" placeholder="name@example.com" autocomplete="off"></label>
          <label><span class="label">Social handle (optional)</span><input name="social" type="text" placeholder="@handle" autocomplete="off"></label>
          <label><span class="label">What they're chasing / what you talked about</span><textarea name="note" rows="4" placeholder="e.g. Wants to lose 30 lbs, says he has no time in the day."></textarea></label>
          <p class="ct-error" id="ct-error" role="alert"></p>
          <button class="btn btn-ember press" type="submit">Add Person</button>
        </form>` : ""}

      ${section("Due Now.", dueNow, "Nobody due right now. Nice.")}
      ${section("Due This Week.", dueWeek, "Nothing due this week.")}
      <section class="ct-section">
        <div class="block-head"><h2>Everyone.</h2><p class="label">${String(people.length).padStart(2, "0")}</p></div>
        <label class="ct-search"><span class="sr-only">Search by name</span><input id="ct-search" type="search" value="${esc(query)}" placeholder="Search by name" autocomplete="off"></label>
        <div id="ct-rest">${found.length ? found.map(card).join("") : `<p class="ct-empty">${people.length ? "No one matches that name." : "No one here yet. Add your first person above."}</p>`}</div>
      </section>

      <section class="ct-foot">
        <div class="ct-auth">
          <button class="btn press" data-ct="export">Download Backup</button>
          <label class="btn press ct-import">Import Backup<input type="file" accept="application/json" data-ct-import hidden></label>
        </div>
        <p class="ct-note">${GOOGLE_CLIENT_ID
          ? "Signed in, your list lives in a spreadsheet on your own Google Drive. This page is just the easy way to use it."
          : "Your list is saved on this phone, in this browser. No account, no server. Download a backup now and then so you never lose it."}</p>
        <p class="ct-note"><a href="privacy/" target="_blank" rel="noopener">Privacy policy</a></p>
      </section>`;
  }

  function detailHTML(p) {
    const contact = [p.phone, p.email, p.social].filter(Boolean).map(esc).join(" · ");
    return `
      <button class="ct-back press" data-ct="list">← Back to everyone</button>
      <section class="ct-detail">
        <h1 class="ct-dname">${esc(p.name)}</h1>
        <p class="ct-meta">${meta(p)}${contact ? `<br>${contact}` : ""}</p>
        ${badge(p)}

        <label class="ct-addnote"><span class="label">Add a note (what you talked about)</span>
          <textarea id="ct-note" rows="4" placeholder="What did they say? What happens next?"></textarea></label>
        <button class="btn btn-ember press" data-ct="note">Save Note</button>

        <div class="ct-row">
          <button class="btn press ${p.f7 ? "ct-done" : ""}" data-ct="f7">${p.f7 ? "7-Day Done ✓" : "7-Day Follow-Up Done"}</button>
          <button class="btn press ${p.f14 ? "ct-done" : ""}" data-ct="f14">${p.f14 ? "14-Day Done ✓" : "14-Day Follow-Up Done"}</button>
        </div>
        <div class="ct-row">
          <button class="btn press ${p.joined ? "ct-done" : ""}" data-ct="joined">${p.joined ? "Joined ✓ (Tap To Undo)" : "Mark Joined"}</button>
          <button class="btn press ${p.letterSent ? "ct-done" : ""}" data-ct="letter">${p.letterSent ? "Letter Sent ✓ (Tap To Undo)" : "Letter Sent"}</button>
        </div>

        <div class="block-head ct-notes-head"><h2>Notes.</h2></div>
        ${p.notes.length
          ? p.notes.slice().reverse().map((n) => `<div class="ct-notecard"><p class="label">${esc(fmt(n.date))}</p><p>${esc(n.text)}</p></div>`).join("")
          : `<p class="ct-empty">No notes yet.</p>`}

        <button class="ct-delete press" data-ct="delete">Delete this person</button>
      </section>`;
  }

  function render() {
    const p = current();
    root.innerHTML = p ? detailHTML(p) : listHTML();
  }

  function setStatus(msg) {
    status = msg;
    const el = document.getElementById("ct-status");
    if (el) el.textContent = msg;
  }

  const scrollTop = () => root.closest(".panel")?.scrollTo({ top: 0 });
  function showDetail(id) {
    currentId = id;
    render();
    scrollTop();
  }
  function showList() {
    currentId = null;
    render();
    scrollTop();
  }

  /* ---------- Actions ---------- */
  function addPerson(form) {
    const v = (k) => (form.elements[k].value || "").trim();
    if (!v("name")) {
      document.getElementById("ct-error").textContent = "Add a name first.";
      return form.elements.name.focus();
    }
    const date = v("date") || todayISO();
    const p = { id: uid(), name: v("name"), howMet: v("how"), firstContact: date, lastContact: date, phone: v("phone"), email: v("email"), social: v("social"), notes: [], f7: null, f14: null, joined: false, letterSent: false, _row: null };
    if (v("note")) p.notes.push({ date, text: v("note") });
    people.push(p);
    save();
    afterChange(p, null);
    showForm = false;
    showDetail(p.id);
  }

  function update(change) {
    const p = current();
    if (!p) return;
    change(p);
    save();
    afterChange(p, null);
    render();
  }

  function addNote() {
    const p = current();
    const text = (document.getElementById("ct-note").value || "").trim();
    if (!p || !text) return;
    const note = { date: todayISO(), text };
    p.notes.push(note);
    save();
    afterChange(p, note);
    render();
  }

  function deletePerson() {
    const p = current();
    if (!p || !confirm("Delete " + p.name + "?")) return;
    if (p._row) {
      if (accessToken && sheetId) clearRow(p._row);
      else rememberDeleted(p.id);
    }
    people = people.filter((x) => x.id !== p.id);
    save();
    showList();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(people, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "os-contact-tracker-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("bad file");
        people = data;
        save();
        render();
        alert("Imported " + data.length + " people.");
      } catch {
        alert("That file didn't look like a tracker backup.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Google Drive / Sheets sync ----------
     The spreadsheet on the partner's own Drive is the database. Every person is a row in
     Contacts; every note is a row in Notes. This browser's copy is only a cache. */
  function api(method, url, body) {
    return fetch(url, {
      method,
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((res) => {
      if (res.status === 401) {
        accessToken = null;
        render();
        setStatus("Your Google session ended. Sign in again.");
        throw new Error("unauthorized");
      }
      if (!res.ok) throw new Error("Google request failed: " + res.status);
      return res.json();
    });
  }
  const sheetsUrl = (range, suffix = "") => `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}${suffix}`;
  const valuesGet = (range) => api("GET", sheetsUrl(range));
  const valuesUpdate = (range, values) => api("PUT", sheetsUrl(range, "?valueInputOption=USER_ENTERED"), { range, values });
  const valuesAppend = (range, values) => api("POST", sheetsUrl(range, ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"), { values });

  // Find the partner's sheet (stored ID, else by name on Drive), or create it.
  function ensureSheetAndLoad() {
    setStatus("Finding your Drive sheet…");
    let stored = null;
    try { stored = localStorage.getItem(SHEET_KEY); } catch {}
    const check = stored
      ? api("GET", `https://sheets.googleapis.com/v4/spreadsheets/${stored}?fields=properties.title`).then(() => stored).catch(() => { try { localStorage.removeItem(SHEET_KEY); } catch {} return null; })
      : Promise.resolve(null);
    check
      .then((id) => {
        if (id) return id;
        const q = `name = '${SHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
        return api("GET", "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(q) + "&fields=files(id,name)&spaces=drive").then((res) => {
          if (res.files && res.files.length) return res.files[0].id;
          return api("POST", "https://sheets.googleapis.com/v4/spreadsheets", {
            properties: { title: SHEET_TITLE },
            sheets: [{ properties: { title: "Contacts" } }, { properties: { title: "Notes" } }],
          }).then((created) => {
            sheetId = created.spreadsheetId;
            return valuesUpdate("Contacts!A1", [CONTACT_HEADERS]).then(() => valuesUpdate("Notes!A1", [NOTE_HEADERS])).then(() => created.spreadsheetId);
          });
        });
      })
      .then((id) => {
        sheetId = id;
        try { localStorage.setItem(SHEET_KEY, id); } catch {}
        return loadFromSheet();
      })
      .catch(() => setStatus("Couldn't reach your Drive sheet. Your list is still saved on this phone."));
  }

  // Contacts rows become people; Notes rows become their history (matched by ID).
  // Pull the sheet in and merge it with this phone's copy:
  // - people added on this phone while signed out are added to the sheet
  // - changes and notes made here while signed out are sent up
  // - people deleted here while signed out are cleared from the sheet
  // - everything else comes from the sheet, which is the main copy
  function loadFromSheet() {
    setStatus("Syncing from your Drive sheet…");
    return valuesGet("Contacts!A1:Z1000").then((c) => {
      const rows = c.values || [];
      const loaded = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0]) continue;
        loaded.push({ id: r[0], name: r[1] || "", firstContact: r[2] || todayISO(), f7: r[3] || null, f14: r[4] || null, lastContact: r[5] || r[2] || todayISO(), joined: r[6] === "Yes", phone: r[7] || "", social: r[8] || "", email: r[9] || "", howMet: r[10] || "", letterSent: r[11] === "Yes", notes: [], _row: i + 1 });
      }
      return valuesGet("Notes!A1:C1000").then((n) => {
        const fromSheet = Object.fromEntries(loaded.map((p) => [p.id, p]));
        (n.values || []).slice(1).forEach((nr) => {
          if (nr[0] && fromSheet[nr[0]]) fromSheet[nr[0]].notes.push({ date: nr[1] || "", text: nr[2] || "", _s: true });
        });

        const deleted = new Set(loadDeleted().map((d) => d.id));
        const toClear = loaded.filter((p) => deleted.has(p.id)).map((p) => p._row);
        let merged = loaded.filter((p) => !deleted.has(p.id));
        const toPush = [];
        people.forEach((lp) => {
          const sp = fromSheet[lp.id];
          const unsynced = (lp.notes || []).filter((x) => !x._s);
          if (!sp) {
            // Never reached the sheet: add it. (Synced before but gone from the sheet = deleted there.)
            if (!lp._row || lp._dirty) {
              lp._row = null;
              merged.push(lp);
              toPush.push(lp);
            }
          } else if (!deleted.has(lp.id)) {
            if (lp._dirty) {
              lp._row = sp._row;
              lp.notes = sp.notes.concat(unsynced);
              merged = merged.map((x) => (x.id === lp.id ? lp : x));
              toPush.push(lp);
            } else if (unsynced.length) {
              sp.notes = sp.notes.concat(unsynced);
              toPush.push(sp);
            }
          }
        });

        people = merged;
        save();
        render();
        // One at a time, so each new row number is known before the next append.
        return toClear
          .reduce((chain, row) => chain.then(() => clearRow(row)), Promise.resolve())
          .then(() => toPush.reduce((chain, p) => chain.then(() => pushAll(p)), Promise.resolve()))
          .then(() => {
            saveDeleted([]);
            save();
            setStatus("Synced. Your list lives in a spreadsheet on your Drive.");
          });
      });
    });
  }

  const personToRow = (p) => [p.id, p.name, p.firstContact, p.f7 || "", p.f14 || "", p.lastContact, p.joined ? "Yes" : "No", p.phone || "", p.social || "", p.email || "", p.howMet || "", p.letterSent ? "Yes" : "No", p.notes.length ? p.notes[p.notes.length - 1].text : ""];

  // Append the first time, update the same row after that.
  function pushPerson(p) {
    if (!accessToken || !sheetId) return Promise.resolve();
    if (p._row) return valuesUpdate(`Contacts!A${p._row}:M${p._row}`, [personToRow(p)]);
    return valuesAppend("Contacts!A1", [personToRow(p)]).then((res) => {
      const m = ((res.updates && res.updates.updatedRange) || "").match(/(\d+)\s*$/);
      if (m) p._row = parseInt(m[1], 10);
      save();
    });
  }
  // Notes are marked _s once they're in the sheet, so none are sent twice or lost.
  function pushNote(p, note) {
    if (!accessToken || !sheetId) return Promise.resolve();
    return valuesAppend("Notes!A1", [[p.id, note.date, note.text]]).then(() => (note._s = true));
  }

  // Send a person's row and any notes the sheet doesn't have yet.
  function pushAll(p) {
    return pushPerson(p)
      .then(() => (p.notes || []).filter((x) => !x._s).reduce((chain, note) => chain.then(() => pushNote(p, note)), Promise.resolve()))
      .then(() => {
        p._dirty = false;
        save();
      });
  }

  // Clear a row without shifting the others, so everyone else's row number stays valid.
  const clearRow = (row) => api("POST", `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Contacts!A${row}:M${row}:clear`, {}).catch(() => {});

  function loadDeleted() {
    try { return JSON.parse(localStorage.getItem(DELETED_KEY)) || []; } catch { return []; }
  }
  function saveDeleted(list) {
    try { localStorage.setItem(DELETED_KEY, JSON.stringify(list)); } catch {}
  }
  const rememberDeleted = (id) => saveDeleted(loadDeleted().concat([{ id }]));
  const sheetLinked = () => {
    try { return !!localStorage.getItem(SHEET_KEY); } catch { return false; }
  };

  // After any change: send it to the sheet if signed in, otherwise mark it to send at the next sign-in.
  function afterChange(p, note) {
    if (!p) return;
    p._dirty = true;
    save();
    if (!accessToken || !sheetId) {
      if (sheetLinked()) setStatus("Saved on this phone. Sign in to send it to your Drive sheet.");
      return;
    }
    setStatus("Syncing…");
    pushAll(p)
      .then(() => setStatus("Synced. Your list lives in a spreadsheet on your Drive."))
      .catch(() => setStatus("Sync failed. Your list is still saved on this phone. It will try again next time you sign in."));
  }

  function initGoogle() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) return setStatus("Google sign-in didn't work. Try again.");
        accessToken = resp.access_token;
        render();
        ensureSheetAndLoad();
      },
    });
  }

  function signOut() {
    if (accessToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
    status = "Signed out. Your list is still saved on this phone.";
    render();
  }

  /* ---------- Events ---------- */
  root.addEventListener("click", (e) => {
    const open = e.target.closest("[data-ct-open]");
    if (open) return showDetail(open.dataset.ctOpen);
    const a = e.target.closest("[data-ct]")?.dataset.ct;
    if (!a) return;
    if (a === "toggle-form") return (showForm = !showForm), render(), showForm && root.querySelector("#ct-form [name=name]")?.focus();
    if (a === "list") return showList();
    if (a === "note") return addNote();
    if (a === "f7") return update((p) => ((p.f7 = todayISO()), (p.lastContact = todayISO())));
    if (a === "f14") return update((p) => ((p.f14 = todayISO()), (p.lastContact = todayISO())));
    if (a === "joined") return update((p) => ((p.joined = !p.joined), p.joined && (p.lastContact = todayISO())));
    if (a === "letter") return update((p) => (p.letterSent = !p.letterSent));
    if (a === "delete") return deletePerson();
    if (a === "export") return exportData();
    if (a === "signin") return tokenClient && tokenClient.requestAccessToken(sheetLinked() ? { prompt: "" } : {});
    if (a === "signout") return signOut();
    if (a === "sync") return accessToken && loadFromSheet();
  });

  root.addEventListener("submit", (e) => {
    if (e.target.id !== "ct-form") return;
    e.preventDefault();
    addPerson(e.target);
  });

  // Search only redraws the "Everyone" list so the search box keeps focus while typing.
  root.addEventListener("input", (e) => {
    if (e.target.id !== "ct-search") return;
    query = e.target.value;
    const fresh = document.createElement("div");
    fresh.innerHTML = listHTML();
    document.getElementById("ct-rest").replaceWith(fresh.querySelector("#ct-rest"));
  });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.ctImport === undefined) return;
    if (e.target.files[0]) importData(e.target.files[0]);
  });

  /* ---------- Boot ---------- */
  if (GOOGLE_CLIENT_ID) status = sheetLinked() ? "Signed out. Sign in to sync with your Drive sheet." : "Google sync ready. Sign in to connect your Drive sheet.";
  render();
  if (GOOGLE_CLIENT_ID) {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = initGoogle;
    document.head.appendChild(s);
  }
})();
