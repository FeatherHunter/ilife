// #801 · 数据与过程命令默认落 HTML 的交付门（CLI 级、**只经真 spawn**）。
//
// 为什么有这件：此前常规跑一条数据／过程命令只回 stdout 的 envelope JSON，
// 删掉默认交付段、改坏落点值、改坏命名，既有用例照样全绿（`test/**` 零处断言
// 非 HELP 键的 `delivery`）。本件锁票面四条：① 缺省即落盘（通式逐字／绝对路径／
// 字节＝实测）；② 同模板多场景不互盖；③ `--html` 显式优先、只落一份、单回执；
// ④ 退出码矩阵（正例 0／参数 2／未知键 3／落盘失败 5，失败时 stdout 空）。
// 附录对账（命名 69 行逐字＋storage 偏离显式断言）也在本件，防与票 2 契约走散。
//
// 纪律（照 test/help-delivery-190.test.mjs）：落点值／名字通式在本文件里**写死逐字**
// （不从 `dist/help/manifest.js` 取），否则改实现点会同时改期望值，锁变成同义反复。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveSceneStem } from '../dist/render/sceneNaming.js';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 落点值逐字（配置默认值 `home_manager_html`；这里写死，不做同义反复）。 */
const HTML_DIR = 'home_manager_html';
const STEM_RE = /^(.+)_(.+)_(\d{8}_\d{6})(?:_(\d+))?\.html$/;

const mkDir = (tag) => mkdtempSync(join(tmpdir(), 'home801-' + tag + '-'));
const dataDirOf = (dir) => join(configDirOf(dir), 'data');
const htmlDirOf = (dir) => join(dataDirOf(dir), HTML_DIR);
const P = (o) => JSON.stringify(o);

function run(dir, args, envExtra) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...homeEnvOf(dir), ...(envExtra ?? {}) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(dir, args) {
  const r = run(dir, args);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是可解析 JSON：' + r.stdout.slice(0, 200));
  assert.equal(r.stdout.trim().split('\n').length, 1, 'stdout 恒一行 JSON');
  return r;
}

const listOf = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

/** 种子：分类首个＋录一件（供改／移／借用的真链）。 */
function seed(dir) {
  assert.equal(run(dir, ['home.stats.overview']).status, 0);
  const cats = JSON.parse(run(dir, ['home.tag.query', '--params', P({ kind: 'categories' })]).stdout).data.items;
  const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
  assert.equal(run(dir, ['home.item.add', '--params', P({ name: '牛奶', category_id: cid, location: '客厅/冰箱' })]).status, 0);
  const id = JSON.parse(run(dir, ['home.item.search', '--params', P({ name: '牛奶' })]).stdout).data.items[0].id;
  return { cid, id };
}

describe('#801 默认落盘', () => {
  test('① 缺省即落 HTML：通式逐字＋绝对路径＋字节＝实测＋顶层只追加', () => {
    const dir = mkDir('default');
    const r = runOk(dir, ['home.stats.overview']);
    const out = r.env.delivery.path;
    assert.equal(r.env.delivery.mode, 'file');
    assert.deepEqual(Object.keys(r.env), ['version', 'skill', 'shape', 'key', 'data', 'delivery'],
      'delivery 顶层追加、既有五键一字不改、序不变');
    assert.deepEqual(Object.keys(r.env.delivery), ['mode', 'path', 'bytes']);
    assert.equal(basename(dirname(out)), HTML_DIR, '落 <数据目录>/' + HTML_DIR + '/');
    assert.equal(dirname(out), htmlDirOf(dir), '父目录＝数据目录下那一层（不多不少）');
    assert.ok(resolve(out) === out && out.startsWith(dir), 'delivery.path 为绝对路径：' + out);
    assert.ok(existsSync(out), '回执路径真的存在');
    const m = basename(out).match(STEM_RE);
    assert.ok(m, '文件名通式逐字 `<命令中文名>_<场景 id>_<戳>.html`：' + basename(out));
    assert.equal(m[1], '统物品', '命令中文名逐字');
    assert.equal(m[2], 'SM4-1', '场景 id 逐字（缺省 kind=summary 的宿主行）');
    assert.equal(r.env.delivery.bytes, statSync(out).size, 'delivery.bytes ＝实际 statSync().size');
    assert.equal(r.env.delivery.bytes, Buffer.byteLength(readFileSync(out, 'utf8'), 'utf8'));
    assert.match(readFileSync(out, 'utf8'), /<section data-skill="home"/, '产物＝envelope 分节页套模板');
  });

  test('② 同模板多场景不互盖：移物品与数量变更各落各的 stem', () => {
    const dir = mkDir('stems');
    const { id } = seed(dir);
    const mv = runOk(dir, ['home.item.update', '--params', P({ id, op: 'move', new_location: '卧室/衣柜' })]);
    const qty = runOk(dir, ['home.item.update', '--params', P({ id, op: 'qty', plus: 1 })]);
    const n1 = basename(mv.env.delivery.path);
    const n2 = basename(qty.env.delivery.path);
    assert.match(n1, /^移物品_3-2_\d{8}_\d{6}(_\d+)?\.html$/, '移物品 stem 逐字：' + n1);
    assert.match(n2, /^数量变更_3-3_\d{8}_\d{6}(_\d+)?\.html$/, '数量变更 stem 逐字：' + n2);
    assert.notEqual(n1, n2, '两份产物不互盖');
    assert.equal(mv.env.delivery.bytes, statSync(mv.env.delivery.path).size);
    assert.equal(qty.env.delivery.bytes, statSync(qty.env.delivery.path).size);
  });

  test('③ 宿主行真链：借用写侧与备份查询落宿主场景名', () => {
    const dir = mkDir('hosts');
    const { id } = seed(dir);
    const b = runOk(dir, ['home.care.write', '--params', P({ kind: 'borrow', item_id: id })]);
    assert.match(basename(b.env.delivery.path), /^借用_SM7-1_\d{8}_\d{6}(_\d+)?\.html$/, '借用写侧宿主 SM7-1');
    const l = runOk(dir, ['home.care.query', '--params', P({ kind: 'backup-list' })]);
    assert.match(basename(l.env.delivery.path), /^备份导出_SM8-3_\d{8}_\d{6}(_\d+)?\.html$/, '备份查询宿主 SM8-3');
  });

  test('④ `--html` 显式优先：只落一份、单回执指逐字路径', () => {
    const dir = mkDir('explicit');
    seed(dir);
    const before = listOf(htmlDirOf(dir)).length;
    const out = join(dir, 'my-explicit.html');
    const r = runOk(dir, ['home.item.search', '--params', P({ name: '牛奶' }), '--html', out]);
    assert.equal(r.env.delivery.mode, 'file');
    assert.equal(r.env.delivery.path, resolve(out), '回执指逐字路径（绝对）');
    assert.ok(existsSync(out), '逐字路径真有文件');
    assert.match(readFileSync(out, 'utf8'), /<section data-skill="home"/, '显式产物＝分节页');
    assert.equal(r.env.delivery.bytes, statSync(out).size);
    assert.equal(listOf(htmlDirOf(dir)).length, before, '显式优先：缺省目录不另落一份');
  });

  test('⑤ 退出码矩阵：正例 0／参数 2／未知键 3／落盘失败 5，失败时 stdout 空', () => {
    const dir = mkDir('codes');
    seed(dir);
    assert.equal(runOk(dir, ['home.item.search', '--params', P({ name: '牛奶' })]).status, 0);
    const bad = [
      { args: ['home.item.search', '--params', '[]'], code: 2, why: '--params 非对象' },
      { args: ['home.item.add', '--params', P({ name: '', category_id: 1, location: '客厅/桌' })], code: 2, why: '写侧缺参' },
    ];
    for (const c of bad) {
      const r = run(dir, c.args);
      assert.equal(r.status, c.code, c.why + ' ⇒ exit ' + c.code + '（stderr：' + r.stderr + '）');
      assert.equal(r.stdout, '', c.why + '：失败时 stdout 必须空');
      assert.match(r.stderr, new RegExp('ERR ' + c.code));
    }
    const k = run(dir, ['home.nope']);
    assert.equal(k.status, 3, '未知键 ⇒ exit 3');
    assert.equal(k.stdout, '', '未知键 stdout 空');
  });

  test('⑤b 写失败（落点被同名文件占位）⇒ exit 5 且 stdout 空', () => {
    const dir = mkDir('blocked');
    mkdirSync(dataDirOf(dir), { recursive: true });
    writeFileSync(join(dataDirOf(dir), HTML_DIR), 'x'); // 落点子目录被同名文件占位
    const r = run(dir, ['home.stats.overview']);
    assert.equal(r.status, 5, '落盘真失败 ⇒ exit 5（stderr：' + r.stderr + '）');
    assert.equal(r.stdout, '', '失败时 stdout 空：不把失败伪装成成功');
    assert.match(r.stderr, /ERR 5/);
    assert.equal(readFileSync(join(dataDirOf(dir), HTML_DIR), 'utf8'), 'x', '占位文件原样未动');
  });

  test('⑥ 冻结回归：q 支无 delivery；config／health 键不落 HTML', () => {
    const dir = mkDir('frozen');
    seed(dir);
    const q = runOk(dir, ['home.help.lookup', '--params', P({ q: '查物品' })]);
    assert.equal(q.env.delivery, undefined, 'q 支＝现找，不落盘（#183 冻结）');
    for (const key of ['home.config.read', 'home.config.check']) {
      const r = runOk(dir, [key]);
      assert.equal(r.env.delivery, undefined, key + ' 不追 delivery（无 envelope 的早期支）');
    }
  });
});

describe('#801 命名对账（附录 70 行，防与票 2 契约走散）', () => {
  const appendix = JSON.parse(readFileSync(
    join(HERE, '..', '..', '..', 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json'), 'utf8'));
  test('69 行逐字：resolveSceneStem(key, preset) ＝ `<命令中文名>_<场景 id>`', () => {
    let n = 0;
    for (const s of appendix.scenarios) {
      if (s.id === 'SM2-3') continue; // 偏离行见下一条（运行时 storage 走位置总览，不走收纳建议）
      assert.equal(resolveSceneStem(s.key, s.preset ?? {}), s.commandCn + '_' + s.id, '附录走散：' + s.id);
      n++;
    }
    assert.equal(n, 69, '附录 70 行 − 偏离 1 行 ＝ 69');
  });
  test('偏离行显式锁定：storage 行为是位置总览，宿主 SM2-1（已向票 2 登记补丁）', () => {
    assert.equal(resolveSceneStem('home.location.query', { mode: 'storage' }), '管位置_SM2-1');
    assert.equal(resolveSceneStem('home.location.query', { mode: 'suggest', category_id: 1 }), '收纳建议_SM2-3');
  });
});
