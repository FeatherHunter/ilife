// rig1195
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const CLIENT = join(REPO, 'packages', 'plugin-manager', 'dist', 'client.js');
const PAGEJS = join(HERE, 'manual-1195-page.js');
const OUT = join(REPO, '.scratch', 'manual-1190', 'wall');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const bundleB64 = Buffer.from(readFileSync(CLIENT, 'utf8'), 'utf8').toString('base64');
const pageJs = readFileSync(PAGEJS, 'utf8').split('__BUNDLE_B64__').join(bundleB64);
function page(query) {
  const head = '<!doctype html><html><head><meta charset=utf8>';
  const css = '<style>body{background:#15130f;padding:20px;margin:0}';
  const css2 = '#panel{max-width:720px;margin:0 auto} #readout{display:none}</style>';
  const open = '<body><div id=panel></div><div id=readout></div>';
  const sc = '<scr' + 'ipt>' + pageJs + '</scr' + 'ipt></body></html>';
  return head + css + css2 + open + sc;
}
function readoutOf(dom) {
  const at = dom.indexOf('id="readout"');
  if (at < 0) return null;
  const gt = dom.indexOf('>', at);
  const end = dom.indexOf('</div', gt);
  if (gt < 0 || end < 0) return null;
  const raw = dom.slice(gt + 1, end).split('&quot;').join('"').split('&amp;').join('&');
  if (raw.indexOf('PAGEERROR:') === 0) return raw;
  return JSON.parse(raw);
}
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const isShots = process.argv.indexOf('--shots') >= 0;
if (!isShots) {
  const f = join(OUT, 'check.html');
  writeFileSync(f, page(''));
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--dump-dom', 'file:///' + f.split('\\').join('/')], { encoding: 'utf8', maxBuffer: 48 * 1024 * 1024 });
  const out = readoutOf(dom);
  if (typeof out === 'string') { console.log(out); process.exit(1); }
  if (!out) { console.log('M1195-RESULT=FAIL no-readout'); process.exit(1); }
  const line = out.spreads.map(function (s) { return s.tag + ':' + s.pages.join(',') + '/t' + s.tabs + '/ov' + s.overflowX; });
  console.log('M1195-READOUT=' + line.join(' '));
  console.log('M1195-RESULT=' + (out.ok ? 'PASS' : 'FAIL ' + out.fails.join(';')));
  process.exit(out.ok ? 0 : 1);
} else {
  writeFileSync(join(OUT, 'book-0.html'), page('?shot=1'));
  writeFileSync(join(OUT, 'book-2.html'), page('?shot=1&go=2'));
  console.log('M1195-PAGES=book-0.html book-2.html');
}