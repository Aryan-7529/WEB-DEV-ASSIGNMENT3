const mongoose = require('mongoose');

const ALLOWED_CATEGORIES = [
  'electronics',
  'clothing',
  'groceries',
  'books',
  'home & kitchen',
  'sports',
  'beauty',
  'toys',
  'stationery',
  'other'
];

/**
 * Determines inventory status based on current stock and threshold.
 * @param {number} stock
 * @param {number} threshold
 * @returns {'out-of-stock' | 'low-stock' | 'in-stock'}
 */
const computeStatus = (stock, threshold) => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= threshold) return 'low-stock';
  return 'in-stock';
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    sku: {
      type: String,
      required: [true, 'SKU (Stock Keeping Unit) is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]+$/, 'SKU must contain only uppercase alphanumeric characters, hyphens, or underscores']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: ALLOWED_CATEGORIES,
        message: '"{VALUE}" is not a valid category. Allowed categories: ' + ALLOWED_CATEGORIES.join(', ')
      }
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
      default: 0
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock quantity must be an integer'
      }
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Low stock threshold cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Low stock threshold must be an integer'
      }
    },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock'],
      default: 'in-stock'
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true
        }
      ],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property: inventory valuation for this product
productSchema.virtual('totalValue').get(function () {
  return Number((this.price * this.stockQuantity).toFixed(2));
});

// Virtual property: flag if item is currently at or below low stock threshold
productSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity <= this.lowStockThreshold;
});

// Pre-save hook: auto-compute and synchronize inventory status
productSchema.pre('save', function (next) {
  this.status = computeStatus(this.stockQuantity, this.lowStockThreshold);
  next();
});

// Indexes for query performance and uniqueness
productSchema.index({ category: 1, price: 1 });
productSchema.index({ stockQuantity: 1, lowStockThreshold: 1 });
productSchema.index({ status: 1 });
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

// Static helper to compute status for external queries/updates
productSchema.statics.computeStatus = computeStatus;
productSchema.statics.allowedCategories = ALLOWED_CATEGORIES;

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
