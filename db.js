const mysql = require('mysql2/promise');
const configLoader = require('./configLoader');

const configs = configLoader();

const host = configs.database.host;
const username = configs.database.username;
const password = configs.database.password;
const dbname = configs.database.dbname;

const pool = mysql.createPool({
  host: host,
  user: username,
  password: password,
  database: dbname,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
