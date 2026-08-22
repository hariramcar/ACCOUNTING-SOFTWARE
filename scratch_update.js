const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'actions');

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import if not present and if parseFloat/Number is used for math
  if ((content.includes('parseFloat(') || content.includes('Number(') || content.includes('Math.round(')) && !content.includes("from '@/lib/math'")) {
    content = "import { toDecimal, math } from '@/lib/math';\n" + content;
  }
  
  // A lot of manual regex logic might be dangerous. Let's just output the files that need manual attention.
  console.log(file, 'needs attention');
});
