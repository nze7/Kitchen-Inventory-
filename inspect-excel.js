const XLSX = require('xlsx');

const wb = XLSX.readFile('Inventory sheet WIP 582026.xlsx');
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws);
  console.log(`\n${name}:`);
  console.log('Headers:', Object.keys(data[0] || {}));
  console.log('Sample rows:', JSON.stringify(data.slice(0, 5), null, 2));
});
