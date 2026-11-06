(function () {
  const template = {
    id: "shop",
    name: "Karate Stock Display",
    category: "Shop / promotions",
    description: "Six editable product photos, names and prices in the familiar ESKA slide layout."
  };
  if (!templates.some((item) => item.id === template.id)) templates.push(template);

  const choices = [
    ["anime-fade", "Anime.js: Fade and rise"],
    ["anime-slide-left", "Anime.js: Slide from left"],
    ["anime-slide-right", "Anime.js: Slide from right"],
    ["anime-stagger", "Anime.js: Staggered cards"],
    ["anime-zoom", "Anime.js: Soft zoom"],
    ["anime-spring", "Anime.js: Spring pop"],
    ["anime-flip", "Anime.js: Card flip"],
    ["anime-blur", "Anime.js: Focus reveal"],
    ["anime-mask", "Anime.js: Mask reveal"]
  ];
  choices.forEach((choice) => {
    if (!animations.some(([id]) => id === choice[0])) animations.push(choice);
  });

  const baseRenderSlide = window.renderSlide || renderSlide;
  function renderShopSlide(slide, preview = false) {
    const animation = slide.animation || "anime-stagger";
    const fields = slide.fields || {};
    const photos = ["image", "imageLeft", "imageRight", "image4", "image5", "image6"];
    const productCards = photos.map((imageKey, index) => {
      const number = index + 1;
      const source = fields[imageKey] || "";
      const name = fields[`product${number}Name`] || `Product ${number}`;
      const price = fields[`product${number}Price`] || "Ask at reception";
      const photo = source
        ? `<div class="shop-product-image" data-image-key="${imageKey}">${mediaTag(source, name)}</div>`
        : `<div class="shop-product-image shop-image-empty" data-image-key="${imageKey}"><span>Add product photo</span></div>`;
      return `
        <article class="shop-product-card">
          ${photo}
          <div class="shop-product-copy">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(price)}</span>
          </div>
        </article>
      `;
    }).join("");
    return `
      <section class="slide slide-shop anim-${animation}${preview ? " preview-slide" : ""}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>
        ${brandHeader(slide)}
        <div class="shop-layout">
          <div class="shop-products">${productCards}</div>
          <div class="shop-heading">
            <p class="eyebrow">${escapeHtml(fields.eyebrow || "ESKA Club Shop")}</p>
            <h1>${escapeHtml(fields.heading || "Karate essentials")}</h1>
            <h2>${escapeHtml(fields.subheading || "Gear for every stage of your journey")}</h2>
            ${fields.body ? `<p class="body-copy">${escapeHtml(fields.body)}</p>` : ""}
          </div>
        </div>
      </section>
    `;
  }
  window.renderSlide = function (slide, preview = false) {
    return slide && slide.template === "shop" ? renderShopSlide(slide, preview) : baseRenderSlide(slide, preview);
  };
  renderSlide = window.renderSlide;

  const baseCreate = window.createSlideFromTemplate || createSlideFromTemplate;
  window.createSlideFromTemplate = function (templateId) {
    if (templateId !== "shop") return baseCreate(templateId);
    return {
      id: uid(),
      template: "shop",
      animation: "anime-stagger",
      duration: 16000,
      visible: false,
      fields: {
        eyebrow: "ESKA Club Shop",
        heading: "Karate essentials",
        subheading: "Gear for every stage of your journey",
        body: "",
        logo: board.brand.logo,
        image: "",
        imageLeft: "",
        imageRight: "",
        image4: "",
        image5: "",
        image6: "",
        product1Name: "KMA Master Gi", product1Price: "Add price",
        product2Name: "Coloured Belts", product2Price: "Add price",
        product3Name: "Tiny Tiger Trousers", product3Price: "Add price",
        product4Name: "Gum Shield", product4Price: "Add price",
        product5Name: "Blitz Mitts", product5Price: "Add price",
        product6Name: "Hand Pads", product6Price: "Add price"
      }
    };
  };
  createSlideFromTemplate = window.createSlideFromTemplate;

  const baseEditorForm = window.editorForm || editorForm;
  window.editorForm = function (slide) {
    if (!slide || slide.template !== "shop") return baseEditorForm(slide);
    const fields = slide.fields || (slide.fields = {});
    const templateOptions = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    const animationOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const imageKeys = ["image", "imageLeft", "imageRight", "image4", "image5", "image6"];
    const products = imageKeys.map((imageKey, index) => {
      const number = index + 1;
      return `
        <div class="shop-edit-row">
          <span class="shop-edit-number">${number}</span>
          <label>Product name<input data-field="product${number}Name" value="${escapeHtml(fields[`product${number}Name`] || `Product ${number}`)}"></label>
          <label>Price<input data-field="product${number}Price" value="${escapeHtml(fields[`product${number}Price`] || "")}" placeholder="Add price"></label>
          <label class="shop-file-pick">Photo<input type="file" accept="image/*" data-shop-image="${imageKey}"></label>
        </div>
      `;
    }).join("");
    return `
      <form class="edit-form shop-edit-form">
        <div class="form-grid">
          <label>Template<select data-key="template">${templateOptions}</select></label>
          <label>Animation<select data-key="animation">${animationOptions}</select></label>
          <label>Slide time (ms)<input data-key="duration" type="number" min="4000" step="500" value="${Number(slide.duration || 16000)}"></label>
          <label class="check-row"><input data-key="visible" type="checkbox" ${slide.visible !== false ? "checked" : ""}> Show on TV</label>
        </div>
        <details class="shop-edit-section" open>
          <summary>Slide heading</summary>
          <div class="shop-heading-fields">
            <label>Small label<input data-field="eyebrow" value="${escapeHtml(fields.eyebrow || "")}"></label>
            <label>Heading<input data-field="heading" value="${escapeHtml(fields.heading || "")}"></label>
            <label>Subheading<input data-field="subheading" value="${escapeHtml(fields.subheading || "")}"></label>
            <label>Optional message<input data-field="body" value="${escapeHtml(fields.body || "")}"></label>
          </div>
        </details>
        <details class="shop-edit-section" open>
          <summary>Products <span>6 slots</span></summary>
          <div class="shop-edit-products">${products}</div>
          <p class="shop-editor-note">Choose a photo in its row. It uploads to the shared library and is saved on this slide.</p>
        </details>
        <details class="shop-edit-section">
          <summary>Shared photo library</summary>
          ${typeof window.renderSharedEditorPanels === "function" ? window.renderSharedEditorPanels() : "<p>Upload product photos from each product row above.</p>"}
        </details>
        <input id="mediaUpload" type="file" accept="image/*" hidden>
        <details class="shop-edit-section">
          <summary>Brand and background</summary>
          <div class="shop-heading-fields">
            <label>Logo image path<input data-field="logo" value="${escapeHtml(fields.logo || board.brand.logo)}"></label>
            <label>Background colour or image<input data-field="background" value="${escapeHtml(fields.background || "")}"></label>
            <label>Accent colour<input data-field="accent" value="${escapeHtml(fields.accent || "")}" placeholder="#e61f2a"></label>
          </div>
        </details>
        <div class="upload-row"><button class="danger" id="deleteSlide" type="button">Delete slide</button></div>
      </form>
    `;
  };
  editorForm = window.editorForm;

  const baseBindEditor = window.bindEditor || bindEditor;
  async function uploadProductPhoto(file, target, slide) {
    const headers = {
      "content-type": file.type || "application/octet-stream",
      "x-file-name": file.name || "product-photo"
    };
    if (adminPin()) headers["x-admin-pin"] = adminPin();
    let response = await fetch("/api/upload", { method: "POST", headers, body: file });
    if (response.status === 401) {
      const pin = window.prompt("Enter the ESKA admin PIN");
      if (!pin) throw new Error("Upload cancelled.");
      localStorage.setItem("eskaAdminPin", pin);
      headers["x-admin-pin"] = pin;
      response = await fetch("/api/upload", { method: "POST", headers, body: file });
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || `Upload failed: ${response.status}`);
    }
    const uploaded = await response.json();
    slide.fields[target] = uploaded.url;
    await saveBoard();
    renderAdmin();
  }

  window.bindEditor = function (slide) {
    baseBindEditor(slide);
    if (!slide || slide.template !== "shop") return;
    document.querySelectorAll("[data-shop-image]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          await uploadProductPhoto(file, input.dataset.shopImage, slide);
        } catch (error) {
          showStatus(error.message || "Could not upload this product photo.", true);
        }
      });
    });
    const target = document.querySelector("#mediaLibraryTarget");
    if (target) Array.from(target.options).forEach((option, index) => {
      const labels = ["Product photo 1", "Product photo 2", "Product photo 3", "Product photo 4", "Product photo 5", "Product photo 6"];
      if (labels[index]) option.textContent = labels[index];
    });
  };
  bindEditor = window.bindEditor;

  const baseSlideView = window.templatesView || templatesView;
  window.templatesView = async function () {
    await baseSlideView();
    const button = document.querySelector('[data-template="shop"]');
    if (!button) return;
    const card = button.closest(".template-card");
    if (card) card.classList.add("shop-template-card");
  };
  templatesView = window.templatesView;

  // Animate each newly-rendered slide once; Anime.js is optional and WAAPI is the fallback.
  const modes = {
    "anime-fade": { opacity: [0, 1], translateY: ["20px", "0px"], duration: 760, ease: "outCubic" },
    "anime-slide-left": { opacity: [0, 1], translateX: ["44px", "0px"], duration: 760, ease: "outCubic" },
    "anime-slide-right": { opacity: [0, 1], translateX: ["-44px", "0px"], duration: 760, ease: "outCubic" },
    "anime-stagger": { opacity: [0, 1], translateY: ["18px", "0px"], duration: 680, ease: "outCubic", stagger: 90 },
    "anime-zoom": { opacity: [0, 1], scale: [0.94, 1], duration: 780, ease: "outCubic" },
    "anime-spring": { opacity: [0, 1], scale: [0.84, 1], duration: 860, ease: "outBack" },
    "anime-flip": { opacity: [0, 1], rotateY: ["-18deg", "0deg"], duration: 760, ease: "outCubic", stagger: 80 },
    "anime-blur": { opacity: [0, 1], filter: ["blur(8px)", "blur(0px)"], duration: 780, ease: "outCubic", stagger: 70 },
    "anime-mask": { opacity: [0, 1], clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"], duration: 780, ease: "outCubic", stagger: 75 }
  };
  const playedAnimations = new Map();

  function animateNewSlide(slideElement) {
    if (!slideElement || slideElement.dataset.animePlayed === "1") return;
    const modeName = Array.from(slideElement.classList).find((name) => name.startsWith("anim-anime-"))?.replace("anim-", "");
    const mode = modes[modeName];
    if (!mode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animationKey = `${slideElement.dataset.slideId || "slide"}:${modeName}`;
    if (slideElement.classList.contains("preview-slide")) {
      if (playedAnimations.has(animationKey)) return;
      playedAnimations.set(animationKey, true);
    }
    slideElement.dataset.animePlayed = "1";
    const isShop = slideElement.classList.contains("slide-shop");
    let targets = isShop
      ? Array.from(slideElement.querySelectorAll(".shop-product-card"))
      : Array.from(slideElement.querySelectorAll(".copy-block > *, .photo-panel, .gallery-photo, .date-board article, .info-cards article, .menu-photo-card, .media-layout"));
    if (!targets.length) targets = [slideElement];
    slideElement.classList.add("animejs-active");

    const finalise = () => {
      targets.forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
        element.style.filter = "none";
        element.style.clipPath = "none";
      });
      slideElement.classList.remove("animejs-active");
    };

    if (window.anime && typeof window.anime.animate === "function") {
      const params = { ...mode, delay: mode.stagger ? window.anime.stagger(mode.stagger) : 0, onComplete: finalise };
      delete params.stagger;
      window.anime.animate(targets, params);
      window.setTimeout(finalise, 2200);
      return;
    }

    let finished = 0;
    const keyframesFor = () => {
      const initial = {};
      const final = {};
      Object.entries(mode).forEach(([key, values]) => {
        if (!Array.isArray(values)) return;
        initial[key] = values[0];
        final[key] = values[1];
      });
      return [initial, final];
    };
    targets.forEach((element, index) => {
      if (typeof element.animate !== "function") {
        element.style.opacity = "1";
        finished += 1;
        if (finished === targets.length) finalise();
        return;
      }
      const animation = element.animate(keyframesFor(), {
        duration: mode.duration,
        delay: mode.stagger ? index * mode.stagger : 0,
        easing: mode.ease === "outBack" ? "cubic-bezier(.34,1.56,.64,1)" : "cubic-bezier(.2,.8,.2,1)",
        fill: "both"
      });
      animation.onfinish = () => {
        finished += 1;
        if (finished === targets.length) finalise();
      };
    });
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(".slide")) animateNewSlide(node);
      node.querySelectorAll?.(".slide").forEach(animateNewSlide);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (route() === "/admin" || route() === "/templates") window.boot().catch(() => null);
})();
