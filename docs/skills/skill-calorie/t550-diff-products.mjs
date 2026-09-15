/** 票 #550 · 改动面收窄机检：两批产物（改前／改后）**逐文件逐行**对照。
 *
 *  判据（编排者 2026-09-15 裁定的替代口径）：除了「场景标识」那一行（`calorie.calorie.X` → `calorie.X`），
 *  **不许有别的行变**——任何一处别的差异都算超出范围，当场红。
 *
 *  **时钟归一口径**（必须写清，否则这条判据不可达）：两批产物是两次跑批，产物里的
 *  `YYYY-MM-DD HH:MM:SS`（页内「写入时间」格／日志第 5 段／日志第 4 段的 M5 行日期）取的是**当刻时钟**，
 *  换批必变——它是**跑批时间**，不是产物口径。故先把逐行的时间戳一律换成 `<TS>` 再比：
 *   · 两边归一后相同而出参不同 → 记 `CLOCK`（跑批时钟，非本次改动）；
 *   · 两边归一后不同，且 B === A 去掉一重 `calorie.` 前缀 → 记 `SCENE`（本票要的那一行）；
 *   · 其余 → 记 `OTHER`（超出范围，红）。
 *
 *  用法：node docs/skills/skill-calorie/t550-diff-products.mjs --a <改前目录> --b <改后目录>
 *  退出码：0 只有场景标识与跑批时钟两类差异；1 出现其它差异／文件集不同／行数不同；2 用法错。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TS_RE = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g;
const killClock = (line) => line.replace(TS_RE, '<TS>');

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? undefined : argv[i + 1]; };
const A = argOf('--a');
const B = argOf('--b');
if (A === undefined || B === undefined) {
  console.error('用法：--a <改前目录> --b <改后目录>');
  process.exit(2);
}
const htmls = (dir) => readdirSync(resolve(dir)).filter((n) => n.endsWith('.html') && statSync(join(resolve(dir), n)).isFile()).sort();
const A_FILES = htmls(A);
const B_FILES = htmls(B);

const setDiff = A_FILES.filter((n) => !B_FILES.includes(n)).concat(B_FILES.filter((n) => !A_FILES.includes(n)));
if (setDiff.length > 0) {
  console.log('FAIL: 两批产物文件集不同：' + setDiff.join('、'));
  process.exit(1);
}

let same = 0;
let sceneOnly = 0;
let clockOnly = 0;
let bad = 0;
let clockLines = 0;
const reports = [];
for (const name of A_FILES) {
  const a = readFileSync(join(resolve(A), name), 'utf8').split('\n');
  const b = readFileSync(join(resolve(B), name), 'utf8').split('\n');
  if (a.join('\n') === b.join('\n')) { same += 1; continue; }
  if (a.length !== b.length) {
    bad += 1;
    reports.push(`  OTHER ${name}  行数不同 a=${a.length} b=${b.length}`);
    continue;
  }
  const changed = [];
  const clock = [];
  let other = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (killClock(a[i]) === killClock(b[i])) { clock.push(i); continue; }
    changed.push(i);
    if (b[i] !== a[i].replace('calorie.calorie.', 'calorie.')) {
      other += 1;
      reports.push(`  OTHER ${name}:${i + 1}\n    a=${JSON.stringify(a[i].slice(0, 160))}\n    b=${JSON.stringify(b[i].slice(0, 160))}`);
    }
  }
  clockLines += clock.length;
  if (other === 0 && changed.length === 0) {
    clockOnly += 1;
    reports.push(`  CLOCK-ONLY ${name}  clock=${clock.length} 行（归一后逐字节全等）`);
  } else if (other === 0 && changed.length === 1) {
    sceneOnly += 1;
    reports.push(`  SCENE ${name}:${changed[0] + 1}  clock=${clock.length}  ${b[changed[0]].slice(0, 80)}`);
  } else {
    bad += 1;
    if (changed.length !== 1) reports.push(`  OTHER ${name}  非时钟行变了 ${changed.length} 行（期望 1 行＝场景标识）`);
  }
}
console.log(reports.join('\n'));
console.log(`NARROW-DIFF a=${A} b=${B} files=${A_FILES.length} identical=${same} clockOnly=${clockOnly} sceneOnly=${sceneOnly} clockLines=${clockLines} unexpected=${bad}`);
if (bad > 0) {
  console.log('FAIL: 除场景标识那一行（与跑批时钟）外还有差异（超出改动范围）');
  process.exit(1);
}
console.log(`RESULT: ${sceneOnly + same + clockOnly}/${A_FILES.length} 份（场景标识那一行变 ${sceneOnly} 份 ＋ 只有跑批时钟变 ${clockOnly} 份 ＋ 逐字节全等 ${same} 份；时钟行合计 ${clockLines} 行）`);
console.log('PASS: 非时钟差异只落在「复制日志」的场景标识那一行');
