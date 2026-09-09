#!/usr/bin/env node
/**
 * #82 SKILL.md 完整性 + AUTO 块零改自证（只读，不写盘）。
 *
 * ① 文件完整性：size／前 3 字节／git hash-object（事故 #124：首 3 字节 00 00 00 立即停报）。
 * ② AUTO 块（含两枚标记）与 HEAD 版本**逐字相等** → 门面改写没碰生成块。
 * ③ 块外改动行清单（old→new 逐行 diff 摘要）。
 * 末行机读摘要 `RESULT: n/m`。
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REL = 'packages/skill-calorie/SKILL.md';
const ABS = join(ROOT, REL);
const START = '<!-- HELP-AUTO-START -->';
const END = '<!-- HELP-AUTO-END -->';

const cur = readFileSync(ABS, 'utf8');
// 基线 = **本票改动前**的 blob（与 HEAD 解耦：提交前后都能判「门面确有改动 / AUTO 块零改」）。
const PRE_BLOB = '51bcf2cffe84a3da285eb49e29ddd52155b22db1';
const head = execFileSync('git', ['cat-file', 'blob', PRE_BLOB], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

const checks = [];
const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

// ① 完整性
const bytes = readFileSync(ABS);
const first3 = [...bytes.slice(0, 3)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const hash = execFileSync('git', ['hash-object', ABS], { cwd: ROOT, encoding: 'utf8' }).trim();
ok('首 3 字节非 00 00 00（事故 #124 判据）', first3 !== '00 00 00', `size=${bytes.length} first3=${first3} hash=${hash.slice(0, 8)}`);
ok('无 NUL 字节', !bytes.includes(0), 'NUL 命中 ' + bytes.filter((b) => b === 0).length);
ok('首行 ---／frontmatter 闭合', cur.startsWith('---\n') && cur.split('\n').indexOf('---', 1) > 1);

// ② AUTO 块逐字相等（含标记）
const blockOf = (t) => {
  const si = t.indexOf(START), ei = t.indexOf(END);
  if (si < 0 || ei < 0) return null;
  return t.slice(si, ei + END.length);
};
const bCur = blockOf(cur), bHead = blockOf(head);
ok('AUTO 块存在', !!bCur && !!bHead);
ok('AUTO 块与改动前 blob 逐字相等（零改）', bCur === bHead, bCur && bHead ? `len ${bHead.length} -> ${bCur.length}` : 'n/a');
ok('AUTO 块外仍有正文', cur.indexOf(START) > 200 && cur.indexOf(END) < cur.length - 200, `start@${cur.indexOf(START)} end@${cur.indexOf(END)} total=${cur.length}`);

// ③ 块外改动行
const strip = (t) => t.slice(0, t.indexOf(START)) + '\n<<<AUTO>>>\n' + t.slice(t.indexOf(END) + END.length);
const a = strip(head).split('\n'), b = strip(cur).split('\n');
let changed = 0;
const max = Math.max(a.length, b.length);
for (let i = 0; i < max; i++) if (a[i] !== b[i]) changed++;
ok('块外改动行数 > 0（本票确有门面改动）', changed > 0, 'diff-lines=' + changed + '（旧 ' + a.length + ' 行 → 新 ' + b.length + ' 行）');
ok('块内两枚标记各恰 1 次', cur.split(START).length - 1 === 1 && cur.split(END).length - 1 === 1);

for (const c of checks) console.log((c.pass ? 'PASS  ' : 'RED   ') + c.name + '  ' + c.detail);
const pass = checks.filter((c) => c.pass).length;
console.log('RESULT: ' + pass + '/' + checks.length);
process.exit(pass === checks.length ? 0 : 1);
