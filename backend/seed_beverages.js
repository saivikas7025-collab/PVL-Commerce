const { Client } = require('pg');

const RULES = [
  [/red bull|monster|adrenaline|hell energy|sting|fast&up|energy drink|zyro/i, '\u26A1', '#FFF9C4'],
  [/coconut water|tender coco|nariyal/i, '\u{1F965}', '#E8F5E9'],
  [/cold brew|cold coffee|iced latte|frap|cafe|coffee|bru/i, '\u2615', '#F5EAD4'],
  [/kombucha|fermented tea|mossant|bombucha|toyo|umami brew/i, '\u{1F376}', '#FCE4EC'],
  [/ice tea|iced tea|nestea|lipton|chaayos|ice tea premix/i, '\u{1F375}', '#E8F5E9'],
  [/syrup|sharbat|rooh afza|thandai|monin|carmine|hitkary|syruppo|orika|hemade|lemoneez|maple/i, '\u{1F36F}', '#FFF3C4'],
  [/rooh|rose.*sharbat|kesar|khus/i, '\u{1F339}', '#FCE4EC'],
  [/amla|aloe|giloy|triphala|ashwagandha|herbal|ayurved|kapiva|patanjali|krishna|dabur|vansaar|ayuvya|careus|healthfarm|apple cider|sea buckthorn/i, '\u{1F33F}', '#E8F5E9'],
  [/water|bisleri|aquafina|kinley|himalayan|evian|perrier|aava|clear premium|vedica|mineral|alkaline|sparkling|mizuberg|aum premium/i, '\u{1F4A7}', '#E3F2FD'],
  [/ice cube|ice cup|supercube|dras ice|burrf/i, '\u{1F9CA}', '#E1F5FE'],
  [/coca.cola|thums up|pepsi|sprite|7up|fanta|mountain dew|limca|appi fizz|soft drink|cola|nimbooz|soda water|club soda|soda|mixer|ginger ale|tonic water|schweppes|gunsberg|sepoy|lehar|evervess|banta|bombay/i, '\u{1F964}', '#FFF3E0'],
  [/mogu mogu|nata de coco/i, '\u{1F34E}', '#FFEBEE'],
  [/mango|maaza|frooti|slice|alphonso|aam panna|aamras/i, '\u{1F96D}', '#FCEBC9'],
  [/lychee|litchi/i, '\u{1F351}', '#FCE4EC'],
  [/cranberry|berry/i, '\u{1FAD0}', '#FCE4EC'],
  [/orange|mosambi|nagpur/i, '\u{1F34A}', '#FCE8D0'],
  [/pineapple|ananas/i, '\u{1F34D}', '#FFF3E0'],
  [/grape|angoor/i, '\u{1F347}', '#F3E5F5'],
  [/apple/i, '\u{1F34E}', '#FCE4E4'],
  [/mixed fruit|multi fruit/i, '\u{1F379}', '#FCE4EC'],
  [/pomegranate|anaar|pom/i, '\u{1F34E}', '#FCE4E4'],
  [/juice|nectar|activ|real fruit|b natural|tropicana|raw pressery|minute maid|paper boat|pluckk|storia|yuzu|guava|sugarcane|sea buckthorn|wellwith|only earth|malee|givmi/i, '\u{1F9C3}', '#FFE0B2'],
  [/lassi|buttermilk|chaas|tadka|raita|dahi|curd/i, '\u{1F95B}', '#F0F7FF'],
  [/milkshake|smoothie|flavoured milk|smoodh|epigamia turbo|provilac/i, '\u{1F964}', '#FCE4EC'],
  [/yakult|probiotic/i, '\u{1F95B}', '#F0F7FF'],
  [/milk/i, '\u{1F95B}', '#F0F7FF'],   // <- new: plain milk fallback
];

function iconFor(name) {
  for (const r of RULES) if (r[0].test(name)) return { icon: r[1], bg: r[2] };
  return { icon: '\u{1F964}', bg: '#FFF3E0' };
}

const CATS = {
  'Soft Drinks': [
    ['Coca-Cola Soft Drink','750 ml',39,40],['Sprite Lime Flavored Soft Drink','750 ml',39,40],
    ['Coca-Cola Zero Sugar Soft Drink','750 ml',37,40],['Thums Up Soft Drink','750 ml',38,40],
    ["Limca Lemon 'N' Lime Soft Drink",'750 ml',40,0],['Coca-Cola Soft Drink','300 ml',45,50],
    ['Thums Up Soft Drink','300 ml',45,50],['Paper Boat Zero Cranberry Lime Sparkling','600 ml',59,60],
    ['Coca-Cola Soft Drink','2 ltr',92,99],['Lahori Zeera Masala Soda','24 x 160 ml',240,0],
    ['7UP Nimbooz with Lemon Juice','350 ml',25,0],['Paper Boat Zero Lemon Lime Sparkling','600 ml',59,60],
    ['Schweppes Ginger Ale','300 ml',60,0],['Paper Boat Zero Peach Sparkling','600 ml',59,60],
    ['Paper Boat Mango Passion Sparkling','600 ml',59,60],['Pepsi Zero Sugar Soft Drink','300 ml',40,0],
    ['Paper Boat Zero Dark Roast Coffee Sparkling','600 ml',59,60],['Sprite Lime Soft Drink','2 ltr',98,99],
    ['Sprite Lime Soft Drink','300 ml',45,50],['Gunsberg Original Ginger Ale','330 ml',99,0],
    ['Bombay Banta Vanilla Cola','250 ml',38,40],['Paper Boat Zero Yuzu Orange Sparkling','600 ml',60,0],
    ['Thums Up Cola Soft Drink','2 ltr',94,99],['Paper Boat Zero Green Apple Sparkling','600 ml',60,0],
    ['Pepsi Soft Drink','750 ml',40,0],['Mountain Dew Grip Soft Drink','750 ml',40,0],
    ['Zyro Zero Sugar Masala Cola','250 ml',53,60],['Appy Fizz Sparkling Apple','1 ltr',42,60],
    ["Jimmy's Mango Passion Zero Sugar Sparkling",'600 ml',52,60],['Paper Boat Zero Ginger Lemon Sparkling','600 ml',60,0],
  ],
  'Fruit Juice': [
    ['Paper Boat Jamun Zero Added Sugar','200 ml',55,0],['Maaza Mango Drink','600 ml',38,40],
    ['Real Activ Cranberry Juice','1 ltr',145,175],['7UP Nimbooz with Lemon Juice','350 ml',25,0],
    ['Minute Maid Pulpy Orange Fruit Drink','1 ltr',82,90],['Real Fruit-Power Mixed Fruit Juice','10 x 125 ml',95,100],
    ['Raw Pressery Valencia Orange Juice','1 ltr',347,374],['Mogu Mogu Lychee with Nata De Coco','320 ml',73,75],
    ['Raw Pressery Refreshers Pineapple Juice','750 ml',93,140],['Real Fruit Power Mixed Fruit Juice','1 ltr',117,125],
    ['Paper Boat Aamras Mango Drink','215 ml',40,0],['Real Fruit Power Cranberry Juice','1 ltr',129,140],
    ['Real Fruit Power Pineapple Juice','1 ltr',125,135],['Tropicana Orange Delight Juice','1 ltr',120,0],
    ['Raw Pressery Valencia Orange Juice','250 ml',131,140],['Slice Mango Drink','600 ml',38,40],
    ['Raw Pressery Alphonso Mango Drink','200 ml',56,0],['Mogu Mogu Grape with Nata De Coco','320 ml',73,75],
    ['Mogu Mogu Mango Drink','320 ml',73,75],["O'cean Electrolyte Lively Lychee",'500 ml',76,80],
    ['Mogu Mogu Melon with Nata De Coco','320 ml',68,70],['Real Fruit Power Apple Juice','10 x 125 ml',95,100],
    ['Raw Pressery Sugarcane Juice','250 ml',73,80],['Real Fruit Power Masala Mixed Fruit','1 ltr',76,150],
    ['Pluckk Valencia Orange Cold Pressed','250 ml',129,159],['Real Fruit Power Alphonso Mango Nectar','1 ltr',102,200],
    ['Real Fruit Power Litchi Juice','1 ltr',110,120],['Mogu Mogu Strawberry Fruit Drink','320 ml',73,75],
    ['B Natural Mixed Fruit Juice','1 ltr',77,152],['Maaza Mango Drink','1.2 ltr',70,0],
  ],
  'Mango Drinks': [
    ['Frooti Mango Drink Beverage Gift Pack','10 x 150 ml',99,125],['Maaza Mango Drink','600 ml',38,40],
    ['Frooti Refreshing Mango Drink','10 x 150 ml',95,100],['Frooti Mango Drink','600 ml',34,35],
    ['Frooti Mango Drink','2 ltr',80,122],['Paper Boat Aamras Mango Drink','215 ml',40,0],
    ['Slice Mango Drink','600 ml',38,40],['Real Fruit Power Alphonso Mango Nectar','1 ltr',102,200],
    ['Maaza Mango Drink','10 x 125 ml',100,0],['Maaza Mango Drink','1.2 ltr',70,0],
    ['Raw Pressery Aam Panna','750 ml',62,92],['Paper Boat Swing Slurpy Mango Drink','600 ml',40,0],
    ['Paper Boat Nata De Coco Mango Fruit Drink','250 ml',40,0],['Paper Boat Aam Panna Zero Sugar','200 ml',40,0],
    ['Fresca Mango Drink','9 x 200 ml',104,200],['Jade Forest Mango Lush Iced Tea','300 ml',54,65],
    ['Paper Boat Aamras Mango Drink','1 ltr',109,110],['Paper Boat Aamras Mango Drink','600 ml',69,70],
    ['Real Fruit Power Mango Drink Juice','1 ltr',101,110],['Paper Boat Swing Slurpy Mango Drink','1.2 ltr',79,120],
    ['Fresca Mango Drink','1 ltr',41,84],['Tropicana Delight Mango Drink','1 ltr',105,0],
    ['Frooti Mango Drink','150 ml',10,0],
  ],
  'Pure Juices': [
    ['Raw Pressery Valencia Orange Juice','1 ltr',347,374],['Raw Pressery Valencia Orange Juice','250 ml',131,140],
    ['Raw Pressery Alphonso Mango Drink','200 ml',56,0],['Raw Pressery Alphonso Mango Drink','6 x 200 ml',266,336],
    ['Raw Pressery Sugarcane Juice','250 ml',73,80],['Raw Pressery Berry Anti-Inflammatory Juice','250 ml',68,75],
    ['Raw Pressery Vit C-Burst Juice','250 ml',68,75],['Raw Pressery Pomegranate Juice','250 ml',131,140],
    ['Raw Pressery Pomegranate Juice','1 ltr',390,421],['Raw Pressery Mixed Fruit Juice','200 ml',56,0],
    ['Raw Pressery Mixed Fruit Juice','1 ltr',231,234],["Raw Pressery Good Ol' ABC Juice",'250 ml',73,80],
    ['Raw Pressery Classic Lemon Juice with Aloe Vera','200 ml',60,0],['Real Activ Cranberry Juice','1 ltr',145,175],
    ['Real Activ Apple Juice','1 ltr',133,160],['Real Activ Mixed Fruit Juice','1 ltr',144,160],
    ['Real Activ Fibre+ Multi Fruit Juice','1 ltr',133,160],['Real Activ Pomegranate Juice','1 ltr',145,175],
    ['Pluckk Valencia Orange Cold Pressed','250 ml',129,159],['Pluckk Sugarcane Cold Pressed','250 ml',107,109],
    ['Pluckk Pineapple Cold Pressed','250 ml',156,159],['Pluckk Pomegranate Cold Pressed','250 ml',160,199],
    ['Pluckk Cold Pressed Mixed Berries','250 ml',147,149],['Pluckk Guava Cold Pressed','250 ml',107,109],
    ['Pluckk Cold Pressed Aam Panna','250 ml',107,109],['Pluckk Mango Cold Pressed','250 ml',90,109],
    ['Yu Lychee Juice with Chia Seeds','3 x 225 ml',149,225],['Yu Green Apple Juice with Chia Seeds','3 x 225 ml',159,225],
    ['Wellwith Sea Buckthorn Fruit Pulp','300 ml',699,849],['Storia Pomegranate Juice No Added Sugar','750 ml',128,198],
  ],
  'Concentrates & Syrups': [
    ['Hommade Lemoneez Syrup','250 ml',81,85],['Hamdard Rooh Afza Rose Sharbat','750 ml',170,0],
    ["Hershey's Chocolate Syrup",'180 g',99,0],["Abbie's Pure Maple Syrup",'250 ml',975,0],
    ["Hershey's Chocolate Syrup",'600 g',219,235],['Flaveo Lemon Concentrate Juice','250 ml',75,0],
    ['Monin Vanilla Syrup','250 ml',378,0],['Carmine Zero Sugar Vanilla Syrup','330 g',449,499],
    ['Aazol Pure Kokum Agal Extract Syrup','250 ml',245,265],['Chaman Badam Pista Elaichi Thandai Mix','500 g',349,355],
    ["Hershey's Strawberry Syrup",'180 g',94,99],['Monin Caramel Syrup','250 ml',378,0],
    ['Atlantis Nimbu Paani Drink Mix Masala','15 pcs',180,225],['Raj Kesar Badam Thandai Syrup','500 ml',170,220],
    ['Orika Jaljeera Lemonade Drink Mix','10 x 19 g',123,160],['Syruppo Mint Mojito','1 ltr',485,600],
    ['Hitkary Aam Panna Sharbat','700 ml',181,205],['Orika Masala Lemonade Drink Mix','10 x 19 g',118,140],
    ['American Garden Pancake Syrup','355 ml',565,575],['Dabur Orange Glucose Drink Mix','1 kg',287,409],
    ["Hershey's Chocolate Syrup",'1.3 kg',377,430],['Hitkary Orange Frenzy Sharbat','700 ml',181,205],
    ['Good Monk Orange Fruit Drink','165 g',199,250],['Multani Rose Sharbat','750 ml',159,199],
    ['Raj Kesar Elaichi Sharbat','500 ml',170,220],['Syruppo Blue Curacao Mocktail Syrup','1 ltr',485,600],
    ['Syruppo Mint Mojito','200 ml',213,220],['Hitkary Shahi Khus Sharbat','700 ml',172,195],
    ['Orika Kacha Aam & Herbs Lemonade Mix','10 x 19 g',135,160],['Suhana Kesar Milk Masala Drink','20 g',63,81],
  ],
  'Herbal Drinks': [
    ['Sharmayu Amla Juice','1000 ml',201,255],['Honitus Hot Sip Ayurvedic Kaadha','30 pcs',324,360],
    ['Kapiva Thar Aloe Vera Herbal Juice','1 ltr',243,280],['Kapiva Wild Amla Herbal Juice','1 ltr',243,280],
    ["Krishna's High Fibre Fresh Amla Juice",'1 ltr',250,260],['Patanjali Aloe Vera with Fibre Herbal Juice','1 ltr',206,0],
    ['Kapiva Sea Buckthorn Herbal Juice','500 ml',600,699],['Kapiva Liver Care Juice','1 ltr',699,0],
    ['Patanjali Amla Herbal Juice','1 ltr',140,0],['Vahdam Turmeric Ashwagandha Herbal Infusion','18 x 1.8 g',170,200],
    ['Kapiva Cholest Fit Herbal Juice','1 ltr',699,0],['Brooklane Hibiscus Herbal Infusion','50 g',250,0],
    ['Dr. Morepen Himalayan Sea Buckthorn Juice','500 ml',499,799],['Kapiva Tulsi Giloy Herbal Juice','1 ltr',272,375],
    ['Dabur Himalayan Apple Cider Vinegar','500 ml',251,450],['Kapiva Shatavari Balance Herbal Juice','1 ltr',655,0],
    ['Patanjali Giloy Herbal Juice','500 ml',90,0],['Dabur Jamun Neem Karela Health Juice','1 ltr',272,340],
    ['Kapiva Triphala Laxative Herbal Juice','1 ltr',174,279],['Kapiva BP Xpert Juice','1 ltr',899,0],
    ['Wellbeing Nutrition Sea Buckthorn Fruit Pulp','500 ml',899,1199],['Kapiva Artho Sure Juice','1 ltr',899,0],
    ["Krishna's Aloe Amla Juice",'1 ltr',262,0],['Vansaar 45+ Diab Balance Herbal Juice','1 ltr',545,599],
    ['Careus Karela Jamun Ras Herbal Juice','1 ltr',199,260],['Ayuvya Cholesterol Care Health Juice','1 ltr',749,0],
    ['Ayuvya Drop-it Juice for Weight Balance','500 ml',549,799],['Healthfarm Diabiti Kare Herbal Juice','1 ltr',499,515],
    ['WOW Life Science Apple Cider Vinegar','750 ml',599,0],['yourG Buransh Petals Herbal Tea','20 g',299,349],
  ],
  'Energy Drinks': [
    ['Delulu Manifest Mint Mojito Energy Drink','3 x 250 ml',282,297],['Prolyte Liquid ORS Orange','200 ml',32,0],
    ['Red Bull Energy Drink','250 ml',125,0],['Gatorade Blue Bolt Zero Sugar','500 ml',50,0],
    ['Adrenaline Rush Ultimate Focus','300 ml',54,60],['Gatorade Orange Zero Sugar','500 ml',50,0],
    ['Prolyte Nimbu Paani ORS','200 ml',32,0],['Prolyte ORS Orange','21 g',22,0],
    ['Adrenaline Rush Ultimate Performance','300 ml',54,60],['Monster Zero Sugar Ultra Energy','350 ml',125,0],
    ['Gatorade Lemon Zero Sugar','500 ml',50,0],['Red Bull Energy Drink','4 x 250 ml',480,0],
    ["O'cean Crispy Apple Electrolyte Water",'500 ml',76,80],['Fast&Up Reload Lemon Blast','500 ml',62,70],
    ['Hell Energy Classic Energy Drink','250 ml',60,0],['Red Bull Energy Drink Sugar Free','250 ml',125,0],
    ['Prolyte Apple Liquid ORS','200 ml',32,0],["O'cean Peach & Passion Electrolyte Water",'500 ml',76,80],
    ['Red Bull Energy Drink','355 ml',165,0],['Fast&Up Reload Zero Sugar Orange','500 ml',62,70],
    ['Fast&Up Reload Energy & Electrolyte Tabs','20 tabs',250,265],['Zyro Zero Sugar Masala Cola','250 ml',53,60],
    ['Glucon-D Tangy Orange Energy Drink Mix','200 g',99,0],['Enerzal Energy & Electrolyte Drink','75 g',53,0],
    ['Red Bull Pink Edition White Peach','250 ml',125,0],['Sting Energy Drink','250 ml',20,0],
    ["O'cean Mango & Passion Electrolyte Water",'500 ml',76,80],['Wild Vitamin Dragon Fruit Water','400 ml',115,120],
    ['Prolyte Mixed Fruit ORS','200 ml',32,0],['Supply6 Salts Lime Electrolyte Mix','3 pcs',99,0],
  ],
  'Coconut Water': [
    ['Real Activ Coconut Water','6 x 200 ml',180,240],['Storia Tender Concentrate Coconut Water','1 ltr',99,178],
    ['Raw Pressery Coconut Water','6 x 200 ml',335,390],['Real Activ Coconut Water','1 ltr',93,178],
    ['Real Activ Concentrate Coconut Water','1 ltr',91,178],['Yu 1 Ingredient Coconut Water','1 ltr',123,250],
    ['Yu 1 Ingredient Coconut Water','200 ml',46,60],['Paper Boat Swing Tender Coconut Water','1.2 ltr',70,140],
    ['Storia Tender Concentrate Coconut Water No Sugar','6 x 200 ml',225,360],['Raw Pressery Coconut Water','750 ml',163,215],
    ['Real Activ Coconut Water Not from Concentrate','6 x 200 ml',273,330],['Malee Coconut Water','350 ml',100,0],
    ['Storia Tender Concentrate Coconut Water No Sugar','200 ml',40,60],['Paper Boat Coconut Water','200 ml',50,0],
    ['Raw Pressery Coconut Water','200 ml',65,0],['Pluckk Tender Coconut Water','200 ml',52,65],
    ['Hamdard Tender Nariyal Paani','200 ml',39,50],['B Natural Tender Concentrate Coconut Water','750 ml',68,138],
    ['Real Activ Coconut Water Not from Concentrate','200 ml',50,55],['Raw Pressery Aloe Vera Coconut Water','200 ml',62,65],
    ['Storia Tender Concentrate Coconut Water Pack of 30','30 x 200 ml',1083,1800],['Only Earth Tender Coconut Water','750 ml',106,175],
    ['Real Activ Coconut Water','200 ml',40,0],['Plix Tender Coconut Water Premix','30 pcs',513,540],
    ['Pluckk Tender Coconut Water with Real Malai Chunks','200 ml',80,99],['Derm Ease Coconut Water Powder','10 pcs',149,250],
    ['Only Earth Tender Coconut Water','165 ml',42,45],['B Natural Select Tender Coconut Water','6 x 200 ml',221,360],
    ['Yu Coconut Water + Lychee Chia Combo','1 ltr + 3 x 225 ml',247,475],['GIVMI Natural Tender Coconut Water','6 x 200 ml',239,360],
  ],
  'Water & Ice Cubes': [
    ['Ice Cubes by Dras Ice','1 kg',75,0],['Bisleri Packaged Water','10 ltr',130,0],
    ['Bisleri Packaged Water','1 ltr',19,20],['Bisleri Packaged Water','24 x 250 ml',133,144],
    ['Bisleri Packaged Water','5 ltr',80,0],['Burrf Sparkling Supercubes Ice Cubes','16 pcs',85,99],
    ['Aquafina Packaged Water','1 ltr',20,0],['Clear Premium Packaged Water','48 x 200 ml',288,0],
    ['Bisleri Vedica Mineral Water','1 ltr',60,0],['Catch Clear Lemon N Lime Flavoured Water','750 ml',60,0],
    ['Kinley Packaged Water','24 x 250 ml',168,0],['Bisleri Vedica Natural Mountain Mineral Water','24 x 250 ml',289,360],
    ['Perrier Sparkling Water','4 x 330 ml',769,780],['Catch Clear Black Currant Flavoured Water','750 ml',55,0],
    ['Himalayan Natural Mineral Water','24 x 200 ml',369,480],['Dras Ice Ice Cups','2 x 360 g',79,99],
    ['Kinley Packaged Water','1 ltr',20,0],['Clear Drinking Packaged Water','1 ltr',20,0],
    ['Aava Sparkling Water','500 ml',75,100],['Star Signature Premium Sparkling Water','6 x 300 ml',339,360],
    ['Himalayan Sparkling Water','300 ml',109,140],['Perrier Sparkling Water','330 ml',195,0],
    ['Aava Alkaline Natural Mineral Water','24 x 200 ml',289,480],['Mizuberg Alkaline Spring Mineral Water','10 ltr',449,499],
    ['AUM Premium Natural Alkaline Water','20 x 500 ml',800,1400],['Aava Alkaline Natural Mineral Water','4 x 1 ltr',240,520],
    ['Catch Mineral Water','1 ltr',50,0],['Evian Mineral Water','330 ml',90,0],
    ['Evian Natural Mineral Water','1 ltr',229,250],['Perrier Sparkling Water','750 ml',325,0],
  ],
  'Cold Coffee & Ice Tea': [
    ['Toyo Kombucha Ginger Lemon','330 ml',95,0],['Nescafe Cafe Style Iced Latte','170 ml',50,0],
    ['Toyo Kombucha Exotic Peach','330 ml',95,0],['Nestea Ice Tea Premix Lemon','400 g',198,220],
    ['Toyo Kombucha Cranberry','330 ml',95,0],["Amul Kool Cafe Milk 'n' Coffee",'200 ml',35,0],
    ['Toyo Kombucha Strawberry Cream','200 ml',79,0],['Toyo Kombucha Pineapple','330 ml',95,0],
    ['Toyo Kombucha Mango Lime','200 ml',79,0],['Lipton Lemon Iced Tea','240 ml',133,149],
    ['Blue Tokai Classic Bold Cold Brew','250 ml',139,170],['Bombucha Blueberry Lavender Kombucha','300 ml',175,180],
    ['Mossant Craft Cola Kombucha','200 ml',78,130],['Sleepy Owl Black Cold Brew Coffee','230 ml',129,170],
    ['Bombucha Mango Turmeric Kombucha','300 ml',169,180],['Chaayos Instant Lemon Ice Tea Premix','10 pcs',97,106],
    ['Chaayos Instant Peach Ice Tea Premix','10 pcs',99,106],['Sleepy Owl French Vanilla Cold Coffee','230 ml',99,115],
    ['Sleepy Owl Vietnamese Cold Coffee','230 ml',129,150],["Amul Kool Cafe Milk 'n' Coffee",'200 ml',30,0],
    ['Bombucha Apple Spice Kombucha','300 ml',169,180],['Sleepy Owl Belgian Mocha Cold Coffee','230 ml',99,115],
    ['Sleepy Owl Hazelnut Cold Coffee','200 ml',119,140],['Bombucha Smoky Oolong Kombucha','300 ml',169,180],
    ["Guppy Mom's Sugar Free Peach Ice Tea Premix",'200 g',349,460],['Raw Pressery Iced Tea Peach','250 ml',49,53],
    ['Sleepy Owl Classic Cold Coffee','200 ml',119,140],['Umami Brew Kokum Ginger Kombucha','250 ml',149,160],
    ['Avvatar Classic Cold Coffee','250 ml',99,120],['Bru Caramel Cold Coffee','230 ml',102,120],
  ],
  'Soda & Mixers': [
    ['Catch Club Soda Water','750 ml',15,0],['Kinley Strong Soda Water','750 ml',20,0],
    ['Bisleri Soda Water','750 ml',20,0],['Paper Boat Zero Cranberry Lime Sparkling','600 ml',59,60],
    ['Lahori Zeera Masala Soda','24 x 160 ml',240,0],['Paper Boat Zero Mint Mojito Sparkling','600 ml',60,0],
    ['Paper Boat Zero Lemon Lime Sparkling','600 ml',59,60],['Schweppes Ginger Ale','300 ml',60,0],
    ['Paper Boat Zero Peach Sparkling','600 ml',59,60],['Schweppes Indian Tonic Water','300 ml',60,0],
    ['Schweppes Original Soda Water','300 ml',50,0],['Gunsberg Original Ginger Ale','330 ml',99,0],
    ['Perrier Sparkling Water','330 ml',195,0],['Coolberg Cranberry Non-Alcoholic Beer','330 ml',120,0],
    ['Sepoy & Co. Original Ginger Ale','250 ml',99,0],['Lehar Evervess Club Soda Water','750 ml',35,0],
    ["Jimmy's Lime & Lemon Sparkling Drink",'600 ml',52,60],['Catch Clear Cranberry Soda Water','750 ml',60,0],
    ['Raw Pressery POP Citrus Burst Prebiotic Soda','250 ml',89,0],['Monin Mojito Mint Syrup','250 ml',378,0],
  ],
  'Imported Beverages': [
    ['Mogu Mogu Lychee with Nata De Coco','320 ml',73,75],['Perrier Sparkling Water','4 x 330 ml',769,780],
    ['Mogu Mogu Grape with Nata De Coco','320 ml',73,75],['Mogu Mogu Mango Drink','320 ml',73,75],
    ['Mogu Mogu Strawberry Fruit Drink','320 ml',73,75],['Perrier Sparkling Water','330 ml',195,0],
    ['Coca-Cola Cherry Flavoured Soft Drink','300 ml',219,0],['Mogu Mogu Pineapple Fruit Drink','320 ml',73,75],
    ['Perrier Sparkling Water','750 ml',325,0],['Red Bull Cold Brew Coffee Energy Drink','250 ml',149,0],
    ['Evian Natural Mineral Water','500 ml',150,0],['Mogu Mogu Watermelon with Nata De Coco','320 ml',73,75],
    ['Mogu Mogu Orange Fruit Drink','320 ml',73,75],['7UP Zero Sugar Soft Drink','300 ml',209,0],
    ['Ice Talk Blue Lemonade','330 ml',119,0],['Jameson Ginger Ale','330 ml',78,0],
    ['Fanta Fruit Twist Soft Drink','300 ml',209,0],['Fanta Orange Zero Sugar Soft Drink','300 ml',219,0],
    ['Ice Talk Green Grape Ade Soft Drink','330 ml',119,0],["Jacob's Creek Unvined Riesling Non-Alcoholic",'750 ml',844,0],
    ['Pepsi Lime Zero Sugar Soft Drink','300 ml',219,0],['Pepsi Max Mango No Sugar Soft Drink','300 ml',219,0],
    ['Pepsi Max Raspberry No Sugar Soft Drink','300 ml',219,0],['Pepsi Max Cherry No Sugar Soft Drink','300 ml',219,0],
    ['Coca-Cola Vanilla Zero Sugar Soft Drink','300 ml',219,0],['Sprite Lemon-Lime Zero Sugar Soft Drink','300 ml',209,0],
  ],

  // ============================================================
  // NEW CATEGORY — from Blinkit "Lassi, Shakes & More" (cat id 1184)
  // ============================================================
  'Lassi, Shakes & More': [
    ['Sunfeast Mango Smoothie with Chunks','160 ml',36,0],
    ['Amul Lactose Free Milk','250 ml',26,0],
    ['Mother Dairy Probiotic Tadka Salted Buttermilk','270 ml',10,0],
    ['Mother Dairy Probiotic Premium Unsalted Buttermilk','425 ml',21,0],
    ['Sunfeast Berry Smoothie with Chia Seeds','160 ml',36,0],
    ['Amul Masti Spiced Salted Buttermilk','200 ml',15,0],
    ['Yakult Probiotic Drink','5 x 65 ml',90,0],
    ['Amul Masti Spiced Salted Buttermilk','1 ltr',70,0],
    ['Amul Probiotic Tadka Salted Buttermilk','260 ml',10,0],
    ['Yakult Light Probiotic Drink','5 x 65 ml',100,0],
    ['Amul Sweet Lassi','200 ml',20,0],
    ['Mother Dairy Mango Lassi','180 ml',20,0],
    ['Mother Dairy Sweet Lassi','180 ml',20,0],
    ['Amul Sweet Lassi Tetra Pack','250 ml',25,0],
    ['Yakult Light Mango Probiotic Fermented Milk Drink','5 x 65 ml',100,0],
    ['Mother Dairy Spiced Salted Buttermilk','180 ml',15,0],
    ["Amul Kool Cafe Milk 'n' Coffee Flavoured Milk (Can)",'200 ml',35,0],
    ['Amul Kool Kesar Flavoured Milk','180 ml',25,0],
    ['Epigamia Turbo Vanilla-Caramel Protein Milkshake','250 ml',99,0],
    ['FruBon Masala Salted Buttermilk','270 ml',12,0],
    ['Epigamia Turbo Coffee Protein Milkshake','250 ml',99,0],
    ['Smoodh Chocolate Dairy Based Flavoured Milk','150 ml',18,0],
    ['Amul Prolife Probiotic Unsalted Buttermilk','500 ml',30,0],
    ['Mother Dairy Rabri Lassi','180 ml',20,0],
    ['Provilac High Protein Milk','250 ml',94,0],
    ['Country Delight 10g Protein Taaza Pudina Masala Buttermilk','250 ml',45,0],
    ['Mother Dairy Strawberry Lassi','180 ml',20,0],
    ['Smoodh Chocolate Hazelnut Flavoured Milk','150 ml',18,0],
    ['Epigamia Turbo Cookies & Cream Protein Milkshake','250 ml',99,0],
    ['Amul Premium Spiced Salted Buttermilk','200 ml',20,0],
  ],
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const STORE_ID = 1;
  const SECTION = 'Cold Drinks & Juices';

  const ids = {};
  let order = 300;
  for (const catName of Object.keys(CATS)) {
    const ex = await c.query("SELECT id FROM categories WHERE LOWER(name) = LOWER($1)", [catName]);
    if (ex.rows.length) {
      ids[catName] = ex.rows[0].id;
      await c.query(`UPDATE categories SET is_active = TRUE, section = $1, display_order = $2 WHERE id = $3`,
        [SECTION, order++, ex.rows[0].id]);
      console.log(`[EXISTS] ${catName} (id=${ids[catName]})`);
    } else {
      const ins = await c.query(
        `INSERT INTO categories (name, is_active, section, section_order, display_order, created_at)
         VALUES ($1, TRUE, $2, 300, $3, CURRENT_TIMESTAMP) RETURNING id`,
        [catName, SECTION, order++]);
      ids[catName] = ins.rows[0].id;
      console.log(`[NEW]    ${catName} (id=${ids[catName]})`);
    }
  }

  let ins = 0, skip = 0;
  for (const [catName, items] of Object.entries(CATS)) {
    const catId = ids[catName];
    for (const [name, unit, price, mrp] of items) {
      // FIX: dedup must include unit so size variants are preserved
      const chk = await c.query(
        "SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND unit = $2 AND store_id = $3",
        [name, unit, STORE_ID]);
      if (chk.rows.length) { skip++; continue; }
      const { icon, bg } = iconFor(name);
      await c.query(
        `INSERT INTO products (category_id, name, description, unit, price, original_price,
          image_url, is_active, store_id, approval_status, icon, bg_color)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE, $7, 'approved', $8, $9)`,
        [catId, name, `${name} - quality assured.`, unit, price, mrp > price ? mrp : null, STORE_ID, icon, bg]);
      ins++;
    }
    console.log(`  -> ${catName}: done`);
  }

  const total = await c.query("SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1", [STORE_ID]);
  const activeCats = await c.query("SELECT COUNT(*)::int AS n FROM categories WHERE is_active = TRUE");

  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${ins}`);
  console.log(`Skipped:  ${skip}`);
  console.log(`Total products (store 1): ${total.rows[0].n}`);
  console.log(`Active categories:        ${activeCats.rows[0].n}`);

  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
