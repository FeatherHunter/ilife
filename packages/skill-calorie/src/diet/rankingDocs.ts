/** #272 · 食品排行页装配（`calorie.view.ranking`，老实物 `templates/food_ranking.html` 对照）。
 *
 * 服务页面类：③ 横向排行榜页（`t425-融合基准.md` §五 的 ③ 列）。两条路共用一个文件：
 *   · `buildRankingDoc`——单榜一页（参数带 `category`）；
 *   · `buildAllRankingsDoc`——全榜一页（不给 `category`），五类榜的全景（老实物「一张表一族」的做法）。
 *
 * 老实物逐条对照（`t425` §二 ③ 类那四条）：
 *   23 五类榜共用一套渲染函数，表头与取数按类别查表 → `RANK_METRIC` ＋ `columnsOf()` 一处定列序，
 *      21 条词不写 21 份版式；
 *   24 名次前三金银铜圆章 ＋ 手机端左侧色条 → `MEDAL`（金／银／铜三个字形，页面正文不写色值）
 *      ＋ 本件 `RANK_CSS` 里那一处 `.r1／.r2／.r3` 左边条（**三个色值全族只此一份**）；
 *   25 营养结构一条三段堆叠条 ＋ 文字百分比（图文互为兜底）→ 表内「营养结构」列给文字百分比，
 *      表下「营养结构」块给同数据的三段堆叠条（色取公共层 `CHART_PALETTE` 前三位，与老实物逐色一致）；
 *   26 无数据页签不显示；列表空给占位列 → 全榜页只给**有数据**的榜出折叠块，本窗空的几类在读数卡
 *      与口径行里点名（不拿空榜冒充有数据）；表空走 `renderDataTable` 的 `emptyText` 占位。
 *
 * 融合口径（`t425` 裁定 1／2／2-补／3／4／5／7 与 §五 的区块次序）：
 *   ① 眉标只写人话归属（命令键不上屏，也过不了 `docPage.ts` 的标识符筛）；
 *   ② 结论句走副标题槽（句内含本页读数），与来源脚注一样是普通小字行、都不走深底块；
 *   ③ 页内导航 ＋ 口径说明行 ＋ 来源脚注三条恒出，全走公共层区块；
 *   ④ 缺值一律 `—`；⑤ 零值不画条身；
 *   ⑦ 复制区双按钮（数据三格式菜单 ＋ 日志六段，**第 4 段「调用链」＝本次命令原文**）。
 *
 * 取数不住本件（`diet/rankingPlate.ts` 给盘，`diet/ranking.ts` 调本件）；本层不查库、不返空。
 */
import {
  renderCaliberLine,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderTocBlock,
} from 'base-paint/blocks';
import { CHART_PALETTE, escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import type { DataTableColumn } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine } from '../shared/writeParts.js';
import { nowStamp } from '../render/receipt.js';
import type { FoodRanking, RankItem } from './dietEngine.js';
import type { AllRankings } from './rankingPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

/** 人话眉标（裁定 1：这一行写归属，不写命令键）。 */
const EYEBROW = '饮食 · 排行榜';

/** 来源脚注上给**读者看**的来源名（库表名只留在复制日志的「来源」段里，那是给复核的人照抄的技术原件）。 */
const SOURCE = '饮食记录';

/** 缺值口径（裁定 4）：可见文本一律 `—`，不写 0、不写空串、不拿缺省值顶替。 */
const MISS = '—';

/** 名次前三的金／银／铜（裁定 8 把「配色单源」判给公共层，故这里用字形、不写色值）。 */
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** 榜名（读者看到的那一个名字，**五处共用一处**：单榜页的读数卡与页题、全榜页的五张卡与折叠标题）。
 *
 *  #511 · `frequent` 原写「常吃」，同页另外两处写「频繁吃榜」（表题，来自 `dietEngine.ts` 的
 *  `RANK_TITLES`）与「频繁吃」（页题）——一页三个名字（审查件第 59 条）⇒ 统一成「常吃榜」。
 *  名字里带上「榜」字，下游不再各自拼一次（原来全榜页靠 `+ '榜'` 拼，改名单就会拼出「常吃榜榜」）。 */
const RANK_ZH: Record<string, string> = {
  high_calorie: '高热量榜', low_calorie: '低热量榜', frequent: '常吃榜', high_carb: '高碳水榜', high_protein: '高蛋白榜',
};

/** 一类榜的主指标（**主指标永远排在食物名之后的第一列**）：名字、单位、取值一处定死。 */
interface RankMetric { readonly label: string; readonly unit: string; readonly of: (it: RankItem) => number }

const RANK_METRIC: Record<string, RankMetric> = {
  high_calorie: { label: '总热量', unit: '卡', of: (it) => it.totalCal },
  low_calorie: { label: '总热量', unit: '卡', of: (it) => it.totalCal },
  frequent: { label: '次数', unit: '次', of: (it) => it.cnt },
  high_carb: { label: '总碳水', unit: '克', of: (it) => it.totalCarbs },
  high_protein: { label: '总蛋白', unit: '克', of: (it) => it.totalProtein },
};

const metricOf = (cat: string): RankMetric => RANK_METRIC[cat] ?? RANK_METRIC.high_calorie;
const nameOf = (cat: string): string => RANK_ZH[cat] ?? cat;
const textOf = (it: RankItem, m: RankMetric): string => m.of(it) + ' ' + m.unit;

/** 头名那一句话（读数卡、折叠标题、结论句**共用一处**，免得三处各写一遍又走散）：
 *  常吃榜的主指标就是次数，说「吃了 N 次」；其余说「<指标> N <单位>，共 M 次」。 */
function headPhrase(it: RankItem, cat: string): string {
  if (cat === 'frequent') return '吃了 ' + it.cnt + ' 次';
  const m = metricOf(cat);
  return m.label + ' ' + textOf(it, m) + '，共 ' + it.cnt + ' 次';
}

/** 表列（老实物 `CATEGORIES` 的 thead 逐类查表）：**列序即标签序、值一律按标签对齐**。
 *
 *  老实物把列序写成了通用的一套，于是高蛋白榜的「总热量」被挤到第 5 列、且第四／五列的值与标签错位
 *  （`food_ranking.html:243-247` 与 `:308-310` 对照，`t425` §二-补 反面清单）——这里按类查表，
 *  六列形状不变，主指标固定第 3 列，且**同类指标不重复出列**（常吃榜的主指标就是次数）。
 *
 *  五类的列序逐条：高热量／低热量＝排名｜食物｜总热量｜次数｜餐均｜营养结构；
 *  常吃＝排名｜食物｜次数｜总热量｜餐均｜营养结构；高碳水／高蛋白＝排名｜食物｜总碳水（总蛋白）｜次数｜总热量｜营养结构。 */
function columnsOf(cat: string): DataTableColumn[] {
  const m = metricOf(cat);
  const cols: DataTableColumn[] = [
    { key: 'rank', label: '排名', align: 'right' },
    { key: 'food', label: '食物' },
    { key: 'metric', label: m.label, align: 'right' },
  ];
  if (cat === 'frequent') {
    cols.push({ key: 'cal', label: '总热量', align: 'right' }, { key: 'avg', label: '餐均', align: 'right' });
  } else if (cat === 'high_carb' || cat === 'high_protein') {
    cols.push({ key: 'cnt', label: '次数', align: 'right' }, { key: 'cal', label: '总热量', align: 'right' });
  } else {
    cols.push({ key: 'cnt', label: '次数', align: 'right' }, { key: 'avg', label: '餐均', align: 'right' });
  }
  cols.push({ key: 'nutri', label: '营养结构' });
  return cols;
}

/** 营养结构：三大营养素按每克 4／4／9 千卡折算成**热量占比**（老实物 `:296-299` 同口径）；
 *  总量为 0 的那几条（如「水」）返 `null` ＝ 不画条、文字位置写 `—`（裁定 4／5：零值不画柱身）。 */
function nutriOf(it: RankItem): { p: number; c: number; f: number } | null {
  const total = it.totalProtein * 4 + it.totalCarbs * 4 + it.totalFat * 9;
  if (total <= 0) return null;
  const p = Math.round((it.totalProtein * 4 / total) * 100);
  const c = Math.round((it.totalCarbs * 4 / total) * 100);
  /* 脂吃余数（老实物三段各自四舍五入，三段可能加到 101% 把条撑出格）⇒ 这里恒好 100%。 */
  return { p, c, f: 100 - p - c };
}

const nutriText = (it: RankItem): string => {
  const n = nutriOf(it);
  return n === null ? MISS : '蛋白 ' + n.p + '%｜碳水 ' + n.c + '%｜脂肪 ' + n.f + '%';
};

/** 名次写法：前三带金银铜章（老实物桌面圆章／手机左色条那一处信息），其余只给名次数字。 */
const rankText = (rank: number): string => (MEDAL[rank] === undefined ? String(rank) : MEDAL[rank] + ' ' + rank);

/** 一行表数据（列由 `columnsOf()` 挑，多余的键不出现）。 */
function rowOf(it: RankItem, cat: string): Record<string, string> {
  const m = metricOf(cat);
  return {
    rank: rankText(it.rank),
    food: it.foodName,
    metric: textOf(it, m),
    cnt: it.cnt + ' 次',
    cal: it.totalCal + ' 卡',
    avg: it.avgCalPerMeal + ' 卡/餐',
    nutri: nutriText(it),
  };
}

/** 页内小件的形状与色值（本族唯一一份；正文里不再写第二处色）。
 *  三段堆叠条三色取公共层 `CHART_PALETTE` 的 1／2／3 位（蓝／绿／橙，与老实物 `.nutri-bar` 逐色一致）；
 *  名次前三的左边条三色取老实物手机端同一处（金 `#f5b301`／银 `#a8a8ad`／铜 `#c77b3f`）。 */
const RANK_CSS = '<style>'
  + '.ilife-block-rank-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);position:relative}'
  + '.ilife-block-rank-row:last-child{border-bottom:none}'
  + '.ilife-block-rank-no{flex:0 0 2.4em;text-align:right;color:var(--fg2);font-size:13px}'
  + '.ilife-block-rank-name{flex:1 1 auto;min-width:0;word-break:break-all;font-weight:600}'
  + '.ilife-block-rank-bar{flex:0 0 120px;display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--bg)}'
  + '.ilife-block-rank-seg{height:100%}'
  + '.ilife-block-rank-pct{flex:0 0 auto;font-size:12px;color:var(--fg2)}'
  + '.ilife-block-rank-h2{font-size:14px;font-weight:600;margin:0 0 4px}'
  + '.ilife-block-rank-row.r1,.ilife-block-rank-row.r2,.ilife-block-rank-row.r3{padding-left:10px}'
  + '.ilife-block-rank-row.r1::before,.ilife-block-rank-row.r2::before,.ilife-block-rank-row.r3::before'
  + "{content:'';position:absolute;left:0;top:6px;bottom:6px;width:3px;border-radius:2px}"
  + '.ilife-block-rank-row.r1::before{background:#f5b301}'
  + '.ilife-block-rank-row.r2::before{background:#a8a8ad}'
  + '.ilife-block-rank-row.r3::before{background:#c77b3f}'
  + '@media (max-width:820px){.ilife-block-rank-bar{flex-basis:72px}.ilife-block-rank-pct{font-size:11px}}'
  + '</style>';

/** 营养结构块（老实物 `.nutri-bar` 一条三段堆叠条 ＋ `.nutri-meta` 文字百分比）：一行一种食物，
 *  图文同格互为兜底；前三名的行带金银铜章与左色条。 */
function nutriBlock(items: readonly RankItem[]): string {
  if (items.length === 0) return '';
  const rows = items.map((it) => {
    const n = nutriOf(it);
    const cls = 'ilife-block-rank-row' + (it.rank <= 3 ? ' r' + it.rank : '');
    const bar = n === null ? '' : '<span class="ilife-block-rank-bar" role="img" aria-label="'
      + escapeHtml(nutriText(it)) + '">'
      + '<span class="ilife-block-rank-seg" style="width:' + n.p + '%;background:' + CHART_PALETTE[0] + '"></span>'
      + '<span class="ilife-block-rank-seg" style="width:' + n.c + '%;background:' + CHART_PALETTE[1] + '"></span>'
      + '<span class="ilife-block-rank-seg" style="width:' + n.f + '%;background:' + CHART_PALETTE[2] + '"></span>'
      + '</span>';
    return '<div class="' + cls + '">'
      + '<span class="ilife-block-rank-no">' + escapeHtml(rankText(it.rank)) + '</span>'
      + '<span class="ilife-block-rank-name">' + escapeHtml(it.foodName) + '</span>'
      + bar
      + '<span class="ilife-block-rank-pct">' + escapeHtml(nutriText(it)) + '</span>'
      + '</div>';
  }).join('');
  return '<h2 class="ilife-block-rank-h2">营养结构（按热量占比）</h2>' + rows;
}

/** 页内锚点清单 → 公共层页内导航（锚点与正文同一份清单派生，不手抄第二份 id）。 */
function tocOf(items: ReadonlyArray<{ id: string; text: string }>): string {
  return renderTocBlock({ items: items.map((i) => ({ id: i.id, text: i.text })) });
}

/** 复制区（两页共用）：数据走三格式菜单，日志六段齐、第 4 段＝本次命令原文（裁定 7）。 */
function docCopy(env: SerializableEnvelope, command: string): string {
  return copyArea({
    title: '复制榜单',
    data: { envelope: env },
    log: { envelope: env, copyLog: copyLog({ command, source: SOURCE, actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/** 结论句（裁定 2：紧跟标题、句内含本页至少一个读数）。 */
function oneLine(cat: string, r: FoodRanking): string {
  const top = r.items[0];
  if (top === undefined) return '本窗 ' + r.start + ' ~ ' + r.end + ' 里没有可上榜的食物：' + MISS + '。';
  return '本窗 ' + r.items.length + ' 种食物上榜，头名「' + top.foodName + '」：' + headPhrase(top, cat) + '。';
}

/** 单榜页：读数卡 → 营养结构 → 榜单表 → 口径行 → 复制区 → 来源脚注。 */
export function buildRankingDoc(r: FoodRanking, cmd?: string): string {
  const cat = r.category;
  const m = metricOf(cat);
  const top = r.items[0];
  const sum = r.items.reduce((acc, it) => acc + m.of(it), 0);
  const env: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.ranking',
    data: {
      items: r.items.map((it) => ({
        rank: it.rank, foodName: it.foodName, totalCal: it.totalCal, cnt: it.cnt, avgCalPerMeal: it.avgCalPerMeal,
      })),
      total: r.items.length,
    },
  };
  const kpis = renderKpiGrid([
    { label: nameOf(cat), value: String(r.items.length), unit: '种', detail: '窗口 ' + r.start + ' ~ ' + r.end },
    {
      label: '头名', value: top === undefined ? MISS : top.foodName,
      detail: top === undefined ? '本窗无上榜食物' : headPhrase(top, cat),
    },
    { label: '上榜' + m.label, value: String(sum), unit: m.unit, detail: '前 ' + r.items.length + ' 名合计' },
  ]);
  const table = renderDataTable({
    columns: columnsOf(cat),
    rows: r.items.map((it) => rowOf(it, cat)),
    caption: r.title,
    emptyText: '本窗没有可上榜的食物（记一餐之后再看这张榜）',
  });
  const content = [
    RANK_CSS,
    tocOf([{ id: 'sec-kpi', text: '上榜速览' }, { id: 'sec-nutri', text: '营养结构' }, { id: 'sec-table', text: '榜单明细' }]),
    '<section id="sec-kpi">' + kpis + '</section>',
    '<section id="sec-nutri">' + nutriBlock(r.items) + '</section>',
    '<section id="sec-table">' + table + '</section>',
    renderCaliberLine('口径：表里一行是一种食物，热量、碳水、蛋白都是窗口内同名记录的合计；'
      + '营养结构按每克蛋白 4 千卡、碳水 4 千卡、脂肪 9 千卡折算成热量占比；'
      + '零值不画条，缺值一律写 ' + MISS + '；条数＝上榜食物数。'),
    docCopy(env, cmd ?? commandLine('calorie.view.ranking', { category: cat })),
    sourceLine({ source: SOURCE, start: r.start, end: r.end, count: r.items.length }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '排行 ' + nameOf(cat) + ' ' + r.start + ' ~ ' + r.end,
    eyebrow: EYEBROW,
    subtitle: oneLine(cat, r),
    content,
  });
}

/** 全榜页：五类榜各一张读数卡 ＋ 有数据的那几类各一个折叠明细（老实物「一张表一族」的做法）。 */
export function buildAllRankingsDoc(a: AllRankings, cmd?: string): string {
  const cats = Object.keys(a.boards) as Array<keyof typeof a.boards>;
  const live = cats.filter((c) => a.boards[c] !== null);
  const empty = cats.filter((c) => a.boards[c] === null);
  const total = live.reduce((acc, c) => acc + (a.boards[c] as FoodRanking).items.length, 0);
  const env: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.ranking',
    data: { metrics: { okCount: a.okCount, topN: a.topN, foods: total } },
  };
  const kpis = renderKpiGrid(cats.map((c) => {
    const b = a.boards[c];
    const m = metricOf(c);
    if (b === null || b.items.length === 0) return { label: nameOf(c), value: MISS, detail: '本窗无数据' };
    const top = b.items[0];
    return {
      label: nameOf(c), value: top.foodName,
      detail: headPhrase(top, c) + '｜本窗 ' + b.items.length + ' 种',
    };
  }));
  const boards = live.map((c) => {
    const b = a.boards[c] as FoodRanking;
    const top = b.items[0];
    return renderDisclosure({
      title: nameOf(c) + '（' + b.items.length + ' 种，头名 ' + top.foodName + '：' + headPhrase(top, c) + '）',
      open: c === live[0],
      contentHtml: renderDataTable({
        columns: columnsOf(c),
        rows: b.items.map((it) => rowOf(it, c)),
        caption: b.title,
        emptyText: '本窗没有可上榜的食物（记一餐之后再看这张榜）',
      }),
    });
  }).join('');
  const head = live.length === 0 ? '' : '；' + nameOf(live[0]) + '的头名「'
    + (a.boards[live[0]] as FoodRanking).items[0].foodName + '」（'
    + headPhrase((a.boards[live[0]] as FoodRanking).items[0], live[0]) + '）';
  const content = [
    tocOf([{ id: 'sec-kpi', text: '五类榜速览' }, { id: 'sec-boards', text: '逐榜明细' }]),
    '<section id="sec-kpi">' + kpis + '</section>',
    '<section id="sec-boards">' + boards + '</section>',
    renderCaliberLine('口径：五类榜同一个窗口、同一套取数口径；每类榜的列序按榜单类查表，主指标排在食物名之后第一列；'
      + (empty.length === 0 ? '本窗五类榜都有数据。' : '本窗没有数据的榜不出明细块：' + empty.map(nameOf).join('、') + '。')),
    docCopy(env, cmd ?? commandLine('calorie.view.ranking', {})),
    sourceLine({ source: SOURCE, start: a.start, end: a.end, count: total }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '全部排行 ' + a.start + ' ~ ' + a.end,
    eyebrow: EYEBROW,
    subtitle: '五类榜里 ' + a.okCount + ' 类本窗有数据，合计 ' + total + ' 种食物上榜' + head + '。',
    content,
  });
}
