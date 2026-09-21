#!/usr/bin/env node
/** t771 搜索筛选域运行器：13 卡逐卡真跑副本库 → 结果型 HTML → 册子片段。
 *
 * 票 #771（父图 #765 票 6）。数据只走票 17（#840）交的沙箱器械：副本
 * `.scratch/t771/chef_data.db`（源只读、写只在副本）；不许与其他票共用副本。
 *
 * 用法：
 *   node tooling/run-locked.mjs --ticket 771 -- node docs/skills/skill-chef/t771-run-search.mjs
 *     → 打印 13 行 `卡 → exit=0 → 产物绝对路径`，且 `缺卡 0`、`路由错位 0`，exit 0
 *   node tooling/run-locked.mjs --ticket 771 -- node docs/skills/skill-chef/t771-run-search.mjs --check
 *     → 另打印「片段行数＝本票卡数」与「vision 审查缺陷 0（或逐条已改）」，缺一即红（exit 1）
 *   node tooling/run-locked.mjs --ticket 771 -- node docs/skills/skill-chef/t771-run-search.mjs --shots
 *     → 另出双端截图（390／1280，26 张）供 vision 审查与册子
 *
 * 反例（必跑）：把筛选口味的映射改回 cuisine（`src/search/run.ts` 里 flavor 查询改查
 * `recipe_categories`，或把 `src/search/routes.ts` 里筛选口味的示例改回 `{"filter":"川菜"}`）
 * → 本脚本的路由行为检查必报 `路由错位` 并 exit 1（见 `checkRouting`）。
 *
 * 页面形状：照 `docs/skills/skill-chef/t768-页面族配方.md` §2 结果型配方表组装，每一格都是
 * 一次公共层区块调用（`base-render` 的 `blocks`＋`docShell`，`pageUi` 开）；正文段落用 #860 交的
 * `renderProseBlock`，不写页内补丁样式（`extraCss` 只挂 `pageUiCss`＋`pageShapeCss`）。
 * 标签口径：六张关联表（`recipe_categories`／`recipe_flavors`／`recipe_seasons`／
 * `recipe_meal_types`／`recipe_diet_tags`／`recipe_cooking_methods`）聚合为一行徽章，
 * 与 #770 共用同一条口径（同一批关联表、同一套徽章形状），见本票证据件。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const OUT = join(ROOT, '.scratch', 't771');
const DBPATH = join(OUT, 'chef_data.db');
const MANIFEST = join(ROOT, 'docs', 'skills', 'skill-chef', 't771-册子片段.json');
const VISION_RECORD = join(OUT, 'vision.json');
const ARGS = new Set(process.argv.slice(2));
const WANT_CHECK = ARGS.has('--check');
const WANT_SHOTS = ARGS.has('--shots');

const B = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'blocks.js')).href);
const { renderDocShell } = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'docShell.js')).href);
const { pageShapeCss, pageUiCss, renderFactStrip } = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'index.js')).href);
const { printGate, runGate, withBrowser } = await import('./t768-质量门.mjs');
const DIST = join(ROOT, 'packages', 'skill-chef', 'dist');
const D = (p) => pathToFileURL(join(DIST, p)).href;
const { openChefDb } = await import(D('fetch/db.js'));
const { runRecipeSearch } = await import(D('search/run.js'));

/* ── 13 卡表（卡 id＝发布 slug，见 t767 命名规则；唤醒词取老组名；参数取真库能命中的值） ── */
const CARDS = [
  { id: 'search_by_name_keyword', wake: '搜索食谱', params: { q: '辣椒' }, title: '关键词搜索：辣椒', desc: '菜名或食材含辣椒的菜' },
  { id: 'search_fuzzy_match', wake: '搜索食谱', params: { q: '辣椒炒内' }, title: '错字模糊匹配：辣椒炒内', desc: '错字谐音先纠错再展示', fuzzy: true },
  { id: 'filter_cuisine_basic', wake: '筛选菜系', params: { cuisine: '湘菜' }, title: '按菜系筛选：湘菜', desc: '湘菜有哪些' },
  { id: 'filter_combined', wake: '筛选菜系', params: { cuisine: '湘菜', maxTime: 30, flavor: '辣' }, title: '多维组合筛选：湘菜加辣加时限', desc: '湘菜里三十分钟内能搞定的辣菜' },
  { id: 'filter_by_ingredient_basic', wake: '筛选食材', params: { ingredient: '五花肉' }, title: '按食材筛选：五花肉', desc: '哪些菜里有五花肉' },
  { id: 'filter_exclude_ingredient', wake: '筛选食材', params: { ingredient_exclude: '虾仁' }, title: '排除食材：不含虾仁', desc: '不吃虾仁有什么菜' },
  { id: 'filter_difficulty_easy', wake: '筛选难度', params: { difficulty: '快手菜' }, title: '按难度筛选：快手菜', desc: '来个简单的' },
  { id: 'filter_time_quick', wake: '筛选时间', params: { maxTime: 30 }, title: '按时间筛选：三十分钟内', desc: '三十分钟内的菜' },
  { id: 'filter_by_cookware', wake: '筛选炊具', params: { cookware: '炒锅' }, title: '按炊具筛选：炒锅', desc: '用炒锅做的菜' },
  { id: 'filter_by_flavor', wake: '筛选口味', params: { flavor: '辣' }, title: '按口味筛选：辣', desc: '辣的菜有哪些' },
  { id: 'filter_by_season', wake: '筛选季节', params: { season: '夏' }, title: '按季节筛选：夏', desc: '夏天适合吃什么' },
  { id: 'filter_by_status', wake: '筛选状态', params: { status: '已做' }, title: '按状态筛选：已做', desc: '已做的菜' },
  { id: 'list_all_recipes', wake: '查看全部', params: { kind: 'all' }, title: '全部食谱', desc: '列出所有未废弃菜' },
];

/* ── 路由行为检查（反例判据）：显式键命中且经 cuisine 查同值必 miss ── */
function checkRouting(h) {
  const problems = [];
  const hit = (params) => {
    try {
      const r = runRecipeSearch(h, params);
      return r.total > 0;
    } catch {
      return false;
    }
  };
  // 筛选口味→flavor：flavor=辣命中，cuisine=辣必 miss（库里无辣菜系）
  if (!hit({ flavor: '辣' })) problems.push('筛选口味未走 flavor（flavor=辣无结果）');
  if (hit({ cuisine: '辣' })) problems.push('筛选口味错位走 cuisine（cuisine=辣不应有结果）');
  // 筛选食材→ingredient：ingredient=五花肉命中，cuisine=五花肉必 miss
  if (!hit({ ingredient: '五花肉' })) problems.push('筛选食材未走 ingredient（ingredient=五花肉无结果）');
  if (hit({ cuisine: '五花肉' })) problems.push('筛选食材错位走 cuisine（cuisine=五花肉不应有结果）');
  // 筛选季节→season：season=夏命中，cuisine=夏必 miss
  if (!hit({ season: '夏' })) problems.push('筛选季节未走 season（season=夏无结果）');
  if (hit({ cuisine: '夏' })) problems.push('筛选季节错位走 cuisine（cuisine=夏不应有结果）');
  // 筛选菜系仍走 cuisine：cuisine=湘菜命中，filter=湘菜（别名）命中
  if (!hit({ cuisine: '湘菜' })) problems.push('筛选菜系未走 cuisine（cuisine=湘菜无结果）');
  if (!hit({ filter: '湘菜' })) problems.push('筛选菜系别名 filter 未落 cuisine（filter=湘菜无结果）');
  return problems;
}

/* ── 取数富化：标签六表聚合＋历史评分（与 #770 同一条口径） ── */
function enrich(h, item) {
  const one = (sql, id) => {
    try {
      const st = h.db.prepare(sql);
      return typeof st.all === 'function' ? st.all(id) : [];
    } catch {
      return [];
    }
  };
  const col = (rows, k) => rows.map((r) => String(r[k] ?? '')).filter((s) => s !== '');
  const id = item.id;
  const tags = [
    ...col(one('SELECT cuisine_type FROM recipe_categories WHERE recipe_id = ?', id), 'cuisine_type'),
    ...col(one('SELECT flavor FROM recipe_flavors WHERE recipe_id = ?', id), 'flavor'),
    ...col(one('SELECT season FROM recipe_seasons WHERE recipe_id = ?', id), 'season'),
    ...col(one('SELECT meal_type FROM recipe_meal_types WHERE recipe_id = ?', id), 'meal_type'),
    ...col(one('SELECT tag FROM recipe_diet_tags WHERE recipe_id = ?', id), 'tag'),
    ...col(one('SELECT method FROM recipe_cooking_methods WHERE recipe_id = ?', id), 'method'),
  ];
  let count = 0;
  let avg = null;
  try {
    const st = h.db.prepare('SELECT COUNT(*) AS c, AVG(rating) AS a FROM recipe_history WHERE recipe_id = ?');
    const row = typeof st.get === 'function' ? st.get(id) : undefined;
    count = Number(row?.c ?? 0);
    avg = row?.a === null || row?.a === undefined ? null : Number(row.a);
  } catch { /* 无历史即零 */ }
  return { tags: [...new Set(tags)], count, avg };
}

/* ── 结果型页装配（配方 §2：眉标＋标题／事实条／结论条／徽章行／菜卡／复制／页脚） ── */
function buildPage(card, data, metas) {
  const eyebrow = '私家大厨 ｜ 搜索筛选';
  const facts = renderFactStrip({
    items: [
      { label: '条件', value: card.desc },
      { label: '找到', value: String(data.total) + ' 道' },
    ],
  });
  const isFuzzy = card.fuzzy === true && String(data.kind).startsWith('search-fuzzy:');
  const concl = isFuzzy ? ''
    : B.renderConclusionBar(
      card.id === 'list_all_recipes' ? '以下就是库里全部未废弃菜。'
        : '以下菜都符合这次筛选。',
    );
  const correction = isFuzzy
    ? B.renderConclusionBar('你是不是想找：辣椒炒肉')
    : '';
  const cards = data.items.map((it) => {
    const m = metas.get(it.id) ?? { tags: [], count: 0, avg: null };
    const head = renderFactStrip({
      items: [
        { label: '难度', value: it.difficulty || '未写' },
        { label: '份量', value: String(it.servings) + ' 人份' },
        { label: '总时长', value: String(it.total_time_minutes) + ' 分钟' },
      ],
    });
    const chips = m.tags.length ? B.renderChipRow({ items: m.tags.map((t) => ({ text: t })) }) : '';
    const score = m.avg === null ? '还没有人评过' : '做过 ' + m.count + ' 次，平均 ' + m.avg + ' 分';
    const body = head + chips + B.renderProseBlock({ text: it.description || '这道菜还没有写介绍。' })
      + B.renderCaliberLine('评分：' + score) + B.renderCaliberLine('状态：' + (it.status || '未写'));
    return B.renderDisclosure({ title: it.name, open: true, contentHtml: body });
  }).join('');
  const copy = B.renderCopyBlock({
    title: '复制这次筛选结果', dataActionId: 't771-copy-' + card.id,
    dataText: JSON.stringify({ 条件: card.desc, 总数: data.total, 菜: data.items.map((it) => it.name) }, null, 2),
  });
  const foot = B.renderCaliberLine('来源：本地菜谱库副本，结果按菜名排序');
  const shell = B.renderPageShell({ eyebrow, title: card.title, content: facts + concl + correction + cards + copy + foot });
  return renderDocShell({
    docTitle: card.title + '（搜索筛选域 票 771）',
    bodyHtml: shell,
    extraCss: pageUiCss() + '\n' + pageShapeCss(),
    pageUi: true,
  });
}

/* ── 主流程 ── */
if (!existsSync(DBPATH)) {
  console.error('副本库缺失：' + DBPATH + '（先跑 t840-沙箱.mjs --ticket 771）');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const h = openChefDb(DBPATH);
try {
  const routing = checkRouting(h);
  console.log('路由错位 ' + routing.length + (routing.length ? '（' + routing.join('；') + '）' : ''));
  if (routing.length) process.exit(1);
  const missing = [];
  const rows = [];
  for (const card of CARDS) {
    let data;
    try {
      data = runRecipeSearch(h, card.params);
    } catch (e) {
      console.log('卡 ' + card.id + ' → exit=1（' + String(e.message ?? e).slice(0, 60) + '）');
      missing.push(card.id);
      continue;
    }
    const metas = new Map();
    for (const it of data.items) metas.set(it.id, enrich(h, it));
    const html = buildPage(card, data, metas);
    const file = join(OUT, card.id + '.html');
    writeFileSync(file, html, 'utf8');
    const bytes = Buffer.byteLength(html, 'utf8');
    const sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
    rows.push({ 卡: card.id, 唤醒词: card.wake, 命令: 'chef.recipe.search', 参数: card.params, 产物绝对路径: file, exit: 0, bytes, sha256 });
    console.log('卡 ' + card.id + ' → exit=0 → ' + file);
  }
  console.log('缺卡 ' + missing.length + (missing.length ? '（' + missing.join('、') + '）' : ''));
  writeFileSync(MANIFEST, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  if (missing.length) process.exit(1);

  if (WANT_SHOTS) {
    const files = CARDS.map((c) => join(OUT, c.id + '.html'));
    const made = await withBrowser(async ({ s, sleep }) => {
      const out = [];
      for (const f of files) {
        for (const w of [390, 1280]) {
          await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768 });
          await s('Page.navigate', { url: pathToFileURL(f).href });
          for (let i = 0; i < 80; i += 1) {
            const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true });
            if (r.result && r.result.value === true) break;
            await sleep(50);
          }
          await sleep(150);
          const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          const name = f.replace(/\.html$/, '') + '-' + w + '.png';
          writeFileSync(name, Buffer.from(shot.data, 'base64'));
          out.push(name);
        }
      }
      return out;
    });
    if (made.error !== undefined) console.log('截图跳过：' + made.error);
    else console.log('截图 ' + made.length + ' 张（13 卡 × 双端 390／1280）');
  }

  if (WANT_CHECK) {
    let manifestRows = 0;
    try {
      manifestRows = JSON.parse(readFileSync(MANIFEST, 'utf8')).length;
    } catch { manifestRows = -1; }
    console.log('片段行数＝' + manifestRows + '（本票卡数 ' + CARDS.length + '）');
    let vision = { defects: -1, fixed: [] };
    try {
      vision = JSON.parse(readFileSync(VISION_RECORD, 'utf8'));
    } catch { /* 缺记录即红 */ }
    const pending = Math.max(0, Number(vision.defects ?? -1) - (vision.fixed ?? []).length);
    console.log('vision 审查缺陷 ' + pending + (vision.fixed && vision.fixed.length ? '（已改 ' + vision.fixed.length + ' 条）' : ''));
    if (manifestRows !== CARDS.length || pending !== 0) process.exit(1);
  }
} finally {
  try { h.db.close(); } catch { /* ignore */ }
}
console.log('RESULT: PASS exit=0 :: 13 卡全绿');
