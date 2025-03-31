import con from "./connection.js";

const products = [
  { "sku": "MLK001", "name": "milk" },
  { "sku": "BRD001", "name": "bread" },
  { "sku": "CHS001", "name": "cheese" },
  { "sku": "BTR001", "name": "butter" },
  { "sku": "EGG001", "name": "eggs" },
  { "sku": "RCE001", "name": "rice" },
  { "sku": "APL001", "name": "apple" },
  { "sku": "BNN001", "name": "banana" },
  { "sku": "CHK001", "name": "chicken" },
  { "sku": "FSH001", "name": "fish" },
  { "sku": "CRT001", "name": "carrot" },
  { "sku": "POT001", "name": "potato" },
  { "sku": "YGT001", "name": "yogurt" },
  { "sku": "ALM001", "name": "almonds" },
  { "sku": "TMT001", "name": "tomato" }
];

const createProductsTable = function () {
  return new Promise((resolve, reject) => {
    con.connect((err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log("Connected to MySQL");

      // Create products table with only sku as primary key and name
      const sqlCreateTable = `CREATE TABLE IF NOT EXISTS products (
        sku VARCHAR(20) PRIMARY KEY,   
        name VARCHAR(255) NOT NULL
      )`;

      con.query(sqlCreateTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("Products table created or already exists.");

        // Insert data into products table (only sku and name)
        const insertPromises = products.map(product => {
          return new Promise((resolve, reject) => {
            const sqlInsert = `INSERT INTO products (sku, name) VALUES (?, ?)`;
            con.query(sqlInsert, [product.sku, product.name], (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              if (result.affectedRows > 0) {
                console.log(`Inserted product: ${product.name} (SKU: ${product.sku})`);
              }
              resolve();
            });
          });
        });

        // Wait for all insert operations to complete
        Promise.all(insertPromises)
          .then(() => {
            // Fetch and display table records
            con.query("SELECT * FROM products", (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              console.log("Products Table Data:", result);
              resolve();
            });
          })
          .catch(reject);
      });
    });
  });
};

export default createProductsTable;
