/** #237 · 共用件 `saveHtmlFile` 的**真 spawn 锁**（不是模块内直调）。
 *
 * 锁五件事：
 *  ① **子路径出口**：子进程按包名 `import { saveHtmlFile } from 'base-paint/save-html'` 真解析成功，
 *     且**包根不开**（`'saveHtmlFile' in base-paint` 为假）＋该子路径的运行时出口＝落盘函数 ＋
 *     `#245` 补的窗口换算函数与默认窗口常量（无多余额外出口）；
 *  ② 名字通式 `<stem>_<本地 YYYYMMDD_HHMMSS>.html` ＋ 绝对路径 ＋ `bytes`＝**写后回读**的真实字节数；
 *  ③ 同秒递补（本体／`_2`／`_3`，槽位连续）与「绝不静默覆盖」；
 *  ④ `onExists` 四态 ＋ `reuse` 三支（`byDay`／`byContent`／`{byAge}`）＋ **两个名字口子 `stem`／`file`
 *     的正交性**（互斥、`file` 配 `succession` 阻断、`file` 的扩展名与结尾点不被当主体处理）；
 *  ⑤ 失败**真抛**：落点建不动时进程非 0、占位文件不被改写，且不把 `mkdirSync` 的失败当「候选撞名」空转。
 *  ⑥ `#245` 复用窗口的**参数面**：`reuseHours`（小时）→毫秒的唯一换算地（缺省一天／`0`＝每次新的／坏值真抛）。
 *
 * 为什么真 spawn：模块内直调测不到「包名子路径出口」这一层（`exports` 映射写错时模块内 import 照样绿）；
 * 且退出码／未捕获异常只有真进程能看见。子进程的 cwd 取**真消费者** `packages/skill-bill`
 * （`node_modules/base-paint` 是 pnpm 建的 junction，与线上解析路径同形）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc --build packages/base-render/tsconfig.json`，
 * 再 `node --test packages/base-render/test/output-save-html-237.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const CONSUMER = join(ROOT, 'packages', 'skill-bill');
const NAME_RE = /^(.+)_(\d{8}_\d{6})(?:_(\d+))?\.html$/;

const mkTmp = (tag) => mkdtempSync(join(tmpdir(), 't237-' + tag + '-'));

/** 本地时区零填充时间戳（与共用件同口径；测试侧独立算一份，不做同义反复）。 */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate())
    + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

/** 允许 ±5 秒：断言「时间戳＝本地时区、形如 YYYYMMDD_HHMMSS」，不把跨秒竞态当契约。 */
function stampWindow() {
  const t = Date.now();
  return [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((d) => localStamp(new Date(t + d * 1000)));
}

/** 在真消费者目录里 spawn 一个 ESM 子进程跑 `body`；`body` 用 `send(...)` 回一行 JSON。 */
function spawnSave(dir, body) {
  const script = [
    "import { saveHtmlFile, reuseWindowOfHours, HELP_REUSE_DEFAULT_HOURS } from 'base-paint/save-html';",
    "import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';",
    "import { basename, dirname, join } from 'node:path';",
    "const DIR = process.env.T237_DIR;",
    "const send = (v) => { process.stdout.write(JSON.stringify(v)); };",
    'try {',
    body,
    '} catch (e) {',
    "  send({ thrown: { message: String((e && e.message) || e), code: (e && e.code) || '' } });",
    '}',
  ].join('\n');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: CONSUMER, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, T237_DIR: dir },
  });
  let json = null;
  try { json = JSON.parse(String(r.stdout)); } catch { json = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), json };
}

test('#237 ① 子路径出口：base-paint/save-html 真解析；包根不开；运行时出口＝落盘 ＋ 窗口换算两支', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', [
    "import * as sub from 'base-paint/save-html';",
    "import * as root from 'base-paint';",
    "process.stdout.write(JSON.stringify({ sub: Object.keys(sub).sort(), rootHas: 'saveHtmlFile' in root }));",
  ].join('\n')], { cwd: CONSUMER, encoding: 'utf8' });
  assert.equal(r.status, 0, 'base-paint/save-html 必须可解析（exports 映射）：' + r.stderr);
  const j = JSON.parse(String(r.stdout));
  // #245 起这一支多两支（`reuseWindowOfHours` 换算 ＋ `helpReuseWindowOf` 把它接到各家的「参数错」档）
  // 与一个默认窗口常量——「几小时＝多少毫秒、坏参怎么判」的唯一定义地。
  assert.deepEqual(j.sub, ['HELP_REUSE_DEFAULT_HOURS', 'helpReuseWindowOf', 'reuseWindowOfHours', 'saveHtmlFile'],
    '子路径运行时出口＝落盘 ＋ 窗口换算 ＋ 窗口工厂 ＋ 默认窗口常量（类型不出现在运行时）');
  assert.equal(j.rootHas, false, '绝不从包根开（包根出口受 src/spec 契约面锁死）');
});

test('#237 ② 名字通式＋绝对路径＋bytes 为写后回读的真实字节数（落点目录递归创建）', () => {
  const dir = mkTmp('name');
  const out = join(dir, 'naming'); // 先不存在：锁「递归创建」
  const r = spawnSave(dir, [
    "const html = '<!DOCTYPE html><p>甲·UTF-8</p>';",
    "const x = saveHtmlFile({ dir: join(DIR, 'naming'), stem: '饼干记账_HELP', html });",
    "send({ path: x.path, bytes: x.bytes, mode: x.mode, size: statSync(x.path).size,",
    "  expect: Buffer.byteLength(html, 'utf8'), body: readFileSync(x.path, 'utf8'), files: readdirSync(join(DIR, 'naming')) });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  const j = r.json;
  const m = NAME_RE.exec(basename(j.path));
  assert.ok(m, '名字须为通式：' + basename(j.path));
  assert.equal(m[1], '饼干记账_HELP');
  assert.ok(stampWindow().includes(m[2]), '时间戳须为本地时区零填充：' + m[2]);
  assert.equal(m[3], undefined, '干净目录首份不带 _N');
  assert.ok(isAbsolute(j.path), 'path 须绝对：' + j.path);
  assert.equal(dirname(j.path), out, '落 dir 下');
  assert.equal(j.mode, 'file');
  assert.equal(j.bytes, j.size, 'bytes 必须是实际落盘字节数（写后回读）');
  assert.equal(j.bytes, j.expect, 'bytes 与本次产物 UTF-8 字节数一致');
  assert.equal(j.body, '<!DOCTYPE html><p>甲·UTF-8</p>');
  assert.deepEqual(j.files.length, 1);
});

test('#237 ③ 同秒递补：连写三次得本体／_2／_3，各自内容不被覆盖', () => {
  const dir = mkTmp('succ');
  const r = spawnSave(dir, [
    "const stem = '饼干记账_HELP';",
    "const paths = ['A', 'B', 'C'].map((h) => saveHtmlFile({ dir: DIR, stem, html: h }).path);",
    "send({ names: paths.map((p) => basename(p)), bodies: paths.map((p) => readFileSync(p, 'utf8')), count: readdirSync(DIR).length });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  const j = r.json;
  assert.equal(new Set(j.names).size, 3, '三次落点互异：' + j.names.join(','));
  assert.deepEqual(j.bodies, ['A', 'B', 'C'], '各自内容即本次产物（零交叉覆盖）');
  assert.equal(j.count, 3, '目录里恰好三份');
  // 同秒：槽位自本体起连续；跨秒：各自独立（两种都合法，不把进程调度当契约）。
  const byStamp = new Map();
  for (const n of j.names) {
    const m = NAME_RE.exec(n);
    byStamp.set(m[2], [...(byStamp.get(m[2]) ?? []), m[3] ?? '1']);
  }
  for (const [, slots] of byStamp) {
    assert.deepEqual([...slots].sort(), ['1', '2', '3'].slice(0, slots.length), '同秒槽位须连续：' + JSON.stringify(slots));
  }
});

test('#237 ④ onExists:"fail"：撞名即抛 EEXIST，不递补、不改写已有那份', () => {
  const dir = mkTmp('fail');
  const r = spawnSave(dir, [
    'const stem = \'饼干记账_HELP\';',
    'let hit = null;',
    'for (let i = 0; i < 50 && hit === null; i++) {',
    "  const d = mkdtempSync(join(DIR, 'f'));",
    "  let first = null;",
    "  try { first = saveHtmlFile({ dir: d, stem, html: 'A', onExists: 'fail' }); } catch { continue; }",
    '  try {',
    "    saveHtmlFile({ dir: d, stem, html: 'B', onExists: 'fail' });",
    '  } catch (e) {',
    "    hit = { code: e.code, message: String(e.message), first: first.path, firstBody: readFileSync(first.path, 'utf8'), count: readdirSync(d).length };",
    '  }',
    '}',
    'send({ hit });',
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.json.hit, '50 次尝试内必有一次落在同一秒（第二次必撞名）');
  assert.equal(r.json.hit.code, 'EEXIST');
  assert.match(r.json.hit.message, /fail/);
  assert.equal(r.json.hit.firstBody, 'A', '已有那份不得被改写');
  assert.equal(r.json.hit.count, 1, 'fail 态不得派生第二份');
});

test('#237 ④b onExists:"overwrite" ＋ file：落点＝<dir>/<file> 逐字，覆盖不递补', () => {
  const dir = mkTmp('over');
  const r = spawnSave(dir, [
    "const a = saveHtmlFile({ dir: DIR, file: '我的帮助.html', html: 'X', onExists: 'overwrite' });",
    "const b = saveHtmlFile({ dir: DIR, file: '我的帮助.html', html: 'YY', onExists: 'overwrite' });",
    "send({ a: basename(a.path), b: basename(b.path), body: readFileSync(b.path, 'utf8'), files: readdirSync(DIR) });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.a, '我的帮助.html', '逐字落点：不带时间戳、不派生 _N');
  assert.equal(r.json.b, '我的帮助.html');
  assert.equal(r.json.body, 'YY', '后写覆盖前写');
  assert.deepEqual(r.json.files, ['我的帮助.html'], '不递补、不留第二份');
});

test('#237 ④b2 stem 与 file 是两个正交的口子：互斥、且 file 不许配 succession', () => {
  const dir = mkTmp('two-ports');
  const r = spawnSave(dir, [
    "const e = (f) => { try { return { ok: f() }; } catch (x) { return { code: x.code, message: String(x.message) }; } };",
    // 同时给 → 阻断（说不清要落哪个）
    "const both = e(() => saveHtmlFile({ dir: DIR, stem: '甲_HELP', file: '乙.html', html: 'H', onExists: 'overwrite' }));",
    // file ＋ succession → 阻断（那一态要加时间戳，与「逐字名字」自相矛盾）
    "const stamped = e(() => saveHtmlFile({ dir: DIR, file: '丙.html', html: 'H', onExists: 'succession' }));",
    // 都不给 → 阻断
    "const none = e(() => saveHtmlFile({ dir: DIR, html: 'H' }));",
    // overwrite ＋ stem（不带扩展名）→ 本件补 .html，正常落
    "const stemOnly = saveHtmlFile({ dir: DIR, stem: '丁', html: 'S', onExists: 'overwrite' });",
    "send({ both, stamped, none, stemName: basename(stemOnly.path), files: readdirSync(DIR) });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.both.code, 'EINVAL', 'stem 与 file 同时给必须阻断');
  assert.match(r.json.both.message, /只能给一个/);
  assert.equal(r.json.stamped.code, 'EINVAL', 'file 配 succession 必须阻断');
  assert.match(r.json.stamped.message, /succession/);
  assert.equal(r.json.none.code, 'EINVAL', '一个名字都不给必须阻断');
  assert.equal(r.json.stemName, '丁.html', 'overwrite ＋ stem 时扩展名由本件补');
  assert.deepEqual(r.json.files, ['丁.html'], '两条阻断路径都不得落盘');
});

test('#237 ④b3 onExists:"fail" ＋ file：撞名即抛，逐字落点不带时间戳', () => {
  const dir = mkTmp('fail-file');
  const r = spawnSave(dir, [
    "const a = saveHtmlFile({ dir: DIR, file: '定名.html', html: 'A', onExists: 'fail' });",
    "let hit = null;",
    "try { saveHtmlFile({ dir: DIR, file: '定名.html', html: 'B', onExists: 'fail' }); } catch (e) { hit = e.code; }",
    "send({ first: basename(a.path), hit, body: readFileSync(a.path, 'utf8'), count: readdirSync(DIR).length });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.first, '定名.html', 'fail ＋ file：名字逐字、不带时间戳');
  assert.equal(r.json.hit, 'EEXIST');
  assert.equal(r.json.body, 'A', '已有那份不得被改写');
  assert.equal(r.json.count, 1, 'fail 态不派生第二份');
});

test('#237 ④b4 file 的结尾点与空格不当成主体：逐字落点保留扩展名', () => {
  const dir = mkTmp('file-tail');
  const r = spawnSave(dir, [
    "const x = saveHtmlFile({ dir: DIR, file: '带点.html', html: 'S', onExists: 'overwrite' });",
    "const y = saveHtmlFile({ dir: DIR, file: 'a/b.html', html: 'S', onExists: 'overwrite' });",
    "send({ x: basename(x.path), y: basename(y.path) });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.x, '带点.html', 'file 的扩展名不得被当主体结尾的点剥掉');
  assert.equal(r.json.y, 'a_b.html', '非法字符仍照主体同一套口径洗成 _');
});

test('#237 ④c reuse:"byDay"：当天已有同一主体的一份 → 返回它，不新建、不改写', () => {
  const dir = mkTmp('byday');
  const r = spawnSave(dir, [
    "const first = saveHtmlFile({ dir: DIR, stem: '卡路里_HELP', html: 'DAY1' });",
    "const again = saveHtmlFile({ dir: DIR, stem: '卡路里_HELP', html: 'DAY2', onExists: { reuse: 'byDay' } });",
    "send({ same: first.path === again.path, path: again.path, body: readFileSync(again.path, 'utf8'),",
    "  bytes: again.bytes, size: statSync(again.path).size, count: readdirSync(DIR).length });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.same, true, '当天复用：返回已有那份（不按名字判——时间戳到秒）');
  assert.equal(r.json.body, 'DAY1', '不新建、不改写已有那份');
  assert.equal(r.json.bytes, r.json.size, 'bytes ＝ 已有那份的实际字节数');
  assert.equal(r.json.count, 1, '目录里仍只有一份');
});

test('#237 ④e reuse:{byAge}：窗口内返回同一份（不新建）；窗口＝0 则每次都落新的（同秒重跑也不许命中）', () => {
  const dir = mkTmp('byage');
  const r = spawnSave(dir, [
    "const oneDay = { reuse: { byAge: 86400000 } };",
    "const a = saveHtmlFile({ dir: DIR, stem: 'P_HELP', html: 'A', onExists: oneDay });",
    "const b = saveHtmlFile({ dir: DIR, stem: 'P_HELP', html: 'B', onExists: oneDay });",
    "const c = saveHtmlFile({ dir: DIR, stem: 'P_HELP', html: 'C', onExists: oneDay });",
    // ⚠️ 这条是 #245 抓到的真缺陷的锁：落盘时刻是**秒级**的，同一秒内 `now − at === 0`，
    //    判据若写成 `<=` 就会把「本秒刚落的这一份」当命中 ⇒ `byAge:0` 的「每次都落新的」当场失效。
    "const d = saveHtmlFile({ dir: DIR, stem: 'Q_HELP', html: 'D', onExists: { reuse: { byAge: 0 } } });",
    "const e = saveHtmlFile({ dir: DIR, stem: 'Q_HELP', html: 'E', onExists: { reuse: { byAge: 0 } } });",
    "const f = saveHtmlFile({ dir: DIR, stem: 'Q_HELP', html: 'F', onExists: { reuse: { byAge: 0 } } });",
    "send({ same3: a.path === b.path && b.path === c.path, a: basename(a.path), body: readFileSync(a.path, 'utf8'),",
    "  files: readdirSync(DIR).length, zeroNew: new Set([d.path, e.path, f.path]).size === 3,",
    "  zeroBodies: [d, e, f].map((x) => readFileSync(x.path, 'utf8')) });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.json.a, NAME_RE, 'byAge 首调落的名字也必须是通式（带时间戳）：' + r.json.a);
  assert.equal(r.json.same3, true, '窗口内三次调用必须返回同一份');
  assert.equal(r.json.body, 'A', '不新建、不改写（内容仍是第一次那份）');
  assert.equal(r.json.files, 4, '窗口内 3 次只落 1 份（P 组）；byAge:0 三次各落一份（Q 组）⇒ 共 4 份');
  assert.equal(r.json.zeroNew, true, 'byAge:0 永不命中 ⇒ 每次都落新的（同秒三次也必须三个落点）');
  assert.deepEqual(r.json.zeroBodies, ['D', 'E', 'F'], '原有的那份不得被改写，新的各是各的');
});

test('#237 ④e2 reuse:{byAge}：超龄的那一份不算命中（改名造一份「3 天前」的来验）', () => {
  const dir = mkTmp('byage-old');
  const r = spawnSave(dir, [
    // ⚠️ 不能在 body 里 `import`——body 被拼进 `try { … }` 里，ESM 的 import 只许在顶层。
    "const { renameSync } = process.getBuiltinModule('node:fs');",
    "const oneDay = { reuse: { byAge: 86400000 } };",
    "const a = saveHtmlFile({ dir: DIR, stem: 'R_HELP', html: 'OLD', onExists: oneDay });",
    "const p = (n) => String(n).padStart(2, '0');",
    "const d3 = new Date(Date.now() - 3 * 86400000);",
    "const stamp = String(d3.getFullYear()) + p(d3.getMonth() + 1) + p(d3.getDate()) + '_' + p(d3.getHours()) + p(d3.getMinutes()) + p(d3.getSeconds());",
    "const oldName = 'R_HELP_' + stamp + '.html';",
    "const old = join(DIR, oldName);",
    "renameSync(a.path, old);",
    "const b = saveHtmlFile({ dir: DIR, stem: 'R_HELP', html: 'NEW', onExists: oneDay });",
    "send({ oldName, newEnough: b.path !== old, count: readdirSync(DIR).length, bBody: readFileSync(b.path, 'utf8') });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.notEqual(r.json.oldName, undefined);
  assert.equal(r.json.newEnough, true, '唯一那份超龄 ⇒ 必须落新的，不许复用它');
  assert.equal(r.json.count, 2, '旧的留着（留档），新的另落一份');
  assert.equal(r.json.bBody, 'NEW');
});

test('#237 ④e3 reuse:{byAge} 的非法窗口真抛；file 仍不许配 reuse', () => {
  const dir = mkTmp('byage-bad');
  const r = spawnSave(dir, [
    "const e = (f) => { try { return { ok: f() }; } catch (x) { return { code: x.code, message: String(x.message) }; } };",
    "const neg = e(() => saveHtmlFile({ dir: DIR, stem: 'S_HELP', html: 'H', onExists: { reuse: { byAge: -1 } } }));",
    "const nan = e(() => saveHtmlFile({ dir: DIR, stem: 'S_HELP', html: 'H', onExists: { reuse: { byAge: Number.NaN } } }));",
    "const withFile = e(() => saveHtmlFile({ dir: DIR, file: 'X.html', html: 'H', onExists: { reuse: { byAge: 1000 } } }));",
    "send({ neg, nan, withFile, files: readdirSync(DIR).length });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.neg.code, 'EINVAL');
  assert.equal(r.json.nan.code, 'EINVAL');
  assert.match(r.json.neg.message, /byAge/);
  assert.equal(r.json.withFile.code, 'EINVAL', 'file（逐字落点）不许配 reuse');
  assert.equal(r.json.files, 0, '三条阻断路径都不得落盘');
});

/* ── #245 · 复用窗口的参数面：`reuseHours` → 毫秒（「几小时＝多少毫秒」的唯一定义地）──────────────
 *
 * 五家技能出口（卡路里／记账／备忘录／作息／大厨）都从 `--params` 的 `reuseHours` 走这一个函数，
 * 不许各抄一份转换与校验（铁律二）。判据：缺省＝一天、`0`＝每次都落新的、正数＝该窗口、其余真抛。 */
test('#245 窗口换算：缺省＝一天／0＝每次都落新的／正数＝该窗口／坏值真抛', () => {
  const dir = mkTmp('reuse-window');
  const r = spawnSave(dir, [
    "const W = reuseWindowOfHours;",
    "const oneDay = HELP_REUSE_DEFAULT_HOURS * 3600000;",
    "const e = (fn) => { try { fn(); return null; } catch (x) { return { name: x.constructor.name, message: String(x.message) }; } };",
    "send({",
    "  defaultHours: HELP_REUSE_DEFAULT_HOURS,",
    "  undef: W(undefined, HELP_REUSE_DEFAULT_HOURS),",
    "  blank: W('', HELP_REUSE_DEFAULT_HOURS),",
    "  noDefault: W(undefined),",
    "  zero: W(0, HELP_REUSE_DEFAULT_HOURS),",
    "  one: W(1),",
    "  threeDays: W(72),",
    "  numericStr: W('2'),",
    "  nonNumericStr: e(() => W('一天')),",
    "  neg: e(() => W(-1)),",
    "  nan: e(() => W(Number.NaN)),",
    "  minusInf: e(() => W(Number.NEGATIVE_INFINITY)),",
    "  bool: e(() => W(true)),",
    "  obj: e(() => W({ hours: 1 })),",
    "  files: readdirSync(DIR).length,",
    "});",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  const j = r.json;
  assert.equal(j.defaultHours, 24, '缺省窗口＝一天（维护者原话「1 天内直接返回一份」）');
  assert.equal(j.undef, j.defaultHours * 3_600_000, '不给参数 ⇒ 用缺省窗口（24 小时）');
  assert.equal(j.blank, j.undef, '空串同「不给」');
  assert.equal(j.noDefault, 0, '没有缺省窗口的调用方：不给 ⇒ 0（＝每次都落新的，老口径）');
  assert.equal(j.zero, 0, '显式的 0 ⇒ 每次都落新的（要一份最新的走这条）');
  assert.equal(j.one, 3_600_000, '1 小时');
  assert.equal(j.threeDays, 259_200_000, '三天（维护者原话点名的另一种参数）');
  assert.equal(j.numericStr, 7_200_000, '数字串按数算（JSON／argv 两路同口径）');
  for (const [k, label] of [['nonNumericStr', '非数字串'], ['neg', '负数'], ['nan', 'NaN'],
    ['minusInf', '-Infinity'], ['bool', '布尔'], ['obj', '对象']]) {
    assert.equal(j[k]?.name, 'RangeError', label + ' 必须真抛（坏参阻断，不静默当 0）：' + JSON.stringify(j[k]));
    assert.match(String(j[k].message), /reuseHours 非法/, label + ' 的报错须点名参数');
  }
  assert.equal(j.files, 0, '换算本身不落盘（纯函数）');
});

test('#245 换算接上落盘：`byAge` 用缺省一天 ⇒ 连读 3 次目录只 1 份；`0` ⇒ 每次一份', () => {
  const dir = mkTmp('reuse-window-wire');
  const r = spawnSave(dir, [
    "const W = reuseWindowOfHours;",
    "const stamp = 'A_HELP';",
    "const one = (i) => ({ dir: DIR, stem: stamp, html: 'V' + i, onExists: { reuse: { byAge: W(undefined, HELP_REUSE_DEFAULT_HOURS) } } });",
    "const a = saveHtmlFile(one(1)), b = saveHtmlFile(one(2)), c = saveHtmlFile(one(3));",
    "const fresh = (i) => saveHtmlFile({ dir: DIR, stem: 'B_HELP', html: 'F' + i, onExists: { reuse: { byAge: W(0) } } });",
    "const d = fresh(1), e2 = fresh(2);",
    "send({ same3: a.path === b.path && b.path === c.path, bodyA: readFileSync(a.path, 'utf8'),",
    "  freshNew: d.path !== e2.path, count: readdirSync(DIR).length,",
    "  sizes: [a.bytes, b.bytes, c.bytes] });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  const j = r.json;
  assert.equal(j.same3, true, '缺省窗口内三次＝同一份（24 小时内只产出 1 个）');
  assert.equal(j.bodyA, 'V1', '窗口内不改写已有那份');
  assert.deepEqual(j.sizes, [j.sizes[0], j.sizes[0], j.sizes[0]], '三次回执的 bytes 都指同一份');
  assert.equal(j.freshNew, true, '`reuseHours:0` ⇒ 每次都落新的');
  assert.equal(j.count, 3, '目录里：A 组 1 份 ＋ B 组 2 份');
});

test('#237 ④d reuse:"byContent"：内容哈希相同 → 复用；内容不同 → 落新的', () => {
  const dir = mkTmp('bycontent');
  const r = spawnSave(dir, [
    "const first = saveHtmlFile({ dir: DIR, stem: 'X_HELP', html: 'SAME' });",
    "const same = saveHtmlFile({ dir: DIR, stem: 'X_HELP', html: 'SAME', onExists: { reuse: 'byContent' } });",
    "const other = saveHtmlFile({ dir: DIR, stem: 'X_HELP', html: 'OTHER', onExists: { reuse: 'byContent' } });",
    "send({ same: first.path === same.path, otherNew: other.path !== first.path,",
    "  otherBody: readFileSync(other.path, 'utf8'), count: readdirSync(DIR).length });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.same, true, '同内容复用已有那份');
  assert.equal(r.json.otherNew, true, '不同内容落新的（绝不覆盖）');
  assert.equal(r.json.otherBody, 'OTHER');
  assert.equal(r.json.count, 2);
});

test('#237 ⑤ 文件名安全化：Windows 非法字符→_、去结尾点与空格、按码点截断', () => {
  const dir = mkTmp('sanitize');
  const r = spawnSave(dir, [
    "const x = saveHtmlFile({ dir: DIR, stem: 'a/b:c*d?e\"f<g>h|i. ', html: 'S' });",
    "const long = saveHtmlFile({ dir: DIR, stem: '长'.repeat(300), html: 'S' });",
    "send({ name: basename(x.path), longLen: [...basename(long.path).replace(/_[0-9]{8}_[0-9]{6}\\.html$/, '')].length });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  const name = r.json.name;
  assert.equal(/[/:*?"<>|]/.test(name), false, '非法字符不得出现在落盘名里：' + name);
  assert.equal(/[. ]_[0-9]{8}_[0-9]{6}\.html$/.test(name), false, '主体结尾的点与空格须去掉：' + name);
  assert.match(name, /^a_b_c_d_e_f_g_h_i_\d{8}_\d{6}\.html$/, name);
  assert.ok(r.json.longLen <= 180, '超长主体须按码点截断：' + String(r.json.longLen));
});

test('#237 ⑤b 落点建不动＝真抛（进程非 0）：占位文件不被改写，且不把 mkdir 失败当候选撞名空转', () => {
  const dir = mkTmp('blocked');
  const blocked = join(dir, 'blocked');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', [
    "import { saveHtmlFile } from 'base-paint/save-html';",
    "import { writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "const bad = join(process.env.T237_DIR, 'blocked');",
    "writeFileSync(bad, 'not a dir');",
    "saveHtmlFile({ dir: bad, stem: 'X_HELP', html: 'H' });",
    "process.stdout.write('NO-THROW');",
  ].join('\n')], { cwd: CONSUMER, encoding: 'utf8', env: { ...process.env, T237_DIR: dir } });
  assert.notEqual(r.status, 0, '落点建不动必须真抛（退出码非 0），不得静默成功');
  assert.equal(String(r.stdout).includes('NO-THROW'), false, '不得走到写完那一步');
  assert.match(String(r.stderr), /EEXIST/, '错误码须是文件系统的 EEXIST：' + String(r.stderr).slice(-300));
  assert.equal(String(r.stderr).includes('递补超限'), false, '目录建不动不得被当成「候选撞名」空转递补');
  assert.equal(readFileSync(blocked, 'utf8'), 'not a dir', '占位文件不得被改写');
  assert.deepEqual(readdirSync(dir), ['blocked']);
});
