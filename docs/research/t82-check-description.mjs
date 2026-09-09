#!/usr/bin/env node
/**
 * #82 description 对账（只读）：新 SKILL.md frontmatter description
 *   ① 单行 `key: value`（供 test/skills-export-47.test.mjs 与 plugin-calorie 解析器）
 *   ② 逐字含旧 frontmatter 69 项（元素级比对，顺序一致）
 *   ③ 含 `卡路里HELP` ＋ `calorie.help.center`
 *   ④ 字符数 ≤ 500（DSH 宿主 skill 目录 DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH）
 * 末行机读摘要 `RESULT: n/m`。
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NEW = join(ROOT, 'packages', 'skill-calorie', 'SKILL.md');
const OLD = 'D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\SKILL.md';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const oldLines = read(OLD).split('\n');
const oldFm = oldLines.slice(1, oldLines.indexOf('---', 1)).join('\n');
const oldItems = /触发词[:：]\s*([^\n]+)/.exec(oldFm)[1].split('、').map((s) => s.trim()).filter(Boolean);

const newLines = read(NEW).split('\n');
const fmEnd = newLines.indexOf('---', 1);
const fmLines = newLines.slice(1, fmEnd);
const checks = [];
const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

// ① 每行 key: value（与 skills-export-47 / plugin-calorie 解析器同形）
let badLine = null;
for (const ln of fmLines) if (!/^([A-Za-z0-9_-]+):\s*(.*)$/.test(ln)) badLine = ln;
ok('frontmatter 每行 key: value', !badLine, badLine ? '坏行：' + badLine : '行数 ' + fmLines.length);

// ② description 取值（剥外层引号，同解析器）
const descLine = fmLines.find((l) => l.startsWith('description:'));
let desc = descLine.replace(/^description:\s*/, '').trim();
if ((desc.startsWith('"') && desc.endsWith('"')) || (desc.startsWith("'") && desc.endsWith("'"))) desc = desc.slice(1, -1);
ok('description 单行', !desc.includes('\n') && descLine.indexOf(desc) >= 0, 'len=' + desc.length);

// ③ 69 项逐字（顺序敏感）
const m = /触发词：([^]*)$/.exec(desc);
const newItems = m ? m[1].split('、').map((s) => s.trim()).filter(Boolean) : [];
ok('触发词条目数 = 旧 69', newItems.length === oldItems.length, newItems.length + ' vs ' + oldItems.length);
const diffs = [];
for (let i = 0; i < Math.max(oldItems.length, newItems.length); i++) {
  if (oldItems[i] !== newItems[i]) diffs.push(`#${i + 1} 旧=${JSON.stringify(oldItems[i])} 新=${JSON.stringify(newItems[i])}`);
}
ok('触发词逐字同序（元素级）', diffs.length === 0, diffs.length ? diffs.slice(0, 5).join(' | ') : '69/69 相等');

// ④ 卡路里HELP ＋ 命令可见
ok('含 卡路里HELP', desc.includes('卡路里HELP'));
ok('含 calorie.help.center', desc.includes('calorie.help.center'));
ok('含 唯一出口 calorie-cmd-read', desc.includes('calorie-cmd-read'));

// ⑤ 500 边界：截断后 卡路里HELP 与命令仍在
const CAP = 500;
const shown = desc.length <= CAP ? desc : desc.slice(0, CAP - 3) + '...';
ok('字符数 ≤ 500（宿主目录不截断）', desc.length <= CAP, 'len=' + desc.length + (desc.length <= CAP ? '（无截断）' : '（截断 ' + (desc.length - CAP + 3) + ' 字符）'));
ok('截断后仍含 卡路里HELP ＋ 命令', shown.includes('卡路里HELP') && shown.includes('calorie.help.center'), 'visible=' + shown.length);

for (const c of checks) console.log((c.pass ? 'PASS  ' : 'RED   ') + c.name + '  ' + c.detail);
const pass = checks.filter((c) => c.pass).length;
console.log('RESULT: ' + pass + '/' + checks.length);
process.exit(pass === checks.length ? 0 : 1);
