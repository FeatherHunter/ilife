// t690 读数抽取：逐产物打「标题／副标题／胶囊／结论句／表行数／分类聚合／截断／来源脚注」，
// 供证据件与差异表引用。跑法：node docs/skills/skill-bill/t690-读数抽取.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const DIR = join(root, '.scratch', 't690-wall');
const manifest = JSON.parse(readFileSync(join(here, 't403-manifest.json'), 'utf8'));

const body = (h) => h.slice(h.indexOf('<body>'), h.indexOf('<script>'));
const one = (b, re) => { const m = re.exec(b); return m === null ? '—' : m[1].replace(/<[^>]+>/g, '').trim(); };
const all = (b, re) => [...b.matchAll(re)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());

console.log('| # | 产物 | 标题 | 副标题 | 胶囊 | 结论句 | 表行 | 分类聚合 | 截断 | 来源脚注 |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of manifest.rows) {
  const b = body(readFileSync(join(DIR, r.file), 'utf8'));
  const rows = /<tbody>([\s\S]*?)<\/tbody>/.exec(b);
  const nRows = rows === null ? 0 : (rows[1].match(/<tr>/g) ?? []).length;
  const dist = all(b, /<span class="ilife-block-dist-row-name">([\s\S]*?)<\/span>/g);
  const src = one(b, /<p class="ilife-block-caliber">(数据来源[\s\S]*?)<\/p>/);
  const cells = [
    String(r.seq), r.file,
    one(b, /<h1[^>]*>([\s\S]*?)<\/h1>/),
    one(b, /page-shell-subtitle"[^>]*>([\s\S]*?)<\/p>/),
    all(b, /<span class="ilife-block-chip">([\s\S]*?)<\/span>/g).join(' ／ '),
    one(b, /<p class="ilife-block-conclusion">([\s\S]*?)<\/p>/),
    String(nRows),
    dist.length === 0 ? '—' : String(dist.length) + ' 行：' + dist.join('、'),
    /ilife-block-disclosure-summary/.test(b) ? one(b, /<summary[^>]*>([\s\S]*?)<\/summary>/) : '—',
    src === '—' ? '—' : src.replace(/<[^>]+>/g, ''),
  ];
  console.log('| ' + cells.join(' | ') + ' |');
}
