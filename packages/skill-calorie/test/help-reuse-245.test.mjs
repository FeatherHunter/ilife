/** #245 · 卡路里 HELP 产物的**复用窗口**锁（真 spawn 出口；不调模块）。
 *
 * 病灶（#245）：每个走共享 help 模板的技能，HELP 被读一次就在落点目录多出一份 HTML——生产上
 * `calorie_html/` 实测 **323 件**。口径（维护者 2026-09-12）：「该方法内需要提供过期时间，比如
 * **1 天内直接返回一份**，不会再创建新的。又或者 3 天这种参数。」
 *
 * 本文件锁七件事：
 *  ① **缺省＝一天**：连读 2 次目录**文件数不增**，两次 `data.output` 同一份、`delivery.bytes` 同值；
 *  ② 那份**一字未改**（复用＝只读：内容与 mtime 都不动）；
 *  ③ **速查台那支也吃窗口**（同一个键的两种产物都要停涨）；
 *  ④ `reuseHours` 换窗口：`3` 同效（窗口内仍复用）、`0`＝**每次都要一份最新的**（落新的、不覆盖旧的）；
 *  ⑤ **坏参阻断**：负数／非数／布尔一律 exit 2（不静默当 0、不静默当缺省）；
 *  ⑥ **不吃窗口的那些路照旧**：业务页面（`calorie.view.diet`）连跑两次仍各留一份；`--output` 仍是逐字覆盖；
 *  ⑦ **历史文件不清**：窗口外的那份留着当留档（造一份「3 天前」改名的旧件，验它不被复用也不被删）。
 *
 * 运行：先 `pnpm build`（或逐包 `tsc -b`），再
 *   node --test packages/skill-calorie/test/help-reuse-245.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.help.center';
const DB_FILE = 'calorie_data.db';

/** 隔离库目录：HELP 键在开库之前分派，但库文件得先在（否则 openDb 现建库会与并发读撞）；
 *  另建出真 schema——⑥ 要跑一条业务读键（`calorie.view.diet`），空壳库会 ERR 4 no such table。 */
function mkDb(tag) {
  const dir = mkdtempSync(join(tmpdir(), 't245cal-' + tag + '-'));
  const db = openDb(join(dir, DB_FILE));
  db.close();
  return dir;
}

function run(dir, params, extra = []) {
  const args = [KEY];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push(...extra);
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout).replace(/^\uFEFF/, '')); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(dir, params, extra) {
  const r = run(dir, params, extra);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  return r;
}

const htmlDirOf = (dir) => join(dir, 'calorie_html');
const namesOf = (dir) => { try { return readdirSync(htmlDirOf(dir)).sort(); } catch { return []; } };

test('#245 ① 缺省＝一天：连读 2 次目录文件数不增，两次落同一份、字节同值', () => {
  const dir = mkDb('default');
  const a = runOk(dir);
  const b = runOk(dir);

  const out = a.env.data.output;
  assert.ok(isAbsolute(out), 'data.output 须绝对路径：' + out);
  assert.equal(b.env.data.output, out, '窗口内第二次必须复用同一份（路径逐字相同）');
  assert.equal(b.env.delivery.path, out, 'delivery.path 与 data.output 同值同源');
  assert.equal(b.env.delivery.bytes, a.env.delivery.bytes, '复用那份的字节数与首跑一致');
  assert.deepEqual(namesOf(dir), [basename(out)], '目录里仍只有首次那一份（不涨）');
  assert.equal(statSync(out).size, a.env.delivery.bytes, '回执 bytes ＝真实落盘字节数');
});

test('#245 ② 复用＝只读：那份的字节与 mtime 都不动', () => {
  const dir = mkDb('readonly');
  const a = runOk(dir);
  const out = a.env.data.output;
  const before = readFileSync(out);
  const mtime = statSync(out).mtimeMs;
  const b = runOk(dir);
  assert.deepEqual(readFileSync(out), before, '复用不得改写已有那份（逐字节相同）');
  assert.equal(statSync(out).mtimeMs, mtime, '复用不得 touch 已有那份（mtime 不动）');
  assert.equal(b.env.delivery.bytes, before.length);
});

test('#245 ③ 速查台那支也吃窗口：两次 mode:"file" 落同一份', () => {
  const dir = mkDb('sheet');
  const a = runOk(dir, { mode: 'file' });
  const b = runOk(dir, { mode: 'file' });
  assert.match(basename(a.env.data.output), /^卡路里_速查台_\d{8}_\d{6}(_\d+)?\.html$/);
  assert.equal(b.env.data.output, a.env.data.output, '速查台第二次复用同一份');
  assert.equal(namesOf(dir).length, 1, '目录里只有这一份速查台');
});

test('#245 ③b 照片 HELP 那支：自己的主体、也吃窗口，且不被主 HELP 顶掉', () => {
  const dir = mkDb('photo');
  const p1 = runOk(dir, { q: '记身材照' });
  const p2 = runOk(dir, { q: '记身材照' });
  assert.match(basename(p1.env.data.output), /^卡路里_照片HELP_\d{8}_\d{6}(_\d+)?\.html$/,
    '照片 HELP 有自己的主体名：' + basename(p1.env.data.output));
  assert.equal(p2.env.data.output, p1.env.data.output, '照片 HELP 第二次复用同一份');

  // 主 HELP 另落一份（两者主体不同 ⇒ 互不顶掉）；再读各自都复用自己那份。
  const h1 = runOk(dir);
  assert.match(basename(h1.env.data.output), /^卡路里_HELP_\d{8}_\d{6}(_\d+)?\.html$/);
  assert.notEqual(h1.env.data.output, p1.env.data.output, '两种 HELP 分名');
  const h2 = runOk(dir);
  const p3 = runOk(dir, { q: '记身材照' });
  assert.equal(h2.env.data.output, h1.env.data.output, '主 HELP 仍复用自己那份');
  assert.equal(p3.env.data.output, p1.env.data.output, '照片 HELP 仍复用自己那份（没被主 HELP 顶掉）');
  assert.equal(namesOf(dir).length, 2, '目录稳定在两份：主 HELP ＋ 照片 HELP');
  // 两份内容各不相同（分名不只是改名，是两种产物）。
  assert.notEqual(readFileSync(h1.env.data.output, 'utf8'), readFileSync(p1.env.data.output, 'utf8'));
});

test('#245 ④ 窗口可换：3 小时同效；0＝每次都要一份最新的（落新的、不覆盖旧的）', () => {
  const dir = mkDb('hours');
  const a = runOk(dir, { reuseHours: 3 });
  const b = runOk(dir, { reuseHours: 3 });
  assert.equal(b.env.data.output, a.env.data.output, 'reuseHours:3 窗口内同样复用');
  assert.equal(namesOf(dir).length, 1, '仍只有一份');

  const c = runOk(dir, { reuseHours: 0 });
  assert.notEqual(c.env.data.output, a.env.data.output, 'reuseHours:0 ⇒ 落新的一份');
  assert.equal(readFileSync(a.env.data.output).length, a.env.delivery.bytes, '旧那份字节未被改写');
  assert.equal(namesOf(dir).length, 2, '目录里 2 份（旧的留着当留档）');
});

test('#245 ⑤ 坏参阻断：负数／非数／布尔一律 exit 2（不静默当 0 或当缺省）', () => {
  const dir = mkDb('badparams');
  for (const bad of [-1, 1.5e308 * 10, '一天', true, { h: 1 }]) {
    const r = run(dir, { reuseHours: bad });
    assert.equal(r.status, 2, 'reuseHours=' + JSON.stringify(bad) + ' 须 exit 2（stderr：' + r.stderr + '）');
    assert.match(r.stderr, /reuseHours 非法/, '报错须点名参数：' + r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 保持干净');
  }
  assert.deepEqual(namesOf(dir), [], '坏参一律不落盘');
});

test('#245 ⑥ 不吃窗口的路照旧：业务页面连跑两次各留一份；`--output` 仍是逐字覆盖', () => {
  const dir = mkDb('others');
  const db = openDb(join(dir, DB_FILE));
  try {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note)'
      + ' VALUES (?,?,?,?,?,?,?,?,?)')
      .run('2026-09-06', '12:00', '米饭', 200, 260, 5, 56, 0.6, '');
  } finally { db.close(); }

  const writeArgs = ['calorie.diet.add', '--params', JSON.stringify({
    foodName: '早餐', grams: 100, calories: 200, protein: 10, carbs: 20, fat: 5, date: '2026-09-06',
  })];
  const w = spawnSync(NODE_BIN, [BIN, ...writeArgs], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  assert.equal(w.status, 0, '写键 exit 0（stderr：' + String(w.stderr) + '）');

  const pageArgs = ['calorie.view.diet', '--params', JSON.stringify({ start: '2026-09-05', end: '2026-09-07' })];
  const runPage = () => spawnSync(NODE_BIN, [BIN, ...pageArgs], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  const p1 = runPage();
  const p2 = runPage();
  assert.equal(p1.status, 0, '业务页面 exit 0（stderr：' + String(p1.stderr) + '）');
  assert.equal(p2.status, 0, '业务页面第二次 exit 0');
  const out1 = JSON.parse(String(p1.stdout)).data.output;
  const out2 = JSON.parse(String(p2.stdout)).data.output;
  assert.notEqual(out2, out1, '业务页面不吃窗口：第二次仍各留一份（每份都是某一跑的真实产物）');
  assert.equal(existsSync(out1) && existsSync(out2), true, '两份业务页面都在盘上');

  const mine = join(dir, 'sub', '我的报告.html');
  const e1 = runOk(dir, undefined, ['--output', mine]);
  const e2 = runOk(dir, undefined, ['--output', mine]);
  assert.equal(e1.env.data.output, mine);
  assert.equal(e2.env.data.output, mine, '--output 逐字落点不派生 _2');
  assert.deepEqual(readdirSync(dirname(mine)), [basename(mine)], '覆盖写不产生 _2');
});

test('#245 ⑦ 历史文件不清：超龄那份留着当留档，不被复用也不被删', () => {
  const dir = mkDb('stale');
  const a = runOk(dir);
  const old = a.env.data.output;
  // 把那份改成一个「3 天前」的名字：模拟历史留档（#245 明确「已有历史文件不清」）。
  const p = (n) => String(n).padStart(2, '0');
  const d3 = new Date(Date.now() - 3 * 86400000);
  const stamp = String(d3.getFullYear()) + p(d3.getMonth() + 1) + p(d3.getDate())
    + '_' + p(d3.getHours()) + p(d3.getMinutes()) + p(d3.getSeconds());
  const oldName = '卡路里_HELP_' + stamp + '.html';
  renameSync(old, join(htmlDirOf(dir), oldName));

  const b = runOk(dir); // 缺省一天窗口：3 天前那份超龄 ⇒ 必须落新的
  assert.notEqual(b.env.data.output, join(htmlDirOf(dir), oldName), '超龄那份不算命中');
  assert.equal(existsSync(join(htmlDirOf(dir), oldName)), true, '历史留档不许被删');
  assert.equal(namesOf(dir).length, 2, '旧的留着、新的另落一份');
  const c = runOk(dir);
  assert.equal(c.env.data.output, b.env.data.output, '再读复用刚落的新的那份');
  assert.equal(namesOf(dir).length, 2, '仍然两份（不再涨）');
});
