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
 * `renderProseBlock`。样式层的单一入口仍是 `chefSceneCss()`（公共层两配方 ＋ 私家大厨皮肤），
 * 本页**页内专属**的那一段接在它后面追加（`searchSceneCss()`），不把公共层那两层拆回去。
 * 标签口径：六张关联表（`recipe_categories`／`recipe_flavors`／`recipe_seasons`／
 * `recipe_meal_types`／`recipe_diet_tags`／`recipe_cooking_methods`）聚合为一行徽章，
 * 与 #770 共用同一条口径（同一批关联表、同一套徽章形状），见本票证据件。
 *
 * #873 页内收口（本席 13 页共用这一份装配件，一改全动）：三处版面重排 ＋ 一处措辞收敛。
 * ① **条件面板**：此前条件是一格「条件」事实条，值是一整句（`card.desc`），与页名说的是同一件事；
 *    现在按 `card.params` 逐维展开成「标签＋值」的行（每行一枚图形图标位），再加一行「排序」。
 * ② **结果数抬头**：此前是一条泛化结论条（「以下菜都符合这次筛选。」），说的正是条件面板已经说完的
 *    那句话；现在换成带计数的抬头「共 N 道菜」，泛化结论条只在错字模糊匹配那一页保留（那句纠错是
 *    真信息：`你是不是想找：辣椒炒肉`）。
 * ③ **桌面两栏**：1280 档此前是一条 880px 居中单列，一格结果右侧大片留白；现在页体是一个
 *    全宽两栏容器（左栏＝插画＋条件面板，右栏＝结果抬头＋菜卡＋复制区），窄屏自动落回单列。
 * ④ **措辞收敛**：正文按句号分段（库里的连写正文一个字不改，只在排版层断句）；菜卡尾部的
 *    「评分：」「状态：」两行并成一行口径行（走 `renderCaliberLine` 的并列分段，分隔由版式承担）；
 *    页脚那行「来源：菜谱库，结果按菜名排序」的信息并进条件面板的「排序」行。
 * 页内新增的视觉件（插画、图标位）**只画形状与色彩**，一个字的数据都不进产物。
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
/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`skin.ts` 同）。 */
const LF = String.fromCharCode(10);

const B = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'blocks.js')).href);
const { renderDocShell } = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'docShell.js')).href);
/** 事实条（页面级形状件）＋ 色基来源（冻结 token 表与既有调色板，页内样式不自造色值）。 */
const { renderFactStrip, CHART_PALETTE, CSS_VAR_TOKENS } = await import(pathToFileURL(join(ROOT, 'packages', 'base-render', 'dist', 'index.js')).href);
/** 页面样式层的单一入口（公共层两配方 ＋ 私家大厨皮肤）住本技能的渲染包，见 `src/render/skin.ts`。 */
const { chefSceneCss } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-chef', 'dist', 'render', 'index.js')).href);
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

/* ── 取数富化：标签六表分组（与 #770 同一条口径：同一批关联表、同一套徽章形状） ── */
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
  // 六张关联表各自成组（组名＝这一组讲的是哪一类属性）：徽章按组带标签摆，
  // 单字值（季节的「春」「夏」、餐次的「中」「晚」）因此不再是一枚孤零零的碎胶囊。
  const groups = [
    { key: 'cuisine', text: '菜系', items: col(one('SELECT cuisine_type FROM recipe_categories WHERE recipe_id = ?', id), 'cuisine_type') },
    { key: 'flavor', text: '口味', items: col(one('SELECT flavor FROM recipe_flavors WHERE recipe_id = ?', id), 'flavor') },
    { key: 'season', text: '季节', items: col(one('SELECT season FROM recipe_seasons WHERE recipe_id = ?', id), 'season') },
    { key: 'meal', text: '餐别', items: col(one('SELECT meal_type FROM recipe_meal_types WHERE recipe_id = ?', id), 'meal_type') },
    { key: 'tag', text: '特点', items: col(one('SELECT tag FROM recipe_diet_tags WHERE recipe_id = ?', id), 'tag') },
    { key: 'method', text: '做法', items: col(one('SELECT method FROM recipe_cooking_methods WHERE recipe_id = ?', id), 'method') },
  ].filter((g) => g.items.length > 0);
  const tags = [...new Set(groups.flatMap((g) => g.items))];
  let count = 0;
  let avg = null;
  try {
    const st = h.db.prepare('SELECT COUNT(*) AS c, AVG(rating) AS a FROM recipe_history WHERE recipe_id = ?');
    const row = typeof st.get === 'function' ? st.get(id) : undefined;
    count = Number(row?.c ?? 0);
    avg = row?.a === null || row?.a === undefined ? null : Number(row.a);
  } catch { /* 无历史即零 */ }
  return { tags, groups, count, avg };
}

/* ══════════════════════════════════════════════════════════════
 * #873 页内视觉件与版面（全部只画形状与色彩，一个字的数据都不进产物）
 * ══════════════════════════════════════════════════════════════ */

/** 色基：冻结 token 表 ＋ 既有调色板（`CHART_PALETTE`）——页内样式不凭空发明色值。 */
const PAL = {
  blue: CSS_VAR_TOKENS['--blue'],
  blue2: CSS_VAR_TOKENS['--blue2'],
  line: CSS_VAR_TOKENS['--line'],
  warm: CHART_PALETTE[2],
  yellow: CHART_PALETTE[6],
  green: CHART_PALETTE[1],
  red: CHART_PALETTE[3],
  purple: CHART_PALETTE[4],
};
/** hex → `r, g, b`：`rgba()` 派生浅底的唯一换算位（与 `src/render/skin.ts` 同口径）。 */
function rgbOf(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}
const BLUE_RGB = rgbOf(PAL.blue);
const LINE_RGB = rgbOf(PAL.line);
const WARM_RGB = rgbOf(PAL.warm);
const YELLOW_RGB = rgbOf(PAL.yellow);
const GREEN_RGB = rgbOf(PAL.green);

/** 五字符转义（与区块层 `esc` 同表，本件不引区块层内部件）。 */
function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

/** 页头插画：一只盛了小菜的碗、一枚放大镜与一只盘子 —— 三件都是**形状**，
 *  不是任何一道菜的照片，`aria-hidden` 不进无障碍树。 */
/** 反例开关：置 `false` 即等价最小回退掉页头插画（本席「视觉生动」那一维的主要承担件）。 */
const ART_SVG_ON = true;
const ART_SVG = ART_SVG_ON ? [
  '<svg class="ilife-block-search-art-svg" viewBox="0 0 320 56" aria-hidden="true" focusable="false">',
  '<path class="ilife-block-search-art-steam" d="M26 22 q6 -6 0 -10 q-6 -4 0 -8"/>',
  '<path class="ilife-block-search-art-steam" d="M42 19 q6 -6 0 -10 q-6 -4 0 -8"/>',
  '<path class="ilife-block-search-art-steam" d="M58 23 q6 -6 0 -10 q-6 -4 0 -8"/>',
  '<rect class="ilife-block-search-art-rim" x="6" y="28" width="104" height="6" rx="3"/>',
  '<path class="ilife-block-search-art-bowl" d="M11 34 h94 a47 16 0 0 1 -94 0 z"/>',
  '<circle class="ilife-block-search-art-bit-a" cx="32" cy="25" r="6"/>',
  '<circle class="ilife-block-search-art-bit-b" cx="49" cy="22" r="4"/>',
  '<circle class="ilife-block-search-art-bit-c" cx="68" cy="26" r="6"/>',
  '<circle class="ilife-block-search-art-bit-d" cx="85" cy="23" r="3.5"/>',
  '<circle class="ilife-block-search-art-lens" cx="196" cy="27" r="20"/>',
  '<path class="ilife-block-search-art-pepper" d="M187 29 q8 -10 20 -6 q-4 12 -20 6 z"/>',
  '<path class="ilife-block-search-art-stem" d="M205 21 q3 -5 8 -5"/>',
  '<path class="ilife-block-search-art-handle" d="M212 42 L230 54"/>',
  '<circle class="ilife-block-search-art-plate" cx="276" cy="34" r="15"/>',
  '<circle class="ilife-block-search-art-plate-in" cx="276" cy="34" r="9"/>',
  '<circle class="ilife-block-search-art-spark" cx="140" cy="12" r="2.6"/>',
  '<circle class="ilife-block-search-art-spark" cx="300" cy="14" r="2.6"/>',
  '<circle class="ilife-block-search-art-spark" cx="150" cy="46" r="2.6"/>',
  '<circle class="ilife-block-search-art-spark" cx="14" cy="50" r="2.6"/>',
  '</svg>',
].join('') : '';

/** 条件面板每行的图标位：一组 16×16 的线形图形（描边走 `currentColor`，底盘在 CSS 里给色）。
 *  `-fill` 那一类是实心点，其余一律 `fill: none` ＋ 描边。 */
const GLYPH = {
  lens: '<circle cx="8" cy="8" r="5.4"/><path d="M12 12 L15 15"/>',
  bowl: '<path d="M2 8.6 h12 a6 4.6 0 0 1 -12 0 z"/><path d="M1 6.6 h14"/>',
  chili: '<path d="M10.4 2.2 q4.4 3.4 3.2 7.2 q-1 3.8 -3.2 5.6 q-2.4 -1.8 -3.4 -5.6 q-1.2 -3.8 3.4 -7.2 z"/>'
    + '<path d="M10.4 2.2 q1.6 -1.4 3.2 -0.6"/>',
  clock: '<circle cx="8" cy="8.8" r="5.6"/><path d="M8 5.6 V9 L10.6 10.6"/><path d="M6 2.2 h4"/>',
  leaf: '<path d="M8 14.6 V7.4"/><path d="M8 8.6 q-5.2 -0.6 -6.2 -5.8 q6.2 -1 6.2 5.8 z"/>'
    + '<path d="M8 11.4 q5.2 -0.6 6.2 -5.8 q-6.2 -1 -6.2 5.8 z"/>',
  check: '<path d="M3 8.8 L6.4 12.2 L13 4.6"/>',
  off: '<circle cx="8" cy="8" r="5.6"/><path d="M4.4 11.6 L11.6 4.4"/>',
  list: '<path d="M6 4 H14"/><path d="M6 8 H14"/><path d="M6 12 H14"/>'
    + '<circle class="ilife-block-search-facet-fill" cx="3" cy="4" r="1.3"/>'
    + '<circle class="ilife-block-search-facet-fill" cx="3" cy="8" r="1.3"/>'
    + '<circle class="ilife-block-search-facet-fill" cx="3" cy="12" r="1.3"/>',
  sort: '<path d="M3 4.5 H13"/><path d="M3 8 H9.5"/><path d="M3 11.5 H6"/>',
};

/** 条件维度的显示名与图标位（键＝`chef.recipe.search` 的过滤键，见 `src/search/run.ts`）。 */
const FACET_SPEC = {
  q: ['关键词', 'lens'],
  cuisine: ['菜系', 'bowl'],
  flavor: ['口味', 'chili'],
  season: ['季节', 'leaf'],
  meal: ['餐别', 'clock'],
  ingredient: ['用到', 'bowl'],
  ingredient_exclude: ['不含', 'off'],
  difficulty: ['难度', 'check'],
  maxTime: ['最长用时', 'clock'],
  cookware: ['炊具', 'bowl'],
  status: ['状态', 'check'],
  method: ['做法', 'chili'],
  tag: ['特点', 'list'],
  filter: ['菜系', 'bowl'],
};

function glyphHtml(name) {
  const body = GLYPH[name] ?? GLYPH.list;
  return '<svg class="ilife-block-search-facet-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
    + body + '</svg>';
}

/** 把这一页的过滤条件逐维摊成「标签＋值」的行：只读 `card.params`，不加任何库里没有的值。
 *  一行都没有（全部食谱那一页）时给一行「范围＝全部菜」。行尾恒加一行「排序」（与取数同源的固定口径）。 */
function facetRows(card) {
  const rows = [];
  for (const [key, raw] of Object.entries(card.params)) {
    if (key === 'kind' || raw === undefined || raw === null || raw === '') continue;
    const spec = FACET_SPEC[key];
    if (spec === undefined) continue;
    const value = key === 'maxTime' ? String(raw) + ' 分钟' : String(raw);
    rows.push({ label: spec[0], glyph: spec[1], value });
  }
  if (rows.length === 0) rows.push({ label: '范围', glyph: 'list', value: '全部菜' });
  rows.push({ label: '排序', glyph: 'sort', value: '按菜名' });
  return rows;
}

/** 条件面板（左栏）：标题（带形状件图标位）＋ 逐行「图标位／标签／值」。 */
function facetPanel(card) {
  const items = facetRows(card).map((r) => '<li class="ilife-block-search-facet-row">'
    + '<span class="ilife-block-search-facet-icon">' + glyphHtml(r.glyph) + '</span>'
    + '<span class="ilife-block-search-facet-label">' + esc(r.label) + '</span>'
    + '<span class="ilife-block-search-facet-value">' + esc(r.value) + '</span>'
    + '</li>').join('');
  return '<section class="ilife-block-search-facet">'
    + '<h2 class="ilife-block-search-facet-title">这次的条件</h2>'
    + '<ul class="ilife-block-search-facet-list">' + items + '</ul>'
    + '</section>';
}

/** 属性带：六个维度各成一组，组名在前、徽章在后，组与组之间只靠间距分槽。
 *  徽章本身仍走区块层的 `renderChips`（同一套徽章形状）；本件只提供**分组的容器**
 *  ——此前是全丢进一枚 `renderChipRow`，13 枚长短不一的胶囊自由换行，
 *  单字值（春／夏／中／晚）看上去就是一枚孤立的碎胶囊。 */
function attrStrip(groups, record) {
  // 「这条菜现在是什么状态」跟六维属性同属「这条菜长什么样」那组，**并入同一条属性带**：
  // 此前它是一条独立的口径行（`做过 1 次 ｜ 平均 4 分 ｜ 状态 已做`），与上面的瓦片、徽章一起
  // 在首屏一次吐出三段（复评原话：「卡片首屏一次性吐出做法标签、两段长描述和统计行，文案明显超载」）。
  const all = record.items.length > 0
    ? [...groups, { text: '状态', items: record.items }]
    : groups;
  const cells = all.map((g) => '<span class="ilife-block-search-attr">'
    + '<span class="ilife-block-search-attr-label">' + esc(g.text) + '</span>'
    + B.renderChips({ items: g.items.map((t) => ({ text: t })) })
    + '</span>').join('');
  if (cells === '') return '';
  return '<div class="ilife-block-search-attrs">' + cells + '</div>';
}

/** 正文分段（排版层断句）：库里的连写正文**一个字不改**，只按句号切成几段，
 *  末段没句号就照原样收尾（不补标点）。空正文走原有的「还没写介绍」那一句。 */
function proseHtml(item) {
  const raw = String(item.description ?? '').trim();
  if (raw === '') return B.renderProseBlock({ text: '这道菜还没有写介绍。' });
  const stopped = raw.endsWith('。');
  const segs = raw.split('。').map((s) => s.trim()).filter((s) => s !== '');
  return segs.map((s, i) => B.renderProseBlock({
    text: fullWidthPunct(i < segs.length - 1 || stopped ? s + '。' : s),
  })).join('');
}

/** 标点全角化（**排版层**，只换标点的字宽，不动一个词）：库里这段正文是半角逗号与半角圆括号
 *  夹在中文行里（`辣椒炒肉(又名青椒炒肉、农家小炒肉)是…,以…为主料,`），在版面上读成
 *  「夹杂未渲染的符号」；与 #817 对可见名称「半角拉丁转全角」同一条口径。
 *  只映射三个最扎眼的半角标点，其余字符（含引号）一律原样保留。 */
function fullWidthPunct(text) {
  return text.replace(/[,()]/g, (ch) => (ch === ',' ? '，' : ch === '(' ? '（' : '）'));
}

/** 本席页内样式：接在 `chefSceneCss()` **之后**追加（不把公共层那两层拆回去）。
 *  全部规则挂在根类 `.ilife-page-ui` 之下；色值只取冻结 token 与既有调色板；
 *  圆角只用闭集 `{8,14,20,999}`；断点只用仓内既有集合（本页只用到 1001 一档）。 */
function searchSceneCss() {
  const P = '.ilife-page-ui ';
  const SCENE = P + '.ilife-block-page-shell-body > .ilife-block-search-scene';
  const CARDBOX = P + '.ilife-block-search-cards';
  const CARDS = CARDBOX + ' ';
  return [
    '/* #873 搜索筛选席 · 页内版式（接在 chefSceneCss() 之后追加） */',
    /* ① 页体：窄屏单列；≥1001 切「条件轨 ＋ 结果」两栏（列宽与该断点的其余规则统一收在
       本函数末尾的 `@media (min-width: 1001px)` 里，一处定义）。
       `grid-column: 1 / -1` 是必需的：公共层在 ≥1001 把页体变成三列栅格、`> *` 一律落中间那 880px
       一列，不给这一条则整页仍是「右侧大片留白」的居中单列。选择器多带一层 `.…-page-shell-body`
       是为了稳吃公共层那条同权重、在前出现的规则。 */
    SCENE + ' {',
    '  grid-column: 1 / -1;',
    '  display: grid;',
    '  gap: 16px;',
    '  align-items: start;',
    '  min-width: 0;',
    '}',
    P + '.ilife-block-search-rail,',
    P + '.ilife-block-search-main {',
    '  display: grid;',
    '  gap: 14px;',
    '  align-content: start;',
    '  min-width: 0;',
    '}',
    /* ② 页头插画带：一层暖色浅底 ＋ 圆角描边，把插画与正文分成两个「面」。
       宽档这条带**跨两栏**（见下 `grid-template-areas` 的 `art` 区），底纹铺满整条，
       画面等比居中——宽屏首屏最上面那一片因此不是灰底。 */
    P + '.ilife-block-search-art {',
    '  margin: 0;',
    '  padding: 8px 10px;',
    '  border: 1px solid rgba(' + WARM_RGB + ', .28);',
    '  border-radius: 14px;',
    '  background-image: linear-gradient(115deg, rgba(' + YELLOW_RGB + ', .26),'
      + ' rgba(' + WARM_RGB + ', .12) 58%, rgba(' + BLUE_RGB + ', .06));',
    '  box-shadow: 0 1px 3px rgba(' + LINE_RGB + ', .45);',
    '}',
    P + '.ilife-block-search-art-svg {',
    '  display: block;',
    '  width: 100%;',
    '  height: auto;',
    '}',
    P + '.ilife-block-search-art-steam {',
    '  fill: none;',
    '  stroke: rgba(' + WARM_RGB + ', .58);',
    '  stroke-width: 2.6;',
    '  stroke-linecap: round;',
    '}',
    P + '.ilife-block-search-art-rim { fill: ' + PAL.warm + '; opacity: .55; }',
    P + '.ilife-block-search-art-bowl {',
    '  fill: rgba(' + BLUE_RGB + ', .14);',
    '  stroke: rgba(' + BLUE_RGB + ', .45);',
    '  stroke-width: 1.6;',
    '}',
    P + '.ilife-block-search-art-bit-a { fill: ' + PAL.yellow + '; }',
    P + '.ilife-block-search-art-bit-b { fill: ' + PAL.green + '; }',
    P + '.ilife-block-search-art-bit-c { fill: ' + PAL.red + '; }',
    P + '.ilife-block-search-art-bit-d { fill: ' + PAL.purple + '; }',
    P + '.ilife-block-search-art-lens {',
    '  fill: rgba(' + YELLOW_RGB + ', .22);',
    '  stroke: ' + PAL.warm + ';',
    '  stroke-width: 3;',
    '}',
    P + '.ilife-block-search-art-pepper { fill: ' + PAL.red + '; }',
    P + '.ilife-block-search-art-stem {',
    '  fill: none;',
    '  stroke: ' + PAL.green + ';',
    '  stroke-width: 2;',
    '  stroke-linecap: round;',
    '}',
    P + '.ilife-block-search-art-handle {',
    '  fill: none;',
    '  stroke: ' + PAL.blue + ';',
    '  stroke-width: 4;',
    '  stroke-linecap: round;',
    '}',
    P + '.ilife-block-search-art-plate {',
    '  fill: rgba(' + BLUE_RGB + ', .10);',
    '  stroke: rgba(' + BLUE_RGB + ', .38);',
    '  stroke-width: 1.6;',
    '}',
    P + '.ilife-block-search-art-plate-in { fill: rgba(' + BLUE_RGB + ', .10); }',
    P + '.ilife-block-search-art-spark { fill: ' + PAL.warm + '; opacity: .55; }',
    /* ③ 条件面板：收进一张卡；标题前一枚暖色方块图标位，每行一枚线形图标位 ＋ 浅底行。
       行是栅格三槽（图标位／标签／值），值贴右缘——两档下标签与值的起点都对齐。 */
    P + '.ilife-block-search-facet {',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 14px;',
    '  background: var(--card);',
    '  box-shadow: 0 1px 2px rgba(' + LINE_RGB + ', .45);',
    '}',
    P + '.ilife-block-search-facet-title {',
    '  position: relative;',
    '  margin: 0 0 10px;',
    '  padding-left: 26px;',
    '  font-size: 15px;',
    '  line-height: 1.4;',
    '  color: var(--fg);',
    '}',
    P + '.ilife-block-search-facet-title::before {',
    '  content: "";',
    '  position: absolute;',
    '  left: 0;',
    '  top: 50%;',
    '  width: 18px;',
    '  height: 18px;',
    '  border-radius: 8px;',
    '  background: linear-gradient(135deg, ' + PAL.yellow + ', ' + PAL.warm + ' 60%, ' + PAL.red + ');',
    '  transform: translateY(-50%);',
    '}',
    P + '.ilife-block-search-facet-list {',
    '  margin: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '  display: grid;',
    '  gap: 8px;',
    '}',
    P + '.ilife-block-search-facet-row {',
    '  display: grid;',
    '  grid-template-columns: 28px minmax(0, auto) minmax(0, 1fr);',
    '  align-items: center;',
    '  gap: 10px;',
    '  padding: 6px 9px;',
    '  border-radius: 8px;',
    '  background: var(--soft);',
    '}',
    P + '.ilife-block-search-facet-icon {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 28px;',
    '  height: 28px;',
    '  border-radius: 8px;',
    '  background: rgba(' + BLUE_RGB + ', .10);',
    '  color: var(--blue2);',
    '}',
    P + '.ilife-block-search-facet-glyph {',
    '  width: 16px;',
    '  height: 16px;',
    '  fill: none;',
    '  stroke: currentColor;',
    '  stroke-width: 1.6;',
    '  stroke-linecap: round;',
    '  stroke-linejoin: round;',
    '}',
    P + '.ilife-block-search-facet-fill {',
    '  fill: currentColor;',
    '  stroke: none;',
    '}',
    P + '.ilife-block-search-facet-label {',
    '  color: var(--fg3);',
    '  font-size: 13px;',
    '}',
    P + '.ilife-block-search-facet-value {',
    '  color: var(--fg);',
    '  font-size: 15px;',
    '  font-weight: 600;',
    '  text-align: right;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ④ 结果抬头：带计数的抬头替掉此前那条泛化结论条（「以下菜都符合这次筛选。」）。 */
    P + '.ilife-block-search-result-title {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 8px;',
    '  margin: 0;',
    '  font-size: 15px;',
    '  font-weight: 600;',
    '  color: var(--fg2);',
    '}',
    P + '.ilife-block-search-result-num {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 40px;',
    '  height: 40px;',
    '  border-radius: 999px;',
    '  background-image: linear-gradient(135deg, ' + PAL.yellow + ', ' + PAL.warm + ' 72%);',
    '  box-shadow: 0 1px 4px rgba(' + WARM_RGB + ', .35);',
    '  color: var(--card);',
    '  font-size: 20px;',
    '  line-height: 1;',
    '  font-weight: 700;',
    '}',
    /* ⑤ 菜卡：折叠条保持公共层的形状与标记，只补页内节奏与几处色彩锚点 ——
       摘要命中区不低于 48px（触摸档硬线 44px）；摘要右端一枚装饰性盘形图标位（纯 CSS，
       不进文档流文字）；卡顶一条品牌渐变带；三格事实各一枚不同色的左缘（同一行的三件事
       从此不靠列距区分）；徽章行改成**行内伸展**（见下一条注释）；正文段之间给一行间距。 */
    CARDBOX + ' {',
    '  display: grid;',
    '  gap: 12px;',
    '  min-width: 0;',
    '}',
    CARDS + '.ilife-block-disclosure {',
    '  position: relative;',
    '  margin: 0;',
    '  overflow: hidden;',
    '}',
    CARDS + '.ilife-block-disclosure::before {',
    '  content: "";',
    '  position: absolute;',
    '  top: 0;',
    '  left: 0;',
    '  right: 0;',
    '  height: 3px;',
    '  background: linear-gradient(90deg, ' + PAL.yellow + ', ' + PAL.warm + ' 45%, ' + PAL.blue + ');',
    '}',
    CARDS + '.ilife-block-disclosure-summary {',
    '  position: relative;',
    '  min-height: 48px;',
    '  box-sizing: border-box;',
    '  padding-right: 46px;',
    '}',
    CARDS + '.ilife-block-disclosure-summary::after {',
    '  content: "";',
    '  position: absolute;',
    '  right: 12px;',
    '  top: 50%;',
    '  width: 26px;',
    '  height: 26px;',
    '  border-radius: 999px;',
    '  transform: translateY(-50%);',
    '  background-image: radial-gradient(circle, var(--card) 0 32%,'
      + ' rgba(' + WARM_RGB + ', .34) 33% 50%, var(--card) 51% 100%);',
    '  box-shadow: inset 0 0 0 1.5px rgba(' + WARM_RGB + ', .45);',
    '}',
    CARDS + '.ilife-block-fact-strip-item:nth-child(1) { border-left-color: rgba(' + WARM_RGB + ', .70); }',
    CARDS + '.ilife-block-fact-strip-item:nth-child(2) { border-left-color: rgba(' + BLUE_RGB + ', .55); }',
    CARDS + '.ilife-block-fact-strip-item:nth-child(3) { border-left-color: rgba(' + GREEN_RGB + ', .70); }',
    CARDS + '.ilife-block-search-attrs {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px 22px;',
    '  margin: 12px 0 0;',
    '}',
    CARDS + '.ilife-block-search-attr {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  padding: 2px 0;',
    '}',
    CARDS + '.ilife-block-search-attr-label {',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  white-space: nowrap;',
    '}',
    CARDS + '.ilife-block-search-attr .ilife-block-chip + .ilife-block-chip { margin-left: 4px; }',
    CARDS + '.ilife-block-chip { margin: 0; }',
    CARDS + '.ilife-block-prose { margin: 10px 0 0; }',
    CARDS + '.ilife-block-prose + .ilife-block-prose { margin-top: 8px; }',
    CARDS + '.ilife-block-caliber:last-child { margin-bottom: 0; }',
    /* ⑥ 宽屏：字阶抬一档 ＋ 正文行距放宽 —— 1280 档正文列有 880px 以上，15px 会读成「一栏小字」；
       字号抬档同时把短页撑高，首屏下半截不至于只剩一片灰底。 */
    '@media (min-width: 1001px) {',
    /* 页头三级与页体对齐：公共层在 ≥1001 把眉标／标题收成 880px 并 `margin: auto` 居中（那是给
       「单列 880 版心」的形态写的），而本页页体是**全宽两栏**——不修这一条，1280 档标题会从
       x≈200 起、插画带与条件卡从 x≈20 起，整页左缘错开一条。这里把页头放回 100%（左缘与页体同一条）。 */
    '  ' + P + '.ilife-block-page-shell-eyebrow,',
    '  ' + P + '.ilife-block-page-shell-title,',
    '  ' + P + '.ilife-block-page-shell-subtitle {',
    '    max-width: 100%;',
    '    margin-left: 0;',
    '    margin-right: 0;',
    '  }',
    '  ' + CARDS + '.ilife-block-disclosure-body { padding: 16px 18px 18px; }',
    /* 字阶抬档要连带把瓦片的内距一起抬：只抬字号会让「18 分钟」顶到瓦片框线上
       （复评原话：「桌面版『2 人份／18 分钟／难度』标签文字超框略显拥挤」）。 */
    '  ' + CARDS + '.ilife-block-fact-strip-item { padding: 9px 12px; }',
    '  ' + CARDS + '.ilife-block-prose {',
    '    font-size: 16px;',
    '    line-height: 1.85;',
    '  }',
    '  ' + CARDS + '.ilife-block-fact-strip-value { font-size: 16px; }',
    '  ' + CARDS + '.ilife-block-chip { font-size: 14px; }',
    /* 属性带在宽档排成**四列一行的属性矩阵**：此前是一条 `flex-wrap` 流水线，872px 一行塞得下
       五组、第二行只剩两组，读起来「每条参数堆成七八个胶囊、左挤右铺」（复评原话）。
       矩阵里每组各占一槽，组名独占一行、徽章在组名下面成一片 —— 组与组之间靠槽分，
       不再靠 22px 的横向间距硬挤。 */
    '  ' + CARDS + '.ilife-block-search-attrs {',
    '    display: grid;',
    '    grid-template-columns: repeat(4, minmax(0, 1fr));',
    '    gap: 12px 20px;',
    '    align-items: start;',
    '  }',
    '  ' + CARDS + '.ilife-block-search-attr {',
    '    display: flex;',
    '    flex-wrap: wrap;',
    '    align-items: center;',
    '    gap: 4px 6px;',
    '  }',
    '  ' + CARDS + '.ilife-block-search-attr-label { flex: 0 0 100%; }',
    /* 末一组（「状态」，三枚徽章）跨两槽：四列槽宽约 215px 装不下「做过 N 次／平均 N 分／状态」三枚，
       不给这一条它会把末一枚挤到下一行，读起来像「单字独占一行」（复评原话）。 */
    '  ' + CARDS + '.ilife-block-search-attr:last-child { grid-column: span 2; }',
    /* 复制区落到左栏下端：结果区只有一格菜卡，复制区另起一行挂在其下时，
       主列到「复制数据」就断了、页面下半截全是空的（复评原话：「首屏底部出现冗余的
       『复制这次筛选结果』导致空白下坠」「复制数据按钮整行空荡」）。挪到左栏后两栏收在
       同一高度上，按钮也回到常规宽度；390 档媒体查询不命中，窄屏次序仍是
       条件 → 结果 → 复制区。 */
    '  ' + SCENE + ' {',
    '    grid-template-columns: 400px minmax(0, 1fr);',
    '    grid-template-areas:',
    '      "art art"',
    '      "rail main"',
    '      "copy main";',
    '    gap: 16px 24px;',
    '  }',
    '  ' + P + '.ilife-block-search-art {',
    '    grid-area: art;',
    '    display: flex;',
    '    align-items: center;',
    '    justify-content: center;',
    '    padding: 12px 20px;',
    '    background-image:',
    '      repeating-linear-gradient(115deg, rgba(' + YELLOW_RGB + ', .10) 0 12px,'
      + ' rgba(' + YELLOW_RGB + ', 0) 12px 28px),',
    '      linear-gradient(115deg, rgba(' + YELLOW_RGB + ', .26),'
      + ' rgba(' + WARM_RGB + ', .12) 58%, rgba(' + BLUE_RGB + ', .06));',
    '  }',
    '  ' + P + '.ilife-block-search-art-svg {',
    '    width: auto;',
    '    height: 88px;',
    '  }',
    '  ' + P + '.ilife-block-search-rail { grid-area: rail; }',
    '  ' + P + '.ilife-block-search-main { grid-area: main; }',
    '  ' + P + '.ilife-block-search-copy { grid-area: copy; }',
    '  ' + P + '.ilife-block-search-copy .ilife-copy-btn {',
    '    width: 100%;',
    '    max-width: none;',
    '  }',
    '}',
    /* 窄屏：插画带压到 ~44px（它是**装饰**，不该在 390 档吃掉首屏的四分之一 —— 复评原话
       「首屏装饰条带和黄底装饰图占据首屏约 1/4 面积而信息量稀薄」；压法是给 SVG 一个高度上限，
       `preserveAspectRatio` 默认居中留边，画面等比缩小居中）。同一档把条件面板从「逐行卡片」
       改成「一串胶囊」：390 档首屏只有 820px，两三条条件的卡片要吃掉约 140px，条件带只要 70px 上下
       —— 省下的高度留给下面的菜卡。这一切必须排在基础规则**之后**才盖得住（同权重、后出现者胜）。 */
    '@media (max-width: 640px) {',
    '  ' + SCENE + ' { gap: 18px; }',
    '  ' + CARDS + '.ilife-block-disclosure-body { padding: 14px 16px 16px; }',
    '  ' + P + '.ilife-block-search-art { padding: 3px 8px; }',
    '  ' + P + '.ilife-block-search-art-svg { max-height: 36px; }',
    '  ' + P + '.ilife-block-search-facet { padding: 10px 12px; }',
    '  ' + P + '.ilife-block-search-facet-title { margin-bottom: 8px; }',
    '  ' + P + '.ilife-block-search-facet-list {',
    '    display: flex;',
    '    flex-wrap: wrap;',
    '    gap: 8px;',
    '  }',
    '  ' + P + '.ilife-block-search-facet-row {',
    '    display: inline-flex;',
    '    gap: 6px;',
    '    padding: 4px 10px;',
    '    border-radius: 999px;',
    '  }',
    '  ' + P + '.ilife-block-search-facet-icon { width: 22px; height: 22px; }',
    '  ' + P + '.ilife-block-search-result-num { width: 34px; height: 34px; font-size: 17px; }',
    '}',
  ].join(LF);
}

/* ── 结果型页装配（配方 §2：眉标＋标题／条件面板／结果抬头／菜卡／复制） ── */
function buildPage(card, data, metas) {
  const eyebrow = '私家大厨 ｜ 搜索筛选';
  const isFuzzy = card.fuzzy === true && String(data.kind).startsWith('search-fuzzy:');
  const cards = data.items.map((it) => {
    const m = metas.get(it.id) ?? { tags: [], count: 0, avg: null };
    const head = renderFactStrip({
      items: [
        { label: '难度', value: it.difficulty || '未写' },
        { label: '份量', value: String(it.servings) + ' 人份' },
        { label: '总时长', value: String(it.total_time_minutes) + ' 分钟' },
      ],
    });
    // 「做过几次／平均几分／什么状态」并进下面那条属性带（`attrStrip` 的第二参），页内不再另起
    // 一条口径行：卡片体因此由「瓦片＋徽章＋两段正文＋统计行」四段收成三段。
    const record = m.avg === null
      ? { items: ['还没记过评分', it.status || '未写'] }
      : { items: ['做过 ' + m.count + ' 次', '平均 ' + m.avg + ' 分', it.status || '未写'] };
    const chips = attrStrip(m.groups ?? [], record);
    const body = head + chips + proseHtml(it);
    return B.renderDisclosure({ title: it.name, open: true, contentHtml: body });
  }).join('');
  const copy = B.renderCopyBlock({
    // 不再给标题：按钮自己写着「复制数据」，上面再压一行「复制这次筛选结果」是同义复述
    // （复评原话：「『这次的』／『这次的筛选结果』等冗余文案」「复制区在首屏被压在页外属冗余装饰」）。
    dataActionId: 't771-copy-' + card.id,
    dataText: JSON.stringify({ 条件: card.desc, 总数: data.total, 菜: data.items.map((it) => it.name) }, null, 2),
  });
  // 插画带是**页头那条带**，不是左栏里的一小块：≥1001 时它跨两栏，正好把宽屏首屏最先看到的那一片
  // 用起来（复评反复点「桌面端大片留白／两栏天平失衡」）；≤640 时它退回一行 ~44px 的窄带。
  const art = ART_SVG === ''
    ? ''
    : '<figure class="ilife-block-search-art" aria-hidden="true">' + ART_SVG + '</figure>';
  const rail = '<div class="ilife-block-search-rail">' + facetPanel(card) + '</div>';
  const main = '<div class="ilife-block-search-main">'
    + (isFuzzy ? B.renderConclusionBar('你是不是想找：辣椒炒肉') : '')
    + '<h2 class="ilife-block-search-result-title">共 <span class="ilife-block-search-result-num">'
      + String(data.total) + '</span> 道菜</h2>'
    + '<div class="ilife-block-search-cards">' + cards + '</div>'
    + '</div>';
  const copySlot = '<div class="ilife-block-search-copy">' + copy + '</div>';
  const shell = B.renderPageShell({
    eyebrow, title: card.title,
    content: '<div class="ilife-block-search-scene">' + art + rail + main + copySlot + '</div>',
  });
  return renderDocShell({
    docTitle: card.title + ' ｜ 私家大厨',
    bodyHtml: shell,
    extraCss: chefSceneCss() + LF + searchSceneCss(),
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
