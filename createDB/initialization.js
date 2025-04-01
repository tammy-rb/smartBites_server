import createPlatesTable from './createPlatesTable.js';
import createProductsTable from './createProductsTable.js';
import clearDBTables from './clearDB.js';
import createProductPicturesTable from './createProductsPicturesTable.js';
import createMealAnalysisTables from './createMealAnalysisTables.js';



/**
 * init the DB. assume the DB alreay exist. 
 * Clear all data from the database and reset it to its initial state
 */
const initialization = async function(result) {

  try {
    await clearDBTables();
    await createPlatesTable();
    await createProductsTable();
    await createProductPicturesTable();
    await createMealAnalysisTables();
    console.log("Database and tables created successfully.")
    result(null, "Database and tables created successfully");
  } catch (error) {
    console.error('Initialization error:', error);
    result(error, null);
  }
}

export default initialization;