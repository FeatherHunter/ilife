/** t269 终验 · 变异自证（源码级两处方向各一）＋ 收尾逐文件还原与重编。
 *
 *  M1「漏一条」：把 `calorie.water.log` 从 `src/diet/receipt.ts` 的具名命令集里拿掉
 *     → 饮食整页断言（本票新写的那条）必红。
 *  M2「多一条」：把一个**不在 13 条里**的写命令（`calorie.goal.set`）加进同一具名命令集
 *     → 「其余命令仍是原回执片段」的反面断言必红。
 *
 *  每处：改源码 → `npx tsc -b packages/skill-calorie` → 校验编译产物真的跟着变了 →
 *  跑三个测试件（落独立日志）→ 读回变异后的红点名字。收尾逐文件还原 ＋ 重编 ＋ 复跑。
 *
 *  机器摘要行：
 *    `MUT <id> applied=<0|1> dist_changed=<0|1> fail=<n> red_hit=<0|1> red=<名字…>`
 *    `RESTORED src_sha_match=<0|1> dist_clean=<0|1> final_fail=<n>`
 *  退出码非 0 ＝ 有变异不符预期或收尾还原不干净（收尾一定会执行）。 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

mkdirSync('.scratch/t269-final', { recursive: true });   // 日志与备件的落点（未受版本控制）
const SRC = 'packages/skill-calorie/src/diet/receipt.ts';
const DIST = 'packages/skill-calorie/dist/diet/receipt.js';
const TESTS = [
  'packages/skill-calorie/test/profile-doc-179.test.mjs',
  'packages/skill-calorie/test/calorie-c43.test.mjs',
  'packages/skill-calorie/test/delivery-83.test.mjs',
];
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const sh = (line) => spawnSync('cmd.exe', ['/c', line], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const ORIG = readFileSync(SRC, 'utf8');
const S0 = sha(ORIG);
// 备件落本票草稿目录（不往别人路径下留件；§2.5 第 4 条）。
writeFileSync('.scratch/t269-final/receipt.ts.bak', ORIG, 'utf8');

function build() {
  const r = sh('npx tsc -b packages/skill-calorie > .scratch\\t269-final\\mut-build.log 2>&1');
  return r.status === 0;
}
function runTests(logName) {
  sh(`node --test ${TESTS.join(' ')} > .scratch\\t269-final\\${logName} 2>&1`);
  const text = readFileSync(`.scratch/t269-final/${logName}`, 'utf8');
  const start = text.split('\n').findIndex((l) => /failing tests:/.test(l));
  const names = [];
  if (start >= 0) {
    const rest = text.split('\n').slice(start);
    for (let i = 0; i < rest.length; i++) {
      if (/^test at \S+:\d+:\d+/.test(rest[i])) {
        names.push((rest[i + 1] || '').replace(/\s*\(\d+(\.\d+)?ms\)\s*$/, '').replace(/^\u2716\s*/, '').trim());
      }
    }
  }
  return names;
}
const restore = () => { writeFileSync(SRC, ORIG, 'utf8'); };

let bad = 0;
function mutation(id, patchFrom, patchTo, expect) {
  const mutated = ORIG.replace(patchFrom, patchTo);
  const applied = mutated !== ORIG;
  if (!applied) { console.log(`MUT ${id} applied=0 dist_changed=0 fail=- red_hit=0 red=(patch 未命中)`); bad++; return; }
  writeFileSync(SRC, mutated, 'utf8');
  try {
    build();
    const distText = readFileSync(DIST, 'utf8');
    // 编译产物跟着变了没有：只看**命令集那一行**（`'<命令名>',`）。裸命令名不行——
    // `writtenDetailOf()` 里还有一处 `key === 'calorie.water.log'`，去掉集合项也不会消失（实测踩过）。
    const distChanged = id === 'M1'
      ? !distText.includes("'calorie.water.log',")
      : distText.includes("'calorie.goal.set',");
    const red = runTests(`mut-${id}.log`);
    const redHit = red.some((n) => expect.some((e) => n.includes(e)));
    console.log(`MUT ${id} applied=1 dist_changed=${distChanged ? 1 : 0} fail=${red.length} red_hit=${redHit ? 1 : 0} red=${red.join(' ／ ') || '(无)'}`);
    if (!distChanged || !redHit) bad++;
  } finally {
    restore();
  }
}

mutation('M1', "  'calorie.water.log',\n", '',
  ['饮食写命令已是完整文档', '#83 写键同样有 delivery', '#83 ⑥ 相对 SKILLS_DB_PATH']);
mutation('M2', 'const DIET_RECEIPT_KEYS: ReadonlySet<string> = new Set([\n',
  "const DIET_RECEIPT_KEYS: ReadonlySet<string> = new Set([\n  'calorie.goal.set',\n",
  ['其余会改数据库的命令仍是原回执片段', '#83 写键同样有 delivery']);

restore();
try { rmSync(SRC + '.t269bak', { force: true }); } catch { /* 旧版脚本可能留下的备件 */ }
const srcMatch = sha(readFileSync(SRC, 'utf8')) === S0;
build();
const distClean = !readFileSync(DIST, 'utf8').includes('calorie.goal.set')
  && readFileSync(DIST, 'utf8').includes('calorie.water.log');
const finalRed = runTests('mut-restored.log');
console.log(`RESTORED src_sha_match=${srcMatch ? 1 : 0} dist_clean=${distClean ? 1 : 0} final_fail=${finalRed.length} red=${finalRed.join(' ／ ') || '(无)'}`);
if (!srcMatch || !distClean) bad++;
process.exit(bad === 0 ? 0 : 1);
