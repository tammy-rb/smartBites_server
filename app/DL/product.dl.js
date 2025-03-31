
import sql from './connection.js';

class Product {
  constructor(product) {
    if (product) {
      this.sku = product.sku;  // Unique stock-keeping unit (SKU)
      this.name = product.name;  // Product name
    }
  }

  // Create a new product
  static create(newProduct) {
    return new Promise((resolve, reject) => {
      // First, check if the SKU already exists
      sql.query("SELECT * FROM products WHERE sku = ?", [newProduct.sku], (err, res) => {
        if (err) {
          console.log("error: ", err);
          reject(err);
          return;
        }

        if (res.length > 0) {
          // If the SKU exists, reject the request
          reject({ kind: "sku_exists" });
          return;
        }
        console.log(newProduct)
        // If the SKU doesn't exist, insert the new product
        sql.query("INSERT INTO products SET ?", newProduct, (err, res) => {
          if (err) {
            console.log("error: ", err);
            reject(err);
            return;
          }
          console.log("Created product: ", { sku: newProduct.sku, ...newProduct });
          resolve({ sku: newProduct.sku, ...newProduct });
        });
      });
    });
  }

  // Find a product by SKU
  static findBySku(sku) {
    return new Promise((resolve, reject) => {
      sql.query("SELECT * FROM products WHERE sku = ?", sku, (err, res) => {
        if (err) {
          console.log("error: ", err);
          reject(err);
          return;
        }
        if (res.length) {
          console.log("Found product: ", res[0]);
          resolve(res[0]);
        } else {
          reject({ kind: "not_found" });
        }
      });
    });
  }

  // Get all products with optional filters
  static getAll(page = 1, limit = 10, sku, name) {
    return new Promise((resolve, reject) => {
      let query = "SELECT * FROM products";
      let conditions = [];
  
      if (sku) {
        conditions.push(`sku = '${sku}'`);
      }
      if (name) {
        conditions.push(`name LIKE '%${name}%'`);
      }
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
  
      if (limit !== Infinity) {
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }
  
      sql.query(query, (err, items) => {
        if (err) {
          console.log("error: ", err);
          reject(err);
          return;
        }
  
        // Get the total count of products for pagination
        let countQuery = "SELECT COUNT(*) AS total FROM products";
        if (conditions.length > 0) {
          countQuery += " WHERE " + conditions.join(" AND ");
        }
  
        sql.query(countQuery, (err, countResult) => {
          if (err) {
            console.log("error: ", err);
            reject(err);
            return;
          }
          // Number of all products
          const total = countResult[0].total;
          const totalPages = Math.ceil(total / limit);
  
          resolve({
            items,
            page,
            totalPages,
            total,
          });
        });
      });
    });
  }

  // Update an existing product by SKU
  static update(sku, product) {
    return new Promise((resolve, reject) => {
      sql.query(
        `UPDATE products 
         SET name = ? 
         WHERE sku = ?`,
        [
          product.name,
          sku
        ],
        (err, res) => {
          if (err) {
            console.log("error: ", err);
            reject(err);
            return;
          }
          if (res.affectedRows == 0) {
            reject({ kind: "not_found" });
            return;
          }
          console.log("Updated product: ", { sku, ...product });
          resolve({ sku, ...product });
        }
      );
    });
  }

  // Remove a product by SKU
  static remove(sku) {
    return new Promise((resolve, reject) => {
      sql.query("DELETE FROM products WHERE sku = ?", sku, (err, res) => {
        if (err) {
          console.log("error: ", err);
          reject(err);
          return;
        }
        if (res.affectedRows == 0) {
          reject({ kind: "not_found" });
          return;
        }
        console.log("Deleted product with SKU: ", sku);
        resolve(true);
      });
    });
  }
}

export default Product;
