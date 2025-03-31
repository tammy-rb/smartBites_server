import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

//create a connection according  to the .env file
var connection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB
});

export default connection;
