import con from "./connection.js";

const plates = [
  { "plateId": "PL001", "upperDiameter": 28, "lowerDiameter": 20, "depth": 3.5 },
  { "plateId": "PL002", "upperDiameter": 25, "lowerDiameter": 18, "depth": 3.0 },
  { "plateId": "PL003", "upperDiameter": 20, "lowerDiameter": 14, "depth": 2.5 },
  { "plateId": "PL004", "upperDiameter": 30, "lowerDiameter": 22, "depth": 4.0 },
  { "plateId": "PL005", "upperDiameter": 18, "lowerDiameter": 12, "depth": 2.0 },
  { "plateId": "PL006", "upperDiameter": 26, "lowerDiameter": 19, "depth": 3.2 },
  { "plateId": "PL007", "upperDiameter": 22, "lowerDiameter": 16, "depth": 2.8 },
  { "plateId": "PL008", "upperDiameter": 32, "lowerDiameter": 24, "depth": 4.5 },
  { "plateId": "PL009", "upperDiameter": 24, "lowerDiameter": 17, "depth": 3.0 },
  { "plateId": "PL010", "upperDiameter": 20, "lowerDiameter": 15, "depth": 2.3 },
];

const createPlatesTable = function () {
  return new Promise((resolve, reject) => {
    con.connect((err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log("Connected to MySQL");

      // Create plates table with plateId as primary key and measurement fields
      const sqlCreateTable = `
        CREATE TABLE IF NOT EXISTS plates (
          plateId VARCHAR(20) PRIMARY KEY,
          upperDiameter DECIMAL(5,2) NOT NULL,
          lowerDiameter DECIMAL(5,2) NOT NULL,
          depth DECIMAL(5,2) NOT NULL
        )
      `;

      con.query(sqlCreateTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("Plates table created or already exists.");

        // Insert data into plates table
        const insertPromises = plates.map(plate => {
          return new Promise((resolve, reject) => {
            const sqlInsert = `INSERT INTO plates (plateId, upperDiameter, lowerDiameter, depth) VALUES (?, ?, ?, ?)`;
            con.query(sqlInsert, [plate.plateId, plate.upperDiameter, plate.lowerDiameter, plate.depth], (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              if (result.affectedRows > 0) {
                console.log(`Inserted plate: ${plate.plateId} (Upper Diameter: ${plate.upperDiameter}cm, Lower Diameter: ${plate.lowerDiameter}cm, Depth: ${plate.depth}cm)`);
              }
              resolve();
            });
          });
        });

        // Wait for all insert operations to complete
        Promise.all(insertPromises)
          .then(() => {
            // Fetch and display table records
            con.query("SELECT * FROM plates", (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              console.log("Plates Table Data:", result);
              resolve();
            });
          })
          .catch(reject);
      });
    });
  });
};

export default createPlatesTable;