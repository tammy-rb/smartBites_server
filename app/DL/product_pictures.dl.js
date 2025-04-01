import con from "./connection.js";

class ProductPicturesDL {
  static async create(productPicture) {
    return new Promise((resolve, reject) => {
      const sqlInsert = `INSERT INTO product_pictures (sku, image_url, weight, plate_id) VALUES (?, ?, ?, ?)`;
      con.query(
        sqlInsert,
        [productPicture.sku, productPicture.imageUrl, productPicture.weight, productPicture.plateId],
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id: result.insertId, ...productPicture });
        }
      );
    });
  }

  static async findBySku(sku) {
    return new Promise((resolve, reject) => {
      const sqlSelect = `
        SELECT pp.*, p.upperDiameter, p.lowerDiameter, p.depth 
        FROM product_pictures pp 
        JOIN plates p ON pp.plate_id = p.plateId 
        WHERE pp.sku = ?
      `;
      con.query(sqlSelect, [sku], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        if (results.length === 0) {
          resolve([]); // No results found
        } else {
          resolve(results); // Return results with plate details
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const sqlSelect = `
        SELECT pp.*, p.upperDiameter, p.lowerDiameter, p.depth 
        FROM product_pictures pp 
        JOIN plates p ON pp.plate_id = p.plateId 
        WHERE pp.id = ?
      `;
      con.query(sqlSelect, [id], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        if (results.length === 0) {
          resolve(null); // No result found
        } else {
          resolve(results[0]); // Return the first result with plate details
        }
      });
    });
  }

  static async getAll() {
    return new Promise((resolve, reject) => {
      const sqlSelect = `
        SELECT pp.*, p.upperDiameter, p.lowerDiameter, p.depth 
        FROM product_pictures pp 
        JOIN plates p ON pp.plate_id = p.plateId
      `;
      con.query(sqlSelect, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        if (results.length === 0) {
          resolve([]); // No results found
          return;
        }

        // Group results by sku
        const groupedResults = results.reduce((acc, item) => {
          if (!acc[item.sku]) {
            acc[item.sku] = {
              sku: item.sku,
              pictures: []
            };
          }
          acc[item.sku].pictures.push({
            id: item.id,
            imageUrl: item.image_url,
            weight: item.weight,
            plateId: item.plate_id,
            upperDiameter: item.upperDiameter,
            lowerDiameter: item.lowerDiameter,
            depth: item.depth
          });
          return acc;
        }, {});

        resolve(Object.values(groupedResults));
      });
    });
  }

  // Add a remove method to delete a product picture by its id
  static async remove(id) {
    return new Promise((resolve, reject) => {
      const sqlDelete = `DELETE FROM product_pictures WHERE id = ?`;
      con.query(sqlDelete, [id], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (result.affectedRows === 0) {
          resolve(false); // No rows were deleted, meaning the id didn't exist
        } else {
          resolve(true); // Successfully deleted the record
        }
      });
    });
  }

  // Add the removeAllBySku method to delete all product pictures by SKU
static async removeAllBySku(sku) {
    return new Promise((resolve, reject) => {
      const sqlDelete = `DELETE FROM product_pictures WHERE sku = ?`;
      con.query(sqlDelete, [sku], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (result.affectedRows === 0) {
          resolve(false); // No rows were deleted, meaning the SKU didn't exist
        } else {
          resolve(true); // Successfully deleted all records with the specified SKU
        }
      });
    });
  }
  
}

export default ProductPicturesDL;
