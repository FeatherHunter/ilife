import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configDirOf, useHome } from '../../../test/helpers/home-test-base.mjs';
import { realHomeDir } from '../../../test/helpers/real-home-snapshot.mjs';

// #763：路径类取值改读配置文件（`<家目录>/.ilife/home.yaml`）。本件在**进程内**直接调模块，
// 故加载前先把**家目录**指到独占临时目录（`useHome`）—— 配置件跑在测试运行器里却要落到真实家目录
// 时一律响亮失败（`CONFIG_TEST_ISOLATION_MISSING`），这里正是那道门的正向用法。
const CFG = mkdtempSync(join(tmpdir(), 'home-fetch-'));
useHome(CFG);

const here = dirname(fileURLToPath(import.meta.url));

/** #763 护栏探针：只调 `resolveConfigDir()` 的子进程（不碰盘，故护栏 fail-open 也写不出真实数据）。
 *  「忘了注入」＝把家目录两格**显式设成账号那一份**（不是删格：实测 win32 上删掉 `USERPROFILE`，子进程
 *  仍会拿到父进程当刻那一格——本件自己就注过临时家目录）。反向对照经 `extraEnv` 给临时两格。 */
const DIRS_URL = pathToFileURL(join(here, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;
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
const {
  openHomeDb, closeHomeDb,
  addItem, getItemById, searchItems, listAllTags, mergeTags,
  listCategories, getCategoryById, encryptPassword, decryptPassword, assertMasterKey,
  HomeFetchError, resolveDbDir, resolveDbPath, dbFilename,
} = await import('../dist/index.js');
const { HOME_CONFIG_DEFAULTS, HOME_CONFIG_STEM } = await import('../dist/config.js');

let H = null;

before(() => {
  H = openHomeDb(resolveDbPath());
  assert.equal(H.initialized, true);
});

describe('居家取数 fetch（配置隔离：家目录独占临时目录）', () => {
  it('开库 8 顶级种子 + 增查闭环', () => {
    const cats = listCategories(H);
    assert.ok(cats.length >= 8);
    const cid = cats[0].id;
    const it = addItem(H, { name: '牛奶', category: cats[0].name, category_id: cid, location: '客厅/冰箱', tags: ['早餐'] });
    assert.equal(it.name, '牛奶');
    assert.equal(getItemById(H, it.id).name, '牛奶');
    assert.ok(searchItems(H, { name: '牛奶' }).length >= 1);
    assert.throws(() => getCategoryById(H, 999999), HomeFetchError);
  });
  it('查无对条大声失败 + 配置面：默认值逐项＝改造前的代码常量、落点＝数据目录', () => {
    assert.throws(() => getItemById(H, 999999), HomeFetchError);
    // #695：写库开关（`HOME_FORCE_PROD`）与「非 tmp 拒写」守卫已按用户裁决删除，替代护栏是下面两件事：
    //   ① 测试一律把**家目录**指到临时目录（本件件头那一步）；
    //   ② 默认值表逐项等于改造前的代码常量 —— 这里是那批常量的对照读数。
    assert.deepEqual(HOME_CONFIG_DEFAULTS, {
      db: { dir: '', name: 'home.db' },
      html: { dir: 'home_manager_html' },
      key: { file: '.master.key' },
      backup: { dir: 'backups' },
    });
    assert.equal(dbFilename(), 'home.db');
    assert.equal(resolveDbDir(), join(configDirOf(CFG), 'data'), '`db.dir` 空串＝数据目录 `<家目录>/.ilife/data`');
    assert.equal(resolveDbPath(), join(configDirOf(CFG), 'data', 'home.db'));
    assert.ok(existsSync(join(configDirOf(CFG), HOME_CONFIG_STEM + '.yaml')), '首次读按默认值落了一份配置');
  });
  it('测试进程家目录＝真实家目录 ⇒ 配置读取响亮失败，绝不落到真实家目录', () => {
    // 探针：只调 `resolveConfigDir()`（不碰盘）——家目录两格设成账号那一份，护栏必须拦下。
    // 这一条不拿技能命令做实验：那条路一旦护栏失效就会真写（探针连 mkdir 都到不了）。
    assert.equal(probeGuard(), 'THREW:CONFIG_TEST_ISOLATION_MISSING');
    // 反向对照：同一支探针，家目录指到临时目录就照常算得出来。
    const fakeHome = mkdtempSync(join(tmpdir(), 'home-fetch-probe-'));
    assert.equal(probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome }), 'OK:' + configDirOf(fakeHome));
  });
  it('标签合并 + 账号加解密 + master-key 门', () => {
    const cats = listCategories(H);
    addItem(H, { name: '白糖', category: cats[0].name, category_id: cats[0].id, location: '厨房/柜子', tags: ['白'] });
    assert.ok(mergeTags(H, '白', '白色') >= 1);
    assert.ok(listAllTags(H).some((t) => t.tag === '白色'));
    assert.throws(() => assertMasterKey('short'), HomeFetchError);
    const enc = encryptPassword('12345678', 'pw123');
    assert.equal(decryptPassword('12345678', enc), 'pw123');
    assert.throws(() => decryptPassword('87654321', enc), HomeFetchError);
  });
});
