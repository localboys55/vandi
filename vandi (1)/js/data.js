// Vandi — static game data: cities, vehicles, signs, dialogue
'use strict';

// District headquarters of Kerala (14) and Tamil Nadu (38). big = larger town map.
const CITIES = [
  // Kerala — native script Malayalam
  {id:'tvm', st:'KL', en:'Thiruvananthapuram', nt:'തിരുവനന്തപുരം', dist:'Thiruvananthapuram', lat:8.52, lon:76.94, big:1, coast:1},
  {id:'klm', st:'KL', en:'Kollam', nt:'കൊല്ലം', dist:'Kollam', lat:8.89, lon:76.61, coast:1},
  {id:'pta', st:'KL', en:'Pathanamthitta', nt:'പത്തനംതിട്ട', dist:'Pathanamthitta', lat:9.26, lon:76.78, hill:1},
  {id:'alp', st:'KL', en:'Alappuzha', nt:'ആലപ്പുഴ', dist:'Alappuzha', lat:9.50, lon:76.34, coast:1},
  {id:'ktm', st:'KL', en:'Kottayam', nt:'കോട്ടയം', dist:'Kottayam', lat:9.59, lon:76.52, coast:1},
  {id:'idk', st:'KL', en:'Painavu', nt:'പൈനാവ്', dist:'Idukki', lat:9.85, lon:76.95, hill:1},
  {id:'ekm', st:'KL', en:'Kakkanad', nt:'കാക്കനാട്', dist:'Ernakulam', lat:10.02, lon:76.34, big:1, coast:1},
  {id:'tsr', st:'KL', en:'Thrissur', nt:'തൃശ്ശൂർ', dist:'Thrissur', lat:10.53, lon:76.21},
  {id:'pkd', st:'KL', en:'Palakkad', nt:'പാലക്കാട്', dist:'Palakkad', lat:10.78, lon:76.65, hill:1},
  {id:'mlp', st:'KL', en:'Malappuram', nt:'മലപ്പുറം', dist:'Malappuram', lat:11.05, lon:76.07},
  {id:'kkd', st:'KL', en:'Kozhikode', nt:'കോഴിക്കോട്', dist:'Kozhikode', lat:11.26, lon:75.78, big:1, coast:1},
  {id:'wyd', st:'KL', en:'Kalpetta', nt:'കൽപ്പറ്റ', dist:'Wayanad', lat:11.61, lon:76.08, hill:1},
  {id:'knr', st:'KL', en:'Kannur', nt:'കണ്ണൂർ', dist:'Kannur', lat:11.87, lon:75.37, coast:1},
  {id:'ksd', st:'KL', en:'Kasaragod', nt:'കാസർഗോഡ്', dist:'Kasaragod', lat:12.50, lon:74.99, coast:1},
  // Tamil Nadu — native script Tamil
  {id:'ari', st:'TN', en:'Ariyalur', nt:'அரியலூர்', dist:'Ariyalur', lat:11.14, lon:79.08},
  {id:'cgl', st:'TN', en:'Chengalpattu', nt:'செங்கல்பட்டு', dist:'Chengalpattu', lat:12.69, lon:79.98},
  {id:'che', st:'TN', en:'Chennai', nt:'சென்னை', dist:'Chennai', lat:13.08, lon:80.27, big:1, coast:1},
  {id:'cbe', st:'TN', en:'Coimbatore', nt:'கோயம்புத்தூர்', dist:'Coimbatore', lat:11.02, lon:76.96, big:1, hill:1},
  {id:'cud', st:'TN', en:'Cuddalore', nt:'கடலூர்', dist:'Cuddalore', lat:11.75, lon:79.75, coast:1},
  {id:'dpi', st:'TN', en:'Dharmapuri', nt:'தருமபுரி', dist:'Dharmapuri', lat:12.13, lon:78.16, hill:1},
  {id:'dgl', st:'TN', en:'Dindigul', nt:'திண்டுக்கல்', dist:'Dindigul', lat:10.36, lon:77.98, hill:1},
  {id:'erd', st:'TN', en:'Erode', nt:'ஈரோடு', dist:'Erode', lat:11.34, lon:77.72},
  {id:'kkr', st:'TN', en:'Kallakurichi', nt:'கள்ளக்குறிச்சி', dist:'Kallakurichi', lat:11.74, lon:78.96},
  {id:'kpm', st:'TN', en:'Kancheepuram', nt:'காஞ்சிபுரம்', dist:'Kancheepuram', lat:12.83, lon:79.70},
  {id:'ngl', st:'TN', en:'Nagercoil', nt:'நாகர்கோவில்', dist:'Kanyakumari', lat:8.18, lon:77.41, coast:1},
  {id:'krr', st:'TN', en:'Karur', nt:'கரூர்', dist:'Karur', lat:10.96, lon:78.08},
  {id:'kgi', st:'TN', en:'Krishnagiri', nt:'கிருஷ்ணகிரி', dist:'Krishnagiri', lat:12.52, lon:78.21, hill:1},
  {id:'mdu', st:'TN', en:'Madurai', nt:'மதுரை', dist:'Madurai', lat:9.93, lon:78.12, big:1},
  {id:'myl', st:'TN', en:'Mayiladuthurai', nt:'மயிலாடுதுறை', dist:'Mayiladuthurai', lat:11.10, lon:79.65},
  {id:'ngp', st:'TN', en:'Nagapattinam', nt:'நாகப்பட்டினம்', dist:'Nagapattinam', lat:10.77, lon:79.84, coast:1},
  {id:'nmk', st:'TN', en:'Namakkal', nt:'நாமக்கல்', dist:'Namakkal', lat:11.22, lon:78.17},
  {id:'ooty', st:'TN', en:'Ooty', nt:'உதகமண்டலம்', dist:'Nilgiris', lat:11.41, lon:76.70, hill:1},
  {id:'pmb', st:'TN', en:'Perambalur', nt:'பெரம்பலூர்', dist:'Perambalur', lat:11.23, lon:78.88},
  {id:'pdk', st:'TN', en:'Pudukkottai', nt:'புதுக்கோட்டை', dist:'Pudukkottai', lat:10.38, lon:78.82},
  {id:'rmd', st:'TN', en:'Ramanathapuram', nt:'இராமநாதபுரம்', dist:'Ramanathapuram', lat:9.37, lon:78.83, coast:1},
  {id:'rpt', st:'TN', en:'Ranipet', nt:'இராணிப்பேட்டை', dist:'Ranipet', lat:12.93, lon:79.33},
  {id:'slm', st:'TN', en:'Salem', nt:'சேலம்', dist:'Salem', lat:11.66, lon:78.15, big:1, hill:1},
  {id:'svg', st:'TN', en:'Sivaganga', nt:'சிவகங்கை', dist:'Sivaganga', lat:9.85, lon:78.48},
  {id:'tks', st:'TN', en:'Tenkasi', nt:'தென்காசி', dist:'Tenkasi', lat:8.96, lon:77.30, hill:1},
  {id:'tnj', st:'TN', en:'Thanjavur', nt:'தஞ்சாவூர்', dist:'Thanjavur', lat:10.79, lon:79.14},
  {id:'thn', st:'TN', en:'Theni', nt:'தேனி', dist:'Theni', lat:10.01, lon:77.48, hill:1},
  {id:'tut', st:'TN', en:'Thoothukudi', nt:'தூத்துக்குடி', dist:'Thoothukudi', lat:8.76, lon:78.13, coast:1},
  {id:'try', st:'TN', en:'Tiruchirappalli', nt:'திருச்சிராப்பள்ளி', dist:'Tiruchirappalli', lat:10.79, lon:78.70, big:1},
  {id:'tvl', st:'TN', en:'Tirunelveli', nt:'திருநெல்வேலி', dist:'Tirunelveli', lat:8.71, lon:77.76},
  {id:'tpt', st:'TN', en:'Tirupattur', nt:'திருப்பத்தூர்', dist:'Tirupathur', lat:12.50, lon:78.57},
  {id:'tup', st:'TN', en:'Tiruppur', nt:'திருப்பூர்', dist:'Tiruppur', lat:11.11, lon:77.34},
  {id:'tlr', st:'TN', en:'Tiruvallur', nt:'திருவள்ளூர்', dist:'Tiruvallur', lat:13.14, lon:79.91},
  {id:'tvm2', st:'TN', en:'Tiruvannamalai', nt:'திருவண்ணாமலை', dist:'Tiruvannamalai', lat:12.23, lon:79.07, hill:1},
  {id:'tvr', st:'TN', en:'Thiruvarur', nt:'திருவாரூர்', dist:'Tiruvarur', lat:10.77, lon:79.64},
  {id:'vlr', st:'TN', en:'Vellore', nt:'வேலூர்', dist:'Vellore', lat:12.92, lon:79.13},
  {id:'vpm', st:'TN', en:'Viluppuram', nt:'விழுப்புரம்', dist:'Viluppuram', lat:11.94, lon:79.49},
  {id:'vnr', st:'TN', en:'Virudhunagar', nt:'விருதுநகர்', dist:'Virudhunagar', lat:9.58, lon:77.96},
];

// Place types and their sign text. KL = Malayalam, TN = Tamil.
const PLACE_TYPES = {
  temple:   {en:'Temple', KL:'ക്ഷേത്രം', TN:'கோவில்', col:'#c0392b', holy:1},
  church:   {en:'Church', KL:'പള്ളി', TN:'தேவாலயம்', col:'#2c5aa0', holy:1},
  mosque:   {en:'Juma Masjid', KL:'ജുമാ മസ്ജിദ്', TN:'பள்ளிவாசல்', col:'#1e8449', holy:1},
  busstand: {en:'Bus Stand', KL:'ബസ് സ്റ്റാൻഡ്', TN:'பேருந்து நிலையம்', col:'#b9770e'},
  police:   {en:'Police Station', KL:'പോലീസ് സ്റ്റേഷൻ', TN:'காவல் நிலையம்', col:'#1f3a93'},
  hospital: {en:'Hospital', KL:'ആശുപത്രി', TN:'மருத்துவமனை', col:'#c0392b'},
  carshow:  {en:'Car Showroom', KL:'കാർ ഷോറൂം', TN:'கார் ஷோரூம்', col:'#6c3483', shop:'car'},
  autoshow: {en:'Auto Showroom', KL:'ഓട്ടോ ഷോറൂം', TN:'ஆட்டோ ஷோரூம்', col:'#b7950b', shop:'auto'},
  taxishow: {en:'Taxi Showroom', KL:'ടാക്സി ഷോറൂം', TN:'டாக்ஸி ஷோரூம்', col:'#1f618d', shop:'taxi'},
  busshow:  {en:'Bus Dealer', KL:'ബസ് ഡീലർ', TN:'பேருந்து விற்பனையகம்', col:'#a04000', shop:'bus'},
  petrol:   {en:'Petrol Pump & Garage', KL:'പെട്രോൾ പമ്പ്', TN:'பெட்ரோல் நிலையம்', col:'#d35400'},
  restaurant:{en:'Restaurant', KL:'ഹോട്ടൽ', TN:'உணவகம்', col:'#a04000'},
  tea:      {en:'Tea Shop', KL:'ചായക്കട', TN:'டீக்கடை', col:'#7e5109'},
  mall:     {en:'Shopping Mall', KL:'ഷോപ്പിംഗ് മാൾ', TN:'வணிக வளாகம்', col:'#117a65'},
  market:   {en:'Market', KL:'മാർക്കറ്റ്', TN:'சந்தை', col:'#7d6608'},
  textiles: {en:'Textiles', KL:'തുണിക്കട', TN:'ஜவுளிக்கடை', col:'#943126'},
  school:   {en:'School', KL:'സ്കൂൾ', TN:'பள்ளி', col:'#b7950b'},
  college:  {en:'College', KL:'കോളേജ്', TN:'கல்லூரி', col:'#5b2c6f'},
  rail:     {en:'Railway Station', KL:'റെയിൽവേ സ്റ്റേഷൻ', TN:'ரயில் நிலையம்', col:'#922b21'},
  museum:   {en:'Museum', KL:'മ്യൂസിയം', TN:'அருங்காட்சியகம்', col:'#4a235a', walkin:1},
  bakery:   {en:'Bakery', KL:'ബേക്കറി', TN:'பேக்கரி', col:'#af601a'},
};

// Shop/business name prefixes (generic, made up). [en, KL, TN]
const BIZ_NAMES = {
  restaurant: [['Hotel Annapoorna','ഹോട്ടൽ അന്നപൂർണ്ണ','அன்னபூர்ணா உணவகம்'],['Hotel Paradise','ഹോട്ടൽ പാരഡൈസ്','பாரடைஸ் உணவகம்'],['Hotel Malabar','ഹോട്ടൽ മലബാർ','மலபார் உணவகம்'],['Hotel Meenakshi','ഹോട്ടൽ മീനാക്ഷി','மீனாட்சி உணவகம்']],
  tea: [['Ammini Tea Stall','അമ്മിണി ചായക്കട','அம்மினி டீக்கடை'],['Corner Tea Shop','കോർണർ ചായക്കട','கார்னர் டீக்கடை']],
  textiles: [['Lakshmi Silks','ലക്ഷ്മി സിൽക്സ്','லட்சுமி சில்க்ஸ்'],['Kasavu House','കസവ് ഹൗസ്','கசவு ஹவுஸ்']],
  bakery: [['Sweet Corner Bakery','സ്വീറ്റ് കോർണർ ബേക്കറി','ஸ்வீட் கார்னர் பேக்கரி'],['Royal Bakery','റോയൽ ബേക്കറി','ராயல் பேக்கரி']],
  mall: [['Grand Mall','ഗ്രാൻഡ് മാൾ','கிராண்ட் மால்'],['City Centre Mall','സിറ്റി സെന്റർ മാൾ','சிட்டி சென்டர் மால்']],
};

// Festivals: by type of holy place and state
const FESTIVALS = {
  temple: {KL:{en:'Temple Utsavam', nt:'ക്ഷേത്ര ഉത്സവം'}, TN:{en:'Kovil Thiruvizha', nt:'கோவில் திருவிழா'}},
  church: {KL:{en:'Church Perunnal', nt:'പള്ളി പെരുന്നാൾ'}, TN:{en:'Church Feast', nt:'தேவாலயத் திருவிழா'}},
  mosque: {KL:{en:'Mosque Nercha', nt:'നേർച്ച'}, TN:{en:'Kandoori Festival', nt:'கந்தூரி விழா'}},
};

// Vehicles. speed in km/h, accel m/s^2, turn rate, fare per km, base fare, capacity
// Brand names are made up for the game.
const VEHICLES = [
  {id:'auto1', cat:'auto', name:'Kuttan Classic Auto', price:0, speed:55, accel:3.2, turn:2.0, grip:7, len:2.7, wid:1.45, base:30, perKm:15, colors:[0xf2c21b,0x1d1d1d]},
  {id:'auto2', cat:'auto', name:'Kuttan Diesel Plus', price:6000, speed:62, accel:3.6, turn:2.0, grip:7.5, len:2.8, wid:1.5, base:30, perKm:17, colors:[0x2f8f3a,0xf2c21b]},
  {id:'auto3', cat:'auto', name:'Kuttan E-Volt', price:15000, speed:70, accel:4.6, turn:2.2, grip:8, len:2.8, wid:1.5, base:35, perKm:18, colors:[0x1f7fb8,0xf4f1e6]},
  {id:'taxi1', cat:'taxi', name:'Kaveri Hatch Taxi', price:12000, speed:90, accel:4.2, turn:1.8, grip:8, len:3.9, wid:1.7, base:100, perKm:20, colors:[0xf2d21b,0x222222]},
  {id:'taxi2', cat:'taxi', name:'Kaveri Sedan Taxi', price:28000, speed:105, accel:4.8, turn:1.75, grip:8.5, len:4.4, wid:1.75, base:120, perKm:24, colors:[0xf4f4f0,0x1f3a5f]},
  {id:'taxi3', cat:'taxi', name:'Kaveri SUV Taxi', price:50000, speed:115, accel:5.0, turn:1.65, grip:9, len:4.6, wid:1.9, base:150, perKm:30, colors:[0x333336,0xf2d21b]},
  {id:'bus1', cat:'bus', name:'Town Mini Bus', price:35000, speed:70, accel:2.6, turn:1.35, grip:7, len:7.5, wid:2.3, seats:20, ticket:12, colors:[0x1f8f6f,0xf4efe0]},
  {id:'bus2', cat:'bus', name:'City Bus', price:70000, speed:80, accel:2.5, turn:1.2, grip:7, len:10.5, wid:2.5, seats:40, ticket:15, colors:[0xc0392b,0xf4efe0]},
  {id:'bus3', cat:'bus', name:'Express Coach', price:120000, speed:95, accel:2.8, turn:1.15, grip:7.5, len:11.5, wid:2.55, seats:50, ticket:22, colors:[0x2c3e8f,0xf2c21b]},
  {id:'car1', cat:'car', name:'Periyar Hatch', price:20000, speed:120, accel:5.2, turn:1.9, grip:9, len:3.8, wid:1.7, colors:[0xd0d3d4,0x222222]},
  {id:'car2', cat:'car', name:'Nila Sedan', price:42000, speed:138, accel:6.0, turn:1.85, grip:9.5, len:4.4, wid:1.75, colors:[0x7b241c,0x222222]},
  {id:'car3', cat:'car', name:'Vembanad GT', price:85000, speed:165, accel:7.5, turn:1.95, grip:10.5, len:4.3, wid:1.85, colors:[0x1a5276,0x111111]},
  {id:'car4', cat:'car', name:'Monsoon RS', price:160000, speed:195, accel:9.0, turn:2.05, grip:11.5, len:4.4, wid:1.9, colors:[0xe67e22,0x111111]},
  {id:'car5', cat:'car', name:'Kodai Hyper', price:320000, speed:235, accel:11.5, turn:2.15, grip:12.5, len:4.5, wid:1.95, colors:[0x27ae60,0x0b0b0b]},
  // luxury & super cars
  {id:'car6', cat:'car', lux:'limo', name:'Periyar Royale Limousine', price:600000, speed:210, accel:8.0, turn:1.7, grip:11, len:5.6, wid:2.0, colors:[0x111111,0xc9a227]},
  {id:'car7', cat:'car', lux:'suv', name:'Ghat Runner X Luxury SUV', price:850000, speed:225, accel:9.5, turn:1.8, grip:12, len:5.0, wid:2.05, colors:[0xf4f4f0,0x222222]},
  {id:'car8', cat:'car', lux:'super', name:'Kaveri Velocita', price:1200000, speed:265, accel:13.5, turn:2.2, grip:13.5, len:4.6, wid:2.05, colors:[0xc0392b,0x111111]},
  {id:'car9', cat:'car', lux:'super', name:'Nilgiri Phantom GT', price:2500000, speed:300, accel:15.5, turn:2.25, grip:14.5, len:4.7, wid:2.1, colors:[0x5b2c6f,0xd4a017]},
  {id:'car10', cat:'car', lux:'hyper', name:'Monsoon Apex Hypercar', price:5000000, speed:340, accel:18, turn:2.3, grip:15.5, len:4.8, wid:2.15, colors:[0xd4a017,0x0b0b0b]},
];
const CAT_NAMES = {auto:'Autos', taxi:'Taxis', bus:'Buses', car:'Cars'};

const PASSENGER_NAMES = {
  KL:['Thomas','Fathima','Lakshmi','Ravi','Anil','Mary','Shibu','Divya','Joseph','Ayesha','Suresh','Ammini','Biju','Reshma','Sreeja','Rasheed'],
  TN:['Murugan','Selvi','Karthik','Meena','Arul','Priya','Senthil','Kavya','Rajesh','Banu','Ganesh','Revathi','Anbu','Nithya','Sathish','Farida'],
};

// Passenger lines. {d} = destination. Native script + English.
const LINES = {
  pick: {
    KL:[['Chetta, can you go to {d}?','ചേട്ടാ, {d} വരെ പോകുമോ?'],['{d}, please. Meter on!','{d}. മീറ്റർ ഇടണേ ചേട്ടാ!'],['{d}, no rush, go slowly.','{d} വരെ, പതുക്കെ പോയാൽ മതി.'],['Are you free? I need {d}.','ഒഴിവുണ്ടോ? {d} പോകണം.']],
    TN:[['Anna, will you go to {d}?','அண்ணா, {d} போவீங்களா?'],['{d}, please. Put the meter on.','{d} போங்க. மீட்டர் போடுங்க.'],['{d}, go slowly, no hurry.','{d}, மெதுவா போங்க, அவசரம் இல்லை.'],['Free? I need to go to {d}.','ஃப்ரீயா? {d} போகணும்.']],
  },
  hurry: {
    KL:['Chetta, quickly to {d}! I\'m late, I\'ll pay extra!','ചേട്ടാ, വേഗം {d}! ലേറ്റ് ആയി, എക്സ്ട്രാ തരാം!'],
    TN:['Anna, quickly to {d}! I\'m late, I\'ll pay extra!','அண்ணா, சீக்கிரம் {d}! லேட் ஆச்சு, எக்ஸ்ட்ரா தரேன்!'],
  },
  good: {
    KL:[['Thanks, keep the change.','നന്ദി ചേട്ടാ, ബാക്കി വെച്ചോളൂ.'],['Nice smooth driving!','കൊള്ളാം, നല്ല ഡ്രൈവിംഗ്!']],
    TN:[['Thanks, keep the change.','நன்றி அண்ணா, மீதி வெச்சுக்கோங்க.'],['Super driving!','சூப்பர் டிரைவிங்!']],
  },
  bad: {
    KL:[['That took a long time...','ഇത്ര നേരം എടുത്തോ...'],['Drive carefully!','ഒന്ന് സൂക്ഷിച്ച് ഓടിക്ക്!']],
    TN:[['That took so long...','இவ்வளவு நேரமா...'],['Drive carefully!','பார்த்து ஓட்டுங்க!']],
  },
};

const WELCOME = {KL:(n)=>n+'-ലേക്ക് സ്വാഗതം', TN:(n)=>n+' உங்களை வரவேற்கிறது'};

// Reactions shown in speech bubbles above people. en = English, mg = Manglish, ml = Malayalam, tg = Tanglish, ta = Tamil
const REACT = {
  angry: {
    en: ['Hey! Watch where you\'re going!','Are you blind?!','Slow down!','Learn to drive first!','Do you own this road?','What are you doing?!','Move it!','Careful!'],
    mg: ['Ayyo! Nokki odikku!','Kannu kaanille?!','Pathukke po!','Aadyam odikkan padikku!','Ninte appante vazhiyaano?','Enthaada ee kaanikkunne?!','Maaru!','Sookshikku!'],
    ml: ['അയ്യോ! നോക്കി ഓടിക്ക്!','കണ്ണ് കാണില്ലേ?!','പതുക്കെ പോ!','ആദ്യം ഓടിക്കാൻ പഠിക്ക്!','നിന്റെ അപ്പന്റെ വഴിയാണോ?','എന്താടാ ഈ കാണിക്കുന്നേ?!','മാറ്!','സൂക്ഷിക്ക്!'],
    tg: ['Dei! Paathu po!','Kannu theriyala?!','Medhuva po!','Modhalla ottaka kathuko!','Unga appa road-aa idhu?','Enna panra nee?!','Nagaru!','Paathu!'],
    ta: ['டேய்! பார்த்து போ!','கண்ணு தெரியலையா?!','மெதுவா போ!','முதல்ல ஓட்ட கத்துக்கோ!','உங்கப்பா ரோடா இது?','என்ன பண்ற நீ?!','நகரு!','பார்த்து!'],
  },
  crash: {
    en: ['My car!','Who\'s paying for this?!','Look at my bumper!'],
    mg: ['Ente vandi!','Ithinte kaasu aaru tharum?!','Ente bumper nokku!'],
    ml: ['എന്റെ വണ്ടി!','ഇതിന്റെ കാശ് ആര് തരും?!','എന്റെ ബമ്പർ നോക്ക്!'],
    tg: ['En vandi!','Idhukku yaaru kaasu tharuva?!','En bumper-a paaru!'],
    ta: ['என் வண்டி!','இதுக்கு யாரு காசு தருவா?!','என் பம்பரை பாரு!'],
  },
  horn: {
    en: ['Stop honking!','I can hear you!','Enough!'],
    mg: ['Horn adikkalle!','Kelkkunnund!','Mathi!'],
    ml: ['ഹോൺ അടിക്കല്ലേ!','കേൾക്കുന്നുണ്ട്!','മതി!'],
    tg: ['Horn adikkadha!','Kekkudhu!','Podhum!'],
    ta: ['ஹாரன் அடிக்காதே!','கேக்குது!','போதும்!'],
  },
  police: {
    en: ['Stop the vehicle!','Pull over now!'],
    mg: ['Vandi nirthada!','Side aakku!'],
    ml: ['വണ്ടി നിർത്തെടാ!','സൈഡ് ആക്ക്!'],
    tg: ['Vandiya niruthu!','Orama nirutthu!'],
    ta: ['வண்டியை நிறுத்து!','ஓரமா நிறுத்து!'],
  },
  excuse: {
    en: ['Excuse me!','Watch it!'],
    mg: ['Onnu maariye!','Nokki nadakku!'],
    ml: ['ഒന്ന് മാറിയേ!','നോക്കി നടക്ക്!'],
    tg: ['Konjam nagarunga!','Paathu nada!'],
    ta: ['கொஞ்சம் நகருங்க!','பார்த்து நட!'],
  },
};
const REACT_LANGS = {auto:'Local language (Malayalam / Tamil)', mix:'Mix (local, slang & English)', ml:'Malayalam', mg:'Manglish', ta:'Tamil', tg:'Tanglish', en:'English'};
