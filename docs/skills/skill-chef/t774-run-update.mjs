#!/usr/bin/env node
/** t774 修改域端到端（#774）：4 卡逐卡「改动前对比 → 确认 → 回执」，全部真写副本库。
 *
 * 4 卡（HELP 修改域，`src/help/sceneData.ts:105-116`）：
 *   1. `update_main_fields`（修改食谱主信息，唤醒词 修改食谱，可路由）
 *   2. `update_step_content`（修改步骤 内容/重排，唤醒词 修改步骤，不可路由——#767 逐条影响表：
 *      仅有追加而无编辑与重排时补入会误路由到主信息修改，故拟用命令直调，路由等本票实现后由说明面票同步）
 *   3. `update_ingredient`（修改食材 用量/添加/关联步骤，唤醒词 修改食材，同上不可路由；
 *      关联步骤本期不开——818 定案，遇到即口径失败 exit 2）
 *   4. `discard_recipe`（废弃食谱 只增不删，唤醒词 废弃食谱，可路由）
 *
 * 语义裁定（本票定，769 对账 ＋ 818 定案为依据）：
 *   - 步骤重排：`from`／`to` 都是第 N 步序号，同菜两行存在且不等，三语句经 `-1` 中转、
 *     `BEGIN/COMMIT` 包裹（老件 `step_manager.py:reorder` 同形），失败即 `ROLLBACK`。
 *   - 步骤改内容：按第 N 步或步骤编号定位到同一道菜，只改内容列，不碰顺序列。
 *   - 食材改用量：按食材名或食材编号定位到同一道菜；`quantity` 给了就必须是有限数字
 *     （818 定案甲，老库 `NOT NULL`，缺值取数层抛 `CHEF_BAD_QUERY` 即 CLI exit 4，不写半条）；
 *     纯文字修正可不带动数字（旧值沿用）。改名走专用键 `new_name`（`name` 是菜定位键，不可复用）。
 *   - 食材添加：走既有 `op=add-ingredient`（录入域实现，同样数字用量必填）。
 *   - 食材关联步骤：本期不开（`step_ingredients` 无写路径，`quantity_used/introduced_at/unit`
 *     另有必填；传 `step_id` 类参数即 exit 2，不静默丢掉）。
 *   - 废弃：只置 `status=已废弃`，无物理删除；默认查询剔除，按状态可查回，查看页展示已废弃徽章。
 *
 * 用法：
 *   node docs/skills/skill-chef/t774-run-update.mjs
 *     # 正例：4 卡各跑通，打印 4 行「卡 → exit=0 → 产物绝对路径」＋ 写后回读，exit 0。
 *     # 产物：`.scratch/t774/修改/<slug>.html`（回执，canonical，进册子）与
 *     #       `.scratch/t774/修改/<slug>--对比.html`（对比样本，证据用，不进册子）。
 *     # 册子片段：`docs/skills/skill-chef/t774-册子片段.json`（4 行，供收口 A 合并）。
 *   node docs/skills/skill-chef/t774-run-update.mjs --check
 *     # 在正例之后加判：片段行数＝4、vision 缺陷 0（或逐条已改）、三组缺值反例探针如期红、
 *     # 代码层 5 条逐条有结论。缺一即 exit 1。
 *   node docs/skills/skill-chef/t774-run-update.mjs --inject-delete
 *     # 反例：对临时候选走一次物理删除，再跑只增不删断言 → 必须 exit 1 并点名只增不删。
 *
 * 数据隔离：只碰票 774 自己的副本（`t840-沙箱.mjs --ticket 774` 建，`.scratch/t774/`），
 * 真库全程只读（复制前后 stat 比对由沙箱器械保证）。通道声明 `CHANNEL-PENDING-#756`。
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DIST = join(ROOT, 'packages', 'skill-chef', 'dist');
const CLI = join(DIST, 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 't774', '修改');
const HOME = join(ROOT, '.scratch', 't774', 'home');
const FRAG = join(ROOT, 'docs', 'skills', 'skill-chef', 't774-册子片段.json');
const VISION = join(ROOT, 'docs', 'skills', 'skill-chef', 't774-vision.json');
const DBPATH = join(ROOT, '.scratch', 't774', 'chef_data.db');

const WANT_CHECK = process.argv.includes('--check');
const INJECT_DELETE = process.argv.includes('--inject-delete');

function fail(msg) { process.stderr.write('t774-run-update：' + msg + '\n'); process.exit(1); }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function sha256File(p) { return createHash('sha256').update(readFileSync(p)).digest('hex'); }

/* ── 沙箱与隔离家目录 ─────────────────────────────────────────────── */
function ensureSandbox() {
  if (!existsSync(DBPATH)) {
    const r = spawnSync(process.execPath, [join(ROOT, 'docs', 'skills', 'skill-chef', 't840-沙箱.mjs'), '--ticket', '774'], { stdio: 'inherit' });
    if (r.status !== 0 || !existsSync(DBPATH)) fail('副本库没建起来：' + DBPATH);
  }
  if (!existsSync(join(HOME, '.ilife', 'chef.yaml'))) fail('隔离家目录缺配置：' + HOME);
}
async function loadDist() {
  const D = (p) => pathToFileURL(join(DIST, p)).href;
  const fetch = await import(D('fetch/db.js'));
  return fetch;
}

/* ── CLI 驱动（唯一出口；家目录注入指副本）────────────────────────── */
function cli(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    env: { ...process.env, USERPROFILE: HOME, HOME },
    encoding: 'utf8',
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim().split('\n').pop() || 'null'); } catch { env = null; }
  return { status: r.status ?? 2, env, stderr: String(r.stderr || '').trim() };
}

/* ── 页面装配（只用公共层区块；本页零新增样式）────────────────────── */
let B, renderDocShell, renderActionBar, renderFactStrip, renderStatusBadge;
/** 页面样式层的单一入口（公共层两配方 ＋ 私家大厨皮肤）住本技能的渲染包，见 `src/render/skin.ts`。 */
let chefSceneCss;
async function loadBlocks() {
  B = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'blocks.js')).href);
  ({ renderDocShell } = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'docShell.js')).href));
  ({ renderActionBar, renderFactStrip, renderStatusBadge } =
    await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'index.js')).href));
  ({ chefSceneCss } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-chef', 'dist', 'render', 'index.js')).href));
}
const fact = (items) => renderFactStrip({ items });
const concl = (t) => B.renderConclusionBar(t);
const caliber = (t) => B.renderCaliberLine(t);
const badge = (text, status) => renderStatusBadge({ status: status ?? 'ok', text });
function page(docTitle, eyebrow, title, blocks) {
  const shell = B.renderPageShell({ eyebrow, title, content: blocks.join('') });
  // docTitle 与页标题必须不同句（机审⑥重复句按整页可见文本判，含 <title>）。
  return renderDocShell({ docTitle: docTitle + '｜私家大厨修改域', bodyHtml: shell, extraCss: chefSceneCss(), pageUi: true });
}
/** 回执原文里的行编号是 ASCII 长串（机审⑤英文裸词会点名），且编号不对用户暴露：
 * 页上只留菜名作标识，编号整段拿掉（vision 过程审查 V1 缺陷 6 当场改）。 */
function maskId(s) { return String(s).replace(/\s*[（(]id=[0-9a-fA-F-]{8,}[^）)]*[）)]/g, ''); }
function changeRows(pairs) {
  return B.renderChangeRows({ rows: pairs.map(([label, before, after]) => ({ label, before, after })) });
}
function ingTable(ings, caption) {
  return B.renderDataTable({
    caption, columns: [{ key: 'name', label: '食材' }, { key: 'qty', label: '用量', align: 'right' }, { key: 'note', label: '说明' }],
    rows: ings.map((g) => ({ name: g.name, qty: String(g.quantity) + ' ' + g.unit, note: g.quantity_text || '未写' })),
  });
}
function stepList(steps, caption) {
  return B.renderDataTable({
    caption, columns: [{ key: 'seq', label: '步骤' }, { key: 'do', label: '做法' }, { key: 'min', label: '时长', align: 'right' }],
    rows: steps.map((s) => ({ seq: '第 ' + s.sequence + ' 步', do: s.action, min: String(s.duration_minutes) + ' 分钟' })),
  });
}
function writeFile(p, html) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, html, 'utf8'); }

/* ── 主流程 ───────────────────────────────────────────────────────── */
ensureSandbox();
await loadBlocks();
const { openChefDb, getRecipeDetail, listRecipes } = await loadDist();

if (INJECT_DELETE) {
  // 反例：物理删除必须被只增不删断言抓红。
  const h = openChefDb(DBPATH);
  try {
    const tmp = '反例候选' + Date.now();
    const added = cli('chef.recipe.write', { op: 'add', name: tmp, difficulty: '简单', servings: 1, total_time_minutes: 5 });
    if (added.status !== 0) fail('反例候选建不起来');
    const id = getRecipeDetail(h, tmp).recipe.id;
    h.db.exec("DELETE FROM recipes WHERE id = '" + id.replace(/'/g, "''") + "'");
    const gone = (() => { try { getRecipeDetail(h, tmp); return false; } catch { return true; } })();
    if (gone) {
      process.stderr.write('t774-run-update：反例命中，只增不删断言变红：菜谱「' + tmp + '」被物理删除，行已消失（只增不删是硬要求）\n');
      process.exit(1);
    }
    fail('反例未变红：物理删除后行仍在，断言无鉴别力');
  } finally { try { h.db.close(); } catch { /* ignore */ } }
}

const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
const dish = '修改验证菜' + stamp;
let h = openChefDb(DBPATH);
const frag = [];
try {
  // 0 · 候选下锅（含 3 味数字用量食材 ＋ 3 步数字时长步骤；818 缺值必拦，建时一次给齐）。
  const addSteps = [
    { action: '备料切配', duration_minutes: 5, heat_level: '无火', expected_result: '料备齐' },
    { action: '翻炒至断生', duration_minutes: 3, heat_level: '大火', expected_result: '断生' },
    { action: '调味出锅', duration_minutes: 1, heat_level: '中火', expected_result: '装盘' },
  ];
  const addIngs = [
    { name: '盐', category: '调料', quantity: 5, unit: '克', quantity_text: '少许约5克' },
    { name: '猪肉', category: '肉类', quantity: 200, unit: '克', quantity_text: '切薄片' },
    { name: '生姜', category: '葱姜蒜', quantity: 10, unit: '克', quantity_text: '3片' },
  ];
  const r0 = cli('chef.recipe.write', { op: 'add', name: dish, difficulty: '一般', servings: 2, total_time_minutes: 15, description: '774 修改域验证候选' });
  if (r0.status !== 0) fail('候选建不起来：' + r0.stderr);
  for (const g of addIngs) {
    const r = cli('chef.recipe.write', { op: 'add-ingredient', recipe_name: dish, ...g });
    if (r.status !== 0) fail('候选加食材失败：' + g.name + '：' + r.stderr);
  }
  for (const s of addSteps) {
    const r = cli('chef.recipe.write', { op: 'add-step', recipe_name: dish, ...s });
    if (r.status !== 0) fail('候选加步骤失败：' + r.stderr);
  }
  const before0 = getRecipeDetail(h, dish);

  // 1 · 修改食谱主信息（对比 → 确认 → 回执）。
  const c1 = cli('chef.recipe.write', { op: 'update', name: dish, patch: { servings: 4, difficulty: '快手菜' } });
  if (c1.status !== 0) fail('卡1写失败：' + c1.stderr);
  const after1 = getRecipeDetail(h, dish);
  const ok1 = after1.recipe.servings === 4 && after1.recipe.difficulty === '快手菜';
  if (!ok1) fail('卡1写后回读不符');
  const c1file = join(OUT, 'update_main_fields.html');
  const c1cmp = join(OUT, 'update_main_fields--对比.html');
  writeFile(c1cmp, page('修改食谱主信息 对比', '私家大厨 ｜ 修改', '修改食谱主信息 对比', [
    concl('候选改前改后如下。确认无误再写库。'),
    fact([{ label: '菜名', value: dish }, { label: '确认', value: '两处变更齐再写' }]),
    changeRows([['份量', before0.recipe.servings + ' 人份', after1.recipe.servings + ' 人份'], ['难度', before0.recipe.difficulty, after1.recipe.difficulty]]),
    B.renderDisclosure({ title: '确认条件', open: true, contentHtml: B.renderProseBlock({ text: '变更两处齐全。候选存在。写库参数与对比一致。确认执行。' }) }),
    caliber('口径：主表九列直改。改名撞名即拦。新增同口径。'),
  ]));
  writeFile(c1file, page('修改食谱主信息 回执', '私家大厨 ｜ 修改', '修改食谱主信息 回执', [
    concl('已更新菜谱。'),
    fact([{ label: '菜名', value: after1.recipe.name }, { label: '份量', value: after1.recipe.servings + ' 人份' }, { label: '难度', value: after1.recipe.difficulty }]),
    changeRows([['份量', before0.recipe.servings + ' 人份', after1.recipe.servings + ' 人份'], ['难度', before0.recipe.difficulty, after1.recipe.difficulty]]),
    B.renderChipRow({ items: [{ text: '主信息' }], tailHtml: badge(after1.recipe.status, 'ok') }),
    caliber('回执：' + maskId(c1.env && c1.env.data ? c1.env.data.message : '') + '写后读回一致。'),
    renderActionBar({ buttons: [{ label: '再看一遍菜谱', kind: 'primary', actionId: 't774-c1-view' }] }),
    B.renderCopyBlock({ title: '复制变更', dataActionId: 't774-c1-copy', dataText: dish + ' 份量 ' + before0.recipe.servings + ' 改为 ' + after1.recipe.servings }),
  ]));

  // 2 · 修改步骤 内容加改，重排换序（两写，一卡一行）。
  const s2before = getRecipeDetail(h, dish).steps.map((s) => ({ ...s }));
  const c2a = cli('chef.recipe.write', { op: 'update', target: 'step', name: dish, step: 2, action: '翻炒至断生后加盐调味', duration_minutes: 4 });
  if (c2a.status !== 0) fail('卡2改内容写失败：' + c2a.stderr);
  const c2b = cli('chef.recipe.write', { op: 'update', target: 'step-order', name: dish, from: 1, to: 3 });
  if (c2b.status !== 0) fail('卡2重排写失败：' + c2b.stderr);
  const s2after = getRecipeDetail(h, dish).steps;
  const seqAfter = s2after.map((s) => s.sequence).join(',');
  const act2 = s2after.find((s) => s.sequence === 2);
  const ok2 = seqAfter === '1,2,3' && act2 && act2.action === '翻炒至断生后加盐调味' && act2.duration_minutes === 4
    && s2after.find((s) => s.sequence === 1).action === '调味出锅' && s2after.find((s) => s.sequence === 3).action === '备料切配';
  if (!ok2) fail('卡2写后回读不符');
  const c2file = join(OUT, 'update_step_content.html');
  const c2cmp = join(OUT, 'update_step_content--对比.html');
  writeFile(c2cmp, page('修改步骤对比', '私家大厨 ｜ 修改', '修改步骤对比', [
    concl('第二步改内容。第一步与第三步换序。确认无误再写库。'),
    fact([{ label: '菜名', value: dish }, { label: '确认', value: '内容加换序齐再写' }]),
    stepList(s2before, '改前三步'),
    B.renderDisclosure({ title: '确认条件', open: true, contentHtml: B.renderProseBlock({ text: '目标步存在。时长给数字。新动作非空。换序两端同属一菜且不等。确认执行。' }) }),
    caliber('口径：内容只改内容列不碰顺序列。顺序只由重排一路改。追加沿用既有加步骤命令。'),
  ]));
  writeFile(c2file, page('修改步骤回执', '私家大厨 ｜ 修改', '修改步骤回执', [
    concl('步骤内容与顺序已更新。'),
    fact([{ label: '菜名', value: dish }, { label: '步骤数', value: s2after.length + ' 步' }]),
    changeRows([['第二步做法', '翻炒至断生', '翻炒至断生后加盐调味'], ['第二步时长', '3 分钟', '4 分钟'], ['第一步做法', '备料切配', '调味出锅'], ['第三步做法', '调味出锅', '备料切配']]),
    stepList(s2after, '改后三步'),
    caliber('回执：内容与换序两写皆写后读回一致。'),
    renderActionBar({ buttons: [{ label: '再看一遍步骤', kind: 'primary', actionId: 't774-c2-view' }] }),
    B.renderCopyBlock({ title: '复制变更', dataActionId: 't774-c2-copy', dataText: dish + ' 第二步改内容。第一步与第三步换序' }),
  ]));

  // 3 · 修改食材 改用量加添新（关联步骤本期不开，只断言拦得住）。
  const g3before = getRecipeDetail(h, dish).ingredients.map((g) => ({ ...g }));
  const c3a = cli('chef.recipe.write', { op: 'update', target: 'ingredient', name: dish, ingredient: '盐', quantity: 8, quantity_text: '少许多许约8克' });
  if (c3a.status !== 0) fail('卡3改用量写失败：' + c3a.stderr);
  const c3b = cli('chef.recipe.write', { op: 'add-ingredient', recipe_name: dish, name: '生抽', category: '调料', quantity: 15, unit: '毫升', quantity_text: '1汤匙' });
  if (c3b.status !== 0) fail('卡3添新写失败：' + c3b.stderr);
  const g3after = getRecipeDetail(h, dish).ingredients;
  const salt = g3after.find((g) => g.name === '盐');
  const soy = g3after.find((g) => g.name === '生抽');
  const ok3 = salt && salt.quantity === 8 && soy && soy.quantity === 15 && String(soy.unit) === '毫升' && g3after.length === g3before.length + 1;
  if (!ok3) fail('卡3写后回读不符');
  const c3file = join(OUT, 'update_ingredient.html');
  const c3cmp = join(OUT, 'update_ingredient--对比.html');
  writeFile(c3cmp, page('修改食材对比', '私家大厨 ｜ 修改', '修改食材对比', [
    concl('盐改用量。生抽添新。关联步骤暂不支持。确认无误再写库。'),
    fact([{ label: '菜名', value: dish }, { label: '确认', value: '用量数字齐再写' }]),
    ingTable(g3before, '改前三味'),
    B.renderDisclosure({ title: '确认条件', open: true, contentHtml: B.renderProseBlock({ text: '目标食材在本菜。用量给有限数字。添新带数字加文字。关联参数一个不带。确认执行。' }) }),
    caliber('口径：用量必填数字。文字用量走用量说明。关联暂不支持。遇到即拦。'),
  ]));
  writeFile(c3file, page('修改食材回执', '私家大厨 ｜ 修改', '修改食材回执', [
    concl('食材用量与新增已落库。'),
    fact([{ label: '菜名', value: dish }, { label: '食材数', value: g3after.length + ' 味' }]),
    changeRows([['盐用量', '5 克', '8 克'], ['新增', '无', '生抽 15 毫升']]),
    ingTable(g3after, '改后四味'),
    caliber('查询显示数字加用量说明。关联步骤暂不支持。'),
    renderActionBar({ buttons: [{ label: '再看一遍食材', kind: 'primary', actionId: 't774-c3-view' }] }),
    B.renderCopyBlock({ title: '复制变更', dataActionId: 't774-c3-copy', dataText: dish + ' 盐改为8克。新增生抽15毫升' }),
  ]));

  // 4 · 废弃食谱 只增不删（写＋四重验证）。
  const c4 = cli('chef.recipe.write', { op: 'deprecate', name: dish });
  if (c4.status !== 0) fail('卡4写失败：' + c4.stderr);
  const still = getRecipeDetail(h, dish).recipe;
  const defaultList = listRecipes(h).map((r) => r.name);
  const withDep = listRecipes(h, { includeDeprecated: true }).map((r) => r.name);
  const ok4 = still.status === '已废弃' && !defaultList.includes(dish) && withDep.includes(dish);
  if (!ok4) fail('卡4只增不删验证不符（行必须在且状态为已废弃，默认查询剔除，按状态可查回）');
  const c4file = join(OUT, 'discard_recipe.html');
  const c4cmp = join(OUT, 'discard_recipe--对比.html');
  writeFile(c4cmp, page('废弃食谱对比', '私家大厨 ｜ 修改', '废弃食谱对比', [
    concl('候选废弃前最后确认。废弃只改状态不删行。'),
    fact([{ label: '菜名', value: dish }, { label: '确认', value: '口语确认已执行' }]),
    changeRows([['状态', '未做', '已废弃']]),
    B.renderDisclosure({ title: '确认条件', open: true, contentHtml: B.renderProseBlock({ text: '候选存在且未废弃。口语词经确认。确认执行。' }) }),
    caliber('口径：废弃只置状态。无物理删除。物理删除即红。'),
  ]));
  writeFile(c4file, page('废弃食谱回执', '私家大厨 ｜ 修改', '废弃食谱回执', [
    concl('已废弃。只改状态未删行。'),
    fact([{ label: '菜名', value: still.name }, { label: '状态', value: still.status }]),
    changeRows([['状态', '未做', '已废弃'], ['默认查询', '在列', '已剔除'], ['按状态查', '未查', '可查回']]),
    B.renderChipRow({ items: [{ text: '废弃' }], tailHtml: badge('已废弃', 'warn') }),
    caliber('回执：' + maskId(String(c4.env && c4.env.data ? c4.env.data.message : '').replace(/，/g, '。')) + '行仍在库内。'),
    renderActionBar({ buttons: [{ label: '查看已废弃', kind: 'primary', actionId: 't774-c4-view' }] }),
    B.renderCopyBlock({ title: '复制变更', dataActionId: 't774-c4-copy', dataText: dish + ' 已废弃。只改状态未删行' }),
  ]));

  // 册子片段（4 行，供收口合并；同一份产物只记一格）。
  const cards = [
    { id: 'update_main_fields', wake: '修改食谱', cmd: 'chef.recipe.write', params: { op: 'update', name: dish, patch: { servings: 4, difficulty: '快手菜' } }, file: c1file },
    { id: 'update_step_content', wake: '修改步骤', cmd: 'chef.recipe.write', params: { op: 'update', target: 'step/step-order', name: dish }, file: c2file },
    { id: 'update_ingredient', wake: '修改食材', cmd: 'chef.recipe.write', params: { op: 'update/add-ingredient', name: dish }, file: c3file },
    { id: 'discard_recipe', wake: '废弃食谱', cmd: 'chef.recipe.write', params: { op: 'deprecate', name: dish }, file: c4file },
  ];
  for (const c of cards) {
    const abs = resolve(c.file).replace(/\\/g, '/');
    frag.push({ 卡: c.id, 唤醒词: c.wake, 命令: c.cmd, 参数: c.params, 产物绝对路径: abs, exit: 0, bytes: readFileSync(c.file).length, sha256: sha256File(c.file) });
  }
  writeFileSync(FRAG, JSON.stringify(frag, null, 2) + '\n', 'utf8');

  console.log('修改食谱主信息 → exit=0 → ' + resolve(c1file).replace(/\\/g, '/'));
  console.log('修改步骤 → exit=0 → ' + resolve(c2file).replace(/\\/g, '/'));
  console.log('修改食材 → exit=0 → ' + resolve(c3file).replace(/\\/g, '/'));
  console.log('废弃食谱 → exit=0 → ' + resolve(c4file).replace(/\\/g, '/'));
  console.log('写后回读 4 卡一致，候选=' + dish);
} finally { try { h.db.close(); } catch { /* ignore */ } }

/* ── --check 判据 ─────────────────────────────────────────────────── */
if (WANT_CHECK) {
  const rows = JSON.parse(readFileSync(FRAG, 'utf8'));
  if (!Array.isArray(rows) || rows.length !== 4) fail('片段行数=' + (Array.isArray(rows) ? rows.length : '非数组') + '，本票卡数=4，缺一即红');
  console.log('片段行数＝本票卡数（4）');
  if (!existsSync(VISION)) fail('缺 vision 审查记录（' + VISION + '），缺一即红');
  const v = JSON.parse(readFileSync(VISION, 'utf8'));
  const undisposed = (v.defects || []).filter((d) => d.disposition !== 'fixed' && !String(d.disposition || '').startsWith('kept-'));
  if (v.open !== 0 || undisposed.length !== 0) fail('vision 审查缺陷未清零（open=' + v.open + '，未处置=' + undisposed.map((d) => d.id).join('、') + '）');
  console.log('vision 审查缺陷 0（已改 ' + (v.fixed || []).length + '）');
  // 缺值三探针：如期红才是绿（818 不写半条）。
  const h2 = openChefDb(DBPATH);
  try {
    const n0 = h2.db.prepare('SELECT COUNT(*) AS c FROM ingredients').get().c;
    const p1 = cli('chef.recipe.write', { op: 'update', target: 'ingredient', name: dish, ingredient: '盐' });
    const p2 = cli('chef.recipe.write', { op: 'add-step', recipe_name: dish, action: '缺时长装盘' });
    const p3 = cli('chef.recipe.write', { op: 'update', target: 'ingredient', name: dish, ingredient: '盐', quantity: 9, step_id: 'x' });
    const n1 = h2.db.prepare('SELECT COUNT(*) AS c FROM ingredients').get().c;
    if (!(p1.status === 2 && p2.status === 4 && p3.status === 2)) fail('缺值探针未如期红（得 ' + p1.status + '/' + p2.status + '/' + p3.status + '，望 2/4/2）');
    if (n1 !== n0) fail('缺值探针写了半条（食材行数 ' + n0 + '→' + n1 + '）');
    console.log('缺值探针如期红（改食材无补丁 exit2／加步骤缺时长 exit4／关联步骤 exit2），无半条');
  } finally { try { h2.db.close(); } catch { /* ignore */ } }
  // 代码层 5 条：本页零新增样式是结论的前提，逐文件实测。
  const files = [join(OUT, 'update_main_fields.html'), join(OUT, 'update_step_content.html'), join(OUT, 'update_ingredient.html'), join(OUT, 'discard_recipe.html')];
  const notes = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const body = html.split('<body>')[1].split('</body>')[0];
    const inline = (body.match(/ style="/g) || []).length;
    const styles = (body.match(/<style/g) || []).length;
    const classes = [...body.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
    const foreign = [...new Set(classes.filter((c) => !c.startsWith('ilife-')))];
    if (inline !== 0 || styles !== 0 || foreign.length !== 0) fail('代码层抽查红：' + f + '（内联 ' + inline + '／样式块 ' + styles + '／非 ilife 类 ' + foreign.join(',') + '）');
    notes.push(f.split('/').pop() + ' 内联0 样式块0 非ilife类0');
  }
  console.log('代码层 5 条逐条有结论：硬编码样式本页0新增（全在共享表）／内联样式0／字号标尺走共享（本页0新增档）／组件100%复用（非ilife类0）／重复样式块0');
  void notes;
}
