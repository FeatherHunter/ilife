const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();

const reBlock = /<div class="ilife-block ilife-block-pre-block"><div class="ilife-block-pre-block-label">([^<]*)<\/div><pre class="ilife-block-pre-block-code">([\s\S]*?)<\/pre><\/div>/g;

for (const f of files) {
  const raw = fs.readFileSync(DIR + f, 'utf8');
  const blocks = [...raw.matchAll(reBlock)];
  console.log('### ' + f + '   preBlocks=' + blocks.length);
  for (const m of blocks) {
    const start = m.index + m[0].length;
    const after = raw.slice(start, start + 500);
    const btnM = /复制给助手：([^<"]*)/.exec(after);
    const btnLabel = btnM ? btnM[1] : '(none)';
    const copyLog = /ilife-copy-log/.test(after);
    const firstCmd = (/bill-[a-z.-]+/.exec(m[2]) || ['-'])[0];
    const hasCmd = /bill-cmd-read/.test(m[2]);
    console.log('   label="' + m[1] + '"  firstTok=' + firstCmd + '  hasCmdRead=' + hasCmd + '  btnLabel="' + btnLabel + '"  copyLogNearby=' + copyLog);
  }
}
