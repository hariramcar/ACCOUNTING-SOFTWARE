const fs = require('fs');

const getLocalDateStringImpl = `\nfunction getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return \`\${year}-\${month}-\${day}\`;
}\n`;

const files = [
  'e:/hariram motor/accouting/software/src/app/inventory/SellVehicleModal.js',
  'e:/hariram motor/accouting/software/src/app/inventory/SellVehicleForm.js',
  'e:/hariram motor/accouting/software/src/app/inventory/AddVehicleModal.js',
  'e:/hariram motor/accouting/software/src/app/accounts/UpadModals.js',
  'e:/hariram motor/accouting/software/src/app/accounts/AgentPaymentModal.js'
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes("toISOString().split('T')[0]")) {
      content = content.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, 'getLocalDateString()');
      
      if (!content.includes('function getLocalDateString()')) {
         if (content.includes("'use client';")) {
             content = content.replace(/'use client';/, "'use client';" + getLocalDateStringImpl);
         } else if (content.includes('"use client";')) {
             content = content.replace(/"use client";/, '"use client";' + getLocalDateStringImpl);
         } else {
             content = getLocalDateStringImpl + content;
         }
      }
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}
