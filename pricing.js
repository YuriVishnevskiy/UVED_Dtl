const doorPositions = {FL:'передней левой двери', FR:'передней правой двери', RL:'задней левой двери', RR:'задней правой двери'};
const doorDetails = {
  cup:'Зона под ручкой', handle:'Ручка', edge:'Кромка', end:'Торец', innerDoor:'Внутренняя часть'
};
const sillSides = {L:'левая сторона', R:'правая сторона'};
const sillDetails = {
  innerSill:'Внутренний порог', sillTop:'Верх порога', entry:'Зона посадки',
  sillTrim:'Накладка порога', aperture:'Дверной проём', sillFront:'Порог под передней дверью', sillRear:'Порог под задней дверью'
};
const allCups = Object.keys(doorPositions).map(position => 'cup' + position);
const innerSills = ['innerSillL','innerSillR'];

const pricing = {
  parts: [
    ...Object.entries(doorPositions).flatMap(([position, name]) =>
      Object.entries(doorDetails).map(([id, label]) => [id + position, label + ' ' + name, 'Двери и ручки'])),
    ...Object.entries(sillSides).flatMap(([side, name]) =>
      Object.entries(sillDetails).map(([id, label]) => [id + side, label + ' · ' + name, 'Пороги и проёмы'])),
    ['hoodFront','Передняя часть капота','Передняя часть'],
    ['roofFront','Передняя часть крыши','Крыша и задняя часть'],
    ['bumperCenter','Центральная часть переднего бампера','Передняя часть'],
    ['bumperSideL','Левая зона переднего бампера','Передняя часть'],
    ['bumperSideR','Правая зона переднего бампера','Передняя часть'],
    ['bumperRearTop','Верхняя зона заднего бампера','Крыша и задняя часть'],
    ['hood','Капот','Передняя часть'],
    ['bumperF','Передний бампер','Передняя часть'],
    ['fenderFL','Переднее левое крыло','Передняя часть'],
    ['fenderFR','Переднее правое крыло','Передняя часть'],
    ['lightF','Передняя оптика','Передняя часть'],
    ['fog','Противотуманные фары','Передняя часть'],
    ['trimF','Элементы передней части','Передняя часть'],
    ['doorFL','Передняя левая дверь','Боковины'],
    ['doorFR','Передняя правая дверь','Боковины'],
    ['doorRL','Задняя левая дверь','Боковины'],
    ['doorRR','Задняя правая дверь','Боковины'],
    ['fenderRL','Заднее левое крыло со стойкой','Боковины'],
    ['fenderRR','Заднее правое крыло со стойкой','Боковины'],
    ['sillL','Левый порог','Боковины'],
    ['sillR','Правый порог','Боковины'],
    ['pillarFL','Передняя стойка левая','Боковины'],
    ['pillarFR','Передняя стойка правая','Боковины'],
    ['pillarsM','Средние стойки','Боковины'],
    ['pillarsR','Задние стойки','Боковины'],
    ['sillsOut','Наружные части порогов','Боковины'],
    ['sillsIn','Внутренние части порогов','Боковины'],
    ['roof','Крыша','Крыша и задняя часть'],
    ['trunk','Крышка багажника','Крыша и задняя часть'],
    ['tailgate','Дверь багажника','Крыша и задняя часть'],
    ['bumperR','Задний бампер','Крыша и задняя часть'],
    ['lightR','Задняя оптика','Крыша и задняя часть'],
    ['spoiler','Спойлер','Крыша и задняя часть'],
    ['trimR','Элементы задней части','Крыша и задняя часть'],
    ['mirrorL','Левое зеркало','Дополнительные элементы'],
    ['mirrorR','Правое зеркало','Дополнительные элементы'],
    ['mirrorCaps','Корпуса зеркал','Дополнительные элементы'],
    ['handles','Ручки дверей','Дополнительные элементы'],
    ['cups','Зоны под ручками','Дополнительные элементы'],
    ['fuel','Лючок бензобака','Дополнительные элементы'],
    ['decor','Декоративные наружные элементы','Дополнительные элементы'],
    ['gloss','Глянцевые элементы','Дополнительные элементы'],
    ['chrome','Хромированные элементы','Дополнительные элементы'],
    ['dechrome','Антихром','Дополнительные элементы'],
    ['loading','Погрузочная зона багажника','Крыша и задняя часть'],
    ['windshieldPillars','Стойки лобового стекла, 2 шт.','Боковины'],
    ['roofStrip','Полоса на крышу, 30 см','Крыша и задняя часть'],
    ['roofRear','Задняя часть крыши','Крыша и задняя часть'],
    ['doorPillarGloss','Глянцевые стойки дверей, 4 шт.','Боковины'],
    ['hoodStrip','Полоса на капот, 30–55 см','Передняя часть'],
    ['fenderStrips','Полосы на крылья, 2 шт.','Передняя часть'],
    ['panorama','Панорамная крыша','Крыша и задняя часть'],
    ['doorEdge','Торец двери, 1 шт.','Боковины'],
    ['doorEdges','Торцы дверей, 4 шт.','Боковины'],
    ['doorLower','Низ двери, полоса 30 см, 1 шт.','Боковины'],
    ['rearFenderUpper','Верх заднего крыла, 1 шт.','Боковины'],
    ['rearFenderLower','Низ заднего крыла, 1 шт.','Боковины'],
    ['arch','Расширение арки, 1 шт.','Боковины'],
    ['mirrors','Зеркала, 2 шт.','Дополнительные элементы'],
    ['grille','Решётка','Передняя часть'],
    ['plastic','Дополнительные пластиковые элементы','Дополнительные элементы']
  ],
  conflicts: [
    ['trunk','tailgate'], ['sillsOut','sillL','sillR'], ['mirrorCaps','mirrorL','mirrorR','mirrors'], ['mirrors','mirrorL','mirrorR'], ['windshieldPillars','pillarFL','pillarFR'], ['doorEdges','doorEdge'], ['hood','hoodStrip','hoodFront'], ['hoodFront','hoodStrip'], ['bumperF','bumperCenter','bumperSideL','bumperSideR'], ['bumperR','bumperRearTop'], ['cups',...allCups], ['sillsIn',...innerSills], ['doorEdges',...Object.keys(doorPositions).map(id => 'end' + id)], ['roof','roofRear','roofStrip','roofFront','panorama'], ['fenderStrips','fenderFL','fenderFR'], ['chrome','dechrome']
  ],
  exterior: ['hood','bumperF','bumperR','fenderFL','fenderFR','fenderRL','fenderRR','doorFL','doorFR','doorRL','doorRR','roof','trunk','sillL','sillR','mirrors'],
  kits: {
    'Минимальная защита': ['hoodStrip','lightF',...allCups],
    'Все зоны под ручками': allCups,
    'Все внутренние пороги': innerSills,
    'Пороги + зоны посадки': [...innerSills,'entryL','entryR'],
    'Капот + полоса крыши': ['hood','roofStrip'],
    'Все глянцевые элементы': ['gloss'],
    'Оптика': ['lightF','lightR','fog'],
    'Ручки + зоны под ручками': [...allCups,...Object.keys(doorPositions).map(id => 'handle' + id)],
    'Антихром': ['dechrome'],
    'Зона риска': ['bumperF','lightF',...allCups],
    'Передняя часть': ['hood','bumperF','fenderFL','fenderFR','mirrors','lightF'],
    'Передняя часть расширенная': ['hood','bumperF','fenderFL','fenderFR','mirrors','lightF','sillL','sillR',...allCups,'windshieldPillars']
  }
};

const vehiclePriceGroups = [1, 2, 3, 4, 5];
// Прайс_оклейка_и_расклейка.xlsx, лист с ценами «работа + материал».
const clearPartPrices = {
  ...Object.fromEntries(Object.keys(doorPositions).map(id => ['end' + id, 500])),
  hood: 13500, bumperF: 17000, fenderFL: 7700, fenderFR: 7700,
  loading: 2500, sillsIn: 3500, windshieldPillars: 3700, roofStrip: 3400,
  cups: 1500, lightF: 4000, fog: 2000, roof: 16700, roofRear: 5300,
  bumperR: 17000, fenderRL: 14700, fenderRR: 14700,
  rearFenderUpper: 10000, rearFenderLower: 5500,
  doorFL: 9000, doorFR: 9000, doorRL: 9000, doorRR: 9000,
  doorLower: 3400, sillL: 10000, sillR: 10000, sillsOut: 13000,
  trunk: 9700, tailgate: 9700, mirrors: 4000, doorPillarGloss: 4200,
  doorEdge: 500, doorEdges: 2000, hoodStrip: 4000, fenderStrips: 3000,
  panorama: 13500, arch: 5500
};
const clearPricesByPart = Object.fromEntries(Object.entries(clearPartPrices).map(([id, clear]) => [id, {clear}]));
const pricingTable = Object.fromEntries(vehiclePriceGroups.map(group => [group, {...clearPricesByPart}]));
const pairedPartPrices = [
  {parts: allCups, label: 'Зоны под четырьмя ручками', clear: clearPartPrices.cups},
  {parts: innerSills, label: 'Внутренние пороги, 4 шт.', clear: clearPartPrices.sillsIn},
  {parts: ['sillL', 'sillR'], clear: clearPartPrices.sillsOut},
  {parts: ['mirrorL', 'mirrorR'], clear: clearPartPrices.mirrors}
];
const filmTypes = [
  ['clear','Прозрачная','Сохраняет оригинальный внешний вид автомобиля'],
  ['color','Цветная','Позволяет изменить цвет автомобиля'],
  ['matte','Матовая','Создаёт матовый внешний эффект'],
  ['satin','Сатиновая','Мягкий блеск между глянцем и матовым эффектом']
];
const carParts = pricing.parts;
const packages = pricing.kits;
const mobileServicePricing = {mobileServiceFee: 4500};
const bookingSettings = {timeZone: 'Europe/Moscow', storageKey: 'uved-latest-request'};
const catalog = {
  Audi: [[2,'A3'],[3,'A4','A5','A6','A7','Q3','Q5'],[4,'Q7','Q8']],
  BMW: [[2,'3 Series','X1'],[3,'5 Series','X3','X4','M4 Competition'],[4,'7 Series','X5','X6','X6 M'],[5,'X7']],
  'Mercedes-Benz': [[2,'A-Class','C-Class','CLA'],[3,'E-Class','GLC'],[4,'S-Class','CLS','GLE','GLE Coupe'],[5,'GLS','V-Class']],
  Porsche: [[3,'911','Macan','Taycan'],[4,'Cayenne','Panamera']],
  Volkswagen: [[1,'Polo'],[2,'Golf','Jetta'],[3,'Passat','Tiguan'],[4,'Touareg'],[5,'Multivan']],
  Volvo: [[3,'S60','V60','XC40','XC60'],[4,'XC90']],
  Toyota: [[2,'Corolla','Yaris','C-HR'],[3,'Camry','RAV4'],[4,'Highlander','Land Cruiser Prado'],[5,'Land Cruiser 300','Alphard']],
  Lexus: [[3,'ES','NX'],[4,'RX','GX'],[5,'LX']],
  Kia: [[1,'Rio','Picanto'],[2,'Ceed','Cerato'],[3,'K5','Sportage'],[4,'Sorento'],[5,'Carnival']],
  Hyundai: [[1,'Solaris'],[2,'Elantra','Creta'],[3,'Sonata','Tucson'],[4,'Santa Fe'],[5,'Palisade','Staria']],
  Skoda: [[2,'Rapid','Fabia'],[3,'Octavia','Karoq','Superb'],[4,'Kodiaq']],
  Geely: [[2,'Coolray','Emgrand'],[3,'Atlas','Cityray','Monjaro'],[4,'Okavango']],
  Chery: [[2,'Tiggo 4'],[3,'Tiggo 7 Pro'],[4,'Tiggo 8 Pro']],
  Exeed: [[3,'LX','TXL'],[4,'RX','VX']],
  Haval: [[2,'Jolion','M6'],[3,'F7','Dargo','H3'],[4,'H5','H7','H9']],
  'Li Auto': [[4,'L6','L7','L8'],[5,'L9','Mega']],
  Zeekr: [[3,'X','007'],[4,'001','7X'],[5,'009']],
  Tesla: [[3,'Model 3','Model Y'],[4,'Model S','Model X']],
  Lada: [[1,'Granta','Niva Legend'],[2,'Vesta','Niva Travel'],[3,'Largus']],
  Mazda: [[2,'Mazda3'],[3,'Mazda6','CX-5'],[4,'CX-9']],
  Honda: [[2,'Civic','Fit'],[3,'Accord','HR-V','CR-V'],[5,'Odyssey']],
  'Land Rover': [[4,'Discovery Sport','Range Rover Evoque','Range Rover Velar'],[5,'Defender','Discovery','Range Rover']],
  Ford: [[2,'Fiesta','Focus'],[3,'Mondeo','Kuga'],[5,'Explorer','Ranger','Transit']],
  BYD: [[2,'Dolphin'],[3,'Seal','Atto 3','Song Plus'],[4,'Tang'],[5,'Shark']],
  Nissan: [[2,'Almera','Juke'],[3,'Qashqai','X-Trail'],[5,'Patrol']]
};
const vehicleClasses = {
  hatch:'Компактный хэтчбек',sedan:'Седан',wagon:'Универсал',coupe:'Купе',
  smallSUV:'Небольшой кроссовер',crossover:'Средний кроссовер',suvCoupe:'Кроссовер-купе',
  largeSUV:'Большой SUV',offroad:'Внедорожник',fastback:'Лифтбек',
  minivan:'Минивэн',van:'Микроавтобус',pickup:'Пикап'
};
function vehicleClass(model,priceGroup) {
  if (/^(Ranger|Shark)$/.test(model)) return 'pickup';
  if (/^(Transit|Staria)$/.test(model)) return 'van';
  if (/^(Multivan|V-Class|Carnival|Alphard|Mega|009|Odyssey)$/.test(model)) return 'minivan';
  if (/^(Defender|Land Cruiser|GX$|LX$|Patrol$|Niva|H9$|H5$)/.test(model)) return 'offroad';
  if (/^(X4|X6|Q8|GLE Coupe|RX$)/.test(model) && model !== 'RX') return 'suvCoupe';
  if (/^(911|M4 Competition)$/.test(model)) return 'coupe';
  if (/^(V60|Largus)$/.test(model)) return 'wagon';
  if (/^(Octavia|Superb|Rapid|Model S|001|Panamera)$/.test(model)) return 'fastback';
  if (/^(A3|A-Class|Golf|Yaris|Picanto|Ceed|Fabia|Dolphin|Fiesta|Fit)$/.test(model)) return 'hatch';
  if (/^(X[1357]|Q[357]|GL[CES]|XC|Tiguan|Touareg|Macan|Cayenne|RAV4|Highlander|NX$|RX$|Sportage|Sorento|Creta|Tucson|Santa Fe|Palisade|Karoq|Kodiaq|Coolray|Atlas|Cityray|Monjaro|Okavango|Tiggo|TXL|VX|Jolion|M6|F7|Dargo|H[37]|L[6789]$|X$|7X|Model [YX]|CX-|Juke|Qashqai|X-Trail|C-HR|HR-V|CR-V|Range Rover|Discovery|Kuga|Explorer|Atto 3|Song Plus|Tang)/.test(model)) {
    return priceGroup >= 5 || /^(GLS|XC90|Q7|Highlander|Range Rover$|Tang)$/.test(model)
      ? 'largeSUV' : priceGroup <= 2 || /^(Q3|XC40|C-HR|HR-V|X1)$/.test(model) ? 'smallSUV' : 'crossover';
  }
  return 'sedan';
}
const vehicles = Object.fromEntries(Object.entries(catalog).map(([brand, groups]) => [
  brand, groups.flatMap(([priceGroup, ...models]) => models.map(model => ({
    brand, model, priceGroup, sizeClass: vehiclePriceGroups[priceGroup - 1],
    vehicleClass: vehicleClass(model,priceGroup),
    hatch: !['sedan','coupe','pickup'].includes(vehicleClass(model,priceGroup))
  })))
]));
