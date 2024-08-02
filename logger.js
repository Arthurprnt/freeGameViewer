const fs = require('fs');

function addZeroIfNeeded(value) {

    // Ajoute un zéro devant la valeur si elle est inférieure à 10
    // (pour avoir un beau format en XX:XX)
    if(value.toString().length === 1) {
        return `0${value}`;
    } else {
        return value;
    }

}

function logToFile(actual_date, message) {

  const logStream = fs.createWriteStream(`./logs/${addZeroIfNeeded(actual_date.getDate())}_${addZeroIfNeeded(actual_date.getMonth()+1)}_${addZeroIfNeeded(actual_date.getFullYear())}.txt`, { flags: 'a' });
  logStream.write(`${addZeroIfNeeded(actual_date.getHours())}:${addZeroIfNeeded(actual_date.getMinutes())}:${addZeroIfNeeded(actual_date.getSeconds())} | ${message}\n`);
  logStream.end();

}

const logger = {

  info: (file_name, message) => logToFile(`[INFO] ${file_name, message}`),
  warn: (file_name, message) => logToFile(`[WARN] ${file_name, message}`),
  error: (file_name, message) => logToFile(`[ERROR] ${file_name, message}`),

};

module.exports = logger;