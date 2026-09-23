const { Client } = require('pg');

// ============ ICON KEYWORD RULES ============
// Each [regex, emoji, bgColor]. First match wins.
const ICON_RULES = [
  [/lassi|buttermilk|chaas/i, '\u{1F95B}', '#F0F7FF'],
  [/curd|dahi|yogurt|yoghurt|doi|raita|skyr/i, '\u{1F963}', '#FFF8E7'],
  [/paneer/i, '\u{1F9C0}', '#FFFCF0'],
  [/butter|makhan|ghee/i, '\u{1F9C8}', '#FFF9E5'],
  [/cheese/i, '\u{1F9C0}', '#FFFCF0'],
  [/tofu|tempeh/i, '\u{1F372}', '#F5F0FF'],
  [/egg/i, '\u{1F95A}', '#FFF9E5'],
  [/sourdough|bread|pav|bun|loaf/i, '\u{1F35E}', '#FBEFDC'],
  [/oats|cereal|muesli|granola|daliya/i, '\u{1F963}', '#F5EBDA'],
  [/atta|flour|rice|dalia/i, '\u{1F33E}', '#F5EAD4'],
  [/milk|doodh/i, '\u{1F95B}', '#F0F7FF'],
  [/rose|gulab/i, '\u{1F339}', '#FCE4EC'],
  [/orchid/i, '\u{1F33A}', '#F3E5F5'],
  [/sunflower/i, '\u{1F33B}', '#FFF9C4'],
  [/lily/i, '\u{1F337}', '#F8BBD0'],
  [/tulip/i, '\u{1F337}', '#FCE4EC'],
  [/bouquet|flower/i, '\u{1F490}', '#FCE4EC'],
  [/plant/i, '\u{1FAB4}', '#E8F5E9'],
  [/leaf|leaves|patra|aaku/i, '\u{1F343}', '#E8F5E9'],
  [/betel|paan|tamal/i, '\u{1F343}', '#E8F5E9'],
  [/tulsi|basil/i, '\u{1F33F}', '#E8F5E9'],
  [/mint|pudina/i, '\u{1F33F}', '#E8F5E9'],
  [/coriander|dhaniya|kothimeera/i, '\u{1F33F}', '#E8F5E9'],
  [/curry|karivepaku|kadi patta/i, '\u{1F33F}', '#E8F5E9'],
  [/spinach|palak/i, '\u{1F96C}', '#E8F5E9'],
  [/lettuce|salad/i, '\u{1F96C}', '#E8F5E9'],
  [/broccoli/i, '\u{1F966}', '#E8F5E9'],
  [/cauliflower|gobhi/i, '\u{1F966}', '#FFF3E0'],
  [/cabbage/i, '\u{1F96C}', '#E8F5E9'],
  [/carrot|gajar/i, '\u{1F955}', '#FFF3E0'],
  [/beet/i, '\u{1F9E0}', '#FCE4EC'],
  [/sweet potato|shakarkandi|chilakada/i, '\u{1F360}', '#F3E5D8'],
  [/potato|aloo|dumpa/i, '\u{1F954}', '#F3E5D8'],
  [/onion|pyaz|ulli/i, '\u{1F9C5}', '#F5E6E6'],
  [/garlic|lehsun|velluli/i, '\u{1F9C4}', '#F5E6E6'],
  [/ginger|adrak|allam/i, '\u{1FAD6}', '#F5EAD4'],
  [/tomato|tamatar|tamata/i, '\u{1F345}', '#FCE4E0'],
  [/zucchini|cucumber|kheera|dosakaya/i, '\u{1F952}', '#E8F5E9'],
  [/brinjal|vankaya|baingan|eggplant/i, '\u{1F346}', '#F3E5F5'],
  [/capsicum|shimla mirch|bell pepper/i, '\u{1FAD1}', '#E8F5E9'],
  [/chilli|mirch|mirapakaya/i, '\u{1F336}', '#FCE4E0'],
  [/corn|mokkajonna/i, '\u{1F33D}', '#FFF8E1'],
  [/mushroom|kukurmutta/i, '\u{1F344}', '#F5EAD4'],
  [/pumpkin|gummadikaya|kaddu/i, '\u{1F383}', '#FFE0B2'],
  [/gourd|sorakaya|beerakaya|kakarakaya|potlakaya/i, '\u{1F952}', '#E8F5E9'],
  [/beans|chikkudu|bobbarlu/i, '\u{1FAD8}', '#E8F5E9'],
  [/peas|matar/i, '\u{1FADB}', '#E8F5E9'],
  [/drumstick|munakkada/i, '\u{1F33F}', '#E8F5E9'],
  [/banana|aratikaya/i, '\u{1F34C}', '#FCEFD4'],
  [/apple|seb|shimla/i, '\u{1F34E}', '#FCE4E4'],
  [/orange|mosambi|tangerine|nagpur/i, '\u{1F34A}', '#FCE8D0'],
  [/lemon|nimakaya/i, '\u{1F34B}', '#FFF8D6'],
  [/mango|aam|mamidi/i, '\u{1F96D}', '#FCEBC9'],
  [/grape|angoor|draksha/i, '\u{1F347}', '#F3E5F5'],
  [/watermelon/i, '\u{1F349}', '#E8F5E9'],
  [/melon|kharbuja|sarda/i, '\u{1F348}', '#E8F5E9'],
  [/strawberry/i, '\u{1F353}', '#FCE4EC'],
  [/blueberry/i, '\u{1FAD0}', '#E3F2FD'],
  [/berr/i, '\u{1FAD0}', '#FCE4EC'],
  [/kiwi/i, '\u{1F95D}', '#E8F5E9'],
  [/pineapple|ananas/i, '\u{1F34D}', '#FFF3E0'],
  [/peach/i, '\u{1F351}', '#FCE4EC'],
  [/pear|babugosha|nashpati/i, '\u{1F350}', '#E8F5E9'],
  [/cherry/i, '\u{1F352}', '#FCE4EC'],
  [/pomegranate|anaar|danimma/i, '\u{1F34E}', '#FCE4E4'],
  [/guava|amrud/i, '\u{1F350}', '#E8F5E9'],
  [/papaya|papita/i, '\u{1F96D}', '#FCEBC9'],
  [/coconut|nariyal|kobbari/i, '\u{1F965}', '#F5EAD4'],
  [/avocado/i, '\u{1F951}', '#E8F5E9'],
  [/dragon fruit/i, '\u{1F351}', '#FCE4EC'],
  [/plum|apricot|fig/i, '\u{1F351}', '#F3E5F5'],
  [/date|khajur/i, '\u{1F330}', '#F5EAD4'],
  [/radish|mullangi|mooli/i, '\u{1F955}', '#F3E5F5'],
  [/kale/i, '\u{1F96C}', '#E8F5E9'],
  [/parsley|celery|thyme|rosemary|lemongrass/i, '\u{1F33F}', '#E8F5E9'],
  [/neem/i, '\u{1F33F}', '#E8F5E9'],
  [/sugarcane/i, '\u{1F38B}', '#F0F7E8'],
  [/jackfruit|kathal/i, '\u{1F348}', '#F5EAD4'],
  [/sapota|chikoo/i, '\u{1F350}', '#F5EAD4'],
  [/wood apple|bel/i, '\u{1F965}', '#F5EAD4'],
  [/ash gourd|budida/i, '\u{1F383}', '#E8F5E9'],
  [/raw banana/i, '\u{1F34C}', '#E8F5E9'],
  [/raw papaya/i, '\u{1F96D}', '#E8F5E9'],
  [/colocasia|arbi|chamadumpalu|yam/i, '\u{1F360}', '#F3E5D8'],
  [/turmeric|pasupu/i, '\u{1F7E1}', '#FFF3C4'],
  [/rose/i, '\u{1F339}', '#FCE4EC'],
  [/melons|tender/i, '\u{1F348}', '#E8F5E9'],
];

function pickIcon(name) {
  for (const r of ICON_RULES) {
    if (r[0].test(name)) return { icon: r[1], bg: r[2] };
  }
  return { icon: '\u{1F6D2}', bg: '#F0F0F0' };
}

// ============ SEED DATA ============
// Format: [name, unit, price, mrp]
const SEED = {
  'Fresh Vegetables': [
    ['Green Lettuce','100 g',32,39],['Green Chilli (Mirapakaya)','100 g',11,12],
    ['Onion (Ulligadda)','1 kg',64,82],['Potato (Bangala Dumpa)','1 kg',28,34],
    ['Coriander Bunch (Kottimeera)','100 g',17,19],['Orange Carrot','500 g',37,42],
    ['Desi Tomato','500 g',19,22],['Lemon (Nimakaya)','200 g',58,69],
    ['Green Cucumber','500 g',31,37],['Mint Leaves (Pudina)','100 g',16,18],
    ['Button Mushroom','180 g',63,74],['Green Capsicum','250 g',21,25],
    ['French Beans','250 g',28,32],['Bottle Gourd (Sorakaya)','400 g',25,30],
    ['Cauliflower','300 g',34,40],['English Cucumber','500 g',33,37],
    ['Lady Finger (Bendakaya)','250 g',17,21],['Beetroot','500 g',24,29],
    ['Ivy Gourd','250 g',20,24],['Garlic (Velluli)','200 g',60,70],
    ['Cabbage','400 g',24,29],['Broccoli','200 g',49,60],
    ['Long Purple Brinjal','250 g',19,24],['Drumstick (Munakkada)','2 pcs',24,29],
    ['Amla (Usirikaya)','250 g',63,81],['Cluster Beans','250 g',16,19],
    ['American Sweet Corn','1 pc',21,26],['Sweet Potato','450 g',41,50],
    ['Ridge Gourd','500 g',32,38],['Spring Onion','150 g',13,16],
    ['Drumstick Leaves','100 g',23,28],['Hybrid Tomato','500 g',25,32],
    ['Bitter Gourd (Kakarakaya)','250 g',24,29],['Arvi (Chamadumpalu)','250 g',15,19],
    ['Green Amaranthus Leaves','250 g',19,24],['Sweet Corn Packet','180 g',42,53],
    ['Fenugreek (Mentikura)','250 g',40,47],['Radish (Mullangi)','250 g',18,21],
    ['Pulao Mix','250 g',74,90],['Iceberg Lettuce','250 g',39,46],
    ['Malabar Spinach','250 g',23,27],['Sambar Onion (Peeled)','200 g',57,66],
    ['Grey Oyster Mushroom','125 g',68,82],['Snake Gourd','500 g',26,31],
    ['Cherry Tomatoes','200 g',52,64],['Yellow Bell Pepper','125 g',36,43],
    ['Green Zucchini','200 g',35,40],['Banana Stem','800 g',17,20],
    ['Bok Choy','200 g',83,107],['Yellow Zucchini','200-250 g',39,46],
  ],
  'Fresh Fruits': [
    ['Banana','3 pcs',35,42],['Baby Banana','4 pcs',32,38],
    ['Tender Coconut','1 pc',94,117],['Avocado Hass Tanzania','150 g',89,112],
    ['Yellaki Banana','6 pcs',64,75],['Brown Coconut','1 pc',46,58],
    ['Blueberry Imported','125 g',215,251],['Pomegranate','350 g',115,136],
    ['Papaya (Papita)','700 g',101,118],['Avocado Hass','250 g',169,209],
    ['Washington Red Delicious Apple','250 g',148,179],['Red-Globe Grapes','200 g',107,127],
    ['Green Kiwi','3 pcs',128,163],['Mini Orange','200 g',114,141],
    ['Thai Guava','400 g',148,185],['Daily Apple','500 g',106,131],
    ['Dragon Fruit','300 g',118,138],['Pink Lady Apple','300 g',146,179],
    ['Pear Bartlett','500 g',128,166],['Sweet Lime','1 kg',67,86],
    ['Pineapple Cut','200 g',93,114],['Pineapple Peeled','300 g',141,179],
    ['Red Delicious Apple','250 g',125,146],['Indian Royal Gala Apple','450 g',194,246],
    ['Custard Apple','300 g',133,160],['Royal Gala Apple','250 g',123,159],
    ['Plum Imported','200 g',64,79],['Granny Smith Apple','300 g',144,180],
    ['Premium Shimla Apple','300 g',103,126],['Sun Melon','500 g',110,133],
    ['Grated Coconut','200 g',61,71],['Kashmiri Apple','280 g',109,131],
    ['Kiran Watermelon','2 kg',96,112],['Shine Muscat Green Grapes','250 g',114,148],
    ['Indian Guava','350 g',94,117],['Sapota (Chikoo)','200 g',71,92],
  ],
  'Leafies & Herbs': [
    ['Green Lettuce','100 g',32,39],['Coriander Bunch','100 g',17,19],
    ['Mint Leaves','100 g',16,18],['Betel Leaves','5 pcs',19,23],
    ['Spring Onion','150 g',13,16],['Green Amaranthus Leaves','250 g',19,24],
    ['Curry Leaves','50 g',18,21],['Fenugreek (Mentikura)','250 g',40,47],
    ['Sorrel (Chukka Kura)','200 g',24,28],['Red Amaranthus Leaves','200 g',22,26],
    ['Iceberg Lettuce','250 g',39,46],['Malabar Spinach','250 g',23,27],
    ['Neem Leaves','1 pack',25,31],['Ponnagani Leaves','250 g',18,21],
    ['Lettuce Mix','100 g',44,57],['Bok Choy','200 g',83,107],
    ['Giloy Stick','25 g',35,44],['Spinach (Palakura)','200 g',33,40],
    ['Banana Leaf','5 pcs',59,71],['Holy Tulsi','10 g',21,27],
    ['Gongura Leaves','250 g',22,25],['Fresh Rosemary','10 g',24,29],
    ['Dill Leaves','100 g',28,34],['Papaya Leaves','1 pc',16,19],
    ['Lemongrass','100 g',63,81],['Neem Sticks','5 pcs',13,15],
  ],
  'Exotics': [
    ['Avocado Hass Tanzania','150 g',89,112],['Blueberry Imported','125 g',215,251],
    ['Green Kiwi','3 pcs',128,163],['Zespri Sungold Kiwi','2 pcs',143,165],
    ['Dragon Fruit','300 g',118,138],['Dragon Fruit Red Flesh','250 g',89,109],
    ['Yellow Bell Pepper','125 g',39,48],['Cherry Tomatoes','200 g',56,71],
    ['Assorted Capsicum','3 pcs',105,132],['Green Zucchini','200 g',42,52],
    ['Baby Corn Packet','200 g',38,49],['Iceberg Lettuce','250 g',65,83],
    ['Lettuce Mix','100 g',47,54],['Hydroponic Sweet Bell Pepper','200 g',129,162],
    ['Yellow Zucchini','200-250 g',37,42],['Bok Choy','200 g',70,81],
    ['Broccoli Florets','100 g',81,101],['Mix Cherry Tomatoes','100 g',34,41],
    ['Romaine Lettuce','100 g',44,55],['Celery','100 g',49,60],
    ['Asparagus Bunch','100 g',104,119],['Red Bell Pepper','125 g',39,48],
    ['Italian Basil Leaves','50 g',46,54],['Baby Spinach','100 g',82,98],
    ['Parsley','25 g',58,73],['Rocket Leaves','20 g',43,52],
    ['Kaffir Lime Leaves','10 g',76,91],['Lemongrass','100 g',52,61],
    ['Flat Kale Leaves','100 g',86,108],['Garlic Chives','10 g',46,53],
  ],
  'Frozen Veg': [
    ['Safal Frozen Green Peas','500 g',117,135],['Safal Frozen Green Peas','1 kg',207,240],
    ['Safal Sweet Corn Frozen','500 g',86,100],['SPT Frozen Green Peas','500 g',65,169],
    ['Wow Coco Fresh Grated Coconut','200 g',95,125],['SPT Frozen Green Peas','1 kg',109,299],
    ['Safal Frozen Mixed Vegetables','500 g',77,85],['Delishh Strawberry Frozen','200 g',145,168],
    ['Pluckk Frozen Blueberry','200 g',226,269],['Safal Frozen Sweet Corn','1 kg',155,180],
    ['SPT American Frozen Sweet Corn','500 g',82,135],['Pluckk Frozen Grated Coconut','200 g',99,125],
    ['SPT Frozen Mixed Vegetables','500 g',63,120],['Delishh Frozen Blueberry','500 g',528,599],
    ['Pluckk Frozen Mixed Berries','200 g',264,299],['Pluckk Frozen Strawberry','200 g',231,259],
    ['Gadre Edamame Frozen','500 g',340,550],['Delishh Frozen Raspberry','200 g',509,598],
    ['Pluckk Frozen Raspberry','200 g',460,499],['Delishh Frozen Mulberry','200 g',289,337],
  ],
  'Trusted Organic': [
    ['Organically Grown Tomato (Desi)','500 g',39,48],['Organically Grown Ginger','100 g',44,52],
    ['Organically Grown Garlic','100 g',38,44],['Organically Grown Green Chilli','100 g',27,31],
    ['Organically Grown Green Cucumber','500 g',36,42],['Organically Grown Lady Finger','250 g',31,37],
    ['Organically Grown Onion','500 g',64,81],['Organically Grown Ridge Gourd','500 g',50,59],
    ['Organically Grown Ivy Gourd','250 g',29,33],['Organically Grown Bitter Gourd','250 g',28,36],
    ['Organically Grown Bottle Gourd','400 g',40,46],['Organically Grown Cabbage','400 g',47,56],
    ['Organically Grown Colocasia','250 g',28,35],['Organically Grown Sambhar Onion','250 g',47,60],
    ['Organically Grown Cauliflower','300 g',62,73],['Organically Grown Green Capsicum','250 g',36,45],
    ['Organically Grown Drumstick','250 g',35,43],['Organically Grown Cluster Beans','250 g',33,39],
    ['Organically Grown Raw Papaya','400 g',43,52],['Organically Grown Chow Chow','250 g',31,37],
    ['Organically Grown Brown Coconut','1 pc',47,56],['Organically Grown Sweet Lime','500 g',43,53],
    ['Organically Grown Pomegranate','350 g',143,171],['Organically Grown Pineapple','700 g',97,112],
    ['Organically Grown Muskmelon','400 g',59,67],['Organically Grown Curry Leaves','50 g',18,21],
    ['Organically Grown Mint Leaves','100 g',27,32],['Organically Grown Fresh Rosemary','10 g',36,36],
    ['Organically Grown Coriander','100 g',39,47],['Organically Grown Beetroot','250 g',36,43],
    ['Organically Grown Potato','1 kg',69,89],['Organically Grown Sweet Potato','250 g',30,36],
  ],
  'Flowers & Leaves': [
    ['Betel Leaves (Paan Patta)','5 pcs',19,23],['FlowerAura 3 Red Roses Bouquet','1 pc',179,325],
    ['FlowerAura Red Rose Single Flower','1 pc',67,149],['FNP Joyful Red Rose Single','1 pc',69,299],
    ['Mango Leaves','10 pcs',19,22],['FlowerAura 3 Purple Orchids','1 pc',349,599],
    ['FlowerAura 10 Pink Roses Bouquet','1 pc',499,699],['FNP 5 Mixed Roses Bouquet','1 pc',249,399],
    ['FlowerAura 2 White Orchids','1 pc',199,399],['FNP 10 Pink Carnations Bouquet','1 pc',459,899],
    ['FNP Infinite Love 15 Red Roses','1 pc',599,1049],['FlowerAura 5 Pink Carnations','1 pc',299,499],
    ['FNP 10 Romantic Red Roses','1 pc',479,675],['FlowerAura Blue Vanda Orchid','1 pc',699,1050],
    ['Ugaoo Peace Lily Plant','1 pc',239,399],['Ugaoo Jade Plant with Ibiza Pot','1 pc',189,399],
    ['FNP Sunflower Delight','1 pc',229,399],['Rooted Jade Plant','1 pc',169,449],
    ['Ugaoo Philodendron Birkin Plant','1 pc',289,499],['Ugaoo Areca Palm Plant','1 pc',334,749],
    ['Ugaoo Peace Lily Self Watering','1 pc',289,499],['Rooted Money Plant','1 pc',179,449],
    ['Ugaoo Jade Plant Self Watering','1 pc',279,449],['Ugaoo Golden Money Plant','1 pc',289,449],
  ],
  'Mangoes & Melons': [
    ['Chaunsa Mango','400 g',226,275],['Raw Mango (Kacha Aam)','500 g',77,92],
    ['Sun Melon (Sarda)','500 g',110,133],['Bobby Muskmelon','400 g',139,111],
  ],
  'Milk': [
    ['Amul Taaza Toned Milk','500 ml',30,0],['Amul Gold Full Cream Milk','500 ml',36,0],
    ['Amul Cow Milk','500 ml',31,0],['Amul Lactose Free Milk','250 ml',26,0],
    ['Amul Taaza Homogenised Toned Milk','1 ltr',77,0],['Country Delight Cow Milk','450 ml',46,48],
    ['Mother Dairy Toned Milk','500 ml',30,0],['Amul Moti Toned Milk','450 ml',33,0],
    ['Mother Dairy Full Cream Milk','500 ml',36,0],['Mother Dairy Cow Milk','500 ml',31,0],
    ['Amul Gold Milk','1 ltr',83,0],['Amul Taaza Toned Milk','200 ml',17,0],
    ['Humpy Farms A2 Cow Milk','500 ml',46,49],['Yakult Probiotic Drink','5 x 65 ml',90,0],
    ['Mother Dairy FIT Life Double Toned','400 ml',30,0],['Amul Slim n Trim Skimmed Milk','1 ltr',85,0],
    ['Yakult Light Probiotic Drink','5 x 65 ml',100,0],['Amul A2 Gir Cow Milk','1 ltr',85,0],
    ['Nestle a+ Slim Skimmed Milk','1 ltr',99,0],['Nestle a+ Toned Milk','1 ltr',112,0],
    ['Mother Dairy Toned Milk','1 ltr',77,0],['Amul Cow Milk','1 ltr',61,0],
    ['Amul Buffalo A2 Milk','1 ltr',90,0],['Yakult Light Mango Probiotic','5 x 65 ml',100,0],
    ['Provilac High Protein Milk','250 ml',94,140],['Amul Calci+ Calcium Rich Milk','250 ml',26,0],
    ['Epigamia High Protein Milk','250 ml',99,125],['Mother Dairy Milk','180 ml',16,0],
  ],
  'Bread & Pav': [
    ['English Oven Zero Maida Atta Wheat Bread','400 g',60,0],['Harvest Gold Atta Whole Wheat Bread','450 g',65,0],
    ['Harvest Gold White Bread','350 g',33,0],['Harvest Gold White Bread','700 g',65,0],
    ['English Oven Premium White Bread','700 g',65,0],['English Oven Brown Bread','400 g',60,0],
    ['English Oven Zero Maida Multigrain','400 g',70,0],['English Oven Milk Bread','400 g',50,0],
    ['The Health Factory Zero Maida Whole Wheat','250 g',55,0],['Harvest Gold Hearty Brown Bread','400 g',60,0],
    ['English Oven Premium White 350 g','350 g',33,0],['Baker\'s Loaf High Protein Wheat Bread','350 g',91,95],
    ['Suchali\'s Artisan Country Sourdough','350 g',150,0],['Suchali\'s Artisan Buttercrust Milk Bread','470 g',200,0],
    ['English Oven Fruit Bun','150 g',20,0],['Protein Chef Multigrain Double Protein','270 g',99,0],
    ['Baker\'s Loaf Zero Maida Oatmeal Bread','350 g',91,95],['English Oven Regular Burger Bun','300 g',55,0],
    ['Harvest Gold Multigrain Bread','450 g',70,0],['The Health Factory Zero Maida Multigrain','375 g',78,80],
    ['Britannia Whole Wheat Bread','400 g',65,0],['English Oven Sandwich White Bread','400 g',45,0],
    ['Baker\'s Loaf Whole Wheat Bread','350 g',81,85],['Harvest Gold Atta Burger Bun','200 g',45,0],
    ['Britannia Breakfast Soft Slice White','350 g',35,0],['iD Malabar Paratha','5 pcs',113,0],
    ['English Oven Zero Maida Pav','250 g',50,0],['Baker\'s Loaf 21 Grains Sourdough','350 g',114,120],
    ['Harvest Gold Bunjoy Tutti Frutti','140 g',20,0],
  ],
  'Eggs': [
    ['Nutrich Farm Fresh Protein Rich Eggs','6 pcs',62,75],['Table White Eggs','10 pcs',101,140],
    ['Farm Made Free Range Eggs','6 pcs',154,159],['Eggoz Nutrition White Eggs','10 pcs',147,170],
    ['Hen Fruit Farm Fresh White Eggs','30 pcs',394,469],['The Urban Eggs Farm Fresh White','30 pcs',264,330],
    ['Farm Made Free Range Eggs 12','12 pcs',299,309],['Table White Eggs','6 pcs',62,85],
    ['The Egg Co. Farm Fresh Protein Rich','10 pcs',106,119],['Licious Farm Fresh Classic White','6 pcs',88,0],
    ['Licious White Protein Rich Eggs','12 pcs',164,0],['Eggoz Nutrition White Eggs','30 pcs',379,479],
    ['Table White Eggs','30 pcs',280,350],['Nature Good White Eggs','10 pcs',96,145],
    ['Bajaj S.K. White Protein Rich Eggs','10 pcs',170,0],['Eggoz Nutrition Brown Eggs','10 pcs',173,205],
    ['Nature Good White Eggs','30 pcs',272,370],['Licious Brown Eggs','6 pcs',123,0],
    ['Hen Fruit Max Protein Eggs','10 pcs',159,175],['Hen Fruit Max Protein Eggs','30 pcs',410,489],
    ['Eggoz Nutrition White Eggs','6 pcs',85,109],['Eggoz Nutrition Protein Plus Eggs','10 pcs',124,180],
    ['Abhi Vitamin D3 White Eggs','10 pcs',163,175],['Eggland Farms White Eggs','10 pcs',91,150],
    ['Abhi Vitamin D3 White Eggs','6 pcs',90,110],['Hen Fruit Jumbo Size Eggs','10 pcs',162,185],
    ['Bajaj S.K. Brown Eggs','10 pcs',210,0],['Organic Acre Desi Kadaknath Eggs','6 pcs',219,0],
    ['Eggee Provita+ White Eggs','6 pcs',88,110],['Hen Fruit Farm Fresh White Eggs','10 pcs',156,165],
  ],
  'Muesli & Granola': [
    ['Doctor\'s Choice Chocolate Fudge Muesli','750 g',649,749],['Kellogg\'s Fruit Nut & Seeds Muesli','65 g',30,57],
    ['Kellogg\'s Muesli Fruit Nut & Seeds','240 g',158,185],['Kellogg\'s Muesli Fruit Nut & Seeds','750 g',347,489],
    ['Elevate Cocoa & Almond High Protein Granola','300 g',360,400],['Pintola High Protein Dark Chocolate & Cranberry','400 g',286,325],
    ['Kellogg\'s Crunchy Almond Berry Granola','450 g',380,0],['True Elements Dark Chocolate Granola','400 g',255,260],
    ['Elevate Almond & Seeds High Protein Granola','300 g',360,400],['Pintola High Protein Fruit and Nut Muesli','400 g',275,325],
    ['Kellogg\'s Millet Breakfast Muesli','500 g',186,370],['True Elements Wholegrain Premium Quinoa','500 g',172,385],
    ['Elevate Apple & Cinnamon Granola','300 g',360,400],['Kellogg\'s 0% Added Sugar Muesli','500 g',247,370],
    ['Yoga Bar High Protein Muesli','850 g',371,825],['Mevo Muesli 96% Fruits Nuts & Seeds','400 g',349,400],
    ['Bagrry\'s Belgian Dark Chocolate Granola','400 g',308,399],['Kellogg\'s Crunchy Chocolate Cookie Granola','400 g',249,500],
    ['Tata Soulfull Millet Muesli','700 g',341,480],['Kellogg\'s Millet Muesli 84% Fruit','1 kg',343,690],
    ['Kellogg\'s Muesli Nuts & Seeds Crunch','950 g',384,740],['Kibi Kibi Chunky Chocolate Granola','315 g',375,0],
    ['True Elements High Protein Fruit Nuts','400 g',299,370],['Bagrry\'s Crunchy Muesli 30% Fruit','750 g',342,499],
    ['Bagrry\'s No Added Sugar Muesli','700 g',299,598],['Yoga Bar Dark Chocolate & Cranberry Muesli','700 g',317,399],
    ['Yoga Bar Dark Chocolate + Cranberry','160 g',99,0],['Kibi Kibi Banana Cinnamon Granola','315 g',375,0],
    ['Pintola High Protein Dark Chocolate & Cranberry','1 kg',626,710],['Yoga Bar Fruits + Nuts & Seeds Muesli','700 g',296,399],
  ],
  'Oats': [
    ['GOAT Life High Protein Overnight Almond Kulfi','3 x 75 g',317,417],['Quaker Rolled Instant Oats','400 g',86,0],
    ['Pintola High Protein Oats Chocolate','400 g',275,310],['Bagrry\'s White Instant Oats','1 kg',166,220],
    ['GOAT Life High Protein Choco-Nut Crunch','75 g',119,139],['Quaker Multigrain Rolled Oats','600 g',157,192],
    ['Saffola Classic Masala Instant Oats','225 g',100,170],['Saffola Classic-Masala Oats','38 g',20,0],
    ['GOAT Life High Protein Brownie Fudge','75 g',139,0],['GOAT Life Tiramisu Overnight Oats','75 g',139,149],
    ['Bagrry\'s Jumbo Rolled Oats','1 kg',232,430],['Yoga Bar Protein Oats - Dark Chocolate','1 kg',439,490],
    ['Pintola High Protein Caffe Mocha Oats','400 g',266,310],['Saffola Oats Soft & Creamy','1 kg',160,205],
    ['GOAT Life Mango Madness Overnight Oats','75 g',119,139],['Saffola Oats Soft & Creamy','460 g',90,100],
    ['GOAT Life Choco Hazelnut Overnight Oats','60 g',69,0],['Yoga Bar 26g High Protein Oats','250 g',139,200],
    ['Yoga Bar Protein Oats Fruits Nuts & Seeds','1 kg',439,490],['Bagrry\'s Steel Cut Oats','500 g',220,299],
    ['Kellogg\'s Oats','900 g',165,199],['Manna Whole Grain Rolled Oats','1 kg',196,279],
    ['Saffola Masala Veggie Twist Oats','38 g',20,0],['Sundrop Heart Plain Rolled Oats','1 kg',145,149],
    ['Alpino High Protein Dark Chocolate Oats','1 kg',520,649],['Organic Nation Steel Cut Oats','1 kg',285,590],
    ['Rosier Kulfi Masti High Protein Oats','77 g',97,100],['Alpino High Protein Oats Chocolate','400 g',249,222],
  ],
  'Paneer & Tofu': [
    ['Hello Tempayy 42g Protein Natural Tempeh Cubes','200 g',100,159],['Mother Dairy Paneer','200 g',100,0],
    ['Amul Fresh Malai Paneer','200 g',95,0],['Gopala Fresh Malai Paneer','200 g',110,0],
    ['Country Delight Taaza Paneer','180 g',111,117],['Ananda Premium Paneer','200 g',105,0],
    ['Country Delight Taaza 40g High Protein Paneer','200 g',125,130],['Milky Mist Low Fat High Protein Paneer','200 g',96,165],
    ['Mother Dairy Paneer Family Pack','400 g',190,0],['Pro Plant Premium Tofu','200 g',53,80],
    ['Pride of Cows Paneer','200 g',179,195],['Mooz Tofu','200 g',110,0],
    ['FruBon Low Fat High Protein Paneer','200 g',117,130],['Doodhvale Farms Royal A2 Paneer','180 g',106,119],
    ['Milky Mist Paneer','200 g',91,140],['Gowardhan Classic Block Paneer','200 g',115,0],
    ['Pro Plant Masala Tofu','200 g',61,90],['Ananda Cow Paneer','180 g',78,90],
    ['Diet Tofu Soya Tofu','200 g',54,70],['FruBon Paneer','180 g',95,0],
    ['Epigamia High Protein Paneer','200 g',147,250],['Morinaga Firm Tofu','307 g',399,0],
    ['Diet Tofu Masala Tofu','100 g',35,45],['Morinaga Silken Extra Firm Tofu','308 g',399,0],
    ['Mooz Vegetable Tofu','200 g',120,0],['Hello Tempayy Peri Peri Tempeh Cubes','200 g',115,175],
    ['Now Healthy Tofu','200 g',41,90],['Hello Tempayy Peri Peri Tempeh Crumbles','200 g',108,175],
    ['Fusion Tofu','3 x 200 g',199,240],
  ],
  'Curd & Yogurt': [
    ['FruBon Premium Cup Curd Tub','1 kg',114,130],['Amul Masti Pouch Curd','380 g',35,0],
    ['Country Delight Ghar Jaisa Cup Curd','400 g',69,80],['Mother Dairy Classic Cup Curd','200 g',25,0],
    ['FruBon 11g High Protein Curd','2 x 360 g',57,70],['Amul Masti Pouch Curd','1 kg',80,0],
    ['Mother Dairy Classic Pouch Curd','390 g',35,0],['Nestle a+ Dahi Thick & Creamy','180 g',35,0],
    ['Amul Masti Cup Curd','200 g',25,0],['Amul Masti Set Cup Curd Tub','1 kg',115,0],
    ['Mother Dairy Ultimate Cup Curd','400 g',55,0],['Milky Mist SKYR High Protein Yogurt','700 g',330,380],
    ['Milky Mist Skyr High Protein Plain','100 g',65,75],['Amul Pouch Curd','700 g',50,0],
    ['Milky Mist Natural Greek Yogurt','100 g',45,55],['Nestle a+ ActiPlus Dahi','380 g',85,90],
    ['Mother Dairy Nutrifit Probiotic Cup Curd','200 g',30,0],['Mother Dairy Mishti Doi','80 g',20,0],
    ['Epigamia Natural Greek Yogurt','400 g',250,0],['Epigamia Natural Greek Yogurt','85 g',60,0],
    ['Country Delight Low Fat Curd','400 g',59,64],['Doodhvale Farms Taaza Matka Cup Curd','500 g',89,95],
    ['Epigamia Blueberry Flavoured Yogurt','85 g',60,0],['Agapi Natural Greek Yogurt','100 g',52,60],
    ['Nestle a+ Raita Bhuna Jeera','185 g',40,0],['Epigamia Alphonso Mango Greek Yogurt','85 g',60,0],
    ['Pride of Cows Cup Curd','320 g',99,120],['Country Delight 25g High Protein Curd','400 g',94,99],
    ['Epigamia Mixed Berries Greek Yogurt','85 g',70,0],['Epigamia Turbo Protein Yogurt','140 g',125,0],
  ],
  'Butter & More': [
    ['Milky Mist Salted Butter','100 g',83,85],['Milky Mist Chiplet Salted Butter','100 g',81,90],
    ['FruBon White Desi Butter','80 g',80,0],['Nutralite DoodhShakti Probiotic Salted Butter Tub','500 g',309,325],
    ['Delicious Cholesterol Free Fat Spread','100 g',25,0],['Nutralite DoodhShakti Probiotic Salted Butter','100 g',63,0],
    ['Amul Lite Milk Fat Bread Spread','200 g',105,0],['Country Delight Salted Butter Cow Milk','80 g',69,75],
    ['Amul Salted Butter','100 g',63,0],['Amul Unsalted Butter','100 g',65,0],
    ['Amul Salted Butter','200 g',130,0],['Mother Dairy Salted Butter','500 g',310,0],
    ['Amul Salted Butter Chiplets','100 g',80,0],['Amul Garlic & Herbs Butter','100 g',75,0],
    ['FruBon White Butter Makhan Mishri','80 g',110,0],['Mother Dairy Salted Butter','100 g',63,0],
    ['Amul White Unsalted Butter','100 g',70,0],['Nutralite DoodhShakti Salted Butter','500 g',290,305],
    ['Amul Lite Milk Fat Spread','100 g',50,0],['Milky Mist Unsalted Cooking Butter','100 g',83,85],
    ['Milky Mist Table Salted Butter','200 g',156,160],['Pintola Unsweetened Creamy Almond Butter','200 g',369,398],
  ],
};

// ============ MAIN SEED ============
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const STORE_ID = 1;
  const SECTION_MAP = {
    'Fresh Vegetables':'Fresh','Fresh Fruits':'Fresh','Leafies & Herbs':'Fresh',
    'Exotics':'Fresh','Frozen Veg':'Fresh','Trusted Organic':'Fresh',
    'Flowers & Leaves':'Fresh','Mangoes & Melons':'Fresh',
    'Milk':'Dairy & Breakfast','Bread & Pav':'Dairy & Breakfast','Eggs':'Dairy & Breakfast',
    'Muesli & Granola':'Dairy & Breakfast','Oats':'Dairy & Breakfast',
    'Paneer & Tofu':'Dairy & Breakfast','Curd & Yogurt':'Dairy & Breakfast','Butter & More':'Dairy & Breakfast',
  };

  // Step 1: ensure categories exist
  const catIds = {};
  let order = 40;
  for (const catName of Object.keys(SEED)) {
    const ex = await c.query("SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1", [catName]);
    if (ex.rows.length > 0) {
      catIds[catName] = ex.rows[0].id;
      console.log(`[EXISTS] ${catName} (id=${ex.rows[0].id})`);
    } else {
      const ins = await c.query(
        `INSERT INTO categories (name, is_active, section, section_order, display_order, created_at)
         VALUES ($1, TRUE, $2, 100, $3, CURRENT_TIMESTAMP) RETURNING id`,
        [catName, SECTION_MAP[catName] || 'Fresh', order++]
      );
      catIds[catName] = ins.rows[0].id;
      console.log(`[NEW]    ${catName} (id=${ins.rows[0].id})`);
    }
  }

  // Step 2: insert products
  let inserted = 0, skipped = 0;
  for (const [catName, items] of Object.entries(SEED)) {
    const catId = catIds[catName];
    for (const [name, unit, price, mrp] of items) {
      const chk = await c.query(
        "SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND store_id = $2 LIMIT 1",
        [name, STORE_ID]
      );
      if (chk.rows.length > 0) { skipped++; continue; }

      const { icon, bg } = pickIcon(name);
      const origPrice = mrp && mrp > price ? mrp : null;
      await c.query(
        `INSERT INTO products
         (category_id, name, description, unit, price, original_price,
          image_url, is_active, store_id, approval_status, icon, bg_color)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE, $7, 'approved', $8, $9)`,
        [catId, name, `${name} - fresh & quality assured.`, unit, price, origPrice,
         STORE_ID, icon, bg]
      );
      inserted++;
    }
    console.log(`  -> ${catName}: done`);
  }

  const total = await c.query("SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1", [STORE_ID]);
  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Total products for store 1: ${total.rows[0].n}`);

  await c.end();
})().catch(e => { console.error('SEED FAILED:', e.message); process.exit(1); });
