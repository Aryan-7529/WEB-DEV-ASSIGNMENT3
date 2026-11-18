require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const connectDB = require('./config/db');

const sampleProducts = [
  // Electronics
  {
    name: 'Wireless Noise-Cancelling Headphones',
    sku: 'ELEC-WNC-001',
    description: 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.',
    category: 'electronics',
    price: 199.99,
    costPrice: 110.0,
    stockQuantity: 45,
    lowStockThreshold: 10,
    tags: ['audio', 'wireless', 'bluetooth', 'accessories']
  },
  {
    name: 'Mechanical Gaming Keyboard',
    sku: 'ELEC-MGK-002',
    description: 'RGB backlit mechanical keyboard with hot-swappable switches and detachable USB-C cable.',
    category: 'electronics',
    price: 89.99,
    costPrice: 45.0,
    stockQuantity: 8, // Low stock
    lowStockThreshold: 15,
    tags: ['gaming', 'peripheral', 'rgb', 'keyboard']
  },
  {
    name: 'Ultra HD 4K Monitor 27-inch',
    sku: 'ELEC-UHD-003',
    description: 'IPS panel with 144Hz refresh rate, HDR400, and ultra-thin bezels.',
    category: 'electronics',
    price: 349.5,
    costPrice: 220.0,
    stockQuantity: 0, // Out of stock
    lowStockThreshold: 5,
    tags: ['display', 'monitor', '4k', 'gaming']
  },
  {
    name: 'Fast Wireless Charging Pad 15W',
    sku: 'ELEC-WCP-004',
    description: 'Qi-certified fast wireless charger compatible with iOS and Android devices.',
    category: 'electronics',
    price: 24.99,
    costPrice: 9.5,
    stockQuantity: 120,
    lowStockThreshold: 20,
    tags: ['charging', 'wireless', 'phone accessories']
  },

  // Clothing
  {
    name: 'Classic Organic Cotton T-Shirt',
    sku: 'CLTH-OCT-101',
    description: '100% certified organic cotton crew neck t-shirt in regular fit.',
    category: 'clothing',
    price: 29.99,
    costPrice: 11.0,
    stockQuantity: 75,
    lowStockThreshold: 25,
    tags: ['apparel', 'organic', 'basics', 'cotton']
  },
  {
    name: 'Water-Resistant Winter Parka',
    sku: 'CLTH-WRP-102',
    description: 'Heavyweight insulated winter parka with faux-fur trim hood and fleece lining.',
    category: 'clothing',
    price: 159.0,
    costPrice: 80.0,
    stockQuantity: 3, // Low stock
    lowStockThreshold: 10,
    tags: ['outerwear', 'winter', 'jacket']
  },
  {
    name: 'Slim Fit Stretch Denim Jeans',
    sku: 'CLTH-SFD-103',
    description: 'Premium denim with 2% elastane for comfortable flexibility and everyday wear.',
    category: 'clothing',
    price: 69.95,
    costPrice: 28.0,
    stockQuantity: 50,
    lowStockThreshold: 15,
    tags: ['denim', 'jeans', 'casual']
  },

  // Groceries
  {
    name: 'Organic Fair-Trade Coffee Beans 1kg',
    sku: 'GROC-OFC-201',
    description: 'Medium roast Arabica whole beans harvested from high-altitude Ethiopian farms.',
    category: 'groceries',
    price: 22.5,
    costPrice: 12.0,
    stockQuantity: 90,
    lowStockThreshold: 20,
    tags: ['coffee', 'organic', 'beverages', 'fair-trade']
  },
  {
    name: 'Cold-Pressed Extra Virgin Olive Oil 750ml',
    sku: 'GROC-EVO-202',
    description: 'Single-estate unfiltered extra virgin olive oil from cold-pressed Koroneiki olives.',
    category: 'groceries',
    price: 18.99,
    costPrice: 9.0,
    stockQuantity: 4, // Low stock
    lowStockThreshold: 12,
    tags: ['cooking', 'oil', 'organic', 'pantry']
  },
  {
    name: 'Raw Unfiltered Forest Honey 500g',
    sku: 'GROC-RUH-203',
    description: 'Pure artisan forest honey packed with natural pollen and enzymes.',
    category: 'groceries',
    price: 14.25,
    costPrice: 7.5,
    stockQuantity: 0, // Out of stock
    lowStockThreshold: 10,
    tags: ['honey', 'sweetener', 'natural']
  },

  // Books
  {
    name: 'Designing Data-Intensive Applications',
    sku: 'BOOK-DDA-301',
    description: 'The definitive guide to the architecture of modern data storage and processing systems.',
    category: 'books',
    price: 49.99,
    costPrice: 28.0,
    stockQuantity: 30,
    lowStockThreshold: 8,
    tags: ['tech', 'databases', 'architecture', 'software']
  },
  {
    name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    sku: 'BOOK-CLC-302',
    description: 'Practical guide to writing clean, maintainable, and readable code.',
    category: 'books',
    price: 42.5,
    costPrice: 22.0,
    stockQuantity: 5, // Low stock
    lowStockThreshold: 10,
    tags: ['tech', 'programming', 'software engineering']
  },

  // Home & Kitchen
  {
    name: 'Stainless Steel Chef Knife 8-inch',
    sku: 'HOME-SSK-401',
    description: 'High-carbon Japanese steel kitchen knife with ergonomic pakkawood handle.',
    category: 'home & kitchen',
    price: 54.0,
    costPrice: 24.0,
    stockQuantity: 28,
    lowStockThreshold: 8,
    tags: ['kitchen', 'culinary', 'cutlery']
  },
  {
    name: 'Cast Iron Dutch Oven 6-Quart',
    sku: 'HOME-CDO-402',
    description: 'Enameled cast iron Dutch oven with lid for braising, baking, and stewing.',
    category: 'home & kitchen',
    price: 89.99,
    costPrice: 42.0,
    stockQuantity: 2, // Low stock
    lowStockThreshold: 6,
    tags: ['cookware', 'baking', 'cast-iron']
  },

  // Sports
  {
    name: 'High-Density Non-Slip Yoga Mat',
    sku: 'SPRT-HDY-501',
    description: '6mm eco-friendly TPE yoga mat with alignment guide lines and carrying strap.',
    category: 'sports',
    price: 34.99,
    costPrice: 14.0,
    stockQuantity: 65,
    lowStockThreshold: 15,
    tags: ['fitness', 'yoga', 'wellness', 'exercise']
  },
  {
    name: 'Adjustable Dumbbells Set 50lbs',
    sku: 'SPRT-ADB-502',
    description: 'Quick-adjust dumbbell pair replacing 15 sets of individual weights.',
    category: 'sports',
    price: 279.0,
    costPrice: 150.0,
    stockQuantity: 0, // Out of stock
    lowStockThreshold: 5,
    tags: ['fitness', 'strength', 'weights', 'gym']
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('[Seed] Clearing existing products...');
    await Product.deleteMany({});

    console.log(`[Seed] Inserting ${sampleProducts.length} sample products...`);
    // Save individually so Mongoose pre-save hooks execute and compute status correctly
    for (const prodData of sampleProducts) {
      const prod = new Product(prodData);
      await prod.save();
    }

    console.log('[Seed] Database successfully seeded with sample catalogue data!');

    const count = await Product.countDocuments();
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
    });
    const outOfStockCount = await Product.countDocuments({ stockQuantity: 0 });

    console.log('--------------------------------------------------');
    console.log(`  Total Products Seeded : ${count}`);
    console.log(`  Low Stock Items       : ${lowStockCount}`);
    console.log(`  Out of Stock Items    : ${outOfStockCount}`);
    console.log('--------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
