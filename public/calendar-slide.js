(function () {
  const model = window.EskaCalendar;
  if (!model) return;
  if (!templates.some((template) => template.id === "calendar")) templates.push({ id: "calendar", name: "Calendar", category: "Events", description: "One to three months with colour-coded event dates and a short event list." });
  const fallbackMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };
  const baseRender = window.renderSlide || renderSlide;
  const baseEditor = window.editorForm || editorForm;
  const baseCreate = window.createSlideFromTemplate || createSlideFromTemplate;
  const baseBind = window.bindEditor || bindEditor;
  const heading = (text) => {
    const separator = text.lastIndexOf("\u00b7");
    return separator < 0 ? escapeHtml(text) : `${escapeHtml(text.slice(0, separator + 1))} <span>${escapeHtml(text.slice(separator + 1).trim())}</span>`;
  };
  function card(month, index) {
    const cells = month.cells.map((cell, cellIndex) => {
      if (!cell) return '<div class="calendar-blank" aria-hidden="true"></div>';
      const kinds = cell.types;
      let background = "";
      if (kinds.length === 1) background = model.types[kinds[0]];
      else if (kinds.length > 1) background = `linear-gradient(135deg,${kinds.map((kind, i) => `${model.types[kind]} ${i * 100 / kinds.length}% ${(i + 1) * 100 / kinds.length}%`).join(",")})`;
      return `<div class="calendar-day${kinds.length ? " calendar-event-day" : ""}${kinds.length > 1 ? " calendar-mixed" : ""}${kinds.length === 1 ? ` calendar-${kinds[0]}` : ""}" data-date="${cell.iso}" data-row="${Math.floor(cellIndex / 7)}"${background ? ` style="background:${background}"` : ""} title="${escapeHtml(cell.events.map((event) => `${event.type}: ${event.title}`).join("; "))}"><span>${cell.number}</span></div>`;
    }).join("");
    const events = month.events.slice(0, 6).map((event) => `<li style="--event-colour:${model.types[event.type]}"><span class="calendar-event-date">${escapeHtml(model.eventDate(event, month))}</span> <span aria-hidden="true">\u00b7</span> <strong>${escapeHtml(event.title)}</strong>${event.details ? `<span class="calendar-event-detail">, ${escapeHtml(event.details)}</span>` : ""}</li>`).join("");
    return `<article class="calendar-month" data-calendar-month="${month.year}-${String(month.month + 1).padStart(2, "0")}" data-calendar-index="${index}"><h2>${month.name} <small>${month.year}</small></h2><div class="calendar-weekdays" aria-hidden="true">${["M", "T", "W", "T", "F", "S", "S"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells}</div><div class="calendar-event-list" data-total-events="${month.events.length}"><ol>${events}</ol><p class="calendar-more"${month.events.length > 6 ? "" : " hidden"}>${Math.max(0, month.events.length - 6)} more events \u00b7 full calendar below</p>${month.events.length ? "" : '<p class="calendar-empty">No dates published yet</p>'}</div></article>`;
  }
  window.renderSlide = function (slide, preview = false) {
    if (slide?.template !== "calendar") return baseRender(slide, preview);
    const fields = slide.fields || {};
    const parsed = model.parse(fields.dateList);
    const start = model.validMonth(fields.calendarStartMonth) ? fields.calendarStartMonth : fallbackMonth();
    const months = model.months(start, fields.calendarMonthCount, parsed.events);
    return `<section class="slide slide-calendar${preview ? " preview-slide" : ""}" data-slide-id="${escapeHtml(slide.id)}" data-calendar-animation="${escapeHtml(slide.animation || "calendar-stagger")}" data-calendar-duration="${Number(slide.duration) || 18000}"><div class="calendar-canvas"><header class="calendar-header"><img class="calendar-logo" src="${escapeHtml(fields.logo || board.brand.logo)}" alt="ESKA logo"><h1>${heading(fields.heading ?? "Calendar")}</h1><div class="calendar-legend" aria-label="Event types">${Object.entries(model.types).map(([type, colour]) => `<span><i style="background:${colour}" aria-hidden="true"></i>${type[0].toUpperCase() + type.slice(1)}</span>`).join("")}</div></header><div class="calendar-months" style="--calendar-month-count:${months.length}">${months.map(card).join("")}</div><footer class="calendar-footer"><p>${escapeHtml(fields.calendarFooterLeft ?? "Full details & booking: members.eska.co.uk/calendar")}</p><p>${escapeHtml(fields.calendarFooterRight ?? "Times to be confirmed unless shown")}</p></footer><div class="calendar-bottom-bar" aria-hidden="true"></div></div></section>`;
  };
  renderSlide = window.renderSlide;
  window.createSlideFromTemplate = function (id) {
    if (id !== "calendar") return baseCreate(id);
    const start = fallbackMonth();
    const shown = model.months(start, 3);
    const year = shown[0].year === shown[2].year ? String(shown[0].year) : `${shown[0].year}\u2013${shown[2].year}`;
    return { id: uid(), template: "calendar", animation: "calendar-stagger", duration: 18000, visible: false, fields: { heading: `${year} at a glance \u00b7 ${shown[0].name.slice(0, 3)} \u2013 ${shown[2].name.slice(0, 3)}`, dateList: "", calendarStartMonth: start, calendarMonthCount: "3", calendarFooterLeft: "Full details & booking: members.eska.co.uk/calendar", calendarFooterRight: "Times to be confirmed unless shown", logo: board.brand.logo } };
  };
  createSlideFromTemplate = window.createSlideFromTemplate;
  window.editorForm = function (slide) {
    if (slide?.template !== "calendar") return baseEditor(slide);
    const f = slide.fields || {};
    const options = [["calendar-stagger", "Calendar entrance"], ["none", "No animation"], ...animations.filter(([id]) => !["calendar-stagger", "none"].includes(id))];
    return `<form class="edit-form calendar-edit-form"><div class="form-grid"><label>Template<select data-key="template">${templates.map((t) => `<option value="${t.id}"${t.id === "calendar" ? " selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}</select></label><label>Animation<select data-key="animation">${options.map(([id, label]) => `<option value="${id}"${slide.animation === id ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label><label>Duration ms<input type="number" min="4000" step="500" data-key="duration" value="${Number(slide.duration) || 18000}"></label><label class="check-row"><input type="checkbox" data-key="visible"${slide.visible !== false ? " checked" : ""}> Show on TV</label></div><label>Heading<input data-field="heading" value="${escapeHtml(f.heading ?? "")}"></label><div class="form-grid"><label>Start month<input type="month" data-field="calendarStartMonth" min="1900-01" max="9998-12" value="${escapeHtml(f.calendarStartMonth || fallbackMonth())}"></label><label>Months shown<select data-field="calendarMonthCount">${[1, 2, 3].map((count) => `<option value="${count}"${Number(f.calendarMonthCount || 3) === count ? " selected" : ""}>${count}</option>`).join("")}</select></label></div><label>Dates list<textarea data-field="dateList" rows="10" placeholder="2027-01-24 | competition | ESKA competition | The Dojo">${escapeHtml(f.dateList || "")}</textarea></label><p class="calendar-editor-hint">One event per line: YYYY-MM-DD[\u2013YYYY-MM-DD] | competition/course/grading | title | optional details. Put a middle dot before the heading's red month range. Dense months show a count of additional events.</p><div class="calendar-validation" role="status"></div><label>Left footer<input data-field="calendarFooterLeft" value="${escapeHtml(f.calendarFooterLeft ?? "Full details & booking: members.eska.co.uk/calendar")}"></label><label>Right footer<input data-field="calendarFooterRight" value="${escapeHtml(f.calendarFooterRight ?? "Times to be confirmed unless shown")}"></label><label>Logo image URL<input data-field="logo" value="${escapeHtml(f.logo || board.brand.logo)}"></label><div class="upload-row"><input id="mediaUpload" type="file" accept="image/*"><button id="applyToLogo" type="button" data-upload-target="logo">Use upload as logo</button><button class="danger" id="deleteSlide" type="button">Delete slide</button></div></form>`;
  };
  editorForm = window.editorForm;
  window.bindEditor = function (slide) {
    baseBind(slide);
    if (slide?.template !== "calendar") return;
    const validate = () => {
      const parsed = model.parse(slide.fields.dateList);
      const messages = [...parsed.errors];
      if (!model.validMonth(slide.fields.calendarStartMonth)) messages.unshift("Choose a valid start month.");
      const status = document.querySelector(".calendar-validation");
      if (status) { status.textContent = messages.join(" ") || `${parsed.events.length} valid event${parsed.events.length === 1 ? "" : "s"}.`; status.classList.toggle("is-error", messages.length > 0); }
    };
    document.querySelectorAll('.calendar-edit-form [data-field]').forEach((input) => {
      input.addEventListener("input", validate);
      // Native selects also save immediately on change in browsers that do not
      // emit input consistently; the existing binder owns saving and preview.
      if (input.tagName === "SELECT") input.addEventListener("change", () => input.dispatchEvent(new Event("input", { bubbles: true })));
    });
    validate();
  };
  bindEditor = window.bindEditor;

  function prepare(slide) {
    if (slide._calendarReady) return;
    slide._calendarReady = true;
    const canvas = slide.querySelector(".calendar-canvas");
    const stage = slide.closest("#screenStage");
    stage?.classList.add("calendar-stage");
    const fit = () => {
      canvas.style.setProperty("--calendar-scale", Math.min(slide.clientWidth / 1920, slide.clientHeight / 1080));
      const title = slide.querySelector(".calendar-header h1");
      let titleSize = 66;
      title.style.fontSize = `${titleSize}px`;
      while (title.offsetHeight > 124 && titleSize > 36) title.style.fontSize = `${--titleSize}px`;
      slide.querySelectorAll(".calendar-event-list").forEach((list) => {
        const rows = list.querySelector("ol"), more = list.querySelector(".calendar-more");
        if (!rows || !more) return;
        const total = Number(list.dataset.totalEvents);
        const syncMore = () => { const count = total - rows.children.length; more.hidden = count <= 0; more.textContent = `${count} more events \u00b7 full calendar below`; };
        syncMore();
        while (list.scrollHeight > list.clientHeight + 1 && rows.children.length) { rows.lastElementChild.remove(); syncMore(); }
      });
    };
    fit();
    document.fonts?.ready.then(() => { if (slide.isConnected) fit(); });
    const resize = new ResizeObserver(fit);
    resize.observe(slide);
    slide._calendarStop = () => {
      resize.disconnect();
      slide._calendarAnimations?.forEach((animation) => { animation.cancel?.(); animation.pause?.(); });
      if (!stage?.querySelector(".slide-calendar")) stage?.classList.remove("calendar-stage");
    };
    const mode = slide.dataset.calendarAnimation;
    if (["none", "calendar-none"].includes(mode) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scale = Math.min(1, Math.max(.1, Number(slide.dataset.calendarDuration) * .75 / 3000));
    const animations = [];
    slide._calendarAnimations = animations;
    const play = (elements, from, delay, duration, spring = false) => Array.from(elements).forEach((element, index) => {
      const wait = (typeof delay === "function" ? delay(element, index) : delay) * scale;
      const time = duration * scale;
      if (window.anime?.animate) {
        animations.push(window.anime.animate(element, { ...from, duration: time, delay: wait, ease: spring ? "outBack" : "outCubic" }));
      } else if (element.animate) {
        const initial = {}, final = {};
        Object.entries(from).forEach(([key, values]) => { initial[key] = values[0]; final[key] = values[1]; });
        animations.push(element.animate([initial, final], { duration: time, delay: wait, fill: "backwards", easing: spring ? "cubic-bezier(.34,1.56,.64,1)" : "cubic-bezier(.2,.8,.2,1)" }));
      }
    });
    const movement = mode.includes("left") ? { translate: ["-30px 0", "0 0"] } : mode.includes("right") ? { translate: ["30px 0", "0 0"] } : mode.includes("zoom") ? { scale: [.95, 1] } : { translate: ["0 24px", "0 0"] };
    play(slide.querySelectorAll(".calendar-month"), { opacity: [0, 1], ...movement }, (_, index) => index * 160, 650);
    play(slide.querySelectorAll(".calendar-day"), { opacity: [0, 1] }, (cell) => 400 + Number(cell.dataset.row) * 90 + Number(cell.closest(".calendar-month").dataset.calendarIndex) * 110, 300);
    play(slide.querySelectorAll(".calendar-event-day"), { scale: [.82, 1] }, (_, index) => 1150 + Math.min(index * 25, 300), 550, true);
    play(slide.querySelectorAll(".calendar-event-day"), { boxShadow: ["0 0 0 7px rgba(213,167,58,.25)", "0 0 0 0px rgba(213,167,58,0)"] }, 1800, 600);
    play(slide.querySelectorAll(".calendar-event-list li, .calendar-empty, .calendar-more:not([hidden])"), { opacity: [0, 1], translate: ["0 12px", "0 0"] }, (_, index) => 2050 + Math.min(index * 45, 550), 400);
  }
  const observer = new MutationObserver((records) => records.forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(".slide-calendar")) prepare(node);
      node.querySelectorAll(".slide-calendar").forEach(prepare);
    });
    record.removedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      [node, ...node.querySelectorAll(".slide-calendar")].forEach((slide) => slide._calendarStop?.());
    });
  }));
  observer.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll(".slide-calendar").forEach(prepare);
})();
