(function () {
  const { call, resources } = window.PORTAL;

  const TYPES = {
    replay: { tab: "replays", label: "Call Replay", heading: "Call Replays.", action: "Watch Replay" },
    tutorial: { tab: "tutorials", label: "Video Tutorial", heading: "Video Tutorials.", action: "Watch Tutorial" },
    guide: { tab: "guides", label: "PDF Guide", heading: "PDF Guides.", action: "Download" },
  };
  const TABS = { home: null, replays: "replay", tutorials: "tutorial", guides: "guide" };

  const pager = document.getElementById("pager");
  const sheet = document.getElementById("sheet");
  const sheetBody = document.getElementById("sheet-body");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const items = [...resources].sort((a, b) => b.date.localeCompare(a.date));
  const byId = Object.fromEntries(items.map((r) => [r.id, r]));
  const ofType = (t) => items.filter((r) => r.type === t);

  const parseDate = (d) => new Date(d + "T12:00:00");
  const shortDate = (d) => parseDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const longDate = (d) => parseDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const period = (s) => s.replace(/[.]$/, "") + ".";
  const fileName = (r) => r.file.split("/").pop();
  const guideMeta = (r) => ["PDF", r.pages ? r.pages + (r.pages === 1 ? " page" : " pages") : "", r.size].filter(Boolean).join(" · ");
  const meta = (r) => (r.type === "guide" ? guideMeta(r) : [shortDate(r.date), r.duration || (r.video ? "" : "Coming Soon")].filter(Boolean).join(" · "));

  const ICON = {
    play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    playMark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.8v16.4L20 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    bell: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------- Split-flap text ---------- */
  // Mono labels and numbers shuffle through characters, then settle left to right,
  // like a departure board. Mono type keeps the width fixed while they spin.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const DIGITS = "0123456789";
  const pick = (set) => set[(Math.random() * set.length) | 0];

  function flap(el, final = el.textContent) {
    el.dataset.final = final;
    if (reduceMotion) return void (el.textContent = final);
    const chars = [...final];
    const step = Math.min(34, 700 / chars.length);
    const hold = 240;
    const t0 = performance.now();
    let last = 0;
    (function tick(now) {
      if (!el.isConnected || el.dataset.final !== final) return;
      const t = now - t0;
      if (t >= hold + chars.length * step) return void (el.textContent = final);
      if (now - last > 45) {
        last = now;
        el.textContent = chars
          .map((c, i) => (t > hold + i * step ? c : /\d/.test(c) ? pick(DIGITS) : /[a-z]/i.test(c) ? pick(LETTERS) : c))
          .join("");
      }
      requestAnimationFrame(tick);
    })(t0);
  }

  const flapOnSight = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      flapOnSight.unobserve(e.target);
      flap(e.target);
    }
  }, { threshold: 0.2 });
  const armFlaps = (root) => root.querySelectorAll(".label, .flap").forEach((el) => !el.children.length && flapOnSight.observe(el));

  /* ---------- Pieces ---------- */
  function thumb(r, mini) {
    if (r.cover) return `<span class="thumb cover${mini ? " mini" : ""}"><img src="${esc(r.cover)}" alt="" loading="lazy"></span>`;
    return `
      <span class="thumb${mini ? " mini" : ""}${r.poster ? " has-poster" : ""}"${r.poster ? ` style="background-image:url('${esc(encodeURI(r.poster))}')"` : ""}>
        <span class="thumb-top">${mini ? "" : `<span class="label">${esc(TYPES[r.type].label)}</span>`}<img src="assets/bison-white.svg" alt=""></span>
        <span class="thumb-bottom">
          ${r.type === "replay" ? `<span class="label thumb-date">${esc(longDate(r.date))}</span>` : ""}
          <span class="thumb-title">${esc(period(r.title))}</span>
        </span>
        ${r.video ? `<span class="play">${ICON.playMark}</span>` : ""}
        ${r.duration ? `<span class="badge">${esc(r.duration)}</span>` : r.video ? "" : `<span class="badge">SOON</span>`}
      </span>`;
  }

  const miniCard = (r) => `
    <button class="mini-card press" data-open="${esc(r.id)}" aria-label="${esc(r.title)}">
      ${thumb(r, true)}
      ${r.type === "guide" ? `<h3>${esc(r.title)}</h3>` : ""}
      <span class="label">${esc(r.type === "guide" ? "PDF Guide · " + shortDate(r.date) : TYPES[r.type].label + " · " + shortDate(r.date))}</span>
    </button>`;

  const feedItem = (r) => `
    <button class="feed-item press" data-open="${esc(r.id)}" aria-label="${esc(r.title)}">
      ${thumb(r)}
      ${r.type === "replay" ? "" : `<span class="label">${esc(meta(r))}</span>`}
      <p class="desc">${esc(r.description)}</p>
    </button>`;

  const guideRow = (r) => `
    <li class="guide">
      <button class="guide-main press" data-open="${esc(r.id)}">
        <span class="guide-cover">${r.cover ? `<img src="${esc(r.cover)}" alt="" loading="lazy">` : ""}</span>
        <span class="guide-text"><h3>${esc(r.title)}</h3><span class="label">${esc(guideMeta(r))}</span></span>
      </button>
      <a class="icon-btn press" href="${esc(r.file)}" download="${esc(fileName(r))}" aria-label="Download ${esc(r.title)}">${ICON.down}</a>
    </li>`;

  /* ---------- Weekly call ---------- */
  // Offset between a time zone's wall clock and UTC at a given instant, in ms.
  function tzOffset(at, timeZone) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(at).map((x) => [x.type, +x.value]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
  }

  // Start of the call that is live now or coming up next.
  function nextCall(now) {
    const len = call.lengthMinutes * 60000;
    const wall = new Date(now.getTime() + tzOffset(now, call.timeZone)); // call-zone wall clock, read with UTC getters
    for (let d = -1; d <= 8; d++) {
      const c = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + d, call.hour, call.minute);
      if (new Date(c).getUTCDay() !== call.weekday) continue;
      let start = c - tzOffset(new Date(c), call.timeZone);
      start = c - tzOffset(new Date(start), call.timeZone);
      if (start + len > now.getTime()) return new Date(start);
    }
  }

  // Days, hours, minutes and seconds left, as eight digits.
  const countdown = (start) => {
    const secs = Math.max(0, Math.ceil((start - Date.now()) / 1000));
    return [Math.floor(secs / 86400), Math.floor((secs % 86400) / 3600), Math.floor((secs % 3600) / 60), secs % 60].map((n) => String(n).padStart(2, "0")).join("");
  };

  function callHTML() {
    const now = new Date();
    const start = nextCall(now);
    const live = start <= now;
    const weekday = start.toLocaleDateString("en-US", { timeZone: call.timeZone, weekday: "long" });
    const day = start.toLocaleDateString("en-US", { timeZone: call.timeZone, weekday: "long", month: "long", day: "numeric" });
    const local = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const localDiffers = tzOffset(start, Intl.DateTimeFormat().resolvedOptions().timeZone) !== tzOffset(start, call.timeZone);
    const digits = countdown(start);
    const unit = (i, name) => `
      <div class="unit">
        <div class="tiles"><i class="tile">${digits[i]}</i><i class="tile">${digits[i + 1]}</i></div>
        <span class="label">${name}</span>
      </div>`;

    return `
      <section class="call" id="call" data-live="${live}">
        ${live
          ? `<p class="label call-kicker live">Live Now</p>
             <h2 class="call-title">${esc(call.topic || "The Call Is On.")}</h2>`
          : `<p class="label call-kicker">Next Live Training</p>
             <h2 class="call-title">${esc(day)}.</h2>`}
        <p class="call-time">${esc(call.timeLabel)}</p>
        ${live ? "" : `<div class="board" role="timer" aria-label="Time until the next call">${unit(0, "Days")}${unit(2, "Hours")}${unit(4, "Min")}${unit(6, "Sec")}</div>`}
        ${call.topic && !live ? `<p class="call-topic">${esc(call.topic)}</p>` : ""}
        <button class="btn press remind" data-remind>${ICON.bell}Set A Reminder</button>
        <p class="call-where">Every ${esc(weekday)}. ${esc(call.where)}${localDiffers ? " " + esc(local) + " your time." : ""}</p>
      </section>`;
  }

  // Keep the board current. Only the tiles that change flip.
  function tickCall() {
    const el = document.getElementById("call");
    if (!el) return;
    const start = nextCall(new Date());
    if (String(start <= new Date()) !== el.dataset.live) {
      el.outerHTML = callHTML();
      return armFlaps(document.getElementById("call")), flipTiles(true);
    }
    flipTiles(false);
  }
  function flipTiles(all) {
    const start = nextCall(new Date());
    const digits = countdown(start);
    document.querySelectorAll("#call .tile").forEach((tile, i) => {
      if (all || (tile.dataset.final ?? tile.textContent) !== digits[i]) flap(tile, digits[i]);
    });
  }

  /* ---------- Views ---------- */
  function homeView() {
    const [r, ...rest] = items;
    const t = TYPES[r.type];
    const action =
      r.type === "guide"
        ? `<a class="btn btn-ember press" href="${esc(r.file)}" download="${esc(fileName(r))}">${ICON.down}Download</a>`
        : r.video
          ? "" // the play mark on the thumbnail is the action
          : `<span class="btn" aria-disabled="true">Coming Soon</span>`;

    return `
      <section class="head">
        <p class="label">OS Partner Program</p>
        <h1>Partner Resources.</h1>
      </section>
      ${callHTML()}
      <section class="block">
        <button class="latest press" data-open="${esc(r.id)}">
          <span class="label">Latest Drop · ${esc(shortDate(r.date))}</span>
          ${thumb(r)}
          ${r.cover ? `<span class="label">${esc(t.label)}</span><h2>${esc(period(r.title))}</h2>` : ""}
          <p class="desc">${esc(r.description)}</p>
        </button>
        ${action ? `<div class="latest-action">${action}</div>` : ""}
      </section>
      <section class="block">
        <div class="block-head"><h2>Recent Drops.</h2></div>
        <div class="scroller">${rest.slice(0, 6).map(miniCard).join("")}</div>
      </section>
      <section class="block">
        <div class="block-head"><h2>Browse.</h2></div>
        <ul class="rows">
          ${Object.entries(TYPES).map(([k, v]) => `
            <li><button class="press" data-tab="${v.tab}">${esc(v.heading.replace(".", ""))}<span class="label">${String(ofType(k).length).padStart(2, "0")}</span>${ICON.chev}</button></li>`).join("")}
        </ul>
      </section>
      <p class="label foot">Questions · help@operatorstandard.com</p>`;
  }

  function listView(type) {
    const list = ofType(type);
    const t = TYPES[type];
    return `
      <section class="head">
        <p class="label">${String(list.length).padStart(2, "0")} ${list.length === 1 ? "Drop" : "Drops"} · Newest First</p>
        <h1>${t.heading}</h1>
      </section>
      ${type === "guide"
        ? `<ul>${list.map(guideRow).join("")}</ul>`
        : `<section class="feed">${list.map(feedItem).join("")}</section>`}`;
  }

  /* ---------- Sheet ---------- */
  function embed(url) {
    let m;
    if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/))([\w-]{11})/)))
      return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&autoplay=1&playsinline=1` };
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/)))
      return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1${m[2] ? "&h=" + m[2] : ""}` };
    if ((m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/)))
      return { kind: "iframe", src: `https://www.loom.com/embed/${m[1]}?autoplay=1` };
    if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)))
      return { kind: "iframe", src: `https://drive.google.com/file/d/${m[1]}/preview`, open: `https://drive.google.com/file/d/${m[1]}/view` };
    if (/\.(mp4|m4v|mov|webm)(\?|#|$)/i.test(url)) return { kind: "video", src: url };
    return { kind: "iframe", src: url };
  }

  function sheetHTML(r) {
    const t = TYPES[r.type];
    const text = `
      <div class="sheet-text">
        <p class="label">${esc(t.label)} · ${esc(meta(r))}</p>
        <h2 id="sheet-title">${esc(period(r.title))}</h2>
        <p class="desc">${esc(r.description)}</p>
      </div>`;

    if (r.type === "guide")
      return `
        ${r.cover ? `<div class="sheet-cover"><img src="${esc(r.cover)}" alt=""></div>` : ""}
        ${text}
        <div class="sheet-actions">
          <a class="btn btn-ember press" href="${esc(r.file)}" download="${esc(fileName(r))}">${ICON.down}Download</a>
          <a class="btn press" href="${esc(r.file)}" target="_blank" rel="noopener">View</a>
        </div>`;

    let media = "";
    let openLink = "";
    if (r.video) {
      const e = embed(r.video);
      if (e.open) openLink = `<a class="btn press" href="${esc(e.open)}" target="_blank" rel="noopener">Open In Google Drive</a>`;
      media = `<div class="sheet-media">${
        e.kind === "video"
          ? `<video src="${esc(encodeURI(e.src))}"${r.poster ? ` poster="${esc(encodeURI(r.poster))}"` : ""} controls playsinline preload="metadata"></video>`
          : `<iframe src="${esc(e.src)}"${e.open ? " data-min-height=\"300\"" : ""} title="${esc(r.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`
      }</div>`;
    }
    const g = r.related && byId[r.related];
    return `
      ${media}
      ${text}
      <div class="sheet-actions">
        ${r.video ? "" : `<span class="btn" aria-disabled="true">Coming Soon</span>`}
        ${openLink}
        ${g ? `<a class="btn press" href="${esc(g.file)}" download="${esc(fileName(g))}">${ICON.down}Download The Guide</a>` : ""}
      </div>`;
  }

  // The weekly call as a repeating calendar event with a 30 minute alert.
  // The same event lives in call-reminder.ics; keep the two in step with `call` in content.js.
  function reminderHTML() {
    const start = nextCall(new Date());
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: call.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(start).map((x) => [x.type, x.value]));
    const pad = (n) => String(n).padStart(2, "0");
    const day = parts.year + parts.month + parts.day;
    const endMin = call.hour * 60 + call.minute + call.lengthMinutes;
    const google = "https://calendar.google.com/calendar/render?" + new URLSearchParams({
      action: "TEMPLATE",
      text: "OS Partner Call",
      dates: `${day}T${pad(call.hour)}${pad(call.minute)}00/${day}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`,
      ctz: call.timeZone,
      recur: "RRULE:FREQ=WEEKLY;BYDAY=" + ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][call.weekday],
      details: `Weekly partner training with ${call.host}. ${call.timeLabel}. Join in The Operator Standard app.`,
      location: "The Operator Standard app",
    });
    const goog = `<a class="btn btn-ember press" href="${esc(google)}" target="_blank" rel="noopener">Google Calendar</a>`;
    const apple = `<a class="btn press" href="call-reminder.ics">Apple Calendar</a>`;
    return `
      <div class="sheet-text">
        <p class="label">Weekly Partner Call · ${esc(call.timeLabel)}</p>
        <h2 id="sheet-title">Never Miss A Call.</h2>
        <p class="desc">Add the call to your calendar once. It repeats every week and your phone reminds you before it starts.</p>
      </div>
      <div class="sheet-actions">${goog}${apple}</div>`;
  }

  /* ---------- Sheet control ---------- */
  // Google Drive's player refuses to be shorter than 300px, so on a phone it overflows a
  // 16:9 frame and gets cropped. Lay it out at a size it accepts, then scale it down to fit.
  function fitEmbed() {
    const iframe = sheetBody.querySelector("iframe[data-min-height]");
    if (!iframe) return;
    const w = iframe.parentElement.clientWidth;
    const layoutW = Math.max(w, Math.ceil((+iframe.dataset.minHeight * 16) / 9));
    iframe.style.width = layoutW + "px";
    iframe.style.height = (layoutW * 9) / 16 + "px";
    iframe.style.transform = `scale(${w / layoutW})`;
  }
  window.addEventListener("resize", fitEmbed);

  function openSheet(html, centered) {
    sheet.classList.remove("closing");
    sheet.classList.toggle("center", centered); // video sits mid-screen, where the eyes are
    sheetBody.innerHTML = html;
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
    armFlaps(sheetBody);

    fitEmbed();
    const video = sheetBody.querySelector("video");
    if (!video) return;
    const frame = video.parentElement;
    // Fit the frame to the video once it plays, so vertical calls aren't boxed into 16:9.
    video.addEventListener("playing", () => video.videoWidth && (frame.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`), { once: true });
    video.play().catch(() => {});
  }

  // Emptying the sheet stops playback. Skip it if another item was opened before this event arrived.
  sheet.addEventListener("close", () => !sheet.open && (sheetBody.innerHTML = ""));
  // Bottom sheets slide back down before closing. The centered video pop-up just closes.
  function closeSheet() {
    if (!sheet.open || sheet.classList.contains("closing")) return;
    if (sheet.classList.contains("center") || reduceMotion) return sheet.close();
    const finish = () => {
      if (!sheet.classList.contains("closing")) return;
      sheet.classList.remove("closing");
      sheet.close();
    };
    sheet.classList.add("closing");
    sheet.addEventListener("animationend", (e) => e.target === sheet && finish(), { once: true });
    setTimeout(finish, 400); // in case the animation never reports back
  }
  sheet.addEventListener("click", (e) => e.target === sheet && closeSheet());
  sheet.addEventListener("cancel", (e) => (e.preventDefault(), closeSheet())); // Esc / system back
  document.getElementById("sheet-close").addEventListener("click", closeSheet);

  /* ---------- Sections ---------- */
  // All four sections sit side by side in one swipeable strip. Switching is a scroll,
  // not a navigation, so the browser's back button leaves the site as expected.
  const NAMES = Object.keys(TABS);
  pager.innerHTML = NAMES.map((n) => `<section class="panel" data-panel="${n}"><div class="panel-in">${TABS[n] ? listView(TABS[n]) : homeView()}</div></section>`).join("");
  const panels = [...pager.children];
  const tabButtons = [...document.querySelectorAll(".tabbar [data-tab]")];
  let current = 0;

  function markTab(i) {
    current = i;
    tabButtons.forEach((b) => (b.dataset.tab === NAMES[i] ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  }

  function goTo(name, instant) {
    const i = NAMES.indexOf(name);
    if (i < 0) return;
    if (i === current && !instant) return panels[i].scrollTo({ top: 0, behavior: "smooth" });
    pager.scrollTo({ left: i * pager.clientWidth, behavior: instant || reduceMotion ? "auto" : "smooth" });
    markTab(i);
  }

  let settle;
  pager.addEventListener("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => markTab(Math.round(pager.scrollLeft / pager.clientWidth)), 60);
  }, { passive: true });
  window.addEventListener("resize", () => pager.scrollTo({ left: current * pager.clientWidth }));

  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) return goTo(tab.dataset.tab);
    if (e.target.closest("[data-remind]")) return openSheet(reminderHTML(), false);
    const o = e.target.closest("[data-open]");
    if (o && byId[o.dataset.open]) openSheet(sheetHTML(byId[o.dataset.open]), byId[o.dataset.open].type !== "guide");
  });

  markTab(0);
  const start = location.hash.slice(1);
  if (NAMES.includes(start) && start !== "home") goTo(start, true);
  armFlaps(pager);
  flipTiles(true);
  setInterval(tickCall, 1000);
})();
