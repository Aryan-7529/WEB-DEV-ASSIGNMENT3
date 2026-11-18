require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start HTTP server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`  Inventory Management System Server Started`);
      console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Port        : ${PORT}`);
      console.log(`  Base URL    : http://localhost:${PORT}`);
      console.log(`=================================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('[Server] MongoDB connection closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection] ${err.name}: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`[Server Error] Startup failure: ${error.message}`);
    process.exit(1);
  }
};

startServer();
