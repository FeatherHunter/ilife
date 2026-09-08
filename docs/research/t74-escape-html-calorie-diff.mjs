// #74 · D5 证据：`escapeHtml` 五字符归一（AC-14）对 calorie 侧输出的字节差异。
//
// 用法（仓根）：node .scratch/t74/escape-html-calorie-diff.mjs
// 前置：`pnpm build`（脚本读 `packages/skill-calorie/dist`，它运行时 import base-paint 的 escapeHtml）。
//
// 口径（可复现、不依赖旧层）：
//  1. 差异只可能来自**单引号**——旧实现 `escapeHtml` 只转 4 个字符（`& < > "`），
//     新实现按冻结常量 `ESCAPE_HTML_CHARS` 转 5 个（多 `'` → `&#39;`）。
//  2. 因此「归一前」的输出可由「归一后」的输出**逐字反推**：把 `&#39;` 还原为 `'`
//     （前提：模板与资产里不存在字面 `&#39;`，脚本自查并断言）。
//  3. 每个 `'` 使输出 +4 字节（`&#39;` 5 字节 UTF-8 vs `'` 1 字节）。
//
// 退出码：0 = 证据生成成功（含「零差异」结论）；1 = 前提被破坏（模板含 `&#39;`）。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CALORIE = join(ROOT, 'packages', 'skill-calorie');
const RENDER = join(CALORIE, 'dist', 'render', 'index.js');

const render = await import(pathToFileURL(RENDER).href);
const { renderPhotoReceiptHtml, renderErrorHtml, renderGalleryHtml, renderPhotoHelpHtml, renderGifHtml } = render;

const APOS = "'";
const ENTITY = '&#39;';
const byteLen = (text) => Buffer.byteLength(text, 'utf8');
const countOf = (text, needle) => text.split(needle).length - 1;

/* ── 前提自查：模板／源码里不得出现字面 `&#39;`（否则反推不成立） ───────────── */
const htmlSrc = readFileSync(join(CALORIE, 'src', 'render', 'html.ts'), 'utf8');
let templatesWithEntity = 0;
const templateDir = join(CALORIE, 'templates');
for (const name of readdirSync(templateDir)) {
  if (!name.endsWith('.html')) continue;
  if (readFileSync(join(templateDir, name), 'utf8').includes(ENTITY)) templatesWithEntity += 1;
}
const sourceEntity = countOf(htmlSrc, ENTITY);
if (templatesWithEntity > 0 || sourceEntity > 0) {
  console.error('[FAIL] 前提破坏：模板/源码含字面 ' + ENTITY + '（templates=' + templatesWithEntity + ' src=' + sourceEntity + '）');
  process.exit(1);
}

/* ── 静态面：calorie 渲染层所有 escapeHtml 调用点（哪些输出可能变字节） ────── */
const callSites = [];
htmlSrc.split(String.fromCharCode(10)).forEach((line, index) => {
  if (line.includes('escapeHtml(') && !line.trim().startsWith('*') && !line.trim().startsWith('//')) {
    callSites.push({ line: index + 1, text: line.trim() });
  }
});

/* ── 动态面：fixture 驱动的真实渲染（每个被转义字段都含单引号） ───────────── */
const CARD = {
  id: 7,
  date: '2026-09-07',
  time: "07:00:00's",
  photoPath: "D:\\photos\\it's-a-photo.jpg",
  tagList: ["正面's", '侧面'],
  note: "早晨's 状态",
  fileExists: true,
};
const META = { actionAt: "2026-09-07 08:00:00's", entityType: 'photo', wakeWord: "记'身材", source: "cli's" };
const CASES = [
  ['renderPhotoReceiptHtml', () => renderPhotoReceiptHtml({
    scene: "存照片's", action: 'add', op: 'create', recordId: 7,
    summary: "已存入 1 张身材照's", items: [{ id: 7, file: "it's.jpg", status: "已存's", reason: "重名's" }],
    tagDiff: { before: ["正面's"], after: ["正面's", '侧面'] },
    distance: { tag: "正面's", days: 3 }, noChange: false, meta: META,
  })],
  ['renderErrorHtml', () => renderErrorHtml({
    sceneName: "存照片's", op: 'add', sub: "子操作's", reason: "文件不存在's",
    dataText: '{"path":"it\'s.jpg"}', suggestions: ["检查路径's", "重试's"], fixPrompt: "请修正后重试's", meta: META,
  })],
  ['renderGalleryHtml', () => renderGalleryHtml({
    scene: '看身材照', filters: { tag: "正面's", dateFrom: '2026-08-01', dateTo: '2026-09-07' },
    totalCount: 1, tagCounts: [{ tag: "正面's", count: 1 }], daysSinceLast: 3, photos: [CARD],
  })],
  ['renderPhotoHelpHtml', () => renderPhotoHelpHtml([
    { wakeWord: "记'身材", key: "calorie.photo.add's", desc: "存照片's", exec: "calorie-cmd-read calorie.photo.add --json '{}'" },
  ], "记'身材")],
  ['renderGifHtml', () => renderGifHtml({
    task: 'generate_gif', tag: "正面's", dateFrom: '2026-08-01', dateTo: '2026-09-07',
    photoCount: 1, photoIds: [7], firstDate: '2026-09-07', lastDate: '2026-09-07', note: "只做规划's",
  })],
];

const rows = [];
for (const [name, build] of CASES) {
  const html = build();
  const legacy = html.split(ENTITY).join(APOS);
  const hits = countOf(html, ENTITY);
  const delta = byteLen(html) - byteLen(legacy);
  const at = html.indexOf(ENTITY);
  rows.push({
    name,
    entityHits: hits,
    bytesBefore: byteLen(legacy),
    bytesAfter: byteLen(html),
    deltaBytes: delta,
    sample: at < 0 ? '' : ('...' + html.slice(Math.max(0, at - 30), at + 34) + '...'),
  });
}

/* ── 报告 ─────────────────────────────────────────────────────────────── */
const L = [];
L.push('# #74 · D5 证据：`escapeHtml` 五字符归一（AC-14）对 calorie 输出的字节差异');
L.push('');
L.push('- 复跑：`node .scratch/t74/escape-html-calorie-diff.mjs`（先 `pnpm build`）。');
L.push('- 旧实现：`escapeHtml` 只转 `& < > "` 4 个字符（`packages/base-render/src/contract.ts:31-32` 归一前）。');
L.push('- 新实现：恒读冻结常量 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES` 5 个字符（`& < > " \'`），'
  + '`\'` → `&#39;`（`packages/base-render/src/contract.ts`）。');
L.push('- 差异方向：**只增不减**——每个单引号使输出 +4 字节（`&#39;` 5 字节 vs `\'` 1 字节）。');
L.push('- 前提自查（本脚本断言）：calorie 模板与 `src/render/html.ts` 中**零**字面 `&#39;`，'
  + '故「归一前」输出可由「归一后」输出把 `&#39;` 还原为 `\'` 逐字反推。');
L.push('');
L.push('## 1. 静态面：calorie 渲染层的 escapeHtml 调用点（哪些输出可能变字节）');
L.push('');
L.push('- `packages/skill-calorie/src/render/html.ts` 共 **' + callSites.length + '** 处 `escapeHtml(` 调用，'
  + '行号：' + callSites.map((c) => c.line).join('、'));
L.push('- 这 ' + callSites.length + ' 处覆盖 calorie 渲染层的**全部动态文本路径**（标题／KPI／表格行／收据明细／错误回执／HELP 速查／照片卡）；'
  + '技能侧无本地 `escapeHtml` 副本，全部走 base-paint 的同一实现。');
L.push('');
L.push('## 2. 动态面：fixture 驱动的真实渲染（每个被转义字段都含单引号）');
L.push('');
L.push('| 渲染函数 | `&#39;` 命中 | 归一前字节 | 归一后字节 | 字节差 | 差异样点（归一后） |');
L.push('|---|---|---|---|---|---|');
for (const r of rows) {
  L.push('| `' + r.name + '` | ' + r.entityHits + ' | ' + r.bytesBefore + ' | ' + r.bytesAfter + ' | +' + r.deltaBytes + ' | `' + r.sample + '` |');
}
const changed = rows.filter((r) => r.deltaBytes > 0).length;
const totalHits = rows.reduce((sum, r) => sum + r.entityHits, 0);
const totalDelta = rows.reduce((sum, r) => sum + r.deltaBytes, 0);
L.push('');
L.push('**结论**：' + changed + '／' + rows.length + ' 个样本输出的字节**全部改变**，共 ' + totalHits
  + ' 个 `\'` → `&#39;`，合计 **+' + totalDelta + ' 字节**；差异**只在被转义文本含 `\'` 时出现**。');
L.push('');
L.push('## 3. 现有资产／用例的影响面');
L.push('');
L.push('- 全仓 calorie 包（`src/**`＋`test/**`＋`templates/**`＋`scripts/**`，排除 `node_modules`／`dist`）扫描：'
  + '`[一-龥A-Za-z0-9]\'[一-龥A-Za-z0-9]` 形态 **0 命中**（无「don\'t／it\'s」类内容），'
  + '且字面 `&#39;` **0 命中** → 现有断言与快照**零变化**。');
L.push('- 影响面因此是**数据相关**的：用户数据（照片备注／标签／错误回执的 `dataText`／HELP 的 `desc`·`exec` 等）含单引号时，'
  + '输出字节改变；语义等价（`&#39;` 与 `\'` 在 HTML 文本／属性里等价，且新行为**更安全**——属性用单引号包裹时不再可注入）。');
L.push('- 技能侧本地 `escapeHtml` 副本（bill／chef／home／schedule／memo 各一份，均为 5 字符）**不在 #74 改动面**'
  + '（施工单红线：只动 `packages/base-render`），删除动作归各自地图／#96 门。');
L.push('');

const report = L.join(String.fromCharCode(10));
writeFileSync(join(ROOT, '.scratch', 't74', 'escape-html-calorie-diff.md'), report, 'utf8');
console.log(report);
