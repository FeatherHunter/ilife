/** #695 · 私家大厨的配置面锁：默认值等于改造前的代码常量、三个配置 key 走真出口、
 *  配置**真的进执行路径**、测试缺隔离即响亮失败。
 *
 * 口径出处：「配置的存与生效口径裁定」（#675）的解决评论——每技能一份 YAML 配置文件
 * （默认 `~/.ilife/chef.yaml`），**配置文件是唯一真相**，环境变量不参与；删掉写库开关之后，
 * 测试隔离走**家目录注入**（#763：`USERPROFILE`／`HOME` 指到临时目录 ⇒ 配置落 `<临时家目录>/.ilife/`），
 * 护栏＝「跑在 node 测试运行器里却要落到真实家目录的 `.ilife`」即抛 `CONFIG_TEST_ISOLATION_MISSING`。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-chef`，再
 *   `node --test packages/skill-chef/test/config-695.test.mjs`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHEF_CONFIG_DEFAULTS, CHEF_CONFIG_STEM } from '../dist/config.js';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import { realHomeDir } from '../../../test/helpers/real-home-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

/**
 * #763 护栏探针：一个只调 `resolveConfigDir()` 的子进程。
 * 它**不碰盘**（`mkdir` 在 `resolveConfigDir()` 之后），所以哪怕护栏哪天 fail-open，这条用例也写不出真实数据
 * ——直接拿技能命令做「缺隔离」实验，一旦护栏失效就会真写。
 *
 * 「忘了注入」这一档＝把家目录两格**显式设成账号那一份**（`realHomeDir()`：与生产守卫同一条判据源），
 * **不是删掉那两格**：实测 win32 上 env 里删掉 `USERPROFILE`，子进程仍会拿到**父进程当刻**那一格
 * （系统补回），于是测试进程自己注过家目录时，删格根本到不了真实那一份、探针会假绿。
 * 反向对照经 `extraEnv` 把两格指到临时目录（用 `homeEnvOf` 或手写两格皆可）。
 */
const DIRS_URL = pathToFileURL(join(HERE, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;
const REAL_HOME = realHomeDir().dir;
const HOME_ENV_CAPS = ['USERPROFILE', 'HOME'];
function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIRS_URL) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const env = { ...process.env };
  for (const cap of HOME_ENV_CAPS) env[cap] = REAL_HOME; // 家目录＝真实那一份 ⇒ 护栏必须拦下
  env.NODE_TEST_CONTEXT = 'child-v8';                    // 跑在测试运行器里
  Object.assign(env, extraEnv);
  return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

const mkCfg = (tag) => mkdtempSync(join(tmpdir(), 't695chef-' + tag + '-'));
const P = (o) => JSON.stringify(o);
/** 隔离＝把**家目录**指到 `cfgDir`（#763）：配置落 `<cfgDir>/.ilife/chef.yaml`、数据落 `<cfgDir>/.ilife/data/`。 */
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

describe('#695 私家大厨配置面', () => {
  it('① 默认值逐项等于改造前的代码常量', () => {
    // 改造前：`src/fetch/paths.ts` 的 `DB_FILENAME = 'chef_data.db'`、
    // `src/help/manifest.ts` 的 `HELP_DIR_SEGMENTS = ['cook_html','help']`、
    // `HELP_FILE_STEM = '私家大厨_HELP'`、`LOOKUP_FILE_STEM = '私家大厨_速查表'`。
    assert.equal(CHEF_CONFIG_STEM, 'chef');
    assert.deepEqual(CHEF_CONFIG_DEFAULTS, {
      db: { dir: '', name: 'chef_data.db' },
      html: { dir: 'cook_html/help' },
      files: { help: '私家大厨_HELP', lookup: '私家大厨_速查表' },
    });
  });

  it('② 三个配置 key 走 CLI 真出口：读／写／重置，重置先留 .bak', () => {
    const cfg = mkCfg('keys');
    const first = runOk(cfg, ['chef.config.read']);
    assert.equal(first.shape, 'detail');
    assert.equal(first.skill, 'chef');
    assert.equal(first.key, 'chef.config.read');
    assert.equal(first.data.created, true, '首次读落一份默认');
    assert.equal(first.data.path, join(configDirOf(cfg), 'chef.yaml'), '配置文件＝<家目录>/.ilife/chef.yaml');
    assert.deepEqual(first.data.values, CHEF_CONFIG_DEFAULTS);
    assert.equal(readFileSync(join(configDirOf(cfg), 'chef.yaml'), 'utf8'),
      'db:\n  dir: ""\n  name: chef_data.db\nhtml:\n  dir: cook_html/help\nfiles:\n  help: 私家大厨_HELP\n  lookup: 私家大厨_速查表\n');
    // 配置目录里只该有配置件与数据目录两件（家目录本体就是隔离目录，别的一律不该落在它下面）。
    assert.deepEqual(readdirSync(configDirOf(cfg)).sort(), ['chef.yaml', 'data']);

    const w = runOk(cfg, ['chef.config.write', '--params', P({ values: { db: { name: 'my.db' } } })]);
    assert.equal(w.shape, 'receipt');
    assert.equal(w.data.values.db.name, 'my.db');
    assert.equal(w.data.values.db.dir, '', '没给的项保留现值（局部写）');
    assert.equal(w.data.values.files.lookup, '私家大厨_速查表', '没给的组保留默认');

    const reread = runOk(cfg, ['chef.config.read']);
    assert.equal(reread.data.created, false);
    assert.equal(reread.data.values.db.name, 'my.db', '写出去的确实落盘了');

    const r = runOk(cfg, ['chef.config.reset']);
    assert.equal(r.shape, 'receipt');
    assert.equal(r.data.backupPath, join(configDirOf(cfg), 'chef.yaml.bak'));
    assert.equal(existsSync(r.data.backupPath), true, '重置前先留 .bak');
    assert.equal(readFileSync(r.data.backupPath, 'utf8').includes('my.db'), true, '备份的是重置前那份');
    assert.deepEqual(runOk(cfg, ['chef.config.read']).data.values, CHEF_CONFIG_DEFAULTS, '重置回默认');
  });

  it('③ 配置真的进执行路径：改 db.dir／html.dir／files.help 后，库与产物落在新落点', () => {
    const cfg = mkCfg('takes-effect');
    const dbDir = join(cfg, 'my-db');
    // 产物目录是**库目录下的段串**（照老常量 `cook_html/help` 的语义：拼在库目录下，不是绝对路径）。
    mkdirSync(configDirOf(cfg), { recursive: true });
    writeFileSync(join(configDirOf(cfg), 'chef.yaml'), [
      'db:',
      '  dir: ' + JSON.stringify(dbDir),
      '  name: my_chef.db',
      'html:',
      '  dir: my-html/pages',
      'files:',
      '  help: 我的大厨_HELP',
      '  lookup: 我的大厨_速查表',
      '',
    ].join('\n'), 'utf8');

    const w = runOk(cfg, ['chef.recipe.write', '--params', P({ name: '配置菜', difficulty: '简单' })]);
    assert.equal(w.shape, 'receipt');
    assert.equal(existsSync(join(dbDir, 'my_chef.db')), true, '库落在配置给的目录与文件名上');

    const h = runOk(cfg, ['chef.help.lookup', '--params', P({ reuseHours: 0 })]);
    const htmlDir = join(dbDir, 'my-html', 'pages');
    assert.equal(dirname(h.delivery.path), htmlDir, '两段目录按配置拼：' + h.delivery.path);
    assert.match(h.delivery.path, /我的大厨_HELP_\d{8}_\d{6}\.html$/);
    assert.equal(existsSync(h.delivery.path), true);

    const l = runOk(cfg, ['chef.help.lookup', '--params', P({ mode: 'lookup', reuseHours: 0 })]);
    assert.match(l.delivery.path, /我的大厨_速查表_\d{8}_\d{6}\.html$/);
    assert.equal(readdirSync(htmlDir).length, 2);
  });

  it('④ 测试进程缺隔离（家目录＝真实家目录）⇒ 配置读取响亮失败，不许静默落到真实家目录', () => {
    // 探针：子进程只调 `resolveConfigDir()`（不碰盘）。家目录两格设成账号那一份 ⇒ 护栏必须拦下。
    assert.equal(probeGuard(), 'THREW:CONFIG_TEST_ISOLATION_MISSING');
    // 反向对照：同一支探针，家目录指到临时目录就照常算得出来（证明这道门只关「没注入家目录」这件事）。
    const fakeHome = mkCfg('probe');
    assert.equal(probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome }), 'OK:' + configDirOf(fakeHome));
  });
});
