const find = (selector, root = document) => root.querySelector(selector);
const findAll = (selector, root = document) => [...root.querySelectorAll(selector)];
const vehicle = find('#vehicle');
const fields = vehicle.elements;
const panels = [vehicle, find('#film-panel'), find('#parts-panel')];
const parts = new Map(carParts.map(part => [part[0], part]));
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const selected = new Set();
const manual = 'Моей модели нет в списке';
let film = 0;
let wrapSelection;
let step = 0;
let view = 'frontLeft';
let draft;
const otherBrand = 'Другая марка';
find('#brands').replaceChildren(...[...Object.keys(vehicles).sort(), otherBrand].map(brand => new Option(brand)));
const brandName = () => Object.keys(vehicles).find(brand => brand.toLowerCase() === fields.brand.value.trim().toLowerCase());
const currentYear = new Date().getFullYear();
let modelKey;
function matchingGenerations() {
  const year = Number(fields.year.value);
  const matches = chosenVehicle()?.generations.filter(row => year >= row.yearFrom && year <= row.yearTo) ?? [];
  const specific = matches.filter(row => row.generation);
  return specific.length ? specific : matches;
}
function currentGeneration() {
  const matches = matchingGenerations();
  return matches.length === 1 ? matches[0] : matches[Number(fields.variant.value) - 1];
}
function currentVisual() {
  return currentGeneration()?.visual;
}
function showroomVehicle() {
  const model = chosenVehicle();
  if (!fields.year.value || !model || (fields.variant.required && !fields.variant.value)) return null;
  const generation = currentGeneration();
  if (generation?.exact3DAsset) return generation.visual;
  // Model-specific imagery remains available when there is no exact 3D asset.
  if (generation?.visual) return null;
  const fallback = classAssets[model.vehicleClass];
  return fallback ? {...model, modelKey:fallback.key, fallback:true, base:fallback.label} : null;
}
function updateYearOptions(custom) {
  const model = chosenVehicle();
  const key = model ? model.brand + ' / ' + model.model : custom ? fields.brand.value + ' / ' + fields.custom.value.trim() : '';
  if (key === modelKey) return;
  modelKey = key;
  fields.year.disabled = !key;
  const years = new Set();
  const spans = model?.generations.filter(row => !row.visualOnly) ?? [];
  for (const {yearFrom, yearTo} of spans) {
    for (let year = yearFrom; year <= yearTo; year++) years.add(year);
  }
  if (key && !years.size) {
    for (let year = currentYear; year >= 1950; year--) years.add(year);
  }
  fields.year.replaceChildren(new Option('Выберите год', ''), ...[...years].sort((a,b) => b-a).map(year => new Option(year)));
  view = 'frontLeft';
  updateVariants();
}
function updateVariants() {
  const matches = matchingGenerations();
  const ambiguous = matches.length > 1;
  find('#body-variant').hidden = !ambiguous;
  fields.variant.required = ambiguous;
  fields.variant.replaceChildren(new Option('Уточните версию', ''), ...matches.map((row, index) =>
    new Option(row.visual?.bodyVariant ?? row.generation ?? 'Поколение не уточнено', String(index + 1))));
}
function chosenVehicle() {
  return vehicles[brandName()]?.find(item => item.model.toLowerCase() === fields.model.value.trim().toLowerCase());
}
function vehicleName() {
  const model = fields.model.value === manual ? fields.custom.value.trim() : fields.model.value.trim();
  return [brandName() || fields.brand.value.trim(), model, fields.year.value, currentGeneration()?.generation].filter(Boolean).join(' ');
}
function partPrice(id) {
  const value = pricingTable[currentGeneration()?.priceGroup ?? chosenVehicle()?.priceGroup]?.[id]?.[filmTypes[film][0]];
  return Number.isFinite(value) && value >= 0 ? value : null;
}
function quoteLines() {
  const remaining = new Set(selected);
  const lines = [];
  for (const pair of pairedPartPrices) {
    const value = pair[filmTypes[film][0]];
    if (value === undefined || !pair.parts.every(id => remaining.has(id))) continue;
    pair.parts.forEach(id => remaining.delete(id));
    lines.push({label: pair.label ?? pair.parts.map(id => parts.get(id)[1]).join(' + '), value});
  }
  return lines.concat([...remaining].map(id => ({label: parts.get(id)[1], value: partPrice(id)})));
}
function estimate() {
  const prices = quoteLines().map(line => line.value);
  const unknown = prices.includes(null);
  const studio = prices.reduce((total, value) => total + (value ?? 0), 0);
  return { studio, mobile: studio + mobileServicePricing.mobileServiceFee, unknown, known: prices.some(value => value !== null) };
}
function displayPrice(location) {
  if (!selected.size) return '—';
  const quote = estimate();
  if (quote.unknown) return quote.known ? 'от ' + currency.format(quote[location]) : 'По запросу';
  return currency.format(quote[location]);
}
function updateSummary() {
  find('#car-name').textContent = vehicleName() || 'Автомобиль';
  find('#summary-detail').textContent = (wrapSelection?.label ?? filmTypes[film][1]) + ' · ' + (selected.size ? 'Выбрано деталей: ' + selected.size : 'Детали не выбраны');
  for (const location of ['studio', 'mobile']) find('#' + location).textContent = displayPrice(location);
  find('#mobile-quote').hidden = !selected.size;
  find('#mobile-quote-total').textContent = displayPrice('studio') + ' / ' + displayPrice('mobile');
  find('#line-items').replaceChildren(...quoteLines().map(({label, value}) => {
    const item = document.createElement('li');
    item.textContent = label + ' · ' + (value === null ? 'Цена по запросу' : currency.format(value));
    return item;
  }));
  findAll('[data-price]').forEach(element => {
    const price = partPrice(element.dataset.price);
    element.textContent = price === null ? 'Цена по запросу' : '+' + currency.format(price);
  });
}

function changeStep(index, focus = true) {
  if (index > 0 && !vehicle.reportValidity()) return;
  step = index;
  const preview = find('#vehicle-preview');
  const detailsScene = find('.showroom-scene',car);
  if (step !== 0) window.uvedShowroom?.unmount(preview);
  if (step !== 2 && detailsScene) window.uvedShowroom?.unmount(detailsScene);
  panels.forEach((panel, i) => {panel.hidden = i !== step;});
  if (step === 2 && showroomVehicle() && !find('.showroom-scene canvas',car)) drawCar();
  if (step === 0) observeVehiclePreview();
  findAll('.steps button').forEach((button, i) => {
    if (i === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (focus) {
    const heading = find('h3', panels[step]);
    heading.tabIndex = -1;
    heading.focus();
  }
}
function updateVehicle() {
  const custom = fields.model.value === manual;
  find('#custom-model').hidden = !custom;
  fields.custom.required = custom;
  updateYearOptions(custom && !!fields.custom.value.trim());
  fields.model.setCustomValidity(fields.model.value && !custom && !chosenVehicle() ? 'Выберите модель из списка или пункт «Моей модели нет в списке».' : '');
  if (selected.delete(trunkPart() === 'trunk' ? 'tailgate' : 'trunk')) selected.add(trunkPart());
  drawCar();
  syncParts();
}
fields.brand.addEventListener('input', () => {
  const brand = brandName();
  const other = fields.brand.value === otherBrand;
  fields.brand.setCustomValidity(fields.brand.value && !brand && !other ? 'Выберите марку из списка.' : '');
  fields.model.disabled = !brand && !other;
  fields.model.placeholder = 'Введите название для поиска';
  fields.model.value = other ? manual : '';
  find('#models').replaceChildren(...[...(vehicles[brand] ?? []).map(item => item.model), manual].map(model => new Option(model)));
  updateVehicle();
});
fields.model.addEventListener('input', updateVehicle);
fields.custom.addEventListener('input', updateVehicle);
fields.year.addEventListener('change', () => {
  view = 'frontLeft';
  updateVariants();
  drawCar();
  updateSummary();
});
fields.variant.addEventListener('change', () => {
  view = 'frontLeft';
  drawCar();
  updateSummary();
});
vehicle.addEventListener('submit', event => {
  event.preventDefault();
  changeStep(1);
});
findAll('[data-step]').forEach(button => button.addEventListener('click', () => changeStep(Number(button.dataset.step))));

find('#films').innerHTML = filmTypes.map(([, name, info], index) =>
  `<button type="button" class="choice" data-film="${index}" aria-pressed="${index === film}"><strong>${name}</strong><small>${info}</small></button>`
).join('');
findAll('[data-film]').forEach(button => button.addEventListener('click', () => {
  wrapSelection = null;
  film = Number(button.dataset.film);
  find('.film-sample').dataset.finish = filmTypes[film][0];
  findAll('[data-film]').forEach(choice => choice.setAttribute('aria-pressed', choice === button));
  drawCar();
  updateSummary();
}));

const trunkPart = () => chosenVehicle()?.hatch ? 'tailgate' : 'trunk';
const rotationOrder = ['front', 'frontLeft', 'left', 'rearLeft', 'rear', 'rearRight', 'right', 'frontRight'];
const rotationFrames = visual => rotationOrder.filter(frame => visual?.views[frame]);
const car = find('#car');
let drag;
let suppressPartClick = false;
let zoom = 1;
let zoneMode = 'body';
const zoneModes = {body:'Кузов', risk:'Зоны риска', doors:'Двери и ручки', sills:'Пороги и проёмы', roof:'Крыша и стойки', lights:'Оптика', trim:'Декор'};
const zoneFilters = {
  body: /^(hood$|bumper[FR]$|fender|door[FR][LR]$|roof$|trunk|tailgate|mirror|sill[LR]$)/,
  risk: /^(hood|bumper|loading|cup|lightF|fenderF|mirror)/,
  doors: /^(door|cup|handle|edge|end|innerDoor)/,
  sills: /^(sill|innerSill|entry|aperture)/,
  roof: /^(roof|pillar|windshield|panorama)/,
  lights: /^(light|fog)/,
  trim: /^(grille|trim|gloss|chrome|dechrome|plastic|spoiler)/
};
const visibleZone = id => zoneFilters[zoneMode].test(id);
function zonePrice(id) {
  const grouped = pairedPartPrices.find(pair => pair.parts.includes(id) && pair.parts.every(part => selected.has(part)));
  const groupedPrice = grouped?.[filmTypes[film][0]];
  if (groupedPrice !== undefined) return currency.format(groupedPrice) + ' за комплект';
  const price = partPrice(id);
  return price === null ? 'Цена по запросу' : currency.format(price);
}
function showZone(id) {
  const description = /^(innerSill|entry)/.test(id)
    ? 'Защита зоны посадки от царапин.'
    : /^cup/.test(id) ? 'Защита углубления под ручкой.' : '';
  const preview = find('#zone-preview',car);
  if (preview) {
    const inner = id && /^(innerSill|entry|aperture|sillsIn)/.test(id);
    const views = currentVisual()?.views;
    const detail = id && /^(cup|roofStrip|edge|end|doorEdge|loading)/.test(id);
    const frame = inner ? (id.endsWith('R') ? 'interiorRight' : 'interiorLeft')
      : /^(loading)/.test(id) ? 'rear' : id?.endsWith('R') ? 'right' : 'left';
    const image = (inner || detail) && views?.[frame]?.image;
    preview.hidden = !image;
    preview.replaceChildren();
    if (image) {
      const photo = new Image();
      photo.src = image;
      photo.alt = 'Ракурс для зоны «' + parts.get(id)[1] + '»';
      preview.classList.toggle('detail-applied', selected.has(id));
      preview.append(photo);
    }
  }
  find('#zone-info').textContent = id
    ? [selected.has(id) ? '✓ ' + parts.get(id)[1] : parts.get(id)[1], zonePrice(id), description].filter(Boolean).join(' · ')
    : 'Наведите на зону или нажмите на неё';
}
function updateZoom() {
  find('.car-stage', car).style.width = zoom * 100 + '%';
  find('[data-zoom="-1"]').disabled = zoom <= 1;
  find('[data-zoom="1"]').disabled = zoom >= 2.5;
  find('[data-zoom="0"]').textContent = Math.round(zoom * 100) + '%';
}

const quickClasses = {
  'Кроссоверы': [['BMW','X5'],['Mercedes-Benz','GLC'],['Mercedes-Benz','GLE'],['Audi','Q5'],['Audi','Q7'],['Li Auto','L7'],['Geely','Monjaro']],
  'Купе-кроссоверы': [['BMW','X6'],['Mercedes-Benz','GLE Coupe']],
  'Большие SUV': [['BMW','X7'],['Mercedes-Benz','GLS'],['Li Auto','L9']],
  'Седаны': [['BMW','3 Series'],['BMW','5 Series'],['Mercedes-Benz','CLA'],['Mercedes-Benz','CLS'],['Audi','A5'],['Audi','A6'],['Audi','A7']]
};
const classButtons = find('#vehicle-classes');
const modelButtons = find('#vehicle-examples');
classButtons.innerHTML = Object.keys(quickClasses).map(name =>
  `<button type="button" data-class="${name}" aria-pressed="false">${name}</button>`
).join('');
function showQuickClass(name) {
  findAll('button',classButtons).forEach(button => button.setAttribute('aria-pressed',String(button.dataset.class===name)));
  modelButtons.replaceChildren(...quickClasses[name].map(([brand,model]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = brand + ' ' + model;
    button.addEventListener('click', () => {
      fields.brand.value = brand;
      fields.brand.dispatchEvent(new Event('input'));
      fields.model.value = model;
      fields.model.dispatchEvent(new Event('input'));
      fields.year.focus({preventScroll:true});
    });
    return button;
  }));
}
classButtons.addEventListener('click', event => {
  if (event.target.dataset.class) showQuickClass(event.target.dataset.class);
});
showQuickClass('Кроссоверы');

const previewHost = find('#vehicle-preview');
let previewLoading = false;
const previewObserver = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting) || step !== 0 || previewLoading || find('canvas',previewHost)) return;
  previewLoading = true;
  import('./showroom.js').then(() => {
    if (step !== 0) return;
    return window.uvedShowroom.mount(previewHost,{
      selected: () => [], select: () => {}, inspect: () => {}
    },{modelKey:'bmw-x5-g05',label:'Демонстрационный кроссовер'});
  }).catch(() => {
    find('.showroom-status',previewHost).textContent = 'Предпросмотр 3D недоступен.';
  }).finally(() => {previewLoading = false;});
});
function observeVehiclePreview() {
  previewObserver.unobserve(previewHost);
  previewObserver.observe(previewHost);
}

function drawShowroom(visual) {
  car.innerHTML = `
    <div class="showroom-scene">
      <div class="paint-swatches" role="group" aria-label="Цвет кузова">
        <button type="button" data-paint="#9aa7b5" style="--swatch:#9aa7b5" aria-label="Светло-серый металлик" aria-pressed="true"></button>
        <button type="button" data-paint="#c4cbd3" style="--swatch:#c4cbd3" aria-label="Серебристый" aria-pressed="false"></button>
        <button type="button" data-paint="#eceef3" style="--swatch:#eceef3" aria-label="Белый" aria-pressed="false"></button>
        <button type="button" data-paint="#404957" style="--swatch:#404957" aria-label="Графитовый" aria-pressed="false"></button>
        <button type="button" data-paint="#294b70" style="--swatch:#294b70" aria-label="Тёмно-синий" aria-pressed="false"></button>
      </div>
      <p class="showroom-status" role="status">Загружается 3D-модель</p>
      <div class="showroom-turn" aria-label="Поворот автомобиля">
        <button type="button" data-turn="-1" aria-label="Повернуть влево">←</button>
        <button type="button" data-turn="1" aria-label="Повернуть вправо">→</button>
      </div>
    </div>
    <div class="showroom-meta"><strong id="showroom-car-name"></strong>
      <span>Потяните кузов, чтобы повернуть его</span>
    </div>
    <p id="zone-info" class="car-caption" aria-live="polite"></p>
    <div id="zone-preview" hidden></div>
    ${visual.fallback ? '<p class="showroom-credit" id="fallback-note"></p>' : ''}
    <p class="showroom-credit">${visual.modelKey === 'bmw-x5-g05'
      ? '<a href="https://github.com/bmwcarit/digital-car-3d/tree/master/G05">Геометрия BMW X5 G05 · BMW Group</a>'
      : visual.modelKey === 'bmw-x6-f96'
        ? '<a href="https://sketchfab.com/3d-models/bmw-x6m-competition-assetto-wwwvecarzcom-3979a908081948e0971f5a5380b60a0f">Геометрия BMW X6 M · vecarz</a>'
        : '<a href="https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b">BMW M4 Competition · SRT Performance</a>'}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · Адаптированы материалы и убраны шильдики.</p>`;
  find('#showroom-car-name',car).textContent = vehicleName();
  if (visual.fallback) find('#fallback-note',car).textContent =
    'Визуальная основа класса — ' + visual.base + '. Расчёт относится к выбранному автомобилю.';
  const host = find('.showroom-scene',car);
  showZone();
  if (step !== 2) {
    host.remove();
    return;
  }
  import('./showroom.js').then(() => {
    if (!host.isConnected || step !== 2) return;
    return window.uvedShowroom.mount(host,{
      selected: () => selected,
      select: togglePart,
      inspect: showZone
    },{modelKey:visual.modelKey, label:vehicleName(), finish:filmTypes[film][0], active:() => step === 2});
  }).catch(() => {
    if (host.isConnected) find('.showroom-status',host).textContent = '3D-модель доступна при открытии сайта через сервер.';
  });
}
function drawCar() {
  const visual = currentVisual();
  const container = car;
  const tabs = find('#views');
  const oldScene = find('.showroom-scene',car);
  if (oldScene) window.uvedShowroom?.unmount(oldScene);
  const showroom = showroomVehicle();
  find('#parts-panel').classList.toggle('has-showroom',Boolean(showroom));
  if (showroom) {
    tabs.replaceChildren();
    container.classList.remove('car-unavailable');
    drawShowroom(showroom);
    return;
  }
  const oldViewport = find('.car-viewport', car);
  const scrollLeft = oldViewport?.scrollLeft ?? 0;
  const scrollTop = oldViewport?.scrollTop ?? 0;
  if (!visual) {
    tabs.replaceChildren();
    container.textContent = 'Для этого кузова пока доступен расчёт по списку деталей.';
    container.classList.add('car-unavailable');
    return;
  }
  container.classList.remove('car-unavailable');
  if (!visual.views[view]) view = Object.keys(visual.views)[0];
  const frames = rotationFrames(visual);
  tabs.innerHTML = Object.keys(visual.views).map(id => `<button type="button" data-view="${id}" aria-pressed="${id === view}">${viewLabels[id]}</button>`).join('');
  const { image, aspect, zones } = visual.views[view];
  container.innerHTML = `
    <p class="car-caption">${visual.brand} ${visual.model} · ${fields.year.value} · ${visual.bodyVariant} · Фоторакурсы</p>
    ${frames.length > 1 ? '<p class="car-caption">Потяните автомобиль влево или вправо. Нажмите на деталь, чтобы выбрать её.</p>' : ''}
    <div class="chips car-tools" aria-label="Категории зон">${Object.entries(zoneModes).map(([id, name]) =>
      `<button type="button" data-zone-mode="${id}" aria-pressed="${id === zoneMode}">${name}</button>`).join('')}</div>
    <div class="chips car-tools" aria-label="Масштаб"><button type="button" data-zoom="-1" aria-label="Уменьшить">−</button><button type="button" data-zoom="0" aria-label="Сбросить масштаб">100%</button><button type="button" data-zoom="1" aria-label="Увеличить">+</button></div>
    <div class="car-viewport" style="aspect-ratio:${aspect}"><div class="car-stage" ${frames.length > 1 && frames.includes(view) ? 'data-rotatable tabindex="0" aria-label="Поворот автомобиля стрелками влево и вправо"' : ''} style="aspect-ratio:${aspect}">
      <img draggable="false" src="${image}" alt="${visual.brand} ${visual.model} — ${viewLabels[view]}">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Зоны оклейки">
      ${Object.entries(zones).filter(([id]) => visibleZone(id)).map(([id, points]) => `
        <polygon class="hotspot" role="button" tabindex="0" data-part="${id}"
          aria-label="${parts.get(id)[1]}" aria-pressed="${selected.has(id)}" points="${points}">
          <title>${parts.get(id)[1]} · ${partPrice(id) === null ? 'Цена по запросу' : currency.format(partPrice(id))}</title>
        </polygon>`).join('')}
      </svg>
    </div></div>
    <p class="car-caption" id="zone-info" aria-live="polite"></p>`;
  updateZoom();
  const viewport = find('.car-viewport', car);
  viewport.scrollLeft = scrollLeft;
  viewport.scrollTop = scrollTop;
  if (Object.keys(zones).some(visibleZone)) showZone();
  else find('#zone-info').textContent = 'В этом ракурсе нет зон выбранной категории. Смените ракурс или выберите деталь в списке.';
}
car.addEventListener('pointerover', event => {
  const zone = event.target.closest('.hotspot');
  if (zone) showZone(zone.dataset.part);
});
car.addEventListener('focusin', event => {
  if (event.target.matches('.hotspot')) showZone(event.target.dataset.part);
});
function rotateCar(direction) {
  const frames = rotationFrames(currentVisual());
  if (frames.length < 2) return;
  view = frames[(frames.indexOf(view) + direction + frames.length) % frames.length];
  drawCar();
}

car.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  suppressPartClick = false;
  if (!event.target.closest('[data-rotatable]')) return;
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY, rotating: false};
});
car.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  if (!drag.rotating && Math.abs(event.clientY - drag.y) > Math.abs(dx)) return;
  const threshold = drag.rotating ? 42 : 18;
  if (Math.abs(dx) < threshold) return;
  if (!drag.rotating) car.setPointerCapture(event.pointerId);
  drag.rotating = true;
  suppressPartClick = true;
  drag.x = event.clientX;
  rotateCar(dx < 0 ? 1 : -1);
});
function finishRotation(event) {
  if (drag?.id !== event.pointerId) return;
  drag = undefined;
}
car.addEventListener('pointerup', finishRotation);
car.addEventListener('pointercancel', finishRotation);
car.addEventListener('lostpointercapture', finishRotation);
car.addEventListener('pointerleave', event => {
  if (!drag?.rotating) finishRotation(event);
});
car.addEventListener('keydown', event => {
  if (!event.target.matches('[data-rotatable]')) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  rotateCar(event.key === 'ArrowLeft' ? 1 : -1);
  find('[data-rotatable]', car).focus({preventScroll: true});
});

find('#views').addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (!button) return;
  view = button.dataset.view;
  if (view.startsWith('interior') && zoneMode !== 'doors') zoneMode = 'sills';
  drawCar();
  find('[data-view="' + view + '"]').focus({preventScroll: true});
});
const unavailableM4 = /^(?:door|cup|handle|edge|end|innerDoor)R[LR]$/;
const availablePart = id => chosenVehicle()?.vehicleClass !== 'coupe' || !unavailableM4.test(id);
function syncParts() {
  selected.forEach(id => {if (!availablePart(id)) selected.delete(id);});
  findAll('#part-list .part').forEach(label => {label.hidden = !availablePart(find('input',label).dataset.part);});
  findAll('#part-list details').forEach(group => {group.hidden = !find('.part:not([hidden])',group);});
  window.uvedShowroom?.sync(selected);
  findAll('[data-part]').forEach(element => {
    const checked = selected.has(element.dataset.part);
    if (element instanceof HTMLInputElement) element.checked = checked;
    else element.setAttribute('aria-pressed', checked);
  });
  findAll('[data-kit]').forEach(button => {
    const ids = packages[button.dataset.kit];
    button.hidden = ids.some(id => !availablePart(id));
    button.setAttribute('aria-pressed', selected.size === ids.length && ids.every(id => selected.has(id)));
  });
  updateSummary();
}
function togglePart(id) {
  if (selected.has(id)) selected.delete(id);
  else {
    pricing.conflicts.filter(([first, ...rest]) => first === id || rest.includes(id)).forEach(([first, ...rest]) => {
      if (id === first) rest.forEach(other => selected.delete(other));
      else selected.delete(first);
    });
    selected.add(id);
  }
  syncParts();
}
function selectParts(ids) {
  selected.clear();
  ids.filter(availablePart).forEach(id => selected.add(id));
  syncParts();
}

find('#kits').innerHTML = Object.keys(packages).map(name => `<button type="button" data-kit="${name}" title="${packages[name].map(id => parts.get(id)[1]).join(', ')}">${name}</button>`).join('');
findAll('[data-kit]').forEach(button => button.addEventListener('click', () => selectParts(packages[button.dataset.kit])));
const partGroups = [
  ['Передняя часть', /^(?:hood|bumperF$|bumperCenter|bumperSide|fenderF|fenderStrips|grille|trimF)/],
  ['Боковые элементы', /^(?:fenderR|rearFender|door[FR][LR]$|doorLower|mirror|pillar|windshieldPillars|fuel|arch)/],
  ['Пороги и проёмы', /^(?:sill|innerSill|entry|aperture)/],
  ['Ручки и кромки', /^(?:handle|cup|edge|end|innerDoor|doorEdge)/],
  ['Крыша', /^(?:roof|panorama)/],
  ['Оптика', /^(?:light|fog)/],
  ['Дополнительно', /./]
];
const groupedParts = new Map(partGroups.map(([label]) => [label, []]));
for (const part of carParts) {
  const [label] = partGroups.find(([, pattern]) => pattern.test(part[0]));
  groupedParts.get(label).push(part);
}
find('#part-list').innerHTML = [...groupedParts].map(([label, items]) =>
  `<details><summary>${label}</summary><div class="parts-grid">${items
    .map(([id, name]) => `<label class="part"><input type="checkbox" data-part="${id}">${name}<small data-price="${id}"></small></label>`).join('')}</div></details>`
).join('');
find('#part-list').addEventListener('change', event => {
  const id = event.target.dataset.part;
  togglePart(id);
  if (showroomVehicle()) showZone(id);
});
car.addEventListener('click', event => {
  if (suppressPartClick && event.detail) return;
  const hotspot = event.target.closest('[data-part]');
  if (hotspot) {
    togglePart(hotspot.dataset.part);
    showZone(hotspot.dataset.part);
    return;
  }
  const mode = event.target.closest('[data-zone-mode]');
  if (mode) {
    zoneMode = mode.dataset.zoneMode;
    const visual = currentVisual();
    const rightSide = ['right','frontRight','rearRight','interiorRight'].includes(view);
    const preferred = {
      body: 'frontLeft', risk: 'frontLeft', doors: rightSide ? 'right' : 'left',
      sills: rightSide ? 'interiorRight' : 'interiorLeft', roof: 'left', lights: 'front', trim: 'frontLeft'
    }[zoneMode];
    if (!(zoneMode === 'doors' && view.startsWith('interior')) && visual.views[preferred]) {
      view = preferred;
    } else if (!Object.keys(visual.views[view].zones).some(visibleZone)) {
      view = Object.keys(visual.views).find(id => Object.keys(visual.views[id].zones).some(visibleZone)) ?? view;
    }
    drawCar();
    find('[data-zone-mode="' + zoneMode + '"]').focus({preventScroll:true});
    return;
  }
  const control = event.target.closest('[data-zoom]');
  if (control) {
    const direction = Number(control.dataset.zoom);
    const viewport = find('.car-viewport', car);
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight;
    zoom = direction ? Math.min(2.5, Math.max(1, zoom + direction * .5)) : 1;
    updateZoom();
    viewport.scrollLeft = centerX * viewport.scrollWidth - viewport.clientWidth / 2;
    viewport.scrollTop = centerY * viewport.scrollHeight - viewport.clientHeight / 2;
  }
});
find('#car').addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const hotspot = event.target.closest('[data-part]');
  if (!hotspot) return;
  event.preventDefault();
  togglePart(hotspot.dataset.part);
  showZone(hotspot.dataset.part);
});
const selectExterior = () => selectParts(pricing.exterior.filter(id => id !== 'trunk').concat(trunkPart()));
find('#all').addEventListener('click', selectExterior);
const full = Object.assign(document.createElement('button'), {type: 'button', textContent: 'Полная оклейка'});
full.addEventListener('click', selectExterior);
find('#kits').append(full);
find('#clear').addEventListener('click', () => selectParts([]));

findAll('[data-service-film]').forEach(link => link.addEventListener('click', () => {
  const filmIndex = filmTypes.findIndex(([id]) => id === link.dataset.serviceFilm);
  find('[data-film="' + filmIndex + '"]').click();
  const kit = link.dataset.serviceKit;
  if (kit === 'Полная оклейка') selectExterior();
  else if (kit === 'Полная защита') selectParts([...pricing.exterior.filter(id => id !== 'trunk'),trunkPart(),'lightF','lightR']);
  else if (packages[kit]) selectParts(packages[kit]);
  if (vehicle.checkValidity()) changeStep(2,false);
  else changeStep(0,false);
}));
findAll('[data-gallery]').forEach(button => button.addEventListener('click', () => {
  const gallery = find('.work-gallery');
  gallery.scrollBy({
    left:Number(button.dataset.gallery) * (find('figure',gallery).offsetWidth + 14),
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  });
}));

const partsSheet = find('#parts-sheet');
const detailOptions = find('.detail-options');
const mobilePartsButton = find('#open-parts-sheet');
mobilePartsButton.addEventListener('click', () => {
  partsSheet.append(detailOptions);
  partsSheet.showModal();
});
find('#close-parts-sheet').addEventListener('click', () => partsSheet.close());
partsSheet.addEventListener('close', () => {
  mobilePartsButton.after(detailOptions);
  mobilePartsButton.focus({preventScroll:true});
});

document.addEventListener('uved:wrap-selection', ({detail}) => {
  const {film: swatch, vehicleImage, selectedParts, book} = detail;
  const pricingFinish = ['matte', 'satin'].includes(swatch.finish) ? swatch.finish : 'color';
  const index = filmTypes.findIndex(([id]) => id === pricingFinish);
  find('[data-film="' + index + '"]').click();
  wrapSelection = {
    label: [swatch.brand, swatch.name].join(' · '),
    brand: swatch.brand, filmName: swatch.name, filmCode: swatch.code,
    finish: swatch.finish, selectedColor: swatch.hex, uploadedVehicleImage: vehicleImage, selectedParts
  };
  updateSummary();
  changeStep(vehicle.checkValidity() ? 2 : 0, false);
  location.hash = '#calculator';
  if (book) find('#calculator [data-book]').click();
});

const dialog = find('#booking');
const request = find('#request');
const confirmation = find('#confirmation');
function bookingInfo() {
  const location = find('input[name="location"]:checked').value;
  const quote = selected.size ? displayPrice(location) : 'Расчёт не выполнен';
  return [vehicleName(), currentVisual()?.bodyVariant, wrapSelection?.label ?? filmTypes[film][1], location === 'studio' ? 'У мастера' : 'С выездом', quote].filter(Boolean).join(' · ');
}
const bookingParts = () => quoteLines().map(({label,value}) => label + ' — ' + (value === null ? 'Цена по запросу' : currency.format(value)));
findAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  find('#request-summary').textContent = [bookingInfo(), ...bookingParts()].join('\n');
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone:bookingSettings.timeZone, dateStyle:'short'}).format(new Date());
  request.elements.date.min = today;
  const mobile = find('input[name="location"]:checked').value === 'mobile';
  find('#visit-address').hidden = !mobile;
  for (const field of [request.elements.district,request.elements.address]) {
    field.disabled = !mobile;
    field.required = mobile;
  }
  request.hidden = false;
  confirmation.hidden = true;
  dialog.showModal();
}));
findAll('.close', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
request.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(request));
  draft = { ...data, car: vehicleName(), generation: currentVisual()?.generation ?? null, quote: bookingInfo(), parts: bookingParts() };
  let saved = false;
  try {
    localStorage.setItem(bookingSettings.storageKey, JSON.stringify(draft));
    saved = true;
  } catch {}
  find('#confirmation-text').textContent = saved
    ? 'Заявка сохранена в браузере. Скачайте её для передачи мастеру.'
    : 'Скачайте заявку, чтобы сохранить её и передать мастеру.';
  request.hidden = true;
  confirmation.hidden = false;
  find('#download').focus();
});
find('#download').addEventListener('click', () => {
  const lines = ['Заявка UVED', draft.quote, 'Имя: ' + draft.name, 'Телефон: ' + draft.phone, 'Дата: ' + (draft.date || 'по согласованию'), 'Время: ' + (draft.time || 'по согласованию'), 'Детали: ' + (draft.parts.join(', ') || 'по согласованию'), 'Комментарий: ' + draft.comment];
  if (draft.address) lines.splice(-1,0,'Район: ' + draft.district,'Адрес выезда: ' + draft.address);
  const url = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'}));
  const link = Object.assign(document.createElement('a'), {href:url, download:'UVED-заявка.txt'});
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
find('#visit-fee').textContent = currency.format(mobileServicePricing.mobileServiceFee);
changeStep(0, false);
drawCar();
syncParts();

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  }), {threshold: 0.08});
  findAll('.services article, .contact').forEach(element => {
    element.classList.add('reveal');
    observer.observe(element);
  });
}
