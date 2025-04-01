import con from "./connection.js";

const pathToFiles = 'uploads/meals_analysis_req/';

// Sample data for meal analysis requests
const SampleMealAnalysisRequests = [
  {
    "person_id": "P001",
    "description": "Breakfast meal with toast and eggs",
    "weight_before": 450.5,
    "weight_after": 120.3,
    "picture_before": "breakfast_before.jpg",
    "picture_after": "breakfast_after.jpg",
    "products": [
      { "sku": "BRD001", "weight_in_req": 80.2 },
      { "sku": "EGG001", "weight_in_req": 120.5 },
      { "sku": "BTR001", "weight_in_req": 25.3 }
    ]
  },
  {
    "person_id": "P002",
    "description": "Lunch with cheese sandwich",
    "weight_before": 380.7,
    "weight_after": 95.2,
    "picture_before": "lunch_before.jpg",
    "picture_after": "lunch_after.jpg",
    "products": [
      { "sku": "BRD001", "weight_in_req": 160.0 },
      { "sku": "CHS001", "weight_in_req": 75.5 },
      { "sku": "BTR001", "weight_in_req": 20.0 }
    ]
  }
];

const createMealAnalysisTables = function() {
  return new Promise((resolve, reject) => {
    con.connect((err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log("Connected to MySQL");

      // Create meal_analysis_requests table
      const sqlCreateRequestsTable = `
        CREATE TABLE IF NOT EXISTS meal_analysis_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          person_id VARCHAR(50) NOT NULL,
          description TEXT,
          weight_before DECIMAL(8,2) NOT NULL,
          weight_after DECIMAL(8,2) NOT NULL,
          picture_before VARCHAR(255) NOT NULL,
          picture_after VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      con.query(sqlCreateRequestsTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("Meal analysis requests table created or already exists.");

        // Create meal_analysis_products junction table
        const sqlCreateProductsTable = `
          CREATE TABLE IF NOT EXISTS meal_analysis_products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id INT NOT NULL,
            product_sku VARCHAR(20) NOT NULL,
            weight_in_req DECIMAL(8,2) NOT NULL,
            FOREIGN KEY (request_id) REFERENCES meal_analysis_requests(id) ON DELETE CASCADE,
            FOREIGN KEY (product_sku) REFERENCES products(sku) ON DELETE CASCADE
          )
        `;

        con.query(sqlCreateProductsTable, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log("Meal analysis products junction table created or already exists.");

          // Insert sample data
          insertSampleData()
            .then(() => {
              console.log("Sample data inserted successfully");
              resolve();
            })
            .catch(error => {
              console.error("Error inserting sample data:", error);
              reject(error);
            });
        });
      });
    });
  });
};

// Function to insert sample data
const insertSampleData = function() {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if data already exists to avoid duplicates
      const [existingRows] = await queryPromise("SELECT COUNT(*) as count FROM meal_analysis_requests");
      
      if (existingRows.count > 0) {
        console.log("Sample data already exists, skipping insertion");
        return resolve();
      }

      // Insert each sample request and its products
      for (const request of SampleMealAnalysisRequests) {
        // Insert the main request record
        const sqlInsertRequest = `
          INSERT INTO meal_analysis_requests 
          (person_id, description, weight_before, weight_after, picture_before, picture_after) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await queryPromise(
          sqlInsertRequest, 
          [
            request.person_id, 
            request.description, 
            request.weight_before, 
            request.weight_after, 
            pathToFiles + request.picture_before, 
            pathToFiles + request.picture_after
          ]
        );
        
        const requestId = result.insertId;
        console.log(`Inserted meal analysis request ID: ${requestId}`);
        
        // Insert the associated products
        for (const product of request.products) {
          const sqlInsertProduct = `
            INSERT INTO meal_analysis_products
            (request_id, product_sku, weight_in_req)
            VALUES (?, ?, ?)
          `;
          
          await queryPromise(
            sqlInsertProduct, 
            [requestId, product.sku, product.weight_in_req]
          );
          
          console.log(`Inserted product ${product.sku} for request ID: ${requestId}`);
        }
      }
      
      // Display the inserted data
      console.log("Fetching inserted meal analysis requests:");
      const [requests] = await queryPromise("SELECT * FROM meal_analysis_requests");
      console.log("Meal Analysis Requests Table Data:", requests);
      
      console.log("Fetching inserted meal analysis products:");
      const [products] = await queryPromise("SELECT * FROM meal_analysis_products");
      console.log("Meal Analysis Products Table Data:", products);
      
      resolve();
    } catch (error) {
      console.error("Error in insertSampleData:", error);
      reject(error);
    }
  });
};

// Helper function to promisify database queries
const queryPromise = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    con.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve([result, null]);
    });
  });
};

export default createMealAnalysisTables;