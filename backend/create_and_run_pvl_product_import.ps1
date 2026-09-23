$ErrorActionPreference = 'Stop'
$backend = 'D:\PVL-Commerce\Emergent_Build\pvl_commerce_v2\backend'
$js = Join-Path $backend 'import_pvl_products.js'

@'
require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const products = [
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Lettuce"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Chilli (Mirapakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Onion (Ulligadda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Potato (Bangala Dumpa)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Coriander Bunch (Kottimeera)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Orange Carrot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Desi Tomato"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lemon (Nimakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Cucumber (Keera Dosakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Mint Leaves (Pudina)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Coriander Without Roots (Kottimeera)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Button Mushroom (Puttagodugu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Capsicum (Bangalore Mirapakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "French Beans - 250 g"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Bottle Gourd (Sorakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Cauliflower"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "English Cucumber (Keera Dosakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Tomato (Desi) (Tamata)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lady Finger (Bendakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Beetroot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Ivy Gourd (Dondakaaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Garlic (Velluli)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Cabbage"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Ginger (Allam)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Broccoli"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Long Purple Brinjal (Vankaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Drumstick (Munakkada)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Amla (Usirikaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Cluster Beans (Goru Chikkudu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "American Sweet Corn Cob (Mokkajonna)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sweet Potato (Chilakada Dumpa)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Broad Beans Local (Chikudukayalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Peeled Garlic (Velluli)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Ridge Gourd (Beerakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Spring Onion (Ulli Kada)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Drumstick Leaves (Moringa Leaves)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Hybrid Tomato"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Garlic (Velluli)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Chilli (Mirapakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Bitter Gourd (Kakarakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Green Cucumber (Dosakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Lady Finger (Bendakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Arvi (Chamadumpalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Amaranthus Leaves (Tandulsa) (Thotakura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Onion (Uliigadda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Varikatri Brinjal (Vankaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sweet Corn Packet (Mokkajonna Ginjalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Kadi Patta Curry Leaves (Karivepaku)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Fenugreek (Mentikura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Ridge Gourd"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Assorted Capsicum (Red, Yellow, Green)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Radish (Mullangi)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Lemon (Nimakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Pulao Mix"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sorrel (Chukka Kura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Red Amaranthus Leaves Without Roots (Thotakura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Ivy Gourd (Dondakaaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sambhar Veggie Mix - Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Ash Gourd (Budida Gummadikaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Bitter Gourd (Kakarakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Bottle Gourd (Sorakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Groundnuts"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sambar Onion Peeled (Ulligadda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Iceberg Lettuce"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Malabar Spinach (Bachalakura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Cabbage"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Tomato (Hybrid)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sambhar Onion (Sambhar Ulligadda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Grey Oyster Mushroom"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Mango Ginger"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Neem Leaves (Vepa Aakulu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lady Finger Diced (Bendakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Snake Gourd (Potlakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Colocasia (Chamadumpalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Sambhar Onion"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Yellow Bell Pepper (Bangalore Mirapakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Carrot - Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Cherry Tomatoes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Cauliflower"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "White Onion (Tella Ulligadda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Zucchini"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Green Capsicum"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Banana Stem (Davva)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown English Cucumber (Dosakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Chinese Fried Rice/Noodles Veggie Mix"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Drumstick"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Ponnagani Leaves (Ponnaganti Aakulu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Cluster Beans"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Sponge Gourd"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Raw Papaya"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Chow Chow"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lettuce Mix"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Yellow Zucchini"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Bok Choy"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lemon - Imported"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Giloy Stick (Tippateega)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Colocasia Stem (Chama Kadda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Italian Basil Leaves (Basil Aakulu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Curry Leaves (Karivepaku)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Ginger (Allam)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Spinach (Palakura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Small-Purple Brinjal (Gutti Vankaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Brinjal (Vankaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Raw Banana (Aratikaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Cowpea Beans (Bobbarlu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Drumstick Cut (Munakkada)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Baby Corn Packet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Picador Chilli (Bajji Mirchi)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Yellow Round Cucumber (Dosakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Brinjal - Bharta (Vankaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Mixed Sprouts (Molakalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Pumpkin Yellow Cut (Gummadikaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Madras/Sambar Cucumber (Kura Dosakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Pointed Gourd (Potols)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Gongura Leaves (Gongura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Baby Potato (Chinna Bangala Dumpa)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Fresh Rosemary"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Red Bell Pepper (Bangalore Mirapakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Raw Papaya (Pacchi Boppayi Pandu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Baby Spinach (Palakura)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Soaked Chole (Nanapettina Chole)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "French Beans Cut (Chikudukayalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Beetroot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Green Moong Sprouts (Molakalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown American Corn Cob"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Mint Leaves (Pudina)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Dill Leaves (Shepu) (Soyakoora)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Sweet Potato (Chilakada Dumpa)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Ring Beans (Chikudukayalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Brown Chana Sprouts (Molakalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Potato (Bangala Dumpa)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Knol Khol"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Raw Banana (Aratikaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Sweet Pumpkin by Bhoomi Farms"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Matki Sprouts (Molakalu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Broccoli Florets"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Cauliflower Florets"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Shami Patra for Pooja (Banni Leaves)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Ash Gourd 250 g Portion"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Sambhar Cucumber"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Sweet Diced Pumpkin by Bhoomi Farms"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Raw Turmeric (Pasupu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Nagpur Brinjal"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Red Cabbage"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Totapuri Raw Mango (Mamidipandu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Snake Gourd"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Spine Gourd (Aakakarakaya)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Coriander Without Roots"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Papaya Leaves (Boppayi Pandu Akulu)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lemon - Gondhoraj"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Raw Mango"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Thai Guava"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Broad Beans"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Thai Bird Eye Chilli - Red"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Lemongrass (Nimmagaddi)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Neem Sticks"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Ash Gourd Portion"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Vegetables",
    "name": "Organically Grown Knol Khol"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Banana"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Baby Banana"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Tender Coconut (Nariyal)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Avocado Hass - Tanzania"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Yellaki Banana"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Brown Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Blueberry - Imported"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pomegranate - 2 pieces"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Papaya (Papita)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Avocado Hass (Tanzania)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Washington Red Delicious Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Brown Coconut Chunks"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Red-Globe Grapes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Green Kiwi"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Mini Orange (Imported)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Thai Guava (Amrud)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Daily Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Peeled Pomegranate - Snack Pack"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pomegranate - 1 piece"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Valencia Navel Orange"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Dragon Fruit"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pink Lady Apple - USA"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Red Diamond Guava"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pear Bartlett (Babugosha)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Sweet Lime (Mosambi)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Dragon Fruit - Red Flesh"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pineapple Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pineapple - Peeled"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Red Delicious Apple - Imported"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Everyday Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Indian Royal Gala Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Mr. Apple New Zealand Royal Gala"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Valencia Navel Orange (Imported)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Custard Apple (Semi-Ripe) (Sitaphal)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Royal Gala Apple - Imported"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Gala Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown American Corn Cob"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Plum Imported"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Brown Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Granny Smith Apple - USA"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Papaya"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Pomegranate"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pineapple (Ananas)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Sweet Lime"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Sugarcane Cubes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Premium Shimla Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Sun Melon (Sarda)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Guava Cut (Amrud)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Pineapple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically-Grown Muskmelon"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Wood Apple for Pooja Raw"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Grated Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Shimla Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Kashmiri Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Thai Pink Guava"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Kiran Watermelon"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Chaunsa Mango"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Assorted Fruits for Pooja (Panch Phal)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Shine Muscat Green Grapes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pear Nashpati"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Shimla Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pear Beauty - South Africa"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Red Delicious Apple - Italy/New Zealand"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Raw Mango"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Indian Guava"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Packham Pear - South Africa"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pear Nakh"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Sapota (Chikoo)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Bobby Muskmelon"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Dragon Fruit - Red Flesh"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Royal Gala Apple Italy/Poland"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Crimson Red Seedless Grapes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Organically Grown Kiran Watermelon"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Indian Tangerine Orange"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Mini Apple - Kashmir by Yummee"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Indian Orange"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Indian Plum"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Papaya Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Plucked Shine Muscat Grapes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Kinnaur Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Kashmir Delicious Apple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Pomegranate Peeled"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Fruits",
    "name": "Kinnaur Apple (Seb)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Mangoes & Melons",
    "name": "Chaunsa Mango"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Mangoes & Melons",
    "name": "Raw Mango"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Mangoes & Melons",
    "name": "Sun Melon"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Mangoes & Melons",
    "name": "Bobby Muskmelon"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Brown Coconut Chunks"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Peeled Garlic"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Peeled Pomegranate Snack Pack"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Sweet Corn Packet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Pineapple Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Pineapple Peeled"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Mixed Sprouts"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Green Moong Sprouts"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Broccoli Florets"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Brown Chana Sprouts"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Pulao Veggie Mix"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Sugarcane Cubes"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Cauliflower Florets"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Delight Fruit Chaat Box"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Guava Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Organically Grown Pineapple"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Peeled Onion"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Grated Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Raw Papaya Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Coriander Without Roots"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Portion Pumpkin"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Premium Mint Leaves Without Roots"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Pumpkin Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Jackfruit Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Green Peas Peeled"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Spinach Without Roots"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Unpeeled Garlic Cloves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Peeled Green Peas"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Wellness Fruit Chaat Box"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Papaya Cut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Freshly Cut & Sprouts",
    "name": "Pomegranate Peeled"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Safal Frozen Green Peas 500 g"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Safal Frozen Green Peas 1 kg"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Safal Sweet Corn Frozen"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "SPT Frozen Green Peas 500 g"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Wow! Coco Fresh Grated Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "SPT Frozen Green Peas 1 kg"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Safal Frozen Mixed Vegetables"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Delishh Strawberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Pluckk Frozen Blueberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Safal Frozen Sweet Corn 1 kg"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Delishh Frozen Fresh Mix Berries"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "SPT American Frozen Sweet Corn 500 g"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Pluckk Frozen Grated Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "SPT Frozen Mixed Vegetables"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Delishh Frozen Blueberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Pluckk Frozen Mixed Berries"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Pluckk Frozen Strawberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Gadre Edamame Frozen"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "SPT American Frozen Sweet Corn 1 kg"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "SPT Frozen Grated Coconut"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Delishh Frozen Raspberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Pluckk Frozen Raspberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Delishh Frozen Mulberry"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Frozen Veg",
    "name": "Abbie's Shiitake Raw Mushroom"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Green Lettuce"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Coriander Bunch"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Mint Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Betel Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Spring Onion"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Green Amaranthus Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Organically Grown Kadi Patta Curry Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Fenugreek"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Sorrel"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Red Amaranthus Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Iceberg Lettuce"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Malabar Spinach"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Neem Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Ponnagani Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Lettuce Mix"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Bok Choy"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Giloy Stick"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Curry Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Spinach"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Banana Leaf"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Holy Tulsi"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Gongura Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Fresh Rosemary"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Baby Spinach"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Organically Grown Mint Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Dill Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Organically Grown Coriander"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Papaya Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Lemongrass"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Leafies & Herbs",
    "name": "Neem Sticks"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Betel Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura 3 Red Roses Bouquet In Premium Paper"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura Red Rose Single Flower in Red Paper"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FNP Joyful Red Rose Single Flower"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Mango Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura 3 Purple Orchids in Pink Non Woven Paper Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura 10 Pink Roses Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FNP 5 Mixed Roses Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura 2 White Orchids Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FNP 10 Pink Paradise On Earth Carnations Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FNP Infinite Love Large Bouquet of 15 Red Roses"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura 5 Pink Carnations Mini Bouquet in Jute Wrap"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FNP 10 Romantic Red Roses Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura Blue Vanda Orchid Jute Large Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Peace Lily Plant with Ibiza Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Jade Plant with Ibiza Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FNP Sunflower Delight Mini Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura Red Rose Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Rooted Jade Plant with Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "FlowerAura 8 White Carnations Bouquet"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Philodendron Birkin Plant with White Ibiza Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Neem Leaves"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Shami Patra for Pooja (Banni Leaves)"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Areca Palm Plant with Self Watering Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Peace Lily Plant In Self Watering Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Rooted Money Plant with Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Jade Plant In Self Watering Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Ugaoo Golden Money Plant In Self Watering Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Nurturing Green Green Indoor Palm Plant"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Flowers & Leaves",
    "name": "Nurturing Green Money Plant Njoy in Premium Pot"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Hydroponic",
    "name": "Hydroponic Sweet Bell Pepper Cocktail"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Hydroponic",
    "name": "Snacking Seedless Cucumber Hydroponically Grown"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Juice & Dips",
    "name": "Krishi Cress Basil Pesto"
  },
  {
    "main": "Vegetables & Fruits",
    "subcategory": "Fresh Juice & Dips",
    "name": "Fresh Avocado Guacamole by Avoculture"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Coca-Cola Soft Drink 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Sprite Lime Flavored Soft Drink 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Coca-Cola Zero Sugar Soft Drink 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Thums Up Soft Drink 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Limca Lemon 'N' Lime Soft Drink 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Coca-Cola Soft Drink 300 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Thums Up Soft Drink 300 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Cranberry Lime Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Coca-Cola Soft Drink 2 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Lahori Zeera Masala Soda"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "7UP Nimbooz with Lemon Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Sugar Lemon Lime Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Schweppes Ginger Ale"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Sugar Peach Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Mango Passion Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Pepsi Zero Sugar Soft Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Dark Roast Coffee Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Sprite Lime Soft Drink 2 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Sprite Lime Soft Drink 300 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Gunsberg Original Ginger Ale"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Bombay Banta Diets & Lights Vanilla Cola"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Sugar Yuzu Orange Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Thums Up Cola Soft Drink 2 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Sugar Green Apple Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Pepsi Soft Drink 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Mountain Dew Grip Soft Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Zyro by Karan Aujla Zero Sugar Masala Cola"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Appy Fizz Sparkling Drink Apple"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Jimmy's Mango Passion Zero Sugar Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soft Drinks",
    "name": "Paper Boat Zero Sugar Ginger Lemon Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Paper Boat Jamun Fruit Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Maaza Mango Drink 600 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Activ Cranberry Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "7UP Nimbooz with Lemon Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Minute Maid Pulpy Orange Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit-Power Mixed Fruit Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Raw Pressery Valencia Orange Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Mogu Mogu Lychee Fruit Drink with Nata De Coco"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Raw Pressery Refreshers Pineapple Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Mixed Fruit Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Paper Boat Aamras Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Cranberry Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Pineapple Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Tropicana Orange Delight Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Raw Pressery Valencia-Orange Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Slice Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Raw Pressery Alphonso Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Mogu Mogu Grape Fruit Drink with Nata De Coco"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Mogu Mogu Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "O'cean Electrolyte Flavoured Water Lively Lychee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Mogu Mogu Melon Fruit Drink with Nata De Coco"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Apple Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Raw Pressery Sugarcane Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Masala Mixed Fruit Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Pluckk Valencia Orange Cold Pressed Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Alphonso Nectar Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Real Fruit Power Litchi Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Mogu Mogu Strawberry Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "B Natural Mixed Fruit Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Fruit Juice",
    "name": "Maaza Mango Drink 1.2 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Frooti Mango Drink Beverage Gift Pack"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Maaza Mango Drink 600 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Frooti Refreshing Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Frooti Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Frooti Mango Drink 2 Ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Aamras Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Slice Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Real Fruit Power Alphonso Nectar Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Maaza Mango Drink 10 x 125 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Maaza Mango Drink 1.2 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Raw Pressery Aam Panna"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Swing Slurpy Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Nata De Coco Mango Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Aam Panna Zero Added Sugar Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Fresca Mango Drink 9 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Jade Forest Mango Lush Iced Tea"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Aamras / Mango Drink 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Aamras / Mango Drink 600 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Real Fruit Power Mango Drink Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Paper Boat Swing Slurpy Mango Drink 1.2 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Fresca Mango Drink 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Tropicana Delight Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Mango Drinks",
    "name": "Frooti Mango Drink 150 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hommade Lemoneez Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hamdard Rooh Afza Rose Sharbat"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hershey's Chocolate Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Abbie's Pure Maple Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Flaveo Lemon Concentrate Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Monin Vanilla Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Carmine Zero Sugar Vanilla Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Aazol Pure Kokum Agal Extract Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Chaman Badam Pista Elaichi Thandai Mix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hershey's Strawberry Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Monin Caramel Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Atlantis Nimbu Paani Drink Mix Masala"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Raj Kesar Badam Thandai Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Orika Jaljeera Lemonade Drink Mix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Syruppo Mint Mojito"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hitkary Aam Panna Sharbat"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Orika Masala Lemonade Drink Mix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "American Garden Pancake Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Dabur Orange Instant Energy Glucose Drink Mix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hitkary Orange Frenzy Sharbat"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Good Monk Orange Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Multani Rose Sharbat"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Raj Kesar Elaichi Sharbat"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Syruppo Blue Curacao Mocktail Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Hitkary Shahi Khus Sharbat"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Orika Kacha Aam & Herbs Lemonade Drink Mix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Concentrates & Syrups",
    "name": "Suhana Kesar Milk Masala Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Sharmayu Amla Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Honitus Hot Sip Ayurvedic Kaadha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Thar Aloe Vera Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Wild Amla Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Krishna’s High Fibre Fresh Amla Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Patanjali Aloe Vera with Fibre Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Sea Buckthorn Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Liver Care Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Patanjali Amla Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Vahdam Turmeric Ashwagandha Herbal Infusion"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Cholest Fit Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Brooklane Hibiscus Herbal Infusion"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Dr. Morepen Himalayan Sea Buckthorn Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Ayurveda Tulsi Giloy Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Dabur Himalayan Apple Cider Vinegar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Shatavari Balance Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Patanjali Giloy Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Dabur Jamun Neem Karela Health Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Ayurveda Triphala Laxative Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva BP Xpert Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Wellbeing Nutrition Sea Buckthorn Fruit Pulp"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Kapiva Artho Sure Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Krishna’s Aloe Amla Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Vansaar 45+ Diab Balance Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Careus Karela Jamun Ras Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Ayuvya Cholesterol Care Health Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Ayuvya Drop-it Juice for Weight Balance"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "Healthfarm Activate Diabiti Kare Herbal Juice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "WOW Life Science Apple Cider Vinegar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Herbal Drinks",
    "name": "yourG Buransh Petals Herbal Tea"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Delulu Manifest Mint Mojito Adaptogenic Energy Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Prolyte Liquid ORS Orange"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Red Bull Energy Drink 250 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Gatorade Blue Bolt Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Adrenaline Rush Ultimate Focus"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Gatorade Orange Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Prolyte Nimbu Paani ORS"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Prolyte ORS Orange"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Adrenaline Rush Ultimate Performance"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Monster Zero Sugar Ultra"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Gatorade Lemon Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Red Bull 4 x 250 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "O'cean Crispy Apple Electrolyte Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Fast&Up Reload Lemon Blast"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Hell Energy Classic"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Red Bull Sugar Free"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Prolyte Apple Liquid ORS"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "O'cean Peach & Passion Electrolyte Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Red Bull 355 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Fast&Up Reload Zero Sugar Orange"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Fast&Up Reload Energy & Electrolyte Orange"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Zyro Masala Cola"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Glucon-D Tangy Orange"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Enerzal Energy & Electrolyte Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Red Bull Pink Edition White Peach"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Sting Energy Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "O'cean Mango & Passion Electrolyte Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Wild Vitamin Drink Dragon Fruit"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Prolyte Mixed Fruit ORS"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Energy Drinks",
    "name": "Supply6 Salts Lime Electrolyte Mix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Real Activ Coconut Water 6 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Storia Tender Concentrate Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Raw Pressery Coconut Water 6 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Real Activ Coconut Water 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Real Activ Concentrate Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Yu 1 Ingredient Coconut Water No Preservative"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Yu 1 Ingredient Coconut Water 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Paper Boat Swing Concentrate Tender Coconut Water Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Storia Tender Concentrate Coconut Water No Added Sugar 6 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Raw Pressery Coconut Water 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Real Activ Coconut Water Not from Concentrate 6 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Malee Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Storia Tender Concentrate Coconut Water No Added Sugar 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Paper Boat Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Raw Pressery Coconut Water 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Pluckk Tender Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Hamdard Tender Nariyal Paani"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "B Natural Tender Concentrate Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Real Activ Coconut Water Not from Concentrate 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Raw Pressery Aloe Vera Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Storia Tender Concentrate Coconut Water Pack of 30"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Only Earth Tender Coconut Water Not from Concentrate"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Real Activ Coconut Water 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Plix Tender Coconut Water Premix Sachets"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Pluckk Tender Coconut Water with Real Malai Chunks"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Derm Ease Coconut Water Powder"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Only Earth Tender Coconut Water 165 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "B Natural Select Tender Concentrate Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "Yu Coconut Water + Lychee Juice with Chia Seeds Combo"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Coconut Water",
    "name": "GIVMI Natural Tender Coconut Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Sunfeast Mango Smoothie with Chunks"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Lactose Free Milk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Probiotic Tadka Salted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Probiotic Premium Unsalted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Sunfeast Berry Smoothie with Chia Seeds"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Masti Spiced Salted Buttermilk 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Yakult Probiotic Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Masti Spiced Salted Buttermilk 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Probiotic Tadka Salted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Yakult Light Probiotic Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Sweet Lassi"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Mango Lassi"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Sweet Lassi"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Sweet Lassi Tetra Pack"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Yakult Light Mango Probiotic Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Spiced Salted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Kool Cafe Milk ’n’ Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Kool Kesar Flavoured Milk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Epigamia Turbo Vanilla-Caramel Protein Milkshake"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "FruBon Masala Salted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Epigamia Turbo Coffee Protein Milkshake"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Smoodh Chocolate Flavoured Milk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Prolife Probiotic Unsalted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Rabri Lassi"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Provilac High Protein Milk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Country Delight Pudina Masala Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Mother Dairy Strawberry Lassi"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Smoodh Chocolate Hazelnut Flavoured Milk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Epigamia Turbo Cookies & Cream Protein Milkshake"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Lassi, Shakes & More",
    "name": "Amul Premium Spiced Salted Buttermilk"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Ice Cubes by Dras Ice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Bisleri Packaged Water 10 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Bisleri Packaged Water 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Bisleri Packaged Water 24 x 250 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Bisleri Packaged Water 5 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Ice Cubes Sparkling Supercubes by Burrf"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Aquafina Packaged Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Clear Premium Packaged Water 48 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Bisleri Vedica Mineral Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Catch Clear Lemon N Lime Flavoured Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Kinley Packaged Water 24 x 250 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Bisleri Vedica Natural Mountain Mineral Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Perrier Sparkling Water 4 x 330 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Catch Clear Black Currant Flavoured Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Himalayan Natural Mineral Water 24 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Ice Cups by Dras Ice"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Kinley Packaged Water 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Clear Drinking Packaged Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Aava Sparkling Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Star Signature Premium Sparkling Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Himalayan Sparkling Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Perrier Sparkling Water 330 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Aava Alkaline Natural Mineral Water 24 x 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Mizuberg Alkaline Natural Spring Mineral Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "AUM Premium Natural Alkaline Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Aava Alkaline Natural Mineral Water 4 x 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Catch Mineral Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Evian Mineral Water 330 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Evian Natural Mineral Water 1 ltr"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Water & Ice Cubes",
    "name": "Perrier Sparkling Water 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Toyo Kombucha Ginger Lemon"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Nescafe Cafe Style Iced Latte"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Toyo Kombucha Exotic Peach"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Nestea Ice Tea Premix Lemon"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Toyo Kombucha Cranberry"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Amul Kool Cafe Milk 'n' Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Toyo Kombucha Strawberry Cream Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Toyo Kombucha Pineapple"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Toyo Kombucha Mango Lime Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Lipton Lemon Iced Tea"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Blue Tokai Classic Bold Cold Brew Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Bombucha Blueberry Lavender Kombucha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Mossant Craft Cola Kombucha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Sleepy Owl Black Cold Brew Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Bombucha Mango Turmeric Kombucha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Chaayos Instant Lemon Ice Tea Premix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Chaayos Instant Peach Ice Tea Premix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Sleepy Owl French Vanilla Cold Coffee Can"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Sleepy Owl Vietnamese Cold Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Amul Kool Cafe Milk 'n' Coffee 200 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Bombucha Apple Spice Kombucha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Sleepy Owl Belgian Mocha Cold Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Sleepy Owl Hazelnut Cold Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Bombucha Smoky Oolong Kombucha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Guppy Mom's Sugar Free Peach Ice Tea Premix"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Raw Pressery Iced Tea Peach"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Sleepy Owl Classic Cold Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Umami Brew Kokum Ginger Kombucha"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Avvatar Classic Cold Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Cold Coffee & Ice Tea",
    "name": "Bru Caramel Cold Coffee"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Catch Club Soda Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Kinley Strong Soda Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Bisleri Soda Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Paper Boat Zero Cranberry Lime Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Lahori Zeera Masala Soda"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Paper Boat Zero Sugar Mint Mojito Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Paper Boat Zero Sugar Lemon Lime Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Schweppes Ginger Ale"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Paper Boat Zero Sugar Peach Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Schweppes Indian Tonic Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Schweppes Original Soda Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Gunsberg Original Ginger Ale"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Perrier Sparkling Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Coolberg Cranberry Non-Alcoholic Beer"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Sepoy & Co. Original Ginger Ale"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Lehar Evervess Club Soda Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Jimmy’s Lime & Lemon Sparkling Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Catch Clear Cranberry Soda Water"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Raw Pressery POP Citrus Burst Prebiotic Soda"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Soda & Mixers",
    "name": "Monin Mojito Mint Syrup"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Lychee Fruit Drink with Nata De Coco"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Perrier Sparkling Water 4 x 330 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Grape Fruit Drink with Nata De Coco"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Mango Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Strawberry Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Perrier Sparkling Water 330 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Coca-Cola Cherry Flavoured Soft Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Pineapple Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Perrier Sparkling Water 750 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Red Bull Cold Brew Coffee Energy Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Evian Natural Mineral Water 500 ml"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Watermelon Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Mogu Mogu Orange Fruit Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "7UP Zero Sugar Soft Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Ice Talk Blue Lemonade"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Jameson Ginger Ale"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Fanta Fruit Twist Soft Drink"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Fanta Orange Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Ice Talk Green Grape Ade"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Jacob’s Creek Unvined Riesling Non-Alcoholic Wine"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Pepsi Lime Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Pepsi Max Mango No Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Pepsi Max Raspberry No Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Pepsi Max Cherry No Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Coca-Cola Vanilla Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "Sprite Lemon-Lime Zero Sugar"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "- **Vegetables & Fruits:** 575 loaded rows / 583 with variants"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "- **Cool Drinks & Juices:** ~376 shown rows"
  },
  {
    "main": "Cool Drinks & Juices",
    "subcategory": "Imported Beverages",
    "name": "several categories have much larger full totals, e.g. Soft Drinks 326, Cold Coffee & Ice Tea 135, Water & Ice Cubes 61, Concentrates & Syrups 60, Herbal Drinks 41"
  }
];

const storeId = 1;
const placeholderPrice = 99;
const placeholderUnit = '1 unit';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryResult = await client.query(`
      SELECT id, name, section
      FROM categories
      WHERE section IS NOT NULL
    `);

    const categoryMap = new Map();
    for (const row of categoryResult.rows) {
      categoryMap.set(`${row.section}|||${row.name}`.toLowerCase(), row.id);
    }

    let inserted = 0;
    let existed = 0;
    let missing = 0;
    const missingCategories = new Set();

    for (const item of products) {
      const key = `${item.main}|||${item.subcategory}`.toLowerCase();
      const categoryId = categoryMap.get(key);

      if (!categoryId) {
        missing++;
        missingCategories.add(`${item.main} > ${item.subcategory}`);
        continue;
      }

      const result = await client.query(`
        INSERT INTO products
          (category_id, name, description, unit, price, original_price,
           image_url, is_active, subcategory_id, store_id, approval_status,
           store_notes, icon, bg_color)
        SELECT $1, $2, $3, $4, $5, $6, NULL, TRUE, NULL, $7, 'approved',
               $8, $9, $10
        WHERE NOT EXISTS (
          SELECT 1 FROM products
          WHERE store_id = $7
            AND category_id = $1
            AND LOWER(name) = LOWER($2)
        )
        RETURNING id
      `, [
        categoryId,
        item.name,
        item.name,
        placeholderUnit,
        placeholderPrice,
        placeholderPrice,
        storeId,
        `Imported from supplied PVL product list | ${item.main} > ${item.subcategory}`,
        '🛒',
        '#F5F5F5'
      ]);

      if (result.rowCount) inserted++;
      else existed++;
    }

    await client.query('COMMIT');

    console.log('');
    console.log('PVL PRODUCT IMPORT COMPLETE');
    console.log('Source rows: ' + products.length);
    console.log('Inserted: ' + inserted);
    console.log('Already existed: ' + existed);
    console.log('Missing category mappings: ' + missing);

    if (missingCategories.size) {
      console.log('');
      console.log('MISSING CATEGORY MAPPINGS:');
      for (const x of missingCategories) console.log(' - ' + x);
    }

    console.log('');
    console.log('NOTE: The supplied source has product names only. Price/unit/image use placeholders.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('IMPORT FAILED:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

'@ | Set-Content -Path $js -Encoding UTF8

Write-Host "Created: $js" -ForegroundColor Green
Write-Host "Running product import..." -ForegroundColor Cyan
Set-Location $backend
node $js
