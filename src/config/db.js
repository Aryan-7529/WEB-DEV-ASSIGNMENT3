const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_db';

    const conn = await mongoose.connect(mongoURI);

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB disconnected. Attempting reconnection...');
    });

    return conn;
  } catch (error) {
    console.error(`\n================================================================`);
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    console.error(`================================================================`);

    if (error.message.includes('ECONNREFUSED') || error.message.includes('127.0.0.1:27017')) {
      console.error(`
CAUSE:
  Your application tried connecting to a local MongoDB server at 127.0.0.1:27017,
  but no MongoDB server is currently installed or running on your computer.

HOW TO FIX:
  Option A: Use MongoDB Atlas (Recommended - Free & No local installation required)
    1. Sign up for free at https://www.mongodb.com/cloud/atlas
    2. Create a free shared M0 cluster and database user.
    3. Copy the connection string and paste it into your .env file:
       MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/inventory_db?retryWrites=true&w=majority

  Option B: Run MongoDB locally on macOS
    If Homebrew is installed:
      brew tap mongodb/brew
      brew install mongodb-community
      brew services start mongodb-community
================================================================\n`);
    }

    process.exit(1);
  }
};

module.exports = connectDB;
