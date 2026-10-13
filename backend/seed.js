require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const connectDB = require('./config/db');

const seedProducts = [
  {
    name: 'Smartphone Pro Max',
    description: 'Latest high-end smartphone with incredible camera and battery life.',
    price: 999.99,
    category: 'Electronics',
    brand: 'TechCorp',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    stock: 50,
  },
  {
    name: 'Wireless Noise-Canceling Headphones',
    description: 'Premium over-ear headphones with active noise cancellation.',
    price: 299.99,
    category: 'Electronics',
    brand: 'SoundPro',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
    rating: 4.5,
    stock: 100,
  },
  {
    name: '4K Ultra HD Smart TV',
    description: '55-inch smart TV with stunning colors and smart features.',
    price: 499.99,
    category: 'Electronics',
    brand: 'VisionTech',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    stock: 20,
  },
  {
    name: 'Gaming Laptop RTX 4080',
    description: 'High performance gaming laptop for modern games.',
    price: 1899.99,
    category: 'Electronics',
    brand: 'GamerGear',
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    stock: 15,
  },
  {
    name: 'Smartwatch Series 8',
    description: 'Track your health, workouts and stay connected.',
    price: 399.99,
    category: 'Electronics',
    brand: 'TechCorp',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    stock: 45,
  },
  {
    name: 'Classic White Sneakers',
    description: 'Comfortable everyday sneakers that go with everything.',
    price: 89.99,
    category: 'Shoes',
    brand: 'StepUp',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
    rating: 4.4,
    stock: 200,
  },
  {
    name: 'Running Shoes Pro',
    description: 'Lightweight and durable running shoes for professionals.',
    price: 129.99,
    category: 'Shoes',
    brand: 'RunFast',
    image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    stock: 80,
  },
  {
    name: 'Leather Boots',
    description: 'Stylish leather boots for a modern look.',
    price: 159.99,
    category: 'Shoes',
    brand: 'UrbanStyle',
    image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=800&auto=format&fit=crop',
    rating: 4.5,
    stock: 40,
  },
  {
    name: 'Casual Slip-Ons',
    description: 'Easy to wear comfortable slip-on shoes.',
    price: 59.99,
    category: 'Shoes',
    brand: 'StepUp',
    image: 'https://images.unsplash.com/photo-1506544777-64cfbe1142df?q=80&w=800&auto=format&fit=crop',
    rating: 4.2,
    stock: 150,
  },
  {
    name: 'High Top Sneakers',
    description: 'Classic high top design with modern comfort.',
    price: 95.99,
    category: 'Shoes',
    brand: 'StepUp',
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop',
    rating: 4.3,
    stock: 60,
  },
  {
    name: 'Cotton T-Shirt',
    description: 'Basic 100% cotton t-shirt in various colors.',
    price: 19.99,
    category: 'Fashion',
    brand: 'BasicWear',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop',
    rating: 4.1,
    stock: 300,
  },
  {
    name: 'Denim Jacket',
    description: 'Classic blue denim jacket.',
    price: 79.99,
    category: 'Fashion',
    brand: 'UrbanStyle',
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    stock: 85,
  },
  {
    name: 'Slim Fit Jeans',
    description: 'Comfortable slim fit denim jeans.',
    price: 59.99,
    category: 'Fashion',
    brand: 'UrbanStyle',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop',
    rating: 4.4,
    stock: 120,
  },
  {
    name: 'Winter Puffer Coat',
    description: 'Warm and stylish puffer coat for cold weather.',
    price: 149.99,
    category: 'Fashion',
    brand: 'ColdWear',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    stock: 35,
  },
  {
    name: 'Summer Dress',
    description: 'Light floral dress perfect for summer days.',
    price: 49.99,
    category: 'Fashion',
    brand: 'SunnyStyle',
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop',
    rating: 4.5,
    stock: 65,
  },
  {
    name: 'Leather Wallet',
    description: 'Genuine leather bifold wallet with multiple card slots.',
    price: 39.99,
    category: 'Accessories',
    brand: 'LuxBrand',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    stock: 110,
  },
  {
    name: 'Polarized Sunglasses',
    description: 'Stylish sunglasses with UV protection.',
    price: 129.99,
    category: 'Accessories',
    brand: 'Shades',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    stock: 90,
  },
  {
    name: 'Stainless Steel Watch',
    description: 'Elegant analog watch with stainless steel band.',
    price: 199.99,
    category: 'Accessories',
    brand: 'TimePiece',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    stock: 55,
  },
  {
    name: 'Canvas Backpack',
    description: 'Durable backpack for everyday use.',
    price: 49.99,
    category: 'Accessories',
    brand: 'UrbanGear',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop',
    rating: 4.3,
    stock: 130,
  },
  {
    name: 'Beanie Hat',
    description: 'Warm knit beanie for winter.',
    price: 15.99,
    category: 'Accessories',
    brand: 'ColdWear',
    image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?q=80&w=800&auto=format&fit=crop',
    rating: 4.2,
    stock: 250,
  }
];

const seedDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Missing MONGODB_URI in .env');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('Clearing old products...');
    await Product.deleteMany({});
    
    console.log('Inserting new products...');
    await Product.insertMany(seedProducts);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
