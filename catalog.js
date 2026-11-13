// Each row describes a production span or a named generation.
// A null end year denotes a model tracked through the catalogue's coverage year.
const catalogCoverageYear = 2026;
const catalogRows = {
  BMW: [
    ['1 Series','hatch',2,2004], ['2 Series','coupe',3,2013], ['4 Series','coupe',3,2013], ['8 Series','coupe',5,2018],
    ['M4 Competition','coupe',3,2021], ['X3','crossover',3,2003,2010,'E83'], ['X3','crossover',3,2010,2017,'F25'], ['X3','crossover',3,2017,2024,'G01'], ['X3','crossover',3,2024,null,'G45','g45'],
    ['X2','smallSUV',3,2017], ['XM','largeSUV',5,2022], ['i4','fastback',3,2021], ['i5','sedan',4,2023], ['i7','sedan',5,2022], ['iX','crossover',5,2021],
    ['X5','crossover',4,1999,2006,'E53'], ['X5','crossover',4,2006,2013,'E70'], ['X5','crossover',4,2013,2018,'F15','f15'],
    ['X5','crossover',4,2018,2023,'G05','g05'], ['X5','crossover',4,2023,null,'G05 LCI','g05-lci'],
    ['5 Series','sedan',3,2003,2010,'E60'], ['5 Series','sedan',3,2010,2017,'F10'], ['5 Series','sedan',3,2017,2023,'G30'], ['5 Series','sedan',3,2023,null,'G60']
  ],
  'Mercedes-Benz': [
    ['B-Class','hatch',3,2005], ['GLA','smallSUV',3,2013], ['GLB','smallSUV',3,2019], ['G-Class','offroad',5,1979],
    ['EQE','sedan',4,2022], ['EQS','fastback',5,2021], ['EQA','smallSUV',3,2021], ['EQB','smallSUV',3,2021], ['EQE SUV','crossover',4,2022], ['EQS SUV','largeSUV',5,2022],
    ['GLC','crossover',3,2015,2019,'X253'], ['GLC','crossover',3,2019,2022,'X253 facelift'], ['GLC','crossover',3,2022,null,'X254']
  ],
  Audi: [['A1','hatch',2,2010], ['Q2','smallSUV',2,2016], ['Q4 e-tron','smallSUV',3,2021], ['Q6 e-tron','crossover',4,2024], ['e-tron','crossover',4,2018,2022], ['e-tron GT','sedan',5,2021]],
  Toyota: [['Camry','sedan',3,2011,2017,'XV50'], ['Camry','sedan',3,2017,2024,'XV70'], ['Camry','sedan',3,2023,null,'XV80'], ['RAV4','crossover',3,1994,2000,'XA10'], ['RAV4','crossover',3,2000,2005,'XA20'], ['RAV4','crossover',3,2005,2012,'XA30'], ['RAV4','crossover',3,2012,2018,'XA40'], ['RAV4','crossover',3,2018,2025,'XA50','rav4-xa50'], ['RAV4','crossover',3,2025,null,'XA60'], ['Prius','fastback',3,1997], ['Crown','sedan',4,1955], ['Supra','coupe',4,2019], ['Sienna','minivan',5,1997]],
  Acura: [['Integra','fastback',3,2022], ['TLX','sedan',4,2014,2025], ['RDX','crossover',4,2006], ['MDX','largeSUV',5,2000]],
  Infiniti: [['Q50','sedan',3,2013,2024], ['Q60','coupe',3,2016,2022], ['QX50','crossover',3,2013,2025], ['QX60','largeSUV',4,2013], ['QX80','offroad',5,2013]],
  Mitsubishi: [['Lancer','sedan',2,1973,2017], ['Outlander','crossover',4,2001], ['ASX','smallSUV',3,2010], ['Pajero','offroad',5,1982,2021], ['Pajero Sport','offroad',4,1996], ['L200','pickup',4,1978]],
  Subaru: [['Impreza','hatch',3,1992], ['Forester','crossover',3,1997], ['Outback','wagon',4,1994], ['Crosstrek','smallSUV',3,2012], ['BRZ','coupe',3,2012]],
  Suzuki: [['Swift','hatch',2,2004], ['Vitara','smallSUV',3,2015], ['Jimny','offroad',3,1970], ['SX4','smallSUV',2,2006], ['Baleno','hatch',2,2015]],
  Chevrolet: [['Cruze','sedan',2,2008,2023], ['Malibu','sedan',3,1997,2024], ['Camaro','coupe',4,2009,2024], ['Corvette','coupe',5,1953], ['Tahoe','largeSUV',5,1994], ['Silverado','pickup',5,1998], ['Equinox','crossover',3,2004]],
  Cadillac: [['CT4','sedan',3,2019], ['CT5','sedan',4,2019], ['XT4','smallSUV',3,2018,2025], ['XT5','crossover',4,2016], ['Escalade','largeSUV',5,1998], ['Lyriq','crossover',5,2022]],
  Jeep: [['Wrangler','offroad',4,1986], ['Grand Cherokee','offroad',5,1992], ['Compass','smallSUV',3,2006], ['Renegade','smallSUV',3,2014], ['Gladiator','pickup',5,2019]],
  Dodge: [['Charger','sedan',4,2005,2023], ['Challenger','coupe',4,2008,2023], ['Durango','largeSUV',5,1997], ['Hornet','smallSUV',3,2022]],
  Chrysler: [['300','sedan',4,2004,2023], ['Pacifica','minivan',5,2016], ['Voyager','minivan',5,2019]],
  Lincoln: [['Navigator','largeSUV',5,1997], ['Aviator','largeSUV',5,2019], ['Nautilus','crossover',4,2018], ['Corsair','smallSUV',4,2019]],
  Polestar: [['1','coupe',5,2019,2021], ['2','fastback',4,2020], ['3','crossover',5,2024], ['4','suvCoupe',5,2023]],
  'Range Rover': [['Range Rover','largeSUV',5,1970], ['Range Rover Sport','offroad',5,2005], ['Range Rover Velar','crossover',5,2017], ['Range Rover Evoque','smallSUV',4,2011]],
  Jaguar: [['XE','sedan',3,2015,2024], ['XF','sedan',4,2007,2024], ['F-Type','coupe',5,2013,2024], ['F-Pace','crossover',4,2016,2025], ['I-Pace','crossover',4,2018,2024]],
  Mini: [['Hatch','hatch',2,2000], ['Clubman','wagon',3,2007,2024], ['Countryman','smallSUV',3,2010], ['Aceman','smallSUV',3,2024], ['Convertible','convertible',3,2004]],
  Bentley: [['Continental GT','coupe',5,2003], ['Flying Spur','sedan',5,2005], ['Bentayga','largeSUV',5,2015]],
  'Rolls-Royce': [['Phantom','sedan',5,2003], ['Ghost','sedan',5,2009], ['Cullinan','largeSUV',5,2018], ['Spectre','coupe',5,2023], ['Wraith','coupe',5,2013,2023]],
  'Aston Martin': [['DB11','coupe',5,2016,2023], ['DB12','coupe',5,2023], ['Vantage','coupe',5,2018], ['DBX','crossover',5,2020]],
  Maserati: [['Ghibli','sedan',5,2013,2024], ['Quattroporte','sedan',5,2003,2023], ['Levante','crossover',5,2016,2024], ['Grecale','crossover',5,2022], ['GranTurismo','coupe',5,2023]],
  Ferrari: [['Roma','coupe',5,2020,2024], ['296 GTB','coupe',5,2021], ['SF90 Stradale','coupe',5,2019,2024], ['Purosangue','crossover',5,2022], ['12Cilindri','coupe',5,2024]],
  Lamborghini: [['Urus','crossover',5,2018], ['Huracán','coupe',5,2014,2024], ['Revuelto','coupe',5,2023], ['Temerario','coupe',5,2024]],
  McLaren: [['720S','coupe',5,2017,2023], ['750S','coupe',5,2023], ['Artura','coupe',5,2022], ['GTS','coupe',5,2024]],
  'Alfa Romeo': [['Giulia','sedan',4,2015], ['Stelvio','crossover',4,2016], ['Tonale','smallSUV',3,2022], ['Junior','smallSUV',3,2024]],
  Fiat: [['500','hatch',1,2007], ['Panda','hatch',1,1980], ['Tipo','sedan',2,2015], ['600','smallSUV',2,2023], ['Doblo','van',3,2000]],
  Peugeot: [['208','hatch',2,2012], ['308','hatch',3,2007], ['508','fastback',3,2018,2025], ['2008','smallSUV',3,2013], ['3008','crossover',3,2009], ['5008','largeSUV',4,2017], ['Rifter','minivan',4,2018]],
  'Citroën': [['C3','hatch',2,2002], ['C4','fastback',3,2020], ['C5 Aircross','crossover',3,2017], ['Berlingo','minivan',3,1996], ['SpaceTourer','van',5,2016]],
  Renault: [['Clio','hatch',2,1990], ['Megane','hatch',3,1995], ['Arkana','suvCoupe',3,2019], ['Captur','smallSUV',3,2013], ['Austral','crossover',3,2022], ['Kangoo','van',3,1997], ['Logan','sedan',2,2004]],
  Dacia: [['Sandero','hatch',2,2008], ['Duster','smallSUV',3,2010], ['Jogger','minivan',3,2021], ['Bigster','crossover',3,2025]],
  Opel: [['Corsa','hatch',2,1982], ['Astra','hatch',3,1991], ['Insignia','fastback',4,2008,2022], ['Mokka','smallSUV',3,2012], ['Grandland','crossover',3,2017]],
  Seat: [['Ibiza','hatch',2,1984], ['Leon','hatch',3,1999], ['Arona','smallSUV',3,2017], ['Ateca','crossover',3,2016], ['Tarraco','largeSUV',4,2018,2024]],
  Cupra: [['Formentor','suvCoupe',4,2020], ['Born','hatch',3,2021], ['Tavascan','suvCoupe',4,2024], ['Terramar','crossover',4,2024], ['Leon','hatch',3,2020]],
  Genesis: [['G70','sedan',3,2017], ['G80','sedan',4,2016], ['G90','sedan',5,2015], ['GV60','smallSUV',4,2021], ['GV70','crossover',4,2020], ['GV80','largeSUV',5,2020]],
  'Lynk & Co': [['01','crossover',3,2017], ['03','sedan',3,2018], ['05','suvCoupe',4,2019], ['06','smallSUV',3,2020], ['09','largeSUV',5,2021], ['08','crossover',4,2023]],
  Omoda: [['C5','smallSUV',3,2022], ['E5','smallSUV',3,2023], ['C7','crossover',4,2024]],
  Jaecoo: [['J7','crossover',3,2023], ['J8','crossover',4,2023]],
  'Great Wall': [['Poer','pickup',4,2019], ['Wingle 7','pickup',4,2018], ['Hover H3','offroad',3,2009,2016]],
  Tank: [['300','offroad',4,2020], ['400','offroad',4,2023], ['500','offroad',5,2021], ['700','offroad',5,2024]],
  Wey: [['Coffee 01','crossover',4,2021], ['Coffee 02','crossover',4,2021], ['Gaoshan','minivan',5,2023]],
  NIO: [['ET5','sedan',4,2022], ['ET7','sedan',5,2022], ['ES6','crossover',4,2018], ['ES8','largeSUV',5,2018], ['EC6','suvCoupe',4,2020], ['EL8','largeSUV',5,2024]],
  XPeng: [['P7','sedan',4,2020], ['P5','sedan',3,2021], ['G6','suvCoupe',4,2023], ['G9','largeSUV',5,2022], ['X9','minivan',5,2024]],
  Hongqi: [['H5','sedan',4,2018], ['H9','sedan',5,2020], ['HS5','crossover',4,2019], ['E-HS9','largeSUV',5,2020]],
  GAC: [['GS3','smallSUV',3,2017], ['GS8','largeSUV',5,2016], ['M8','minivan',5,2017], ['Empow','sedan',3,2021], ['Aion Y','minivan',4,2021]],
  Changan: [['Alsvin','sedan',2,2018], ['Eado','sedan',3,2012], ['CS35 Plus','smallSUV',3,2018], ['CS55 Plus','crossover',3,2019], ['CS75 Plus','crossover',4,2019], ['UNI-K','crossover',4,2021], ['UNI-V','fastback',3,2022]],
  Deepal: [['SL03','fastback',4,2022], ['S07','crossover',4,2023], ['G318','offroad',5,2024], ['L07','fastback',4,2024]],
  Avatr: [['11','suvCoupe',5,2022], ['12','fastback',5,2023], ['07','crossover',4,2024], ['06','sedan',4,2025]],
  Jetour: [['X70','crossover',4,2018], ['X90','largeSUV',4,2019], ['Dashing','crossover',4,2022], ['T2','offroad',4,2023], ['T1','crossover',4,2024]],
  Dongfeng: [['Shine Max','sedan',3,2021], ['Mage','crossover',3,2023], ['Huge','crossover',4,2022], ['DF6','pickup',4,2018]],
  Voyah: [['Free','crossover',5,2021], ['Dream','minivan',5,2022], ['Passion','sedan',5,2023], ['Courage','crossover',4,2024]],
  FAW: [['Oley','sedan',2,2012,2015], ['V5','sedan',2,2012,2015]],
  Bestune: [['B70','fastback',3,2020], ['T55','smallSUV',3,2021], ['T77','crossover',3,2018], ['T90','crossover',4,2023], ['T99','largeSUV',4,2019]],
  BAIC: [['U5 Plus','sedan',2,2021], ['X35','smallSUV',3,2016], ['X55','crossover',3,2022], ['BJ40','offroad',4,2013], ['BJ60','offroad',5,2022]],
  JAC: [['J7','fastback',3,2019], ['JS4','smallSUV',3,2020], ['JS6','crossover',4,2021], ['T8','pickup',4,2018], ['T9','pickup',5,2020]],
  MG: [['MG3','hatch',2,2011], ['MG4 EV','hatch',3,2022], ['MG5','sedan',3,2020], ['ZS','smallSUV',3,2017], ['HS','crossover',4,2018], ['Cyberster','convertible',5,2023]],
  Roewe: [['i5','sedan',2,2018], ['i6','sedan',3,2017], ['RX5','crossover',3,2016], ['RX8','offroad',5,2018,2023], ['D7','sedan',4,2023]],
  Leapmotor: [['T03','hatch',2,2020], ['C01','sedan',4,2022], ['C10','crossover',4,2024], ['C11','crossover',4,2021], ['C16','largeSUV',5,2024]],
  Xiaomi: [['SU7','sedan',4,2024], ['YU7','crossover',5,2025]],
  Aito: [['M5','crossover',4,2022], ['M7','largeSUV',5,2022], ['M8','largeSUV',5,2025], ['M9','largeSUV',5,2023]],
  Seres: [['3','smallSUV',3,2019], ['5','crossover',4,2022], ['7','largeSUV',5,2022]],
  Smart: [['Fortwo','hatch',1,1998,2024], ['Forfour','hatch',2,2014,2021], ['#1','smallSUV',3,2022], ['#3','suvCoupe',3,2023], ['#5','crossover',4,2024]],
  Lucid: [['Air','sedan',5,2021], ['Gravity','largeSUV',5,2024]],
  Rivian: [['R1T','pickup',5,2021], ['R1S','largeSUV',5,2022]],
  Chery: [['Tiggo 8 Pro Max','crossover',4,2022], ['Arrizo 8','sedan',3,2022]],
  Ford: [['Mustang','coupe',4,1964], ['Mustang Mach-E','suvCoupe',4,2020], ['Bronco','offroad',5,2021], ['F-150','pickup',5,1975]],
  'УАЗ': [['Патриот','offroad',4,2005], ['Хантер','offroad',3,2003]],
  Москвич: [['3','smallSUV',3,2022], ['6','fastback',3,2023], ['8','largeSUV',4,2024]]
};

const bodyTypes = {
  hatch:'hatchback', sedan:'sedan', fastback:'liftback', wagon:'wagon', coupe:'coupe',
  convertible:'convertible', crossover:'crossover', smallSUV:'crossover', suvCoupe:'coupe-crossover',
  offroad:'SUV', largeSUV:'large SUV', minivan:'MPV', pickup:'pickup', van:'van'
};

const classAssets = {
  crossover:{key:'bmw-x5-g05', label:'BMW X5 G05'},
  suvCoupe:{key:'bmw-x6-f96', label:'BMW X6 M F96'},
  coupe:{key:'bmw-m4', label:'BMW M4 G82'}
};

for (const [brand, rows] of Object.entries(catalogRows)) {
  vehicles[brand] ??= [];
  for (const [model, vehicleClass, priceGroup, yearFrom, yearTo, generation, visualId] of rows) {
    let entry = vehicles[brand].find(item => item.model === model);
    if (!entry) {
      entry = {brand, model, vehicleClass, priceGroup};
      vehicles[brand].push(entry);
    }
    entry.vehicleClass = vehicleClass;
    entry.priceGroup = priceGroup;
    (entry.generations ??= []).push({generation: generation ?? null, yearFrom, yearTo: yearTo ?? catalogCoverageYear, visualId});
  }
}

for (const entries of Object.values(vehicles)) {
  entries.sort((a, b) => a.model.localeCompare(b.model, 'ru', {numeric:true}));
  for (const entry of entries) {
    const visuals = visualModels.filter(item => item.brand === entry.brand && item.model === entry.model);
    const covered = entry.generations?.flatMap(row => visuals.filter(visual => visual.visualModel === row.visualId)) ?? [];
    entry.generations ??= [];
    for (const visual of visuals) {
      if (covered.includes(visual)) continue;
      entry.generations.push({generation:visual.generation, yearFrom:visual.from, yearTo:visual.to, visualId:visual.visualModel, visualOnly:true});
    }
    const vehicleClass = entry.vehicleClass;
    entry.bodyType = bodyTypes[vehicleClass];
    entry.hatch = ['hatch','wagon','fastback','crossover','smallSUV','suvCoupe','offroad','largeSUV','minivan','van'].includes(vehicleClass);
    for (const row of entry.generations) {
      const visual = visuals.find(item => item.visualModel === row.visualId);
      row.visual = visual;
      row.bodyType = entry.bodyType;
      row.vehicleClass = vehicleClass;
      row.priceGroup = visual?.priceGroup ?? entry.priceGroup;
      row.exact3DAsset = visual?.showroom ? visual.modelKey : null;
      row.fallback3DAsset = classAssets[vehicleClass]?.key ?? null;
      row.interactiveZones = row.exact3DAsset || row.fallback3DAsset ? 'showroom' : visual ? 'photo' : 'list';
    }
  }
}
