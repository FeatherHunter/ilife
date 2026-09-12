/** #203 · 「作息管家help」**出口与命名落盘**锁（CLI 级，不是模块级；形状照
 *  `packages/skill-calorie/test/help-delivery-139.test.mjs` 与兄弟件 `skill-memo-ilife/test/cli-help-229.test.mjs`）。
 *
 * 病根（本票的起点，独立审查实测）：渲染件 `src/help/helpFile.ts` 的 `renderHelpFileHtml`／
 * `buildHelpFileData` **只有定义、没有调用方**——`schedule.help.lookup` 只回一张 JSON 速查表，
 * 用户说「作息管家help」拿不到任何文件。故本文件只跑**真出口**
 * （spawn `dist/cli/cmd_read.js`，argv＋JSON＋exit），锁四件事：
 *  ① 缺省（不给任何参数）＝「作息管家help」的交付物：名 `作息管家_HELP_<TS>[_N].html`、
 *     落 `<SKILLS_DB_PATH>/schedule_html/help/`、顶层 `delivery{mode,path,bytes}` 的 `path` 为**绝对路径**
 *     且字节＝落盘大小、stdout 恒一行 JSON（P9）；产物是完整 HTML（`<!DOCTYPE html>` 起、带 charset）；
 *  ② 同名递补：连跑两次落点**各自独立**、两份文件都在；同秒时后到者 `_2`（`wx` 独占，#128 语义）；
 *  ③ 反向锁（防串产物）：缺省产物**不是** envelope 分节页（无 `<section data-skill="schedule"`），
 *     文件名**不得**出现 `help_center`（老技能那份独立页面不是本件）；
 *  ④ 显式 `--html <路径>`：逐字写该路径（覆盖、不带时间戳、不递补），与缺省支互不串；
 *     非 help 键的 `--html` 仍写既有分节页（本票不破它）。
 *
 * 另有一条**不开库**锁：缺省支在开库之前分派，跑完不该建 `schedule_data.db`
 * （否则「看帮助」会 `new DatabaseSync` 并跑 DDL 自愈，把库建在用户还没开始用的目录里）。
 *
 * 运行：先 `pnpm -C packages/skill-schedule exec tsc -b`（用例读 `dist/**`，dist 陈旧＝测的是旧出口），
 * 再 `node --test packages/skill-schedule/test/help-delivery-203.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
/** 老通式（`t198-old-help-truth.md` 第四节）：`作息管家_HELP_<YYYYMMDD>_<HHMMSS>[_N].html`。 */
const NAME_RE = /^作息管家_HELP_\d{8}_\d{6}(_\d+)?\.html$/;
/** HELP 全壳页的载荷容器（共享 help 模板；分节页没有它）。 */
const DATA_OPEN = '<script id="help-data" type="application/json">';

function mkDir(tag) {
  return mkdtempSync(join(tmpdir(), 't203-' + tag + '-'));
}

function run(dir, args) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

/** 异步版（并发两次用；`spawnSync` 会把并发串成串行，测不出独占）。 */
function runAsync(dir) {
  return new Promise((resolve) => {
    const child = spawn(NODE_BIN, [BIN, 'schedule.help.lookup'], {
      env: { ...process.env, SKILLS_DB_PATH: dir },
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      let env = null;
      try { env = JSON.parse(out); } catch { env = null; }
      resolve({ status: code, stdout: out, env });
    });
  });
}

/** 缺省支的 stdin/exit 断言（exit 0 ＋ stdout 恰一行可解析 JSON）。 */
function runOk(dir, args = ['schedule.help.lookup']) {
  const r = run(dir, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  assert.equal(r.stdout.trim().split('\n').length, 1, 'P9：stdout 恒一行 JSON');
  return r;
}

/** 取 `<script id="help-data">` 载荷（共享 help 模板的运行时段输入）。 */
function payloadOf(html) {
  const at = html.indexOf(DATA_OPEN);
  assert.ok(at > 0, '产物缺 help-data 载荷容器（' + DATA_OPEN + '）');
  const end = html.indexOf('</script>', at);
  assert.ok(end > at, 'help-data 容器未闭合');
  return JSON.parse(html.slice(at + DATA_OPEN.length, end));
}

/** 文件名里的秒级时间戳与 `_N` 递补段（无 `_N` 时第 2 组为 undefined）。 */
function stampOf(p) {
  return basename(p).match(/_(\d{8}_\d{6})(?:_(\d+))?\.html$/);
}

test('#203 ① 缺省＝HELP 文件：作息管家_HELP_<TS>.html 落 schedule_html/help／顶层 delivery 给绝对路径', () => {
  const dir = mkDir('default');
  const r = runOk(dir);
  const d = r.env.data;
  const dl = r.env.delivery;

  assert.equal(r.env.key, 'schedule.help.lookup');
  assert.equal(r.env.shape, 'list');
  assert.equal(d.mode, 'file', '缺省支＝文件交付（不是速查表那支）');
  assert.ok(dl, '缺省支必须给顶层 delivery');
  assert.equal(dl.mode, 'file');

  const out = dl.path;
  assert.ok(isAbsolute(out), 'delivery.path 须绝对路径：' + out);
  assert.equal(basename(dirname(out)), 'help', '落 <SKILLS_DB_PATH>/schedule_html/help/');
  assert.equal(basename(dirname(dirname(out))), 'schedule_html');
  assert.match(basename(out), NAME_RE, '老通式命名（t198 第四节）：' + basename(out));
  assert.equal(basename(out).includes('help_center'), false, '不得混进老技能那份独立页面');
  assert.ok(existsSync(out), '产物须真实落盘');

  const html = readFileSync(out, 'utf8');
  assert.equal(statSync(out).size, dl.bytes, 'delivery.bytes ＝ 落盘字节数');
  assert.equal(d.bytes, dl.bytes, 'data.bytes 与 delivery.bytes 同值');
  assert.equal(d.bytes, Buffer.byteLength(html, 'utf8'));

  // 计数一律派生：载荷的汇总数应等于内容资产数出来的三层条数。
  const payload = payloadOf(html);
  assert.equal(d.total, payload.groups.length, '索引行数＝一级分组数（派生）');
  assert.equal(d.sceneTotal, payload.groups.reduce(
    (n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0), '场景数派生');
  assert.equal(d.subgroupTotal, payload.groups.reduce((n, g) => n + g.subgroups.length, 0), '唤醒词条数派生');
});

test('#203 ② 产物是完整 HELP 页（doctype／charset／5 个一级分组名）', () => {
  const dir = mkDir('shell');
  const r = runOk(dir);
  const html = readFileSync(r.env.delivery.path, 'utf8');

  assert.ok(html.startsWith('<!DOCTYPE html>'), 'file 态＝完整文档（doctype 起）');
  assert.ok(/<meta charset="UTF-8">/i.test(html), '须带 charset（含中文的 UTF-8 文件经 file:// 打开不乱码的前提）');

  const payload = payloadOf(html);
  assert.equal(payload.skill_name, '作息管家');
  assert.equal(payload.groups.length, 5, '5 个一级分组');
  for (const label of ['写入与同步', '查询与浏览', '日程与计划', '分析与洞察', '辅助与管理']) {
    assert.ok(payload.groups.some((g) => g.label === label), '缺一级分组名：' + label);
  }
  const scenes = payload.groups.reduce((n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0);
  assert.equal(scenes, 85, '85 条场景（内容资产全表）');
});

test('#203 ③ 反向锁：缺省产物是 HELP 全壳页，不是 envelope 分节页', () => {
  const dir = mkDir('negative');
  const html = readFileSync(runOk(dir).env.delivery.path, 'utf8');
  assert.equal(html.includes('<section data-skill="schedule"'), false,
    '缺省产物不得是 `--html` 那支的 envelope 分节页（那是另一个东西）');
  assert.ok(html.includes(DATA_OPEN), '缺省产物须是共享 help 模板的全壳页');
});

test('#203 ④ 同名递补：并发两次落点各自独立；同秒后到者 _2', async () => {
  const dir = mkDir('collide');
  const [a, b] = await Promise.all([runAsync(dir), runAsync(dir)]);
  assert.equal(a.status, 0, 'A exit ' + a.status);
  assert.equal(b.status, 0, 'B exit ' + b.status);
  assert.ok(a.env && b.env, '两个 stdout 都须可解析');
  assert.match(basename(a.env.delivery.path), NAME_RE);
  assert.match(basename(b.env.delivery.path), NAME_RE);
  assert.notEqual(b.env.delivery.path, a.env.delivery.path, '两次调用落点各自独立');
  assert.ok(existsSync(a.env.delivery.path) && existsSync(b.env.delivery.path), '两份产物都在');

  const A = stampOf(a.env.delivery.path);
  const B = stampOf(b.env.delivery.path);
  if (A[1] === B[1]) {
    // 同一秒：首候选被 `wx` 占住 → 后到者必须走 `EEXIST` 递补 _2（#128 语义）。
    assert.ok(A[2] === '2' || B[2] === '2',
      '同秒必有一方 _2：' + basename(a.env.delivery.path) + ' / ' + basename(b.env.delivery.path));
  } else {
    // 跨秒（并发两进程恰被秒边界切开）：各自名下独立落点，同样不覆盖。
    assert.equal(A[2], undefined);
    assert.equal(B[2], undefined);
  }
  assert.equal(readdirSync(join(dir, 'schedule_html', 'help')).length, 2, '快照目录里恰两份产物（无覆盖）');
});

test('#203 ⑤ 串行两次同名也不覆盖（后到者递补 _2，前份字节不变）', () => {
  const dir = mkDir('serial');
  const a = runOk(dir);
  const first = a.env.delivery.path;
  const bytesOfFirst = statSync(first).size;
  const b = runOk(dir);
  const second = b.env.delivery.path;

  assert.notEqual(second, first, '第二次不得覆盖第一次的产物');
  assert.ok(existsSync(first) && existsSync(second), '两份产物都在');
  assert.equal(statSync(first).size, bytesOfFirst, '第一份字节未被第二次改写');
  const A = stampOf(first);
  const B = stampOf(second);
  if (A[1] === B[1]) assert.equal(B[2], '2', '同秒第二次＝_2 递补');
  else assert.equal(B[2], undefined, '跨秒第二次＝自己的时间戳名下');
});

test('#203 ⑥ 显式 `--html <路径>`：逐字写该路径（覆盖、不带时间戳、不递补），与缺省支不串', () => {
  const dir = mkDir('explicit');
  const mine = join(dir, 'mine', 'named.html');
  const r = runOk(dir, ['schedule.help.lookup', '--html', mine]);

  assert.equal(r.env.delivery.path, mine, '`--html` 路径逐字回执（`resolve()` 归一后）');
  assert.ok(existsSync(mine), '须写到用户给的那条路径（父目录递归创建）');
  assert.equal(readdirSync(join(dir, 'mine')).length, 1, '只写这一个文件（不带时间戳、不递补）');
  assert.ok(readFileSync(mine, 'utf8').startsWith('<!DOCTYPE html>'), '`--html` 拿到的也是完整 HELP 页');

  // 再写一次同一路径＝覆盖（`w`），不是 `_2`。
  const r2 = runOk(dir, ['schedule.help.lookup', '--html', mine]);
  assert.equal(r2.env.delivery.path, mine);
  assert.deepEqual(readdirSync(join(dir, 'mine')), ['named.html'], '重复写同一路径＝覆盖，不产生 _2');
  assert.equal(existsSync(join(dir, 'schedule_html')), false, '给了 `--html` 就不落缺省目录（两支不串）');
});

test('#203 ⑦ 不破既有：非 help 键的 `--html` 仍写 envelope 分节页', () => {
  const dir = mkDir('legacy');
  const p = join(dir, 'out.html');
  const r = runOk(dir, ['schedule.record.today', '--params', JSON.stringify({ date: '2026-09-06' }), '--html', p]);
  const html = readFileSync(p, 'utf8');
  assert.ok(html.includes('<section'), '既有口径：分节页仍带 <section');
  assert.equal(html.includes(DATA_OPEN), false, '分节页不是 help 全壳页');
  assert.equal(r.env.delivery.path, p, '非 help 键的 `--html` 也回执绝对路径');
});

test('#203 ⑧ 缺省支在开库之前分派：跑完不建库', () => {
  const dir = mkDir('nodb');
  runOk(dir);
  assert.equal(existsSync(join(dir, 'schedule_data.db')), false, '看帮助不该把 DB 建出来');
  assert.deepEqual(readdirSync(dir), ['schedule_html'], '只落下产物目录');
});

test('#203 ⑨ 写失败不静默降级：exit 5 ＋ stderr 结构化错误、stdout 空', () => {
  const dir = mkDir('fail');
  // 真造一个写不进去的条件：把已存在的**目录**当文件写（`wx`／`w` 都拒，`EISDIR`）。
  const asDir = join(dir, 'notafile.html');
  mkdirSync(asDir, { recursive: true });
  const r = run(dir, ['schedule.help.lookup', '--html', asDir]);
  assert.equal(r.status, 5, '落盘失败＝exit 5（stderr：' + r.stderr + '）');
  assert.equal(r.stdout, '', '失败时 stdout 不吐任何 JSON（不假装成功）');
  assert.match(r.stderr, /HELP 落盘失败/, 'stderr 须是结构化失败回执');
  assert.match(r.stderr, /EISDIR|EPERM|EACCES/, 'stderr 须保留系统错误码（不吞原始成因）');
  assert.equal(existsSync(join(dir, 'schedule_html')), false, '失败时不得另找落点、不得静默换形态');
});
