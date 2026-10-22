/*
  POST BUILDER
  Builds the outline of a post, one step at a time:
  1 pick a hook from the Hook Templates Library (data/hooks.json), 2 fill in its blanks,
  3 add the context or example, 4 add the reward (the lesson), then copy the outline.
  Nothing is generated; the partner writes every word. Drafts stay on their own phone.
*/
(function () {
  const { track, esc } = window.OS;
  const root = document.getElementById("builder");
  if (!root) return;

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  const BLANK = { step: 1, hook: null, fills: [], context: "", reward: "" };
  let draft = { ...BLANK, ...store.get("os_outline", {}) };
  let posts = store.get("os_outlines", []);
  let hooks = null;
  let browse = { type: "", q: "", shown: 40 };

  const STEPS = 4;
  const COPY_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const SEARCH_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- Hooks ---------- */
  const pieces = (t) => t.split(/(\[[^\]]+\])/).filter(Boolean);
  const blanks = (t) => pieces(t).filter((p) => p.startsWith("["));
  const slot = (p) => `<mark class="b-slot">${esc(p.slice(1, -1))}</mark>`;
  const allFilled = () => draft.hook && blanks(draft.hook.t).every((_, i) => (draft.fills[i] || "").trim());

  function filledHook() {
    if (!draft.hook) return "";
    let i = 0;
    return pieces(draft.hook.t).map((p) => (p.startsWith("[") ? (draft.fills[i++] || "").trim() || p : p)).join("");
  }

  // The chosen hook, blanks in ember until the partner fills them in.
  function hookPreview() {
    let i = 0;
    return pieces(draft.hook.t)
      .map((p) => {
        if (!p.startsWith("[")) return esc(p);
        const v = (draft.fills[i++] || "").trim();
        return v ? `<mark class="b-fill">${esc(v)}</mark>` : slot(p);
      })
      .join("");
  }

  async function loadHooks() {
    if (!hooks) hooks = await fetch("data/hooks.json").then((r) => r.json());
    return hooks;
  }

  const options = (key) => [...new Set(hooks.map((h) => h[key]))].sort();

  function hookList() {
    if (!hooks) return `<p class="b-empty">Loading hooks…</p>`;
    const q = browse.q.trim().toLowerCase();
    const list = hooks.filter((h) => (!browse.type || h.k === browse.type) && (!q || h.t.toLowerCase().includes(q)));
    if (!list.length) return `<p class="b-empty">No hooks match. Try another word or filter.</p>`;
    return `
      <p class="label b-count">${list.length} ${list.length === 1 ? "hook" : "hooks"}</p>
      ${list.slice(0, browse.shown).map((h) => `
        <button class="b-hook press" data-b-pick="${hooks.indexOf(h)}">
          <span class="b-hook-t">${pieces(h.t).map((p) => (p.startsWith("[") ? slot(p) : esc(p))).join("")}</span>
          <span class="label">${esc(h.k)}</span>
        </button>`).join("")}
      ${list.length > browse.shown ? `<button class="btn press b-more" data-b-more>Show More Hooks</button>` : ""}`;
  }

  /* ---------- Outline ---------- */
  const outline = () => [["Hook", filledHook()], ["Context", draft.context.trim()], ["Reward", draft.reward.trim()]].filter(([, v]) => v);

  /* ---------- Steps ---------- */
  function progress() {
    return `
      <div class="b-progress" aria-label="Step ${draft.step} of ${STEPS}">
        <p class="label">Step ${draft.step} of ${STEPS}</p>
        <div class="b-bars">${Array.from({ length: STEPS }, (_, i) => `<i class="${i < draft.step ? "on" : ""}"></i>`).join("")}</div>
      </div>`;
  }
  const back = () => `<button class="b-back press" data-b-go="${draft.step - 1}">← Back</button>`;
  const next = (label, ready) => `<button class="btn btn-ember press b-next" data-b-go="${draft.step + 1}" ${ready ? "" : 'aria-disabled="true"'}>${label}</button>`;
  const hookLine = () => `<p class="b-hookline">${esc(filledHook())}</p>`;

  function stepHTML() {
    switch (draft.step) {
      case 1:
        return `
          ${progress()}
          <h2 class="b-q">Choose a hook.</h2>
          <p class="b-help">The first line of your post. Pick one that fits what you want to say. You'll fill in the blanks next.</p>
          <div class="b-filters">
            <label class="b-select"><span class="label">Type</span>
              <select data-b-filter="type"><option value="">All types</option>${hooks ? options("k").map((o) => `<option ${o === browse.type ? "selected" : ""}>${esc(o)}</option>`).join("") : ""}</select></label>
          </div>
          <label class="b-search">${SEARCH_ICON}<input type="search" data-b-search value="${esc(browse.q)}" placeholder="Search hooks" autocomplete="off" aria-label="Search hooks"></label>
          <div id="b-list">${hookList()}</div>`;
      case 2:
        return `
          ${progress()}
          <h2 class="b-q">Fill in the blanks.</h2>
          <p class="b-help">Make it about you and the people you're talking to.</p>
          <div class="b-chosen">
            <p class="label">${esc(draft.hook.k)} Hook</p>
            <p class="b-preview">${hookPreview()}</p>
            ${blanks(draft.hook.t).map((b, i) => `
              <label class="b-blank"><span class="label">${esc(b.slice(1, -1))}</span>
                <input data-b-blank="${i}" value="${esc(draft.fills[i] || "")}" placeholder="${esc(b.slice(1, -1))}" autocomplete="off"></label>`).join("")}
          </div>
          ${next("Next", allFilled())}
          <button class="b-back press" data-b-go="1">← Choose A Different Hook</button>`;
      case 3:
        return `
          ${progress()}
          <h2 class="b-q">Context or example.</h2>
          <p class="b-help">The story, example or moment that keeps people watching after your hook.</p>
          ${hookLine()}
          <textarea data-b-field="context" rows="5" placeholder="e.g. Last month I missed 9 of 30 workouts. Every night I told myself I'd figure it out in the morning.">${esc(draft.context)}</textarea>
          ${next("Next", draft.context.trim())}
          ${back()}`;
      case 4:
        return `
          ${progress()}
          <h2 class="b-q">The reward.</h2>
          <p class="b-help">The lesson. Answer the question your hook raised.</p>
          ${hookLine()}
          <textarea data-b-field="reward" rows="5" placeholder="e.g. I set my three critical tasks the night before. I haven't missed a morning since.">${esc(draft.reward)}</textarea>
          <button class="btn btn-ember press b-next" data-b-build ${draft.reward.trim() ? "" : 'aria-disabled="true"'}>Build My Outline</button>
          ${back()}`;
      default:
        return `
          <p class="label b-done">Done</p>
          <h2 class="b-q">Your outline.</h2>
          <div class="b-card b-film">
            ${outline().map(([k, v]) => `<div class="b-line"><p class="label">${k}</p><p>${esc(v)}</p></div>`).join("")}
            <button class="btn btn-ember press" data-b-copy>${COPY_ICON}Copy Outline</button>
          </div>
          <button class="btn press b-new" data-b-new>Start A New Post</button>
          <button class="b-back press" data-b-go="4">← Back</button>`;
    }
  }

  function render() {
    root.innerHTML = `
      <section class="head">
        <p class="label">Post Builder</p>
        <h1>Build Your Post.</h1>
      </section>
      <div class="b-stage">${stepHTML()}</div>
      ${draft.step === 1 && posts.length
        ? `<section class="block">
             <div class="block-head"><h2>My Outlines.</h2></div>
             <ul class="b-posts">${posts.map((p, i) => `
               <li><button class="press" data-b-load="${i}">
                 <span class="label">${esc(new Date(p.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</span>
                 <span>${esc(p.title)}</span>
               </button></li>`).join("")}</ul>
             <p class="b-note">Saved on this phone only.</p>
           </section>`
        : ""}`;
  }

  function go(step) {
    draft.step = Math.max(1, Math.min(5, step));
    if (draft.step > 1 && !draft.hook) draft.step = 1;
    save();
    render();
    root.closest(".panel")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = () => store.set("os_outline", draft);
  const setReady = (sel, ready) => {
    const b = root.querySelector(sel);
    if (b) ready ? b.removeAttribute("aria-disabled") : b.setAttribute("aria-disabled", "true");
  };

  function finish() {
    const entry = { at: Date.now(), title: filledHook(), draft: JSON.parse(JSON.stringify({ ...draft, step: 5 })) };
    posts = [entry, ...posts.filter((p) => p.title !== entry.title)].slice(0, 30);
    store.set("os_outlines", posts);
    track("build", "outline");
    go(5);
  }

  async function copy(button) {
    const text = outline().map(([k, v]) => `${k.toUpperCase()}: ${v}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = Object.assign(document.createElement("textarea"), { value: text });
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    track("copy", "outline");
    const label = button.innerHTML;
    button.textContent = "Copied";
    setTimeout(() => (button.innerHTML = label), 1600);
  }

  /* ---------- Events ---------- */
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.bSearch !== undefined) {
      browse.q = t.value;
      browse.shown = 40;
      return (root.querySelector("#b-list").innerHTML = hookList());
    }
    if (t.dataset.bBlank !== undefined) {
      draft.fills[+t.dataset.bBlank] = t.value;
      root.querySelector(".b-preview").innerHTML = hookPreview();
      setReady("[data-b-go='3']", allFilled());
    } else if (t.dataset.bField) {
      draft[t.dataset.bField] = t.value;
      setReady(t.dataset.bField === "context" ? "[data-b-go='4']" : "[data-b-build]", t.value.trim());
    } else return;
    save();
  });

  root.addEventListener("change", (e) => {
    const f = e.target.dataset.bFilter;
    if (!f) return;
    browse[f] = e.target.value;
    browse.shown = 40;
    root.querySelector("#b-list").innerHTML = hookList();
  });

  root.addEventListener("click", (e) => {
    const t = (sel) => e.target.closest(sel);
    if (t("[aria-disabled='true']")) return;
    if (t("[data-b-pick]")) {
      const h = hooks[+t("[data-b-pick]").dataset.bPick];
      if (draft.hook !== h) draft.fills = [];
      draft.hook = h;
      return go(2);
    }
    if (t("[data-b-go]")) return go(+t("[data-b-go]").dataset.bGo);
    if (t("[data-b-more]")) return (browse.shown += 40), (root.querySelector("#b-list").innerHTML = hookList());
    if (t("[data-b-build]")) return finish();
    if (t("[data-b-copy]")) return copy(t("[data-b-copy]"));
    if (t("[data-b-new]")) return (draft = { ...BLANK, fills: [] }), go(1);
    if (t("[data-b-load]")) return (draft = { ...BLANK, ...posts[+t("[data-b-load]").dataset.bLoad].draft }), go(5);
  });

  // The saved hook object isn't the same object as the loaded list's; re-link it by text.
  loadHooks().then(() => {
    if (draft.hook) draft.hook = hooks.find((h) => h.t === draft.hook.t) || draft.hook;
    render();
  });
  render();
})();
