const express = require('express');
const router = express.Router();
const validateObjectId = require('../middleware/validateObjectId');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  restockProduct,
  recordSale,
  adjustStock,
  deleteProduct
} = require('../controllers/productController');

// Product collection routes
router.route('/')
  .post(createProduct)
  .get(getAllProducts);

// Specific product operations by ID
router.route('/:id')
  .get(validateObjectId('id'), getProductById)
  .put(validateObjectId('id'), updateProduct)
  .patch(validateObjectId('id'), updateProduct)
  .delete(validateObjectId('id'), deleteProduct);

// Stock adjustment routes (safe restock & sale operations)
router.post('/:id/restock', validateObjectId('id'), restockProduct);
router.post('/:id/sale', validateObjectId('id'), recordSale);
router.patch('/:id/stock', validateObjectId('id'), adjustStock);

module.exports = router;
