// Vandi — extra data: 200 generated vehicles, road names, radio, reviews, documents, more reactions
'use strict';

// ---------- Native names for districts whose HQ name differs ----------
const DIST_NT = { idk:'ഇടുക്കി', ekm:'എറണാകുളം', wyd:'വയനാട്', ngl:'கன்னியாகுமரி', ooty:'நீலகிரி' };
const STATE_NAME = { KL:{en:'Kerala', nt:'കേരളം'}, TN:{en:'Tamil Nadu', nt:'தமிழ்நாடு'} };
const KL_RTO = { tvm:'01', klm:'02', pta:'03', alp:'04', ktm:'05', idk:'06', ekm:'07', tsr:'08', pkd:'09', mlp:'10', kkd:'11', wyd:'12', knr:'13', ksd:'14' };
function rearText(city){
  const st = STATE_NAME[city.st];
  const dn = DIST_NT[city.id] || city.nt;
  const native = city.st === 'KL' ? city.nt + ' നഗരം · ' + dn + ' ജില്ല · ' + st.nt : city.nt + ' நகரம் · ' + dn + ' மாவட்டம் · ' + st.nt;
  return {en: city.en + ' City · ' + city.dist + ' · ' + st.en, nt: native};
}

// ---------- 50 more vehicles per category (made-up brands) ----------
(function genVehicles(){
  let seed = 9173;
  const R = () => { seed = (seed * 16807) % 2147483647; return (seed-1)/2147483646; };
  const pickR = a => a[Math.floor(R()*a.length)];
  const COL = [0xf2c21b,0x1d1d1d,0x2f8f3a,0x1f7fb8,0xc0392b,0xf4f4f0,0x7b241c,0x1a5276,0x6c3483,0xe67e22,0x16a085,0x34495e,0xd4a017,0x5b2c6f,0x27ae60,0x95a5a6,0xff6f61,0x0b5345,0x784212,0x2e4053];
  const ROMAN = ['','II','III','IV','V'];
  const mk = (cat, i, o) => Object.assign({id: cat[0] + 'g' + i, cat, gen:1}, o);
  // Autos
  const aBr = ['Kuttan','Chakra','Vayu','Nila','Mayil','Thamira','Kayal','Kongu','Malabar','Vaigai'];
  const aMd = ['Classic','Plus','Max','Smart','CNG','E-Volt','Turbo','Royal','Neo','Pro'];
  for (let i = 0; i < 50; i++) {
    const t = i/49;
    const style = pickR(['classic','classic','modern','electric']);
    VEHICLES.push(mk('auto', i, {name: aBr[i%10] + ' ' + aMd[Math.floor(i/5)%10] + (i%3 ? ' ' + ROMAN[i%5] : ''), style,
      price: Math.round((4000 + t*t*90000)/100)*100, speed: Math.round(55 + t*30), accel: +(3.2 + t*3).toFixed(1), turn: 2.0 + t*0.3, grip: 7 + t*2.5,
      len: 2.7 + R()*0.3, wid: 1.45 + R()*0.1, base: 30 + Math.round(t*15), perKm: 15 + Math.round(t*8), colors:[pickR(COL), pickR([0x1d1d1d,0xf2c21b,0xf4f1e6,0x2f8f3a])]}));
  }
  // Taxis
  const tBr = ['Kaveri','Periyar','Ponni','Bharani','Sahya','Thenmala','Vembu','Pambai','Nelli','Kumari'];
  const tSt = ['hatch','sedan','sedan','suv','mpv','retro'];
  for (let i = 0; i < 50; i++) {
    const t = i/49, style = tSt[i%6];
    VEHICLES.push(mk('taxi', i, {name: tBr[i%10] + ' ' + {hatch:'Hatch',sedan:'Sedan',suv:'SUV',mpv:'MPV',retro:'Heritage'}[style] + ' Taxi ' + (1 + Math.floor(i/6)), style,
      price: Math.round((10000 + t*t*400000)/500)*500, speed: Math.round(85 + t*70), accel: +(4 + t*4).toFixed(1), turn: 1.85 - (style==='mpv'?0.15:0) , grip: 8 + t*4,
      len: {hatch:3.9,sedan:4.4,suv:4.6,mpv:4.8,retro:4.3}[style], wid: style==='suv'||style==='mpv' ? 1.9 : 1.75, base: 100 + Math.round(t*100), perKm: 20 + Math.round(t*20),
      colors:[pickR([0xf2d21b,0xf4f4f0,0x1d1d1d,0x2e4053,0xf2c21b]), pickR([0x222222,0xf2d21b,0x1f3a5f])]}));
  }
  // Buses
  const bBr = ['Sahyadri','Malanadu','Kongu','Cheran','Pandyan','Chola','Kaveri','Western Ghats','Coastal','Deccan'];
  const bSt = ['mini','city','express','sleeper','dd','electric'];
  const bNm = {mini:'Mini Bus', city:'City Bus', express:'Express', sleeper:'Sleeper Coach', dd:'Double Decker', electric:'E-Bus'};
  for (let i = 0; i < 50; i++) {
    const t = i/49, style = bSt[i%6];
    VEHICLES.push(mk('bus', i, {name: bBr[i%10] + ' ' + bNm[style] + ' ' + (1 + Math.floor(i/6)), style,
      price: Math.round((30000 + t*t*900000)/1000)*1000, speed: Math.round(65 + t*45), accel: +(2.4 + t*1.4).toFixed(1), turn: 1.35 - t*0.2, grip: 7 + t*2,
      len: {mini:7.5,city:10.5,express:11.5,sleeper:12,dd:10.5,electric:10.5}[style], wid: style==='mini' ? 2.3 : 2.55,
      seats: {mini:20,city:40,express:48,sleeper:30,dd:70,electric:42}[style], ticket: Math.round(10 + t*25 + (style==='sleeper'?20:0)),
      colors:[pickR(COL), pickR([0xf4efe0,0xf2c21b,0x1d1d1d,0xffffff])]}));
  }
  // Cars
  const cBr = ['Nilgiri','Monsoon','Kodai','Vembanad','Munnar','Marina','Ghat','Thekkady','Agasthya','Rameshwar'];
  const cSt = ['hatch','sedan','suv','coupe','super','hyper','limo','pickup'];
  const cNm = {hatch:'Hatch',sedan:'Sedan',suv:'SUV',coupe:'Coupe',super:'Supercar',hyper:'Hypercar',limo:'Limousine',pickup:'Pickup'};
  for (let i = 0; i < 50; i++) {
    const t = i/49, style = cSt[i%8];
    const tier = style === 'hyper' ? 1.6 : style === 'super' ? 1.3 : style === 'coupe' ? 1.1 : 1;
    VEHICLES.push(mk('car', i, {name: cBr[i%10] + ' ' + cNm[style] + ' ' + ['S','GT','RS','X','Z'][Math.floor(i/10)%5], style, lux: ['super','hyper','limo'].includes(style) || t > 0.6 ? (style==='suv'?'suv':style==='hyper'?'hyper':style==='limo'?'limo':'super') : undefined,
      price: Math.round((15000 + t*t*t*9800000*tier)/1000)*1000, speed: Math.round(110 + t*230*tier*0.8), accel: +(5 + t*14*tier*0.8).toFixed(1), turn: 1.85 + t*0.4, grip: 9 + t*7,
      len: {hatch:3.8,sedan:4.4,suv:4.8,coupe:4.4,super:4.5,hyper:4.7,limo:5.8,pickup:5.0}[style], wid: style==='hatch' ? 1.7 : 1.95,
      colors:[pickR(COL), pickR([0x111111,0xd4a017,0x222222,0xc0c0c0])]}));
  }
})();

// ---------- Road names ----------
const ROADS_GENERIC = {
  KL: [['MG Road','എം.ജി. റോഡ്'],['Station Road','സ്റ്റേഷൻ റോഡ്'],['Market Road','മാർക്കറ്റ് റോഡ്'],['Temple Road','ടെമ്പിൾ റോഡ്'],['Church Road','ചർച്ച് റോഡ്'],['Mosque Road','മോസ്ക് റോഡ്'],['Hospital Road','ഹോസ്പിറ്റൽ റോഡ്'],['College Road','കോളേജ് റോഡ്'],['Bypass Road','ബൈപാസ് റോഡ്'],['MC Road','എം.സി. റോഡ്'],['Court Road','കോർട്ട് റോഡ്'],['Bank Road','ബാങ്ക് റോഡ്'],['Collectorate Road','കളക്ടറേറ്റ് റോഡ്'],['Gandhi Road','ഗാന്ധി റോഡ്'],['Nehru Road','നെഹ്റു റോഡ്'],['Civil Station Road','സിവിൽ സ്റ്റേഷൻ റോഡ്'],['Panchayat Road','പഞ്ചായത്ത് റോഡ്'],['School Road','സ്കൂൾ റോഡ്']],
  TN: [['Gandhi Road','காந்தி சாலை'],['Nehru Street','நேரு தெரு'],['Station Road','ஸ்டேஷன் சாலை'],['Kovil Street','கோவில் தெரு'],['Bazaar Street','பஜார் தெரு'],['Hospital Road','மருத்துவமனை சாலை'],['Church Street','சர்ச் தெரு'],['Mosque Street','மசூதி தெரு'],['Kamarajar Salai','காமராஜர் சாலை'],['Periyar Street','பெரியார் தெரு'],['Bus Stand Road','பேருந்து நிலைய சாலை'],['Collector Office Road','கலெக்டர் அலுவலக சாலை'],['Bypass Road','பைபாஸ் சாலை'],['Big Bazaar Street','பெரிய கடை வீதி'],['Car Street','தேர் வீதி'],['North Street','வடக்கு தெரு'],['South Street','தெற்கு தெரு'],['Anna Salai','அண்ணா சாலை']],
};
const ROADS_CITY = {
  che: [['Anna Salai','அண்ணா சாலை'],['Poonamallee High Road','பூந்தமல்லி நெடுஞ்சாலை'],['Cathedral Road','கதீட்ரல் சாலை'],['Rajaji Salai','ராஜாஜி சாலை'],['Kamarajar Salai','காமராஜர் சாலை'],['TTK Road','டி.டி.கே. சாலை']],
  cbe: [['Avinashi Road','அவிநாசி சாலை'],['Trichy Road','திருச்சி சாலை'],['DB Road','டி.பி. சாலை'],['Mettupalayam Road','மேட்டுப்பாளையம் சாலை']],
  mdu: [['Town Hall Road','டவுன் ஹால் சாலை'],['West Masi Street','மேல மாசி வீதி'],['North Veli Street','வடக்கு வெளி வீதி'],['Alagar Kovil Road','அழகர் கோவில் சாலை']],
  try: [['Williams Road','வில்லியம்ஸ் சாலை'],['Bharathidasan Salai','பாரதிதாசன் சாலை'],['Salai Road','சாலை ரோடு']],
  slm: [['Omalur Main Road','ஓமலூர் மெயின் ரோடு'],['Cherry Road','செர்ரி ரோடு']],
  tvm: [['MG Road','എം.ജി. റോഡ്'],['Kowdiar Road','കവടിയാർ റോഡ്']],
  ekm: [['Seaport–Airport Road','സീപോർട്ട്–എയർപോർട്ട് റോഡ്'],['Infopark Expressway','ഇൻഫോപാർക്ക് എക്സ്പ്രസ്‌വേ'],['Civil Line Road','സിവിൽ ലൈൻ റോഡ്']],
  kkd: [['Mavoor Road','മാവൂർ റോഡ്'],['SM Street','എസ്.എം. സ്ട്രീറ്റ്'],['Beach Road','ബീച്ച് റോഡ്'],['Kannur Road','കണ്ണൂർ റോഡ്']],
  tsr: [['Swaraj Round','സ്വരാജ് റൗണ്ട്'],['Shornur Road','ഷൊർണൂർ റോഡ്'],['MG Road','എം.ജി. റോഡ്']],
};

// ---------- Radio (made-up stations, generated music) ----------
const RADIO = {
  KL: [
    {name:'Kayal FM', nt:'കായൽ എഫ്.എം.', freq:'91.4', scale:[0,2,4,7,9], root:220, bpm:96, feel:'backwater'},
    {name:'Monsoon Radio', nt:'മൺസൂൺ റേഡിയോ', freq:'94.2', scale:[0,1,4,5,7,8,11], root:196, bpm:118, feel:'dance'},
    {name:'Thira FM', nt:'തിര എഫ്.എം.', freq:'98.6', scale:[0,3,5,8,10], root:247, bpm:76, feel:'melody'},
  ],
  TN: [
    {name:'Kaveri FM', nt:'காவேரி எஃப்.எம்.', freq:'92.7', scale:[0,2,4,7,9], root:233, bpm:104, feel:'melody'},
    {name:'Marina Beats', nt:'மெரினா பீட்ஸ்', freq:'95.1', scale:[0,1,4,5,7,8,11], root:208, bpm:126, feel:'dance'},
    {name:'Thendral FM', nt:'தென்றல் எஃப்.எம்.', freq:'101.3', scale:[0,3,5,8,10], root:262, bpm:84, feel:'backwater'},
  ],
};
const SONG_WORDS = {
  KL: [['Kaattu','കാറ്റ്'],['Mazha','മഴ'],['Kayal','കായൽ'],['Nila','നിലാ'],['Thira','തിര'],['Poove','പൂവേ'],['Sandhya','സന്ധ്യ'],['Thoni','തോണി'],['Megham','മേഘം'],['Vazhi','വഴി']],
  TN: [['Kaatru','காற்று'],['Mazhai','மழை'],['Nilavu','நிலவு'],['Kadal','கடல்'],['Thendral','தென்றல்'],['Poovae','பூவே'],['Maalai','மாலை'],['Megam','மேகம்'],['Payanam','பயணம்'],['Vaanam','வானம்']],
};
const DJ = {
  KL: { lang:'ml', roman:'mg', lines:[
    ['നമസ്കാരം {city}! ഇത് {station}, നിങ്ങളുടെ സ്വന്തം റേഡിയോ.','Namaskaram {city}! Ithu {station}, ningalude swantham radio.'],
    ['സമയം {time}. റോഡിൽ സൂക്ഷിച്ച് ഓടിക്കണേ.','Samayam {time}. Roadil sookshichu odikkane.'],
    ['അടുത്ത പാട്ട് ഇതാ: {song}.','Aduttha paattu ithaa: {song}.'],
    ['ഡ്രൈവർമാർക്ക് ഒരു നല്ല ദിവസം ആശംസിക്കുന്നു!','Drivermaarkku oru nalla divasam aashamsikkunnu!'],
  ], rain:['മഴ പെയ്യുന്നു, പതുക്കെ ഓടിക്കൂ.','Mazha peyyunnu, pathukke odikku.'], fest:['ഇന്ന് {fest}, ആ വഴി തിരക്കായിരിക്കും.','Innu {fest}, aa vazhi thirakkaayirikkum.'] },
  TN: { lang:'ta', roman:'tg', lines:[
    ['வணக்கம் {city}! இது {station}, உங்கள் சொந்த வானொலி.','Vanakkam {city}! Idhu {station}, ungal sondha vaanoli.'],
    ['நேரம் {time}. சாலையில் பார்த்து ஓட்டுங்க.','Neram {time}. Saalaiyil paarthu ottunga.'],
    ['அடுத்த பாடல் இதோ: {song}.','Adutha paadal idho: {song}.'],
    ['எல்லா டிரைவர்களுக்கும் இனிய நாள் வாழ்த்துகள்!','Ella drivergalukkum iniya naal vaazhthugal!'],
  ], rain:['மழை பெய்யுது, மெதுவா ஓட்டுங்க.','Mazhai peyyudhu, medhuvaa ottunga.'], fest:['இன்று {fest}, அந்த பக்கம் கூட்டமா இருக்கும்.','Indru {fest}, andha pakkam koottamaa irukkum.'] },
};

// ---------- More reactions ----------
Object.assign(REACT, {
  cow: {
    en:['My cow!','Hey! That\'s my cow!'], mg:['Ente pashu!','Ayyo, ente pashuvine idichu!'], ml:['എന്റെ പശു!','അയ്യോ, എന്റെ പശുവിനെ ഇടിച്ചു!'],
    tg:['En maadu!','Dei, en maadu mela idichitta!'], ta:['என் மாடு!','டேய், என் மாடு மேல இடிச்சிட்ட!'] },
  dog: {
    en:['My dog!','Leave my dog alone!'], mg:['Ente patti!','Ente pattiye vittere!'], ml:['എന്റെ പട്ടി!','എന്റെ പട്ടിയെ വിട്ടേരെ!'],
    tg:['En naai!','En naaya vittudu!'], ta:['என் நாய்!','என் நாயை விட்டுடு!'] },
  chase: {
    en:['Police are after him!','Run, run!','Catch him!'], mg:['Police pinnale undu!','Odikko!','Avane pidikku!'], ml:['പോലീസ് പിന്നാലെ ഉണ്ട്!','ഓടിക്കോ!','അവനെ പിടിക്ക്!'],
    tg:['Police pinnadi varaanga!','Odu, odu!','Avana pudi!'], ta:['போலீஸ் பின்னாடி வராங்க!','ஓடு, ஓடு!','அவனை பிடி!'] },
  check: {
    en:['Stop! Vehicle check.','Licence and papers, please.'], mg:['Nirthu! Vandi check.','Licence-um papers-um kaanikku.'], ml:['നിർത്ത്! വാഹന പരിശോധന.','ലൈസൻസും പേപ്പറുകളും കാണിക്ക്.'],
    tg:['Nirutthu! Vandi check.','License-um papers-um kaattunga.'], ta:['நிறுத்து! வாகன சோதனை.','லைசென்ஸும் பேப்பர்களும் காட்டுங்க.'] },
});
REACT.police.en.push('Don\'t run!','You can\'t escape!'); REACT.police.mg.push('Odaruthu!','Rakshapedan pattilla!'); REACT.police.ml.push('ഓടരുത്!','രക്ഷപ്പെടാൻ പറ്റില്ല!');
REACT.police.tg.push('Odaadhe!','Thappikka mudiyaadhu!'); REACT.police.ta.push('ஓடாதே!','தப்பிக்க முடியாது!');

// ---------- Reviews ----------
const REVIEWS = {
  good: {en:['Smooth ride, very polite driver.','Reached on time, thank you!','Clean vehicle and safe driving.'],
         KL:['നല്ല യാത്ര, മര്യാദയുള്ള ഡ്രൈവർ.','സമയത്ത് എത്തി, നന്ദി!','വൃത്തിയുള്ള വണ്ടി, സുരക്ഷിതമായ ഡ്രൈവിംഗ്.'],
         TN:['நல்ல பயணம், மரியாதையான டிரைவர்.','நேரத்துக்கு வந்தோம், நன்றி!','சுத்தமான வண்டி, பாதுகாப்பான ஓட்டம்.']},
  ok:   {en:['Okay ride, a bit slow.','Fine, but took a longer route.'],
         KL:['കുഴപ്പമില്ല, കുറച്ച് പതുക്കെ ആയിരുന്നു.','ശരി, പക്ഷേ വഴി കുറച്ച് നീണ്ടു.'],
         TN:['பரவாயில்லை, கொஞ்சம் மெதுவா இருந்தது.','சரி, ஆனா கொஞ்சம் சுத்தி போனோம்.']},
  bad:  {en:['Rash driving, I was scared.','Too many bumps and crashes!'],
         KL:['അമിത വേഗം, പേടിച്ചു പോയി.','ഒരുപാട് ഇടിയും കുലുക്കവും!'],
         TN:['வேகமா ஓட்டினார், பயமா இருந்தது.','நிறைய இடி, குலுக்கல்!']},
};

// ---------- Documents & RTO ----------
PLACE_TYPES.rto = {en:'RTO Office', KL:'ആർ.ടി.ഒ. ഓഫീസ്', TN:'வட்டார போக்குவரத்து அலுவலகம்', col:'#1a5276'};
const LICENCE_NEEDS = { auto:['transport'], taxi:['lmv','transport'], car:['lmv'], bus:['heavy','transport'] };
const LICENCE_NAMES = { lmv:'Car licence (LMV)', transport:'Transport badge', heavy:'Heavy vehicle licence' };
const LICENCE_PRICE = { lmv:1500, transport:1000, heavy:4000 };
const FINES = { licence:1000, insurance:500, permit:300, puc:200, unfit:500 };

// ---------- More radio: extra statewide stations, regional stations, and one local station per city ----------
RADIO.KL.push(
  {name:'Ormma Radio', nt:'ഓർമ്മ റേഡിയോ', freq:'102.8', scale:[0,2,4,5,7,9,11], root:196, bpm:70, feel:'oldies', scope:'Statewide'},
  {name:'Chenda Beats', nt:'ചെണ്ട ബീറ്റ്സ്', freq:'104.1', scale:[0,2,3,5,7,8,10], root:220, bpm:138, feel:'beats', scope:'Statewide'});
RADIO.TN.push(
  {name:'Isai Radio', nt:'இசை ரேடியோ', freq:'103.6', scale:[0,2,4,5,7,9,11], root:208, bpm:72, feel:'oldies', scope:'Statewide'},
  {name:'Kuthu Beats', nt:'குத்து பீட்ஸ்', freq:'106.4', scale:[0,1,4,5,7,8,10], root:233, bpm:142, feel:'beats', scope:'Statewide'});
RADIO.KL.forEach(s => s.scope = s.scope || 'Statewide'); RADIO.TN.forEach(s => s.scope = s.scope || 'Statewide');
const RADIO_REGIONAL = [
  {st:'KL', cities:['tvm','klm','pta'], name:'Venad FM', nt:'വേണാട് എഫ്.എം.', freq:'89.6', scale:[0,2,4,7,9], root:247, bpm:92, feel:'melody'},
  {st:'KL', cities:['alp','ktm','idk'], name:'Kuttanad Radio', nt:'കുട്ടനാട് റേഡിയോ', freq:'90.8', scale:[0,3,5,7,10], root:220, bpm:84, feel:'backwater'},
  {st:'KL', cities:['ekm','tsr','pkd'], name:'Kochi Metro FM', nt:'കൊച്ചി മെട്രോ എഫ്.എം.', freq:'93.5', scale:[0,1,4,5,7,8,11], root:208, bpm:124, feel:'dance'},
  {st:'KL', cities:['mlp','kkd','wyd','knr','ksd'], name:'Malabar FM', nt:'മലബാർ എഫ്.എം.', freq:'96.2', scale:[0,1,4,5,7,8,10], root:196, bpm:110, feel:'beats'},
  {st:'TN', cities:['che','cgl','tlr','kpm','rpt','vlr'], name:'Chennai Metro FM', nt:'சென்னை மெட்ரோ எஃப்.எம்.', freq:'91.9', scale:[0,1,4,5,7,8,11], root:220, bpm:128, feel:'dance'},
  {st:'TN', cities:['cbe','erd','tup','slm','nmk','ooty','krr','dpi','kgi','tpt'], name:'Kongu FM', nt:'கொங்கு எஃப்.எம்.', freq:'94.6', scale:[0,2,4,7,9], root:233, bpm:98, feel:'melody'},
  {st:'TN', cities:['tnj','tvr','ngp','myl','ari','pmb','try','pdk','cud','vpm','kkr','tvm2'], name:'Chola FM', nt:'சோழா எஃப்.எம்.', freq:'97.3', scale:[0,2,3,5,7,9,10], root:208, bpm:88, feel:'oldies'},
  {st:'TN', cities:['mdu','dgl','thn','svg','vnr','rmd','tvl','tks','tut','ngl'], name:'Pandiya Nadu FM', nt:'பாண்டிய நாடு எஃப்.எம்.', freq:'99.1', scale:[0,1,4,5,7,8,10], root:247, bpm:132, feel:'beats'},
];
RADIO_REGIONAL.forEach(s => s.scope = 'Regional');
const LOCAL_FEELS = ['melody','backwater','dance','oldies','beats'];
const LOCAL_SCALES = [[0,2,4,7,9],[0,3,5,7,10],[0,1,4,5,7,8,11],[0,2,4,5,7,9,11],[0,2,3,5,7,8,10]];
function localStation(city){
  const h = hashStr('fm:' + city.id);
  const KLs = city.st === 'KL';
  return {name: city.en + ' Local FM', nt: city.nt + (KLs ? ' ലോക്കൽ എഫ്.എം.' : ' உள்ளூர் எஃப்.எம்.'),
    freq: (88 + (h % 200)/10).toFixed(1), scale: LOCAL_SCALES[h % LOCAL_SCALES.length], root: [196,208,220,233,247][(h>>>4) % 5],
    bpm: 76 + ((h>>>8) % 60), feel: LOCAL_FEELS[(h>>>12) % LOCAL_FEELS.length], scope: 'Local', local: true};
}
function stationsFor(city){
  const list = RADIO[city.st].slice();
  RADIO_REGIONAL.forEach(s => { if (s.cities.includes(city.id)) list.push(s); });
  const loc = localStation(city);
  while (list.some(s => s.freq === loc.freq)) loc.freq = (parseFloat(loc.freq) + 0.4).toFixed(1);
  list.push(loc);
  return list;
}

// ---------- Even more reactions (index-aligned across languages) ----------
REACT.angry.en.push('Watch the road, not your phone!','This isn\'t a race track!','Who gave you a licence?','Use your brakes!','You almost hit me!','Have some sense!','Go slow, there are kids here!');
REACT.angry.mg.push('Road-il nokki odikkada!','Ithu race track alla!','Ninakku aaraada licence thannathu?','Brake chavittu!','Ippo enne idichene!','Kurachu bodham venam!','Pathukke po, ivide pillerundu!');
REACT.angry.ml.push('റോഡിൽ നോക്കി ഓടിക്കെടാ!','ഇത് റേസ് ട്രാക്ക് അല്ല!','നിനക്ക് ആരാടാ ലൈസൻസ് തന്നത്?','ബ്രേക്ക് ചവിട്ട്!','ഇപ്പോ എന്നെ ഇടിച്ചേനെ!','കുറച്ച് ബോധം വേണം!','പതുക്കെ പോ, ഇവിടെ പിള്ളേരുണ്ട്!');
REACT.angry.tg.push('Road-a paathu ottu!','Idhu race track illa!','Unakku yaaru license kuduthaa?','Brake podu!','Ippo enna idichiruppa!','Konjam arivu venum!','Medhuva po, inga pasanga irukaanga!');
REACT.angry.ta.push('ரோட்டை பார்த்து ஓட்டு!','இது ரேஸ் ட்ராக் இல்ல!','உனக்கு யாரு லைசென்ஸ் குடுத்தா?','பிரேக் போடு!','இப்போ என்னை இடிச்சிருப்ப!','கொஞ்சம் அறிவு வேணும்!','மெதுவா போ, இங்க பசங்க இருக்காங்க!');
REACT.crash.en.push('Look what you did to my car!','Pay for the damage!','Are you mad?!','My headlight is gone!');
REACT.crash.mg.push('Ente vandi nokku, enthaa cheythathu!','Damage-inu kaashu tharanam!','Ninakku vattaano?!','Ente headlight poyi!');
REACT.crash.ml.push('എന്റെ വണ്ടി നോക്ക്, എന്താ ചെയ്തത്!','ഡാമേജിന് കാശ് തരണം!','നിനക്ക് വട്ടാണോ?!','എന്റെ ഹെഡ്‌ലൈറ്റ് പോയി!');
REACT.crash.tg.push('En vandiya paaru, enna pannitta!','Damage-ku kaasu kudu!','Unakku paithiyamaa?!','En headlight poyiduchu!');
REACT.crash.ta.push('என் வண்டியை பாரு, என்ன பண்ணிட்ட!','டேமேஜுக்கு காசு குடு!','உனக்கு பைத்தியமா?!','என் ஹெட்லைட் போயிடுச்சு!');
REACT.horn.en.push('Okay okay, I\'m moving!','Why such a hurry?','Patience, patience!');
REACT.horn.mg.push('Shari shari, maarunnu!','Enthinaa ithra thidukkam?','Kshama venam!');
REACT.horn.ml.push('ശരി ശരി, മാറുന്നു!','എന്തിനാ ഇത്ര തിടുക്കം?','ക്ഷമ വേണം!');
REACT.horn.tg.push('Seri seri, nagarren!','Enna avasaram?','Porumai, porumai!');
REACT.horn.ta.push('சரி சரி, நகர்றேன்!','என்ன அவசரம்?','பொறுமை, பொறுமை!');
REACT.hurt = {
  en:['Aaah, my leg!','Ouch! That hurt!','Somebody call an ambulance!','You hit me!','Stop! You hit me!'],
  mg:['Ayyo ente kaalu!','Ammo, vedanikkunnu!','Aarenkilum ambulance vilikku!','Nee enne idichu!','Nirthada! Nee enne idichu!'],
  ml:['അയ്യോ എന്റെ കാല്!','അമ്മോ, വേദനിക്കുന്നു!','ആരെങ്കിലും ആംബുലൻസ് വിളിക്ക്!','നീ എന്നെ ഇടിച്ചു!','നിർത്തെടാ! നീ എന്നെ ഇടിച്ചു!'],
  tg:['Aiyo en kaalu!','Amma, valikkudhu!','Yaaraavadhu ambulance koopdunga!','Nee enna idichitta!','Niruthu! Nee enna idichitta!'],
  ta:['ஐயோ என் காலு!','அம்மா, வலிக்குது!','யாராவது ஆம்புலன்ஸ் கூப்பிடுங்க!','நீ என்னை இடிச்சிட்ட!','நிறுத்து! நீ என்னை இடிச்சிட்ட!'],
};

// Your own passenger shouting at you
REACT.rider = {
  en:['Why did you jump the signal?!','That was a red light! Are you mad?','Hey! The light was red!','Do you want us both arrested?','Stop jumping signals, I am not in that big a hurry!'],
  mg:['Enthinaa signal chaadiyathu?!','Athu red aayirunnu! Ninakku vattaano?','Hey! Red light aayirunnu!','Nammal randum police-il aakano?','Signal chaadalle, enikku athra dhruthi illa!'],
  ml:['എന്തിനാ സിഗ്നൽ ചാടിയത്?!','അത് റെഡ് ആയിരുന്നു! നിനക്ക് വട്ടാണോ?','ഹേയ്! റെഡ് ലൈറ്റ് ആയിരുന്നു!','നമ്മൾ രണ്ടും പോലീസിൽ ആകണോ?','സിഗ്നൽ ചാടല്ലേ, എനിക്ക് അത്ര ധൃതി ഇല്ല!'],
  tg:['Yen signal-a jump panneenga?!','Adhu red light! Ungalukku paithiyama?','Hey! Red light-nga!','Rendu perum police kitta maatanuma?','Signal jump pannaadheenga, enakku avlo avasaram illa!'],
  ta:['ஏன் சிக்னலை ஜம்ப் பண்ணீங்க?!','அது ரெட் லைட்! உங்களுக்கு பைத்தியமா?','ஹே! ரெட் லைட்ங்க!','ரெண்டு பேரும் போலீஸ் கிட்ட மாட்டணுமா?','சிக்னல் ஜம்ப் பண்ணாதீங்க, எனக்கு அவ்வளவு அவசரம் இல்ல!'],
};
REACT.riderCrash = {
  en:['Watch where you are going!','Are you trying to kill me?!','Ayyo! Drive carefully!','I am not paying for this ride!','My head hit the roof!'],
  mg:['Nokki odikkada!','Enne konnu kalayaano?!','Ayyo! Sookshichu odikku!','Ee ride-inu njan kaasu tharilla!','Ente thala mukalil idichu!'],
  ml:['നോക്കി ഓടിക്കെടാ!','എന്നെ കൊന്നു കളയാനോ?!','അയ്യോ! സൂക്ഷിച്ച് ഓടിക്ക്!','ഈ റൈഡിന് ഞാൻ കാശ് തരില്ല!','എന്റെ തല മുകളിൽ ഇടിച്ചു!'],
  tg:['Paathu ottunga!','Enna kolla paakreengala?!','Aiyo! Kavanama ottunga!','Indha ride-ku naan kaasu tharamaatten!','En thala mela idichiduchu!'],
  ta:['பாத்து ஓட்டுங்க!','என்னைக் கொல்லப் பாக்குறீங்களா?!','ஐயோ! கவனமா ஓட்டுங்க!','இந்த ரைடுக்கு நான் காசு தரமாட்டேன்!','என் தலை மேல இடிச்சிடுச்சு!'],
};
REACT.riderSpeed = {
  en:['Slow down! That camera just flashed!','You got us a speeding fine!','Too fast! Slow down please!'],
  mg:['Speed kurakku! Camera flash aayi!','Overspeed fine kitti!','Bhayankara speed! Onnu kurakku!'],
  ml:['സ്പീഡ് കുറയ്ക്ക്! ക്യാമറ ഫ്ലാഷ് ആയി!','ഓവർസ്പീഡ് ഫൈൻ കിട്ടി!','ഭയങ്കര സ്പീഡ്! ഒന്ന് കുറയ്ക്ക്!'],
  tg:['Speed korainga! Camera flash aachu!','Overspeed fine vandhuduchu!','Romba speed! Konjam korainga!'],
  ta:['ஸ்பீடு குறைங்க! கேமரா ஃபிளாஷ் ஆச்சு!','ஓவர்ஸ்பீடு ஃபைன் வந்துடுச்சு!','ரொம்ப ஸ்பீடு! கொஞ்சம் குறைங்க!'],
};
REACT.riderGun = {
  en:['They are SHOOTING at us!','Get down! Get down!','Just stop the vehicle!'],
  mg:['Avar nammale vedi vekkunnu!','Kuniyu! Kuniyu!','Vandi nirthu!'],
  ml:['അവർ നമ്മളെ വെടി വെക്കുന്നു!','കുനിയ്! കുനിയ്!','വണ്ടി നിർത്ത്!'],
  tg:['Avanga namma mela sudraanga!','Kuninjukonga!','Vandiya niruthunga!'],
  ta:['அவங்க நம்ம மேல சுடுறாங்க!','குனிஞ்சுக்கோங்க!','வண்டியை நிறுத்துங்க!'],
};

// ---------- Radio: made-up artists & genres, news ----------
const ARTISTS = {
  KL: ['Arjun Ravi','Meera Nair','Kayal Collective','Nikhil Thomas','Anjali Menon','The Monsoon Band','Rahul Krishnan','Sneha Joseph','Malabar Rhythm Co.','Vishnu Prasad','Fathima Beevi','Thira Project','Aswin & the Backwaters','Diya Mariam','Kochi Night Shift'],
  TN: ['Arun Selvan','Kaviya Murugan','Madras Beat Crew','Senthil Prabhu','Divya Lakshmi','Kongu Folk Collective','Nila Ganesan','Thendral Trio','Iniyan Raj','Marina Sound System','Yazhini K','Vaigai Brothers','Pandiya Drums','Mullai Sisters','Night Bus Chennai'],
};
const GENRES = {
  KL: [{g:'Melody', feel:'melody', bpm:[72,92]},{g:'Folk', feel:'folk', bpm:[100,124]},{g:'Chenda fusion', feel:'chenda', bpm:[118,140]},{g:'Indie', feel:'indie', bpm:[88,110]},{g:'Retro', feel:'oldies', bpm:[66,84]},{g:'Rap', feel:'rap', bpm:[84,96]},{g:'Dance', feel:'dance', bpm:[120,132]}],
  TN: [{g:'Kuthu', feel:'kuthu', bpm:[128,150]},{g:'Gaana', feel:'gaana', bpm:[108,126]},{g:'Melody', feel:'melody', bpm:[72,92]},{g:'Folk', feel:'folk', bpm:[100,124]},{g:'Retro', feel:'oldies', bpm:[66,84]},{g:'EDM fusion', feel:'dance', bpm:[122,134]},{g:'Rap', feel:'rap', bpm:[84,96]}],
};
// station feel -> preferred genres
const FEEL_GENRES = { melody:['Melody','Retro','Indie'], backwater:['Melody','Indie','Folk'], dance:['Dance','EDM fusion','Kuthu','Rap'], oldies:['Retro','Melody'], beats:['Kuthu','Folk','Chenda fusion','Gaana','Rap'] };
const DJ_BACK = {
  KL: ['{artist} പാടിയ {song} ആയിരുന്നു അത്.','That was {song} by {artist}.','{artist} paadiya {song} aayirunnu athu.'],
  TN: ['{artist} பாடிய {song} பாடல் இது.','That was {song} by {artist}.','{artist} paadiya {song} paadal idhu.'],
};
// News: [native, english, romanised]
const NEWS = {
  KL: { intro:['വാർത്തകൾ. സമയം {time}.','The news at {time}.','Vaarthakal. Samayam {time}.'],
    items:[
      ['{road} റോഡിൽ ഇന്ന് അറ്റകുറ്റപ്പണി നടക്കുന്നു.','Road repair work on {roadEn} today.','{roadEn} roadil innu attakuttappani nadakkunnu.'],
      ['{city} മാർക്കറ്റിൽ ഇന്ന് വലിയ തിരക്ക്.','Heavy rush at the {cityEn} market today.','{cityEn} marketil innu valiya thirakku.'],
      ['ബസ് സർവീസുകൾ സാധാരണ പോലെ ഓടുന്നു.','Bus services are running as usual.','Bus servicukal saadhaarana pole odunnu.'],
      ['ഈ ആഴ്ച ഒരു പ്രാദേശിക ഫുട്ബോൾ ടൂർണമെന്റ് നടക്കും.','A local football tournament takes place this week.','Ee aazhcha oru praadeshika football tournament nadakkum.'],
      ['നഗരത്തിൽ പോലീസ് വാഹന പരിശോധന നടത്തുന്നു.','Police are carrying out vehicle checks in the city.','Nagarathil police vaahana parishodhana nadathunnu.'],
      ['ഓട്ടോ ഡ്രൈവർമാർ മീറ്റർ ഇടണമെന്ന് അധികൃതർ.','Officials remind auto drivers to use the meter.','Auto drivermaar meter idanamennu adhikruthar.'],
    ],
    rain:['ഇന്ന് മഴയ്ക്ക് സാധ്യത, ജാഗ്രത പാലിക്കുക.','Rain likely today, please take care.','Innu mazhaykku saadhyatha, jaagratha paalikkuka.'],
    clear:['ഇന്ന് തെളിഞ്ഞ കാലാവസ്ഥ.','Clear weather today.','Innu thelinja kaalaavastha.'],
    fest:['{fest} കാരണം വൈകുന്നേരം ഗതാഗത നിയന്ത്രണം.','Traffic restrictions this evening for the {festEn}.','{festEn} kaaranam vaikunneram gathaagatha niyanthranam.'] },
  TN: { intro:['செய்திகள். நேரம் {time}.','The news at {time}.','Seidhigal. Neram {time}.'],
    items:[
      ['{road} சாலையில் இன்று பராமரிப்பு பணி நடக்கிறது.','Road repair work on {roadEn} today.','{roadEn} saalaiyil indru paraamarippu pani nadakkiradhu.'],
      ['{city} சந்தையில் இன்று பெரிய கூட்டம்.','Heavy rush at the {cityEn} market today.','{cityEn} sandhaiyil indru periya koottam.'],
      ['பேருந்து சேவைகள் வழக்கம் போல் இயங்குகின்றன.','Bus services are running as usual.','Perundhu sevaigal vazhakkam pol iyangugindrana.'],
      ['இந்த வாரம் உள்ளூர் கால்பந்து போட்டி நடைபெறும்.','A local football tournament takes place this week.','Indha vaaram ulloor kaalpandhu potti nadaiperum.'],
      ['நகரத்தில் போலீஸ் வாகன சோதனை நடக்கிறது.','Police are carrying out vehicle checks in the city.','Nagarathil police vaagana sodhanai nadakkiradhu.'],
      ['ஆட்டோ ஓட்டுநர்கள் மீட்டர் போட வேண்டும் என அதிகாரிகள் அறிவுறுத்தல்.','Officials remind auto drivers to use the meter.','Auto ottunargal meter poda vendum ena adhigaarigal arivuruthal.'],
    ],
    rain:['இன்று மழைக்கு வாய்ப்பு, கவனமாக இருங்கள்.','Rain likely today, please take care.','Indru mazhaikku vaaippu, kavanamaaga irungal.'],
    clear:['இன்று தெளிவான வானிலை.','Clear weather today.','Indru thelivaana vaanilai.'],
    fest:['{fest} காரணமாக மாலையில் போக்குவரத்து கட்டுப்பாடு.','Traffic restrictions this evening for the {festEn}.','{festEn} kaaranamaaga maalaiyil pokkuvarathu kattuppaadu.'] },
};
