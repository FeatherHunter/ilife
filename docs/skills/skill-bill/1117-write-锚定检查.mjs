#!/usr/bin/env node
/** #1117 · 写入域回执 13 页「票据纸锚定判据」机器检查器（无依赖、只读产物）。
 *
 * 判据（票面 §判据 ①）：13 页逐页
 *   ① `<div class="ilife-bill-sheet-page ` 在位（票据纸族根类）；
 *   ② `✂ 裁切线` 在位；
 *   ③ 八件套块位在位——店头／虚线／主数字／主数字说明／落点账目行／核对卡／按钮区／纸外页脚。
 *
 * 用法：node docs/skills/skill-bill/1117-write-锚定检查.mjs <产物目录>
 *   正例：node docs/skills/skill-bill/1117-write-锚定检查.mjs .scratch/1117-write   # exit 0
 *   反例：改坏一处（少裁切线／少根类／少某一段）→逐页点名 ＋ exit 1。
 * 红线：本脚本**只读**产物，不写任何文件、不改产物、不碰 packages/。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/1117-write';
/** 本票 13 页（x02…x26 的偶数位，逐个点名；少一页、多一页都算红）。 */
const IDS = ['x02', 'x04', 'x06', 'x08', 'x10', 'x12', 'x14', 'x16', 'x18', 'x20', 'x22', 'x24', 'x26'];
/** 八件套块位（锚 ＝ 产物里的类名或字面量，逐件必须 ≥1 次）。 */
const BLOCKS = [
  ['店头', 'ilife-sheet-head'],
  ['虚线', 'ilife-ticket-rule'],
  ['主数字', 'ilife-ticket-summary'],
  ['主数字说明', 'ilife-ticket-summary-note'],
  ['落点账目行', 'ilife-block-ledger-rows'],
  ['核对卡', 'ilife-ticket-check'],
  ['按钮区', 'ilife-ticket-actions'],
  ['纸外页脚', 'ilife-ticket-foot'],
];
const ROOT_ANCHOR = '<div class="ilife-bill-sheet-page ';
const CUT = '✂ 裁切线';

/** 只留正文：样式段与脚本段整段去掉（锚只看 DOM）。 */
function bodyOf(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
}

const bad = [];
for (const id of IDS) {
  const file = join(SRC, id + '-真跑.html');
  if (!existsSync(file)) { bad.push(id + ' 缺产物 ' + file); continue; }
  const body = bodyOf(readFileSync(file, 'utf8'));
  const missing = [];
  if (!body.includes(ROOT_ANCHOR)) missing.push('票据纸根类');
  if (!body.includes(CUT)) missing.push('裁切线');
  for (const [name, anchor] of BLOCKS) if (!body.includes(anchor)) missing.push(name);
  if (missing.length > 0) bad.push(id + ' 缺 ' + missing.join('／'));
}
console.log('SCAN-ROOT: ' + SRC);
for (const id of IDS) console.log((bad.some((b) => b.startsWith(id + ' ')) ? 'RED  ' : 'PASS ') + id + ' 真跑产物');
console.log('RESULT: ' + (IDS.length - bad.length) + '/' + IDS.length + ' 页锚定判据在位');
if (bad.length > 0) {
  console.log('RED 锚定判据缺件：' + bad.join('；'));
  console.log('修法：节点 ① 根类 ＝ 回执支走 \`assembleSheetPage\`；② 裁切线 ＝ \`renderSheetFrame({cutLine:true,cutLineText:…})\`；③ 八件套 ＝ \`src/write/receiptPaper.ts\` 的块序（只此一处）。');
  process.exit(1);
}
console.log('PASS: 13 页逐页出票据纸根类 ＋ ✂ 裁切线 ＋ 八件套块位');
