require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Restaurant = require("../models/Restaurant");
const Branch = require("../models/Branch");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const Table = require("../models/Table");
const Settings = require("../models/Settings");
const Theme = require("../models/Theme");
const Variant = require("../models/Variant");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in backend/.env");
  process.exit(1);
}

const MENU_DATA = [
  {
    category: "Hot Beverages",
    items: [
      { name: "Tea", price: 35, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80", desc: "Freshly brewed aromatic Indian tea" },
      { name: "Coffee", price: 49, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80", desc: "Hot rich frothy milk coffee" },
      { name: "Tomato Soup", price: 69, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80", desc: "Classic velvety roasted tomato soup with croutons" },
      { name: "Hot N Sour Soup", price: 75, image: "https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=500&q=80", desc: "Zesty spicy Chinese broth with diced vegetables" },
      { name: "Sweet Corn Soup", price: 69, image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80", desc: "Hearty sweet golden corn soup" },
      { name: "Veg Soup", price: 69, image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&q=80", desc: "Healthy seasoned vegetable broth" },
    ],
  },
  {
    category: "Starters",
    items: [
      { name: "Paneer Pakora", price: 199, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Crispy batter-fried spiced paneer cubes" },
      { name: "Veg Pakora", price: 159, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", desc: "Golden mixed vegetable fritters with mint chutney" },
      { name: "Paneer Tikka", price: 199, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80", desc: "Charcoal tandoor-roasted marinated cottage cheese" },
      { name: "Malai Paneer Tikka", price: 219, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80", desc: "Mild creamy paneer tikka marinated in cashew cream" },
      { name: "Achari Paneer Tikka", price: 219, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80", desc: "Tangy pickled-spiced paneer tikka skewers" },
      { name: "Lehsuni Paneer Tikka", price: 209, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80", desc: "Garlic-infused smoky paneer tikka" },
      { name: "Soya Chaap Tikka", price: 219, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Protein-rich tandoori spiced soya chaap" },
      { name: "Soya Chaap Malai Tikka", price: 239, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Silky cashew-cream coated soya chaap" },
      { name: "Soya Chaap Achari Tikka", price: 229, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Spicy pickling flavored roasted soya chaap" },
      { name: "Mushroom Tikka", price: 239, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", desc: "Whole fresh mushrooms tossed in fiery tandoori masala" },
      { name: "Mushroom Malai Tikka", price: 249, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", desc: "Creamy tandoori mushrooms with aromatic spices" },
      { name: "Hara Bhara Kabab", price: 269, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", desc: "Pan-fried spinach, green pea and potato patties" },
      { name: "Tandoori Gobhi", price: 209, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", desc: "Charred spiced cauliflower florets" },
      { name: "Malai Tandoori Gobhi", price: 219, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", desc: "Cream-marinated tender tandoori cauliflower" },
    ],
  },
  {
    category: "Lassi Shahi",
    items: [
      { name: "Classic Sweet Lassi", price: 69, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Traditional thick churned sweet yogurt drink" },
      { name: "Rose Gulkand Lassi", price: 79, image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", desc: "Fragrant rose petal and gulkand infused cooling lassi" },
      { name: "Dry Fruit Lassi", price: 89, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Rich thick lassi topped with almond and pistachio flakes" },
      { name: "Strawberry Cream Lassi", price: 99, image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", desc: "Luscious strawberry puree swirled with thick sweet yogurt" },
      { name: "Kesar Pista Cream Lassi", price: 99, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Royal saffron-pistachio golden malai lassi" },
    ],
  },
  {
    category: "Maggie",
    items: [
      { name: "Classic Maggie", price: 89, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Original 2-minute street-style noodle magic" },
      { name: "Veg Maggie", price: 90, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Tossed with crunchy onions, tomatoes and green peas" },
      { name: "Tandoori Maggie", price: 90, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Smoky tandoori seasoning tossed noodles" },
      { name: "Cheese Maggie", price: 100, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Loaded with melted mozzarella and cheddar cheese" },
      { name: "Paneer Maggie", price: 100, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Filled with fresh cottage cheese cubes and mild spices" },
      { name: "Corn Cheese Maggie", price: 110, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Sweet golden corn and molten cheese bliss" },
    ],
  },
  {
    category: "Sandwiches",
    items: [
      { name: "Veg Grilled Sandwich", price: 89, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Crispy toasted sandwich stuffed with seasoned veggies" },
      { name: "Cheese Corn Sandwich", price: 99, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Golden sweet corn and melted gooey cheese blend" },
      { name: "Cheese Slice Sandwich", price: 109, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Double cheese slice layered toasted sandwich" },
      { name: "Cheese Paneer Sandwich", price: 109, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Soft spiced paneer and cheese grilled to perfection" },
      { name: "Tandoori Sandwich", price: 99, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Smoky tandoori sauce infused grilled sandwich" },
    ],
  },
  {
    category: "Burger",
    items: [
      { name: "Aloo Tikki Burger", price: 79, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80", desc: "Crisp spiced potato patty with mint mayo and onions" },
      { name: "Cheese Slice Burger", price: 109, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80", desc: "Classic veggie patty topped with creamy cheese slice" },
      { name: "Paneer Burger", price: 99, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80", desc: "Grilled marinated paneer steak in toasted sesame bun" },
      { name: "Cheese Tandoori Paneer Burger", price: 99, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80", desc: "Fiery tandoori paneer slice with cheese slice" },
    ],
  },
  {
    category: "Pizzas",
    items: [
      { name: "Classic Onion Pizza", price: 129, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80", desc: "Crisp onions, herbs and mozzarella on hand-tossed base" },
      { name: "OTC Pizza", price: 139, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80", desc: "Classic Onion, Tomato and Capsicum trio with cheese" },
      { name: "Margherita Pizza", price: 139, image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&q=80", desc: "Traditional Italian pizza with basil, tomato & extra mozzarella" },
      { name: "Cheese Corn Pizza", price: 149, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80", desc: "Loaded with golden sweet corn and rich cheese blend" },
      { name: "Paneer Pizza", price: 149, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80", desc: "Spiced tandoori paneer cubes with bell peppers" },
      { name: "Tandoori Pizza", price: 149, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80", desc: "Smoky tandoori sauce base with marinated vegetables" },
    ],
  },
  {
    category: "Pasta & Italian",
    items: [
      { name: "White Sauce Penne Pasta", price: 139, image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281724?w=500&q=80", desc: "Creamy Italian penne pasta tossed in rich herb béchamel sauce" },
      { name: "Red Sauce Arrabbiata Pasta", price: 129, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", desc: "Tangy spicy tomato herb sauce with garlic and bell peppers" },
      { name: "Mix Sauce (Pink Sauce) Pasta", price: 149, image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=500&q=80", desc: "The perfect harmony of rich cream and tangy pomodoro sauce" },
      { name: "Cheese Baked Pasta", price: 169, image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80", desc: "Oven-baked penne layered with golden melted mozzarella" },
    ],
  },
  {
    category: "Pack & Roll",
    items: [
      { name: "Spring Roll", price: 99, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80", desc: "Crispy fried rolls filled with seasoned shredded vegetables" },
      { name: "Veg Roll", price: 109, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Warm flatbread rolled with spiced vegetables and sauces" },
    ],
  },
  {
    category: "Chinese",
    items: [
      { name: "Hakka Noodles", price: 130, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80", desc: "Wok-tossed noodles with crisp vegetables and soya sauce" },
      { name: "Schezwan Noodles", price: 140, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80", desc: "Fiery noodles tossed in bold spicy Schezwan sauce" },
      { name: "Chilli Garlic Noodles", price: 140, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80", desc: "Garlic-punched noodles with red chillies and spring onions" },
      { name: "Veg Chowmein", price: 120, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80", desc: "Desi street style vegetable chowmein" },
      { name: "Chilli Potato", price: 130, image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&q=80", desc: "Crisp fried potato fingers tossed in sweet and spicy chilli sauce" },
      { name: "Honey Chilli Potato", price: 120, image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&q=80", desc: "Glazed with pure honey and toasted sesame seeds" },
      { name: "Chilli Mushroom", price: 150, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", desc: "Crispy button mushrooms tossed in hot chilli gravy" },
      { name: "Manchurian Dry", price: 140, image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&q=80", desc: "Fried veggie dumplings in dark soya and garlic glaze" },
      { name: "Manchurian Gravy", price: 150, image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&q=80", desc: "Veg dumplings simmered in savory Chinese gravy" },
      { name: "Chilli Paneer Dry", price: 170, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Cottage cheese cubes tossed with capsicum and green chillies" },
      { name: "Chilli Paneer Gravy", price: 150, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Paneer cubes in luscious Indo-Chinese spicy gravy" },
    ],
  },
  {
    category: "Momos Veg",
    items: [
      { name: "Steam Momos", price: 69, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=500&q=80", desc: "Authentic steamed dumplings stuffed with spiced vegetables" },
      { name: "Deep Fried Momos", price: 79, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=500&q=80", desc: "Golden crunchy fried momos served with fiery red chutney" },
      { name: "Veg Fried Masala Momos", price: 89, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=500&q=80", desc: "Fried momos tossed in spicy chatpata masala" },
      { name: "Kurkure Veg Momos", price: 89, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=500&q=80", desc: "Ultra-crispy cornflake crusted fried momos" },
      { name: "Masala Tandoori Momos", price: 109, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=500&q=80", desc: "Charcoal-roasted tandoori momos with mint sauce" },
      { name: "Peri Peri Masala Momos", price: 109, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=500&q=80", desc: "Dusted with authentic African peri-peri spice blend" },
    ],
  },
  {
    category: "French Fries",
    items: [
      { name: "Salted Fries", price: 89, image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&q=80", desc: "Crispy golden potato fries seasoned with sea salt" },
      { name: "Peri Peri Fries", price: 99, image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&q=80", desc: "Spicy zesty peri peri seasoned French fries" },
      { name: "Cheese Fries", price: 109, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&q=80", desc: "Drizzled with warm cheddar cheese sauce" },
    ],
  },
  {
    category: "Salad / Papad",
    items: [
      { name: "Green Salad", price: 79, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80", desc: "Fresh cucumbers, carrots, tomatoes and onions" },
      { name: "Onion Salad", price: 69, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80", desc: "Sliced onion rings with lemon and green chillies" },
      { name: "Masala Pyaz", price: 69, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80", desc: "Spiced chatpata onion rings with lemon and chaat masala" },
      { name: "Roasted Papad", price: 29, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", desc: "Crisp tandoor roasted papad" },
      { name: "Fried Papad", price: 39, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", desc: "Golden deep fried crisp papad" },
      { name: "Fried Masala Papad", price: 49, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", desc: "Topped with chopped onions, tomatoes, coriander and spices" },
      { name: "Cheese Masala Papad", price: 79, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", desc: "Masala papad generously loaded with grated cheese" },
    ],
  },
  {
    category: "Raita & Refreshers",
    items: [
      { name: "Regular Chhach", price: 29, image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", desc: "Chilled traditional salted buttermilk" },
      { name: "Masala Chhach", price: 39, image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", desc: "Roasted cumin, mint and green chilli spiced buttermilk" },
      { name: "Kheera Raita", price: 89, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Refreshing grated cucumber curd with roasted cumin" },
      { name: "Pudina Raita", price: 89, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Aromatic cooling mint yogurt" },
      { name: "Boondi Raita", price: 99, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Crisp fried gram flour pearls in seasoned yogurt" },
      { name: "Lauki Raita", price: 99, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Tender bottle gourd mixed in tempered curd" },
      { name: "Mix Veg Raita", price: 99, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Finely chopped tomatoes, cucumber and onions in curd" },
      { name: "Fruit Raita", price: 119, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Seasonal diced fresh fruits in sweet whipped yogurt" },
      { name: "Plain Raita", price: 89, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Smooth tempered yogurt" },
      { name: "Plain Dahi", price: 90, image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80", desc: "Fresh set thick creamy curd" },
    ],
  },
  {
    category: "Dal (Veg Protein)",
    items: [
      {
        name: "Dal Fry",
        price: 129,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        desc: "Yellow lentils tempered with onions, tomatoes and garlic",
        variants: [
          { name: "Half", price: 129 },
          { name: "Full", price: 159 },
        ],
      },
      {
        name: "Dal Tadka (Desi Ghee)",
        price: 149,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        desc: "Homestyle lentils finished with aromatic pure desi ghee tadka",
        variants: [
          { name: "Half", price: 149 },
          { name: "Full", price: 189 },
        ],
      },
      {
        name: "Dal Makhani",
        price: 159,
        image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80",
        desc: "Slow-cooked black lentils simmered overnight with butter & cream",
        variants: [
          { name: "Half", price: 159 },
          { name: "Full", price: 229 },
        ],
      },
      {
        name: "Yellow Dal Tadka",
        price: 139,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        desc: "Classic comfort yellow toor dal with red chilli tadka",
        variants: [
          { name: "Half", price: 139 },
          { name: "Full", price: 179 },
        ],
      },
    ],
  },
  {
    category: "Veg Main Course",
    items: [
      {
        name: "Seasonal Mix Veg",
        price: 159,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Fresh garden vegetables cooked in North Indian curry",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 189 }],
      },
      {
        name: "Sev Tamatar",
        price: 159,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Famous spicy Rajasthani tomato gravy with crisp gram sev",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 189 }],
      },
      {
        name: "Sev Bhaji",
        price: 159,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Savory sev simmered in rich spiced onion-garlic masala",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 189 }],
      },
      {
        name: "Rajma Masala",
        price: 159,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        desc: "Tender kidney beans simmered in Punjabi masala gravy",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 189 }],
      },
      {
        name: "Chana Masala",
        price: 159,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        desc: "Spiced chickpeas cooked in tangy tomato-pomegranate gravy",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 219 }],
      },
      {
        name: "Aloo Matar",
        price: 149,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Home-style potatoes and green peas in light curry",
        variants: [{ name: "Half", price: 149 }, { name: "Full", price: 179 }],
      },
      {
        name: "Aloo Palak",
        price: 149,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Potatoes cooked in fresh spinach puree and spices",
        variants: [{ name: "Half", price: 149 }, { name: "Full", price: 179 }],
      },
      {
        name: "Dum Aloo",
        price: 159,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Deep-fried baby potatoes simmered in spiced yogurt gravy",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 219 }],
      },
      {
        name: "Jeera Aloo",
        price: 149,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Dry spiced potatoes sautéed with cumin seeds and green chillies",
        variants: [{ name: "Half", price: 149 }, { name: "Full", price: 179 }],
      },
      {
        name: "Aloo Gobhi",
        price: 149,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Classic dry preparation of potatoes and cauliflower florets",
        variants: [{ name: "Half", price: 149 }, { name: "Full", price: 189 }],
      },
      {
        name: "Aloo Chhola",
        price: 149,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        desc: "Potatoes and chickpeas in hearty Punjabi masala",
        variants: [{ name: "Half", price: 149 }, { name: "Full", price: 219 }],
      },
      {
        name: "Matar Mushroom",
        price: 209,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80",
        desc: "Fresh mushrooms and green peas in rich onion-tomato sauce",
        variants: [{ name: "Half", price: 209 }, { name: "Full", price: 249 }],
      },
      {
        name: "Mushroom Do Pyaza",
        price: 219,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80",
        desc: "Juicy mushrooms cooked with double the onions and spices",
        variants: [{ name: "Half", price: 219 }, { name: "Full", price: 259 }],
      },
      {
        name: "Kadhai Mushroom",
        price: 219,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80",
        desc: "Wok-tossed mushrooms with bell peppers and roasted kadhai masala",
        variants: [{ name: "Half", price: 219 }, { name: "Full", price: 269 }],
      },
      {
        name: "Navratan Korma",
        price: 249,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Royal mild curry with 9 gems of vegetables, fruits and nuts",
        variants: [{ name: "Half", price: 249 }, { name: "Full", price: 299 }],
      },
      {
        name: "Palak Lehsun Tadka",
        price: 149,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Vibrant spinach curry tempered with fragrant golden garlic",
        variants: [{ name: "Half", price: 149 }, { name: "Full", price: 199 }],
      },
      {
        name: "Besan Gatta",
        price: 139,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Traditional Rajasthani gram flour dumplings in spicy yogurt gravy",
        variants: [{ name: "Half", price: 139 }, { name: "Full", price: 179 }],
      },
      {
        name: "Kari Pakora",
        price: 159,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Fluffy onion pakoras simmered in sour tangy buttermilk kadhi",
        variants: [{ name: "Half", price: 159 }, { name: "Full", price: 199 }],
      },
      {
        name: "Dahi Fry",
        price: 129,
        image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80",
        desc: "Special spiced tempered curd curry",
        variants: [{ name: "Half", price: 129 }, { name: "Full", price: 169 }],
      },
      {
        name: "K.B. Special Veg",
        price: 219,
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
        desc: "Chef's secret signature mixed vegetable curry with cashews and paneer",
        variants: [{ name: "Half", price: 219 }, { name: "Full", price: 259 }],
      },
    ],
  },
  {
    category: "Paneer Special",
    items: [
      {
        name: "Malai Kofta (Red Gravy)",
        price: 199,
        image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80",
        desc: "Melt-in-mouth cottage cheese dumplings in rich tomato cream gravy",
        variants: [{ name: "Half", price: 199 }, { name: "Full", price: 299 }],
      },
      {
        name: "Malai Kofta (White Gravy)",
        price: 199,
        image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80",
        desc: "Kofta dumplings simmered in velvety royal cashew shahi gravy",
        variants: [{ name: "Half", price: 199 }, { name: "Full", price: 299 }],
      },
      { name: "Veg Kofta", price: 239, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80", desc: "Mixed vegetable dumplings in spicy North Indian curry" },
      { name: "Kaju Curry", price: 309, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80", desc: "Whole roasted cashews in rich makhani gravy" },
      { name: "Kaju Paneer", price: 319, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Paneer cubes and roasted cashews in creamy royal gravy" },
      { name: "Paneer Butter Masala", price: 329, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80", desc: "Classic rich tomato butter gravy with soft paneer" },
      { name: "Paneer Lababdar", price: 299, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80", desc: "Grated paneer and cubes cooked in luscious Mughlai gravy" },
      { name: "Paneer Do Pyaza", price: 299, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Paneer cooked with caramelized onion chunks and spices" },
      { name: "Handi Paneer", price: 309, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80", desc: "Clay pot cooked paneer with whole rustic spices" },
      { name: "Khoya Paneer", price: 309, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80", desc: "Rich condensed milk khoya and paneer sweet-savory curry" },
      { name: "Kadhai Paneer", price: 319, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80", desc: "Tossed with capsicum, coriander seeds and spicy kadhai masala" },
      { name: "Palak Paneer", price: 299, image: "https://images.unsplash.com/photo-1589647363585-7452808249ae?w=500&q=80", desc: "Fresh spinach puree with tender cottage cheese cubes" },
      { name: "Paneer Takatak", price: 319, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Chatpata spicy griddle-tossed paneer delight" },
      { name: "Matar Paneer", price: 299, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", desc: "Homestyle green peas and paneer in cumin gravy" },
      { name: "Shahi Paneer", price: 309, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80", desc: "Royal sweet creamy cashew-almond paneer curry" },
      { name: "Paneer Tikka Masala", price: 319, image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80", desc: "Tandoori grilled paneer tikka simmered in spicy masala gravy" },
    ],
  },
  {
    category: "Rice & Pulao",
    items: [
      { name: "Plain Rice", price: 119, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&q=80", desc: "Steamed fragrant long grain basmati rice" },
      { name: "Jeera Rice", price: 129, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&q=80", desc: "Basmati rice tempered with roasted cumin seeds and desi ghee" },
      { name: "Matar Pulao", price: 139, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", desc: "Basmati rice cooked with sweet green peas and whole spices" },
      { name: "Veg Pulao", price: 149, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", desc: "Rice cooked with assorted vegetables and bay leaves" },
      { name: "Kaju Pulao", price: 219, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", desc: "Rich royal pulao loaded with golden fried cashews" },
      { name: "Paneer Pulao", price: 219, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", desc: "Fragrant basmati rice tossed with spiced paneer cubes" },
      { name: "Veg Biryani", price: 189, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", desc: "Dum-cooked layered aromatic biryani served with raita" },
    ],
  },
  {
    category: "Tandoor Ke Angaro Se (Breads)",
    items: [
      { name: "Tandoori Roti (Plain)", price: 15, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Traditional clay-oven crisp whole wheat roti" },
      { name: "Tandoori Roti (Butter)", price: 19, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Tandoori roti brushed with fresh melting butter" },
      { name: "Tawa Roti (Plain)", price: 15, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Homestyle soft puffed whole wheat flatbread" },
      { name: "Tawa Roti (Butter)", price: 19, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Soft tawa phulka brushed with desi ghee/butter" },
      { name: "Lachha Paratha", price: 89, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Multi-layered crisp tandoori paratha" },
      { name: "Missi Roti", price: 79, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Gram flour and spices roasted bread" },
      { name: "Naan (Plain)", price: 79, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Classic soft tandoor-baked leavened bread" },
      { name: "Naan (Butter)", price: 89, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Warm tandoori naan brushed with rich butter" },
      { name: "Naan (Stuffed)", price: 139, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Naan stuffed with spiced potato and cottage cheese" },
      { name: "Naan (Garlic)", price: 129, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Topped with minced garlic and coriander butter" },
    ],
  },
  {
    category: "Paratha Gali",
    items: [
      { name: "Lachha Paratha", price: 89, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Golden flaky multi-layered paratha" },
      { name: "Aloo Paratha", price: 49, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Classic whole wheat bread stuffed with spiced mashed potatoes" },
      { name: "Gobhi Paratha", price: 89, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Stuffed with seasoned grated cauliflower" },
      { name: "Pyaz Paratha", price: 79, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Stuffed with chopped spiced onions and green chillies" },
      { name: "Paneer Paratha", price: 109, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80", desc: "Generously filled with seasoned grated cottage cheese" },
    ],
  },
  {
    category: "Sweets",
    items: [
      { name: "KB Gulab Jamun (2pcs)", price: 69, image: "https://images.unsplash.com/photo-1593798485207-6f6d0f6e5229?w=500&q=80", desc: "Warm soft mawa dumplings soaked in cardamom sugar syrup" },
      { name: "Rasgulla (2pcs)", price: 59, image: "https://images.unsplash.com/photo-1593798485207-6f6d0f6e5229?w=500&q=80", desc: "Spongy cottage cheese balls soaked in sweet light syrup" },
    ],
  },
  {
    category: "Thali",
    items: [
      {
        name: "Deluxe Thali",
        price: 309,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&q=80",
        desc: "Includes: Dal Fry, Mix Veg, Mutter Paneer, 3 Butter Roti (Tandoori/Tawa), Rice, Salad, Papad, Boondi Raita.",
      },
      {
        name: "Premium Thali",
        price: 399,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&q=80",
        desc: "Includes: Paneer Butter Masala, Dal Makhani, Kaju Curry, Veg Raita, Veg Pulao, 1 Butter Naan, 1 Lachha Paratha, Papad, Salad, 2pcs Gulab Jamun.",
      },
      {
        name: "Regular Thali",
        price: 209,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&q=80",
        desc: "Includes: Dal Fry, Seasonal Mix Veg, Mix Veg Raita, 3 Butter Roti (Tandoori/Tawa), Rice, Salad.",
      },
    ],
  },
  {
    category: "Tea & Coffee",
    items: [
      {
        name: "Masala Tea",
        price: 30,
        image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80",
        desc: "Cardamom & ginger infused aromatic tea",
        variants: [
          { name: "Small", price: 30 },
          { name: "Large", price: 40 },
        ],
      },
      { name: "Ice Lemon Tea", price: 89, image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", desc: "Chilled brewed black tea with fresh lemon slices" },
      { name: "Hot Lemon Tea", price: 59, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80", desc: "Warm soothing lemon and honey tea" },
      { name: "Hot Coffee", price: 49, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80", desc: "Classic hot milk coffee" },
      { name: "Dark Black Coffee", price: 39, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80", desc: "Pure strong espresso Americano brew" },
    ],
  },
  {
    category: "Coffee Creamy Love",
    items: [
      {
        name: "Cold Coffee",
        price: 79,
        image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80",
        desc: "Thick chilled blended coffee with chocolate drizzle",
        variants: [
          { name: "Small", price: 79 },
          { name: "Large", price: 99 },
        ],
      },
      {
        name: "Cold Coffee Extra Ice Cream",
        price: 109,
        image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80",
        desc: "Thick cold coffee topped with a generous scoop of vanilla ice cream",
        variants: [
          { name: "Small", price: 109 },
          { name: "Large", price: 129 },
        ],
      },
    ],
  },
  {
    category: "Mocktails",
    items: [
      { name: "Mint Mojito", price: 100, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Refreshing blend of muddled mint, lime and sparkling soda" },
      { name: "Black Current", price: 110, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Tangy sweet blackcurrant chiller" },
      { name: "Green Apple", price: 90, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Crisp sour green apple sparkler" },
      { name: "Strawberry Mocktail", price: 120, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Sweet strawberry crushed ice cooler" },
      { name: "Watermelon Mocktail", price: 110, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Fresh summer watermelon and mint cooler" },
      { name: "Masala Coke", price: 60, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Chilled cola spiced with rock salt and lemon juice" },
      { name: "Kiwi Mocktail", price: 100, image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80", desc: "Tropical green kiwi fruit burst" },
    ],
  },
  {
    category: "Shakes",
    items: [
      { name: "Banana Shake", price: 89, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Fresh ripe banana blended with creamy milk" },
      { name: "Vanilla Shake", price: 99, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Classic sweet vanilla bean thickshake" },
      { name: "Chocolate Shake", price: 130, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Rich Dutch cocoa and chocolate fudge shake" },
      { name: "Butter Scotch Shake", price: 120, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Crunchy butterscotch praline shake" },
      { name: "Strawberry Shake", price: 120, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Fresh strawberry thick milkshake" },
      { name: "Pineapple Shake", price: 120, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Tropical pineapple pulp shake" },
      { name: "Kiwi Shake", price: 120, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Sweet and tangy kiwi thickshake" },
      { name: "Kitkat Shake", price: 130, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Crispy KitKat wafer bars blended into chocolate shake" },
      { name: "Oreo Shake", price: 130, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80", desc: "Cookies and cream Oreo chocolate shake" },
    ],
  },
  {
    category: "Combos",
    items: [
      { name: "Masala Chai + Bun Muska", price: 99, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80", desc: "Hot cutting masala chai with soft butter-slathered bun" },
      { name: "Maggie + Cold Coffee", price: 129, image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80", desc: "Hot spicy Maggie noodles with thick chilled cold coffee" },
      { name: "Burger + Cold Coffee", price: 149, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80", desc: "Crispy burger with a tall glass of cold coffee" },
      { name: "Sandwich + Cold Coffee", price: 139, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Toasted grilled sandwich with thick cold coffee" },
      { name: "Veg Grilled Sandwich + 2 Cold Coffee", price: 219, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", desc: "Jumbo sandwich for sharing with two cold coffees" },
      { name: "OTC Pizza + Cold Coffee", price: 249, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80", desc: "Personal OTC pizza paired with cold coffee" },
    ],
  },
  {
    category: "Ice Cream",
    items: [
      { name: "Vanilla Ice Cream", price: 59, image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&q=80", desc: "Two scoops of classic rich vanilla ice cream" },
      { name: "Butter Scotch Ice Cream", price: 69, image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&q=80", desc: "Two scoops of crunchy caramelized butterscotch" },
      { name: "Strawberry Ice Cream", price: 69, image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&q=80", desc: "Creamy sweet strawberry scoops" },
      { name: "Chocolate Ice Cream", price: 79, image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&q=80", desc: "Two scoops of rich decadent chocolate ice cream" },
    ],
  },
];

async function run() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  // 1. Ensure Subscription Plans
  let trialPlan = await SubscriptionPlan.findOne({ name: "Trial Plan" });
  if (!trialPlan) {
    trialPlan = await SubscriptionPlan.create({
      name: "Trial Plan",
      price: 0,
      billingCycle: "monthly",
      maxBranches: 1,
      maxTablesPerBranch: 50,
      maxMenuItems: 500,
      features: ["menu", "orders", "qr-tables", "gst-billing"],
      isActive: true,
    });
  }

  // 2. Ensure Super Admin
  const superAdminExists = await User.findOne({ role: "SUPER_ADMIN" });
  if (!superAdminExists) {
    const adminPass = process.env.SUPER_ADMIN_PASSWORD || "AdminPass@" + Math.random().toString(36).substring(2, 10);
    const hashed = await bcrypt.hash(adminPass, 10);
    await User.create({
      name: "ServeDesk Super Admin",
      email: (process.env.SUPER_ADMIN_EMAIL || "superadmin@servedesk.com").toLowerCase().trim(),
      password: hashed,
      role: "SUPER_ADMIN",
      isActive: true,
    });
    console.log("Super Admin created.");
  }

  // 3. Find or create Restaurant
  let restaurant = await Restaurant.findOne({ slug: "tasty-bites" });
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: "Tasty Bites",
      slug: "tasty-bites",
      billingEmail: "admin@tastybites.com",
      phone: "9876543210",
      address: "123 Food Street, City Center",
      subscriptionPlan: trialPlan._id,
      subscriptionStatus: "active",
      isActive: true,
      isSuspended: false,
      hasKitchen: true,
      hasStaff: true,
      enabledModules: ["admin", "kitchen", "staff"],
    });
    console.log("Created Restaurant:", restaurant.name);
  }

  // 4. Find or create Branch
  let branch = await Branch.findOne({ restaurantId: restaurant._id });
  if (!branch) {
    branch = await Branch.create({
      restaurantId: restaurant._id,
      name: "Main Branch",
      slug: "main",
      phone: "9876543210",
      address: "123 Food Street, City Center",
      isActive: true,
    });
    console.log("Created Main Branch");
  }

  // 5. Ensure Restaurant Admin User
  let adminUser = await User.findOne({ email: "admin@tastybites.com" });
  if (!adminUser) {
    const hashed = await bcrypt.hash("Password123!", 10);
    adminUser = await User.create({
      name: "Tasty Bites Admin",
      email: "admin@tastybites.com",
      password: hashed,
      role: "RESTAURANT_ADMIN",
      restaurantId: restaurant._id,
      branchId: branch._id,
      isActive: true,
    });
    console.log("Created Restaurant Admin: admin@tastybites.com");
  }

  // 6. Ensure Settings & Theme
  let settings = await Settings.findOne({ restaurantId: restaurant._id });
  if (!settings) {
    await Settings.create({
      restaurantId: restaurant._id,
      branchId: branch._id,
      currency: "INR",
      cgstRate: 2.5,
      sgstRate: 2.5,
      enableSoundAlerts: true,
      thermalPrinterWidth: "80mm",
      tableCallOption: true,
      isOfflineMode: false,
    });
  }

  let theme = await Theme.findOne({ restaurantId: restaurant._id });
  if (!theme) {
    await Theme.create({
      restaurantId: restaurant._id,
      primaryColor: "#ea580c",
      secondaryColor: "#1e293b",
      fontFamily: "Plus Jakarta Sans",
    });
  }

  // 7. Ensure Tables (T1 through T10)
  const existingTables = await Table.find({ restaurantId: restaurant._id });
  if (existingTables.length === 0) {
    const tableNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    for (const tn of tableNumbers) {
      await Table.create({
        restaurantId: restaurant._id,
        branchId: branch._id,
        tableNumber: tn,
        seatingCapacity: 4,
        status: "available",
        isActive: true,
      });
    }
    console.log("Created Tables 1 through 10.");
  }

  // 8. Wipe old categories and items for this restaurant to populate the new uploaded menu cleanly
  await Category.deleteMany({ restaurantId: restaurant._id });
  await MenuItem.deleteMany({ restaurantId: restaurant._id });
  await Variant.deleteMany({ restaurantId: restaurant._id });
  console.log("Cleaned old menu entries.");

  let totalItemsCount = 0;
  for (let cIdx = 0; cIdx < MENU_DATA.length; cIdx++) {
    const catData = MENU_DATA[cIdx];
    const categoryDoc = await Category.create({
      restaurantId: restaurant._id,
      name: catData.category,
      sortOrder: cIdx,
      isActive: true,
    });

    for (const itemData of catData.items) {
      const menuItemDoc = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: categoryDoc._id,
        name: itemData.name,
        description: itemData.desc || "",
        price: itemData.price,
        images: [itemData.image],
        foodType: "veg",
        spicyLevel: itemData.name.toLowerCase().includes("chilli") || itemData.name.toLowerCase().includes("peri") || itemData.name.toLowerCase().includes("schezwan") ? 2 : 0,
        isRecommended: Boolean(itemData.variants || itemData.name.includes("Special") || itemData.name.includes("Thali")),
        isPopular: Boolean(itemData.name.includes("Paneer") || itemData.name.includes("Maggie") || itemData.name.includes("Mojito") || itemData.name.includes("Pizza")),
        isOutOfStock: false,
        isActive: true,
        variants: [],
        addons: [],
      });

      if (itemData.variants && itemData.variants.length > 0) {
        const variantIds = [];
        for (const v of itemData.variants) {
          const vDoc = await Variant.create({
            restaurantId: restaurant._id,
            menuItemId: menuItemDoc._id,
            name: v.name,
            price: v.price,
          });
          variantIds.push(vDoc._id);
        }
        menuItemDoc.variants = variantIds;
        await menuItemDoc.save();
      }
      totalItemsCount++;
    }
  }

  console.log(`\n🎉 SUCCESS! Populated ${MENU_DATA.length} Categories and ${totalItemsCount} Menu Items into Restaurant '${restaurant.name}'!`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Population failed:", err);
  process.exit(1);
});
