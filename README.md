# Inventory and Data Management System (RESTful Backend)

A robust, production-grade RESTful backend for an **Inventory and Data Management System** built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

Designed for stores, warehouses, and e-commerce platforms to manage product catalogues, track inventory levels with safe atomic concurrency, perform query-driven filtering/sorting/pagination, and generate analytical inventory reports using MongoDB aggregation pipelines.

---

## 📌 Table of Contents
- [Learning Objectives & Features](#-learning-objectives--features)
- [Technology Stack & Constraints](#-technology-stack--constraints)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Seeding the Database](#seeding-the-database)
  - [Running the Server](#running-the-server)
- [Data Model & Schema Design](#-data-model--schema-design)
- [API Reference](#-api-reference)
  - [1. Product CRUD Endpoints](#1-product-crud-endpoints)
  - [2. Stock Adjustment Endpoints (Safe Concurrency)](#2-stock-adjustment-endpoints-safe-concurrency)
  - [3. Inventory & Aggregation Reports](#3-inventory--aggregation-reports)
- [Querying, Filtering, Sorting & Pagination](#-querying-filtering-sorting--pagination)
- [Safe Concurrency & Overdraft Protection](#-safe-concurrency--overdraft-protection)
- [Centralized Error Handling](#-centralized-error-handling)
- [Sample cURL Test Suite](#-sample-curl-test-suite)

---

## 🎯 Learning Objectives & Features

| Requirement / Objective | Implementation |
| :--- | :--- |
| **Mongoose Schema & Validation** | Rich schema with field-level validators, regex for SKU, enums for categories/status, integer checks, and auto-computed status pre-save hooks. |
| **Complete CRUD Operations** | `POST`, `GET`, `GET :id`, `PUT`/`PATCH`, and `DELETE` for product resources. |
| **Filtering, Sorting & Pagination** | Multi-attribute filtering (regex search, category, price range, stock levels, tags), customizable sorting, and metadata-rich pagination. |
| **Aggregation Pipelines** | Multi-stage MongoDB aggregation pipelines (`$group`, `$project`, `$sort`, `$facet`, `$cond`) for category-wise summaries and warehouse overview. |
| **Low-Stock Alerts** | Dynamic query comparing `$stockQuantity` against `$lowStockThreshold` with deficit calculations and priority levels (`CRITICAL`, `HIGH_PRIORITY`, `MODERATE`). |
| **Safe Stock Adjustments** | Atomic conditional operations (`$inc`, `$subtract`, `{ stockQuantity: { $gte: quantity } }`) to prevent race conditions and overdrafts. |
| **Centralized Error Handling** | Single centralized error middleware parsing Mongoose `ValidationError`, `CastError`, duplicate key `E11000`, and 404s. |
| **Environment Variable Management** | Secure `.env` configuration via `dotenv`. |

---

## 🛠 Technology Stack & Constraints

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Configuration**: dotenv

> **Adherence to Constraints**:
> - strictly built using **Node.js, Express, Mongoose, and dotenv**.
> - Zero pre-built admin panels, CMS, or boilerplate templates.

---

## 📂 Project Architecture

```
├── .env                  # Environment variables (ignored by git)
├── .env.example          # Template for environment configuration
├── .gitignore            # Git ignore file
├── package.json          # Project configuration & npm scripts
├── README.md             # Complete documentation and API guide
└── src/
    ├── app.js            # Express application setup and middleware mounting
    ├── server.js         # HTTP server entry point and graceful shutdown
    ├── seed.js           # Database seed script with realistic inventory data
    ├── config/
    │   └── db.js         # Mongoose connection logic and event listeners
    ├── controllers/
    │   ├── productController.js  # CRUD, filtering, sorting, pagination, stock operations
    │   └── reportController.js   # MongoDB aggregation reports and low-stock alerts
    ├── middleware/
    │   ├── errorHandler.js       # Centralized error handler & 404 route handler
    │   └── validateObjectId.js   # Middleware for validating MongoDB ObjectId params
    ├── models/
    │   └── Product.js            # Mongoose schema, validation rules, hooks & virtuals
    ├── routes/
    │   ├── productRoutes.js      # RESTful route definitions for /api/products
    │   └── reportRoutes.js       # Analytical route definitions for /api/reports
    └── utils/
        └── apiError.js           # Custom operational error class
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) running locally or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.

### Installation
Clone or navigate to the project directory:
```bash
cd "WEB DEV ASSIGNMENT 3"
npm install
```

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your MongoDB connection string is correctly configured in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/inventory_db?retryWrites=true&w=majority
```

### Seeding the Database
Populate your database with realistic sample inventory products across diverse categories (including well-stocked, low-stock, and out-of-stock items):
```bash
npm run seed
```

### Running the Server
- **Production mode**:
  ```bash
  npm start
  ```
- **Development mode (with file watching)**:
  ```bash
  npm run dev
  ```
The server will start at `http://localhost:5000`.

---

## 📋 Data Model & Schema Design

### Product Schema (`src/models/Product.js`)

| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | **Yes** | Min 2, Max 100 chars, trimmed | Product display name |
| `sku` | String | **Yes** | Unique, uppercase, regex `/^[A-Z0-9_-]+$/` | Stock Keeping Unit identifier |
| `description` | String | No | Max 500 chars, trimmed | Detailed product description |
| `category` | String | **Yes** | Enum: `electronics`, `clothing`, `groceries`, `books`, `home & kitchen`, `sports`, `beauty`, `toys`, `stationery`, `other` | Product classification |
| `price` | Number | **Yes** | Min: `0` | Retail selling price |
| `costPrice` | Number | No | Min: `0`, Default: `0` | Cost of goods for valuation |
| `stockQuantity` | Number | **Yes** | Integer, Min: `0`, Default: `0` | Current available inventory count |
| `lowStockThreshold` | Number | No | Integer, Min: `0`, Default: `10` | Threshold that triggers low-stock alerts |
| `status` | String | Auto | Enum: `in-stock`, `low-stock`, `out-of-stock` | Auto-computed via pre-save hook |
| `tags` | [String]| No | Array of lowercase trimmed strings | Keywords for search & grouping |
| `createdAt` | Date | Auto | Timestamps enabled | Document creation date |
| `updatedAt` | Date | Auto | Timestamps enabled | Document last modification date |

### Dynamic Virtuals
- `totalValue`: Evaluates `price * stockQuantity` dynamically.
- `isLowStock`: Boolean indicating `stockQuantity <= lowStockThreshold`.

### Automatic Status Hook
Before saving, a Mongoose pre-save hook automatically updates `status`:
- `stockQuantity === 0` $\rightarrow$ `'out-of-stock'`
- `stockQuantity <= lowStockThreshold` $\rightarrow$ `'low-stock'`
- `stockQuantity > lowStockThreshold` $\rightarrow$ `'in-stock'`

---

## 📡 API Reference

### Health Check
- **`GET /`**: Returns API metadata and route directory.
- **`GET /health`**: Returns system uptime and timestamp.

---

### 1. Product CRUD Endpoints

#### Create Product
- **Route**: `POST /api/products`
- **Body**:
  ```json
  {
    "name": "Wireless Noise-Cancelling Headphones",
    "sku": "ELEC-WNC-001",
    "description": "Premium Bluetooth headphones",
    "category": "electronics",
    "price": 199.99,
    "costPrice": 110.00,
    "stockQuantity": 45,
    "lowStockThreshold": 10,
    "tags": ["audio", "wireless", "bluetooth"]
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": {
      "_id": "673c1...",
      "name": "Wireless Noise-Cancelling Headphones",
      "sku": "ELEC-WNC-001",
      "category": "electronics",
      "price": 199.99,
      "stockQuantity": 45,
      "lowStockThreshold": 10,
      "status": "in-stock",
      "totalValue": 8999.55,
      "isLowStock": false,
      "createdAt": "2026-11-18T17:00:00.000Z"
    }
  }
  ```

#### Get All Products (Filtering, Sorting, Pagination)
- **Route**: `GET /api/products`
- **Query Parameters**:
  - `search`: Keyword search matching `name`, `description`, or `sku`
  - `category`: Filter by category (e.g. `electronics`)
  - `minPrice` / `maxPrice`: Filter by price range
  - `minStock` / `maxStock`: Filter by stock quantity
  - `inStock`: `true` (stock > 0) or `false` (stock = 0)
  - `status`: `in-stock`, `low-stock`, or `out-of-stock`
  - `tags`: Filter by comma-separated tags (e.g. `wireless,gaming`)
  - `sortBy`: Field to sort by (`price`, `stockQuantity`, `createdAt`, `name`, `sku`) (Default: `createdAt`)
  - `sortOrder`: `asc` or `desc` (Default: `desc`)
  - `page`: Page number (Default: `1`)
  - `limit`: Items per page (Default: `10`, Max: `100`)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 10,
    "pagination": {
      "totalDocs": 16,
      "limit": 10,
      "totalPages": 2,
      "page": 1,
      "hasPrevPage": false,
      "hasNextPage": true,
      "prevPage": null,
      "nextPage": 2
    },
    "data": [ /* Array of Product objects */ ]
  }
  ```

#### Get Single Product by ID
- **Route**: `GET /api/products/:id`
- **Response (`200 OK`)**: Returns single product object.
- **Errors**: `400` if ID is invalid format; `404` if not found.

#### Update Product Details
- **Route**: `PUT /api/products/:id` or `PATCH /api/products/:id`
- **Body**: Any editable product fields (e.g., `{ "price": 179.99, "lowStockThreshold": 12 }`)
- **Response (`200 OK`)**: Returns updated product object.

#### Delete Product
- **Route**: `DELETE /api/products/:id`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Product 'Wireless Noise-Cancelling Headphones' (SKU: ELEC-WNC-001) deleted successfully",
    "data": {
      "id": "673c1...",
      "sku": "ELEC-WNC-001",
      "name": "Wireless Noise-Cancelling Headphones"
    }
  }
  ```

---

### 2. Stock Adjustment Endpoints (Safe Concurrency)

#### Restock Inventory (Safe Increment)
- **Route**: `POST /api/products/:id/restock`
- **Body**:
  ```json
  {
    "quantity": 25,
    "notes": "Delivered from Supplier Batch #409"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Successfully restocked 25 units.",
    "operation": {
      "action": "restock",
      "addedQuantity": 25,
      "previousStock": 8,
      "newStock": 33,
      "notes": "Delivered from Supplier Batch #409"
    },
    "data": { /* updated product */ }
  }
  ```

#### Record Sale (Safe Atomic Decrement with Overdraft Protection)
- **Route**: `POST /api/products/:id/sale`
- **Body**:
  ```json
  {
    "quantity": 3,
    "notes": "Retail store sale #10432"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Successfully sold 3 units.",
    "operation": {
      "action": "sale",
      "soldQuantity": 3,
      "previousStock": 8,
      "newStock": 5,
      "revenue": 269.97,
      "notes": "Retail store sale #10432"
    },
    "data": { /* updated product */ }
  }
  ```
- **Insufficient Stock Response (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "Insufficient stock for sale. Requested: 10, Available: 5."
  }
  ```

#### Unified Stock Adjustment
- **Route**: `PATCH /api/products/:id/stock`
- **Body**:
  ```json
  {
    "action": "restock",  // "restock" | "sale" | "set"
    "quantity": 10,
    "notes": "Stock adjustment"
  }
  ```

---

### 3. Inventory & Aggregation Reports

#### Low-Stock Alert Report
- **Route**: `GET /api/reports/low-stock`
- **Query Parameters**:
  - `category` *(optional)*: Filter report by category
  - `threshold` *(optional)*: Override the default product-level threshold
- **Features**:
  - Identifies items where `stockQuantity <= lowStockThreshold`.
  - Calculates the exact **deficit** (`lowStockThreshold - stockQuantity`).
  - Classifies urgency: `CRITICAL_OUT_OF_STOCK`, `HIGH_PRIORITY`, or `MODERATE`.
  - Sorts critical items to the top.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "reportName": "Low Stock Alert Report",
    "generatedAt": "2026-11-18T17:15:00.000Z",
    "summary": {
      "totalAlerts": 7,
      "outOfStockCount": 3,
      "criticalUrgencyCount": 3,
      "highPriorityCount": 4,
      "totalStockUnitsRemaining": 22
    },
    "count": 7,
    "data": [
      {
        "_id": "673c...",
        "name": "Ultra HD 4K Monitor 27-inch",
        "sku": "ELEC-UHD-003",
        "category": "electronics",
        "price": 349.5,
        "stockQuantity": 0,
        "lowStockThreshold": 5,
        "status": "out-of-stock",
        "deficit": 5,
        "inventoryValue": 0,
        "urgency": "CRITICAL_OUT_OF_STOCK"
      }
    ]
  }
  ```

#### Category-wise Inventory Summary (MongoDB Aggregation Pipeline)
- **Route**: `GET /api/reports/category-summary`
- **MongoDB Aggregation Pipeline Stages**:
  1. **`$group`**: Groups by `$category` and computes:
     - `totalProducts`: count of unique items
     - `totalStock`: sum of all units on hand
     - `totalInventoryValue`: sum of `price * stockQuantity`
     - `averagePrice`: average retail price
     - `minPrice` / `maxPrice`: price range
     - `lowStockCount`: count of items where `stockQuantity <= lowStockThreshold`
     - `outOfStockCount`: count of items where `stockQuantity == 0`
  2. **`$project`**: Rounds values to 2 decimal places and formats output.
  3. **`$sort`**: Sorts categories by `totalInventoryValue` descending.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "reportName": "Category-wise Inventory Summary",
    "generatedAt": "2026-11-18T17:15:00.000Z",
    "grandTotals": {
      "totalCategories": 6,
      "totalProducts": 16,
      "totalStockUnits": 599,
      "totalInventoryValuation": 29845.2,
      "totalLowStockItems": 7,
      "totalOutOfStockItems": 3
    },
    "categoriesCount": 6,
    "data": [
      {
        "category": "electronics",
        "totalProducts": 4,
        "totalStock": 173,
        "totalInventoryValue": 12698.05,
        "averagePrice": 166.12,
        "priceRange": { "min": 24.99, "max": 349.5 },
        "lowStockCount": 2,
        "outOfStockCount": 1
      },
      {
        "category": "clothing",
        "totalProducts": 3,
        "totalStock": 128,
        "totalInventoryValue": 6223.75,
        "averagePrice": 86.31,
        "priceRange": { "min": 29.99, "max": 159.0 },
        "lowStockCount": 1,
        "outOfStockCount": 0
      }
    ]
  }
  ```

#### Executive Inventory Overview
- **Route**: `GET /api/reports/inventory-overview`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "reportName": "Warehouse Inventory Overview",
    "generatedAt": "2026-11-18T17:15:00.000Z",
    "data": {
      "totalProducts": 16,
      "totalStockUnits": 599,
      "totalInventoryValuation": 29845.2,
      "averageProductPrice": 96.48,
      "lowStockItems": 7,
      "outOfStockItems": 3,
      "totalActiveCategories": 6
    }
  }
  ```

---

## 🔍 Querying, Filtering, Sorting & Pagination

The system provides flexible, query-string driven exploration:

### 1. Keyword Search
Search across product name, description, and SKU:
```http
GET /api/products?search=wireless
```

### 2. Category & Price Range
Filter for electronics between \$50 and \$200:
```http
GET /api/products?category=electronics&minPrice=50&maxPrice=200
```

### 3. Stock Level Filtering
Find out-of-stock items:
```http
GET /api/products?status=out-of-stock
```
Or products with available stock:
```http
GET /api/products?inStock=true
```

### 4. Sorting & Pagination
Fetch page 2 with 5 products per page, sorted by price ascending:
```http
GET /api/products?page=2&limit=5&sortBy=price&sortOrder=asc
```

---

## 🛡 Safe Concurrency & Overdraft Protection

In high-volume warehouses or concurrent web shops, multiple sales operations may arrive simultaneously. A naive implementation (fetching stock, checking in JavaScript, then saving) creates a **race condition** (Time-of-check to time-of-use vulnerability) where inventory can drop below zero.

### Our Solution
We employ **atomic conditional updates directly in the MongoDB engine**:
```javascript
const updatedProduct = await Product.findOneAndUpdate(
  {
    _id: productId,
    stockQuantity: { $gte: saleQuantity } // ATOMIC CHECK
  },
  [
    {
      $set: {
        stockQuantity: { $subtract: ['$stockQuantity', saleQuantity] },
        status: {
          $cond: [
            { $eq: [{ $subtract: ['$stockQuantity', saleQuantity] }, 0] },
            'out-of-stock',
            {
              $cond: [
                { $lte: [{ $subtract: ['$stockQuantity', saleQuantity] }, '$lowStockThreshold'] },
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
```

**Guarantees**:
1. **Zero Negative Stock**: MongoDB locks the document at the database engine level; the operation only executes if `stockQuantity >= saleQuantity`.
2. **Instant Status Synchronization**: The new status (`in-stock`, `low-stock`, or `out-of-stock`) is atomically calculated inside the pipeline update in the same operation.

---

## 🚨 Centralized Error Handling

All runtime and database errors pass through `src/middleware/errorHandler.js`, providing predictable error responses:

| Error Type | Status Code | Example Scenario | Output Format |
| :--- | :--- | :--- | :--- |
| **ValidationError** | `400 Bad Request` | Missing required `name`, negative `price`, non-integer stock | `{ "success": false, "message": "Validation failed...", "errors": { "field": "reason" } }` |
| **CastError** | `400 Bad Request` | Malformed ObjectId in URL parameter (e.g. `12345`) | `{ "success": false, "message": "Invalid product ID format..." }` |
| **Duplicate Key (11000)** | `409 Conflict` | Attempting to create duplicate `sku` | `{ "success": false, "message": "A product with sku '...' already exists." }` |
| **Operational ApiError**| Variable (e.g. `404`) | Resource not found or insufficient stock | `{ "success": false, "message": "Product not found..." }` |
| **Malformed JSON** | `400 Bad Request` | Client sends unparseable JSON payload | `{ "success": false, "message": "Invalid JSON payload..." }` |
| **Unhandled Errors** | `500 Server Error`| Unexpected system exception | `{ "success": false, "message": "Internal Server Error" }` |

---

## 🧪 Sample cURL Test Suite

Run these commands in your terminal to test all endpoints:

```bash
# 1. Server Health Check
curl -X GET http://localhost:5000/health

# 2. Create a New Product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smart Fitness Tracker Band",
    "sku": "SPRT-SFT-001",
    "description": "Waterproof fitness tracker with heart rate monitor",
    "category": "sports",
    "price": 49.99,
    "costPrice": 22.00,
    "stockQuantity": 15,
    "lowStockThreshold": 5,
    "tags": ["wearable", "fitness", "bluetooth"]
  }'

# 3. Get All Products (Filtered & Paginated)
curl -X GET "http://localhost:5000/api/products?category=electronics&sortBy=price&sortOrder=asc&page=1&limit=5"

# 4. Search Products
curl -X GET "http://localhost:5000/api/products?search=keyboard"

# 5. Restock Product (Replace :id with valid ObjectId)
curl -X POST http://localhost:5000/api/products/<PRODUCT_ID>/restock \
  -H "Content-Type: application/json" \
  -d '{"quantity": 20, "notes": "New delivery arrived"}'

# 6. Record Sale (Safe Decrement)
curl -X POST http://localhost:5000/api/products/<PRODUCT_ID>/sale \
  -H "Content-Type: application/json" \
  -d '{"quantity": 2, "notes": "Customer purchase"}'

# 7. Low-Stock Alert Report
curl -X GET http://localhost:5000/api/reports/low-stock

# 8. Category-wise Inventory Summary (Aggregation Pipeline)
curl -X GET http://localhost:5000/api/reports/category-summary

# 9. Executive Overview Report
curl -X GET http://localhost:5000/api/reports/inventory-overview

# 10. Delete Product
curl -X DELETE http://localhost:5000/api/products/<PRODUCT_ID>
```

---

## 📜 License
This project is open-source under the [ISC License](LICENSE).
