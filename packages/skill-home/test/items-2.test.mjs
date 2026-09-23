// 票 #807 · 物品管理域（二）更新与标签分类 11 产物测试。
//
// 本票 6 个页族（receipt／confirm／undo_select／relations／tag_manage／
// category_manage）＋ 改物品（3-1）借用 #806 的 add_form 页族，各跑真命令链
// （spawn 真 `home-cmd-read`，隔离家目录，不碰生产库），逐场景装配真页面后
// 落 `.scratch/807/`，再跑墙自检与三件判据。add_form 只读调用，不改 #806 的文件。
//
// 跑法（仓根，经排队，一件事一持锁）：
//   node tooling/run-locked.mjs --ticket 807 --max-wait-ms 600000 -- node --test packages/skill-home/test/items-2.test.mjs
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`
// （页模块经 `dist/<域>/pages/<族>.js` 进入本用例）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const repoRoot = join(pkgDir, '..', '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const outDir = join(repoRoot, '.scratch', '807');
const STAMP = '20260921T120000';
const wallMobile = '物品管理-2-手机墙.html';
const wallDesktop = '物品管理-2-桌面墙.html';

let HOME = '';
const homeEnv = () => ({ ...process.env, USERPROFILE: HOME, HOME });
function run(key, params) {
  return spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params || {})], { encoding: 'utf8', env: homeEnv() });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 400));
  return JSON.parse(r.stdout.trim().split('\n').pop());
}
function spawnOk(cmd, args, label) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: repoRoot });
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' OUT=' + ((r.stdout || '') + (r.stderr || '')).slice(-800));
  return (r.stdout || '') + (r.stderr || '');
}

// 场景表（11 条全覆盖；改物品（3-1）的页族 add_form 归 #806，本测试只读调用）。
// 场景的唯一句柄＝命令中文名 `commandCn`（附录 70 条两两不重）；场景 id 只住事实源与机器附录。
const SCENES = [
  { wake: '改物品', title: '修改物品信息', key: 'home.item.update', preset: {}, family: 'add_form', commandCn: '改物品', prompt: '请加载「居家管家」技能，帮我修改物品信息（唤醒词：改物品）', check: '表单字段与改物品分流是否在位' },
  { wake: '移物品', title: '移动物品位置', key: 'home.item.update', preset: { op: 'move' }, family: 'receipt', commandCn: '移物品', prompt: '请加载「居家管家」技能，帮我移动物品位置（唤醒词：移物品）', check: '原位置与新位置是否都写明，分段位置是否清晰' },
  { wake: '数量变更', title: '变更物品数量', key: 'home.item.update', preset: { op: 'qty' }, family: 'receipt', commandCn: '数量变更', prompt: '请加载「居家管家」技能，帮我变更物品数量（唤醒词：数量变更）', check: '数量变更前后与补货提示是否在位' },
  { wake: '状态变更', title: '变更物品状态', key: 'home.item.update', preset: { op: 'status' }, family: 'receipt', commandCn: '状态变更', prompt: '请加载「居家管家」技能，帮我变更物品状态（唤醒词：状态变更）', check: '状态流转前后与软删除说明是否在位' },
  { wake: '合并物品', title: '合并重复物品', key: 'home.item.update', preset: { op: 'merge' }, family: 'confirm', commandCn: '合并物品', prompt: '请加载「居家管家」技能，帮我合并重复物品（唤醒词：合并物品）', check: '变更前、变更后、影响说明三段是否齐，确认是否为留档式' },
  { wake: '撤销操作', title: '撤销最近操作', key: 'home.item.update', preset: { op: 'undo' }, family: 'undo_select', commandCn: '撤销操作', prompt: '请加载「居家管家」技能，帮我撤销最近操作（唤醒词：撤销操作）', check: '可撤销条目与勾选交互是否可用，分组指引是否清晰' },
  { wake: '物品关联', title: '设置物品关联', key: 'home.item.update', preset: { op: 'relate' }, family: 'relations', commandCn: '物品关联', prompt: '请加载「居家管家」技能，帮我设置物品关联（唤醒词：物品关联）', check: '主物品与对方编号是否在位，五种关系是否齐' },
  { wake: '标物品', title: '修改物品标签', key: 'home.item.update', preset: { op: 'tags' }, family: 'receipt', commandCn: '标物品', prompt: '请加载「居家管家」技能，帮我修改物品标签（唤醒词：标物品）', check: '去除与新增两行是否在位' },
  { wake: '管标签', title: '管理标签', key: 'home.tag.write', preset: { op: 'overview' }, family: 'tag_manage', commandCn: '管标签', prompt: '请加载「居家管家」技能，帮我管理标签（唤醒词：管标签）', check: '总数、模式与七个操作按钮是否齐' },
  { wake: '管分类', title: '管理分类', key: 'home.tag.write', preset: { op: 'category' }, family: 'category_manage', commandCn: '管分类', prompt: '请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）', check: '总数、操作提示、拦截说明与种子分类说明是否齐' },
  { wake: '整理建议', title: '标签分类整理建议', key: 'home.tag.write', preset: { op: 'tidy' }, family: 'tag_manage', commandCn: '整理建议', prompt: '请加载「居家管家」技能，帮我做标签分类整理（唤醒词：整理建议）', check: '相近对与合并忽略操作是否逐对在位，公式说明是否在位' },
];

const ENVS = {};
let CID = 0;
let IDA = 0;
let IDB = 0;
let IDC = 0;

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'items2-'));
  mkdirSync(outDir, { recursive: true });
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  CID = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '域二甲', category_id: CID, location: '客厅/储物柜' }, 'seed addA');
  runOk('home.item.add', { name: '域二乙', category_id: CID, location: '卧室/衣柜' }, 'seed addB');
  runOk('home.item.add', { name: '域二丙', category_id: CID, location: '书房/书架' }, 'seed addC');
  const items = runOk('home.item.search', {}, 'seed search').data.items;
  IDA = items.find((x) => x.name === '域二甲').id;
  IDB = items.find((x) => x.name === '域二乙').id;
  IDC = items.find((x) => x.name === '域二丙').id;
  // 相近标签对（整理建议用）：首字相同且长度差一。
  runOk('home.item.update', { id: IDA, op: 'tags', tags: '常用,常用品' }, 'seed tags');
  // 11 条真链（顺序保证依赖：改物品先行；关联先于撤销，整理先于改标签，合并最后删条目）。
  ENVS['改物品'] = runOk('home.item.update', { id: IDA, remark: '域二复核备注' }, '真链 改物品');
  ENVS['移物品'] = runOk('home.item.update', { id: IDA, op: 'move', new_location: '阳台/收纳柜' }, '真链 移物品');
  ENVS['数量变更'] = runOk('home.item.update', { id: IDA, op: 'qty', plus: 2 }, '真链 数量变更');
  ENVS['状态变更'] = runOk('home.item.update', { id: IDA, op: 'status', status: '备用' }, '真链 状态变更');
  ENVS['物品关联'] = runOk('home.item.update', { id: IDA, op: 'relate', related: IDB }, '真链 物品关联');
  ENVS['撤销操作'] = runOk('home.item.update', { id: IDA, op: 'undo' }, '真链 撤销操作');
  ENVS['整理建议'] = runOk('home.tag.write', { op: 'tidy' }, '真链 整理建议');
  ENVS['管标签'] = runOk('home.tag.write', { op: 'overview' }, '真链 管标签');
  ENVS['管分类'] = runOk('home.tag.write', { op: 'category' }, '真链 管分类');
  ENVS['标物品'] = runOk('home.item.update', { id: IDA, op: 'tags', tags: '常用,出差' }, '真链 标物品');
  ENVS['合并物品'] = runOk('home.item.update', { id: IDA, op: 'merge', target: IDA, sources: String(IDC) }, '真链 合并物品');
  for (const s of SCENES) assert.equal(ENVS[s.commandCn].key, s.key, '回执命令 ' + s.commandCn);
});

describe('#807 两层解析现场复核（契约 L1：同一预设只到一族）', () => {
  for (const s of SCENES) {
    it(s.commandCn + ' ' + s.key + ' → ' + s.family, async () => {
      const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
      assert.equal(resolvePageFamily(s.key, s.preset), s.family);
    });
  }
});

describe('#807 真链装配＋产物落盘（11 份）', () => {
  for (const s of SCENES) {
    it(s.commandCn + '（' + s.family + '）', async () => {
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'items', 'pages', s.family + '.js')).href);
      assert.equal(page.FAMILY, s.family);
      const html = page.renderFamilyPage(ENVS[s.commandCn]);
      for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
        assert.ok(!html.includes(m), '标记未填充：' + m);
      }
      assert.ok(html.includes('<!DOCTYPE html>') && html.includes('class="page"'));
      const file = s.commandCn + '_' + STAMP + '.html';
      writeFileSync(join(outDir, file), html, 'utf8');
      assert.ok(existsSync(join(outDir, file)));
    });
  }

  it('写清单 manifest.json（11 行）', () => {
    const rows = SCENES.map((s, i) => ({
      seq: i + 1, wake: s.wake, file: s.commandCn + '_' + STAMP + '.html',
      domain: 'items', family: s.family, title: s.title, prompt: s.prompt,
      command: s.key, check: s.check,
    }));
    const manifest = {
      batch: '物品管理（二）', madeAt: '2026-09-21',
      naming: '文件名只从本清单 file 字段读；生成器不算名、不裁规则',
      notShipped: [],
      readings: { 产物: '11 份真链装配页（改物品 到 整理建议 全覆盖）' },
      rows,
    };
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
    const back = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(back.rows.length, 11);
  });
});

describe('#807 墙与判据（生成器＋三件机审）', () => {
  it('双端墙生成（手机 390＋桌面 1280）', () => {
    spawnOk(process.execPath, [join(repoRoot, 'docs', 'skills', 'skill-home', 'gen-scene-wall.mjs'), outDir, wallMobile, '390', '820'], '手机墙');
    spawnOk(process.execPath, [join(repoRoot, 'docs', 'skills', 'skill-home', 'gen-scene-wall.mjs'), outDir, wallDesktop, '1280', '860'], '桌面墙');
    assert.ok(existsSync(join(outDir, wallMobile)));
    assert.ok(existsSync(join(outDir, wallDesktop)));
  });

  it('墙自检双墙 exit 0', () => {
    const gen = join(repoRoot, 'docs', 'skills', 'skill-home', 'gen-scene-wall.mjs');
    spawnOk(process.execPath, [gen, '--check', outDir, wallMobile], '自检手机墙');
    spawnOk(process.execPath, [gen, '--check', outDir, wallDesktop], '自检桌面墙');
  });

  it('分隔符机审 0 命中 exit 0', () => {
    const files = SCENES.map((s) => join(outDir, s.commandCn + '_' + STAMP + '.html'));
    spawnOk(process.execPath, [join(pkgDir, 'scripts', 'audit-separators.mjs'), ...files], '分隔符');
  });

  it('结构块机审 exit 0（scope＝11 份产物，墙是生成器产物走墙自检）', () => {
    const staging = mkdtempSync(join(tmpdir(), 'items2-blocks-'));
    for (const s of SCENES) {
      const f = s.commandCn + '_' + STAMP + '.html';
      writeFileSync(join(staging, f), readFileSync(join(outDir, f), 'utf8'), 'utf8');
    }
    spawnOk(process.execPath, [join(pkgDir, 'scripts', 'audit-page-blocks.mjs'), '--dir', staging, '--blocks', join(pkgDir, 'scripts', 'page-blocks.json')], '结构块');
  });
});
