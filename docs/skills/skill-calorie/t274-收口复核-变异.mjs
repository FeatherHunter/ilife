/** #274 收口复核 · 变异自证（我自己另设的变异，不是作者席那处 `fixed0(it.calories)`→`fixed1`）。
 *
 * 两态：
 *   · MUTATION-甲 —— 取消卡片名的转义（`escapeHtml(it.product_name)` → `it.product_name`）：**必红**。
 *   · MUTATION-丙 —— 口径行文案换成另一句（页面可见文案，形状不改）：**探针盲区试探**。
 * 每态：改源码 → `tsc -b` → 跑作者件 ＋ 我的新探针 → 逐文件点名还原 → 重编 → 复核源码 sha 回基线 → 再跑。
 *
 * 跑法：`node docs/skills/skill-calorie/t274-收口复核-变异.mjs`（先 `npx tsc -b packages/skill-calorie`）
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
function findRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(d, 'packages', 'skill-calorie', 'package.json'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到检出根：' + from);
}
const ROOT = findRoot(HERE);
const SRC = join(ROOT, 'packages', 'skill-calorie', 'src', 'diet', 'libraryDocs.ts');
const TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 't274-食品库页.test.mjs');
const PROBE = join(HERE, 't274-收口复核-新探针.mjs');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);
const BASE_SRC = sha(SRC);

function tsc() {
  const r = spawnSync('npx', ['tsc', '-b', 'packages/skill-calorie'], { cwd: ROOT, encoding: 'utf8', shell: true });
  return r.status;
}
function runTests() {
  const r = spawnSync(process.execPath, ['--test', TEST], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = String(r.stdout);
  const m = /# tests (\d+)[\s\S]*?# pass (\d+)[\s\S]*?# fail (\d+)/.exec(out)
    ?? /tests (\d+)[\s\S]*?pass (\d+)[\s\S]*?fail (\d+)/.exec(out);
  return { status: r.status, tests: m ? +m[1] : null, pass: m ? +m[2] : null, fail: m ? +m[3] : null };
}
function runProbe() {
  const r = spawnSync(process.execPath, [PROBE], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = /RESULT-NEW: (\S+) 红=(\d+) 检查项=(\d+)/.exec(String(r.stdout));
  return { status: r.status, verdict: m ? m[1] : '?', red: m ? +m[2] : -1, total: m ? +m[3] : -1 };
}
function mutate(from, to, label) {
  const before = readFileSync(SRC, 'utf8');
  const n = before.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}：替换目标在源码里出现 ${n} 次，须恰 1 次`);
  writeFileSync(SRC, before.replace(from, to), 'utf8');
}
function restore() {
  if (sha(SRC) !== BASE_SRC) throw new Error('还原后源码 sha 未回基线');
}

console.log('== BASE（进场） ==');
const baseT = runTests();
const baseP = runProbe();
const BASE_GREEN = baseT.fail === 0;
console.log(`BASE 作者件 tests=${baseT.tests} pass=${baseT.pass} fail=${baseT.fail} exit=${baseT.status}`
  + ` ｜ 新探针红=${baseP.red}/${baseP.total}`);
console.log(`BASE-NOT-GREEN=${!BASE_GREEN}`);
if (!BASE_GREEN) { console.log('RESULT-MUT: 本轮作废（BASE 不全绿）'); process.exit(2); }

const MUTS = [
  {
    name: '甲',
    what: '取消卡片名转义',
    from: "'<div class=\"food-name\">' + escapeHtml(it.product_name) + '</div>'",
    to: "'<div class=\"food-name\">' + it.product_name + '</div>'",
  },
  {
    name: '丙',
    what: '口径行文案换一句（形状不改）',
    from: "const CALIBER_FOOD = '营养值都是每 100 克；只列没有下架的食品。';",
    to: "const CALIBER_FOOD = '口径另说。';",
  },
];

for (const m of MUTS) {
  console.log(`== MUTATION-${m.name}：${m.what} ==`);
  mutate(m.from, m.to, 'MUTATION-' + m.name);
  const c = tsc();
  const t = runTests();
  const p = runProbe();
  console.log(`MUTATION-${m.name}: tsc退出=${c} 作者件 tests=${t.tests} pass=${t.pass} fail=${t.fail}`
    + ` ｜ 新探针红=${p.red}/${p.total} ｜ 必红=${t.fail > 0 ? 'true' : 'false'}`);
  writeFileSync(SRC, readFileSync(SRC, 'utf8').replace(m.to, m.from), 'utf8');
  restore();
  const c2 = tsc();
  const t2 = runTests();
  const p2 = runProbe();
  console.log(`RESTORE-${m.name}: tsc退出=${c2} 源码回基线=${sha(SRC) === BASE_SRC}`
    + ` 作者件 fail=${t2.fail} ｜ 新探针红=${p2.red}/${p2.total}`);
}
console.log(`RESULT-MUT: 源码回基线=${sha(SRC) === BASE_SRC} 基线sha=${BASE_SRC}`);
