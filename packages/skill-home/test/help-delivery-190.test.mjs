// #191 · 交付面真出口锁（CLI 级、**只经真 spawn**）：居家管家 `home.help.lookup` 的产物。
//
// 为什么有这件：本图此前 `packages/skill-home/test/**` **零处**引用 `delivery`／`居家管家_HELP`／`.db`
// ⇒ 删掉 `src/cli/cmd_read.ts` 的交付段、或改掉 `src/help/manifest.ts` 的落点值，既有用例照样全绿
// （兄弟三家账单／卡路里／大厨都各有专件锁交付，居家缺这一件）。
//
// 覆盖（票 #191 逐条）：① 文件名通式逐字 ＋ 同秒 `_2` 递补；② 产物＝共享模板前后缀逐字 ＋ `help-data`；
// ③ 同秒并发 6 次独占递补（名字互不覆盖）；④ 两支互不串；⑤ 退出码矩阵（正例 0／参数 2／落盘 5）；
// ⑥ 产物目录 `.db` 数＝0（看帮助不建库）；⑦ `delivery` 只追加、`q` 支无 `delivery`、复用窗口回同一路径；
// ⑧ `--html <路径>` 仍出分节页。
//
// 纪律：**只经真 spawn**（`dist/cli/cmd_read.js` ＋ 临时 `SKILLS_DB_PATH`），不直接调模块——
// 课（#139）：模块级测试全绿 ≠ 用户拿到东西。落点值／名字通式在本文件里**写死逐字**（不从
// `dist/help/manifest.js` 取），否则改实现点会同时改期望值，锁就变成同义反复、变异自证也测不出来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_SHELL_DATA_OPEN, HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX, HELP_SHELL_TITLE_SLOT } from 'base-paint/help-shell';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'home.help.lookup';

/** 落点值逐字（票 #190 `src/help/manifest.ts` 的三个值；这里写死，不做同义反复）。 */
const HELP_HTML_DIR = 'home_manager_html';
const HELP_STEM = '居家管家_HELP';
const LOOKUP_STEM = '居家管家_速查表';
const HELP_NAME_RE = new RegExp('^' + HELP_STEM + '_\\d{8}_\\d{6}(_\\d+)?\\.html$');
const LOOKUP_NAME_RE = new RegExp('^' + LOOKUP_STEM + '_\\d{8}_\\d{6}(_\\d+)?\\.html$');
const NAME_RE = /^(.+)_(\d{8}_\d{6})(?:_(\d+))?\.html$/;
const TITLE = '居家管家 · 使用手册(HELP)';

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 'home191-' + tag + '-'));
const htmlDirOf = (dir) => join(dir, HELP_HTML_DIR);
const envOf = (dir) => ({ ...process.env, SKILLS_DB_PATH: dir });

function run(dir, args = [KEY], envExtra) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...envOf(dir), ...(envExtra ?? {}) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

/** 异步版（并发用；`spawnSync` 会把并发串成串行，测不出独占递补）。 */
function runAsync(dir, args = [KEY]) {
  return new Promise((resolve) => {
    const child = spawn(NODE_BIN, [BIN, ...args], { env: envOf(dir) });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      let env = null;
      try { env = JSON.parse(out); } catch { /* 失败时留 null */ }
      resolve({ status: code, stdout: out, env });
    });
  });
}

function runOk(dir, args) {
  const r = run(dir, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是可解析 JSON：' + r.stdout.slice(0, 200));
  assert.equal(r.stdout.trim().split('\n').length, 1, 'stdout 恒一行 JSON');
  return r;
}

/** 产物列表按名排序（目录不存在时给空表，让断言自己报错，不抛 ENOENT 把红点说成别的）。 */
const listOf = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);
const dbCountOf = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.db')).length : 0);

/** 取 `<script id="help-data">` 载荷。 */
function helpData(html) {
  assert.ok(html.includes(HELP_SHELL_DATA_OPEN), '缺 help-data 锚点');
  const at = html.indexOf(HELP_SHELL_DATA_OPEN);
  return JSON.parse(html.slice(at + HELP_SHELL_DATA_OPEN.length, html.indexOf('</script>', at)));
}

/** 本地时区零填充时间戳（与共用件同口径；测试侧独立算一份，不做同义反复）。 */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate())
    + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
/** 允许 ±2 秒：断言「时间戳＝本地时区、形如 YYYYMMDD_HHMMSS」，不把跨秒竞态当契约。 */
const stampWindow = () => {
  const t = Date.now();
  return [-2, -1, 0, 1, 2].map((d) => localStamp(new Date(t + d * 1000)));
};
const stampOf = (p) => (basename(p).match(NAME_RE) || []).slice(1);

test('① 缺省＝HELP 文件：名字通式逐字（主体／时间戳／父目录），回执绝对路径且真落盘', () => {
  const dir = mkDir('default');
  const r = runOk(dir, undefined);
  const out = r.env.delivery.path;

  assert.equal(r.env.key, KEY);
  assert.ok(HELP_NAME_RE.test(basename(out)), '文件名通式逐字：' + basename(out));
  assert.equal(basename(dirname(out)), HELP_HTML_DIR, '落 <SKILLS_DB_PATH>/' + HELP_HTML_DIR + '/');
  assert.equal(dirname(out), htmlDirOf(dir), '父目录＝SKILLS_DB_PATH 下那一层（不多不少）');
  assert.ok(out.startsWith(dir), 'delivery.path 为绝对路径：' + out);
  assert.ok(existsSync(out), '回执路径真的存在');
  assert.equal(r.env.delivery.mode, 'file');
  assert.equal(r.env.delivery.bytes, statSync(out).size, 'delivery.bytes ＝实际 statSync().size');
  assert.equal(r.env.delivery.bytes, Buffer.byteLength(readFileSync(out, 'utf8'), 'utf8'));

  const [, stamp, slot] = stampOf(out);
  assert.ok(stampWindow().includes(stamp), '时间戳＝本地时区零填充 YYYYMMDD_HHMMSS：' + stamp);
  assert.equal(slot, undefined, '首个落点用本体名（无 _N 递补）：' + basename(out));
  assert.deepEqual(listOf(htmlDirOf(dir)), [basename(out)], '该目录里只有这一份产物');
  assert.ok(r.env.data.total >= 88, '缺省回全量短语表：' + r.env.data.total);
});

test('①b 顶层 `delivery` 只追加（既有五键序不变）；`q` 支无 `delivery`', () => {
  const dir = mkDir('append');
  const r = runOk(dir, undefined);
  assert.deepEqual(Object.keys(r.env), ['version', 'skill', 'shape', 'key', 'data', 'delivery'],
    'delivery 顶层追加、既有五键一字不改、序不变');
  assert.deepEqual(Object.keys(r.env.delivery), ['mode', 'path', 'bytes']);

  const q = runOk(dir, [KEY, '--params', '{"q":"查物品"}']);
  assert.equal(q.env.delivery, undefined, 'q 支＝现找，不落盘');
  assert.ok(q.env.data.items.length >= 1, 'q 支回命中');
  assert.ok(q.env.data.items.some((x) => x.key === 'home.item.search'), 'q 支载荷命中对应命令');
  assert.equal(listOf(htmlDirOf(dir)).length, 1, 'q 支不往目录里加新产物');
});

test('② 壳层锁：产物＝共享 help 模板前后缀逐字 ＋ `<title>` ＋ `help-data` 载荷', () => {
  const dir = mkDir('shell');
  const out = runOk(dir, undefined).env.delivery.path;
  const html = readFileSync(out, 'utf8');

  const title = html.slice(html.indexOf('<title>') + 7, html.indexOf('</title>'));
  assert.equal(title, TITLE, '标题逐字（页面出自 base-paint/help-shell，不是本包自画的页）');
  assert.ok(html.startsWith(HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title)), '前缀逐字（仅填标题槽）');
  assert.ok(html.endsWith(HELP_SHELL_SUFFIX), '后缀逐字');
  assert.equal(html.includes(HELP_SHELL_TITLE_SLOT), false, '标题槽不得留占位');

  const data = helpData(html);
  assert.equal(data.skill_name, '居家管家');
  assert.equal(data.title, TITLE, 'help-data 里的 title 与 <title> 同源');
  assert.ok(Array.isArray(data.groups) && data.groups.length > 0, 'help-data 有分组');
  const scenes = data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  assert.ok(scenes.length > 0 && scenes.every((s) => typeof s.id === 'string' && s.id.length > 0),
    '每个场景都有 id（载荷不是空壳）');
  assert.deepEqual(data.meta_blocks.map((m) => m.id), ['help_summary', 'help_wake_words'], '两块 meta 在');
});

test('③ 同秒并发 6 次（`reuseHours:0`）独占递补：六个互异落点、互不覆盖', async () => {
  const dir = mkDir('race');
  // 缺省带「一天内复用」窗口，故「独占递补」这条语义要用 `reuseHours:0`（每次都落新的）来验；
  // 缺省那条另有 ③b 的复用用例。
  const rs = await Promise.all(Array.from({ length: 6 }, () => runAsync(dir, [KEY, '--params', '{"reuseHours":0}'])));
  for (const r of rs) {
    assert.equal(r.status, 0, '并发调用须都 exit 0');
    assert.ok(r.env, 'stdout 可解析');
  }
  const paths = rs.map((r) => r.env.delivery.path);
  assert.equal(new Set(paths).size, 6, '六次调用六个不同落点：' + JSON.stringify(paths.map((p) => basename(p))));
  assert.equal(listOf(htmlDirOf(dir)).length, 6, '目录里恰好 6 份产物（无互相覆盖）');
  for (const r of rs) {
    const html = readFileSync(r.env.delivery.path, 'utf8');
    assert.equal(Buffer.byteLength(html, 'utf8'), r.env.delivery.bytes, '每份内容与自己的回执字节数一致');
    assert.equal(helpData(html).groups.length > 0, true, '每份都是完整壳（未被截断）');
  }
  // 同秒情形：各次须占**不同槽位**、槽位从本体起连续；谁先到是任意的，故不断言「首个不带 _N」。
  // 跨秒则各自独立（两种都合法，#139 去时间竞态口径）——但 6 个同时起的进程至少会有同秒对，
  // 否则「同秒独占」这条根本没被验到，故要求同秒组至少存在一个。
  const byStamp = new Map();
  for (const p of paths) {
    const [, stamp, slot] = stampOf(p);
    byStamp.set(stamp, [...(byStamp.get(stamp) ?? []), slot ?? '1']);
  }
  const sameSecond = [...byStamp.values()].filter((s) => s.length > 1);
  assert.ok(sameSecond.length >= 1, '6 次并发须至少出现一个同秒组（否则这条锁形同虚设）：' + JSON.stringify([...byStamp.keys()]));
  for (const slots of sameSecond) {
    assert.deepEqual([...slots].sort(), ['1', '2', '3', '4', '5', '6'].slice(0, slots.length),
      '同秒槽位须从本体起连续：' + JSON.stringify(slots));
  }
});

test('③b 同秒递补 `_2` 逐字：本体名已被同秒占用 ⇒ 第二份落 `_2` 且不覆盖本体', () => {
  const dir = mkDir('slot2');
  const target = htmlDirOf(dir);
  // 递补起点＝本体名（无 _N），故把「这一秒的本体名」先按同名占位，逼出 _2；
  // 跨秒边界会改判（秒变了本就不该递补），故重试到同秒命中为止——最多 8 次。
  for (let i = 0; i < 8; i++) {
    const stamp = localStamp(new Date());
    const sentinel = join(target, HELP_STEM + '_' + stamp + '.html');
    const mark = 'SENTINEL-' + stamp;
    mkdirSync(target, { recursive: true });
    writeFileSync(sentinel, mark);
    const r = runOk(dir, [KEY, '--params', '{"reuseHours":0}']);
    const name = basename(r.env.delivery.path);
    if (stampOf(r.env.delivery.path)[1] !== stamp) continue; // 跨秒：换一秒重来
    assert.equal(name, HELP_STEM + '_' + stamp + '_2.html', '同秒第二份须递补 _2：' + name);
    assert.equal(readFileSync(sentinel, 'utf8'), mark, '被占位的那份未被覆盖（独占写）');
    return;
  }
  assert.fail('8 次都没能落在同一秒里（机器时钟异常）');
});

test('③c 复用窗口：窗口内再跑回同一路径、目录不涨；`reuseHours:0` 落新件', () => {
  const dir = mkDir('reuse');
  const first = runOk(dir, undefined).env.delivery.path;
  const again = runOk(dir, undefined).env.delivery.path;
  assert.equal(again, first, '缺省＝一天窗口：窗口内再跑回同一路径（不新建不改写）');
  assert.equal(listOf(htmlDirOf(dir)).length, 1, '复用不新建，目录不涨');

  const fresh = runOk(dir, [KEY, '--params', '{"reuseHours":0}']).env.delivery.path;
  assert.notEqual(fresh, first, '`reuseHours:0`＝每次都落新件');
  assert.equal(listOf(htmlDirOf(dir)).length, 2, '新件落下后目录两份');
  for (const p of [first, fresh]) {
    assert.ok(HELP_NAME_RE.test(basename(p)), '两份都是 HELP 通式名：' + basename(p));
    assert.ok(existsSync(p));
  }
});

test('④ 两支互不串：跑缺省支时目录里不出现速查表件；跑 `mode:"lookup"` 时目录里不出现 HELP 件', () => {
  const helpDir = mkDir('branch-help');
  const help = runOk(helpDir, undefined);
  assert.ok(existsSync(htmlDirOf(helpDir)), '缺省支产物目录须存在（目录不在＝跑错了落点，不能按缺席放行）：' + htmlDirOf(helpDir));
  const helpFiles = listOf(htmlDirOf(helpDir));
  assert.ok(HELP_NAME_RE.test(basename(help.env.delivery.path)), '缺省落 HELP 名');
  assert.equal(helpFiles.some((f) => LOOKUP_NAME_RE.test(f)), false, '缺省支目录里不得出现速查表件：' + JSON.stringify(helpFiles));
  assert.ok(help.env.data.total >= 88, '缺省回全量短语表（不是域级索引）');

  const lookDir = mkDir('branch-lookup');
  const look = runOk(lookDir, [KEY, '--params', '{"mode":"lookup"}']);
  assert.ok(existsSync(htmlDirOf(lookDir)), 'lookup 支产物目录须存在（目录不在＝跑错了落点，不能按缺席放行）：' + htmlDirOf(lookDir));
  const lookFiles = listOf(htmlDirOf(lookDir));
  assert.ok(LOOKUP_NAME_RE.test(basename(look.env.delivery.path)), 'lookup 落速查表名：' + basename(look.env.delivery.path));
  assert.equal(lookFiles.some((f) => HELP_NAME_RE.test(f)), false, 'lookup 支目录里不得出现 HELP 件：' + JSON.stringify(lookFiles));
  assert.notEqual(basename(help.env.delivery.path), basename(look.env.delivery.path));

  const lookHtml = readFileSync(look.env.delivery.path, 'utf8');
  assert.match(lookHtml, /<section/, '速查表＝分节页');
  assert.equal(lookHtml.includes(HELP_SHELL_DATA_OPEN), false, '速查表不是 HELP 壳（两支产物实体不同）');
  assert.equal(readFileSync(help.env.delivery.path, 'utf8').includes(HELP_SHELL_DATA_OPEN), true, '缺省＝全壳页');
});

test('⑤ 退出码矩阵：正例 0；参数错 2；落盘失败 5——失败时 stdout 一律空', () => {
  const dir = mkDir('codes');
  assert.equal(runOk(dir, undefined).status, 0, '正例 exit 0');

  const cases = [
    { args: [KEY, '--params', '{"q":"查物品","mode":"lookup"}'], code: 2, why: 'q 与 mode 互斥' },
    { args: [KEY, '--params', '{"mode":"nope"}'], code: 2, why: 'mode 非法' },
    { args: [KEY, '--params', '{"reuseHours":"x"}'], code: 2, why: '坏 reuseHours（非数）' },
    { args: [KEY, '--params', '{"reuseHours":-1}'], code: 2, why: '坏 reuseHours（负数）' },
    { args: [KEY, '--params', '{"q":123}'], code: 2, why: '非字符串 q（数）' },
    { args: [KEY, '--params', '{"q":["查物品"]}'], code: 2, why: '非字符串 q（数组）' },
  ];
  for (const c of cases) {
    const r = run(dir, c.args);
    assert.equal(r.status, c.code, c.why + ' ⇒ exit ' + c.code + '（stderr：' + r.stderr + '）');
    assert.equal(r.stdout, '', c.why + '：失败时 stdout 必须空');
    assert.match(r.stderr, new RegExp('ERR ' + c.code), c.why + '：stderr 回执带 ERR ' + c.code);
  }
  // 三支一致（#190 D2）：坏 reuseHours 不许因「走哪支」而隐身或两副面孔。
  const qBranch = run(dir, [KEY, '--params', '{"q":"查物品","reuseHours":"x"}']);
  assert.equal(qBranch.status, 2, 'q 支同样吃坏 reuseHours ⇒ exit 2');
  assert.equal(qBranch.stdout, '');
});

test('⑤b 写失败（落点被同名**文件**占位）⇒ exit 5 且 stdout 空（不静默降级）', () => {
  const dir = mkDir('blocked');
  writeFileSync(join(dir, HELP_HTML_DIR), 'x'); // 落点子目录被同名文件占位
  const r = run(dir, undefined);
  assert.equal(r.status, 5, '落盘真失败 ⇒ exit 5（stderr：' + r.stderr + '）');
  assert.equal(r.stdout, '', '失败时 stdout 空：不把失败伪装成成功');
  assert.match(r.stderr, /ERR 5/);
  assert.equal(readFileSync(join(dir, HELP_HTML_DIR), 'utf8'), 'x', '占位文件原样未动');
});

test('⑥ 看帮助不建库：产物目录与 `SKILLS_DB_PATH` 下 `.db` 数＝0', () => {
  const dir = mkDir('nodb');
  const r = runOk(dir, undefined);
  assert.ok(existsSync(r.env.delivery.path));
  assert.equal(dbCountOf(dir), 0, '根目录不得出现 .db：' + JSON.stringify(listOf(dir)));
  assert.ok(existsSync(htmlDirOf(dir)), '产物目录须存在（目录不在＝「0 个 .db」是缺席式空绿）：' + htmlDirOf(dir));
  assert.equal(dbCountOf(htmlDirOf(dir)), 0, '产物目录不得出现 .db：' + JSON.stringify(listOf(htmlDirOf(dir))));
  assert.equal(existsSync(join(dir, 'home.db')), false, '看帮助不把居家库建出来');

  const lookDir = mkDir('nodb-lookup');
  runOk(lookDir, [KEY, '--params', '{"mode":"lookup"}']);
  assert.equal(dbCountOf(lookDir), 0, 'lookup 支同样不建库：' + JSON.stringify(listOf(lookDir)));

  const qDir = mkDir('nodb-q');
  runOk(qDir, [KEY, '--params', '{"q":"查物品"}']);
  assert.equal(dbCountOf(qDir), 0, 'q 支同样不建库：' + JSON.stringify(listOf(qDir)));
});

test('⑧ `--html <路径>` 支仍出分节页（所有 key 通用的出口，不许被顺手砍）', () => {
  const dir = mkDir('htmlflag');
  const out = join(dir, 'my-help.html');
  const r = runOk(dir, [KEY, '--html', out]);
  assert.equal(existsSync(out), true, '--html 给的路径真有文件');
  const written = readFileSync(out, 'utf8');
  assert.match(written, /<section/, '--html 产物＝分节页');
  assert.equal(written.includes(HELP_SHELL_DATA_OPEN), false, '--html 不是 HELP 壳（缺省交付才走壳）');
  assert.notEqual(basename(out), basename(r.env.delivery.path), '两条出口互不冒充');
  assert.ok(HELP_NAME_RE.test(basename(r.env.delivery.path)), '缺省交付照旧落 HELP 通式件');

  // 其它 key 也通用：非 help 键给 --html 同样出分节页（该支由 `main` 单点写，不因 help 分支失守）。
  const other = join(dir, 'other.html');
  const o = runOk(dir, ['home.stats.overview', '--html', other]);
  assert.equal(existsSync(other), true, '其它 key 的 --html 仍落盘');
  assert.match(readFileSync(other, 'utf8'), /<section/, '其它 key 的 --html 仍是分节页');
  assert.equal(o.env.delivery, undefined, '其它 key 不追 delivery（只追加在 help 交付支上）');
});
