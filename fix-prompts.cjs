const fs = require('fs');
const path = require('path');

const providersDir = 'E:\\WorkSpace\\AI-base Projects\\AI-daily\\src\\providers';
const dirs = fs.readdirSync(providersDir, { withFileTypes: true }).filter(d => d.isDirectory());

for (const dir of dirs) {
  const adapterPath = path.join(providersDir, dir.name, 'adapter.ts');
  if (fs.existsSync(adapterPath)) {
    let content = fs.readFileSync(adapterPath, 'utf8');
    
    if (!content.includes('Return ONLY valid JSON and absolutely no other text before or after the JSON.')) {
      content = content.replace(
        'DO NOT return strings for numbers.',
        'DO NOT return strings for numbers.\\nReturn ONLY valid JSON and absolutely no other text before or after the JSON. No markdown formatting, no backticks.'
      );
      fs.writeFileSync(adapterPath, content);
      console.log(`Updated prompt in ${dir.name}`);
    }
  }
}
