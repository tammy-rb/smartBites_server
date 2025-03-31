import con from "./connection.js";

const ptf = 'uploads/product_pictures/';

const ProductsPictures = [
  { "sku": "MLK001", "imageUrl": "milk_plate.jpg", "weight": 1.2, "plateId": "PL001" },
  { "sku": "BRD001", "imageUrl": "bread_plate.jpg", "weight": 0.8, "plateId": "PL002" },
  { "sku": "CHS001", "imageUrl": "cheese_plate.jpg", "weight": 0.5, "plateId": "PL003" },
  { "sku": "BTR001", "imageUrl": "butter_plate.jpg", "weight": 0.3, "plateId": "PL004" },
  { "sku": "EGG001", "imageUrl": "eggs_plate.jpg", "weight": 1.0, "plateId": "PL005" }
];

const createProductPicturesTable = function () {
  return new Promise((resolve, reject) => {
    con.connect((err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log("Connected to MySQL");

      // Create product_pictures table with sku and plateId as foreign keys
      const sqlCreateTable = `
        CREATE TABLE IF NOT EXISTS product_pictures (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sku VARCHAR(20) NOT NULL,
          image_url VARCHAR(255) NOT NULL,
          weight DECIMAL(5,2) NOT NULL,
          plate_id VARCHAR(20) NOT NULL,
          FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE,
          FOREIGN KEY (plate_id) REFERENCES plates(plateId) ON DELETE CASCADE
        )
      `;

      con.query(sqlCreateTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("Product pictures table created or already exists.");

        // Insert data into product_pictures table
        const insertPromises = ProductsPictures.map(record => {
          return new Promise((resolve, reject) => {
            const sqlInsert = `INSERT INTO product_pictures (sku, image_url, weight, plate_id) VALUES (?, ?, ?, ?)`;
            con.query(sqlInsert, [record.sku, ptf + record.imageUrl, record.weight, record.plateId], (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              if (result.affectedRows > 0) {
                console.log(`Inserted product picture: SKU ${record.sku}, Plate ${record.plateId}`);
              }
              resolve();
            });
          });
        });

        // Wait for all insert operations to complete
        Promise.all(insertPromises)
          .then(() => {
            // Fetch and display table records
            con.query("SELECT * FROM product_pictures", (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              console.log("Product Pictures Table Data:", result);
              resolve();
            });
          })
          .catch(reject);
      });
    });
  });
};

export default createProductPicturesTable;