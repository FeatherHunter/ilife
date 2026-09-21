// #695 居家管家的配置面真出口锁（只经真 spawn，不看内部函数）。
//
// 覆盖（票 #695 逐条）：
//   ① 默认值表逐项＝改造前的代码常量（`home.db`／`home_manager_html`／`居家管家_HELP`／`居家管家_速查表`／`backups`）；
//   ② 三个配置 key（`home.config.read/write/reset`）走 CLI 真出口，重置留 `.bak`；
//   ③ 配置**真的进执行路径**：`db.dir`／`html.dir` 指到临时目录下的别处，`home.help.lookup` 与
//      `home.item.add` 的产物落在新落点；
//   ④ 测试进程里家目录＝真实家目录 ⇒ 配置读取**响亮失败**（删掉写库开关之后的替代护栏）。
//
// 纪律：落点值／key 名在本文件里**写死逐字**（不从 `dist/config.js` 取），否则改实现点会同时改期望值，
// 锁就变成同义反复、变异自证也测不出来。
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import { realHomeDir } from '../../../test/helpers/real-home-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const P = JSON.stringify;

/**
 * #763 护栏探针：一个只调 `resolveConfigDir()` 的子进程（**不碰盘**——`mkdir` 在它之后），
 * 故护栏哪天 fail-open 也写不出真实数据。「忘了注入」这一档＝把家目录两格**显式设成账号那一份**
 * （`realHomeDir()`，与生产守卫同一条判据源）——**不是删格**：实测 win32 上 env 里删掉 `USERPROFILE`，
 * 子进程仍会拿到父进程当刻那一格（系统补回），测试进程自己注过家目录时删格到不了真实那一份。
 * 反向对照经 `extraEnv` 把两格指到临时目录。
 */
const DIRS_URL = pathToFileURL(join(HERE, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;
const REAL_HOME = realHomeDir().dir;
const HOME_ENV_CAPS = ['USERPROFILE', 'HOME'];
function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIRS_URL) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const env = { ...process.env };
  for (const cap of HOME_ENV_CAPS) env[cap] = REAL_HOME;
  env.NODE_TEST_CONTEXT = 'child-v8';
  Object.assign(env, extraEnv);
  return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

/** 配置件的默认值（＝改造前的代码常量，逐字写死；#794 起 files 两键出表，加 key.file）。 */
const DEFAULTS = {
  db: { dir: '', name: 'home.db' },
  html: { dir: 'home_manager_html' },
  key: { file: '.master.key' },
  backup: { dir: 'backups' },
};

let CFG = '';
const mkDir = (tag) => mkdtempSync(join(tmpdir(), 'home695-' + tag + '-'));

/** 隔离＝把**家目录**指到 `dir`（#763）：配置落 `<dir>/.ilife/home.yaml`、数据落 `<dir>/.ilife/data/`。 */
function run(dir, args, envExtra) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(dir), ...(envExtra ?? {}) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(dir, args, envExtra) {
  const r = run(dir, args, envExtra);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是可解析 JSON：' + r.stdout.slice(0, 200));
  return r;
}

before(() => { CFG = mkDir('base'); });

test('① 默认值逐项＝改造前的代码常量，且配置 key 在形状表之前拦下', () => {
  const dir = mkDir('defaults');
  const r = runOk(dir, ['home.config.read']);

  assert.equal(r.env.shape, 'detail');
  assert.equal(r.env.key, 'home.config.read');
  assert.equal(r.env.skill, 'home');
  // #794 起首次落盘把可改落点写成算出来的绝对路径（读仍认空串，见 t794 那条）——其余四项逐字等于常量。
  assert.equal(r.env.data.values.db.dir, join(configDirOf(dir), 'data'), '首次落盘：db.dir＝算出来的绝对路径');
  assert.deepEqual({ ...r.env.data.values, db: { ...r.env.data.values.db, dir: '' } }, DEFAULTS,
    '其余默认值逐项逐字（home.db／home_manager_html／.master.key／backups）');
  assert.equal(r.env.data.path, join(configDirOf(dir), 'home.yaml'), '配置文件＝<家目录>/.ilife/home.yaml');
  assert.equal(r.env.data.dataDir, join(configDirOf(dir), 'data'), '数据目录＝<家目录>/.ilife/data');
  assert.equal(r.env.data.created, true, '首次读按默认值落一份');
  assert.ok(existsSync(join(configDirOf(dir), 'home.yaml')), '配置文件真落盘');
  assert.equal(existsSync(join(configDirOf(dir), 'data', '.master.key')), false, '密钥文件不自动生成（#793）');
  assert.deepEqual(readdirSync(configDirOf(dir)).sort(), ['data', 'home.yaml'], '配置目录里只有配置件与数据目录');

  // 这三个 key 不是唤醒词命令：既不在形状表里（不在的话本键根本走不到这里，会 exit 3），
  // 也不该出现在 HELP 面上（唤醒词表是 HELP 的唯一输入源）。
  const help = runOk(dir, ['home.help.lookup', '--params', P({ q: '配置' })]);
  assert.equal(
    help.env.data.items.some((x) => String(x.key).startsWith('home.config.')), false,
    '配置 key 不得进 HELP：' + JSON.stringify(help.env.data.items.map((x) => x.key)),
  );
  assert.equal(run(dir, ['home.config.nope']).status, 3, '配置 key 之外的同前缀 key 照旧走形状表（exit 3）');
});

test('② 三个配置 key 走 CLI 真出口：读／写／重置（重置留 `.bak`，写是局部合并）', () => {
  const dir = mkDir('keys');
  const cfgFile = join(configDirOf(dir), 'home.yaml');
  const bakFile = join(configDirOf(dir), 'home.yaml.bak');

  // 写：只提交改动过的项 —— `db.name` 换名、`key.file` 换落点；组里没给的子项、没给的组保留现值。
  const w = runOk(dir, ['home.config.write', '--params', P({ values: { db: { name: 'home_test.db' }, key: { file: 'custom.key' } } })]);
  assert.equal(w.env.shape, 'receipt');
  assert.equal(w.env.key, 'home.config.write');
  assert.equal(w.env.data.path, cfgFile);
  assert.deepEqual(w.env.data.values, {
    db: { dir: join(configDirOf(dir), 'data'), name: 'home_test.db' },
    html: { dir: 'home_manager_html' },
    key: { file: 'custom.key' },
    backup: { dir: 'backups' },
  }, '局部合并：改动项落进组里，其余原样（db.dir 按写盘口径是绝对路径）');
  const disk = readFileSync(cfgFile, 'utf8');
  assert.match(disk, /home_test\.db/, '写出去的是盘上这份：' + disk);
  assert.match(disk, /custom\.key/);

  // 坏值不落盘：类型不符（给字符串项一个数）即响亮失败（exit 1）。
  const bad = run(dir, ['home.config.write', '--params', P({ values: { db: { name: 7 } } })]);
  assert.equal(bad.status, 1, '类型不符 ⇒ exit 1（stderr：' + bad.stderr + '）');
  assert.match(bad.stderr, /配置项/);
  assert.match(readFileSync(cfgFile, 'utf8'), /home_test\.db/, '被拒的写不得改盘上那份');

  // 重置：先另存 `.bak`（保留重置前那份），再按默认值重写。
  const rs = runOk(dir, ['home.config.reset']);
  assert.equal(rs.env.shape, 'receipt');
  assert.equal(rs.env.key, 'home.config.reset');
  assert.equal(rs.env.data.path, cfgFile);
  assert.equal(rs.env.data.backupPath, bakFile, '重置先另存 <家目录>/.ilife/home.yaml.bak');
  assert.ok(existsSync(bakFile), '`.bak` 真落盘');
  assert.match(readFileSync(bakFile, 'utf8'), /home_test\.db/, '`.bak` 里是重置前那一份');

  const after = runOk(dir, ['home.config.read']);
  assert.equal(after.env.data.values.db.dir, join(configDirOf(dir), 'data'), '重置落的也是绝对路径（#794）');
  assert.deepEqual({ ...after.env.data.values, db: { ...after.env.data.values.db, dir: '' } }, DEFAULTS,
    '重置后其余项回到默认值');
  assert.equal(after.env.data.created, false, '重置是重写，不是删了重建');
});

test('③ 配置真的进执行路径：db.dir／html.dir 指到别处，写命令与 HELP 产物都落新落点', () => {
  const dir = mkDir('effect');
  const altDb = join(dir, 'alt-data');

  assert.equal(runOk(dir, ['home.config.write', '--params', P({ values: { db: { dir: altDb }, html: { dir: 'alt-html' } } })]).env.data.values.db.dir, altDb);

  // 写命令：库落配置给的 `db.dir`，默认数据目录那份不许出现。
  const cats = runOk(dir, ['home.tag.query', '--params', P({ kind: 'categories' })]).env.data.items;
  const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
  const add = runOk(dir, ['home.item.add', '--params', P({ name: '牛奶', category_id: cid, location: '客厅/冰箱' })]);
  assert.match(add.env.data.message, /已录物品/);
  assert.ok(existsSync(join(altDb, 'home.db')), '库真落配置给的 db.dir：' + join(altDb, 'home.db'));
  assert.equal(existsSync(join(configDirOf(dir), 'data', 'home.db')), false, '默认数据目录不得有库');

  // 读命令：HELP 产物落配置给的 `html.dir`（相对 db.dir 的一段）。
  const h = runOk(dir, ['home.help.lookup']);
  const out = h.env.delivery.path;
  assert.equal(dirname(out), join(altDb, 'alt-html'), 'HELP 落 <db.dir>/<html.dir>：' + out);
  assert.ok(/^居家管家_HELP_\d{8}_\d{6}\.html$/.test(basename(out)), '名字通式不变：' + basename(out));
  assert.ok(existsSync(out), '回执路径真存在');
  assert.equal(existsSync(join(configDirOf(dir), 'data', 'home_manager_html')), false, '默认落点不得再有产物');

  // 读命令（库那侧）：同一个新落点的库能被读回来。
  const search = runOk(dir, ['home.item.search', '--params', P({ name: '牛奶' })]);
  assert.ok(search.env.data.total >= 1, '新落点的库读得回来');
});

test('④ 测试进程家目录＝真实家目录 ⇒ 配置读取响亮失败（替代护栏），绝不落到真实家目录', () => {
  // 探针：子进程只调 `resolveConfigDir()`（不碰盘）。家目录两格设成账号那一份 ⇒ 护栏必须拦下。
  // 不拿技能命令做「缺隔离」实验：那条路一旦护栏失效就会真写（这里连 mkdir 都到不了）。
  assert.equal(probeGuard(), 'THREW:CONFIG_TEST_ISOLATION_MISSING');
  // 反向对照：同一支探针，家目录指到临时目录就照常算得出来（证明这道门只关「没注入家目录」这件事）。
  const fakeHome = mkDir('probe');
  assert.equal(probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome }), 'OK:' + configDirOf(fakeHome));
  // 真出口那一侧只留正向读数：给了临时家目录，入口照常跑通（那道门的「失败档」由上面的探针覆盖）。
  assert.equal(runOk(CFG, ['home.config.read']).status, 0);
});
