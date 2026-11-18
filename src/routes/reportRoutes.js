const express = require('express');
const router = express.Router();
const {
  getLowStockReport,
  getCategorySummary,
  getInventoryOverview
} = require('../controllers/reportController');

// Reports routes
router.get('/low-stock', getLowStockReport);
router.get('/category-summary', getCategorySummary);
router.get('/inventory-overview', getInventoryOverview);

module.exports = router;
