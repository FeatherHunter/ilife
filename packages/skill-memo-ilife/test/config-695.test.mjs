/** #695 · 备忘录的配置面锁：默认值等于改造前的代码常量、三个配置 key 走真出口、
 *  配置**真的进执行路径**、测试缺隔离即响亮失败。
 *
 * 口径出处：「配置的存与生效口径裁定」（#675）的解决评论——每技能一份 YAML 配置文件
 * （默认 `~/.ilife/memo.yaml`），**配置文件是唯一真相**，环境变量不参与；#763 起测试隔离＝把**家目录**
 * 指到临时目录（Windows `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`），
 * 跑在测试运行器里却要落到**真实**家目录的 `.ilife` 时响亮失败（`CONFIG_TEST_ISOLATION_MISSING`，见 ④）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife`，再
 *   `node --test packages/skill-memo-ilife/test/config-695.test.mjs`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MEMO_CONFIG_DEFAULTS, MEMO_CONFIG_STEM } from '../dist/config.js';
import { initMemoTestDb } from '../../../tooling/contract-seam.mjs';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const mkCfg = (tag) => mkdtempSync(join(tmpdir(), 't695memo-' + tag + '-'));
/** 空库＋隔离家目录：`<家>/.ilife/data/memo.db` 是空库（备忘拒绝建空库，测试自己按老 schema 造）。 */
function mkCfgWithEmptyDb(tag) {
  const cfg = mkCfg(tag);
  const dataDir = join(configDirOf(cfg), 'data');
  mkdirSync(dataDir, { recursive: true });
  initMemoTestDb(join(dataDir, 'memo.db'));
  return cfg;
}
const P = (o) => JSON.stringify(o);
function run(cfgDir, args, envExtra) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: PKG, encoding: 'utf8', env: { ...process.env, ...homeEnvOf(cfgDir), ...(envExtra || {}) },
  });
}
function runOk(cfgDir, args) {
  const r = run(cfgDir, args);
  assert.equal(r.status, 0, 'exit 非 0：' + String(r.status) + ' / stderr=' + String(r.stderr));
  return JSON.parse(String(r.stdout));
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
  delete env.ILIFE_CONFIG_DIR;              // 位置覆盖变量（#754 才删）也清掉：留着它，守卫就看不到家目录
  Object.assign(env, extraEnv);
  env.NODE_TEST_CONTEXT = 'child-v8';       // 跑在测试运行器里
  return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

describe('#695 备忘录配置面', () => {
  it('① 默认值逐项等于改造前的代码常量', () => {
    // 改造前：库文件 `join(dbDir,'memo.db')`、`HELP_HTML_DIR_NAME='memo_html'`、
    // `HELP_FILE_STEM='备忘录_HELP'`、`LOOKUP_FILE_STEM='备忘录_速查表'`、
    // `MEDIA_DIR_DEFAULT='media'`、二维码缺省 `join(tmpdir(),'memo_feishu_qr')`、lark 显式值来自环境变量。
    assert.equal(MEMO_CONFIG_STEM, 'memo');
    assert.deepEqual(MEMO_CONFIG_DEFAULTS, {
      db: { dir: '', name: 'memo.db' },
      html: { dir: 'memo_html' },
      files: { help: '备忘录_HELP', lookup: '备忘录_速查表' },
      media: { dir: 'media' },
      lark: { cliPath: '', qrDir: '' },
    });
  });

  it('② 三个配置 key 走 CLI 真出口：读／写／重置，重置先留 .bak', () => {
    const cfg = mkCfg('keys');
    const first = runOk(cfg, ['memo.config.read']);
    assert.equal(first.shape, 'detail');
    assert.equal(first.skill, 'memo');
    assert.equal(first.key, 'memo.config.read');
    assert.equal(first.data.created, true, '首次读落一份默认');
    assert.equal(first.data.path, join(configDirOf(cfg), 'memo.yaml'), '配置落 <家目录>/.ilife/memo.yaml');
    assert.deepEqual(first.data.values, MEMO_CONFIG_DEFAULTS);
    assert.equal(readFileSync(join(configDirOf(cfg), 'memo.yaml'), 'utf8'),
      'db:\n  dir: ""\n  name: memo.db\nhtml:\n  dir: memo_html\n'
      + 'files:\n  help: 备忘录_HELP\n  lookup: 备忘录_速查表\nmedia:\n  dir: media\n'
      + 'lark:\n  cliPath: ""\n  qrDir: ""\n');

    const w = runOk(cfg, ['memo.config.write', '--params', P({ values: { db: { name: 'my.db' } } })]);
    assert.equal(w.shape, 'receipt');
    assert.equal(w.data.values.db.name, 'my.db');
    assert.equal(w.data.values.db.dir, '', '没给的项保留现值（局部写）');
    assert.equal(w.data.values.media.dir, 'media', '没给的组保留默认');

    const reread = runOk(cfg, ['memo.config.read']);
    assert.equal(reread.data.created, false);
    assert.equal(reread.data.values.db.name, 'my.db', '写出去的确实落盘了');

    const r = runOk(cfg, ['memo.config.reset']);
    assert.equal(r.data.backupPath, join(configDirOf(cfg), 'memo.yaml.bak'));
    assert.equal(existsSync(r.data.backupPath), true, '重置前先留 .bak');
    assert.equal(readFileSync(r.data.backupPath, 'utf8').includes('my.db'), true, '备份的是重置前那份');
    assert.deepEqual(runOk(cfg, ['memo.config.read']).data.values, MEMO_CONFIG_DEFAULTS, '重置回默认');
  });

  it('③ 配置真的进执行路径：改 db.dir／html.dir／files.help 后，库与产物落在新落点', () => {
    const cfg = mkCfg('takes-effect');
    const dbDir = join(cfg, 'my-db');
    mkdirSync(dbDir, { recursive: true });
    initMemoTestDb(join(dbDir, 'my_memo.db'));
    mkdirSync(configDirOf(cfg), { recursive: true }); // 自己写配置文件，故配置目录（<家>/.ilife）得先建出来
    writeFileSync(join(configDirOf(cfg), 'memo.yaml'), [
      'db:',
      '  dir: ' + JSON.stringify(dbDir),
      '  name: my_memo.db',
      'html:',
      '  dir: my-html',
      'files:',
      '  help: 我的备忘_HELP',
      '  lookup: 我的备忘_速查表',
      '',
    ].join('\n'), 'utf8');

    const w = runOk(cfg, ['memo.create', '--params', P({ title: '配置用例', body: '', category: '备忘' })]);
    assert.equal(w.shape, 'receipt');
    assert.equal(existsSync(join(dbDir, 'my_memo.db')), true, '库落在配置给的目录与文件名上');

    const h = runOk(cfg, ['memo.help.lookup', '--params', P({ reuseHours: 0 })]);
    const htmlDir = join(dbDir, 'my-html');
    assert.equal(dirname(h.delivery.path), htmlDir, '产物目录按配置拼：' + h.delivery.path);
    assert.match(h.delivery.path, /我的备忘_HELP_\d{8}_\d{6}\.html$/);
    assert.equal(existsSync(h.delivery.path), true);

    const l = runOk(cfg, ['memo.help.lookup', '--params', P({ mode: 'lookup', reuseHours: 0 })]);
    assert.match(l.delivery.path, /我的备忘_速查表_\d{8}_\d{6}\.html$/);
  });

  it('④ 缺隔离（家目录回落真实那份）即响亮失败：探针只调 resolveConfigDir()，零写', () => {
    const bare = probeGuard();
    assert.equal(bare, 'THREW:CONFIG_TEST_ISOLATION_MISSING:HUMAN=1',
      '测试运行器里家目录落到真实那份时，公共层必须抛 CONFIG_TEST_ISOLATION_MISSING，且报文是那句人话（含「测试缺隔离」）：' + bare);
    const fakeHome = mkCfg('probe');
    const ok = probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome });
    assert.ok(ok.startsWith('OK:'), '反向对照：家目录指到临时目录就照常返回配置目录：' + ok);
    assert.ok(ok.includes(fakeHome), '返回的就是临时家目录那一份：' + ok);
    console.log('#695 ④ 读数：probe=' + bare + ' 反向=' + ok);
  });

  it('⑤ 配置件坏键给人话（带行号与文件名）且走预检那一档', () => {
    const cfg = mkCfgWithEmptyDb('badkey');
    writeFileSync(join(configDirOf(cfg), 'memo.yaml'), 'db:\n  dirx: 1\n', 'utf8');
    const bad = run(cfg, ['memo.search']);
    assert.equal(bad.status, 1, '配置错项走 exit 1：' + String(bad.stderr));
    assert.match(String(bad.stderr), /不认识的配置项「db\.dirx」/);
    assert.match(String(bad.stderr), /memo\.yaml/);
  });
});
