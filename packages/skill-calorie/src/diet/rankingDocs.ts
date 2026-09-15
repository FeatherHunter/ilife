/** #393 · 食品排行页装配（`calorie.view.ranking`，food_ranking.html 对照）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：③ 横向排行榜页。
 */
import { renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type { FoodRanking } from './dietEngine.js';
import type { AllRankings } from './rankingPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

/* ── 食品排行（food_ranking.html 对照：榜单表＋复制榜单；tab 交互归宿主，静态页逐榜/全榜直出） ── */

/** 榜名（读者看到的那一个名字，**五处共用一处**：单榜页的榜单卡与页题、全榜页的五张卡与五个折叠标题）。
 *
 *  #511 · `frequent` 原写「常吃」，同页另外两处写「频繁吃榜」（表题，来自 `dietEngine.ts` 的
 *  `RANK_TITLES`）与「频繁吃」（页题）——一页三个名字（审查件第 59 条）⇒ 统一成「常吃榜」。
 *  名字里带上「榜」字，下游不再各自拼一次（原来全榜页靠 `+ '榜'` 拼，改名单就会拼出「常吃榜榜」）。 */
const RANK_ZH: Record<string, string> = {
  high_calorie: '高热量榜', low_calorie: '低热量榜', frequent: '常吃榜', high_carb: '高碳水榜', high_protein: '高蛋白榜',
};

const RANK_COLUMNS: DataTableColumn[] = [
  { key: 'rank', label: '排名', align: 'right' },
  { key: 'food', label: '食物' },
  { key: 'cal', label: '总热量', align: 'right' },
  { key: 'cnt', label: '次数', align: 'right' },
  { key: 'avg', label: '餐均', align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
];

export function buildRankingDoc(r: FoodRanking): string {
  const top = r.items[0];
  const parts: string[] = [renderKpiGrid([
    { label: '榜单', value: RANK_ZH[r.category] ?? r.category, detail: r.start + ' ~ ' + r.end },
    { label: '上榜', value: String(r.items.length), unit: '种', detail: 'TOP ' + r.topN },
    {
      label: '头名', value: top ? top.foodName : '—',
      detail: top ? top.totalCal + ' 卡 · ' + top.cnt + ' 次 · 均 ' + top.avgCalPerMeal + ' 卡/餐' : '',
    },
  ])];
  parts.push(renderDataTable({
    columns: [...RANK_COLUMNS],
    rows: r.items.map((it) => ({
      rank: it.rank, food: it.foodName, cal: it.totalCal, cnt: it.cnt,
      avg: it.avgCalPerMeal, pro: it.totalProtein, carbs: it.totalCarbs, fat: it.totalFat,
    })),
    caption: r.title,
    emptyText: '本窗无排行数据',
  }));
  parts.push(dataCopyArea('复制榜单', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.ranking',
      data: {
        items: r.items.map((it) => ({
          rank: it.rank, foodName: it.foodName, totalCal: it.totalCal,
          cnt: it.cnt, avgCalPerMeal: it.avgCalPerMeal,
        })),
        total: r.items.length,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '排行 ' + (RANK_ZH[r.category] ?? r.category) + ' ' + r.start + ' ~ ' + r.end,
    eyebrow: '卡路里 · 饮食',
    /* #496 · 原副题「tab 切换归宿主：单榜直出（…）」是开发过程说明（审查件第 56、57、58 条）：
       「归宿主」是技术词，括号里还把榜单名与窗口区间又抄了一遍（页头标题已经写过）。整句删。 */
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}

export function buildAllRankingsDoc(a: AllRankings): string {
  const cats = Object.keys(a.boards) as Array<keyof typeof a.boards>;
  const parts: string[] = [renderKpiGrid(cats.map((c) => {
    const b = a.boards[c];
    if (!b || !b.items[0]) return { label: RANK_ZH[c] ?? c, value: '—', detail: '本窗无数据' };
    const top = b.items[0];
    return {
      label: RANK_ZH[c] ?? c, value: top.foodName + ' ' + top.totalCal + ' 卡', detail: 'TOP ' + b.topN,
    };
  }))];
  for (const c of cats) {
    const b = a.boards[c];
    parts.push(renderDisclosure({
      title: (RANK_ZH[c] ?? c) + (b ? '（TOP ' + b.topN + '）' : '（本窗无数据）'),
      open: b !== null && cats.indexOf(c) === cats.findIndex((k) => a.boards[k] !== null),
      contentHtml: renderDataTable({
        columns: [...RANK_COLUMNS],
        rows: (b ? b.items : []).map((it) => ({
          rank: it.rank, food: it.foodName, cal: it.totalCal, cnt: it.cnt,
          avg: it.avgCalPerMeal, pro: it.totalProtein, carbs: it.totalCarbs, fat: it.totalFat,
        })),
        caption: b ? b.title : '本窗无数据',
        emptyText: '本窗无数据',
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.ranking',
      data: { metrics: { okCount: a.okCount, topN: a.topN } },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '全部排行 ' + a.start + ' ~ ' + a.end,
    eyebrow: '卡路里 · 饮食',
    subtitle: a.start + ' ~ ' + a.end + ' · ' + a.okCount + '/5 榜有数据',
    content: parts.join(''),
    charts: false,
  });
}
