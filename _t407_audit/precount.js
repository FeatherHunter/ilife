const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();

const reAll = /<div class="ilife-block ilife-block-pre-block"><div class="ilife-block-pre-block-label">([\s\S]*?)<\/div><pre class="ilife-block-pre-block-code">([\s\S]*?)<\/pre><\/div>/g;
const reLoose = /<div class="ilife-block-pre-block-label">([\s\S]*?)<\/div>/g;
const rePre = /<pre\b[^>]*>/g;

let sumPre = 0, sumLabel = 0;
for (const f of files) {
  const raw = fs.readFileSync(DIR + f, 'utf8');
  const pres = raw.match(rePre) || [];
  const labels = [...raw.matchAll(reLoose)].map(m => m[1]);
  const wl = (raw.match(/<div class="ilife-block ilife-block-pre-block">/g) || []).length;
  const strict = [...raw.matchAll(reAll)];
  sumPre += pres.length; sumLabel += labels.length;
  console.log(f);
  console.log('   pre=' + pres.length + '  wrapperDiv=' + wl + '  labels=' + labels.length + '  strictMatch=' + strict.length
    + '  labels=' + JSON.stringify(labels.map(s => s.replace(/\s+/g, ' ').slice(0, 60))));
}
console.log('\nTOTAL pre=' + sumPre + '  TOTAL labels=' + sumLabel);
