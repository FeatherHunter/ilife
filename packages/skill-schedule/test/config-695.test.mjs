/** #695 · 作息管家「路径类取值改读配置文件、环境变量全删」的配置面锁（真出口；不调内部件写盘）。
 *
 * 票面口径（GitHub #695）与上游裁定（#675 的解决评论）：每个技能一份 `<配置目录>/schedule.yaml`，
 * **配置文件是唯一真相，环境变量不参与**；#763 起测试隔离＝把**家目录**指到临时目录
 * （Windows `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`），配置落 `<家>/.ilife/schedule.yaml`，
 * 数据目录默认 `<家>/.ilife/data/`。
 *
 * 四条读数（逐条点名，不合并成一句「通过了」）：
 *  ① 默认值表逐项等于**改造前的代码常量**（`schedule_data.db`／`schedule_html/help`），
 *     且落点常量与之一致；#764 起 `files.help`／`lark.cliPath` 出表（进退休清单）；
 *  ② 三个配置 key（`schedule.config.read/write/reset`）走**真出口**：读＝`detail`、写／重置＝`receipt`，
 *     重置要留 `.bak`，回来再读回默认；
 *  ③ 配置**真的进执行路径**：`db.dir`／`html.dir` 指到临时目录下的别处，`schedule.record.write` 与
 *     `schedule.help.lookup` 的产物落在新落点；
 *  ④ 跑在测试运行器里却要落到**真实**家目录的 `.ilife` 时**响亮失败**（`CONFIG_TEST_ISOLATION_MISSING`），
 *     反向对照：家目录指到临时目录就照常跑通。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule`（用例读 `dist/**`），再
 *   `node --test packages/skill-schedule/test/config-695.test.mjs`。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_RETIRED } from '../dist/config.js';
import { DEFAULT_DB_FILENAME } from '../dist/index.js';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY_RE = /^作息管家_HELP_\d{8}_\d{6}(_\d+)?\.html$/;

/** 数据目录：配置项 `db.dir` 空串 ⇒ 配置给出的 `<家目录>/.ilife/data`。 */
const dataDirOf = (dir) => join(configDirOf(dir), 'data');
const P = (o) => JSON.stringify(o);

function mkCfg(tag) {
  return mkdtempSync(join(tmpdir(), 't695-' + tag + '-'));
}

/** 跑真出口：默认把**家目录**指到 `cfg`（`envExtra` 可覆写，含把它清空）。 */
function run(cfg, args, envExtra) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(cfg), ...(envExtra || {}) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(cfg, args) {
  const r = run(cfg, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  return r;
}

/** 公共层算配置落点的那一件（探针只 import 它，不碰技能代码）。 */
const DIRS = pathToFileURL(join(HERE, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;

/**
 * 守卫探针：子进程**只调 `resolveConfigDir()`**——它不碰盘（建目录在它之后），故哪怕守卫哪天 fail-open，
 * 这条用例也写不出真实数据（拿真出口做「缺隔离」实验，守卫一失效就会真写真配置、真库，故不这么测）。
 * 先把家目录两格删掉（回落真实那份 ⇒ 守卫必须拦下），**再**叠调用方给的那两格（反向对照塞回临时家目录）。
 */
function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIRS) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); }'
    + ' catch (e) { console.log("THREW:" + e.code + ":HUMAN=" + (String(e.message).includes("测试缺隔离") ? "1" : "0")); }';
  const env = { ...process.env };
  delete env.USERPROFILE; delete env.HOME;   // 家目录回落真实那份
  Object.assign(env, extraEnv);
  env.NODE_TEST_CONTEXT = 'child-v8';       // 跑在测试运行器里
  return String(spawnSync(NODE_BIN, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

/* ─────────── ① 默认值＝改造前的代码常量 ─────────── */

test('#695 ① 默认值表逐项等于改造前的代码常量（#764 起 files.help／lark.cliPath 出表）', () => {
  const d = SCHEDULE_CONFIG_DEFAULTS;
  assert.equal(d.db.dir, '', 'db.dir 空串＝按默认落点（数据目录），不是「没配」');
  assert.equal(d.db.name, 'schedule_data.db', '原 src/fetch/paths.ts 的 DB_FILENAME');
  assert.equal(d.html.dir, 'schedule_html', '#843 起是产物**根**目录（页面落它下面）');
  assert.equal(d.html.helpDir, 'help', '#843 起 HELP 是根下的一支：两键合起来＝原 HELP_HTML_DIR_PARTS 两级');
  assert.deepEqual(Object.keys(d).sort(), ['db', 'html'], '两组键，键表即设置页的行');
  assert.ok(!('files' in d) && !('lark' in d), 'files／lark 两组已出表');
  assert.deepEqual([...SCHEDULE_CONFIG_RETIRED].sort(), ['files.help', 'lark.cliPath'], '删掉的两键进退休清单');
  assert.equal(DEFAULT_DB_FILENAME, 'schedule_data.db', '落点常量与配置默认值同源');
  console.log('#695 ① 读数：' + P(d));
});

/* ─────────── ② 三个配置 key 走真出口 ─────────── */

test('#695 ② config.read/write/reset 走 CLI 真出口：shape／载荷／`.bak`', () => {
  const cfg = mkCfg('keys');

  const read1 = runOk(cfg, ['schedule.config.read']);
  assert.equal(read1.env.key, 'schedule.config.read');
  assert.equal(read1.env.skill, 'schedule');
  assert.equal(read1.env.shape, 'detail', '读＝detail');
  assert.equal(read1.env.data.path, join(configDirOf(cfg), 'schedule.yaml'),
    '配置文件落 <家目录>/.ilife/schedule.yaml');
  assert.equal(read1.env.data.dataDir, dataDirOf(cfg), '数据目录＝<家目录>/.ilife/data');
  assert.equal(read1.env.data.created, true, '首次读即按默认值落一份');
  assert.equal(read1.env.data.values.db.dir, dataDirOf(cfg),
    '首次落文件时可改落点写绝对路径（#746 总口径回灌：读认空串、写落绝对路径）');
  assert.equal(read1.env.data.values.db.name, SCHEDULE_CONFIG_DEFAULTS.db.name);
  assert.equal(read1.env.data.values.html.dir, SCHEDULE_CONFIG_DEFAULTS.html.dir);

  const outDir = join(cfg, 'elsewhere');
  const write = runOk(cfg, ['schedule.config.write', '--params', P({ values: { db: { dir: outDir } } })]);
  assert.equal(write.env.shape, 'receipt', '写＝receipt');
  assert.equal(write.env.data.path, join(configDirOf(cfg), 'schedule.yaml'));
  assert.equal(write.env.data.values.db.dir, outDir, '写进去的项生效');
  assert.equal(write.env.data.values.db.name, 'schedule_data.db', '组里没给的子项保留现值（局部写）');

  const read2 = runOk(cfg, ['schedule.config.read']);
  assert.equal(read2.env.data.values.db.dir, outDir, '写完全程可见（下一次调用现读）');
  assert.equal(read2.env.data.created, false, '文件已存在');

  const beforeReset = readFileSync(join(configDirOf(cfg), 'schedule.yaml'), 'utf8');
  const reset = runOk(cfg, ['schedule.config.reset']);
  assert.equal(reset.env.shape, 'receipt', '重置＝receipt');
  assert.equal(reset.env.data.backupPath, join(configDirOf(cfg), 'schedule.yaml.bak'), '重置先另存 .bak');
  assert.equal(existsSync(reset.env.data.backupPath), true, '.bak 须真的落盘');
  assert.equal(readFileSync(reset.env.data.backupPath, 'utf8'), beforeReset, '.bak 里是改前那一份（逐字）');

  const read3 = runOk(cfg, ['schedule.config.read']);
  assert.equal(read3.env.data.values.db.dir, dataDirOf(cfg), '重置后可改落点仍是绝对路径（写盘口径）');
  assert.equal(read3.env.data.values.db.name, SCHEDULE_CONFIG_DEFAULTS.db.name, '重置后回默认');
  assert.equal(read3.env.data.values.html.dir, SCHEDULE_CONFIG_DEFAULTS.html.dir, '重置后回默认');
  assert.deepEqual(readdirSync(configDirOf(cfg)).sort(), ['data', 'schedule.yaml', 'schedule.yaml.bak'],
    '配置目录（<家目录>/.ilife）里恰：数据目录 ＋ 配置件 ＋ .bak');
  assert.deepEqual(readdirSync(cfg).sort(), ['.ilife'],
    '家目录下恰一个条目：配置与数据都住 `.ilife` 里，家目录根上不落别的（#763 的落点口径）');
  console.log('#695 ② 读数：read.shape=' + read1.env.shape + ' write.values.db.dir=' + write.env.data.values.db.dir
    + ' reset.backup=' + basename(reset.env.data.backupPath));
});

/* ─────────── ③ 配置真的进执行路径 ─────────── */

test('#695 ③ db.dir／html.dir 指到别处：写命令与 HELP 产物落在新落点（页面落根、HELP 落根下的一支）', () => {
  const cfg = mkCfg('path');
  const dbDir = join(cfg, 'other', 'db');
  const htmlDir = 'custom_html/manual';
  const w = runOk(cfg, ['schedule.config.write', '--params', P({
    values: { db: { dir: dbDir }, html: { dir: htmlDir } },
  })]);
  assert.equal(w.env.data.values.html.dir, htmlDir);

  const rec = runOk(cfg, ['schedule.record.write', '--params', P({
    op: 'add', date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优',
  })]);
  assert.equal(rec.env.shape, 'receipt');
  assert.equal(existsSync(join(dbDir, 'schedule_data.db')), true, '库落在配置给的 db.dir');
  assert.equal(existsSync(join(dataDirOf(cfg), 'schedule_data.db')), false, '默认数据目录里不落库');
  // #843：写命令也缺省落盘，且页面落**产物根**（不进 help 支）。
  assert.ok(rec.env.delivery, '写命令缺省即落盘（#843）');
  assert.equal(dirname(rec.env.delivery.path), join(dbDir, 'custom_html', 'manual'),
    '页面落配置给的产物根（html.dir 段串，两段）——与 HELP 那一支分家');

  const help = runOk(cfg, ['schedule.help.lookup']);
  const out = help.env.delivery.path;
  assert.equal(dirname(out), join(dbDir, 'custom_html', 'manual', 'help'),
    'HELP 落在配置给的产物根（html.dir 段串，两段）下的 html.helpDir 一支');
  assert.match(basename(out), KEY_RE, '名字通式不变：' + basename(out));
  assert.equal(existsSync(out), true);
  console.log('#695 ③ 读数：db=' + join(dbDir, 'schedule_data.db') + ' help=' + out);
});

/* ─────────── ④ 缺隔离（家目录回落真实那份） ⇒ 响亮失败 ─────────── */

test('#695 ④ 缺隔离即响亮失败：探针只调 resolveConfigDir()，零写（反向对照照常跑通）', () => {
  const bare = probeGuard();
  assert.equal(bare, 'THREW:CONFIG_TEST_ISOLATION_MISSING:HUMAN=1',
    '测试运行器里家目录落到真实那份时，公共层必须抛 CONFIG_TEST_ISOLATION_MISSING，且报文是那句人话（含「测试缺隔离」）：' + bare);

  const fakeHome = mkCfg('probe');
  const ok = probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome });
  assert.ok(ok.startsWith('OK:'), '反向对照：家目录指到临时目录就照常返回配置目录：' + ok);
  assert.ok(ok.includes(fakeHome), '返回的就是临时家目录那一份：' + ok);
  console.log('#695 ④ 读数：probe=' + bare + ' 反向=' + ok);
});
