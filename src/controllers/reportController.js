const Product = require('../models/Product');
const ApiError = require('../utils/apiError');

/**
 * @desc    Generate low-stock alert report
 * @route   GET /api/reports/low-stock
 * @access  Public
 */
const getLowStockReport = async (req, res, next) => {
  try {
    const { category, threshold } = req.query;

    const pipeline = [];

    // Filter by category if provided
    if (category && category.trim() !== '') {
      pipeline.push({
        $match: { category: category.trim().toLowerCase() }
      });
    }

    // Determine low-stock condition: custom threshold or field lowStockThreshold
    if (threshold !== undefined && threshold !== '') {
      const parsedThreshold = Number(threshold);
      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        throw new ApiError(400, 'Threshold must be a valid non-negative number');
      }
      pipeline.push({
        $match: { stockQuantity: { $lte: parsedThreshold } }
      });
    } else {
      pipeline.push({
        $match: {
          $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
        }
      });
    }

    // Add projected fields for analysis (deficit, urgency level, valuation)
    pipeline.push(
      {
        $project: {
          name: 1,
          sku: 1,
          category: 1,
          price: 1,
          stockQuantity: 1,
          lowStockThreshold: 1,
          status: 1,
          deficit: {
            $max: [{ $subtract: ['$lowStockThreshold', '$stockQuantity'] }, 0]
          },
          inventoryValue: {
            $round: [{ $multiply: ['$price', '$stockQuantity'] }, 2]
          },
          urgency: {
            $cond: [
              { $eq: ['$stockQuantity', 0] },
              'CRITICAL_OUT_OF_STOCK',
              {
                $cond: [
                  { $lte: ['$stockQuantity', { $divide: ['$lowStockThreshold', 2] }] },
                  'HIGH_PRIORITY',
                  'MODERATE'
                ]
              }
            ]
          }
        }
      },
      {
        // Sort out of stock items first, then lowest stock
        $sort: { stockQuantity: 1, deficit: -1 }
      }
    );

    const lowStockItems = await Product.aggregate(pipeline);

    // Compute meta summary
    const summary = {
      totalAlerts: lowStockItems.length,
      outOfStockCount: lowStockItems.filter((i) => i.stockQuantity === 0).length,
      criticalUrgencyCount: lowStockItems.filter((i) => i.urgency === 'CRITICAL_OUT_OF_STOCK').length,
      highPriorityCount: lowStockItems.filter((i) => i.urgency === 'HIGH_PRIORITY').length,
      totalStockUnitsRemaining: lowStockItems.reduce((acc, item) => acc + item.stockQuantity, 0)
    };

    res.status(200).json({
      success: true,
      reportName: 'Low Stock Alert Report',
      generatedAt: new Date().toISOString(),
      summary,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate category-wise inventory summary using MongoDB aggregation
 * @route   GET /api/reports/category-summary
 * @access  Public
 */
const getCategorySummary = async (req, res, next) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stockQuantity' },
          totalInventoryValue: {
            $sum: { $multiply: ['$price', '$stockQuantity'] }
          },
          averagePrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$stockQuantity', '$lowStockThreshold'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$stockQuantity', 0] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalProducts: 1,
          totalStock: 1,
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
          averagePrice: { $round: ['$averagePrice', 2] },
          priceRange: {
            min: { $round: ['$minPrice', 2] },
            max: { $round: ['$maxPrice', 2] }
          },
          lowStockCount: 1,
          outOfStockCount: 1
        }
      },
      {
        $sort: { totalInventoryValue: -1 }
      }
    ];

    const categoryBreakdown = await Product.aggregate(pipeline);

    // Compute grand totals across all categories
    const grandTotals = categoryBreakdown.reduce(
      (acc, item) => {
        acc.totalCategories += 1;
        acc.totalProducts += item.totalProducts;
        acc.totalStockUnits += item.totalStock;
        acc.totalInventoryValuation += item.totalInventoryValue;
        acc.totalLowStockItems += item.lowStockCount;
        acc.totalOutOfStockItems += item.outOfStockCount;
        return acc;
      },
      {
        totalCategories: 0,
        totalProducts: 0,
        totalStockUnits: 0,
        totalInventoryValuation: 0,
        totalLowStockItems: 0,
        totalOutOfStockItems: 0
      }
    );

    grandTotals.totalInventoryValuation = Number(grandTotals.totalInventoryValuation.toFixed(2));

    res.status(200).json({
      success: true,
      reportName: 'Category-wise Inventory Summary',
      generatedAt: new Date().toISOString(),
      grandTotals,
      categoriesCount: categoryBreakdown.length,
      data: categoryBreakdown
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate high-level inventory overview report
 * @route   GET /api/reports/inventory-overview
 * @access  Public
 */
const getInventoryOverview = async (req, res, next) => {
  try {
    const [overview] = await Product.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStockUnits: { $sum: '$stockQuantity' },
                totalInventoryValuation: {
                  $sum: { $multiply: ['$price', '$stockQuantity'] }
                },
                averageProductPrice: { $avg: '$price' },
                lowStockCount: {
                  $sum: {
                    $cond: [{ $lte: ['$stockQuantity', '$lowStockThreshold'] }, 1, 0]
                  }
                },
                outOfStockCount: {
                  $sum: {
                    $cond: [{ $eq: ['$stockQuantity', 0] }, 1, 0]
                  }
                }
              }
            }
          ],
          categories: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 }
              }
            }
          ]
        }
      },
      {
        $project: {
          summary: { $arrayElemAt: ['$totals', 0] },
          categoryCount: { $size: '$categories' }
        }
      }
    ]);

    const summary = overview?.summary || {
      totalProducts: 0,
      totalStockUnits: 0,
      totalInventoryValuation: 0,
      averageProductPrice: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };

    res.status(200).json({
      success: true,
      reportName: 'Warehouse Inventory Overview',
      generatedAt: new Date().toISOString(),
      data: {
        totalProducts: summary.totalProducts || 0,
        totalStockUnits: summary.totalStockUnits || 0,
        totalInventoryValuation: Number((summary.totalInventoryValuation || 0).toFixed(2)),
        averageProductPrice: Number((summary.averageProductPrice || 0).toFixed(2)),
        lowStockItems: summary.lowStockCount || 0,
        outOfStockItems: summary.outOfStockCount || 0,
        totalActiveCategories: overview?.categoryCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLowStockReport,
  getCategorySummary,
  getInventoryOverview
};
