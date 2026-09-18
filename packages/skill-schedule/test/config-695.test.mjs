/** #695 · 作息管家「路径类取值改读配置文件、环境变量全删」的配置面锁（真出口；不调内部件写盘）。
 *
 * 票面口径（GitHub #695）与上游裁定（#675 的解决评论）：每个技能一份 `<配置目录>/schedule.yaml`，
 * **配置文件是唯一真相，环境变量不参与**；`ILIFE_CONFIG_DIR` 设定且非空即整体接管配置目录
 * （它同时是测试隔离的唯一口子）；数据目录默认 `<配置目录>/data/`。
 *
 * 四条读数（逐条点名，不合并成一句「通过了」）：
 *  ① 默认值表逐项等于**改造前的代码常量**（`schedule_data.db`／`schedule_html/help`／`作息管家_HELP`），
 *     且落点常量与之一致；
 *  ② 三个配置 key（`schedule.config.read/write/reset`）走**真出口**：读＝`detail`、写／重置＝`receipt`，
 *     重置要留 `.bak`，回来再读回默认；
 *  ③ 配置**真的进执行路径**：`db.dir`／`html.dir` 指到临时目录下的别处，`schedule.record.write` 与
 *     `schedule.help.lookup` 的产物落在新落点；
 *  ④ 测试进程里没设 `ILIFE_CONFIG_DIR` 时配置读取**响亮失败**（`CONFIG_TEST_ISOLATION_MISSING`），
 *     反向对照：给了它就照常跑通。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule`（用例读 `dist/**`），再
 *   `node --test packages/skill-schedule/test/config-695.test.mjs`。
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCHEDULE_CONFIG_DEFAULTS } from '../dist/config.js';
import { DEFAULT_DB_FILENAME } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const CONFIG_MODULE = pathToFileURL(join(HERE, '..', 'dist', 'config.js')).href;
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY_RE = /^作息管家_HELP_\d{8}_\d{6}(_\d+)?\.html$/;

let CFG = '';
/** 数据目录：配置项 `db.dir` 空串 ⇒ 配置给出的 `<配置目录>/data`。 */
const dataDirOf = (dir) => join(dir, 'data');
const P = (o) => JSON.stringify(o);

function mkCfg(tag) {
  return mkdtempSync(join(tmpdir(), 't695-' + tag + '-'));
}

/** 跑真出口：默认把 `ILIFE_CONFIG_DIR` 指到 `cfg`（`envExtra` 可覆写，含把它清空）。 */
function run(cfg, args, envExtra) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: cfg, ...(envExtra || {}) },
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

/** 直接跑配置读取那条路（子进程，免得吃到本进程的读盘记忆）。
 *  `cwd` 设在包目录：`-e` 脚本的裸模块解析基准是它，`base-link-core` 只从包自己的 `node_modules` 找得到。 */
function probeLoad(env) {
  const code = 'const m = await import(' + JSON.stringify(CONFIG_MODULE) + ');'
    + 'try { m.loadScheduleConfig(); console.log("NO-THROW"); }'
    + 'catch (e) { console.log("THROW:" + e.code + ":" + String(e.message).includes("ILIFE_CONFIG_DIR")); }';
  return spawnSync(NODE_BIN, ['--input-type=module', '-e', code], {
    cwd: join(HERE, '..'), encoding: 'utf8', env: { ...process.env, ...env },
  }).stdout.trim();
}

before(() => {
  CFG = mkCfg('exit');
});

/* ─────────── ① 默认值＝改造前的代码常量 ─────────── */

test('#695 ① 默认值表逐项等于改造前的代码常量', () => {
  const d = SCHEDULE_CONFIG_DEFAULTS;
  assert.equal(d.db.dir, '', 'db.dir 空串＝按默认落点（数据目录），不是「没配」');
  assert.equal(d.db.name, 'schedule_data.db', '原 src/fetch/paths.ts 的 DB_FILENAME');
  assert.equal(d.html.dir, 'schedule_html/help', '原 helpPaths.ts 的 HELP_HTML_DIR_PARTS 两段');
  assert.equal(d.files.help, '作息管家_HELP', '原 helpFile.ts 的 HELP_FILE_STEM');
  assert.equal(d.lark.cliPath, '', '空串＝没有显式值，走 findLarkCli 的兜底探测（原 LARK_CLI_PATH）');
  assert.deepEqual(Object.keys(d).sort(), ['db', 'files', 'html', 'lark'], '四组键，键表即设置页的行');
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
  assert.equal(read1.env.data.path, join(cfg, 'schedule.yaml'), '配置文件落 <ILIFE_CONFIG_DIR>/schedule.yaml');
  assert.equal(read1.env.data.dataDir, dataDirOf(cfg), '数据目录＝<配置目录>/data');
  assert.equal(read1.env.data.created, true, '首次读即按默认值落一份');
  assert.deepEqual(read1.env.data.values, SCHEDULE_CONFIG_DEFAULTS, '读回来的就是默认值表');

  const outDir = join(cfg, 'elsewhere');
  const write = runOk(cfg, ['schedule.config.write', '--params', P({ values: { db: { dir: outDir } } })]);
  assert.equal(write.env.shape, 'receipt', '写＝receipt');
  assert.equal(write.env.data.path, join(cfg, 'schedule.yaml'));
  assert.equal(write.env.data.values.db.dir, outDir, '写进去的项生效');
  assert.equal(write.env.data.values.db.name, 'schedule_data.db', '组里没给的子项保留现值（局部写）');

  const read2 = runOk(cfg, ['schedule.config.read']);
  assert.equal(read2.env.data.values.db.dir, outDir, '写完全程可见（下一次调用现读）');
  assert.equal(read2.env.data.created, false, '文件已存在');

  const beforeReset = readFileSync(join(cfg, 'schedule.yaml'), 'utf8');
  const reset = runOk(cfg, ['schedule.config.reset']);
  assert.equal(reset.env.shape, 'receipt', '重置＝receipt');
  assert.equal(reset.env.data.backupPath, join(cfg, 'schedule.yaml.bak'), '重置先另存 .bak');
  assert.equal(existsSync(reset.env.data.backupPath), true, '.bak 须真的落盘');
  assert.equal(readFileSync(reset.env.data.backupPath, 'utf8'), beforeReset, '.bak 里是改前那一份（逐字）');

  const read3 = runOk(cfg, ['schedule.config.read']);
  assert.deepEqual(read3.env.data.values, SCHEDULE_CONFIG_DEFAULTS, '重置后回默认值');
  assert.deepEqual(readdirSync(cfg).sort(), ['data', 'schedule.yaml', 'schedule.yaml.bak'],
    '配置目录里恰：数据目录 ＋ 配置件 ＋ .bak');
  console.log('#695 ② 读数：read.shape=' + read1.env.shape + ' write.values.db.dir=' + write.env.data.values.db.dir
    + ' reset.backup=' + basename(reset.env.data.backupPath));
});

/* ─────────── ③ 配置真的进执行路径 ─────────── */

test('#695 ③ db.dir／html.dir 指到别处：写命令与 HELP 产物落在新落点', () => {
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

  const help = runOk(cfg, ['schedule.help.lookup']);
  const out = help.env.delivery.path;
  assert.equal(dirname(out), join(dbDir, 'custom_html', 'manual'), 'HELP 落在配置给的 html.dir 段串下（两段）');
  assert.match(basename(out), KEY_RE, '名字通式不变：' + basename(out));
  assert.equal(existsSync(out), true);
  console.log('#695 ③ 读数：db=' + join(dbDir, 'schedule_data.db') + ' help=' + out);
});

/* ─────────── ④ 没设 ILIFE_CONFIG_DIR ⇒ 响亮失败 ─────────── */

test('#695 ④ 测试进程没设 ILIFE_CONFIG_DIR：配置读取响亮失败（反向对照照常跑通）', () => {
  const bare = probeLoad({ ILIFE_CONFIG_DIR: '', NODE_TEST_CONTEXT: 'child-v8' });
  assert.equal(bare, 'THROW:CONFIG_TEST_ISOLATION_MISSING:true',
    '测试运行器里缺 ILIFE_CONFIG_DIR 须抛 CONFIG_TEST_ISOLATION_MISSING 且报文点名它：' + bare);

  const ok = probeLoad({ ILIFE_CONFIG_DIR: mkCfg('probe'), NODE_TEST_CONTEXT: 'child-v8' });
  assert.equal(ok, 'NO-THROW', '同一个探针给了 ILIFE_CONFIG_DIR 就照常跑通（证明门只关「没给」这件事）');

  // 真出口那一侧：同一个 key，给了配置目录 exit 0，清空它 exit 1 且 stderr 是人话。
  assert.equal(runOk(CFG, ['schedule.record.today', '--params', P({ date: '2026-09-06' })]).status, 0);
  const no = run(CFG, ['schedule.record.today', '--params', P({ date: '2026-09-06' })],
    { ILIFE_CONFIG_DIR: '', NODE_TEST_CONTEXT: 'child-v8' });
  assert.equal(no.status, 1, '归「预检」那一档（exit 1），不是「未知失败」');
  assert.equal(no.stdout, '', '失败时 stdout 不吐任何 JSON（不假装成功）');
  assert.match(no.stderr, /测试缺隔离/, 'stderr 须是配置件那句人话：' + no.stderr);
  console.log('#695 ④ 读数：probe=' + bare + ' 反向=' + ok + ' 出口 exit=' + no.status);
});
