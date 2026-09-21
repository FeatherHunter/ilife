#!/usr/bin/env node
/** t776 小域合并运行器：8 卡逐卡一行读数（验收正例）＋ 成环反例 ＋ 册子片段 ＋ --check 判据。
 *
 * 用法：
 *   node tooling/run-locked.mjs --ticket 776 -- node docs/skills/skill-chef/t776-run-small-domains.mjs
 *     → 打印 8 行 `卡 → exit=0 → 产物绝对路径`（备份卡另打印字节数），全绿 exit 0
 *   node .../t776-run-small-domains.mjs --check
 *     → 打印「片段行数＝本票卡数」与「vision 审查缺陷 0（或逐条已改）」，缺一即红
 *
 * 数据一律走票 17 沙箱器械（本脚本起手即刷新 `.scratch/t776/`  pristine 副本，不碰真库，
 * 不与其他票共用副本）。产物目录：`.scratch/t776/`（HTML 8 页＋备份 JSON＋册子片段＋视察记录）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const TICKET = '776';
const OUT = join(ROOT, '.scratch', 't776');
const HOME = join(OUT, 'home');
const DIST = join(ROOT, 'packages', 'skill-chef', 'dist');
const CLI = join(DIST, 'cli', 'cmd_read.js');
const FRAG = join(ROOT, 'docs', 'skills', 'skill-chef', 't776-册子片段.json');
const VISION = join(OUT, 'vision.json');
const CHECK = process.argv.includes('--check');

const D = (p) => pathToFileURL(join(DIST, p)).href;

/** 起手刷新沙箱（pristine 副本＋隔离家目录），保证幂等可重跑。 */
function refreshSandbox() {
  const r = spawnSync(process.execPath, [join(ROOT, 'docs', 'skills', 'skill-chef', 't840-沙箱.mjs'), '--ticket', TICKET], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('沙箱刷新失败'); process.exit(2); }
}

/** 经家目录注入跑一条 dist 命令，返回 {status, out, err}。 */
function cmd(key, params) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, {
    env: { ...process.env, USERPROFILE: HOME, HOME },
    encoding: 'utf8',
  });
  let out = null;
  try { out = r.stdout && r.stdout.trim() ? JSON.parse(r.stdout.trim().split('\n').pop()) : null; } catch { out = null; }
  return { status: r.status ?? 1, out, err: (r.stderr ?? '').trim() };
}

function sha256(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

function writeHtml(name, html) {
  const p = join(OUT, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, html, 'utf8');
  return p;
}

async function main() {
  if (CHECK) return check();
  refreshSandbox();
  mkdirSync(OUT, { recursive: true });
  const { relationAddPage, relationDerivePage, relationTreePage } = await import(D('relation/pages.js'));
  const { shoppingListPage } = await import(D('shopping/pages.js'));
  const { setupInitPage } = await import(D('setup/pages.js'));
  const { dataBackupPage, dataBatchPage, dataQualityPage } = await import(D('data/pages.js'));
  const { openChefDb } = await import(D('fetch/db.js'));
  const rows = [];
  const line = (card, exit, prod, extra = '') => {
    const s = card + ' → exit=' + exit + ' → ' + prod + (extra ? '（' + extra + '）' : '');
    console.log(s);
    return s;
  };

  // 1 派生·添加：先备一个可被指的菜（fixture，不计 8 卡）。
  let r = cmd('chef.recipe.write', { op: 'add', name: '派生备菜' });
  if (r.status !== 0) { console.error('fixture 建备菜失败：' + r.err); process.exit(1); }
  r = cmd('chef.relation.write', { op: 'add', parent: '辣椒炒肉', child: '派生备菜', relation_type: '派生', change_summary: '备菜关系' });
  if (r.status !== 0) { console.error('添加派生关系失败：' + r.err); process.exit(1); }
  {
    const p = writeHtml('add_relation.html', relationAddPage({ parent: '辣椒炒肉', child: '派生备菜', relationType: '派生', changeSummary: '备菜关系' }));
    rows.push({ card: 'add_relation', wake: '添加派生关系', key: 'chef.relation.write', params: { op: 'add' }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('添加派生关系', 0, p);
  }

  // 2 派生·从已有派生新菜（先派生再看树，树页一次看全）。
  r = cmd('chef.relation.write', { op: 'derive', source: '辣椒炒肉', target: '派生新菜', differences: '换主料并减辣' });
  if (r.status !== 0) { console.error('派生新菜失败：' + r.err); process.exit(1); }
  {
    const p = writeHtml('derive_from_existing.html', relationDerivePage({ parent: '辣椒炒肉', child: '派生新菜', differences: '换主料并减辣' }));
    rows.push({ card: 'derive_from_existing', wake: '从已有派生新菜', key: 'chef.relation.write', params: { op: 'derive' }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('从已有派生新菜', 0, p);
  }

  // 3 派生·家族树（此时已有两组关系，走有数页；空态另由单测覆盖，见证据件）。
  r = cmd('chef.relation.query', { name: '辣椒炒肉' });
  if (r.status !== 0) { console.error('家族树失败：' + r.err); process.exit(1); }
  {
    const items = r.out.data.items.filter((x) => x.section !== '当前');
    const ancestors = items.filter((x) => x.section === '祖先');
    const descendants = items.filter((x) => x.section === '后代');
    const p = writeHtml('view_relation_tree.html', relationTreePage({ root: '辣椒炒肉', ancestors, descendants }));
    rows.push({ card: 'view_relation_tree', wake: '查看派生关系', key: 'chef.relation.query', params: { name: '辣椒炒肉' }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('查看派生关系', 0, p);
  }

  // 4 采购·生成清单（多菜合并＋份数换算＋排除可选走默认不排除，库存走调用契约降级提示）。
  r = cmd('chef.shopping.query', { names: ['辣椒炒肉'], servings: 2 });
  if (r.status !== 0) { console.error('生成清单失败：' + r.err); process.exit(1); }
  {
    const { buildShoppingList } = await import(D('shopping/run.js'));
    const h = openChefDb(join(OUT, 'chef_data.db'));
    const items = buildShoppingList(h, ['辣椒炒肉'], 2);
    h.db.close();
    const p = writeHtml('shopping_generate.html', shoppingListPage({ recipes: ['辣椒炒肉'], items, servingsText: '两倍份量', excludeOptional: false, stockSkipped: false }));
    rows.push({ card: 'shopping_generate', wake: '生成清单', key: 'chef.shopping.query', params: { names: ['辣椒炒肉'], servings: 2 }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('生成清单', 0, p);
  }

  // 5 开始使用·首次使用。
  r = cmd('chef.setup.init', {});
  if (r.status !== 0) { console.error('首次使用失败：' + r.err); process.exit(1); }
  {
    const h = openChefDb(join(OUT, 'chef_data.db'));
    const c = h.db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get();
    h.db.close();
    const p = writeHtml('first_use.html', setupInitPage({ tables: Number(c.c ?? 0), initialized: false }));
    rows.push({ card: 'first_use', wake: '首次使用', key: 'chef.setup.init', params: {}, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('首次使用', 0, p);
  }

  // 6 数据管理·体检（完整度口径）。
  r = cmd('chef.history.query', { kind: 'quality' });
  if (r.status !== 0) { console.error('体检失败：' + r.err); process.exit(1); }
  {
    const p = writeHtml('data_quality_report.html', dataQualityPage({ items: r.out.data.items }));
    rows.push({ card: 'data_quality_report', wake: '体检', key: 'chef.history.query', params: { kind: 'quality' }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('数据质量报告', 0, p);
  }

  // 7 数据管理·批量改（改前对比＋回执：螺丝椒 250 改 300）。
  {
    const h = openChefDb(join(OUT, 'chef_data.db'));
    const before = h.db.prepare('SELECT quantity FROM ingredients WHERE recipe_id = (SELECT id FROM recipes WHERE name = ?) AND name = ?').get('辣椒炒肉', '螺丝椒');
    h.db.close();
    r = cmd('chef.data.batch', { name: '辣椒炒肉', ingredients: [{ name: '螺丝椒', quantity: 300 }] });
    if (r.status !== 0) { console.error('批量改失败：' + r.err); process.exit(1); }
    const p = writeHtml('data_batch_edit.html', dataBatchPage({ name: '辣椒炒肉', diffs: [{ field: '食材「螺丝椒」用量', before: String(before?.quantity ?? ''), after: '300' }] }));
    rows.push({ card: 'data_batch_edit', wake: '批量改', key: 'chef.data.batch', params: { name: '辣椒炒肉' }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p) });
    line('批量改', 0, p);
  }

  // 8 数据管理·备份（真出文件，落点与命名在本票定：票沙箱下固定名 JSON；回执页进册子）。
  {
    const dest = join(OUT, 'backup.json');
    r = cmd('chef.history.query', { kind: 'backup', dest });
    if (r.status !== 0) { console.error('备份失败：' + r.err); process.exit(1); }
    const bytes = statSync(dest).size;
    const info = r.out.data.items[0];
    const p = writeHtml('data_export_backup.html', dataBackupPage({ recipeCount: info.recipe_count, tableCount: info.table_count, bytes }));
    rows.push({ card: 'data_export_backup', wake: '备份', key: 'chef.history.query', params: { kind: 'backup' }, path: p, exit: 0, bytes: statSync(p).size, sha256: sha256(p), backupFile: dest, backupBytes: bytes });
    line('备份', 0, p, '备份文件字节数=' + bytes);
  }

  // 反例（必跑）：成环的关系对 → 家族树必须报环并 exit≠0（不许画自环图）。
  {
    const c1 = cmd('chef.relation.write', { op: 'add', parent: '派生备菜', child: '辣椒炒肉', relation_type: '变体', change_summary: '反向成环' });
    if (c1.status !== 0) { console.error('反例建环失败（应成功）：' + c1.err); process.exit(1); }
    const c2 = cmd('chef.relation.query', { name: '辣椒炒肉' });
    if (c2.status === 0) { console.error('反例未变红：成环后家族树仍 exit 0（应拒绝出图）'); process.exit(1); }
    console.log('反例成环 → 家族树报环 exit=' + c2.status + '（符合预期，已拒绝出图）');
  }

  // 册子片段（供收口票合并，不直接改共用册子）。
  mkdirSync(dirname(FRAG), { recursive: true });
  writeFileSync(FRAG, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log('片段已登记：' + FRAG + '（' + rows.length + ' 行）');
  // 视察占位：vision.json 由过程性 vision 审查落盘（缺陷当场改），--check 认它。
  if (!existsSync(VISION)) {
    writeFileSync(VISION, JSON.stringify({ defects: -1, note: '待过程性 vision 审查（须当场改完再置 0）' }, null, 2) + '\n', 'utf8');
  }
  console.log('8 卡全绿（fixture 1 个不计卡，反例已红即绿）。');
}

function check() {
  if (!existsSync(FRAG)) { console.error('片段缺失：先跑不带 --check 的正例'); process.exit(1); }
  const rows = JSON.parse(readFileSync(FRAG, 'utf8'));
  console.log('片段行数＝' + rows.length + '（本票卡数＝8）');
  if (rows.length !== 8) { console.error('片段行数 ≠ 本票卡数'); process.exit(1); }
  for (const r of rows) {
    if (!existsSync(r.path)) { console.error('产物缺失：' + r.path); process.exit(1); }
  }
  if (!existsSync(VISION)) { console.error('vision 审查未做：' + VISION + ' 缺失'); process.exit(1); }
  const v = JSON.parse(readFileSync(VISION, 'utf8'));
  console.log('vision 审查缺陷 ' + v.defects + (v.fixed ? '（逐条已改：' + v.fixed + '）' : ''));
  if (v.defects !== 0) { console.error('vision 缺陷未清零（须当场改完）'); process.exit(1); }
  console.log('CHECK 全绿：片段行数＝卡数，vision 缺陷 0。');
}

await main();
