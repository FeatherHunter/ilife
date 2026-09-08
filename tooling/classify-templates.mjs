// #118 模板分型 · 可复跑脚本（A5／D9）。
//
// 用途：把本仓全部 `packages/skill-*/templates/*.html` 按**冻结契约**逐一分型，证明
// 「数据页 6 ／ 内容页 53 ／ 遗留 6」且**不存在**「两类都不属于且非 legacy」的模板。
//
// 单一真相（FX-118-9）：判定规则**只读 `packages/base-render/dist/index.js` 的冻结常量**
//（`TEMPLATE_MARKERS`／`TEMPLATE_KINDS`／`TEMPLATE_KIND_RULE`／`PAYLOAD_SLOT_RULE`／
// `ASSET_WRAPPERS`／`ASSET_MARKER_KEYS`／`WRAP_PREDICATES`／`CONTAINER_CHECK_RULE`），
// 脚本内**不自带**任何标记字面量、分型字符串、包裹标签字面量或分型表副本——契约漂移会
// 立刻反映到输出（或前置自检直接报错）。因此跑之前必须先 `pnpm build`。
//
// 包裹不变量②的判定谓词与 #74 **共用** `WRAP_PREDICATES.forbidPreWrappedMarker`（FX-118-3）：
// 本脚本的 `wrapForm()` 是「按冻结谓词执行」的**唯一实现**，`method` 不符即前置失败。
//
// 用法：
//   node tooling/classify-templates.mjs                       # 打印分型表 ＋ 汇总
//   node tooling/classify-templates.mjs --inventory           # 另与清单逐条比对（默认 docs/research/t118-template-inventory.md）
//   node tooling/classify-templates.mjs --inventory <path>    # 指定清单路径
//
// 退出码：0 = 全部可归类（且清单比对一致）；1 = 有模板不可归类／与清单不一致；2 = 前置缺失（dist 未构建）。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'packages', 'base-render', 'dist', 'index.js');
const DEFAULT_INVENTORY = join(ROOT, 'docs', 'research', 't118-template-inventory.md');

if (!existsSync(DIST)) {
  console.error('[classify-templates] 缺 ' + DIST + '：先跑 `pnpm build`（分型判定读冻结常量，不自带副本）');
  process.exit(2);
}

const spec = await import(pathToFileURL(DIST).href);
const {
  TEMPLATE_MARKERS, TEMPLATE_KINDS, TEMPLATE_KIND_RULE, PAYLOAD_SLOT_RULE,
  ASSET_WRAPPERS, ASSET_MARKER_KEYS, WRAP_PREDICATES, CONTAINER_CHECK_RULE,
} = spec;
for (const [name, value] of Object.entries({
  TEMPLATE_MARKERS, TEMPLATE_KINDS, TEMPLATE_KIND_RULE, PAYLOAD_SLOT_RULE,
  ASSET_WRAPPERS, ASSET_MARKER_KEYS, WRAP_PREDICATES, CONTAINER_CHECK_RULE,
})) {
  if (value === undefined) {
    console.error('[classify-templates] 冻结常量缺失：' + name + '（dist 过期？重跑 `pnpm build`）');
    process.exit(2);
  }
}

// ── 冻结常量的前置自检（FX-118-3／FX-118-9：不共用则失败，而不是静默各写一份） ──

/** 不变量②的判定谓词：方式名必须与脚本实现一致；作用域必须在标记集内且排除 injectData。 */
const PRE_WRAP = WRAP_PREDICATES.forbidPreWrappedMarker;
if (PRE_WRAP.method !== 'enclosing-open-tag') {
  console.error('[classify-templates] 谓词方式漂移：' + PRE_WRAP.method + '（本脚本只实现 enclosing-open-tag）');
  process.exit(2);
}
for (const key of PRE_WRAP.scope) {
  if (!(key in TEMPLATE_MARKERS)) {
    console.error('[classify-templates] 不变量②作用域含非标记：' + key);
    process.exit(2);
  }
}
if (PRE_WRAP.scope.includes(CONTAINER_CHECK_RULE.appliesWhenMarker)) {
  console.error('[classify-templates] 不变量②作用域不得含 ' + CONTAINER_CHECK_RULE.appliesWhenMarker + '（容器是必需项，不是预包裹）');
  process.exit(2);
}
/** 资产键 ↔ 标记键映射必须与 `ASSET_WRAPPERS` 同键集。 */
for (const key of Object.keys(ASSET_WRAPPERS)) {
  if (!(key in ASSET_MARKER_KEYS)) {
    console.error('[classify-templates] ASSET_MARKER_KEYS 缺资产键：' + key);
    process.exit(2);
  }
}

/** 包裹标签名（**唯一真相源** `ASSET_WRAPPERS`；脚本不写 `<style`／`<script` 字面量）。 */
const WRAP_TAG_NAMES = [...new Set(Object.values(ASSET_WRAPPERS).map((w) => w.openTag.slice(1, -1)))];
/** payload 容器标签名（**唯一真相源** `CONTAINER_CHECK_RULE`）。 */
const CONTAINER_TAG_NAME = CONTAINER_CHECK_RULE.openTag.slice(1, -1);

/** 清单里的中文分型标签（与 `TEMPLATE_KINDS` **同序**；长度不符即前置失败，不静默漂移）。
 *  第三型的中文标签恒为「遗留」（FX-118-10②，三名并存已消除）。 */
const KIND_LABELS = ['数据页', '内容页', '遗留'];
if (KIND_LABELS.length !== TEMPLATE_KINDS.length) {
  console.error('[classify-templates] 中文分型标签数 ' + KIND_LABELS.length + ' ≠ TEMPLATE_KINDS ' + TEMPLATE_KINDS.length);
  process.exit(2);
}
/** 清单中文标签 → 契约分型（键序恒按 `TEMPLATE_KINDS`）。 */
const INVENTORY_KIND = Object.fromEntries(TEMPLATE_KINDS.map((k, i) => [KIND_LABELS[i], k]));

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

/** 标记的包裹形态：裸／`<style>` 包裹／`<script>` 包裹（取首个出现处）。
 *  判定方式 = `WRAP_PREDICATES.forbidPreWrappedMarker.method`（`enclosing-open-tag`：
 *  扫描标记左侧**全部前缀文本**，不限同行，故同行与跨行两种形态都命中）。 */
function wrapForm(text, literal) {
  const idx = text.indexOf(literal);
  if (idx < 0) return null;
  const before = text.slice(0, idx);
  for (const name of WRAP_TAG_NAMES) {
    if (before.lastIndexOf('<' + name) > before.lastIndexOf('</' + name)) return name;
  }
  return 'bare';
}

/** 标记所在的自带 payload 容器（首个出现处）：返回 { id, type } 或 null。
 *  标签名取 `CONTAINER_CHECK_RULE.openTag`，id／type 校验取同常量的 `id`／`type`。 */
function containerOf(text, literal) {
  const idx = text.indexOf(literal);
  if (idx < 0) return null;
  const before = text.slice(0, idx);
  const open = before.lastIndexOf('<' + CONTAINER_TAG_NAME);
  if (open < 0) return null;
  if (before.slice(open).includes(CONTAINER_CHECK_RULE.closeTag)) return null;
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
console.log('分型计数：' + TEMPLATE_KINDS.map((k, i) => KIND_LABELS[i] + ' ' + totals[k]).join(' ／ ') + ' ／ 合计 ' + totals.total);
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

/** 容器校验只在含 `injectData` 的模板上执行（`CONTAINER_CHECK_RULE.appliesWhenMarker`，FX-118-1），
 *  且 id／type 必须与 `CONTAINER_CHECK_RULE` 逐字一致。 */
const dataPagesWithoutContainer = rows.filter((r) => r.counts[CONTAINER_CHECK_RULE.appliesWhenMarker] === 1
  && (!r.container || r.container.id !== CONTAINER_CHECK_RULE.id || r.container.type !== CONTAINER_CHECK_RULE.type));
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
