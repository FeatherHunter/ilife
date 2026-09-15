const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();

for (const f of files) {
  const raw = fs.readFileSync(DIR + f, 'utf8');
  // all visible button texts (strip tags) between > and <
  const btns = [...raw.matchAll(/<button[^>]*>([^<]{0,60})<\/button>/g)].map(m => m[1].trim()).filter(Boolean);
  const uniq = [...new Set(btns)];
  console.log('### ' + f);
  console.log('   按钮可见文本: ' + JSON.stringify(uniq));
}
