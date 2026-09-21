#!/usr/bin/env node
/** t768 页面族原型（**抛弃式**）· 三族页面（过程型／结果型／回执型）各一页，每页三个结构不同的候选版式。
 *
 * 要回答的设计问题（票 #768 的 Question）：三族页面该长什么样？
 *   → 走 **UI 分支**：同路由多变体（`?variant=A|B|C`）＋ 底部悬浮切换条；三族＝三条路由（三页）。
 *
 * 已定的三条硬口径（票面「目标」）：① 内容＝`base-paint/blocks` 的区块，文档＝`renderDocShell`，不新造一套样式；
 * ② 双端真渲染（390 手机 ＋ 1280 桌面），手机端适配照 HELP（触屏三件、触摸目标 44px、无横向溢出）；
 * ③ 内容以老件为权威、视觉不复刻（`#682` A3-1）。数据取自**真库副本**（`.scratch/t768/chef_data.db`）——
 * 页上每个字都是真库里的真内容，不是编的样例。
 *
 * 用法：
 *   node docs/skills/skill-chef/t768-原型.mjs                  # 出三页原型 ＋ 双端截图 ＋ 跑质量门（exit 0 才算绿）
 *   node docs/skills/skill-chef/t768-原型.mjs --out <目录>      # 换产物目录（缺省 .scratch/t768）
 *   node docs/skills/skill-chef/t768-原型.mjs --no-shots       # 不出截图（只装配＋判据）
 *   node docs/skills/skill-chef/t768-原型.mjs --inject 横向溢出  # **反例**：把坏页塞进副本再判，必须红并点名（exit 1）
 *
 * 依赖：`packages/skill-chef/dist`（真取数）＋ `packages/base-render/dist`（公共层区块与文档壳）＋
 *      本机 headless Chrome／Edge ＋ 真库可读（缺副本时自动跑 `t840-沙箱.mjs` 复制一份）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as B from '../../../packages/base-render/dist/blocks.js';
import { renderDocShell } from '../../../packages/base-render/dist/docShell.js';
import { pageShapeCss, pageUiCss, renderActionBar, renderFactStrip, renderStatusBadge, renderTimelineRows } from '../../../packages/base-render/dist/index.js';
import { printGate, runGate, withBrowser } from './t768-质量门.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DIST = join(ROOT, 'packages', 'skill-chef', 'dist');
const argOf = (n, d) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const OUT = resolve(argOf('--out', join(ROOT, '.scratch', 't768')));
const DBPATH = join(OUT, 'chef_data.db');
const INJECT = argOf('--inject', '');
const NO_SHOTS = process.argv.includes('--no-shots');

/* ── 真数据：副本库（缺则先复制一份；真库只读）───────────────────────────── */
function ensureDbCopy() {
  if (existsSync(DBPATH)) return;
  const r = spawnSync(process.execPath, [join(ROOT, 'docs', 'skills', 'skill-chef', 't840-沙箱.mjs'), '--ticket', '768'], { stdio: 'inherit' });
  if (r.status !== 0 || !existsSync(DBPATH)) { console.error('副本库没建起来：' + DBPATH); process.exit(2); }
}
async function loadData() {
  ensureDbCopy();
  const D = (p) => pathToFileURL(join(DIST, p)).href;
  const { openChefDb, getRecipeDetail, historyStats, queryHistory, listRecipes } = await import(D('fetch/db.js'));
  const { toRecipeItem } = await import(D('render/views.js'));
  const { buildCookingRun } = await import(D('cook/run.js'));
  const h = openChefDb(DBPATH);
  const name = listRecipes(h)[0]?.name ?? '';
  const detail = getRecipeDetail(h, name);
  const history = queryHistory(h, detail.recipe.id);
  const stat = historyStats(h, detail.recipe.id);
  const base = detail.recipe.servings > 0 ? detail.recipe.servings : 2;
  const servings = 4;
  const factor = servings / base;
  const ings = [...detail.ingredients].sort((a, b) => a.sequence - b.sequence);
  const steps = [...detail.steps].sort((a, b) => a.sequence - b.sequence);
  const scaled = ings.map((g) => ({ ...g, quantity: g.quantity === null ? null : Math.round(g.quantity * factor * 100) / 100 }));
  const run = buildCookingRun({ recipe: toRecipeItem(detail.recipe), history: stat, servings, steps: steps.map((s) => ({ ...s, ingredients: scaled })) });
  h.db.close();
  return { recipe: detail.recipe, ings, steps, history, stat, base, servings, scaled, run };
}

/* ── 装配小件（只用公共层区块；每个函数＝一屏里的一个单元）────────────────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** 正文段落：**公共层没有这个件**（见设计文档「发现的公共层缺口」）——本页补丁样式给排印，另立票去公共层补。 */
const prose = (t) => '<p class="v768-prose">' + esc(t) + '</p>';
const fact = (items) => renderFactStrip({ items });
const caliber = (t) => B.renderCaliberLine(t);
const concl = (t) => B.renderConclusionBar(t);
const act = (buttons) => renderActionBar({ buttons });
const badge = (text, status) => renderStatusBadge({ status: status ?? 'ok', text });
const stepTitle = (s) => '第 ' + s.sequence + ' 步';
/** 步骤卡：`data-step` 是原型壳挂状态用的锚，属性由本函数补（区块层不认它）。 */
const stepCard = (s, open) => B.renderDisclosure({ title: stepTitle(s), open: open === true, contentHtml: stepBody(s) })
  .replace('<details class="', '<details data-step="' + s.sequence + '" class="');
function stepBody(s) {
  return prose(s.action) + fact([
    { label: '火候', value: s.heat_level || '未写' },
    { label: '时长', value: (s.duration_minutes ?? '—') + ' 分钟' },
    { label: '锅温', value: s.temperature || '未写' },
  ]) + caliber('这一步做成：' + (s.expected_result || '未写'));
}
/** 备料表：食材｜用量｜说明（三列；390 档由 pageUi 卡片化成「列头＋值」两行＝每味三行）。
 *  第四列「分类」只在变体 A（信息最全那版）出现——是否该按味印分类，正是本原型要请维护者裁的一处。 */
function prepTable(rows, caption, withCat) {
  const columns = [{ key: 'name', label: '食材' }, { key: 'qty', label: '用量', align: 'right' }, { key: 'note', label: '说明' }];
  if (withCat === true) columns.push({ key: 'cat', label: '分类' });
  return B.renderDataTable({
    caption, columns,
    rows: rows.map((g) => ({
      name: g.name, qty: g.quantity === null ? '适量' : String(g.quantity) + ' ' + g.unit,
      note: g.quantity_text || '未写', cat: g.category,
    })),
  });
}
const cats = (ings) => B.renderChipRow({ items: [...new Set(ings.map((g) => g.category))].map((c) => ({ text: c })) });
const kpiCount = (d) => B.renderKpiGrid([
  { label: '做过', value: String(d.stat.count), unit: '次', detail: d.history[0] ? '最近 ' + d.history[0].cook_date : '还没有记录' },
  { label: '平均评分', value: d.stat.avgRating === null ? '未评' : String(d.stat.avgRating), unit: d.stat.avgRating === null ? '' : '分' },
]);
const historyTimeline = (d) => renderTimelineRows({ rows: d.history.map((r) => ({ time: r.cook_date, main: '第 ' + r.cook_sequence + ' 次做这道菜，评分 ' + r.rating + ' 分', note: r.feedback || '这次没写反馈' })) });

/* ── 族 1 · 过程型：做菜模式（`chef.cooking.run`；真产物 6 步／4 人份）──────── */
function 过程型(d, v) {
  const eyebrow = '私家大厨 ｜ 做菜';
  const title = '做菜模式：' + d.recipe.name;
  const facts = fact([
    { label: '份量', value: d.servings + ' 人份' }, { label: '步骤', value: d.steps.length + ' 步' },
    { label: '预计', value: d.recipe.total_time_minutes + ' 分钟' }, { label: '状态', value: d.recipe.status },
  ]);
  const 放大 = concl('用量是原谱（' + d.base + ' 人份）的 ' + (d.servings / d.base) + ' 倍，照这份清单备料就行。');
  const 备料 = B.renderDisclosure({ title: '备料清单（' + d.servings + ' 人份）', contentHtml: prepTable(d.scaled, null) });
  const 收口 = act([{ label: '做完了，记一次', kind: 'primary', actionId: 'p768-record' }, { label: '看这道菜的历史', kind: 'ghost', actionId: 'p768-history' }]);
  const 复制 = B.renderCopyBlock({ title: '复制备料清单', dataActionId: 'p768-copy-prep', dataText: d.scaled.map((g) => g.name + ' ' + (g.quantity ?? '') + g.unit).join('\n') });
  if (v === 'A') {
    // A 单步聚焦：读数卡说「到哪了」，一次只展开一步；其余步骤与备料收在折叠里。
    const cur = d.steps[Math.min(2, d.steps.length - 1)];
    const 进度 = B.renderKpiCard({ label: '当前进度', value: String(cur.sequence), unit: '/ ' + d.steps.length + ' 步', detail: cur.heat_level + ' ' + cur.duration_minutes + ' 分钟', bar: { pct: Math.round((cur.sequence / d.steps.length) * 100) } });
    return {
      eyebrow, title,
      blocks: [facts, 放大, 进度, ...d.steps.map((s) => stepCard(s, s.sequence === cur.sequence)),
        act([{ label: '上一步', kind: 'ghost', actionId: 'p768-prev' }, { label: '下一步', kind: 'primary', actionId: 'p768-next' }]), 备料, 收口, 复制],
    };
  }
  if (v === 'B') {
    // B 全步骤时间轴：六步一屏铺开（可扫读），不再有「当前步」这个状态。
    return {
      eyebrow, title,
      blocks: [facts, 放大,
        B.renderKpiCard({ label: '做到第几步', value: '3', unit: '/ ' + d.steps.length + ' 步', detail: '下一步：下豆豉和小米椒炒香' }),
        renderTimelineRows({ rows: d.steps.map((s) => ({ time: stepTitle(s), main: s.action, note: s.heat_level + ' ' + s.duration_minutes + ' 分钟，做成：' + s.expected_result })) }),
        备料, 收口, 复制],
    };
  }
  // C 备料工作台：桌面两栏（左备料贴顶、右逐步卡全出），手机自动塌成一列。
  return {
    eyebrow, title, blocks: [facts, 放大],
    cols: [{ sticky: true, html: prepTable(d.scaled, '备料（' + d.servings + ' 人份）') + cats(d.ings) }, { html: d.steps.map((s) => stepCard(s, true)).join('') }],
    after: [收口, 复制],
  };
}

/* ── 族 2 · 结果型：看菜谱（`chef.recipe.view`；真产物 11 食材／6 步／1 条历史） */
function 结果型(d, v) {
  const eyebrow = '私家大厨 ｜ 查看';
  const title = d.recipe.name;
  const facts = fact([
    { label: '难度', value: d.recipe.difficulty }, { label: '份量', value: d.recipe.servings + ' 人份' },
    { label: '总时长', value: d.recipe.total_time_minutes + ' 分钟' }, { label: '状态', value: d.recipe.status },
  ]);
  // 结论条只放**判定**（做过几次、平均几分），页头那行事实只放**基本属性**——两处不重复同一批信息。
  const 结论 = concl('这道菜做过 ' + d.stat.count + ' 次，平均 ' + (d.stat.avgRating ?? '—') + ' 分。');
  const 来头 = B.renderDisclosure({ title: '这道菜的来头与出处', contentHtml: prose(d.recipe.description) + caliber('出处：' + d.recipe.source) + caliber('建档 ' + d.recipe.created_at + '，最近更新 ' + d.recipe.updated_at) });
  const 营养 = caliber('营养未估算：这个谱按实际称量走，页面不编数字。');
  const 动作 = act([{ label: '开始做菜', kind: 'primary', actionId: 'p768-cook' }, { label: '记一次', kind: 'ghost', actionId: 'p768-record' }]);
  const 复制 = B.renderCopyBlock({
    title: '复制这份菜谱', dataActionId: 'p768-copy-recipe',
    dataText: JSON.stringify({
      菜名: d.recipe.name, 难度: d.recipe.difficulty, 份量: d.recipe.servings, 总时长: d.recipe.total_time_minutes,
      食材: d.ings.map((g) => ({ 名称: g.name, 用量: g.quantity, 单位: g.unit, 说明: g.quantity_text, 分类: g.category })),
      步骤: d.steps.map((s) => ({ 序号: s.sequence, 动作: s.action, 火候: s.heat_level, 时长: s.duration_minutes, 锅温: s.temperature, 验收: s.expected_result })),
    }, null, 2),
  });
  if (v === 'A') {
    // A 摘要先行（信息最全的一版）：四列食材表（逐味印分类），步骤默认折叠，适合「先看全貌再决定做不做」。
    // 状态不占事实条一格，走徽章行尾（`renderChipRow.tailHtml` 的既定用法：状态与并列标签同一行）。
    const factsA = fact([
      { label: '难度', value: d.recipe.difficulty }, { label: '份量', value: d.recipe.servings + ' 人份' },
      { label: '总时长', value: d.recipe.total_time_minutes + ' 分钟' },
    ]);
    return {
      eyebrow, title,
      blocks: [factsA, 结论,
        B.renderChipRow({ items: [...new Set(d.ings.map((g) => g.category))].map((c) => ({ text: c })), tailHtml: badge(d.recipe.status, 'ok') }),
        prepTable(d.ings, '食材（' + d.ings.length + ' 味）', true),
        ...d.steps.map((s) => stepCard(s, false)), historyTimeline(d), 营养, 来头, 动作, 复制],
    };
  }
  if (v === 'B') {
    // B 两栏食谱卡：桌面左备料贴顶、右步骤全出（读着做）；食材三列（分类退成一行徽章），手机塌成一列。
    return {
      eyebrow, title, blocks: [facts],
      cols: [{ sticky: true, html: prepTable(d.ings, '备料（' + d.recipe.servings + ' 人份）') + cats(d.ings) },
        { html: kpiCount(d) + d.steps.map((s) => stepCard(s, true)).join('') + historyTimeline(d) + 营养 }],
      after: [来头, 动作, 复制],
    };
  }
  // C 分节导航：页内导航胶囊 ＋ 每节一个折叠（长页跳转优先）；食材三列。
  const 节 = [
    { id: 'v768-sec-facts', title: '基本信息', html: 结论 + 营养 },
    { id: 'v768-sec-prep', title: '食材与备料', html: prepTable(d.ings, null) + cats(d.ings) },
    { id: 'v768-sec-steps', title: '步骤', html: d.steps.map((s) => stepCard(s, false)).join('') },
    { id: 'v768-sec-hist', title: '做过的记录', html: historyTimeline(d) },
    { id: 'v768-sec-src', title: '来头与出处', html: prose(d.recipe.description) + caliber('出处：' + d.recipe.source) },
  ];
  return {
    eyebrow, title, sameWidth: true,
    blocks: [facts, B.renderTocBlock({ items: 节.map((s) => ({ id: s.id, text: s.title })) }),
      ...节.map((s) => '<div id="' + s.id + '">' + B.renderDisclosure({ title: s.title, contentHtml: s.html }) + '</div>'), 动作, 复制],
  };
}

/* ── 族 3 · 回执型：记录做菜回执（`chef.history.record`）────────────────── */
function 回执型(d, v) {
  const eyebrow = '私家大厨 ｜ 历史';
  // 标题只说「这是什么页」，结论条说「刚发生了什么」，事实条说细节——三处各管一段，不互相复读。
  const title = '记录做菜：' + d.recipe.name;
  const r = d.history[0] ?? { cook_date: '今天', cook_sequence: 1, rating: 4, feedback: '' };
  const 结论 = concl('已记下这次做菜。');
  const facts = fact([
    { label: '菜', value: d.recipe.name }, { label: '日期', value: r.cook_date }, { label: '评分', value: r.rating + ' 分' },
  ]);
  const 变更 = B.renderChangeRows({ rows: [{ label: '菜谱状态', before: '未做', after: '已做' }, { label: '做菜次数', before: '0 次', after: '1 次' }] });
  const 动作 = act([{ label: '看这道菜的历史', kind: 'primary', actionId: 'p768-history' }, { label: '再看一遍菜谱', kind: 'ghost', actionId: 'p768-view' }]);
  const 复制 = B.renderCopyBlock({ title: '复制这条记录', dataActionId: 'p768-copy-log', dataText: d.recipe.name + ' ' + r.cook_date + ' 第 ' + r.cook_sequence + ' 次 评分 ' + r.rating + '\n' + (r.feedback || '') });
  if (v === 'A') {
    // A 结论条＋事实条：最省的一版（一行判定 ＋ 一排格子 ＋ 两条变更），动作在最下面。
    return { eyebrow, title, blocks: [结论, facts, 变更, caliber('记录已写进本地菜谱库。'), 动作, 复制] };
  }
  if (v === 'B') {
    // B 大回执卡：浅色静态提示做主视觉（一眼看到「成了」），读数卡说清累计。
    return {
      eyebrow, title,
      blocks: [B.renderFeedbackBlock({ staticNotice: true, toast: { msg: '已记录做菜', detail: '评分 ' + r.rating + ' 分，' + r.cook_date, icon: 'ok' } }),
      B.renderKpiGrid([
        { label: '本次评分', value: String(r.rating), unit: '分' },
        { label: '平均评分', value: d.stat.avgRating === null ? '未评' : String(d.stat.avgRating), unit: d.stat.avgRating === null ? '' : '分' },
        { label: '累计做过', value: String(d.stat.count), unit: '次' },
      ]), 变更, 动作, 复制],
    };
  }
  // C 时间轴回执：把这一次放进历史里看（上次什么时候做的、这次排第几）。
  return { eyebrow, title, blocks: [结论, facts, historyTimeline(d), 变更, 动作, 复制] };
}

/* ── 页面装配：变体槽 ＋ 悬浮切换条 ＋ 页内补丁样式 ─────────────────────── */
const FAMILIES = [
  { key: '过程型', file: '过程型.html', title: '做菜模式', build: 过程型, state: true, variants: [['A', '单步聚焦'], ['B', '全步骤时间轴'], ['C', '备料工作台']] },
  { key: '结果型', file: '结果型.html', title: '看菜谱', build: 结果型, state: false, variants: [['A', '摘要先行'], ['B', '两栏食谱卡'], ['C', '分节导航']] },
  { key: '回执型', file: '回执型.html', title: '记录做菜回执', build: 回执型, state: false, variants: [['A', '结论条＋事实条'], ['B', '大回执卡'], ['C', '时间轴回执']] },
];

/** 页内补丁样式（技能侧补丁，走 `extraCss`；只用冻结 token，不新增色值）。 */
const PATCH_CSS = [
  '/* 补丁 1 · 正文段落：公共层 12 区块里没有「一段正文」这个件（见设计文档的缺口一节），',
  '   步骤正文与菜谱描述先由本页补丁排印（15px／1.7，与正文同档）；公共层补齐后这两条删。 */',
  '.v768-prose{font-size:15px;line-height:1.7;color:var(--fg);margin:8px 0 0}',
  '/* 补丁 2 · 双栏：桌面两栏（左栏贴顶）、手机单栏。≥1001 那条要与 pageUi 的三列栅格同权重且后出现才盖得住。 */',
  '.v768-col{min-width:0}',
  '@media (min-width:1001px){',
  '  .ilife-page-ui .ilife-block-page-shell-body.v768-cols{grid-template-columns:minmax(0,380px) minmax(0,1fr);gap:24px;align-items:start}',
  '  .ilife-page-ui .ilife-block-page-shell-body.v768-cols > *{grid-column:auto}',
  '  .ilife-page-ui .ilife-block-page-shell-body.v768-cols > .v768-head,',
  '  .ilife-page-ui .ilife-block-page-shell-body.v768-cols > .v768-after{grid-column:1 / -1}',
  '  .ilife-page-ui .ilife-block-page-shell-body.v768-cols > .v768-col.v768-sticky{position:sticky;top:16px}',
  '  /* 同版心档：把直挂正文的宽块（表／读数卡／时间轴）也收回中间那一列。',
  '     pageUi 的宽档默认让这些块满铺 1240，而其余块留在 880 —— 实战测到同一页两种版心（见设计文档）。 */',
  '  .ilife-page-ui .ilife-block-page-shell-body.v768-same > *{grid-column:2}',
  '}',
].join('\n');

/** 悬浮切换条（原型壳：高对比药丸，明显不是被评的设计；`data-prototype` 让判据跳过它）。 */
function shellBar(variants, withState) {
  const names = variants.map(([k, n]) => "'" + k + "':'" + n + "'").join(',');
  return '<div class="p768-bar" data-prototype="1">'
    + '<button class="p768-arrow" data-step="-1" type="button" aria-label="上一个变体">‹</button>'
    + '<span class="p768-title"><b class="p768-key">' + variants[0][0] + '</b><span class="p768-name">' + variants[0][1] + '</span></span>'
    + '<button class="p768-arrow" data-step="1" type="button" aria-label="下一个变体">›</button>'
    + (withState ? '<span class="p768-state" id="p768-state"></span>' : '')
    + '<span class="p768-tag">抛弃式原型 票 768</span></div>'
    + '<style data-prototype="1">'
    + 'body{padding-bottom:94px}'
    + '.p768-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:99;display:flex;align-items:center;gap:10px;'    + 'max-width:calc(100vw - 24px);box-sizing:border-box;padding:8px 12px;border-radius:999px;background:rgba(28,28,30,.94);color:#fff;'
    + 'font:600 13px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28)}'
    + '.p768-arrow{width:44px;height:44px;border:0;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;font-size:20px;line-height:1;cursor:pointer}'
    + '.p768-title{display:flex;align-items:center;gap:8px;white-space:nowrap;min-width:0}'
    + '.p768-key{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:#0a84ff;flex:0 0 auto}'
    + '.p768-name,.p768-state{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.p768-name{max-width:12em}.p768-state{padding:0 8px;color:#8ee08e;font-weight:500;max-width:8em}'
    + '.p768-tag{white-space:nowrap;color:rgba(255,255,255,.55);font-weight:400}'
    + '@media (max-width:560px){.p768-tag{display:none}}'
    + '</style>'
    + '<script data-prototype="1">(function(){'
    + 'var KEYS=[' + variants.map(([k]) => "'" + k + "'").join(',') + '],NAMES={' + names + '},cur=KEYS[0];'
    + 'var q=new URLSearchParams(location.search).get("variant");'
    + 'if(q&&KEYS.indexOf(q.toUpperCase())>=0){cur=q.toUpperCase()}'
    + 'function step(n){cur=KEYS[(KEYS.indexOf(cur)+n+KEYS.length)%KEYS.length];draw()}'
    + 'function draw(){'
    + 'var slot=document.querySelectorAll("[data-variant]"),i;'
    + 'for(i=0;i<slot.length;i+=1){slot[i].hidden=slot[i].getAttribute("data-variant")!==cur}'
    + 'document.querySelector(".p768-key").textContent=cur;'
    + 'document.querySelector(".p768-name").textContent=NAMES[cur];'
    + 'try{history.replaceState(null,"",location.pathname+"?variant="+cur)}'
    + 'catch(e){/* file:// 下 Chrome 不许改写地址：只切内存态，链接手写 ?variant= 仍可分享 */}'
    + 'if(window.__p768State){window.__p768State()}}'
    + 'var arrows=document.querySelectorAll(".p768-arrow");'
    + 'for(i=0;i<arrows.length;i+=1){arrows[i].addEventListener("click",function(ev){step(Number(ev.currentTarget.dataset.step))})}'
    + 'document.addEventListener("keydown",function(e){var t=e.target.tagName;'
    + 'if(t==="INPUT"||t==="TEXTAREA"||e.target.isContentEditable){return}'
    + 'if(e.key==="ArrowRight"){step(1)}else if(e.key==="ArrowLeft"){step(-1)}});'
    + 'draw();'
    + 'if(window.__p768Wire){window.__p768Wire()}'
    + '})();</script>';
}

/** 过程型 A 的步骤状态（原型壳行为）：改「哪一步展开 ＋ 读数卡 ＋ 壳里那行状态」。真跑时由宿主驱动。 */
const STEP_JS = '<script data-prototype="1">window.__p768Wire=function(){'
  + 'var scope=document.querySelector("[data-variant=\\"A\\"]");if(!scope){return}'
  + 'var card=scope.querySelector(".ilife-block-kpi-card");'
  + 'var val=card.querySelector(".ilife-block-kpi-card-value"),unit=card.querySelector(".ilife-block-kpi-card-unit"),'
  + 'det=card.querySelector(".ilife-block-kpi-card-detail"),fill=card.querySelector(".ilife-block-kpi-card-bar-fill");'
  + 'var boxes=[].slice.call(scope.querySelectorAll("details[data-step]"));if(!boxes.length){return}'
  + 'var cur=Math.min(3,boxes.length);'
  + 'function paint(){boxes.forEach(function(b){var n=Number(b.dataset.step),isCur=n===cur;'
  + 'if(isCur){b.setAttribute("open","")}else{b.removeAttribute("open")}'
  + 'var t=b.querySelector("summary");if(t){t.textContent="第 "+n+" 步"+(isCur?"（当前）":"")}});'
  + 'val.textContent=String(cur);unit.textContent="/ "+boxes.length+" 步";'
  + 'var open=scope.querySelector("details[data-step=\\""+cur+"\\"]");'
  + 'var vals=open?[].map.call(open.querySelectorAll(".ilife-block-fact-strip-value"),function(x){return x.textContent}):[];'
  + 'det.textContent=vals.join(" ")||"这一步的说明";'
  + 'if(fill){fill.style.width=Math.round(cur/boxes.length*100)+"%"}'
  + 'window.__p768State()}'
  + 'window.__p768State=function(){var st=document.getElementById("p768-state");if(!st){return}'
  + 'var a=document.querySelector("[data-variant=\\"A\\"]");'
  + 'st.textContent=(a&&!a.hidden)?"第 "+cur+" 步 / 共 "+boxes.length+" 步":""};'
  + 'function mv(n){cur=Math.min(boxes.length,Math.max(1,cur+n));paint()}'
  + 'var p=scope.querySelector("[data-action-id=\\"p768-prev\\"]"),nx=scope.querySelector("[data-action-id=\\"p768-next\\"]");'
  + 'if(p){p.addEventListener("click",function(){mv(-1)})}if(nx){nx.addEventListener("click",function(){mv(1)})}'
  + 'paint();};'
  + '/* 自触发：切换条那段脚本在本件之前解析，不能指望它调用（实测过：顺序反了就整条不接线）。 */'
  + 'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){window.__p768Wire()})}else{window.__p768Wire()}'
  + '</script>';

function buildPage(d, fam) {
  const slots = fam.variants.map(([key]) => {
    const view = fam.build(d, key);
    const head = view.blocks.join('');
    const cols = view.cols === undefined ? ''
      : '<div class="v768-head">' + head + '</div>'
      + view.cols.map((c) => '<div class="v768-col' + (c.sticky === true ? ' v768-sticky' : '') + '">' + c.html + '</div>').join('');
    const after = view.after === undefined ? '' : '<div class="v768-after">' + view.after.join('') + '</div>';
    let shell = B.renderPageShell({ eyebrow: view.eyebrow, title: view.title, content: (view.cols === undefined ? head : '') + cols + after });
    if (view.cols !== undefined) shell = shell.replace('class="ilife-block-page-shell-body"', 'class="ilife-block-page-shell-body v768-cols"');
    else if (view.sameWidth === true) shell = shell.replace('class="ilife-block-page-shell-body"', 'class="ilife-block-page-shell-body v768-same"');
    return '<!--VARIANT-BEGIN:' + key + '--><div class="v768-slot" data-variant="' + key + '"' + (key === 'A' ? '' : ' hidden') + '>' + shell + '</div><!--VARIANT-END:' + key + '-->';
  }).join('\n');
  const html = renderDocShell({
    docTitle: fam.title + '（抛弃式原型 票 768）',
    bodyHtml: slots + shellBar(fam.variants, fam.state),
    extraCss: pageUiCss() + '\n' + pageShapeCss() + '\n' + PATCH_CSS,
    pageUi: true,
  });
  return fam.state ? html.replace('</body>', STEP_JS + '\n</body>') : html;
}

/* ── 截图（双端真渲染：390 手机墙宽 ／ 1280 桌面墙宽）───────────────────── */
async function shots(files, widths) {
  const made = [];
  const got = await withBrowser(async ({ s, sleep }) => {
    for (const f of files) {
      const keys = (readFileSync(f, 'utf8').match(/<!--VARIANT-BEGIN:([A-Za-z0-9]+)-->/g) ?? []).map((m) => m.replace(/<!--VARIANT-BEGIN:|-->/g, ''));
      for (const key of (keys.length ? keys : [null])) {
        for (const w of widths) {
          await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768 });
          await s('Page.navigate', { url: pathToFileURL(f).href + (key === null ? '' : '?variant=' + key) });
          for (let i = 0; i < 80; i += 1) { const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true }); if (r.result && r.result.value === true) break; await sleep(50); }
          await sleep(150);
          const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          const name = f.replace(/\.html$/, '') + '-' + (key ?? 'A') + '-' + w + '.png';
          writeFileSync(name, Buffer.from(shot.data, 'base64'));
          made.push(name);
        }
      }
    }
    return made;
  });
  if (got.error !== undefined) { console.log('截图跳过：' + got.error); return []; }
  return got;
}

/* ── 主流程 ────────────────────────────────────────────────────────────── */
const d = await loadData();
mkdirSync(OUT, { recursive: true });
const files = FAMILIES.map((fam) => {
  const p = join(OUT, fam.file);
  writeFileSync(p, buildPage(d, fam), 'utf8');
  console.log('PROTOTYPE ' + fam.key + ' → ' + p.replace(/\\/g, '/') + '（' + fam.variants.map(([k, n]) => k + ' ' + n).join('／') + '）');
  return p;
});
console.log('数据来源：真库副本 ' + DBPATH.replace(/\\/g, '/') + '（' + d.recipe.name + '：' + d.ings.length + ' 食材／' + d.steps.length + ' 步／' + d.stat.count + ' 条历史）');

if (!NO_SHOTS) console.log('截图 ' + (await shots(files, [390, 1280])).length + ' 张（三页 × 三变体 × 双端 390／1280）');

const out = await runGate({ files, widths: [390, 1280] });
if (out.fatal !== undefined) { console.log('RESULT: ABORT exit=2 :: ' + out.fatal); process.exit(2); }
const green = printGate(out, { label: '原型自检' });
writeFileSync(join(OUT, '读数.json'), JSON.stringify({ at: new Date().toISOString(), widths: out.widths, data: { 菜名: d.recipe.name, 食材: d.ings.length, 步骤: d.steps.length, 历史: d.stat.count }, results: out.results }, null, 2) + '\n', 'utf8');

if (INJECT !== '') {
  const dst = join(OUT, '..', 't768-反例-' + INJECT);
  const r = spawnSync(process.execPath, [join(ROOT, 'docs', 'skills', 'skill-chef', 't768-质量门.mjs'), OUT, '--inject', INJECT, '--out', dst, '--json', join(dst, '读数.json')], { stdio: 'inherit' });
  console.log('反例「' + INJECT + '」退出码 ' + r.status + '（预期 1：判据必须变红并点名）');
  process.exit(r.status === null ? 2 : r.status);
}
process.exit(green ? 0 : 1);
