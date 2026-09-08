// #118 模板分型 · 可复跑脚本（A5／D9）。
//
// 用途：把本仓全部 `packages/skill-*/templates/*.html` 按**冻结契约**逐一分型，证明
// 「数据页 6 ／ 内容页 53 ／ 遗留 6」且**不存在**「两类都不属于且非 legacy」的模板。
//
// 单一真相：判定规则**只读 `packages/base-render/dist/index.js` 的冻结常量**
//（`TEMPLATE_MARKERS`／`TEMPLATE_KINDS`／`TEMPLATE_KIND_RULE`／`PAYLOAD_SLOT_RULE`），
// 脚本内**不自带**任何标记字面量或分型表副本——契约漂移会立刻反映到输出。
// 因此跑之前必须先 `pnpm build`（脚本会自检并给出提示）。
//
// 用法：
//   node tooling/classify-templates.mjs                       # 打印分型表 ＋ 汇总
//   node tooling/classify-templates.mjs --inventory           # 另与清单逐条比对（默认 .scratch/t118/template-inventory.md）
//   node tooling/classify-templates.mjs --inventory <path>    # 指定清单路径
//
// 退出码：0 = 全部可归类（且清单比对一致）；1 = 有模板不可归类／与清单不一致；2 = 前置缺失（dist 未构建）。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'packages', 'base-render', 'dist', 'index.js');
const DEFAULT_INVENTORY = join(ROOT, '.scratch', 't118', 'template-inventory.md');

if (!existsSync(DIST)) {
  console.error('[classify-templates] 缺 ' + DIST + '：先跑 `pnpm build`（分型判定读冻结常量，不自带副本）');
  process.exit(2);
}

const spec = await import(pathToFileURL(DIST).href);
const { TEMPLATE_MARKERS, TEMPLATE_KINDS, TEMPLATE_KIND_RULE, PAYLOAD_SLOT_RULE } = spec;
for (const [name, value] of Object.entries({ TEMPLATE_MARKERS, TEMPLATE_KINDS, TEMPLATE_KIND_RULE, PAYLOAD_SLOT_RULE })) {
  if (value === undefined) {
    console.error('[classify-templates] 冻结常量缺失：' + name + '（dist 过期？重跑 `pnpm build`）');
    process.exit(2);
  }
}

/** 清单里的中文分型标签 → 契约分型（`.scratch/t118/template-inventory.md` 用「其它」表示契约外的遗留资产）。 */
const INVENTORY_KIND = { 数据页: 'data-page', 内容页: 'content-page', 其它: 'legacy' };

const argv = process.argv.slice(2);
const wantInventory = argv.includes('--inventory');
const inventoryPath = (() => {
  if (!wantInventory) return null;
  const i = argv.indexOf('--inventory');
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : DEFAULT_INVENTORY;
})();

/** 逐字出现次数（契约标记为逐字匹配，区分大小写）。 */
const countOf = (text, literal) => text.split(literal).length - 1;

/** 标记的包裹形态：裸／`<style>` 包裹／`<script>` 包裹（取首个出现处）。 */
function wrapForm(text, literal) {
  const idx = text.indexOf(literal);
  if (idx < 0) return null;
  const before = text.slice(0, idx);
  const inStyle = before.lastIndexOf('<style') > before.lastIndexOf('</style');
  const inScript = before.lastIndexOf('<script') > before.lastIndexOf('</script');
  if (inStyle) return 'style';
  if (inScript) return 'script';
  return 'bare';
}

/** 标记所在的自带 payload 容器（首个出现处）：返回 { id, type } 或 null。 */
function containerOf(text, literal) {
  const idx = text.indexOf(literal);
  if (idx < 0) return null;
  const before = text.slice(0, idx);
  const open = before.lastIndexOf('<script');
  if (open < 0) return null;
  if (before.slice(open).includes('</script')) return null;
  const tag = text.slice(open, text.indexOf('>', open) + 1);
  const pick = (name) => new RegExp(name + '\\s*=\\s*"([^"]*)"').exec(tag)?.[1] ?? null;
  return { id: pick('id'), type: pick('type') };
}

/** 行号（1-based；LF 口径，与清单一致）。 */
function lineOf(text, literal) {
  const idx = text.indexOf(literal);
  return idx < 0 ? null : text.slice(0, idx).split(String.fromCharCode(10)).length;
}

/** 按冻结规则分型：required 各恰 1 次且 forbidden 各 0 次。 */
function kindsOf(counts) {
  return TEMPLATE_KINDS.filter((kind) => {
    const rule = TEMPLATE_KIND_RULE[kind];
    return rule.required.every((m) => counts[m] === 1) && rule.forbidden.every((m) => counts[m] === 0);
  });
}

const packagesDir = join(ROOT, 'packages');
const skills = readdirSync(packagesDir).filter((n) => n.startsWith('skill-')).sort();
const rows = [];

for (const skill of skills) {
  const dir = join(packagesDir, skill, 'templates');
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((n) => n.endsWith('.html')).sort()) {
    const text = readFileSync(join(dir, file), 'utf8');
    const counts = {};
    const marks = [];
    const wraps = {};
    for (const [key, literal] of Object.entries(TEMPLATE_MARKERS)) {
      const n = countOf(text, literal);
      counts[key] = n;
      if (n > 0) {
        marks.push(key + '@' + lineOf(text, literal));
        wraps[key] = wrapForm(text, literal);
      }
    }
    const kinds = kindsOf(counts);
    const container = containerOf(text, TEMPLATE_MARKERS.injectData);
    rows.push({ skill, file, counts, marks, wraps, kinds, container });
  }
}

const totals = { total: rows.length };
for (const kind of TEMPLATE_KINDS) totals[kind] = rows.filter((r) => r.kinds.length === 1 && r.kinds[0] === kind).length;

console.log('# #118 模板分型（冻结契约判定，可复跑）');
console.log('');
console.log('判定规则来源：' + TEMPLATE_KINDS.join(' ／ ') + '（`TEMPLATE_KIND_RULE`，required 须恰 1 次／forbidden 须 0 次）');
console.log('载荷槽规则：' + PAYLOAD_SLOT_RULE.members.join(' 与 ') + ' 恰有其一（`PAYLOAD_SLOT_RULE`）');
console.log('');
console.log('| 技能 | 模板 | 标记（行号） | 包裹形态 | 容器 | 分型 |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) {
  const kind = r.kinds.length === 1 ? r.kinds[0] : '（不可归类：' + r.kinds.length + ' 型命中）';
  const wrap = Object.entries(r.wraps).map(([k, v]) => k + '=' + v).join(' · ') || '—';
  const box = r.container ? r.container.id + '（type=' + r.container.type + '）' : '—';
  console.log('| ' + r.skill + ' | ' + r.file + ' | ' + r.marks.join(' · ') + ' | ' + wrap + ' | ' + box + ' | ' + kind + ' |');
}
console.log('');
console.log('## 汇总');
console.log('');
console.log('| 分型 | 数量 |');
console.log('|---|---|');
for (const kind of TEMPLATE_KINDS) console.log('| ' + kind + ' | ' + totals[kind] + ' |');
console.log('| **合计** | **' + totals.total + '** |');
console.log('');
console.log('分型计数：数据页 ' + totals['data-page'] + ' ／ 内容页 ' + totals['content-page'] + ' ／ 遗留 ' + totals.legacy + ' ／ 合计 ' + totals.total);
const perSkill = skills
  .map((s) => [s, rows.filter((r) => r.skill === s).length])
  .filter(([, n]) => n > 0)
  .map(([s, n]) => s + ' ' + n);
console.log('技能分布：' + perSkill.join(' · '));

let bad = 0;
const unclassifiable = rows.filter((r) => r.kinds.length !== 1);
if (unclassifiable.length > 0) {
  bad += 1;
  console.error('[FAIL] 不可归类的模板 ' + unclassifiable.length + ' 个：' + unclassifiable.map((r) => r.skill + '/' + r.file).join(', '));
} else {
  console.log('[OK] ' + rows.length + ' 个模板逐一命中且仅命中一型（无「两类都不属于且非 legacy」）');
}

const conflicted = rows.filter((r) => r.counts.injectData > 0 && r.counts.content > 0);
if (conflicted.length > 0) {
  bad += 1;
  console.error('[FAIL] 载荷槽冲突（同时含两标记）：' + conflicted.map((r) => r.skill + '/' + r.file).join(', '));
} else {
  console.log('[OK] 载荷槽零冲突（无模板同时含 INJECT-DATA 与 CONTENT）');
}

const dataPagesWithoutContainer = rows.filter((r) => r.counts.injectData === 1 && !r.container);
if (dataPagesWithoutContainer.length > 0) {
  bad += 1;
  console.error('[FAIL] 数据页缺自带 payload 容器：' + dataPagesWithoutContainer.map((r) => r.skill + '/' + r.file).join(', '));
} else {
  console.log('[OK] 数据页的 INJECT-DATA 全部落在自带容器内');
}

if (wantInventory) {
  if (!existsSync(inventoryPath)) {
    console.error('[FAIL] 清单不存在：' + inventoryPath);
    process.exit(1);
  }
  const text = readFileSync(inventoryPath, 'utf8');
  const expected = new Map();
  for (const raw of text.split(String.fromCharCode(10))) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length < 7) continue;
    if (cells[0] === '技能' || /^-+$/.test(cells[0])) continue;
    if (!cells[0].startsWith('skill-')) continue;
    expected.set(cells[0] + '/' + cells[1], cells[cells.length - 1]);
  }
  const mismatches = [];
  for (const r of rows) {
    const want = expected.get(r.skill + '/' + r.file);
    if (want === undefined) { mismatches.push(r.skill + '/' + r.file + '：清单无此条'); continue; }
    const mapped = INVENTORY_KIND[want] ?? want;
    const got = r.kinds.length === 1 ? r.kinds[0] : '（' + r.kinds.length + ' 型）';
    if (mapped !== got) mismatches.push(r.skill + '/' + r.file + '：清单=' + want + '(' + mapped + ') 脚本=' + got);
  }
  for (const key of expected.keys()) {
    if (!rows.some((r) => r.skill + '/' + r.file === key)) mismatches.push(key + '：脚本无此条');
  }
  if (mismatches.length > 0) {
    bad += 1;
    console.error('[FAIL] 与清单逐条比对不一致 ' + mismatches.length + ' 条：');
    for (const m of mismatches) console.error('  - ' + m);
  } else {
    console.log('[OK] 与清单逐条一致（' + expected.size + ' 条）：' + relative(ROOT, inventoryPath));
  }
}

process.exit(bad === 0 ? 0 : 1);
