const fs = require('fs');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync('./config.jsonc'));
  } catch (error) {
    const defaultConfig = {
      security: {
        ssl: false,
        encodingKey: "asddkdgfhdjkhfaldfhlda"
      },
      port: 8080,
      database: {
        host: "localhost",
        username: "root",
        password: "",
        dbname: "file_transfer_app",
        port: 3306
      }
    }
    fs.writeFileSync('./config.jsonc', JSON.stringify(defaultConfig));
    return defaultConfig;
  }
}

module.exports = loadConfig;
