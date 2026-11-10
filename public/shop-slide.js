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
  const previewPhotos = new Map();
  let captionSaveTimer;
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
      `--shop-name-size:${numeric(fields, "shopNameSize", slide.template === "stock-carousel" ? 30 : 22, 12, 48)}px`,
      `--shop-price-size:${numeric(fields, "shopPriceSize", slide.template === "stock-carousel" ? 30 : 18, 10, 38)}px`,
      `--shop-description-size:${numeric(fields, "shopDescriptionSize", 16, 10, 32)}px`,
      `--stock-qr-size:${numeric(fields, "stockQrSize", 240, 160, 320)}px`,
      `--shop-image-fit:${slide.template === "stock-carousel" ? (fields.stockPhotoFit === "cover" ? "cover" : "contain") : (fields.shopImageFit === "contain" ? "contain" : "cover")}`
    ];
    return ` style="${escapeHtml(vars.join(";"))}"`;
  }

  function productPhotos(fields, imageKey, number) {
    const saved = fields[`product${number}Images`];
    const photos = Array.isArray(saved) ? [...saved] : [];
    const legacyPhoto = fields[imageKey];
    if (legacyPhoto && !photos.includes(legacyPhoto)) photos.push(legacyPhoto);
    return photos.filter((source) => typeof source === "string" && source.trim());
  }

  function photoDetails(fields, number, index) {
    const detail = fields[`product${number}PhotoDetails`]?.[index] || {};
    return {
      name: detail.name ?? fields[`product${number}Name`] ?? `Product ${number}`,
      price: detail.price ?? fields[`product${number}Price`] ?? "Ask at reception",
      description: detail.description ?? fields[`product${number}Description`] ?? ""
    };
  }

  function productCards(slide, carousel, preview) {
    const fields = slide.fields || {};
    const count = carousel ? 6 : Math.round(numeric(fields, "productCount", 6, 1, 6));
    return imageKeys.slice(0, count).map((imageKey, index) => {
      const number = index + 1;
      const photos = carousel ? productPhotos(fields, imageKey, number) : [fields[imageKey] || ""].filter(Boolean);
      const captions = photos.map((_, photoIndex) => photoDetails(fields, number, photoIndex));
      const startIndex = preview ? Math.min(previewPhotos.get(`${slide.id}:${number}`) || 0, Math.max(0, photos.length - 1)) : 0;
      const { name, price, description } = captions[startIndex] || photoDetails(fields, number, 0);
      const source = photos[startIndex] || "";
      if (carousel && !source && !preview) return "";
      const dots = photos.length > 1 ? `<div class="shop-photo-dots" aria-hidden="true">${photos.map((_, photoIndex) => `<i${photoIndex === startIndex ? ' class="is-current"' : ""}></i>`).join("")}</div>` : "";
      const image = carousel
        ? `<div class="shop-product-image${source ? "" : " shop-image-empty"}" data-image-key="${imageKey}" data-shop-photo-carousel data-photo-slot="${index}" data-photo-sources="${escapeHtml(JSON.stringify(photos))}" data-photo-interval="${numeric(fields, "stockInterval", 6000, 2000, 30000)}" data-photo-transition="${carouselTransitions.some(([key]) => key === fields.stockTransition) ? fields.stockTransition : "fade"}">${source ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(name)}" width="450" height="600" decoding="async">${dots}` : "<span>Add product photos</span>"}</div>`
        : source
          ? `<div class="shop-product-image" data-image-key="${imageKey}">${mediaTag(source, name)}</div>`
          : `<div class="shop-product-image shop-image-empty" data-image-key="${imageKey}"><span>Add product photo</span></div>`;
      return `<article class="shop-product-card" data-stock-item="${index}" data-photo-start="${startIndex}" data-photo-captions="${escapeHtml(JSON.stringify(captions))}">
        ${image}<div class="shop-product-copy"><strong>${escapeHtml(name)}</strong>
        ${carousel || description ? `<span class="shop-product-description"${description ? "" : " hidden"}>${escapeHtml(description)}</span>` : ""}
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
    const cards = productCards(slide, carousel, preview);
    const hasQr = carousel && /^(true|1|yes|on)$/i.test(String(fields.qrVisible ?? "true"));
    const stage = `<div class="shop-products">${cards || '<p class="shop-empty-message">No products to display</p>'}</div>`;
    const footer = carousel ? `<footer class="shop-footer"><p>${escapeHtml(fields.body || "Ask at reception for sizes and availability.")}</p></footer>` : "";
    return `
      <section class="slide slide-shop${carousel ? " slide-stock-carousel" : ""}${hasQr ? " shop-has-qr" : ""} anim-${animation}${preview ? " preview-slide" : ""}" data-slide-id="${escapeHtml(slide.id)}" data-qr-size="${numeric(fields, "stockQrSize", 240, 160, 320)}"${slideStyle(slide)}>
        ${brandHeader(slide)}
        <div class="shop-layout"${shopStyle(slide)}>
          ${carousel ? `${headingMarkup({ ...fields, body: "" })}${stage}${footer}` : `${stage}${headingMarkup(fields)}`}
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
      duration: 16000,
      visible: false,
      fields: {
        eyebrow: carousel ? "Training essentials" : "ESKA Club Shop",
        body: "",
        productCount: 6,
        shopColumns: 3,
        shopImageShare: 68,
        shopCardGap: 16,
        shopGridRatio: 1.8,
        shopNameSize: carousel ? 30 : 22,
        shopPriceSize: carousel ? 30 : 18,
        shopDescriptionSize: 16,
        shopImageFit: "cover",
        stockPhotoFit: "contain",
        stockInterval: 6000,
        stockQrSize: 240,
        stockTransition: "fade",
        qrText: "Scan to shop",
        qrVisible: carousel ? "true" : "false",
        qr: carousel ? "/assets/eska-shop-qr.png" : "",
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
        subheading: carousel ? "Available at reception" : "Gear for every stage of your journey"
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
      const photos = productPhotos(fields, imageKey, number);
      const photoEditor = carousel
        ? `<label class="shop-file-pick">Add photos (${photos.length})<input type="file" accept="image/*" multiple data-shop-image="${imageKey}"></label>
          <div class="shop-carousel-photo-list">${photos.length ? photos.map((source, photoIndex) => `<div class="shop-photo-edit"><img src="${escapeHtml(source)}" alt="Product ${number}, photo ${photoIndex + 1}"><div><button type="button" data-move-shop-photo="${imageKey}" data-photo-index="${photoIndex}" data-direction="-1" ${photoIndex === 0 ? "disabled" : ""} title="Move photo earlier" aria-label="Move photo earlier">&#8592;</button><button type="button" data-move-shop-photo="${imageKey}" data-photo-index="${photoIndex}" data-direction="1" ${photoIndex === photos.length - 1 ? "disabled" : ""} title="Move photo later" aria-label="Move photo later">&#8594;</button><button type="button" data-remove-shop-photo="${imageKey}" data-photo-index="${photoIndex}" aria-label="Remove photo ${photoIndex + 1} from product ${number}" title="Remove photo">&times;</button></div></div>`).join("") : "<span>No photos added yet</span>"}</div>`
        : `<label class="shop-file-pick">Photo<input type="file" accept="image/*" data-shop-image="${imageKey}"></label>`;
      return `
        <div class="shop-edit-row">
          <span class="shop-edit-number">${number}</span>
          <label>Default product name<input data-field="product${number}Name" value="${escapeHtml(fields[`product${number}Name`] || `Product ${number}`)}"></label>
          <label>Price<input data-field="product${number}Price" value="${escapeHtml(fields[`product${number}Price`] || "")}" placeholder="Add price"></label>
          ${photoEditor}
          <label class="shop-product-desc">Default description<input data-field="product${number}Description" value="${escapeHtml(fields[`product${number}Description`] || "")}" placeholder="Optional details"></label>
          ${carousel ? `<div class="shop-photo-caption-editors">${photos.map((_, photoIndex) => {
            const details = fields[`product${number}PhotoDetails`]?.[photoIndex] || {};
            return `<details><summary>Photo ${photoIndex + 1} text</summary><button type="button" data-preview-shop-photo="${number}" data-photo-index="${photoIndex}">Preview photo ${photoIndex + 1}</button>${["name", "price", "description"].map((key) => `<label>${key === "name" ? "Product name" : key === "price" ? "Price" : "Description"}<input data-shop-photo-field="${key}" data-product-number="${number}" data-photo-index="${photoIndex}" value="${escapeHtml(details[key] ?? "")}" placeholder="Use box default"><button type="button" data-reset-shop-caption="${key}" data-product-number="${number}" data-photo-index="${photoIndex}" title="Use box default">Use default</button></label>`).join("")}</details>`;
          }).join("")}</div>` : ""}
        </div>
      `;
    }).join("");
    const sizingControls = `
      <details class="shop-edit-section">
        <summary>Layout and sizes</summary>
        <div class="shop-sizing-grid">
          ${carousel ? "" : `<label>Products shown <output>${numeric(fields, "productCount", 6, 1, 6)}</output><input type="range" min="1" max="6" step="1" data-field="productCount" value="${numeric(fields, "productCount", 6, 1, 6)}"></label>`}
          ${carousel ? `
            <label>Carousel interval <output>${numeric(fields, "stockInterval", 6000, 2000, 30000) / 1000}s</output><input type="range" min="2000" max="30000" step="1000" data-field="stockInterval" value="${numeric(fields, "stockInterval", 6000, 2000, 30000)}"></label>
            <label>Shop QR size <output>${numeric(fields, "stockQrSize", 240, 160, 320)}px</output><input type="range" min="160" max="320" step="20" data-field="stockQrSize" value="${numeric(fields, "stockQrSize", 240, 160, 320)}"></label>
            <label>Card spacing <output>${numeric(fields, "shopCardGap", 16, 4, 40)}px</output><input type="range" min="4" max="40" step="1" data-field="shopCardGap" value="${numeric(fields, "shopCardGap", 16, 4, 40)}"></label>
            <label>Product name size <output>${numeric(fields, "shopNameSize", 22, 12, 48)}px</output><input type="range" min="12" max="48" step="1" data-field="shopNameSize" value="${numeric(fields, "shopNameSize", 22, 12, 48)}"></label>
            <label>Price size <output>${numeric(fields, "shopPriceSize", 18, 10, 38)}px</output><input type="range" min="10" max="38" step="1" data-field="shopPriceSize" value="${numeric(fields, "shopPriceSize", 18, 10, 38)}"></label>
            <label>Description size <output>${numeric(fields, "shopDescriptionSize", 16, 10, 32)}px</output><input type="range" min="10" max="32" step="1" data-field="shopDescriptionSize" value="${numeric(fields, "shopDescriptionSize", 16, 10, 32)}"></label>
            <label>Photo fit<select data-field="stockPhotoFit"><option value="contain" ${fields.stockPhotoFit !== "cover" ? "selected" : ""}>Show whole portrait photo</option><option value="cover" ${fields.stockPhotoFit === "cover" ? "selected" : ""}>Crop to fill frame</option></select></label>
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
        ${carousel ? '<p class="shop-editor-note">Each picture window cycles independently. Portrait photos use a 450 x 600 frame ratio and scale to fit. Slide time adjusts so every photo in the fullest window can appear at least once.</p>' : ""}
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
          <p class="shop-editor-note">${carousel ? "Each photo can override its box's name, description and price. Clearing an override hides that text; Use default restores the box text. Preview photo shows the selected image and text together." : "Choose a photo in its row."} Uploads are saved to the shared library and this slide.</p>
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
  async function uploadOneProductPhoto(file) {
    const headers = {
      "content-type": file.type || "application/octet-stream",
      "x-file-name": (file.name || "product-photo").replace(/[^\x20-\x7E]/g, "-")
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
    return (await response.json()).url;
  }

  function updateCarouselDuration(slide) {
    if (!slide || slide.template !== "stock-carousel") return;
    const fields = slide.fields || {};
    const maxPhotos = Math.max(1, ...imageKeys.map((key, index) => productPhotos(fields, key, index + 1).length));
    const interval = numeric(fields, "stockInterval", 6000, 2000, 30000);
    slide.duration = Math.max(Number(slide.duration) || 0, 16000, maxPhotos * interval + 2000);
  }

  async function uploadProductPhotos(files, target, slide) {
    const uploads = [];
    try {
      for (const file of files) uploads.push(await uploadOneProductPhoto(file));
    } catch (error) {
      if (uploads.length && slide.template === "stock-carousel") {
        const number = imageKeys.indexOf(target) + 1;
        const key = `product${number}Images`;
        slide.fields[key] = [...productPhotos(slide.fields, target, number), ...uploads];
        slide.fields[target] = "";
        updateCarouselDuration(slide);
        await saveBoard();
        renderAdmin();
      }
      throw error;
    }
    if (slide.template === "stock-carousel") {
      const number = imageKeys.indexOf(target) + 1;
      const key = `product${number}Images`;
      slide.fields[key] = [...productPhotos(slide.fields, target, number), ...uploads];
      slide.fields[target] = "";
      updateCarouselDuration(slide);
    } else if (uploads[0]) {
      slide.fields[target] = uploads[0];
    }
    await saveBoard();
    renderAdmin();
  }

  window.bindEditor = function (slide) {
    baseBindEditor(slide);
    if (!slide || !["shop", "stock-carousel"].includes(slide.template)) return;
    const isCarousel = slide.template === "stock-carousel";
    document.querySelectorAll('.shop-edit-form [data-field][type="range"]').forEach((input) => {
      const output = input.parentElement.querySelector("output");
      const syncCarouselDuration = () => {
        if (!isCarousel || !["stockInterval", "productCount"].includes(input.dataset.field)) return;
        slide.fields[input.dataset.field] = input.value;
        updateCarouselDuration(slide);
        const durationInput = document.querySelector('.shop-edit-form [data-key="duration"]');
        if (durationInput) durationInput.value = String(slide.duration);
      };
      const updateOutput = () => {
        if (!output) return;
        const field = input.dataset.field;
        output.textContent = field === "stockInterval" ? `${Number(input.value) / 1000}s`
          : field === "shopImageShare" ? `${input.value}%`
            : field === "shopGridRatio" ? Number(input.value).toFixed(1)
              : ["stockQrSize", "shopCardGap", "shopNameSize", "shopPriceSize", "shopDescriptionSize"].includes(field) ? `${input.value}px` : input.value;
      };
      input.addEventListener("input", updateOutput);
      input.addEventListener("input", syncCarouselDuration);
      updateOutput();
      syncCarouselDuration();
    });
    document.querySelectorAll("[data-shop-image]").forEach((input) => {
      input.addEventListener("change", async () => {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        try {
          await uploadProductPhotos(files, input.dataset.shopImage, slide);
        } catch (error) {
          showStatus(error.message || "Could not upload these product photos.", true);
        }
      });
    });
    document.querySelectorAll("[data-remove-shop-photo]").forEach((button) => {
      button.addEventListener("click", async () => {
        const imageKey = button.dataset.removeShopPhoto;
        const number = imageKeys.indexOf(imageKey) + 1;
        const key = `product${number}Images`;
        const photos = productPhotos(slide.fields, imageKey, number);
        const details = photos.map((_, index) => slide.fields[`product${number}PhotoDetails`]?.[index] || {});
        photos.splice(Number(button.dataset.photoIndex), 1);
        details.splice(Number(button.dataset.photoIndex), 1);
        slide.fields[`product${number}PhotoDetails`] = details;
        slide.fields[key] = photos;
        slide.fields[imageKey] = "";
        updateCarouselDuration(slide);
        try {
          await saveBoard();
          renderAdmin();
        } catch (error) {
          showStatus(error.message || "Could not save the photo change.", true);
        }
      });
    });
    document.querySelectorAll("[data-move-shop-photo]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = button.dataset.moveShopPhoto;
        const number = imageKeys.indexOf(target) + 1;
        const photos = productPhotos(slide.fields, target, number);
        const from = Number(button.dataset.photoIndex);
        const to = from + Number(button.dataset.direction);
        if (to < 0 || to >= photos.length) return;
        [photos[from], photos[to]] = [photos[to], photos[from]];
        const details = photos.map((_, index) => slide.fields[`product${number}PhotoDetails`]?.[index] || {});
        [details[from], details[to]] = [details[to], details[from]];
        slide.fields[`product${number}PhotoDetails`] = details;
        slide.fields[`product${number}Images`] = photos;
        slide.fields[target] = "";
        try { await saveBoard(); renderAdmin(); }
        catch (error) { showStatus(error.message || "Could not reorder photos.", true); }
      });
    });
    const updatePhotoPreview = (number, index) => {
      previewPhotos.set(`${slide.id}:${number}`, index);
      const preview = document.querySelector(".preview-wrap");
      if (preview) preview.innerHTML = renderSlide(slide, true);
    };
    const saveCaptions = () => {
      clearTimeout(captionSaveTimer);
      captionSaveTimer = setTimeout(() => saveBoard().catch((error) => showStatus(error.message, true)), 700);
    };
    document.querySelectorAll("[data-shop-photo-field]").forEach((input) => input.addEventListener("input", () => {
      const number = Number(input.dataset.productNumber), index = Number(input.dataset.photoIndex);
      const key = `product${number}PhotoDetails`;
      const details = slide.fields[key] || (slide.fields[key] = []);
      details[index] = { ...details[index], [input.dataset.shopPhotoField]: input.value };
      updatePhotoPreview(number, index);
      saveCaptions();
    }));
    document.querySelectorAll("[data-preview-shop-photo]").forEach((button) => button.addEventListener("click", () => updatePhotoPreview(Number(button.dataset.previewShopPhoto), Number(button.dataset.photoIndex))));
    document.querySelectorAll("[data-reset-shop-caption]").forEach((button) => button.addEventListener("click", () => {
      const number = Number(button.dataset.productNumber), index = Number(button.dataset.photoIndex);
      const detail = slide.fields[`product${number}PhotoDetails`]?.[index];
      if (detail) delete detail[button.dataset.resetShopCaption];
      updatePhotoPreview(number, index);
      saveCaptions();
      renderAdmin();
    }));
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

  function startShopPhotoCarousels(slideElement) {
    if (!slideElement.classList.contains("slide-stock-carousel")) return;
    if (!slideElement._stockResize) {
      const fitFrames = () => {
        const qrSize = window.matchMedia("(max-width: 620px)").matches ? 100 : numeric(slideElement.dataset, "qrSize", 240, 160, 320) * slideElement.clientHeight / 1080;
        slideElement.style.setProperty("--stock-qr-display-size", `${qrSize}px`);
        slideElement.style.setProperty("--stock-content-scale", String(Math.min(1, slideElement.clientHeight / 1080)));
        slideElement.querySelectorAll(".shop-product-card").forEach((card) => {
        const frame = card.querySelector("[data-shop-photo-carousel]");
        if (!frame) return;
        const stacked = window.matchMedia("(max-width: 620px)").matches;
        const availableHeight = Math.max(0, card.clientHeight - (stacked ? card.querySelector(".shop-product-copy").offsetHeight : 0));
        const availableWidth = card.clientWidth * (stacked ? 1 : .46);
        const width = Math.min(availableWidth, availableHeight * .75);
        frame.style.width = `${width}px`;
        frame.style.height = `${width / .75}px`;
        });
      };
      if (typeof ResizeObserver === "function") {
        slideElement._fitStockFrames = fitFrames;
        slideElement._stockResize = new ResizeObserver(fitFrames);
        slideElement.querySelectorAll(".shop-product-card").forEach((card) => slideElement._stockResize.observe(card));
      }
      requestAnimationFrame(fitFrames);
    }
    slideElement.querySelectorAll("[data-shop-photo-carousel]").forEach((carousel) => {
      if (carousel.dataset.photoTimer) return;
      let photos = [];
      try { photos = JSON.parse(carousel.dataset.photoSources || "[]"); } catch { return; }
      if (photos.length < 2) return;
      const card = carousel.closest(".shop-product-card");
      const captions = JSON.parse(card.dataset.photoCaptions || "[]");
      let index = Number(card.dataset.photoStart || 0);
      let image = carousel.querySelector("img");
      const dots = Array.from(carousel.querySelectorAll(".shop-photo-dots i"));
      const interval = numeric({ interval: carousel.dataset.photoInterval }, "interval", 6000, 2000, 30000);
      const advance = async () => {
        if (!carousel.isConnected) {
          delete carousel.dataset.photoTimer;
          return;
        }
        const nextIndex = (index + 1) % photos.length;
        const next = new Image(450, 600);
        next.alt = captions[nextIndex]?.name || "Product photo";
        next.src = photos[nextIndex];
        // Keep the current image visible until the next file is decoded.
        let readyTimeout;
        try {
          await Promise.race([
            next.decode(),
            new Promise((_, reject) => { readyTimeout = window.setTimeout(() => reject(new Error("Photo load timeout")), 8000); })
          ]);
          if (!carousel.isConnected) return;
          next.className = "stock-photo-incoming";
          carousel.append(next);
          void next.offsetWidth;
          next.classList.add("is-ready");
          const previous = image;
          image = next;
          index = nextIndex;
          const caption = captions[index];
          if (caption) {
            card.querySelector(".shop-product-copy strong").textContent = caption.name;
            card.querySelector(".shop-product-price").textContent = caption.price;
            const description = card.querySelector(".shop-product-description");
            description.textContent = caption.description;
            description.hidden = !caption.description;
            requestAnimationFrame(() => slideElement._fitStockFrames?.());
          }
          dots.forEach((dot, dotIndex) => dot.classList.toggle("is-current", dotIndex === index));
          window.setTimeout(() => { previous?.remove(); next.className = ""; }, 650);
        } catch (_) {
          // Skip unreadable files without blanking the product window.
          index = nextIndex;
        } finally {
          window.clearTimeout(readyTimeout);
          if (carousel.isConnected) carousel.dataset.photoTimer = String(window.setTimeout(advance, interval));
        }
      };
      carousel.dataset.photoTimer = String(window.setTimeout(advance, interval + Number(carousel.dataset.photoSlot || 0) * 180));
    });
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(".slide")) { animateNewSlide(node); startShopPhotoCarousels(node); }
        node.querySelectorAll?.(".slide").forEach((slide) => { animateNewSlide(slide); startShopPhotoCarousels(slide); });
      });
      record.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        [node, ...node.querySelectorAll(".slide-stock-carousel")].forEach((slide) => slide._stockResize?.disconnect());
        const carousels = [...(node.matches?.("[data-shop-photo-carousel]") ? [node] : []), ...Array.from(node.querySelectorAll?.("[data-shop-photo-carousel]") || [])];
        carousels.forEach((carousel) => {
          if (carousel.dataset?.photoTimer) {
            window.clearTimeout(Number(carousel.dataset.photoTimer));
            delete carousel.dataset.photoTimer;
          }
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (route() === "/admin" || route() === "/templates") window.boot().catch(() => null);
})();
