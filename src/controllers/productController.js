const Product = require('../models/Product');
const ApiError = require('../utils/apiError');

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Public
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, description, category, price, costPrice, stockQuantity, lowStockThreshold, tags } = req.body;

    const product = new Product({
      name,
      sku,
      description,
      category,
      price,
      costPrice,
      stockQuantity,
      lowStockThreshold,
      tags
    });

    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all products with filtering, sorting, and pagination
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      status,
      inStock,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const queryFilter = {};

    // 1. Text / Keyword Search across name, description, and SKU
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      queryFilter.$or = [{ name: regex }, { description: regex }, { sku: regex }];
    }

    // 2. Category Filter (case-insensitive exact match)
    if (category && category.trim() !== '') {
      queryFilter.category = category.trim().toLowerCase();
    }

    // 3. Price Range Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      queryFilter.price = {};
      if (minPrice !== undefined && minPrice !== '') {
        const parsedMin = Number(minPrice);
        if (isNaN(parsedMin) || parsedMin < 0) {
          throw new ApiError(400, 'minPrice must be a valid non-negative number');
        }
        queryFilter.price.$gte = parsedMin;
      }
      if (maxPrice !== undefined && maxPrice !== '') {
        const parsedMax = Number(maxPrice);
        if (isNaN(parsedMax) || parsedMax < 0) {
          throw new ApiError(400, 'maxPrice must be a valid non-negative number');
        }
        queryFilter.price.$lte = parsedMax;
      }
    }

    // 4. Stock Quantity Range Filter
    if (minStock !== undefined || maxStock !== undefined) {
      queryFilter.stockQuantity = {};
      if (minStock !== undefined && minStock !== '') {
        const parsedMinStock = Number(minStock);
        if (isNaN(parsedMinStock) || parsedMinStock < 0) {
          throw new ApiError(400, 'minStock must be a valid non-negative integer');
        }
        queryFilter.stockQuantity.$gte = parsedMinStock;
      }
      if (maxStock !== undefined && maxStock !== '') {
        const parsedMaxStock = Number(maxStock);
        if (isNaN(parsedMaxStock) || parsedMaxStock < 0) {
          throw new ApiError(400, 'maxStock must be a valid non-negative integer');
        }
        queryFilter.stockQuantity.$lte = parsedMaxStock;
      }
    }

    // 5. In-Stock Boolean Filter
    if (inStock !== undefined) {
      const isInStock = inStock === 'true' || inStock === '1';
      if (isInStock) {
        queryFilter.stockQuantity = { ...(queryFilter.stockQuantity || {}), $gt: 0 };
      } else {
        queryFilter.stockQuantity = { ...(queryFilter.stockQuantity || {}), $eq: 0 };
      }
    }

    // 6. Status Filter ('in-stock', 'low-stock', 'out-of-stock')
    if (status && status.trim() !== '') {
      const allowedStatuses = ['in-stock', 'low-stock', 'out-of-stock'];
      const normalizedStatus = status.trim().toLowerCase();
      if (!allowedStatuses.includes(normalizedStatus)) {
        throw new ApiError(400, `Invalid status filter. Allowed values: ${allowedStatuses.join(', ')}`);
      }
      queryFilter.status = normalizedStatus;
    }

    // 7. Tags Filter (match any provided tag)
    if (tags && tags.trim() !== '') {
      const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
      queryFilter.tags = { $in: tagList };
    }

    // 8. Sorting Configuration
    const allowedSortFields = ['createdAt', 'updatedAt', 'price', 'stockQuantity', 'name', 'sku', 'category'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' || sortOrder === '1' ? 1 : -1;
    const sortOptions = { [sortField]: sortDirection };

    // 9. Pagination Calculation
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    // Execute query and total count in parallel
    const [products, totalDocs] = await Promise.all([
      Product.find(queryFilter).sort(sortOptions).skip(skip).limit(parsedLimit),
      Product.countDocuments(queryFilter)
    ]);

    const totalPages = Math.ceil(totalDocs / parsedLimit) || 1;

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        totalDocs,
        limit: parsedLimit,
        totalPages,
        page: parsedPage,
        hasPrevPage: parsedPage > 1,
        hasNextPage: parsedPage < totalPages,
        prevPage: parsedPage > 1 ? parsedPage - 1 : null,
        nextPage: parsedPage < totalPages ? parsedPage + 1 : null
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, `Product not found with id '${req.params.id}'`);
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product details
 * @route   PUT /api/products/:id or PATCH /api/products/:id
 * @access  Public
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, `Product not found with id '${req.params.id}'`);
    }

    const updates = req.body;
    const fieldsToUpdate = [
      'name',
      'sku',
      'description',
      'category',
      'price',
      'costPrice',
      'stockQuantity',
      'lowStockThreshold',
      'tags'
    ];

    fieldsToUpdate.forEach((field) => {
      if (updates[field] !== undefined) {
        product[field] = updates[field];
      }
    });

    // Save triggers pre-save hook which recomputes status and runs schema validators
    const updatedProduct = await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely restock product inventory (atomic increment)
 * @route   POST /api/products/:id/restock
 * @access  Public
 */
const restockProduct = async (req, res, next) => {
  try {
    const { quantity, notes } = req.body;

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      throw new ApiError(400, 'Restock quantity must be a positive integer greater than zero.');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, `Product not found with id '${req.params.id}'`);
    }

    const previousStock = product.stockQuantity;
    product.stockQuantity += parsedQty;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Successfully restocked ${parsedQty} units.`,
      operation: {
        action: 'restock',
        addedQuantity: parsedQty,
        previousStock,
        newStock: product.stockQuantity,
        notes: notes || 'Standard restocking'
      },
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely record product sale / decrement stock atomically
 * @route   POST /api/products/:id/sale
 * @access  Public
 */
const recordSale = async (req, res, next) => {
  try {
    const { quantity, notes } = req.body;

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      throw new ApiError(400, 'Sale quantity must be a positive integer greater than zero.');
    }

    // Check if product exists first
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      throw new ApiError(404, `Product not found with id '${req.params.id}'`);
    }

    // Verify stock availability
    if (existing.stockQuantity < parsedQty) {
      throw new ApiError(
        400,
        `Insufficient stock for sale. Requested: ${parsedQty}, Available: ${existing.stockQuantity}.`
      );
    }

    // Atomic conditional decrement to eliminate race conditions
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        stockQuantity: { $gte: parsedQty }
      },
      [
        {
          $set: {
            stockQuantity: { $subtract: ['$stockQuantity', parsedQty] },
            status: {
              $cond: [
                { $eq: [{ $subtract: ['$stockQuantity', parsedQty] }, 0] },
                'out-of-stock',
                {
                  $cond: [
                    { $lte: [{ $subtract: ['$stockQuantity', parsedQty] }, '$lowStockThreshold'] },
                    'low-stock',
                    'in-stock'
                  ]
                }
              ]
            }
          }
        }
      ],
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      // Race condition occurred: stock was depleted concurrently
      const current = await Product.findById(req.params.id);
      throw new ApiError(
        400,
        `Concurrent update prevented sale. Current available stock is ${current ? current.stockQuantity : 0}.`
      );
    }

    const previousStock = existing.stockQuantity;

    res.status(200).json({
      success: true,
      message: `Successfully sold ${parsedQty} units.`,
      operation: {
        action: 'sale',
        soldQuantity: parsedQty,
        previousStock,
        newStock: updatedProduct.stockQuantity,
        revenue: Number((updatedProduct.price * parsedQty).toFixed(2)),
        notes: notes || 'Product sale'
      },
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    General stock adjustment endpoint supporting restock, sale, and set actions
 * @route   PATCH /api/products/:id/stock
 * @access  Public
 */
const adjustStock = async (req, res, next) => {
  try {
    const { action, quantity, notes } = req.body;

    if (!action || !['restock', 'sale', 'set'].includes(action)) {
      throw new ApiError(400, "Action is required and must be one of: 'restock', 'sale', 'set'.");
    }

    if (action === 'restock') {
      return restockProduct(req, res, next);
    }

    if (action === 'sale') {
      return recordSale(req, res, next);
    }

    // Action: 'set'
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 0) {
      throw new ApiError(400, "For action 'set', quantity must be a non-negative integer.");
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, `Product not found with id '${req.params.id}'`);
    }

    const previousStock = product.stockQuantity;
    product.stockQuantity = parsedQty;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Stock level explicitly set to ${parsedQty}.`,
      operation: {
        action: 'set',
        previousStock,
        newStock: parsedQty,
        notes: notes || 'Direct stock adjustment'
      },
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Public
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      throw new ApiError(404, `Product not found with id '${req.params.id}'`);
    }

    res.status(200).json({
      success: true,
      message: `Product '${product.name}' (SKU: ${product.sku}) deleted successfully`,
      data: {
        id: product._id,
        sku: product.sku,
        name: product.name
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  restockProduct,
  recordSale,
  adjustStock,
  deleteProduct
};
