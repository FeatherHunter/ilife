/** #237 · 共用件 `saveHtmlFile` 的**真 spawn 锁**（不是模块内直调）。
 *
 * 锁五件事：
 *  ① **子路径出口**：子进程按包名 `import { saveHtmlFile } from 'base-paint/save-html'` 真解析成功，
 *     且**包根不开**（`'saveHtmlFile' in base-paint` 为假）＋该子路径的运行时出口**恰一个函数**；
 *  ② 名字通式 `<stem>_<本地 YYYYMMDD_HHMMSS>.html` ＋ 绝对路径 ＋ `bytes`＝**写后回读**的真实字节数；
 *  ③ 同秒递补（本体／`_2`／`_3`，槽位连续）与「绝不静默覆盖」；
 *  ④ `onExists` 四态 ＋ `reuse` 两支（`byDay`／`byContent`）；
 *  ⑤ 失败**真抛**：落点建不动时进程非 0、占位文件不被改写，且不把 `mkdirSync` 的失败当「候选撞名」空转。
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
    "import { saveHtmlFile } from 'base-paint/save-html';",
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

test('#237 ① 子路径出口：base-paint/save-html 真解析；包根不开；运行时出口恰一个函数', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', [
    "import * as sub from 'base-paint/save-html';",
    "import * as root from 'base-paint';",
    "process.stdout.write(JSON.stringify({ sub: Object.keys(sub).sort(), rootHas: 'saveHtmlFile' in root }));",
  ].join('\n')], { cwd: CONSUMER, encoding: 'utf8' });
  assert.equal(r.status, 0, 'base-paint/save-html 必须可解析（exports 映射）：' + r.stderr);
  const j = JSON.parse(String(r.stdout));
  assert.deepEqual(j.sub, ['saveHtmlFile'], '子路径运行时出口＝1 个函数（类型不出现在运行时）');
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

test('#237 ④b onExists:"overwrite"：落点＝<dir>/<stem> 逐字（stem 含扩展名），覆盖不递补', () => {
  const dir = mkTmp('over');
  const r = spawnSave(dir, [
    "const a = saveHtmlFile({ dir: DIR, stem: '我的帮助.html', html: 'X', onExists: 'overwrite' });",
    "const b = saveHtmlFile({ dir: DIR, stem: '我的帮助.html', html: 'YY', onExists: 'overwrite' });",
    "send({ a: basename(a.path), b: basename(b.path), body: readFileSync(b.path, 'utf8'), files: readdirSync(DIR) });",
  ].join('\n'));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.a, '我的帮助.html', '逐字落点：不带时间戳、不派生 _N');
  assert.equal(r.json.b, '我的帮助.html');
  assert.equal(r.json.body, 'YY', '后写覆盖前写');
  assert.deepEqual(r.json.files, ['我的帮助.html'], '不递补、不留第二份');
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
