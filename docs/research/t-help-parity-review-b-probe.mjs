// 只读探针（审查席 B）：不写任何产物，只打印证据。用法：node docs/research/t-help-parity-review-b-probe.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NEW_FILE = path.join(ROOT, '.scratch/final-db/calorie_html/身材照HELP_20260909_234219.html');
const LEDGER = path.join(ROOT, '.scratch/t-parity/ledger.json');
const out = (...a) => console.log(...a);

// ── 1. 体积算术闭合 ────────────────────────────────────────────────────────────
const L = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const d = L.dimensions.D7;
const sumNew = d.fileMarkup + d.filePayload + d.fileCss + d.fileJs;
const sumOld = d.oldMarkup + d.oldPayload + d.oldCss + d.oldJs;
const dMarkup = d.fileMarkup - d.oldMarkup;
const dPayload = d.filePayload - d.oldPayload;
const dCss = d.fileCss - d.oldCss;
const dJs = d.fileJs - d.oldJs;
out('CHUNK new-sum', sumNew, 'fileTotal', d.fileTotal, 'residual', d.fileTotal - sumNew);
out('CHUNK old-sum', sumOld, 'oldTotal', d.oldTotal, 'residual', d.oldTotal - sumOld);
out('CHUNK delta-sum', dMarkup + dPayload + dCss + dJs, 'delta(总)', d.delta, 'gap', dMarkup + dPayload + dCss + dJs - d.delta);
out('CHUNK delta-parts', { dMarkup, dPayload, dCss, dJs });

// ── 2. 22 条 legacy 卡：卡级 code 内容 vs Sheet CLI ─────────────────────────────
const idChanged = L.dimensions.D3.idChanged;
const noCli = L.dimensions.D5.noCli;
const noCliWake = new Set(noCli.map((x) => x.wake_word));
out('LEGACY idChanged', idChanged.length, 'noCli∩legacy', idChanged.filter((x) => noCliWake.has(x.wake_word)).length);
for (const x of idChanged) {
  if (noCliWake.has(x.wake_word)) out('  BOTH-SIDES-CHECK', x.sgid, '|', x.wake_word, '| 新 id(=卡级 code) =', x.newId, '| Sheet CLI: 无');
}

if (fs.existsSync(NEW_FILE)) {
  const t = fs.readFileSync(NEW_FILE, 'utf8');
  const cardRe = /<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g;
  const cards = t.match(cardRe) ?? [];
  out('CARD count', cards.length);
  const probe = (needle) => {
    const hit = cards.filter((c) => c.includes(needle));
    out('CARD containing', JSON.stringify(needle), '->', hit.length);
    if (hit[0]) {
      const code = hit[0].match(/<code[^>]*>([\s\S]*?)<\/code>/g) ?? [];
      out('   code tags:', code.length, JSON.stringify(code.slice(0, 3)));
      const field = hit[0].match(/<li class="ilife-help-shell-field"[\s\S]*?<\/li>/g) ?? [];
      out('   field rows:', field.length, JSON.stringify(field.slice(0, 2)));
      const details = hit[0].includes('<details');
      out('   has <details>:', details);
    }
  };
  for (const n of ['mavis cron delete', 'mavis cron list', 'render_today_meals.py', 'render_review.py --type day']) probe(n);
  // 全局计数：卡级 code 行数 / 字段行数
  out('GLOBAL codeCli-ish', (t.match(/<code class="ilife-help-shell-cli">/g) ?? []).length);
  out('GLOBAL field rows', (t.match(/<li class="ilife-help-shell-field"/g) ?? []).length);
  out('GLOBAL details', (t.match(/<details class="ilife-help-shell-sheet"/g) ?? []).length);
  out('GLOBAL buttons', (t.match(/<button[^>]*>/g) ?? []).length);
} else {
  out('NEW_FILE missing', NEW_FILE);
}

// ── 3. inline 态的 data.mode / delivery.mode ───────────────────────────────────
for (const p of ['.scratch/t-parity/raw-file.out.json', '.scratch/t-parity/raw-inline.out.json', '.scratch/t-parity/raw-text.out.json']) {
  const fp = path.join(ROOT, p);
  if (!fs.existsSync(fp)) { out('ENV missing', p); continue; }
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  out('ENV', path.basename(p), JSON.stringify({ dataMode: j.data?.mode, bytes: j.data?.bytes, output: j.data?.output, delivery: j.delivery }));
}
