import mysql from 'mysql2';
import connectionGlobals from './connectionGlobals.js'; // Importing the globals

/**
 * create DB FoodTrackAI
 * can use  and run it to make the DB
*/

const dbName = connectionGlobals.MYSQL_DB; 

var con = mysql.createConnection({
  host: connectionGlobals.MYSQL_HOST,
  user: connectionGlobals.MYSQL_USER, 
  password: connectionGlobals.MYSQL_PASSWORD, 
});

const createDB = function() {
  // Create database
  con.connect(function(err) {
    if (err) throw err;
    
    const query = 'CREATE DATABASE IF NOT EXISTS ??';
    con.query(query, [dbName], function (err, result) {
      if (err) {
        console.log("Some error occurred while creating DB");
        return;
      }
      console.log(`Database ${dbName} created or already exists`);
    });
  });
}

createDB();
export default createDB;

