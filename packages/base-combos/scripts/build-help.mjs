#!/usr/bin/env node
// P8 #9：HELP 互联区构建期注入静态文本（学 memo M6 的标记块做法）。
// 输入 combos.yaml（场景/通道/降级/空位），输出 HELP.md 标记块内静态文本；运行时不计算 HELP。
// 无标记即大声失败；块内容与生成器纯函数 buildHelpBlock 一致（测试钉死）。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

function section(text, name) {
  const rows = [];
  let cur = null;
  let inSec = false;
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    const sec = ln.match(/^([A-Za-z_]+):\s*$/);
    if (sec) { inSec = sec[1] === name; continue; }
    if (!inSec) continue;
    let m = ln.match(/^  - (key|id|for): (\S+)\s*$/);
    if (m) { cur = { [m[1]]: m[2] }; rows.push(cur); continue; }
    m = ln.match(/^    ([A-Za-z_]+): (.*?)\s*$/);
    if (m && cur) { cur[m[1]] = m[2]; continue; }
  }
  return rows;
}

export function buildHelpBlock(yamlText) {
  const channels = section(yamlText, 'channels');
  const scenarios = section(yamlText, 'scenarios');
  const fallbacks = section(yamlText, 'fallbacks');
  const slots = section(yamlText, 'l6_slots');
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
  return L.join('\n');
}

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
