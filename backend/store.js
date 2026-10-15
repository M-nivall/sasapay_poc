const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'storage');
const FILE = path.join(DIR, 'transactions.json');
fs.mkdirSync(DIR, { recursive: true });

function all() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function get(ref) {
  return all()[ref] || null;
}

// Merge fields into the record for ref (creates it if missing)
function save(ref, fields) {
  const data = all();
  data[ref] = { ...(data[ref] || {}), ...fields };
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function logCallback(payload) {
  fs.appendFileSync(
    path.join(DIR, 'callbacks.log'),
    new Date().toISOString() + ' ' + JSON.stringify(payload) + '\n'
  );
}

module.exports = { get, save, logCallback };
