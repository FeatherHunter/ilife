/** #230 · 「备忘录 help」出口的 CLI 级回归锁（**真 spawn 出口**）：把 #229 落地的口径钉死，
 *  防以后有人悄悄改掉文件名或落盘行为。五例照记账那张图（`skill-bill/test/help-exit-148.test.mjs`）：
 *
 *   ① 名字通式与落点——`备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html` 落**扁平** `memo_html/`，回执给绝对路径；
 *   ② help 模板前后缀逐字——产物＝共享壳（`base-paint/help-shell`）前缀＋`help-data` 载荷＋后缀，标题槽已填；
 *   ③ 并发 6 次独占递补——六次落点两两不同、内容互不覆盖、`_N` 从 `_2` 起（裁决 3 硬条件 2）；
 *   ④ 三支互不串——缺省 HELP 文件 ／ `mode:"lookup"` 速查表（裁决 2 分名）／ `q` 只回命中不落盘；
 *   ⑤ 退出码矩阵——0 ／ 2 参数错 ／ 3 未知 key ／ 5 落盘失败（＋1 缺 `SKILLS_DB_PATH`）。
 *
 *  课（#139）：模块级测试全绿 ≠ 用户拿到东西 ⇒ 本文件**只经真 spawn**，一次都不直接调模块。
 *  课（#148）：并发要用**异步** spawn——`spawnSync` 会把并发串成串行，测不出独占递补。
 *
 *  **「跑完不建库」的深锁**折进 ① 与 ④（出口的分派先于开库）：
 *  缺省／速查两支只多一个 `memo_html/`，`q` 支连 `SKILLS_DB_PATH` 本身都不建；
 *  任何一支都不建 `<db>/memo` 库目录（票 6 V4 的初始化判据＝库**目录**存在），也不建老家的 `memo.db` 空壳。
 *
 *  跑法（**只构建本包**；禁仓根 `tsc -b`／`pnpm -r build`——`plugin-bill-ilife` 的 `dist/client.js` 会被
 *  改写成裸 ESM 而让 web GUI 起不来，见 #241）：
 *    node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force
 *    node --test packages/skill-memo-ilife/test/cli-help-230.test.mjs
 *  临时库全在 `%TEMP%` 下（`SKILLS_DB_PATH` 逐次指过去），**不动真库** `D:\2Study\StudyNotes\.db`。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_SHELL_DATA_OPEN, HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX, HELP_SHELL_TITLE_SLOT } from 'base-paint/help-shell';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const KEY = 'memo.help.lookup';
const HELP_NAME_RE = /^备忘录_HELP_\d{8}_\d{6}(_\d+)?\.html$/;
const LOOKUP_NAME_RE = /^备忘录_速查表_\d{8}_\d{6}(_\d+)?\.html$/;
const HTML_DIR = 'memo_html';

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 'memo230-' + tag + '-'));
const htmlDirOf = (dir) => join(dir, HTML_DIR);
const envOf = (dir) => ({ ...process.env, SKILLS_DB_PATH: dir });

/** 真 spawn 出口：`--params` 逐字进 argv，不经任何 shell（Windows 上 PowerShell／cmd 会吃掉内层引号）。 */
function run(dir, args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: envOf(dir) });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

/** 异步版（并发用；`spawnSync` 会把并发串行化，测不出独占递补）。 */
function runAsync(dir, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...args], { env: envOf(dir) });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      let env = null;
      try { env = JSON.parse(out); } catch { env = null; }
      resolve({ status: code, stdout: out, stderr: err, env });
    });
  });
}

function runOk(dir, args) {
  const r = run(dir, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON：' + r.stdout.slice(0, 200));
  assert.equal(r.stdout.trim().split('\n').length, 1, 'stdout 恒一行 JSON');
  return r;
}

/** 取 `<script id="help-data">` 载荷（壳内 JSON）。 */
function helpData(html) {
  assert.ok(html.includes(HELP_SHELL_DATA_OPEN), '缺 help-data 锚点');
  const at = html.indexOf(HELP_SHELL_DATA_OPEN);
  return JSON.parse(html.slice(at + HELP_SHELL_DATA_OPEN.length, html.indexOf('</script>', at)));
}

const scenesOf = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const stampOf = (p) => (basename(p).match(/_(\d{8}_\d{6})(?:_(\d+))?\.html$/) || []).slice(1);

test('#230 ① 名字通式与落点：备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html 落扁平 memo_html/，回执绝对路径', () => {
  const dir = mkDir('name');
  const r = runOk(dir, [KEY]);
  const out = r.env.delivery.path;

  assert.equal(r.env.key, KEY);
  assert.equal(r.env.shape, 'list');
  assert.deepEqual(Object.keys(r.env), ['version', 'skill', 'shape', 'key', 'data', 'delivery'], 'delivery 顶层追加、既有五字段序不变');
  assert.equal(r.env.delivery.mode, 'file');
  assert.ok(HELP_NAME_RE.test(basename(out)), '文件名通式：' + basename(out));
  assert.equal(dirname(out), htmlDirOf(dir), '落 <SKILLS_DB_PATH>/memo_html/（绝对路径、扁平）');
  assert.equal(basename(dirname(out)), HTML_DIR, '子目录名逐字 memo_html');
  assert.equal(out.includes(join(HTML_DIR, 'help')), false, '裁决 1：不加 help/ 一层');
  assert.ok(existsSync(out), '回执路径真的存在');
  assert.equal(statSync(out).size, r.env.delivery.bytes, 'delivery.bytes ＝ 落盘字节数');
  assert.equal(r.env.delivery.bytes, Buffer.byteLength(readFileSync(out, 'utf8'), 'utf8'));
  assert.equal(r.stderr, '', '成功不往 stderr 写东西');

  // 载荷＝域级索引（`list` 形）：一行一域，计数派生（8 域／13 二级组／30 场景／版本 1.3.0）
  assert.equal(r.env.data.mode, 'file');
  assert.equal(r.env.data.total, 8, '域级索引 8 行');
  assert.equal(r.env.data.subgroupTotal, 13);
  assert.equal(r.env.data.sceneTotal, 30);
  assert.equal(r.env.data.version, '1.3.0');

  // 跑完不建库（深锁）：这一次调用只多出一个 memo_html/
  assert.deepEqual(readdirSync(dir), [HTML_DIR], '看帮助只多一个 memo_html/');
  assert.deepEqual(readdirSync(htmlDirOf(dir)), [basename(out)], '目录里恰好这一份产物');
  assert.equal(existsSync(join(dir, 'memo')), false, '不建 memo 库目录（票 6 V4 的初始化判据）');
  assert.equal(existsSync(join(dir, 'memo.db')), false, '也不建老家的 memo.db 空壳文件');
});

test('#230 ② help 模板前后缀逐字：产物＝共享壳前缀（只填标题槽）＋载荷＋后缀', () => {
  const dir = mkDir('shell');
  const out = runOk(dir, [KEY]).env.delivery.path;
  const html = readFileSync(out, 'utf8');

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  assert.equal(title, '备忘录 · 使用手册', '文档标题由共享层按 skill_name · title 拼成');
  assert.ok(html.startsWith(HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title)), '前缀逐字（仅替换标题槽）');
  assert.ok(html.endsWith(HELP_SHELL_SUFFIX), '后缀逐字');
  assert.equal(html.includes(HELP_SHELL_TITLE_SLOT), false, '标题槽不得留占位（留了就是原型水印）');

  const data = helpData(html);
  assert.equal(data.skill_name, '备忘录');
  assert.equal(data.title, '使用手册');
  assert.equal(data.groups.length, 8, '8 域');
  assert.equal(scenesOf(data).length, 30, '30 场景');
  assert.equal(data.version, '1.3.0');
  assert.equal(scenesOf(data).some((s) => 'aliases' in s), false, '裁决 5：aliases 留在资产、不进渲染载荷');
  assert.equal(scenesOf(data).every((s) => typeof s.prompt_template === 'string' && s.prompt_template.length > 0), true, '场景卡带指令正文');
});

test('#230 ③ 并发 6 次独占递补：六份产物两两不同、内容互不覆盖、`_N` 从 `_2` 起', async () => {
  const dir = mkDir('race');
  const rs = await Promise.all(Array.from({ length: 6 }, () => runAsync(dir, [KEY])));
  for (const r of rs) { assert.equal(r.status, 0, r.stderr); assert.ok(r.env, 'stdout 可解析：' + r.stdout.slice(0, 200)); }

  // 本例只锁**独占性与递补**（名字通式归 ①④）⇒ 名字主体被改时本例应仍绿，变异签名才指向唯一一处。
  const paths = rs.map((r) => r.env.delivery.path);
  assert.equal(new Set(paths).size, 6, '六次调用六个不同落点：' + JSON.stringify(paths.map((p) => basename(p))));
  const files = readdirSync(htmlDirOf(dir));
  assert.equal(files.length, 6, '目录里恰好 6 份产物（无互相覆盖）：' + JSON.stringify(files.slice().sort()));
  assert.equal(files.filter((f) => /_\d{8}_\d{6}_1\.html$/.test(f)).length, 0, '递补从 `_2` 起（裁决 3 硬条件 2）——绝不出现 `_1`');
  for (const r of rs) {
    const html = readFileSync(r.env.delivery.path, 'utf8');
    assert.equal(Buffer.byteLength(html, 'utf8'), r.env.delivery.bytes, '每份内容与自己的回执字节数一致');
    assert.equal(scenesOf(helpData(html)).length, 30, '每份都是完整壳（未被截断／覆盖）');
  }
  // 同秒情形：各次必须占**不同槽位**，且必有一次拿到本体名——谁先到是任意的，
  // 故不断言「首个不带 _N」（那是把进程调度当契约）；跨秒则各自独立，两种都合法（照 #139／#148 去时间竞态口径）。
  const stamps = paths.map(stampOf);
  const sameSecond = stamps.filter((s) => s[0] === stamps[0][0]);
  if (sameSecond.length > 1) {
    const slots = sameSecond.map((s) => s[1] ?? '1');
    assert.equal(new Set(slots).size, slots.length, '同秒各次占的槽位互不相同：' + JSON.stringify(slots));
    assert.ok(slots.includes('1'), '同秒内必有一次拿到本体名（无 `_N`）：' + JSON.stringify(slots));
  }
});

test('#230 ④ 三支互不串：缺省 HELP 文件 ／ mode:"lookup" 速查表 ／ q 只回命中不落盘', () => {
  const dir = mkDir('branches');
  const help = runOk(dir, [KEY]);
  const sheet = runOk(dir, [KEY, '--params', JSON.stringify({ mode: 'lookup' })]);
  const hp = help.env.delivery.path;
  const sp = sheet.env.delivery.path;

  assert.ok(HELP_NAME_RE.test(basename(hp)), '缺省名：' + basename(hp));
  assert.ok(LOOKUP_NAME_RE.test(basename(sp)), '速查名：' + basename(sp));
  assert.notEqual(hp, sp, '两支产物分名（#139 判法：别让用户按一个名字打开到另一个东西）');
  assert.deepEqual(readdirSync(htmlDirOf(dir)).slice().sort(), [basename(hp), basename(sp)].slice().sort(), '两件并排、互不覆盖');

  const hHtml = readFileSync(hp, 'utf8');
  const sHtml = readFileSync(sp, 'utf8');
  assert.ok(hHtml.startsWith('<!DOCTYPE html>') && hHtml.includes(HELP_SHELL_DATA_OPEN), '缺省＝全壳 HELP 页');
  assert.equal(sHtml.includes(HELP_SHELL_DATA_OPEN), false, '速查表不是 HELP 壳');
  assert.equal(sHtml.startsWith('<!DOCTYPE html>'), false, '速查表＝envelope 分节片段，不是整页');
  assert.match(sHtml, /<section/, '速查表＝分节页');

  assert.equal(help.env.data.mode, 'file', '缺省回域级索引');
  assert.equal(help.env.data.total, 8);
  assert.equal(sheet.env.data.mode, 'lookup', '速查支回短语表');
  assert.ok(LOOKUP_NAME_RE.test(basename(sp)) && sheet.env.data.total >= 28, '速查表含全量唤醒词：' + sheet.env.data.total);
  assert.equal(sheet.env.data.items.every((it) => String(it.category).startsWith('memo.')), true, '每行给 key');
  assert.notEqual(help.env.data.total, sheet.env.data.total, '两支载荷形状不同（索引 ≠ 短语表）');

  // q 支用**独立**的 db 目录：前两支已经把 memo_html 建出来了，共用目录测不出「q 零落盘」。
  const dbQ = join(dir, 'q');
  const q = runOk(dbQ, [KEY, '--params', JSON.stringify({ q: '查提醒' })]);
  assert.equal(q.env.delivery, undefined, 'q＝现找：不默认落盘');
  assert.equal(q.env.data.total, 1);
  assert.equal(q.env.data.items[0].category, 'memo.remind');
  assert.equal(existsSync(dbQ), false, 'q 支连 SKILLS_DB_PATH 本身都不建（零落盘、零建库）');
  // 两支落盘的那次也只多一个 memo_html/，全程不建库
  assert.deepEqual(readdirSync(dir), [HTML_DIR], '看帮助只多一个 memo_html/，不建 memo 库目录');
  assert.equal(existsSync(join(dir, 'memo')), false, '不建 memo 库目录');
});

test('#230 ⑤ 退出码矩阵：0 ／ 2 参数错 ／ 3 未知 key ／ 5 落盘失败', () => {
  const dir = mkDir('codes');
  const ok = run(dir, [KEY]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(ok.env, 'exit 0 时 stdout 一行 JSON');
  assert.equal(ok.stderr, '');

  // 2 ＝ 用法／参数
  const bad2 = [
    { args: [KEY, '--params', JSON.stringify({ q: '查提醒', mode: 'lookup' })], why: 'q 与 mode 互斥' },
    { args: [KEY, '--params', JSON.stringify({ mode: 'nope' })], why: 'mode 非法（本键只认 lookup）' },
    { args: [KEY, '--params', '不是 JSON'], why: '--params 非 JSON' },
    { args: [KEY, '--params', '[]'], why: '--params 须为 JSON 对象' },
    { args: [KEY, '--bogus'], why: '未知参数' },
    { args: [KEY, '--timeout', '0'], why: '--timeout 须为正数毫秒' },
    { args: [], why: '缺 key（用法）' },
  ];
  for (const c of bad2) {
    const r = run(dir, c.args);
    assert.equal(r.status, 2, c.why + ' ⇒ exit 2（stderr：' + r.stderr + '）');
    assert.equal(r.stdout, '', c.why + '：失败时 stdout 必须空');
    assert.match(r.stderr, /ERR 2/);
  }

  // 3 ＝ 未知 key（上游命名空间拦下，走 stderr，stdout 保持空）
  const bad3 = run(dir, ['memo.nope']);
  assert.equal(bad3.status, 3, '未知 key ⇒ exit 3（stderr：' + bad3.stderr + '）');
  assert.equal(bad3.stdout, '');
  assert.match(bad3.stderr, /ERR 3/);

  // 5 ＝ 落盘失败：默认支（SKILLS_DB_PATH 落在「文件」之下）＋ 显式支（`--html` 父级是文件）
  const filler = join(dir, 'filler');
  writeFileSync(filler, 'x');
  const w1 = run(join(filler, 'sub'), [KEY]);
  assert.equal(w1.status, 5, '默认支落盘失败 ⇒ exit 5（stderr：' + w1.stderr + '）');
  assert.equal(w1.stdout, '');
  assert.match(w1.stderr, /ERR 5/);
  const w2dir = join(dir, 'd2');
  mkdirSync(w2dir, { recursive: true });
  const w2 = run(w2dir, [KEY, '--html', join(filler, 'a.html')]);
  assert.equal(w2.status, 5, '显式落点落盘失败 ⇒ exit 5（stderr：' + w2.stderr + '）');
  assert.equal(w2.stdout, '');
  assert.match(w2.stderr, /ERR 5/);

  // 1 ＝ 预检（本图口径之外的补充锁：缺 SKILLS_DB_PATH 时既不开库也不落盘）
  const noEnv = spawnSync(process.execPath, [BIN, KEY], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: '' } });
  assert.equal(noEnv.status, 1, '缺 SKILLS_DB_PATH ⇒ exit 1（stderr：' + String(noEnv.stderr) + '）');
  assert.equal(String(noEnv.stdout), '');
});
