#!/usr/bin/env node
// P8 #9：HELP 互联区构建期注入静态文本（学 memo M6 的标记块做法）。
// 输入 combos.yaml（场景/通道/降级/空位），输出 HELP.md 标记块内静态文本；运行时不计算 HELP。
// 无标记即大声失败；块内容与生成器纯函数 buildHelpBlock 一致（测试钉死）。
// #80 主守卫（对齐 skill-memo-ilife/skill-home 的 #43 H1 写法）：import 仅导出纯函数，不写盘；
// 仅 node 直接执行时注入——测试因此能断言“仓内 HELP.md == 生成器输出”，而不是边导入边覆盖。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

// #80：段名/字段名可含数字（`l6_slots`）。旧写法 `^([A-Za-z_]+):\s*$` 漏认含数字段头，
// 后果有二：上一段（fallbacks）越界吞掉 l6 条目 → 生成 6 行 `undefined：undefined（undefined）`；
// l6_slots 段自身永远解析为空 → L6 空位列表为空。三份正则与 tooling/check-combos.mjs 同形。
const SEC_HEAD_RE = /^([A-Za-z_][A-Za-z0-9_]*):\s*$/;
const ITEM_RE = /^  - (key|id|for): (\S+)\s*$/;
const FIELD_RE = /^    ([A-Za-z_][A-Za-z0-9_]*): (.*?)\s*$/;
// 通道键一律 registry 点号键（#80：下划线是渲染层内部 VIEW_KEYS，非法 registry 名）。
// 与 tooling/check-combos.mjs 的 KEY_RE、skill-calorie/src/cli/keys.ts 的 COMBO_KEY_RE 同值。
const CHANNEL_KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;

function section(text, name) {
  const rows = [];
  let cur = null;
  let inSec = false;
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    const sec = ln.match(SEC_HEAD_RE);
    if (sec) { inSec = sec[1] === name; continue; }
    if (!inSec) continue;
    let m = ln.match(ITEM_RE);
    if (m) { cur = { [m[1]]: m[2] }; rows.push(cur); continue; }
    m = ln.match(FIELD_RE);
    if (m && cur) { cur[m[1]] = m[2]; continue; }
  }
  return rows;
}

/** #80 构建期门：块内出现 undefined 即拒发（段头/字段正则失配的第一征兆）。 */
export function assertHelpBlock(block) {
  const bad = block.split('\n').filter((ln) => /undefined/.test(ln));
  if (bad.length) throw new Error('HELP 块含 undefined（combos.yaml 段头/字段正则失配？）：' + bad[0]);
  return block;
}

/** #80 构建期门：通道键须为 registry 点号键（下划线键 = 渲染层内部名，展示即误导）。 */
export function assertChannelKeys(channels) {
  for (const c of channels) {
    if (!CHANNEL_KEY_RE.test(c.key || '')) throw new Error('channels 键非 registry 点号键：' + c.key);
  }
  return channels;
}

export function buildHelpBlock(yamlText) {
  const channels = section(yamlText, 'channels');
  const scenarios = section(yamlText, 'scenarios');
  const fallbacks = section(yamlText, 'fallbacks');
  const slots = section(yamlText, 'l6_slots');
  // #80 构建期门：任一段解析为空即大声失败（段头正则失配的第一征兆，见 SEC_HEAD_RE）。
  for (const [name, rows] of [['channels', channels], ['scenarios', scenarios], ['fallbacks', fallbacks], ['l6_slots', slots]]) {
    if (!rows.length) throw new Error('combos.yaml 段解析为空：' + name + '（段头正则须容数字，见 SEC_HEAD_RE）');
  }
  assertChannelKeys(channels);
  const L = [];
  L.push('| 唤醒词 | 场景 | 外部技能 | 呈现 |');
  L.push('|---|---|---|---|');
  for (const s of scenarios) L.push('| ' + s.wake_word + ' | ' + s.id + ' ' + s.name + ' | ' + s.external + ' | ' + s.present + ' |');
  L.push('');
  L.push('取数通道 15 对（key × 形状 × 背书）：');
  L.push('');
  L.push('| key | 形状 | 背书 |');
  L.push('|---|---|---|');
  for (const c of channels) L.push('| ' + c.key + ' | ' + c.shape + ' | ' + c.backing + ' |');
  L.push('');
  L.push('降级 6 条（显式标记，不编造）：');
  L.push('');
  for (const f of fallbacks) L.push('- ' + f.for + '：' + f.reason + '（' + f.while_degraded + '）');
  L.push('');
  L.push('L6 空位（一期不实现，内容不记录）：' + slots.map((s) => s.id).join('、') + '。');
  return assertHelpBlock(L.join('\n'));
}

function runMain() {
  const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const yamlPath = join(pkgDir, 'combos.yaml');
  const helpPath = join(pkgDir, 'HELP.md');
  const yamlText = readFileSync(yamlPath, 'utf8');
  const text = readFileSync(helpPath, 'utf8');
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < 0 || ei < si) { console.error('ERR: HELP.md 缺 HELP 标记块'); process.exit(1); }
  const next = text.slice(0, si + START.length) + '\n' + buildHelpBlock(yamlText) + '\n' + text.slice(ei);
  writeFileSync(helpPath, next);
  console.log('HELP 已注入：' + helpPath);
}

const isMain = (() => {
  try { return process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false; }
  catch { return false; }
})();
if (isMain) runMain();
