import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// #695：路径类取值改读配置文件（`<配置目录>/home.yaml`；`ILIFE_CONFIG_DIR` 设定且非空即整体接管）。
// 本件在**进程内**直接调模块，故加载前先把配置目录指到独占临时目录 —— 配置件跑在测试运行器里
// 却缺 `ILIFE_CONFIG_DIR` 时一律响亮失败（`CONFIG_TEST_ISOLATION_MISSING`），这里正是那道门的正向用法。
const CFG = mkdtempSync(join(tmpdir(), 'home-fetch-'));
process.env.ILIFE_CONFIG_DIR = CFG;

const here = dirname(fileURLToPath(import.meta.url));
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

describe('居家取数 fetch（配置隔离：ILIFE_CONFIG_DIR 独占临时目录）', () => {
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
    //   ① 测试一律把 `ILIFE_CONFIG_DIR` 指到临时目录（本件件头那一步）；
    //   ② 默认值表逐项等于改造前的代码常量 —— 这里是那批常量的对照读数。
    assert.deepEqual(HOME_CONFIG_DEFAULTS, {
      db: { dir: '', name: 'home.db' },
      html: { dir: 'home_manager_html' },
      files: { help: '居家管家_HELP', lookup: '居家管家_速查表' },
      backup: { dir: 'backups' },
    });
    assert.equal(dbFilename(), 'home.db');
    assert.equal(resolveDbDir(), join(CFG, 'data'), '`db.dir` 空串＝数据目录 `<配置目录>/data`');
    assert.equal(resolveDbPath(), join(CFG, 'data', 'home.db'));
    assert.ok(existsSync(join(CFG, HOME_CONFIG_STEM + '.yaml')), '首次读按默认值落了一份配置');
  });
  it('测试进程缺 ILIFE_CONFIG_DIR ⇒ 配置读取响亮失败，绝不落到真实家目录', () => {
    // 子进程里 `ILIFE_CONFIG_DIR` 为空 ＋ 跑在测试运行器里（`NODE_TEST_CONTEXT` 非空）⇒ 配置件抛
    // `CONFIG_TEST_ISOLATION_MISSING`。这是「删掉写库开关」之后那道替代护栏的另一半。
    const code = "process.env.ILIFE_CONFIG_DIR='';"
      + "import('./dist/config.js').then((m) => { m.loadHomeConfig(); console.error('NO-THROW'); process.exit(0); })"
      + ".catch((e) => { console.error(String(e.code) + ': ' + e.message); process.exit(3); });";
    const r = spawnSync(process.execPath, ['-e', code], {
      cwd: join(here, '..'), encoding: 'utf8',
      env: { ...process.env, ILIFE_CONFIG_DIR: '', NODE_TEST_CONTEXT: 'child-v8' },
    });
    assert.notEqual(r.status, 0, '缺隔离必须非 0（stderr：' + r.stderr + '）');
    assert.match(String(r.stderr), /CONFIG_TEST_ISOLATION_MISSING|测试缺隔离/);
    assert.ok(!String(r.stderr).includes('NO-THROW'), '不许静默取默认值');
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
