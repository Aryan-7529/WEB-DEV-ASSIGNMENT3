const express = require('express');
const productRoutes = require('./routes/productRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health-check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Inventory and Data Management System API is active',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      reports: {
        lowStock: '/api/reports/low-stock',
        categorySummary: '/api/reports/category-summary',
        overview: '/api/reports/inventory-overview'
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/reports', reportRoutes);

// Catch 404 for undefined routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
