(() => {
  const comparison = document.querySelector('.finish-compare');
  const original = comparison.querySelector('img');
  const slider = comparison.querySelector('input');
  const palette = document.querySelector('.finish-swatches');
  const brand = document.querySelector('#finish-brand');
  const search = document.querySelector('#finish-search');
  const count = document.querySelector('#finish-count');
  const selection = document.querySelector('#finish-selected');
  const upload = document.querySelector('#finish-upload');
  const demo = document.querySelector('#finish-demo');
  const status = document.querySelector('#finish-photo-status');
  const paint = document.querySelector('#finish-photo-paint');
  const paintContext = paint.getContext('2d', {willReadFrequently: true});
  const demoLayer = comparison.querySelector('.finish-after');
  const kind = document.querySelector('#finish-kind');
  const generate = document.querySelector('#finish-generate');
  const correct = document.querySelector('#finish-correct');
  const editor = document.querySelector('#finish-mask-editor');
  const editorContext = editor.getContext('2d');
  const maskTools = document.querySelector('#finish-mask-tools');
  const resultTools = document.querySelector('#finish-result-tools');
  const history = document.querySelector('#finish-history');
  const variants = [];
  let activeVariant;
  let baseMask;
  let maskVersion = 0;
  let generating = false;
  let request;
  const undo = [];
  let lastPoint;

  function finishOf(name) {
    if (/carbon|camouflage|fiber|texture/i.test(name)) return 'texture';
    if (/color change| to (blue|gold|pink|purple)|aurora|rainbow|laser/i.test(name)) return 'shift';
    if (/matt/i.test(name)) return 'matte';
    if (/satin/i.test(name)) return 'satin';
    if (/pearl/i.test(name)) return 'pearl';
    if (/metal|chrome/i.test(name)) return 'metallic';
    return /gloss/i.test(name) ? 'gloss' : 'unknown';
  }

  const films = window.UVED_FILMS.map(item => ({
    ...item,
    finish: item.finish ?? finishOf(item.name),
    code: item.code ?? item.name.match(/(?: · (TPU-[A-Z0-9]+)|\s([A-Z0-9,-]+\([A-Z0-9 ]+\)))$/i)?.slice(1).find(Boolean) ?? ''
  }));
  brand.replaceChildren(new Option('Все бренды', ''), ...[...new Set(films.map(film => film.brand))].map(value => new Option(value, value)));
  let selected = films[0];
  let photoUrl;
  let uploadVersion = 0;
  let photoVersion = 0;
  let photoPixels;
  let maskPixels;

  function updateSplit() {
    comparison.style.setProperty('--split', slider.value + '%');
    slider.setAttribute('aria-valuetext', 'Положение границы ' + slider.value + '%');
  }

  function colorChannels(hex) {
    return hex.slice(1).match(/../g).map(value => parseInt(value, 16));
  }

  function applyColor() {
    selection.textContent = selected.brand + ' · ' + selected.name;
    const [red, green, blue] = colorChannels(selected.hex).map(value => value / 255);
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    let hue = 0;
    if (delta) {
      if (max === red) hue = (green - blue) / delta;
      else if (max === green) hue = 2 + (blue - red) / delta;
      else hue = 4 + (red - green) / delta;
    }
    const saturation = delta / (1 - Math.abs(max + min - 1) || 1);
    const brightness = .46 + (max + min) * .46;
    comparison.style.setProperty('--paint-filter',
      `grayscale(1) sepia(${saturation * .9}) hue-rotate(${hue * 60 - 40}deg) saturate(${1 + saturation * 3}) brightness(${brightness})`);
    if (photoPixels && !generating) status.textContent = maskPixels ? 'Нажмите «Примерить», чтобы применить выбранную плёнку.' : status.textContent;
  }

  function renderPalette() {
    const query = search.value.trim().toLowerCase();
    const matching = films.filter(film => (!brand.value || film.brand === brand.value) && (!kind.value || film.finish === kind.value) && (film.name + ' ' + film.code).toLowerCase().includes(query));
    palette.replaceChildren(...matching.map(film => {
      const label = document.createElement('label');
      label.className = 'finish-swatch';
      label.style.setProperty('--swatch', film.hex);
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'finish-color';
      input.checked = film === selected;
      input.addEventListener('change', () => {
        selected = film;
        applyColor();
      });
      const sample = document.createElement('span');
      sample.className = 'finish-swatch-sample';
      sample.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'finish-swatch-name';
      name.textContent = film.name;
      label.append(input, sample, name);
      return label;
    }));
    count.textContent = matching.length ? 'Образцов: ' + matching.length : 'По этому запросу цветов нет.';
  }

  function refinePaintMask(mask, source) {
    // Learn the original paint hue from the most confident body pixels.
    let warm = 0;
    let cool = 0;
    let samples = 0;
    let confident = 0;
    for (let i = 0; i < source.length; i += 4) {
      if (mask[i + 3] < 220) continue;
      confident++;
      const x = source[i] - source[i + 1];
      const y = source[i + 2] - source[i + 1];
      const chroma = Math.hypot(x, y);
      if (chroma < 22) continue;
      warm += x / chroma;
      cool += y / chroma;
      samples++;
    }
    const strength = Math.hypot(warm, cool);
    if (!strength || samples < confident * .42 || strength < samples * .75) {
      for (let i = 3; i < mask.length; i += 4) {
        mask[i] = Math.max(0, Math.min(255, (mask[i] - 155) * 2.55));
      }
      return;
    }
    for (let i = 0; i < source.length; i += 4) {
      if (!mask[i + 3]) continue;
      const x = source[i] - source[i + 1];
      const y = source[i + 2] - source[i + 1];
      const chroma = Math.hypot(x, y);
      const similarity = chroma ? (warm * x + cool * y) / (strength * chroma) : 0;
      const agreement = Math.max(0, Math.min(1, (similarity - .45) / .45));
      const colorEvidence = Math.max(0, Math.min(1, (chroma - 9) / 13));
      mask[i + 3] = Math.min(255, mask[i + 3] * 6) * agreement * colorEvidence;
    }
  }

  function setSplit(value) {
    slider.value = value;
    updateSplit();
  }

  function syncActions() {
    generate.disabled = generating || !maskPixels || !editor.hidden;
    correct.disabled = generating || !maskPixels;
  }

  function setEditing(editing) {
    editor.hidden = maskTools.hidden = !editing;
    correct.setAttribute('aria-expanded', String(editing));
    slider.disabled = editing || (!activeVariant && Boolean(photoPixels));
    paint.hidden = editing || !activeVariant;
    resultTools.hidden = editing || !activeVariant;
    history.hidden = editing || !variants.length;
    if (editing) drawMask();
    syncActions();
  }

  function resetResults() {
    request?.abort();
    generating = false;
    generate.textContent = 'Примерить';
    variants.length = 0;
    activeVariant = null;
    resultTools.hidden = history.hidden = true;
    history.lastElementChild.replaceChildren();
    undo.length = 0;
    baseMask = null;
    setEditing(false);
  }

  function drawMask() {
    const overlay = editorContext.createImageData(editor.width, editor.height);
    for (let i = 0; i < overlay.data.length; i += 4) {
      overlay.data[i + 1] = 180;
      overlay.data[i + 2] = 255;
      overlay.data[i + 3] = maskPixels.data[i + 3] * .48;
    }
    editorContext.putImageData(overlay, 0, 0);
  }

  function brush(event) {
    const rect = editor.getBoundingClientRect();
    const x = (event.clientX - rect.left) * editor.width / rect.width;
    const y = (event.clientY - rect.top) * editor.height / rect.height;
    const add = document.querySelector('#finish-brush').value === 'add';
    editorContext.putImageData(maskPixels, 0, 0);
    editorContext.globalCompositeOperation = add ? 'source-over' : 'destination-out';
    editorContext.lineWidth = editor.width / rect.width * 28;
    editorContext.lineCap = 'round';
    editorContext.beginPath();
    editorContext.moveTo(lastPoint?.x ?? x - .01, lastPoint?.y ?? y);
    editorContext.lineTo(x, y);
    editorContext.stroke();
    editorContext.globalCompositeOperation = 'source-over';
    maskPixels = editorContext.getImageData(0, 0, editor.width, editor.height);
    lastPoint = {x, y};
    drawMask();
  }

  correct.addEventListener('click', () => setEditing(editor.hidden));
  editor.addEventListener('pointerdown', event => {
    undo.push(maskPixels);
    if (undo.length > 8) undo.shift();
    maskVersion++;
    editor.setPointerCapture(event.pointerId);
    brush(event);
  });
  editor.addEventListener('pointermove', event => {
    if (editor.hasPointerCapture(event.pointerId)) brush(event);
  });
  editor.addEventListener('lostpointercapture', () => { lastPoint = null; });
  document.querySelector('#finish-undo').addEventListener('click', () => {
    if (!undo.length) return;
    maskPixels = undo.pop();
    maskVersion++;
    drawMask();
  });
  document.querySelector('#finish-reset-mask').addEventListener('click', () => {
    undo.push(maskPixels);
    if (undo.length > 8) undo.shift();
    maskPixels = baseMask;
    maskVersion++;
    drawMask();
  });

  function activate(variant) {
    activeVariant = variant;
    paint.hidden = false;
    paintContext.putImageData(variant.pixels, 0, 0);
    resultTools.hidden = false;
    slider.disabled = false;
    setSplit(0);
    status.textContent = 'Результат · ' + variant.film.brand + ' · ' + variant.film.name;
  }

  generate.addEventListener('click', async () => {
    const film = selected;
    const existing = variants.find(item => item.film === film && item.maskVersion === maskVersion);
    if (existing) return activate(existing);
    const current = photoVersion;
    const controller = new AbortController();
    request = controller;
    generating = true;
    generate.textContent = 'Примеряем…';
    syncActions();
    status.textContent = 'Примеряем выбранную плёнку…';

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', {willReadFrequently: true});
      const ratio = paint.width / paint.height;
      canvas.width = ratio < .87 ? 512 : 768;
      canvas.height = ratio > 1.15 ? 512 : 768;
      if (ratio >= .87 && ratio <= 1.15) canvas.width = canvas.height = 640;
      const scale = Math.min(canvas.width / paint.width, canvas.height / paint.height);
      const width = Math.round(paint.width * scale);
      const height = Math.round(paint.height * scale);
      const x = Math.floor((canvas.width - width) / 2);
      const y = Math.floor((canvas.height - height) / 2);
      const input = document.createElement('canvas');
      input.width = paint.width;
      input.height = paint.height;
      const inputContext = input.getContext('2d');
      inputContext.putImageData(photoPixels, 0, 0);
      context.fillStyle = '#333';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(input, x, y, width, height);
      const sourceImage = canvas.toDataURL('image/png').split(',')[1];
      const apiMask = inputContext.createImageData(input.width, input.height);
      for (let i = 3; i < apiMask.data.length; i += 4) apiMask.data[i] = maskPixels.data[i] > 96 ? 0 : 255;
      inputContext.putImageData(apiMask, 0, 0);
      context.fillStyle = '#000';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.clearRect(x, y, width, height);
      context.drawImage(input, x, y, width, height);
      const bodyMask = canvas.toDataURL('image/png').split(',')[1];
      const response = await fetch('/api/ai-wrap-preview', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sourceImage, bodyMask, filmColor: film.hex, filmFinish: film.finish === 'unknown' ? 'gloss' : film.finish, selectedParts: []}),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!payload && [404, 501].includes(response.status)) throw new Error('Открыта статическая версия UVED. Для примерки запустите node dev-server.mjs.');
      if (!response.ok || !payload?.resultImage) throw new Error(payload?.message || 'Сервер примерки недоступен.');
      const image = new Image();
      image.src = payload.resultImage;
      await image.decode();
      if (current !== photoVersion) return;
      const frameScaleX = image.naturalWidth / canvas.width;
      const frameScaleY = image.naturalHeight / canvas.height;
      inputContext.drawImage(image, x * frameScaleX, y * frameScaleY, width * frameScaleX, height * frameScaleY,
        0, 0, input.width, input.height);
      const pixels = inputContext.getImageData(0, 0, input.width, input.height);
      for (let i = 3; i < pixels.data.length; i += 4) {
        pixels.data[i] = maskPixels.data[i] > 96 ? maskPixels.data[i] * photoPixels.data[i] / 255 : 0;
      }
      const variant = {film, pixels, maskVersion};
      variants.unshift(variant);
      if (variants.length > 5) variants.pop();
      history.hidden = false;
      history.lastElementChild.replaceChildren(...variants.map(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.film.name;
        button.addEventListener('click', () => activate(item));
        return button;
      }));
      activate(variant);
    } catch (error) {
      if (current !== photoVersion) return;
      generate.textContent = 'Повторить';
      status.textContent = error.message === 'Failed to fetch' ? 'Не удалось подключиться к серверу. Попробуйте ещё раз.' : error.message;
    } finally {
      if (current === photoVersion) {
        generating = false;
        if (generate.textContent !== 'Повторить') generate.textContent = 'Примерить';
        syncActions();
      }
    }
  });

  document.querySelectorAll('[data-finish-view]').forEach(button =>
    button.addEventListener('click', () => setSplit(button.dataset.finishView)));
  document.querySelector('#finish-download').addEventListener('click', () => {
    const link = document.createElement('a');
    const canvas = document.createElement('canvas');
    canvas.width = paint.width;
    canvas.height = paint.height;
    const context = canvas.getContext('2d');
    context.putImageData(photoPixels, 0, 0);
    context.drawImage(paint, 0, 0);
    link.href = canvas.toDataURL('image/png');
    link.download = 'uved-wrap.png';
    link.click();
  });
  for (const [id, book] of [['finish-quote', false], ['finish-book', true]]) {
    document.querySelector('#' + id).addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('uved:wrap-selection', {
        detail: {film: activeVariant.film, vehicleImage: photoUrl, selectedParts: [], book}
      }));
    });
  }

  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    if (!file) return;
    const version = ++uploadVersion;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      status.textContent = 'Выберите JPG, PNG или WebP размером до 20 МБ.';
      upload.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (version !== uploadVersion) {
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      URL.revokeObjectURL(url);
      if (version === uploadVersion) {
        status.textContent = 'Фото не открылось. Попробуйте другой файл.';
        upload.value = '';
      }
      return;
    }

    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const currentPhoto = ++photoVersion;
    maskPixels = null;
    resetResults();
    photoUrl = url;
    const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
    paint.width = Math.max(1, Math.round(image.naturalWidth * scale));
    paint.height = Math.max(1, Math.round(image.naturalHeight * scale));
    paintContext.drawImage(image, 0, 0, paint.width, paint.height);
    photoPixels = paintContext.getImageData(0, 0, paint.width, paint.height);
    original.src = url;
    original.alt = 'Загруженное фото автомобиля';
    comparison.style.aspectRatio = paint.width + '/' + paint.height;
    demoLayer.hidden = true;
    demo.hidden = false;
    slider.value = 0;
    slider.disabled = true;
    updateSplit();
    paintContext.clearRect(0, 0, paint.width, paint.height);
    status.textContent = 'Определяем окрашенные панели кузова…';

    try {
      const {detectBody} = await import('./body-mask.js');
      const mask = await detectBody(image);
      if (currentPhoto !== photoVersion) return;
      if (!mask) {
        status.textContent = 'Кузов не распознан. Попробуйте фото, где кузов целиком в кадре.';
        return;
      }
      paintContext.drawImage(mask, 0, 0, paint.width, paint.height);
      maskPixels = paintContext.getImageData(0, 0, paint.width, paint.height);
      refinePaintMask(maskPixels.data, photoPixels.data);
      baseMask = maskPixels;
      editor.width = paint.width;
      editor.height = paint.height;
      paintContext.clearRect(0, 0, paint.width, paint.height);
      syncActions();
      status.textContent = 'Кузов выделен. Выберите плёнку и нажмите «Примерить».';
      const pixels = photoPixels.data;
      let borderPaint = 0;
      for (let x = 0; x < paint.width; x++) {
        borderPaint += Number(maskPixels.data[x * 4 + 3] > 96);
        borderPaint += Number(maskPixels.data[((paint.height - 1) * paint.width + x) * 4 + 3] > 96);
      }
      for (let y = 0; y < paint.height; y++) {
        borderPaint += Number(maskPixels.data[y * paint.width * 4 + 3] > 96);
        borderPaint += Number(maskPixels.data[(y * paint.width + paint.width - 1) * 4 + 3] > 96);
      }
      let light = 0;
      let samples = 0;
      for (let i = 0; i < pixels.length; i += 64) {
        light += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
        samples++;
      }
      if (Math.min(image.naturalWidth, image.naturalHeight) < 360 || light / samples < 45 ||
          borderPaint > .08 * (paint.width + paint.height)) {
        status.textContent = 'Для лучшего результата загрузите чёткое, хорошо освещённое фото автомобиля целиком или под углом 3/4.';
      }
    } catch (error) {
      if (currentPhoto !== photoVersion) return;
      console.error(error);
      status.textContent = 'Не удалось обработать фото. Выберите файл повторно.';
    } finally {
      if (version === uploadVersion) upload.value = '';
    }
  });

  demo.addEventListener('click', () => {
    uploadVersion++;
    photoVersion++;
    URL.revokeObjectURL(photoUrl);
    photoUrl = photoPixels = maskPixels = null;
    resetResults();
    upload.value = '';
    original.src = 'hero-slate.jpg';
    original.alt = 'Серебристый кузов';
    comparison.style.removeProperty('aspect-ratio');
    demoLayer.hidden = false;
    paint.hidden = demo.hidden = true;
    slider.disabled = false;
    slider.value = 50;
    updateSplit();
    status.textContent = 'JPG, PNG или WebP до 20 МБ. Фото отправляется в OpenAI только при нажатии «Примерить».';
    upload.focus();
  });

  brand.addEventListener('change', () => {
    search.value = '';
    renderPalette();
  });
  search.addEventListener('input', renderPalette);
  kind.addEventListener('change', renderPalette);
  slider.addEventListener('input', updateSplit);
  renderPalette();
  applyColor();
  updateSplit();
})();
