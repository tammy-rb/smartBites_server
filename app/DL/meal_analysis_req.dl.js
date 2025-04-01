import con from "./connection.js";

class MealAnalysisReq_DL{

    // for each product in the list, return:
    // sku, name, list of its pictures (with their weights and plate data)
    static async getProductsBySkuList(skuList) {

        return new Promise((resolve, reject) => {
          if (!Array.isArray(skuList) || skuList.length === 0) {
            resolve([]);
            return;
          }
      
          const placeholders = skuList.map(() => '?').join(',');
          
          const sqlSelect = `
            SELECT p.sku, p.name, pp.id, pp.image_url, pp.weight, pp.plate_id,
                   pl.upperDiameter, pl.lowerDiameter, pl.depth
            FROM products p
            LEFT JOIN product_pictures pp ON p.sku = pp.sku
            LEFT JOIN plates pl ON pp.plate_id = pl.plateId
            WHERE p.sku IN (${placeholders})
          `;

          console.log("query", sqlSelect)
      
          con.query(sqlSelect, skuList, (err, results) => {
            if (err) {
              reject(err);
              return;
            }
      
            if (results.length === 0) {
              resolve([]); // No results found
              return;
            }
      
            // Group results by sku
            const groupedResults = {};
      
            results.forEach(item => {
              if (!groupedResults[item.sku]) {
                groupedResults[item.sku] = {
                  sku: item.sku,
                  name: item.name,
                  pictures: []
                };
              }
      
              // Only add picture if it exists (product might have no pictures)
              if (item.id) {
                groupedResults[item.sku].pictures.push({
                  id: item.id,
                  imageUrl: item.image_url,
                  weight: item.weight,
                  plateId: item.plate_id,
                  upperDiameter: item.upperDiameter,
                  lowerDiameter: item.lowerDiameter,
                  depth: item.depth
                });
              }
            });
      
            resolve(Object.values(groupedResults));
          });
        });
      }
      
    static async getAll() {
        return new Promise((resolve, reject) => {
          const sqlSelect = `
            SELECT p.sku, p.name, pp.id, pp.image_url, pp.weight, pp.plate_id, 
                   pl.upperDiameter, pl.lowerDiameter, pl.depth 
            FROM products p
            LEFT JOIN product_pictures pp ON p.sku = pp.sku
            LEFT JOIN plates pl ON pp.plate_id = pl.plateId
          `;
          
          con.query(sqlSelect, (err, results) => {
            if (err) {
              reject(err);
              return;
            }
            if (results.length === 0) {
              resolve([]);
              return;
            }
      
            // Group results by sku
            const groupedResults = results.reduce((acc, item) => {
              if (!acc[item.sku]) {
                acc[item.sku] = {
                  sku: item.sku,
                  name: item.name,
                  pictures: []
                };
              }
              if (item.id) { // Only add pictures if they exist
                acc[item.sku].pictures.push({
                  id: item.id,
                  imageUrl: item.image_url,
                  weight: item.weight,
                  plateId: item.plate_id,
                  upperDiameter: item.upperDiameter,
                  lowerDiameter: item.lowerDiameter,
                  depth: item.depth
                });
              }
              return acc;
            }, {});
            
            resolve(Object.values(groupedResults));
          });
        });
      }    
      
      // save the request in the db
      static saveAnalysisRequest(analysisRequest) {
        return new Promise((resolve, reject) => {
            const sqlInsertRequest = `
                INSERT INTO meal_analysis_requests
                (person_id, description, weight_before, weight_after, picture_before, picture_after)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
    
            con.query(
                sqlInsertRequest,
                [
                    analysisRequest.person_id,
                    analysisRequest.description,
                    analysisRequest.weight_before,
                    analysisRequest.weight_after,
                    analysisRequest.picture_before,
                    analysisRequest.picture_after
                ],
                (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
    
                    resolve({ id: result.insertId, ...analysisRequest });
                }
            );
        });
    }   
}

export default MealAnalysisReq_DL;

/*
import connection from "./connection.js";

class MealAnalysisReq_DL{

  static async getProductsBySkuList(skuList) {

    if (!Array.isArray(skuList) || skuList.length === 0) {
        return [];
    }
    
    try {
        const placeholders = skuList.map(() => '?').join(',');
        
        const [results] = await connection.query(`
            SELECT p.sku, p.name, pp.id, pp.image_url, pp.weight, pp.plate_id,
                   pl.upperDiameter, pl.lowerDiameter, pl.depth
            FROM products p
            LEFT JOIN product_pictures pp ON p.sku = pp.sku
            LEFT JOIN plates pl ON pp.plate_id = pl.plateId
            WHERE p.sku IN (${placeholders})
        `, skuList);
          console.log(results)
        if (results.length === 0) {
            return [];
        }

        // Group results by sku
        const groupedResults = {};
        console.log("results", results)
        results.forEach(item => {
            if (!groupedResults[item.sku]) {
                groupedResults[item.sku] = {
                    sku: item.sku,
                    name: item.name,
                    pictures: []
                };
            }

            // Only add picture if it exists (product might have no pictures)
            if (item.id) {
                groupedResults[item.sku].pictures.push({
                    id: item.id,
                    imageUrl: item.image_url,
                    weight: item.weight,
                    plateId: item.plate_id,
                    upperDiameter: item.upperDiameter,
                    lowerDiameter: item.lowerDiameter,
                    depth: item.depth
                });
            }
        });

        return Object.values(groupedResults);
    } catch(err){
      console.error(err);
    }
}

static async saveAnalysisRequest(analysisRequest) {
    
    try {
        await connection.beginTransaction();
        
        // Insert main analysis request
        const [result] = await connection.execute(`
            INSERT INTO meal_analysis_requests
            (person_id, description, weight_before, weight_after, picture_before, picture_after)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            analysisRequest.person_id,
            analysisRequest.description,
            analysisRequest.weight_before,
            analysisRequest.weight_after,
            analysisRequest.picture_before,
            analysisRequest.picture_after
        ]);
        
        const requestId = result.insertId;
        
        // Insert product relationship records
        for (const product of analysisRequest.products) {
            await connection.execute(`
                INSERT INTO meal_analysis_products
                (request_id, product_sku, weight_in_req)
                VALUES (?, ?, ?)
            `, [
                requestId,
                product.sku,
                product.weight_in_req
            ]);
        }
        
        await connection.commit();
        
        return {
            id: requestId,
            ...analysisRequest
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.end();
    }
  }
}

export default MealAnalysisReq_DL;*/