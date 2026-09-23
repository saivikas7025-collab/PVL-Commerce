const { Client } = require('pg');

const ICON_RULES = [
  // Specific brands / products first
  [/peanut butter|almond butter/i, '\u{1F95C}', '#F5EAD4'],
  [/cheese|mozzarella|cheddar|parmesan|feta|paneer slice/i, '\u{1F9C0}', '#FFFCF0'],
  [/whipping cream|fresh cream|dairy whitener|coffee mate|coffee-mate|cream/i, '\u{1F95B}', '#F0F7FF'],
  [/condensed milk|milkmaid|mithai mate|khoa|rabri/i, '\u{1F36E}', '#FFF8E7'],
  [/vermicelli|seviyan|sevia/i, '\u{1F35C}', '#F5EBDA'],
  [/lassi/i, '\u{1F964}', '#FFF3E0'],
  [/buttermilk|chaas|tadka/i, '\u{1F964}', '#F0F7FF'],
  [/shake|smoothie|milkshake|flavoured milk|smoodh/i, '\u{1F964}', '#FCE4EC'],
  [/honey|chyawanprash|awaleha/i, '\u{1F36F}', '#FFF3C4'],
  [/sausage|salami|ham|bacon|pepperoni|frankfurter/i, '\u{1F953}', '#FCE4E4'],
  [/batter|idli|dosa|chilla/i, '\u{1F963}', '#FFF8E7'],
  [/poha|upma|rava|dhokla|vada|sambhar|uttapam|uttappam|khichdi|breakfast mix/i, '\u{1F35B}', '#FFF3E0'],
  [/pizza base|burger bun|fruit bun|sandwich bread|bread/i, '\u{1F35E}', '#FBEFDC'],
  [/paratha|lachha/i, '\u{1FAD3}', '#FBEFDC'],
  [/oats/i, '\u{1F963}', '#F5EBDA'],
  [/granola|muesli/i, '\u{1F963}', '#F5EBDA'],
  [/quinoa/i, '\u{1F33E}', '#F5EAD4'],
];

function pickIcon(name) {
  for (const r of ICON_RULES) if (r[0].test(name)) return { icon: r[1], bg: r[2] };
  return { icon: '\u{1F6D2}', bg: '#F0F0F0' };
}

const SEED = {
  'Cheese': [
    ['Britannia Laughing Cow Cheese Slices 180g','180 g',116,150],
    ['Amul Cheese Slices','100 g',82,0],
    ['Amul Blend Diced Cheese','200 g',125,0],
    ['Amul Cheese Cubes','200 g',128,135],
    ['Old Hill Parmesan Cheese Block','100 g',340,0],
    ['D\'lecta Natural Feta Cheese Block','100 g',125,0],
    ['D\'lecta Shredded Mozzarella','140 g',96,119],
    ['D\'lecta Processed Cheese Slices','200 g',120,189],
    ['Mother Dairy Cheese Slices','200 g',109,160],
    ['Amul A+ Cheese Slices','200 g',115,170],
    ['Amul Yummy Plain Cheese Spread','200 g',115,0],
    ['D\'lecta Mozzarella Pizza Cheese Block','200 g',120,169],
    ['D\'lecta 100% Cheddar Cheese Block','200 g',199,0],
    ['Amul Spicy Garlic Cheese Spread','200 g',115,0],
    ['D\'lecta 100% Cheddar Cheese Slices','200 g',209,219],
    ['D\'lecta Cream Cheese','150 g',189,0],
    ['Go Cheese Slices','200 g',110,160],
    ['Britannia Laughing Cow Cheese Slices 400g','400 g',240,480],
    ['Go Cheese Four Shredded Cheese','200 g',135,180],
    ['Mooz Feta Greek Cheese Block','100 g',125,159],
    ['Old Hill Red Cheddar Cheese Block','200 g',425,0],
    ['Go Cheese Pizza Mozzarella & Cheddar','200 g',119,159],
    ['Amul Cheese Block','200 g',129,0],
    ['Amul Cream Cheese','180 g',125,0],
    ['Amul Pizza Mozzarella Diced','1 kg',550,0],
    ['Britannia Laughing Cow Cheese Cubes','200 g',116,145],
    ['D\'lecta Chilli Cheese Slices','200 g',129,179],
    ['Britannia Laughing Cow Cheese Block Mozzarella','200 g',140,150],
    ['Britannia Laughing Cow Cheese Slices 90g','90 g',75,85],
    ['Britannia Laughing Cow Mozzarella Cheddar Pizza Diced','200 g',110,140],
  ],
  'Cream & Whitener': [
    ['Nestle Everyday Dairy Whitener','400 g',255,0],
    ['Milky Mist Fresh Cream','250 ml',75,100],
    ['Amul Whipping Cream','250 ml',100,0],
    ['Mother Dairy Dairy Whitener','500 g',269,270],
    ['D\'lecta Whip Whipping Cream','1 kg',230,249],
    ['Amulya Dairy Whitener','500 g',255,0],
    ['Nestle Everyday Dairy Whitener','1 kg',625,0],
    ['Puramio Whipping Cream Powder','250 g',299,400],
    ['Nestle Coffee-mate French Vanilla','425.2 g',829,0],
    ['Nestle Coffee Mate Coffee Creamer','400 g',475,0],
    ['Mother Dairy Low Fat Fresh Cream','200 ml',63,65],
    ['Amul Fresh Cream','250 ml',75,0],
    ['D\'lecta Dairy Fresh Cream 25%','200 ml',69,0],
    ['Amul Whole Milk Powder','500 g',500,0],
    ['Param Premium Swad Bhi Sehat Bhi Dairy Whitener','1 kg',499,699],
  ],
  'Condensed Milk': [
    ['Amul Sweetened Condensed Milk Classic','210 g',75,80],
    ['Nestle Milkmaid Mini Sweetened','190 g',79,84],
    ['Nestle Milkmaid Partly Skimmed Sweetened','380 g',140,149],
    ['Amul Khoa','200 g',95,0],
    ['Amul Mithai Mate Condensed Milk','400 g',130,0],
    ['Amul Sweetened Condensed Milk Gold','405 g',145,0],
    ['Milky Mist Sweetened Condensed Milk','200 g',65,75],
    ['Amul Mithai Mate Condensed Milk','200 g',68,0],
  ],
  'Vermicelli': [
    ['Bambino Roasted Vermicelli Seviyan','850 g',135,140],
    ['Bambino 100% Suji No Maida Roasted Vermicelli','425 g',76,0],
    ['Bambino Regular Vermicelli','425 g',65,0],
    ['MTR Roasted Vermicelli','400 g',61,67],
    ['Tata Sampann Roasted Vermicelli No Added Maida','850 g',119,125],
    ['Bambino 100% Suji No Maida Regular Vermicelli','850 g',105,110],
    ['MTR Seviyan Regular Vermicelli','850 g',81,95],
    ['Bambino Roasted Vermicelli','600 g',107,110],
    ['Yu Whole Wheat Roasted Vermicelli','400 g',69,120],
    ['Tata Sampann Unroasted Vermicelli','850 g',91,95],
    ['Prolicious Millet Vermicelli','400 g',320,0],
    ['Bambino Khapli Wheat Vermicelli','400 g',81,85],
    ['Real Thai Rice Vermicelli','375 g',270,0],
    ['Tata Sampann Roasted Vermicelli','450 g',64,65],
    ['MTR Rice Regular Vermicelli','400 g',65,0],
    ['Two Brothers Vermicelli','150 g',249,0],
    ['Hamdard Khaalis Roasted Vermicelli','150 g',25,0],
  ],
  'Peanut Butter': [
    ['Sundrop Chocolate Crunchy Peanut Butter','500 g',149,199],
    ['The Whole Truth Sweetened Crunchy Peanut Spread','325 g',214,235],
    ['The Whole Truth Crunchy Unsweetened Peanut Butter','325 g',194,210],
    ['MyFitness High Protein Chocolate Crunchy Peanut Butter','510 g',281,319],
    ['Sundrop Crunchy Peanut Butter with Jaggery','900 g',199,225],
    ['Pintola All Natural Crunchy Peanut Butter Unsweetened','350 g',156,170],
    ['Pintola Dark Chocolate Crunchy Peanut Butter','350 g',168,180],
    ['Pintola All Natural Creamy Peanut Butter Unsweetened','350 g',156,170],
    ['MyFitness High Protein Chocolate Crunchy','227 g',148,159],
    ['MyFitness Chocolate Crunchy Peanut Butter','900 g',440,499],
    ['Dr. Oetker FunFoods Crunchy Peanut Butter','750 g',189,199],
    ['Jus\'Amazin Creamy Unsweetened Almond Butter','200 g',399,420],
    ['MyFitness High Protein Chocolate Peanut Smooth','510 g',281,319],
    ['MyFitness All Natural Peanut Butter Crunchy','510 g',281,319],
    ['Pintola Dark Chocolate Creamy Peanut Butter High Protein','510 g',349,375],
    ['Pintola Dark Chocolate Creamy Peanut Butter','350 g',168,180],
    ['Pintola High Protein Dark Chocolate Crunchy','510 g',349,375],
    ['Skippy Super Chunk Crunchy Peanut Butter','462 g',566,575],
    ['Sundrop Creamy Peanut Butter','462 g',144,149],
    ['Pintola High Protein Jaggery Crunchy Peanut Butter','510 g',349,375],
    ['Sundrop Peanut Butter with Grape Jelly','340 g',125,150],
    ['Kissan Crunchy Peanut Butter','350 g',150,175],
    ['Disano Chocolate Crunchy Peanut Butter','350 g',79,250],
    ['Pintola Classic Crunchy Peanut Butter','500 g',200,215],
    ['The Whole Truth Unsweetened Crunchy Peanut Butter','925 g',504,560],
    ['Sundrop Crunchy Peanut Butter with Honey','300 g',99,0],
    ['Amul Creamy Spread Peanut Butter','300 g',100,110],
    ['BeastLife Nuttin Crunchy Peanut Butter','350 g',210,233],
    ['Disano Crunchy Peanut Butter Chocolate','924 g',275,550],
  ],
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
    ['Yakult Light Mango Probiotic','5 x 65 ml',100,0],
    ['Amul Kool Cafe Milk n Coffee','200 ml',35,0],
    ['Amul Kool Kesar Flavoured Milk','180 ml',25,0],
    ['Epigamia Turbo Vanilla-Caramel Protein Milkshake','250 ml',99,0],
    ['FruBon Masala Salted Buttermilk','270 ml',12,0],
    ['Epigamia Turbo Coffee Protein Milkshake','250 ml',99,0],
    ['Smoodh Chocolate Dairy Flavoured Milk','150 ml',18,0],
    ['Amul Prolife Probiotic Unsalted Buttermilk','500 ml',30,0],
    ['Mother Dairy Rabri Lassi','180 ml',20,0],
    ['Country Delight Pudina Masala Buttermilk','250 ml',45,0],
    ['Mother Dairy Strawberry Lassi','180 ml',20,0],
    ['Smoodh Chocolate Hazelnut Flavoured Milk','150 ml',18,0],
    ['Epigamia Turbo Cookies & Cream Milkshake','250 ml',99,0],
    ['Amul Premium Spiced Salted Buttermilk','200 ml',20,0],
  ],
  'Breakfast Mixes': [
    ['English Oven Fruit Bun','1 pc',20,0],
    ['English Oven Burger Bun','1 pc',40,0],
    ['English Oven Pizza Base','1 pc',50,0],
    ['iD Wheat Lachha Paratha','5 pcs',115,0],
    ['MTR Rava Idli Breakfast Mix','500 g',123,0],
    ['MTR 3 Minute Poha Breakfast Mix','160 g',27,0],
    ['Amul Butter Sandwich Bread','400 g',47,0],
    ['MTR Masala Rava Idli Breakfast Mix','500 g',125,0],
    ['MTR Rice Idli Breakfast Mix','500 g',130,0],
    ['MTR 3 Minute Veggie Upma Mix','160 g',27,0],
    ['MTR Dosa Breakfast Mix','500 g',126,0],
    ['MTR Upma Breakfast Mix','500 g',54,0],
    ['Amul Butter Whole Wheat Bread','400 g',60,0],
    ['MTR 3 Minute Khatta Meetha Poha','160 g',27,0],
    ['MTR Uttappam Breakfast Mix','500 g',142,0],
    ['True Elements Wholegrain Premium Quinoa','500 g',172,0],
    ['Gladful Multi Lentil Spinach Chilla Mix','200 g',134,0],
    ['Gits Khaman Dhokla Instant Mix','200 g',59,0],
    ['Bagrry\'s Belgian Dark Chocolate Granola','400 g',308,0],
    ['MTR 3 Minute Upma Mix Pack of 5','5 x 160 g',120,0],
    ['MTR Sambhar Instant Mix','200 g',98,0],
    ['Gladful Moong Beetroot Chilla Mix','200 g',135,0],
    ['MTR Masala Upma Breakfast Mix','500 g',82,0],
    ['MTR Vermicelli Upma','500 g',56,0],
    ['MTR Vada Breakfast Mix','500 g',205,0],
    ['Gits Dahi Vada Instant Mix','200 g',98,0],
    ['Tata Soulfull Mast Masala Oats','500 g',185,0],
    ['Tata Soulfull Desi Veggie Masala Oats','500 g',185,0],
    ['Gits Rice Idli Breakfast Mix','500 g',120,0],
  ],
  'Honey & Chyawanprash': [
    ['Apis Multifloral Honey Squeezy','400 g',99,210],
    ['Dabur Honey Squeezy','2 x 225 g',169,249],
    ['Honey Twigs Himalayan Honey','240 g',186,200],
    ['Dabur Honey No Sugar Adulteration','250 g',119,125],
    ['Nature\'s Nectar Squeezy Honey','325 g',332,525],
    ['Organic India Saffron Organic Honey','125 g',158,175],
    ['Saffola Sundarbans Forest Honey Active','350 g',131,180],
    ['Conscious Food Himalayan Multiflora Honey','200 g',234,290],
    ['Nature\'s Nectar Pure Honey Squeezy','250 g',120,185],
    ['Indigenous Honey Raw Organic Honey','500 g',679,700],
    ['Saffola Active Honey','100 g',70,0],
    ['Saffola Pure Honey Active Pack of 2','2 x 350 g',241,475],
    ['House of Veda Wild Forest Honey','250 ml',195,210],
    ['Organic India Ashwagandha Organic Honey','125 g',158,175],
    ['Eatopia Multifloral Nectar Farmer Honey','500 g',329,440],
    ['Honey Twigs Lemon Infused Honey','30 pcs',274,325],
    ['Multani Honey','500 g',169,250],
    ['Apis Multifloral Honey','1 kg',219,450],
    ['Barosi Multi Floral Honey','500 g',470,499],
    ['Nature\'s Nectar Organic Honey','400 g',399,575],
    ['Daichi Raw Forest Honey','350 g',349,449],
    ['Cropicon Ginger Honey Sticks','30 x 8 g',399,599],
    ['Earthen Story Wild Forest Certified Honey','250 g',270,275],
    ['Patanjali Honey','500 g',179,210],
    ['Pro Nature Organic Honey','500 g',360,399],
    ['Country Delight Wild Forest Honey','475 g',349,480],
    ['Dabur Chyawanprash Awaleha','500 g',234,260],
    ['Dadev Forest NMR Tested Unprocessed Honey','250 g',245,259],
    ['Organic Nation Wild Forest Organic Honey','325 g',219,299],
    ['Apibee Natural Farm Honey BOGO','2 x 250 g',189,220],
  ],
  'Sausage, Salami & Ham': [
    ['Carnivore Masala Chicken Sausage','250 g',167,220],
    ['Prasuma Chicken Sausage','250 g',172,200],
    ['Prasuma Chilli Chicken Salami','200 g',189,205],
    ['Prasuma Pepper & Herb Chicken Sausage','250 g',164,205],
    ['Carnivore Spicy Chicken Salami Frozen','250 g',185,220],
    ['Godrej Yummiez Breakfast Chicken Sausage','250 g',159,180],
    ['Prasuma Chicken Ham','200 g',205,220],
    ['Prasuma Breakfast Pork Bacon','300 g',399,420],
    ['Carnivore Plain Sliced Chicken Salami','250 g',185,220],
    ['Prasuma Chicken Salami','200 g',170,200],
    ['Godrej Yummiez Pepper & Herb Chicken Sausage','250 g',170,190],
    ['Prasuma Pork Bacon Small Pack','150 g',216,240],
    ['Carnivore Black Pepper Chicken Salami','250 g',160,190],
    ['Meatzza Jumbo Chicken Sausage','250 g',198,210],
    ['La Carne Bell Pepper Chicken Salami','250 g',172,185],
    ['Prasuma Smoked Pork Ham','200 g',270,295],
    ['Godrej Yummiez Breakfast Chicken Salami','250 g',159,180],
    ['Prasuma English Breakfast Chicken Sausage','1 kg',381,660],
    ['Prasuma Pepperoni Pork Salami','100 g',189,210],
    ['Godrej Yummiez Pepper & Herb Chicken Salami','250 g',179,190],
    ['Meatzza Sliced Chicken Ham','250 g',189,210],
    ['Pork Passion Smoked Pork Sausage','200 g',220,228],
    ['Sardar Chicken Sausage Frankfurter','250 g',203,220],
    ['Prasuma Pork Sausage','250 g',238,270],
    ['Godrej Yummiez Cheese & Onion Chicken Sausage','250 g',199,210],
    ['Prasuma Cheese & Onion Chicken Sausage','250 g',199,225],
    ['Godrej Yummiez Cheese Cocktail Chicken Sausage','400 g',230,260],
    ['Pork Passion Spicy Smoky Pepperoni Pork Salami','200 g',274,292],
    ['La Carne Breakfast Chicken Sausage','500 g',306,340],
  ],
  'Batter': [
    ['iD Idli & Dosa Batter','500 g',72,0],
    ['Amma\'s Special Dosa Idli Batter','1 kg',99,0],
    ['iD Idli & Dosa Batter','1 kg',130,0],
    ['Amma\'s Special Idli Dosa Batter','500 g',55,0],
    ['Rishta Fresh Tasty Idli Dosa Batter','1 kg',130,135],
    ['Rishta Multigrain Speciality Idli Dosa Batter','800 g',135,0],
    ['Khetika Ragi Idli Dosa Batter','500 g',42,79],
    ['Khetika Fresh Idli Dosa Batter','1 kg',99,109],
    ['Gladful Ragi Dosa Mix','200 g',90,99],
    ['Simmply Classic Idli Dosa Batter','1 kg',86,100],
    ['Slurrp Farm Beetroot Dosa Mix','150 g',119,0],
    ['Curryit Amma Style Tomato Rasam Masala Paste','60 g',69,79],
    ['Gits Dosa Breakfast Mix','500 g',120,132],
    ['Double Horse Easy Palappam Instant Mix','500 g',69,0],
    ['iD Ragi Millet Idly Dosa Batter','500 g',62,68],
    ['iD Idli & Dosa Batter Pack of 2','2 kg',164,190],
    ['Country Delight Idli Dosa Batter','450 g',39,61],
    ['iD Protein-Rich Idli Dosa Batter','500 g',93,0],
    ['Rishta Idli Dosa Batter','600 g',69,79],
    ['iD Moong Chilla Batter','500 g',65,79],
    ['iD High Fibre Brown Rice Oats Dosa Batter','500 g',90,0],
    ['Organic Tattva Ragi Dosa Mix','200 g',59,60],
    ['Safal Fresh Idli Dosa Batter Stone Grounded','500 g',65,0],
    ['The Naturik Co Multigrain Chilla Mix','250 g',159,199],
    ['The Naturik Co High Protein Ragi Chilla Mix','250 g',155,199],
    ['Gits Rava Idli Breakfast Mix','500 g',121,128],
  ],
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const STORE_ID = 1;
  const SECTION_MAP = {
    'Cheese':'Dairy & Breakfast','Cream & Whitener':'Dairy & Breakfast',
    'Condensed Milk':'Dairy & Breakfast','Vermicelli':'Dairy & Breakfast',
    'Peanut Butter':'Dairy & Breakfast','Lassi, Shakes & More':'Dairy & Breakfast',
    'Breakfast Mixes':'Dairy & Breakfast','Honey & Chyawanprash':'Dairy & Breakfast',
    'Sausage, Salami & Ham':'Dairy & Breakfast','Batter':'Dairy & Breakfast',
  };

  const catIds = {};
  let order = 100;
  for (const catName of Object.keys(SEED)) {
    const ex = await c.query("SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1", [catName]);
    if (ex.rows.length > 0) {
      catIds[catName] = ex.rows[0].id;
      console.log(`[EXISTS] ${catName} (id=${ex.rows[0].id})`);
    } else {
      const ins = await c.query(
        `INSERT INTO categories (name, is_active, section, section_order, display_order, created_at)
         VALUES ($1, TRUE, $2, 100, $3, CURRENT_TIMESTAMP) RETURNING id`,
        [catName, SECTION_MAP[catName], order++]
      );
      catIds[catName] = ins.rows[0].id;
      console.log(`[NEW]    ${catName} (id=${ins.rows[0].id})`);
    }
  }

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
        [catId, name, `${name} - quality assured.`, unit, price, origPrice, STORE_ID, icon, bg]
      );
      inserted++;
    }
    console.log(`  -> ${catName}: done`);
  }

  const total = await c.query("SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1", [STORE_ID]);
  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Total products for store 1: ${total.rows[0].n}`);

  await c.end();
})().catch(e => { console.error('SEED FAILED:', e.message); process.exit(1); });
