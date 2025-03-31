import mysql from 'mysql2';
import connectionGlobals from './connectionGlobals.js'; 

const connection = mysql.createConnection({
    host: connectionGlobals.MYSQL_HOST,
    user: connectionGlobals.MYSQL_USER,
    password: connectionGlobals.MYSQL_PASSWORD,
    database: connectionGlobals.MYSQL_DB
});

export default connection;
