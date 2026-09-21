#!/usr/bin/env node
/**
 * #765 第三轮机（收尾检查与调整）：把二轮补票自己引入的三处不一致修掉，并补齐两条判据。
 *
 * 修的四件事：
 *   1. **票序 → 票号**：二轮新票（16／17／18）正文里的产物文件名写成了 `t16-`／`t17-`／`t18-`，
 *      而全图口径是**票号**（`t208-`／`t369-` 那一套）。三张票分别是 #839／#840／#841。
 *   2. **占位落地**：7 张域票里 `t<票号>-册子片段.json` 与 `.scratch/t<票号>/` 的占位换成真票号。
 *   3. **补判据**：域票加「代码层 UI 审查清单逐条过」（D3 的执行面）；票 13 加「未过质量门的页不进墙」。
 *   4. **票 3 改名**：它现在承载的不只是页面族，还有整个技术质量门。
 *
 * 每处改动都带**锚点唯一性断言**（出现次数 ≠ 1 即中断），改完逐票推回并线上复核。
 *
 * 用法：node docs/skills/skill-chef/t765-v3.mjs --map 765 [--push-map]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const ticketsJsonPath = join(here, 't765-tickets.json');
const mapBodyOut = join(here, 'map-chef-parity-body.md');

const MAP = Number(argValue('--map'));
if (!Number.isInteger(MAP) || MAP <= 0) {
  console.error('用法：node t765-v3.mjs --map <地图号> [--push-map]');
  process.exit(2);
}
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : '';
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');

const saved = JSON.parse(readFileSync(ticketsJsonPath, 'utf8').replace(/^\uFEFF/, ''));
const byN = new Map(saved.map((s) => [s.n, s]));
const nByIssue = new Map(saved.map((s) => [s.issue, s.n]));

const read = (n) => readFileSync(join(here, `t765-t${n}-body.md`), 'utf8').replace(/^\uFEFF/, '');
const write = (n, text) => writeFileSync(join(here, `t765-t${n}-body.md`), text, 'utf8');

/** 按锚点替换；锚点必须恰好出现一次；幂等（已替换过即跳过）。 */
function patch(n, find, replace, marker) {
  const before = read(n);
  if (marker && before.includes(marker)) return false;
  const hits = before.split(find).length - 1;
  if (hits !== 1) throw new Error(`票 ${n} 的锚点出现 ${hits} 次（要求恰好 1 次）：${find.slice(0, 50)}`);
  write(n, before.replace(find, replace));
  return true;
}

const touches = new Set();
const changed = (n) => touches.add(n);

// ── 1. 三张新票：票序 → 票号 ＋ `<本票号>` 占位落地 ──
for (const [n, issue] of [[16, byN.get(16).issue], [17, byN.get(17).issue], [18, byN.get(18).issue]]) {
  let text = read(n);
  const before = text;
  text = text.split(`skill-chef/t${n}-`).join(`skill-chef/t${issue}-`);
  text = text.split('<本票号>').join(String(issue));
  text = text.split('<票号>').join(String(issue));
  if (text !== before) { write(n, text); changed(n); }
  const left = (read(n).match(new RegExp(`skill-chef/t${n}-`, 'g')) || []).length;
  if (left !== 0) throw new Error(`票 ${n} 仍残留 ${left} 处票序引用`);
  if (read(n).includes('<本票号>')) throw new Error(`票 ${n} 仍残留 <本票号> 占位`);
  if (!read(n).includes(`skill-chef/t${issue}-`)) throw new Error(`票 ${n} 没有出现票号引用 t${issue}-`);
  console.log(`  票 ${n} → #${issue}：产物文件名改票号 ＋ 票号占位落地`);
}

// ── 2. 7 张域票：占位 → 真票号 ──
for (const n of [5, 6, 7, 8, 9, 10, 11]) {
  const issue = byN.get(n).issue;
  let text = read(n);
  const before = text;
  text = text.split('skill-chef/t<票号>-册子片段.json').join(`skill-chef/t${issue}-册子片段.json`);
  text = text.split("'.scratch/t<票号>/'").join(`'.scratch/t${issue}/'`);
  text = text.split('`.scratch/t<票号>/`').join(`\`.scratch/t${issue}/\``);
  if (text === before) { console.log(`  票 ${n}：#${issue} 占位已被处理过（跳过）`); }
  else { write(n, text); changed(n); }
  if (read(n).includes('<票号>')) throw new Error(`票 ${n} 仍残留 <票号> 占位`);
  console.log(`  票 ${n} → #${issue}：占位已落地`);
}

// ── 3. 域票补「代码层 UI 审查清单」判据 ──
for (const n of [5, 6, 7, 8, 9, 10, 11]) {
  const hit = patch(
    n,
    '两者缺一即红。',
    '两者缺一即红。\n- 判据（代码层 UI 审查）：页面进墙前须逐条过票 3 交的**代码层 UI 审查清单**（硬编码样式／内联样式／字号与间距标尺／组件复用／重复样式块），逐条给出结论。',
    '代码层 UI 审查）：',
  );
  if (hit) changed(n);
}

// ── 4. 票 13 补「未过质量门的页不进墙」 ──
if (patch(13, '## 不许动的东西',
  '- 判据（质量门）：进墙的产物须已过票 3 的**页面质量门**（机审六列 ＋ 代码层清单）；未过的页**不进墙**，并在总索引页的「有意不出产物及其原因」一节里逐条点名。\n\n## 不许动的东西',
  '判据（质量门）')) changed(13);

// ── 5. 票 3 改名（页面族 → 页面族与技术质量门）──
const NEW_TITLE_3 = '[原型] 页面族与技术质量门：三族页面 ＋ 双端自适应 ＋ 机审六列 ＋ 代码层 UI 审查清单（先裁形状再铺开）';
if (byN.get(3).title !== NEW_TITLE_3) {
  byN.get(3).title = NEW_TITLE_3;
  writeFileSync(ticketsJsonPath, JSON.stringify(saved, null, 4) + '\n', 'utf8');
  gh('issue', 'edit', String(byN.get(3).issue), '--repo', REPO, '--title', NEW_TITLE_3);
  console.log(`  票 3 #${byN.get(3).issue} 已改名：${NEW_TITLE_3}`);
}

// ── 6. 推回 ＋ 线上复核 ──
const problems = [];
for (const n of [...touches].sort((a, b) => a - b)) {
  const issue = byN.get(n).issue;
  gh('issue', 'edit', String(issue), '--repo', REPO, '--body-file', join(here, `t765-t${n}-body.md`));
  const online = gh('issue', 'view', String(issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
  if (online.includes('<票号>') || online.includes('<本票号>')) problems.push(`#${issue} 线上仍留占位`);
  if (online.includes(`skill-chef/t${n}-`) && n >= 16) problems.push(`#${issue} 线上仍引用票序 t${n}-`);
  console.log(`  #${issue} 推回 ok（${online.length} 字符）`);
}
if (touches.size === 0) console.log('  （无需推回：三处修正此前已落地）');

// ── 7. 边关系复核（应与 v2 一致：18 票 / 65 边）──
const subActual = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate');
if (subActual.length !== saved.length) problems.push(`子议题边：expected=${saved.length} actual=${subActual.length}`);
let edges = 0;
for (const s of saved) edges += ghJson('api', `repos/${REPO}/issues/${s.issue}/dependencies/blocked_by`, '--paginate').length;
console.log(`\n复核：子议题 ${subActual.length}／${saved.length}，阻塞边 ${edges} 条，closed/total = ${subActual.filter((i) => i.state === 'closed').length}/${subActual.length}`);
if (edges !== 65) problems.push(`阻塞边总数变了：expected=65 actual=${edges}`);

if (problems.length) {
  console.error('\nFAIL：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('PASS：三处修正落地，线上无占位残留，边关系与 v2 一致。');

// ── 8. 计划表同步（票 3 改了名：正文计划表按票名同步）──
if (process.argv.includes('--push-map')) {
  const OLD_TITLE_3 = '[原型] 页面族：过程型／结果型／回执型三族 ＋ 双端自适应（先裁形状再铺开）';
  const src = readFileSync(mapBodyOut, 'utf8').replace(/^\uFEFF/, '');
  const next = src.split(OLD_TITLE_3).join(NEW_TITLE_3);
  if (next === src) {
    console.log('地图正文里的票 3 名称已是最新（未改）');
  } else {
    writeFileSync(mapBodyOut, next, 'utf8');
    gh('issue', 'edit', String(MAP), '--repo', REPO, '--body-file', mapBodyOut);
    console.log(`地图正文已同步票 3 新名称（${next.length} 字符）`);
  }
}
