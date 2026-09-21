/**
 * #757 · 卡路里设置页收窄（照记账 #749 样板铺开）——**技能侧**验收。
 *
 * 判据（逐条对应票面《验收命令》与两条补注）：
 *   ① 首次落文件：删掉 `calorie.yaml` 再跑一条只读命令 ⇒ 文件里可改落点（`db.dir`／`photos.dir`）
 *      是**算出来的绝对路径**；回执 `data.resolved` 含七格绝对路径（生效数据目录／库文件／产物目录／
 *      照片目录／GIF 子目录／训记状态目录／动作库）。
 *   ② 回执那几格与 `<家>/.ilife/calorie.yaml` 的取值**逐字一致**（按文件里那份取值现算一遍对账）。
 *   ③ 把那两格改回 `""` ⇒ 仍按默认落点工作，且「读不写回」（老文件一份不用动）。
 *   ④ 保存／重置也把那两格落成绝对路径（#746 总口径回灌的口径：写的时候一律绝对）。
 *   ⑤ `photos.dir`／`xunji.stateDir` 的解析口径：空串 ⇒ 默认落点（`<库目录>/photos`／`<库目录>/xunji`），
 *      不再有「未配置」态；显式值 ⇒ 原样用它。
 *   ⑥ 删键过渡（#762 机制）：含已删键（`land.scheduleCli`／`land.memoCli`）的老 `calorie.yaml`
 *      跑一条读命令 ⇒ exit 0、`values.land` 里没有这两键；走一次保存 ⇒ 文件里这两键消失、其余逐字不变；
 *      集合外的未知键照旧硬失败（护栏没拆）。
 *   ⑦ 老机器路径退场：`XUNJI_CATALOG` 只剩 `preset` 一项；`xunji.stateDir` 空串不再解到 `~/.mavis`；
 *      动作库空串解到包内预置那份。
 *   ⑧ 体检与回执同源：`calorie.config.check` 报的路径与回执 `resolved` 逐字对得上；`photos.dir` 那条判据
 *      不再出现「未配置」；回执里不再出现 `ILIFE_CONFIG_DIR`，也不再给「去页面上把只读项改到别处」这类
 *      做不到的指引；跨技能出口判据不再读配置（删键），文案按包布局推断。
 *
 * 隔离：每个用例一个临时家目录（win32 `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`），
 * 真实 `~/.ilife` 一行都不碰（基座当场自证）。
 *
 * 运行：`node --test packages/skill-calorie/test/t757-设置页收窄.test.mjs`（需先编 `skill-calorie`）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');

/** 当刻用例的临时家目录（`beforeEach` 现开、`afterEach` 现删）。 */
let home = null;

/** 跑一条卡路里命令：回 `{ code, stdout, stderr }`（非 0 不抛，交给断言判）。 */
function runCalorie(key, params) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  try {
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', env: homeEnvOf(home) });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

/** 跑一条命令并拆出信封 `data`（非 0 即当场失败，报文带 stderr）。 */
function dataOf(key, params) {
  const r = runCalorie(key, params);
  assert.equal(r.code, 0, key + ' 应 exit 0，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.key, key);
  return envelope.data;
}

const yamlFile = () => join(configDirOf(home), 'calorie.yaml');
const dataDir = () => join(configDirOf(home), 'data');
const readYaml = () => parseConfigYaml(readFileSync(yamlFile(), 'utf8'), 'calorie.yaml').values;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'calorie-757-'));
  // 只建配置目录、**不建配置文件**：①那条要的是「文件不在」的首次落盘读数。
  mkdirSync(configDirOf(home), { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
});

afterEach(() => {
  if (home !== null) rmSync(home, { recursive: true, force: true });
  home = null;
});

describe('#757 设置页收窄 · 技能侧回执与落点', () => {
  describe('① 回执扩组：一组解析后的绝对路径', () => {
    it('首次读（文件不在）⇒ 落一份配置，可改落点是算出来的绝对路径，回执七格齐', () => {
      const data = dataOf('calorie.config.read', {});
      assert.equal(data.created, true, '首次读应把配置文件落下来');
      assert.equal(data.dataDir, dataDir());
      const onDisk = readYaml();
      assert.equal(onDisk.db.dir, dataDir(), '写盘那一份的数据目录＝算出来的绝对路径');
      assert.equal(onDisk.photos.dir, join(dataDir(), 'photos'), '写盘那一份的照片目录＝算出来的绝对路径');
      assert.ok(isAbsolute(String(onDisk.db.dir)), '写下去的是绝对路径：' + String(onDisk.db.dir));
      assert.ok(isAbsolute(String(onDisk.photos.dir)), '写下去的是绝对路径：' + String(onDisk.photos.dir));
      assert.deepEqual(Object.keys(data.resolved).sort(),
        ['catalog', 'dbDir', 'dbFile', 'gifsDir', 'htmlDir', 'photosDir', 'stateDir']);
      for (const [key, value] of Object.entries(data.resolved)) {
        assert.ok(isAbsolute(value), 'resolved.' + key + ' 应是绝对路径，实为 ' + value);
      }
    });

    it('回执那几格与配置文件里的取值逐字一致（按文件那份取值现算一遍对账）', () => {
      dataOf('calorie.config.read', {}); // 先落一份
      const data = dataOf('calorie.config.read', {});
      const v = readYaml();
      const dbDir = v.db.dir === '' ? data.dataDir : String(v.db.dir);
      const photosDir = v.photos.dir === '' ? join(dbDir, 'photos') : String(v.photos.dir);
      assert.equal(data.resolved.dbDir, dbDir);
      assert.equal(data.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(data.resolved.htmlDir, join(dbDir, String(v.html.dir)));
      assert.equal(data.resolved.photosDir, photosDir);
      assert.equal(data.resolved.gifsDir, join(photosDir, String(v.photos.gifs)));
      assert.equal(data.resolved.stateDir, join(dbDir, 'xunji'), '空串的状态目录＝库目录下的 xunji');
    });
  });

  describe('② 读仍认空串（老文件一份不用动）', () => {
    it('文件里写着 dir: "" ⇒ 按默认落点工作，且读不写回', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: calorie_data.db',
        'html:',
        '  dir: calorie_html',
        'photos:',
        '  dir: ""',
        '  gifs: gifs',
        'xunji:',
        '  key: ""',
        '  cli: ""',
        '  stateDir: ""',
        '  catalog: ""',
        '  backfillDays: 1',
        'land:',
        '  xunjiSeconds: 300',
        '  landSeconds: 60',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const data = dataOf('calorie.config.read', {});
      assert.equal(data.values.db.dir, '', '读回来仍是空串（不是被悄悄改写成绝对路径）');
      assert.equal(data.values.photos.dir, '', '读回来仍是空串');
      assert.equal(data.resolved.dbDir, dataDir(), '生效落点＝默认数据目录');
      assert.equal(data.resolved.photosDir, join(dataDir(), 'photos'), '照片生效落点＝默认数据目录下的 photos');
      assert.equal(readFileSync(yamlFile(), 'utf8'), text, '读不写回：盘上仍是用户那份');
    });
  });

  describe('③ 写的时候一律落绝对路径', () => {
    it('保存：提交空串 ⇒ 写下去的是算出来的绝对路径', () => {
      dataOf('calorie.config.read', {});
      const r = runCalorie('calorie.config.write', { values: { db: { dir: '' }, photos: { dir: '' } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '保存也把数据目录写成绝对路径');
      assert.equal(readYaml().photos.dir, join(dataDir(), 'photos'), '保存也把照片目录写成绝对路径');
    });

    it('重置：写出去的默认值里可改落点也是绝对路径', () => {
      dataOf('calorie.config.read', {});
      const r = runCalorie('calorie.config.reset', {});
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '重置落的是绝对路径');
      assert.equal(readYaml().photos.dir, join(dataDir(), 'photos'), '重置落的是绝对路径');
    });
  });

  describe('④ 空串的默认落点（不再有「未配置」态）', () => {
    it('photos.dir 空串 ⇒ <库目录>/photos；xunji.stateDir 空串 ⇒ <库目录>/xunji', () => {
      const data = dataOf('calorie.config.read', {});
      assert.equal(data.resolved.photosDir, join(dataDir(), 'photos'));
      assert.equal(data.resolved.stateDir, join(dataDir(), 'xunji'));
    });

    it('显式值 ⇒ 原样用它', () => {
      dataOf('calorie.config.read', {});
      const customPhotos = join(home, 'my-photos');
      const customState = join(home, 'my-xunji-state');
      const r = runCalorie('calorie.config.write', { values: { photos: { dir: customPhotos }, xunji: { stateDir: customState } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      const data = dataOf('calorie.config.read', {});
      assert.equal(data.resolved.photosDir, customPhotos);
      assert.equal(data.resolved.stateDir, customState);
    });
  });

  describe('⑤ 删键过渡（#762 机制）：老文件里的已删键容忍＋写即清，护栏不动', () => {
    it('含已删键的老文件 ⇒ exit 0、取值里没有它们', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: calorie_data.db',
        'html:',
        '  dir: calorie_html',
        'photos:',
        '  dir: ""',
        '  gifs: gifs',
        'xunji:',
        '  key: ""',
        '  cli: ""',
        '  stateDir: ""',
        '  catalog: ""',
        '  backfillDays: 1',
        'land:',
        '  scheduleCli: ""',
        '  memoCli: ""',
        '  xunjiSeconds: 300',
        '  landSeconds: 60',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const r = runCalorie('calorie.config.read', {});
      assert.equal(r.code, 0, '含已删键的老文件不该 exit 1，stderr=' + r.stderr);
      const data = JSON.parse(r.stdout).data;
      assert.equal(data.values.land.scheduleCli, undefined, '已删键不进取值');
      assert.equal(data.values.land.memoCli, undefined, '已删键不进取值');
      assert.equal(data.values.land.xunjiSeconds, 300, '其余取值原样');
    });

    it('走一次保存 ⇒ 文件里那两个键消失、其余逐字不变', () => {
      const before = [
        'db:',
        '  dir: ""',
        '  name: calorie_data.db',
        'html:',
        '  dir: calorie_html',
        'photos:',
        '  dir: ""',
        '  gifs: gifs',
        'xunji:',
        '  key: ""',
        '  cli: ""',
        '  stateDir: ""',
        '  catalog: ""',
        '  backfillDays: 1',
        'land:',
        '  scheduleCli: ""',
        '  memoCli: ""',
        '  xunjiSeconds: 300',
        '  landSeconds: 60',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), before, 'utf8');
      const beforeValues = dataOf('calorie.config.read', {}).values;
      const r = runCalorie('calorie.config.write', { values: {} });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      const after = readFileSync(yamlFile(), 'utf8');
      assert.equal(after.includes('scheduleCli'), false, '保存后死键应消失：\n' + after);
      assert.equal(after.includes('memoCli'), false, '保存后死键应消失：\n' + after);
      const afterValues = dataOf('calorie.config.read', {}).values;
      assert.equal(afterValues.land.xunjiSeconds, beforeValues.land.xunjiSeconds, '其余取值逐字不变');
      assert.equal(afterValues.db.name, beforeValues.db.name, '其余取值逐字不变');
    });

    it('集合外的未知键照旧硬失败（护栏没拆）', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: calorie_data.db',
        '  dirr: oops',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const r = runCalorie('calorie.config.read', {});
      assert.notEqual(r.code, 0, '未知键应硬失败');
      assert.match(r.stderr, /不认识的配置项「db\.dirr」/, '报文要点名那一行：' + r.stderr);
    });
  });

  describe('⑥ 老机器路径退场', () => {
    it('XUNJI_CATALOG 只剩 preset 一项；状态默认不再是 ~/.mavis', async () => {
      const mod = await import('../dist/xunji/index.js');
      assert.equal(mod.XUNJI_CATALOG.machine, undefined, '老机器路径已退场');
      assert.ok(String(mod.XUNJI_CATALOG.preset).endsWith(join('src', 'xunji', 'data', '训记官方动作.json')));
      const data = dataOf('calorie.config.read', {});
      assert.ok(!data.resolved.stateDir.replace(/\\/g, '/').endsWith('/.mavis'), '状态默认不再是 ~/.mavis：' + data.resolved.stateDir);
      assert.equal(data.resolved.catalog, mod.XUNJI_CATALOG.preset, '动作库空串解到包内预置那份');
    });
  });

  describe('⑦ 体检与回执同源（落点算式只有一处定义地）', () => {
    it('体检报的路径与回执 resolved 逐字对得上；photos.dir 不再出现「未配置」；无 ILIFE_CONFIG_DIR；只读项不指页面', () => {
      const read = dataOf('calorie.config.read', {});
      const report = dataOf('calorie.config.check', {});
      const body = JSON.stringify(report);
      assert.equal(body.includes('ILIFE_CONFIG_DIR'), false, '体检里不该再出现 ILIFE_CONFIG_DIR');
      assert.equal(body.includes('未配置'), false, '体检里不该再出现「未配置」（photos.dir 新口径）：' + body);
      const p = (s) => String(s).replace(/\\/g, '/');
      const text = report.items.map((i) => i.message + ' ' + i.action).join('\n');
      for (const [label, path] of [['库文件', read.resolved.dbFile], ['照片目录', read.resolved.photosDir], ['状态目录', read.resolved.stateDir]]) {
        assert.ok(text.includes(p(path)), '体检报告里应出现与回执同源的 ' + label + ' 路径：' + p(path));
      }
      // 只读项（产物目录／状态目录／动作库）的指引不许再指「去页面上改到别处」——页面已只读。
      for (const id of ['html.dir', 'xunji.stateDir', 'xunji.catalog']) {
        const item = report.items.find((i) => i.id === id);
        assert.notEqual(item, undefined, '体检报告缺 ' + id + ' 那条');
        assert.equal(item.action.includes('改到别处'), false,
          id + ' 的行动指引仍在让人去改别处：' + item.action);
        assert.equal(/页面上去改/.test(item.action + item.message), false,
          id + ' 仍在指做不到的页面操作：' + item.action);
      }
      // 跨技能出口判据不再读配置：来源恒为默认值。
      const land = report.items.find((i) => i.id === 'land.cli');
      assert.equal(land.source, '默认值', '删键后出口判据来源恒为默认值');
    });
  });
});
