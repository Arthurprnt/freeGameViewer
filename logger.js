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

function logToFile(message) {

  const date = new Date();
  const logStream = fs.createWriteStream(`./logs/${addZeroIfNeeded(date.getDate())}_${addZeroIfNeeded(date.getMonth()+1)}_${addZeroIfNeeded(date.getFullYear())}.txt`, { flags: 'a' });
  logStream.write(`${addZeroIfNeeded(date.getHours())}:${addZeroIfNeeded(date.getMinutes())}:${addZeroIfNeeded(date.getSeconds())} | ${message}\n`);
  logStream.end();

}

const logger = {

  info: (message) => logToFile(`[INFO] ${message}`),
  warn: (message) => logToFile(`[WARN] ${message}`),
  error: (message) => logToFile(`[ERROR] ${message}`),

};

module.exports = logger;