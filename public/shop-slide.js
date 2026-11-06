(function () {
  const template = {
    id: "shop",
    name: "Karate Stock Display",
    category: "Shop / promotions",
    description: "Six editable product photos, names and prices in the familiar ESKA slide layout."
  };
  if (!templates.some((item) => item.id === template.id)) templates.push(template);
  const stockCarouselTemplate = {
    id: "stock-carousel",
    name: "Stock Carousel",
    category: "Shop / promotions",
    description: "A rotating product showcase with editable product photos, names, prices and details."
  };
  if (!templates.some((item) => item.id === stockCarouselTemplate.id)) templates.push(stockCarouselTemplate);

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
  const imageKeys = ["image", "imageLeft", "imageRight", "image4", "image5", "image6"];
  const carouselTransitions = [["fade", "Soft fade"], ["slide", "Slide across"], ["zoom", "Gentle zoom"], ["none", "No transition"]];

  function numeric(fields, key, fallback, min, max) {
    const value = Number(fields[key]);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function shopStyle(slide) {
    const fields = slide.fields || {};
    const vars = [
      `--shop-columns:${numeric(fields, "shopColumns", 3, 1, 3)}`,
      `--shop-photo-height:${numeric(fields, "shopImageShare", 68, 35, 80)}%`,
      `--shop-card-gap:${numeric(fields, "shopCardGap", 16, 4, 40)}px`,
      `--shop-grid-ratio:${numeric(fields, "shopGridRatio", 1.8, 1, 3)}fr`,
      `--shop-name-size:${numeric(fields, "shopNameSize", 22, 12, 48)}px`,
      `--shop-price-size:${numeric(fields, "shopPriceSize", 18, 10, 38)}px`,
      `--shop-description-size:${numeric(fields, "shopDescriptionSize", 16, 10, 32)}px`,
      `--shop-image-fit:${fields.shopImageFit === "contain" ? "contain" : "cover"}`,
      `--stock-image-width:${numeric(fields, "stockImageWidth", 56, 30, 75)}%`,
      `--stock-heading-size:${numeric(fields, "stockHeadingSize", 68, 28, 120)}px`,
      `--stock-detail-size:${numeric(fields, "stockDetailSize", 26, 14, 52)}px`
    ];
    return ` style="${escapeHtml(vars.join(";"))}"`;
  }

  function productCards(slide, carousel) {
    const fields = slide.fields || {};
    const count = Math.round(numeric(fields, "productCount", 6, 1, 6));
    return imageKeys.slice(0, count).map((imageKey, index) => {
      const number = index + 1;
      const source = fields[imageKey] || "";
      const name = fields[`product${number}Name`] || `Product ${number}`;
      const price = fields[`product${number}Price`] || "Ask at reception";
      const description = fields[`product${number}Description`] || "";
      const image = source
        ? `<div class="shop-product-image" data-image-key="${imageKey}">${mediaTag(source, name)}</div>`
        : `<div class="shop-product-image shop-image-empty" data-image-key="${imageKey}"><span>Add product photo</span></div>`;
      return `<article class="shop-product-card${carousel && index === 0 ? " is-active" : ""}" data-stock-item="${index}">
        ${image}<div class="shop-product-copy"><strong>${escapeHtml(name)}</strong>
        ${description ? `<span class="shop-product-description">${escapeHtml(description)}</span>` : ""}
        <span class="shop-product-price">${escapeHtml(price)}</span></div></article>`;
    }).join("");
  }

  function headingMarkup(fields) {
    return `<div class="shop-heading"><p class="eyebrow">${escapeHtml(fields.eyebrow || "ESKA Club Shop")}</p>
      <h1>${escapeHtml(fields.heading || "Karate essentials")}</h1>
      <h2>${escapeHtml(fields.subheading || "Gear for every stage of your journey")}</h2>
      ${fields.body ? `<p class="body-copy">${escapeHtml(fields.body)}</p>` : ""}</div>`;
  }

  function renderShopSlide(slide, preview = false) {
    const animation = slide.animation || "anime-stagger";
    const fields = slide.fields || {};
    const carousel = slide.template === "stock-carousel";
    const cards = productCards(slide, carousel);
    const stage = carousel
      ? `<div class="stock-carousel-stage" data-stock-interval="${numeric(fields, "stockInterval", 6000, 2000, 30000)}" data-stock-transition="${carouselTransitions.some(([key]) => key === fields.stockTransition) ? fields.stockTransition : "fade"}">${cards}<div class="stock-carousel-count" aria-live="polite"></div></div>`
      : `<div class="shop-products">${cards}</div>`;
    return `
      <section class="slide slide-shop${carousel ? " slide-stock-carousel" : ""} anim-${animation}${preview ? " preview-slide" : ""}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>
        ${brandHeader(slide)}
        <div class="shop-layout"${shopStyle(slide)}>
          ${stage}${headingMarkup(fields)}
        </div>
      </section>
    `;
  }
  window.renderSlide = function (slide, preview = false) {
    return slide && ["shop", "stock-carousel"].includes(slide.template) ? renderShopSlide(slide, preview) : baseRenderSlide(slide, preview);
  };
  renderSlide = window.renderSlide;

  const baseCreate = window.createSlideFromTemplate || createSlideFromTemplate;
  window.createSlideFromTemplate = function (templateId) {
    if (templateId !== "shop" && templateId !== "stock-carousel") return baseCreate(templateId);
    const carousel = templateId === "stock-carousel";
    return {
      id: uid(),
      template: templateId,
      animation: "anime-stagger",
      duration: carousel ? 37000 : 16000,
      visible: false,
      fields: {
        eyebrow: "ESKA Club Shop",
        heading: "Karate essentials",
        subheading: "Gear for every stage of your journey",
        body: "",
        productCount: 6,
        shopColumns: 3,
        shopImageShare: 68,
        shopCardGap: 16,
        shopGridRatio: 1.8,
        shopNameSize: 22,
        shopPriceSize: 18,
        shopDescriptionSize: 16,
        shopImageFit: "cover",
        stockInterval: 6000,
        stockTransition: "fade",
        stockImageWidth: 56,
        stockHeadingSize: 68,
        stockDetailSize: 26,
        logo: board.brand.logo,
        image: "",
        imageLeft: "",
        imageRight: "",
        image4: "",
        image5: "",
        image6: "",
        product1Name: "KMA Master Gi", product1Price: "Add price", product1Description: "",
        product2Name: "Coloured Belts", product2Price: "Add price", product2Description: "",
        product3Name: "Tiny Tiger Trousers", product3Price: "Add price", product3Description: "",
        product4Name: "Gum Shield", product4Price: "Add price", product4Description: "",
        product5Name: "Blitz Mitts", product5Price: "Add price", product5Description: "",
        product6Name: "Hand Pads", product6Price: "Add price", product6Description: "",
        heading: carousel ? "ESKA Club Shop" : "Karate essentials",
        subheading: carousel ? "Featured stock" : "Gear for every stage of your journey"
      }
    };
  };
  createSlideFromTemplate = window.createSlideFromTemplate;

  const baseEditorForm = window.editorForm || editorForm;
  window.editorForm = function (slide) {
    if (!slide || !["shop", "stock-carousel"].includes(slide.template)) return baseEditorForm(slide);
    const fields = slide.fields || (slide.fields = {});
    const carousel = slide.template === "stock-carousel";
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
          <label class="shop-product-desc">Description<input data-field="product${number}Description" value="${escapeHtml(fields[`product${number}Description`] || "")}" placeholder="Optional details"></label>
        </div>
      `;
    }).join("");
    const sizingControls = `
      <details class="shop-edit-section">
        <summary>Layout and sizes</summary>
        <div class="shop-sizing-grid">
          <label>Products shown <output>${numeric(fields, "productCount", 6, 1, 6)}</output><input type="range" min="1" max="6" step="1" data-field="productCount" value="${numeric(fields, "productCount", 6, 1, 6)}"></label>
          ${carousel ? `
            <label>Carousel interval <output>${numeric(fields, "stockInterval", 6000, 2000, 30000) / 1000}s</output><input type="range" min="2000" max="30000" step="1000" data-field="stockInterval" value="${numeric(fields, "stockInterval", 6000, 2000, 30000)}"></label>
            <label>Product image width <output>${numeric(fields, "stockImageWidth", 56, 30, 75)}%</output><input type="range" min="30" max="75" step="1" data-field="stockImageWidth" value="${numeric(fields, "stockImageWidth", 56, 30, 75)}"></label>
            <label>Product name size <output>${numeric(fields, "stockHeadingSize", 68, 28, 120)}px</output><input type="range" min="28" max="120" step="1" data-field="stockHeadingSize" value="${numeric(fields, "stockHeadingSize", 68, 28, 120)}"></label>
            <label>Details size <output>${numeric(fields, "stockDetailSize", 26, 14, 52)}px</output><input type="range" min="14" max="52" step="1" data-field="stockDetailSize" value="${numeric(fields, "stockDetailSize", 26, 14, 52)}"></label>
            <label>Transition<select data-field="stockTransition">${carouselTransitions.map(([key, label]) => `<option value="${key}" ${fields.stockTransition === key ? "selected" : ""}>${label}</option>`).join("")}</label>
          ` : `
            <label>Grid columns <output>${numeric(fields, "shopColumns", 3, 1, 3)}</output><input type="range" min="1" max="3" step="1" data-field="shopColumns" value="${numeric(fields, "shopColumns", 3, 1, 3)}"></label>
            <label>Photo area height <output>${numeric(fields, "shopImageShare", 68, 35, 80)}%</output><input type="range" min="35" max="80" step="1" data-field="shopImageShare" value="${numeric(fields, "shopImageShare", 68, 35, 80)}"></label>
            <label>Product area width <output>${numeric(fields, "shopGridRatio", 1.8, 1, 3).toFixed(1)}</output><input type="range" min="1" max="3" step="0.1" data-field="shopGridRatio" value="${numeric(fields, "shopGridRatio", 1.8, 1, 3)}"></label>
            <label>Card spacing <output>${numeric(fields, "shopCardGap", 16, 4, 40)}px</output><input type="range" min="4" max="40" step="1" data-field="shopCardGap" value="${numeric(fields, "shopCardGap", 16, 4, 40)}"></label>
            <label>Product name size <output>${numeric(fields, "shopNameSize", 22, 12, 48)}px</output><input type="range" min="12" max="48" step="1" data-field="shopNameSize" value="${numeric(fields, "shopNameSize", 22, 12, 48)}"></label>
            <label>Price size <output>${numeric(fields, "shopPriceSize", 18, 10, 38)}px</output><input type="range" min="10" max="38" step="1" data-field="shopPriceSize" value="${numeric(fields, "shopPriceSize", 18, 10, 38)}"></label>
            <label>Description size <output>${numeric(fields, "shopDescriptionSize", 16, 10, 32)}px</output><input type="range" min="10" max="32" step="1" data-field="shopDescriptionSize" value="${numeric(fields, "shopDescriptionSize", 16, 10, 32)}"></label>
            <label>Photo crop<select data-field="shopImageFit"><option value="cover" ${fields.shopImageFit !== "contain" ? "selected" : ""}>Fill frame</option><option value="contain" ${fields.shopImageFit === "contain" ? "selected" : ""}>Show whole image</option></select></label>
          `}
        </div>
        ${carousel ? '<p class="shop-editor-note">For every item to appear, set Slide time above to at least the number of products shown multiplied by the carousel interval.</p>' : ""}
      </details>
    `;
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
          <summary>${carousel ? "Stock items" : "Products"} <span>6 slots</span></summary>
          <div class="shop-edit-products">${products}</div>
          <p class="shop-editor-note">Choose a photo in its row. It uploads to the shared library and is saved on this slide.</p>
        </details>
        ${sizingControls}
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
    if (!slide || !["shop", "stock-carousel"].includes(slide.template)) return;
    document.querySelectorAll('.shop-edit-form [data-field][type="range"]').forEach((input) => {
      const output = input.parentElement.querySelector("output");
      const updateCarouselDuration = () => {
        if (!carousel || !["stockInterval", "productCount"].includes(input.dataset.field)) return;
        const count = numeric(slide.fields, "productCount", 6, 1, 6);
        const interval = numeric(slide.fields, "stockInterval", 6000, 2000, 30000);
        const duration = Math.round(count * interval + 1000);
        slide.duration = duration;
        const durationInput = document.querySelector('.shop-edit-form [data-key="duration"]');
        if (durationInput) durationInput.value = String(duration);
      };
      const updateOutput = () => {
        if (!output) return;
        const field = input.dataset.field;
        output.textContent = field === "stockInterval" ? `${Number(input.value) / 1000}s`
          : field === "shopImageShare" ? `${input.value}%`
            : field === "stockImageWidth" ? `${input.value}%`
              : field === "shopGridRatio" ? Number(input.value).toFixed(1)
                : ["shopCardGap", "shopNameSize", "shopPriceSize", "shopDescriptionSize", "stockHeadingSize", "stockDetailSize"].includes(field) ? `${input.value}px` : input.value;
      };
      input.addEventListener("input", updateOutput);
      input.addEventListener("input", updateCarouselDuration);
      updateOutput();
      updateCarouselDuration();
    });
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
    const card = button && button.closest(".template-card");
    if (card) card.classList.add("shop-template-card");
    const stockButton = document.querySelector('[data-template="stock-carousel"]');
    const stockCard = stockButton && stockButton.closest(".template-card");
    if (stockCard) stockCard.classList.add("shop-template-card");
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

  function startStockCarousel(slideElement) {
    if (!slideElement.classList.contains("slide-stock-carousel") || slideElement.dataset.stockTimer) return;
    const stage = slideElement.querySelector(".stock-carousel-stage");
    const cards = Array.from(stage?.querySelectorAll("[data-stock-item]") || []);
    if (cards.length < 2) return;
    let current = 0;
    const interval = numeric({ interval: stage.dataset.stockInterval }, "interval", 6000, 2000, 30000);
    const counter = stage.querySelector(".stock-carousel-count");
    if (counter) counter.textContent = `1 / ${cards.length}`;
    const timer = window.setInterval(() => {
      if (!slideElement.isConnected) {
        window.clearInterval(timer);
        delete slideElement.dataset.stockTimer;
        return;
      }
      cards[current].classList.remove("is-active", "is-entering");
      current = (current + 1) % cards.length;
      const next = cards[current];
      next.classList.add("is-active", "is-entering");
      window.setTimeout(() => next.classList.remove("is-entering"), 900);
      if (counter) counter.textContent = `${current + 1} / ${cards.length}`;
    }, interval);
    slideElement.dataset.stockTimer = String(timer);
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(".slide")) { animateNewSlide(node); startStockCarousel(node); }
        node.querySelectorAll?.(".slide").forEach((slide) => { animateNewSlide(slide); startStockCarousel(slide); });
      });
      record.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const slides = [node, ...Array.from(node.querySelectorAll?.(".slide-stock-carousel") || [])];
        slides.forEach((slide) => {
          if (slide.dataset?.stockTimer) window.clearInterval(Number(slide.dataset.stockTimer));
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (route() === "/admin" || route() === "/templates") window.boot().catch(() => null);
})();
