(function () {
  const textFields = ["textX", "textY", "textWidth", "headingSize", "subheadingSize", "bodySize"];

  function cleanCss(value = "") {
    return String(value).replace(/[;"<>]/g, "").trim();
  }

  function cssLength(value = "") {
    const clean = cleanCss(value);
    if (!clean) return "";
    if (/^-?\d+(\.\d+)?$/.test(clean)) return `${clean}px`;
    if (/^-?\d+(\.\d+)?(px|rem|em|%|vw|vh)$/i.test(clean)) return clean;
    if (/^clamp\(/i.test(clean)) return clean;
    return "";
  }

  function textStyleVars(slide) {
    const styles = [];
    const values = {
      "--text-x": cssLength(field(slide, "textX")),
      "--text-y": cssLength(field(slide, "textY")),
      "--text-width": cssLength(field(slide, "textWidth")),
      "--heading-size": cssLength(field(slide, "headingSize")),
      "--subheading-size": cssLength(field(slide, "subheadingSize")),
      "--body-size": cssLength(field(slide, "bodySize"))
    };
    Object.entries(values).forEach(([name, value]) => {
      if (value) styles.push(`${name}: ${value}`);
    });
    return styles;
  }

  const previousSlideStyle = window.slideStyle || slideStyle;
  window.slideStyle = function slideStyleWithTextControls(slide) {
    const original = previousSlideStyle(slide);
    const extra = textStyleVars(slide);
    if (!extra.length) return original;
    const extraText = extra.join("; ");
    if (!original) return ` style="${escapeHtml(extraText)}"`;
    return original.replace(/"$/, `; ${escapeHtml(extraText)}"`);
  };
  slideStyle = window.slideStyle;

  const previousLabelFor = window.labelFor || labelFor;
  window.labelFor = function labelForWithTextControls(key) {
    return ({
      textX: "Text horizontal position, e.g. -40 or 5%",
      textY: "Text vertical position, e.g. 30 or -5%",
      textWidth: "Text box width, e.g. 720 or 45%",
      headingSize: "Heading size, e.g. 72",
      subheadingSize: "Subheading size, e.g. 34",
      bodySize: "Body text size, e.g. 24"
    })[key] || previousLabelFor(key);
  };
  labelFor = window.labelFor;

  const previousEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithTextControls(slide) {
    let html = previousEditorForm(slide);
    if (!slide || html.includes('data-field="textX"')) return html;
    const controls = `
      <div class="form-grid two text-controls-grid">
        ${textFields.map((key) => `
          <label>${labelFor(key)}
            <input data-field="${key}" value="${escapeHtml(field(slide, key))}">
          </label>
        `).join("")}
      </div>
    `;
    html = html.replace('<div class="upload-row">', `${controls}<div class="upload-row">`);
    return html;
  };
  editorForm = window.editorForm;

  if (route() === "/admin") {
    renderAdmin();
  }
})();
