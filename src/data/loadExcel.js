const path = require('path');
const XLSX = require('xlsx');

function readSheet(fileName, sheetName) {
  const filePath = path.join(__dirname, '../../data/excel', fileName);
  const workbook = XLSX.readFile(filePath);
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    throw new Error(`Sheet không tồn tại: ${name} trong ${fileName}`);
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

module.exports = { readSheet };