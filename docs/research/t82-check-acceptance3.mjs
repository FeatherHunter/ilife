#!/usr/bin/env node
/**
 * #82 验收③自证：`build-help.mjs` 重建 AUTO 块后，门面（块外内容）逐字保留。
 * 用法：`node docs/research/t82-check-acceptance3.mjs <重建前快照路径>`
 *   复跑流程：① 快照 `cp packages/skill-calorie/SKILL.md <快照路径>`；
 *             ② `node tooling/run-locked.mjs --ticket 82 -- node packages/skill-calorie/scripts/build-help.mjs`；
 *             ③ 本脚本比对快照与当前 SKILL.md。
 * 比对内容：
 *   ① 块内（含两枚标记）逐字相等；
 *   ② 块外前缀／后缀逐字相等（= 门面零覆盖）；
 *   ③ 4 处门面改动重建后仍在（description 69 项／卡路里HELP 入口／HELP 节标题／安装器指针）。
 * 末行 `RESULT: n/m`。
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CUR = join(HERE, '..', '..', 'packages', 'skill-calorie', 'SKILL.md');
const BEF = process.argv[2] || join(HERE, '..', '..', '.scratch', 't82', 'skill-before-buildhelp.md');
const START = '<!-- HELP-AUTO-START -->';
const END = '<!-- HELP-AUTO-END -->';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const cur = read(CUR), bef = read(BEF);
const seg = (t) => ({ pre: t.slice(0, t.indexOf(START)), block: t.slice(t.indexOf(START), t.indexOf(END) + END.length), post: t.slice(t.indexOf(END) + END.length) });
const A = seg(bef), B = seg(cur);

const checks = [];
const ok = (n, c, d = '') => checks.push({ n, pass: !!c, d });
ok('块内（含标记）逐字相等', A.block === B.block, `len ${A.block.length} -> ${B.block.length}`);
ok('块外前缀逐字相等', A.pre === B.pre, `len ${A.pre.length} -> ${B.pre.length}`);
ok('块外后缀逐字相等', A.post === B.post, `len ${A.post.length} -> ${B.post.length}`);
ok('整文件逐字相等（重建为幂等）', cur === bef, `hash-equal=${cur === bef}`);

// 4 处门面改动重建后仍在
const items = /触发词：([^"]+)/.exec(B.pre.split('\n')[2] ?? '') || /触发词：([^"]+)/.exec(cur.slice(0, 2000));
ok('description 69 项仍在（重建后）', items && items[1].split('、').length === 69, items ? items[1].split('、').length + ' 项' : '未解析');
ok('卡里路HELP 入口仍在', cur.includes('用户说「**卡路里HELP**」→ 跑 `calorie-cmd-read calorie.help.center`'));
ok('HELP 节标题仍在（含 "HELP 现找"）', cur.includes('## HELP 现找与「卡路里HELP」速查台'));
ok('安装器指针（去重后）仍在', cur.includes('- stdout／落盘契约与「唯一出口（T11）」节同源'));
ok('旧过时句已消失', !cur.includes('`calorie.help.center`（全量 10 键'));

for (const c of checks) console.log((c.pass ? 'PASS  ' : 'RED   ') + c.n + '  ' + c.d);
const pass = checks.filter((c) => c.pass).length;
console.log('RESULT: ' + pass + '/' + checks.length);
process.exit(pass === checks.length ? 0 : 1);
