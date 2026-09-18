#!/usr/bin/env node
/** #702 · 页面断言门：凡 **spawn 真交付出口**（`dist/cli/cmd_read.js`／`cmd_write.js`／`cli/write.js` 子进程）
 * 并**断言它成功**的测试件，必须**把 stdout 解析成 envelope**——只断「exit 0」是假绿：
 * 产物没落盘、信封字段被改、交付态退回内联，一样 exit 0。
 *
 * **口径**（先例＝`test/566-result-title.test.mjs:51` 那条真跑）：
 *   ① 进判条件＝**子进程调用**（`spawnSync`／`spawn`／`execFileSync`／`execSync`／`execFile`）＋ 参数点到 CLI 入口路径。
 *      只 `import { dispatch }` 直调**不进判**（票面认可的「同逻辑不 spawn」那条路：无子进程、无 stdout 信封）。
 *   ② 断「成功」的件（源码里出现 `status`／`code` 与 `=== 0`／`.equal(…, 0)`／`toBe(0)` 一类）必须**解析 stdout**：
 *      出现 `JSON.parse`（或在辅助函数里解析）即算；没有即红。
 *   ③ 断「阻断」的件（只出现非 0 的 exit 断言）不判——失败路没有 envelope，判它是假要求。
 *      这条从「必须咬落点」放宽而来：`data.output` 只在**文件态**存在（内联态与文本态没有），
 *      而内联态是**设计里就有的**（沙箱／只读盘自动转内联），故「必须咬落点」会把合法用例判红（当刻实测：`db-readonly-93` 就是故意跑缺数据那条路）。
 *
 * **为什么只留「解析 stdout」这一条**：它是「产物真到了交付面」的必要条件，静态可判真假，
 * 且不预设交付态（文件／内联／文本三态都过）——判据越窄越不会误伤，剩下的断言强弱归各票自己。
 *
 * 跑法：`node packages/skill-calorie/scripts/check-page-assert.mjs`（退出码 0 绿／1 红）
 * 自证：`--selftest`（只断 exit 码 ⇒ 红；断成功且解析 stdout ⇒ 绿；只直调 dispatch ⇒ 不进判；
 *        只断阻断路 ⇒ 不判不红）
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** spawn 了真交付出口？ */
export function isCliSpawn(src) {
  if (!/\b(?:spawnSync|spawn|execFileSync|execSync|execFile)\s*\(/.test(src)) return false;
  return /dist[/\\]cli[/\\](cmd_read|cmd_write|write)\.js/.test(src);
}

/** 断了成功路？ */
export function assertsSuccess(src) {
  return /\.status\s*,?\s*0\b|\.status\s*===\s*0\b|assert\.equal\(\s*\w+\s*,\s*0\b|\bexit\s*0\b/.test(src);
}

/** 解析了 stdout 成 JSON？ */
export function parsesStdout(src) {
  return /JSON\.parse\s*\(/.test(src);
}

/** 判定一棵包树；返回红条目。 */
export function judge(pkgRoot) {
  const dir = join(pkgRoot, 'test');
  const red = [];
  for (const e of readdirSync(dir)) {
    if (!e.endsWith('.mjs')) continue;
    const p = join(dir, e);
    if (!statSync(p).isFile()) continue;
    const src = readFileSync(p, 'utf8');
    if (!isCliSpawn(src)) continue;
    if (!assertsSuccess(src)) continue;
    if (parsesStdout(src)) continue;
    red.push({ file: `packages/skill-calorie/test/${e}`, miss: ['信封（断成功却没把 stdout 解析成 envelope）'] });
  }
  return red;
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 't702-pageassert-'));
  mkdirSync(join(dir, 'test'), { recursive: true });
  const CLI = '../dist/cli/cmd_read.js';
  const cases = [
    ['①spawn＋只断 exit 码 ⇒ 红',
      `const CLI='${CLI}';\nconst r=spawnSync(process.execPath,[CLI]);\nassert.equal(r.status, 0);\n`, true],
    ['②spawn＋断成功＋解析 stdout ⇒ 绿',
      `const CLI='${CLI}';\nconst r=spawnSync(process.execPath,[CLI]);\nassert.equal(r.status, 0);\nconst env=JSON.parse(r.stdout);\nassert.equal(env.version,'0.1.0');\n`, false],
    ['③只直调 dispatch（无子进程）⇒ 不进判',
      `import { dispatch } from '${CLI}';\nconst out=dispatch('k',{},db);\nassert.equal(out.html.length>0, true);\n`, false],
    ['④只断阻断路（非 0）⇒ 不判',
      `const CLI='${CLI}';\nconst r=spawnSync(process.execPath,[CLI]);\nassert.equal(r.status, 4);\n`, false],
    ['⑤spawn 的是别的脚本 ⇒ 不进判',
      `const S='./helper.mjs';\nconst r=spawnSync(process.execPath,[S]);\nassert.equal(r.status, 0);\n`, false],
  ];
  const results = [];
  for (const [name, body, expectRed] of cases) {
    writeFileSync(join(dir, 'test', 'case.test.mjs'), body);
    const got = judge(dir).length > 0;
    results.push([name, got === expectRed]);
  }
  rmSync(dir, { recursive: true, force: true });
  const bad = results.filter((r) => !r[1]);
  for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'RED '} ${name}`);
  console.log(`RESULT: ${results.length - bad.length}/${results.length}`);
  console.log(bad.length ? 'SELFTEST: FAIL' : 'SELFTEST: PASS');
  return bad.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-page-assert.mjs')) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  const red = judge(PKG);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ red: red.length, items: red.map((r) => r.file) }));
  if (red.length) {
    console.error(`RED spawn 真交付出口、断了成功、却没断信封：${red.length} 件（口径见本件头）`);
    for (const r of red) console.error(`RED   ${r.file}　缺：${r.miss.join('；')}`);
    console.error('修法：照 test/566-result-title.test.mjs:51 那条真跑，把 stdout 解析成 envelope 再断字段。');
    process.exit(1);
  }
  console.log('PASS: spawn 真交付出口并断成功的测试件都断到了信封');
}
