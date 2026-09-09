const path = require('path');
const XLSX = require('xlsx');

function readSheet(fileName, sheetName) {
  const filePath = path.join(__dirname, '../../data/excel', fileName);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function rowsToMap(rows, idKey = 'id') {
  const map = {};
  for (const row of rows) {
    if (!row[idKey]) continue;
    map[String(row[idKey]).trim()] = row;
  }
  return map;
}

module.exports = { readSheet, rowsToMap };