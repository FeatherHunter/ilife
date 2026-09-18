/** #394 · 融合样张判据（设计席，样张阶段）。
 *
 * 断言两张样张（throwaway，可双击打开，不进生产路径）：
 *  - S1 `docs/skills/skill-calorie/t156-样张-写后回执.html`：老技能写后回执优点 ＋ 新仓完整文档
 *  - S2 `docs/skills/skill-calorie/t156-样张-运动复盘.html`：老技能读页优点 ＋ 新仓完整文档
 * 两张都须有页内锚点导航＋可打印（`@media print`）。视觉好坏由用户点头，本脚本不做视觉判断。
 *
 * 老技能优点出处见 `docs/skills/skill-calorie/t156-老HTML盘点-写与汇总.md`（W1）
 * 与 `docs/skills/skill-calorie/t156-老HTML盘点-读页.md`（W2）；
 * 新仓优点出处见 `docs/skills/skill-calorie/t156-新仓HTML盘点.md`。
 *
 * 运行：`node packages/skill-calorie/test/t156-fusion-sample.test.mjs`
 * 输出机器摘要行 `RESULT: n/m`（通过数／总数），全绿 exit 0，否则 exit 1。
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const S1 = join(REPO, 'docs', 'skills', 'skill-calorie', 't156-样张-写后回执.html');
const S2 = join(REPO, 'docs', 'skills', 'skill-calorie', 't156-样张-运动复盘.html');

const files = { S1, S2 };
const html = {};
for (const [k, p] of Object.entries(files)) {
  html[k] = existsSync(p) ? readFileSync(p, 'utf8') : null;
}

/** 每条 = 一个判据。file: 'S1' | 'S2' | '*'。 */
const CHECKS = [
  // ── 新仓完整文档（两张逐张断言） ──
  { id: 'N1-doctype', file: 'S1', why: '新仓 docPage.ts:38 唯一整页模板', fn: (h) => h.startsWith('<!doctype html>') },
  { id: 'N1-doctype', file: 'S2', why: '新仓 docPage.ts:38 唯一整页模板', fn: (h) => h.startsWith('<!doctype html>') },
  { id: 'N2-charset', file: 'S1', why: '新仓 docPage.ts:39', fn: (h) => h.includes('charset="utf-8"') },
  { id: 'N2-charset', file: 'S2', why: '新仓 docPage.ts:39', fn: (h) => h.includes('charset="utf-8"') },
  { id: 'N3-style', file: 'S1', why: '新仓 docPage.ts:50 样式单源', fn: (h) => h.includes('<style>') },
  { id: 'N3-style', file: 'S2', why: '新仓 docPage.ts:50 样式单源', fn: (h) => h.includes('<style>') },
  { id: 'N4-script', file: 'S1', why: '新仓 buildSharedHelpersJs 运行时', fn: (h) => h.includes('<script>') },
  { id: 'N4-script', file: 'S2', why: '新仓 buildSharedHelpersJs 运行时', fn: (h) => h.includes('<script>') },
  { id: 'N5-page', file: 'S1', why: '新仓 docPage.ts:41 wrap ilife-page', fn: (h) => h.includes('ilife-page') },
  { id: 'N5-page', file: 'S2', why: '新仓 docPage.ts:41 wrap ilife-page', fn: (h) => h.includes('ilife-page') },
  { id: 'N6-noresid', file: 'S1', why: '新仓 assertDocPage 无残留标记', fn: (h) => !h.includes('<!--SHARED-CSS-->') && !h.includes('<!--INJECT-DATA-->') && !h.includes('<!--CONTENT-->') },
  { id: 'N6-noresid', file: 'S2', why: '新仓 assertDocPage 无残留标记', fn: (h) => !h.includes('<!--SHARED-CSS-->') && !h.includes('<!--INJECT-DATA-->') && !h.includes('<!--CONTENT-->') },
  { id: 'N7-copy3', file: 'S1', why: '新仓 copyArea.ts:111 恒开三格式，提示逐字取老仓 :43-45', fn: (h) => h.includes('data-fmt="text"') && h.includes('data-fmt="json"') && h.includes('data-fmt="csv"') && h.includes('纯文本') && h.includes('JSON') && h.includes('CSV') && h.includes('粘贴给 AI / 自己看') && h.includes('结构化存档') && h.includes('表格导入') },
  { id: 'N7-copy3', file: 'S2', why: '新仓 copyArea.ts:111 恒开三格式，提示逐字取老仓 :43-45', fn: (h) => h.includes('data-fmt="text"') && h.includes('data-fmt="json"') && h.includes('data-fmt="csv"') && h.includes('纯文本') && h.includes('JSON') && h.includes('CSV') && h.includes('粘贴给 AI / 自己看') && h.includes('结构化存档') && h.includes('表格导入') },
  { id: 'N8-anchors', file: 'S1', why: '补新老双缺：页内锚点导航（新仓盘点 §2 零命中）', fn: (h) => (h.match(/href="#sec-/g) || []).length >= 3 && (h.match(/id="sec-/g) || []).length >= 3 && h.includes('<nav') },
  { id: 'N8-anchors', file: 'S2', why: '补新老双缺：页内锚点导航（新仓盘点 §2 零命中）', fn: (h) => (h.match(/href="#sec-/g) || []).length >= 3 && (h.match(/id="sec-/g) || []).length >= 3 && h.includes('<nav') },
  { id: 'N9-print', file: 'S1', why: '补新老双缺：可打印（老全目录零命中 print／新仓 §2 零命中）', fn: (h) => h.includes('@media print') },
  { id: 'N9-print', file: 'S2', why: '补新老双缺：可打印（老全目录零命中 print／新仓 §2 零命中）', fn: (h) => h.includes('@media print') },
  // ── S1 老技能写后回执优点（逐处） ──
  { id: 'O-R1-metabar', file: 'S1', why: '老 crud_receipt.html:135-138 meta-bar＋type-badge', fn: (h) => h.includes('meta-bar') && h.includes('type-badge') },
  { id: 'O-R2-idcard', file: 'S1', why: '老 crud_receipt.html:143-151 id-card headline/icon/title/id', fn: (h) => h.includes('id-card') && h.includes('recordId') && h.includes('opTitle') },
  { id: 'O-R3-fourstate', file: 'S1', why: '老 crud_receipt.html:192-197 四态表驱动 opLabels/Colors/Icons', fn: (h) => h.includes('data-op=') && h.includes('opColors') && h.includes('新增') && h.includes('已更新') && h.includes('已删除') },
  { id: 'O-R4-diffcard', file: 'S1', why: '老 crud_receipt.html:155-158 diff-card 共用＋箭头占位对齐 :341', fn: (h) => h.includes('diff-card') && h.includes('diff-row') && h.includes('diff-old') && h.includes('diff-new') && h.includes('visibility:hidden') },
  { id: 'O-R5-ctxcard', file: 'S1', why: '老 crud_receipt.html:160-163 ctx-card 今日累计＋百分比 :378', fn: (h) => h.includes('ctx-card') && h.includes('今日累计') && h.includes('ctx-row') },
  { id: 'O-R6-kpi4', file: 'S1', why: '老汇总/目标 KPI 四格（summary :82-87／goal :78-83）', fn: (h) => h.includes('kpi-grid') && (h.match(/class="kpi"/g) || []).length >= 4 },
  { id: 'O-R7-undo', file: 'S1', why: '老 crud_receipt.html:414-429 可撤销才出现', fn: (h) => h.includes('undoBtn') && h.includes('undo_cli') },
  { id: 'O-R8-sumnums', file: 'S1', why: '老 crud_receipt.html:269 sum-nums 数字强调', fn: (h) => h.includes('sum-nums') },
  { id: 'O-R9-labels', file: 'S1', why: '老 crud_receipt.html:278-291 FIELD_LABELS 运动字段中文', fn: (h) => h.includes('运动类型') && h.includes('时长') && h.includes('消耗') },
  { id: 'O-R10-noempty', file: 'S1', why: '老 crud_receipt.html:213-222 无内容不留空卡', fn: (h) => h.includes('<script>') && h.includes("display") && h.includes("none") && h.includes('length') },
  { id: 'O-R11-src', file: 'S1', why: '老 exercise_summary.html:104 src 来源脚注（回执老件缺失，融合补上）', fn: (h) => h.includes('数据来源') },
  // ── S2 老技能读页优点（逐处） ──
  { id: 'O-C1-kpi4', file: 'S2', why: '老读页 KPI 四格（分布 :93-98／趋势 :82-87）', fn: (h) => h.includes('kpi-grid') && (h.match(/class="kpi"/g) || []).length >= 4 },
  { id: 'O-C2-oneline', file: 'S2', why: '老 recap.html:64 one-line 一句话结论', fn: (h) => h.includes('one-line') && h.includes('💬') },
  { id: 'O-C3-distbar', file: 'S2', why: '老 recap.html:107 零依赖分布条', fn: (h) => h.includes('dist-row') && h.includes('dist-fill') && h.includes('width:') },
  { id: 'O-C4-chips', file: 'S2', why: '老 recap.html:114 chip 高频运动', fn: (h) => h.includes('chip') && h.includes('×') },
  { id: 'O-C5-trend', file: 'S2', why: '老 trend.html:99-108 双指标叠柱＋title 读数', fn: (h) => h.includes('trend-bar') && h.includes('title=') },
  { id: 'O-C6-ring', file: 'S2', why: '老 goal_view.html:66-76 ring-card＋verdict 两态 :29-30', fn: (h) => h.includes('ring-card') && h.includes('ring-center') && h.includes('verdict') },
  { id: 'O-C7-catcolor', file: 'S2', why: '老 summary.html:14 --strength/--cardio/--flex/--daily 表图同源', fn: (h) => h.includes('--strength') && h.includes('--cardio') && h.includes('cat-strength') },
  { id: 'O-C8-statstable', file: 'S2', why: '老 summary.html:189-203 统计表＋合计＋占比迷你条 :46-47', fn: (h) => h.includes('bar-wrap') && h.includes('合计') && h.includes('<table') },
  { id: 'O-C9-src', file: 'S2', why: '老 summary.html:104／distribution.html:256 来源行', fn: (h) => h.includes('数据来源') },
  { id: 'O-C10-empty', file: 'S2', why: '老 strength.html:100／cardio.html:91 空态带唤醒词指引', fn: (h) => h.includes('暂无') && (h.includes('记力量训练') || h.includes('记有氧运动') || h.includes('记运动')) },
  { id: 'O-C11-nums', file: 'S2', why: '老 summary.html:40-41 tabular-nums 数字对齐', fn: (h) => h.includes('tabular-nums') },
  { id: 'O-C12-caliber', file: 'S2', why: '老 strength.html:71／goal_view.html:99 口径写标题', fn: (h) => h.includes('口径') },
];

let pass = 0;
for (const c of CHECKS) {
  const h = html[c.file];
  let ok = false;
  let note = '';
  try {
    assert.ok(h !== null, c.file + ' 样张文件不存在');
    ok = c.fn(h);
    assert.ok(ok, '结构缺失');
    pass += 1;
    console.log('CHECK ' + c.id + ' [' + c.file + ']: PASS ' + c.why);
  } catch (e) {
    note = e.message || String(e);
    console.log('CHECK ' + c.id + ' [' + c.file + ']: FAIL ' + c.why + ' ｜ ' + note);
  }
}
console.log('RESULT: ' + pass + '/' + CHECKS.length);
process.exit(pass === CHECKS.length ? 0 : 1);
