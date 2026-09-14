/** #370 · 主页整页装配的归位件（HELP 一级分组「主页」下一级「看今日主页」）。
 *
 * 自 `src/render/html.ts` **逐字迁入** `renderHomeHtml`（纯搬迁，行为不变）；
 * `src/render/html.ts` 里那一段已删。
 *
 * #371 · 今日总览族 5 词切完整文档：新增 `buildHomeDoc`（结果型完整文档，
 * 经 `assembleDocPage` 包裹，复用 `copyArea`，不自造模板）；live 出口
 * （`src/home/today.ts` 的 `calorie.view.home`）改走 `buildHomeDoc`。
 * 旧 `renderHomeHtml` 片段保留：`render-t8` 锁定旧片段形状，不走 live 出口。
 *
 * #375 · 横幅通知条返修（只动本文件横幅两段，其余装配与接线口径不动）：
 * 提示 toast 保持原样（dismiss 走 `✓ 知道了`）；其下复制区去掉与按钮同字的
 * 标题（只留动作不留说明文本），并补上 `log` 使「复制数据 ▾ ＋ 复制日志」
 * 双按钮同行（此前无 `log`，日志位是点不动的禁用态）；日志里的命令补全窗口参数。
 *
 * #401 · 两处返修（照 `docs/skills/skill-calorie/t401-融合设计.md` 第三节冲突 4 的裁决）：
 * 1. **深底提示条退场**：不再调 `notice()`（它出的是瞬时浮层形态的提示条，当常驻块用就是错位）；
 *    那句结论保留，改成紧贴副题行的一行结论小字（类名取共享页面模板里副题行同一个，
 *    字号与颜色都在公共层，页面本地不写），读序＝标题 → 一句结论 → 数字卡。
 * 2. **折线跨空白日连线**：`options` 补 `connectNulls: true`（与 #160／`0da6472` 另外 4 处同口径）；
 *    无记录日仍是 `null`、不补 0，只是抬笔处不再断段。
 *
 * #401c · 整页融合返修（**本页先做样板，其余 8 页认可后再铺**）。两条硬口径：
 * ① **文本纪律**（裁定 1／`t425-融合基准.md:129`：「参数名、常量名、英文内部标识符一律不上屏」）——
 *    眉标不再印命令键（原为 `calorie.view.home · 主页`），表头不再印 `TDEE`，KPI 卡说明不再印
 *    `正=缺口（TDEE＋运动－摄入）`；换成读者看得懂的中文。判据见 `test/t401c-页面机器话探针.test.mjs`。
 * ② **版面单源**（`shared/sourceLine.ts:8-9`：「本件不写色、不写字号——版面单源住 `packages/base-render/`」）——
 *    旧 `renderHomeHtml` 那套手抄 `<style>`（KPI 值手写 28px、深色 token）**只`render-t8` 在用**，
 *    生产出口（`calorie.view.home`）走本文件的 `buildHomeDoc`，本章一律走公共层产出器：
 *    数字卡 `renderKpiGrid`（值 22px／tnum／`align-items:baseline` 都在 `blocks.ts:1384-1403`）、
 *    表 `renderDataTable`、折线 `renderChartBlock`、页内导航 `renderTocBlock`、
 *    口径句 `renderCaliberLine`。**本页不再出现任何一条自写 `font-size`／`color` 规则。**
 *
 * 视觉升级只取「已冻结 token ＋ 已支持 API」里那几项：KPI 卡状态徽章（`renderKpiCard` 的 `status`）、
 * 区块标题带图标、结论条专属浅色面、页内导航胶囊排。**KPI 卡完成度条本属票 #418**（公共层增量），
 * 本样板**不做条**——不用自造进度条去顶 #418 的位（`t425` 裁定 6「条位与档位色只准有一处」）。
 */
import { cx, escapeHtml, token } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { renderCaliberLine, renderChartBlock, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { sourceLine } from '../shared/sourceLine.js';
import { nowStamp } from '../render/receipt.js';
import type { HomeData } from './home.js';

function pageShell(skill: string, slot: string, title: string, body: string): string {
  return (
    '<section class="' + cx('page') + '" data-skill="' + escapeHtml(skill) + '" data-slot="' + escapeHtml(slot) + '"' +
    ' style="background:' + token('bg') + ';color:' + token('fg') + ';border:1px solid ' + token('border') +
    ';border-radius:' + token('radius') + 'px;padding:' + token('gap') + 'px;font-size:' + token('fontSize') + 'px">' +
    '<h1 class="' + cx('title') + '" style="color:' + token('fg') + '">' + escapeHtml(title) + '</h1>' + body + '</section>'
  );
}

function kpi(label: string, value: string, sub?: string): string {
  return (
    '<div class="' + cx('kpi') + '" style="border:1px solid ' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<span class="' + cx('kpi-label') + '" style="color:' + token('muted') + '">' + escapeHtml(label) + '</span>' +
    '<b class="' + cx('kpi-value') + '">' + escapeHtml(value) + '</b>' +
    (sub ? '<span class="' + cx('kpi-sub') + '" style="color:' + token('muted') + '">' + escapeHtml(sub) + '</span>' : '') + '</div>'
  );
}

function bar(label: string, pct: number | null): string {
  const p = pct === null || pct === undefined ? '未设目标' : pct + '%';
  const w = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  return (
    '<div class="' + cx('bar') + '"><span style="color:' + token('muted') + '">' + escapeHtml(label) + ' ' + escapeHtml(p) + '</span>' +
    '<div style="background:' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<div style="width:' + w + '%;background:' + token('accent') + ';border-radius:' + token('radius') + 'px">&nbsp;</div></div></div>'
  );
}

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return String(n) + suffix;
}

export function renderHomeHtml(d: HomeData): string {
  const t = d.daily.totals;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('今日摄入', fmt(t.cal, ' 卡'), '目标 ' + fmt(d.calorieGoal, ' 卡')) +
    kpi('蛋白', fmt(t.pro, ' g')) +
    kpi('饮水', fmt(d.daily.waterMl, ' ml'), '目标 ' + fmt(d.waterGoal, ' ml')) +
    kpi('今日缺口', fmt(d.deficitToday, ' 卡'), '正=缺口') +
    kpi('连续记录', d.streakDays + ' 天', '近' + d.week.loggedDays + '天有记录') +
    kpi('周均摄入', fmt(d.week.avgIntake, ' 卡'), d.week.start + ' ~ ' + d.week.end) +
    '</div>' +
    bar('热量完成度', d.caloriePct) + bar('蛋白完成度', d.proteinPct) + bar('饮水完成度', d.waterPct) +
    (d.daily.overCal
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">今日已超热量目标</div>'
      : '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">热量在目标内</div>');
  return pageShell('calorie', 'ilife:calorie', '今日总览 ' + d.date, body);
}

/* ── #371 · 主页完整文档（今日总览族 5 词共用同一组装配）；#401c 整页融合返修 ── */

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·主页';

/** envelope 头（值冻结对齐 `cli/keys.ts` ENVELOPE_VERSION 与 CALORIE_SKILL）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页头眉标（人话）：`t425` 裁定 1 禁上屏英文内部标识符，故这里是「域 · 页面」而不是命令键
 *  （旧写法 `calorie.view.home · 主页` 把内部命令键直接印给了读者）。 */
const HOME_EYEBROW = '卡路里 · 主页';

/** 页内导航的锚点 id 与区块标题图标（同一份清单供导航与正文用，锚点不会指到不存在的 id）。 */
const SEC_OVERVIEW = 'sec-overview';
const SEC_TREND = 'sec-trend';
const SEC_DAILY = 'sec-daily';
const SEC_COPY = 'sec-copy';
const ICON_OVERVIEW = '🔥';
const ICON_TREND = '📈';
const ICON_DAILY = '📊';
const ICON_COPY = '💰';

/** 来源脚注上给**读者看**的来源名：可见文本零 snake_case（库表名只留在复制日志的「来源」段里，
 *  那是给复核的人照抄用的技术原件，不上页面——同 `render/sportDocs.ts:54-57` 口径）。 */
const SOURCE_LOGGED = '饮食记录 ＋ 运动记录 ＋ 每日目标';

/** 完成度 → 档位徽章（四档 `STATUS_KINDS`；文案随档给，不印状态机里的英文枚举——
 *  `STATUS_DEFAULT_TEXT` 是「成功／警告／失败／无数据」，那是控件缺省值，页面自己给业务说法）。
 *  档位取自 `renderKpiCard` 已支持的 `status`（`blocks.ts:533-539`），**没有目标就不给徽章**——
 *  没目标可比的读数摆一枚「无数据」徽章是假信息，不如不出。 */
function pctStatus(pct: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (pct === null || pct === undefined) return null;
  if (pct >= 90) return { status: 'ok', statusText: '达标' };
  if (pct >= 60) return { status: 'warn', statusText: '接近目标' };
  return { status: 'danger', statusText: '偏少' };
}

/** 完成度读数：缺目标写 `—`（不拿 0 顶、不拿「未设目标」顶，`t425` 裁定 4 的缺值口径）。 */
function pctText(pct: number | null | undefined): string {
  return pct === null || pct === undefined ? '—' : String(pct) + '%';
}

/** KPI 卡说明行：`目标 X · 完成度 Y`（缺目标时只写「未设目标」，不拼半截读数）。 */
function goalDetail(pct: number | null | undefined, goal: number | null | undefined, unit: string): string {
  if (goal === null || goal === undefined) return '未设目标';
  return '目标 ' + goal + ' ' + unit + ' · 完成度 ' + pctText(pct);
}

/** 页头窗口词：本页名如实写**本唤醒词的窗口**（同一命令键带不同 `windowDays`）——窗口是
 *  「到今日为止的 N 天」不是日历周／月，故按天数直说「今日／近 N 天」，不写「本周／本月」
 *  那种会与日历口径打架的词，也不四页共用一个「今日总览」。 */
function windowName(days: number): string {
  return days <= 1 ? '今日总览' : '近 ' + days + ' 天总览';
}

/** 页头副题：窗口区间在这条出现**一次**（本页唯一写全区间的地方，口径句只写「窗内」）。 */
function subtitleText(d: HomeData): string {
  const g = d.week.windowDays <= 1 ? '当日' : '窗内';
  return d.week.start + ' ~ ' + d.week.end + ' · ' + g + '有记录 ' + d.week.loggedDays + ' 天 · 连续 ' + d.streakDays + ' 天';
}

/** 页首结论句（读序＝标题 → 一句结论 → 数字卡）：只给判定与「还能吃／已超」一个读数，
 *  **不复述摄入与目标**（那两个数在同排 KPI 卡里，复述即冗余）；算式归下方口径句。 */
function conclusionText(d: HomeData): string {
  const cal = d.daily.totals.cal;
  const goal = d.calorieGoal;
  if (goal === null || goal === undefined) return '热量目标还没有，先在「定营养目标」里设一个。';
  const left = goal - cal;
  return left < 0
    ? '今日已超热量目标 ' + -left + ' 卡，明天把摄入压回目标内。'
    : '热量在目标内，还能吃 ' + left + ' 卡。';
}

/** 结论条（专属浅色面，老实物 `.view-summary`＝浅蓝底＋主色字，`home_dashboard.html:568-571`）。
 *  色值只引**冻结 token**（`style.ts:12-24` 的 11 个），一个色值字面量都不写：底 `--soft`、
 *  字 `--blue2`（12px 以下小字压白底才要更深的同族色，14px 用 `--blue2` 5.6:1 富余）、
 *  圆角 14px（闭集 `{8,14,20,999,50%}` 里的中档）。 */
const CONCLUSION_STYLE = 'margin:0 0 16px;padding:12px 16px;border-radius:14px;'
  + 'background:var(--soft);color:var(--blue2);font-weight:600';

/** 结论条文案固定带 💡（一行结论句的视觉锚），故在词表末尾再补一个不同字形。 */
const CONCLUSION_TEXT = (d: HomeData): string => '💡 ' + conclusionText(d);

/** `calorie.view.home` · 今日总览族 5 词的结果型完整文档（`<!doctype html>` 起）。 */
export function buildHomeDoc(d: HomeData): string {
  const t = d.daily.totals;
  const windowDays = d.week.windowDays;
  const range = d.week.start + ' ~ ' + d.week.end;
  const cards: KpiCardInput[] = [
    {
      label: '今日摄入', value: fmt(t.cal), unit: '卡',
      detail: goalDetail(d.caloriePct, d.calorieGoal, '卡'), ...(pctStatus(d.caloriePct) ?? {}),
    },
    {
      label: '蛋白', value: fmt(t.pro), unit: '克',
      detail: '完成度 ' + pctText(d.proteinPct), ...(pctStatus(d.proteinPct) ?? {}),
    },
    {
      label: '饮水', value: fmt(d.daily.waterMl), unit: '毫升',
      detail: goalDetail(d.waterPct, d.waterGoal, '毫升'), ...(pctStatus(d.waterPct) ?? {}),
    },
    {
      label: '今日缺口', value: fmt(d.deficitToday), unit: '卡',
      detail: '摄入比消耗少这么多，正数是缺口',
    },
    {
      label: '连续记录', value: String(d.streakDays), unit: '天',
      detail: '窗内有记录 ' + d.week.loggedDays + '/' + windowDays + ' 天',
    },
    {
      label: '周均摄入', value: fmt(d.week.avgIntake), unit: '卡',
      detail: '只算有记录的天',
    },
  ];
  // 区块标题带图标（`blocks.ts:655-657` 的 `title` 位；老实物每块都带，`home_dashboard.html:623-649`）。
  const sections: string[] = [
    '<section id="' + SEC_OVERVIEW + '"><h2 class="ilife-block-kpi-card-title">' + ICON_OVERVIEW + ' 今日速览</h2>'
      + renderKpiGrid(cards) + '</section>',
  ];
  let charts = false;
  const loggedDays = d.week.series.filter((s) => s.calories !== null && s.calories !== undefined);
  if (loggedDays.length > 0) {
    sections.push('<section id="' + SEC_TREND + '">' + renderChartBlock({
      kind: 'line',
      title: ICON_TREND + ' 每日摄入',
      input: {
        items: d.week.series.map((s) => ({ label: s.date.slice(5), value: s.calories })),
        options: {
          /* #401：空白日不补 0、只连线——没有记录的日期是 `null`，折线默认在 `null` 处抬笔断段，
             稀疏记录会只剩孤点（口径同 #160／`0da6472` 另外 4 处调用点）。 */
          connectNulls: true,
          markLine: { value: d.week.avgIntake ?? undefined, label: '周均' },
        },
      },
      // 口径句走公共层 `renderCaliberLine`（`t425` 裁定 3）：只留「留空不断 0」这条事实，
      // 窗口区间归页头一处（旧 caption 把区间又抄了一遍）。
    }) + renderCaliberLine('无记录的日子留空、不按 0 算，折线在那些天连过去不断段。') + '</section>');
    charts = true;
  }
  sections.push('<section id="' + SEC_DAILY + '">' + renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'cal', label: '摄入', align: 'right' },
      { key: 'deficit', label: '缺口', align: 'right' },
      { key: 'goal', label: '目标', align: 'right' },
    ],
    // 倒序＝最近的一天在最上（老实物明细表同此序）；空记录日不补 0，整行空着。
    rows: d.week.series.slice().reverse().map((s) => ({
      date: s.date, cal: s.calories, deficit: s.deficit, goal: s.calorieGoal,
    })),
    caption: ICON_DAILY + ' 按日汇总（单位：卡）',
    emptyText: '本窗无按日汇总',
  }) + renderCaliberLine('窗内每天一行，没有记录的那天留空、不当 0 算；缺口＝消耗 − 摄入，正数是缺口。') + '</section>');
  // #401 · 这里原有一条 `notice({…})` 深底提示条，已撤（裁决见件头与
  // `docs/skills/skill-calorie/t401-融合设计.md` 第三节冲突 4）：结论句改由页首那行结论小字说。
  // #375 · 复制区：不给 `title`（与按钮同字的标题不出，只留动作）；
  // `data`（业务数据文本）＋ `log`（运行日志文本）双双在场＝双按钮同行。
  // 日志第 3 段写「本页命令原文」：窗口非缺省 7 天时把窗口写全，照抄重跑得到同一张页
  // （命令行形状逐字照 `home/routes.ts` 里本族 3 条唤醒词）。
  const homeCmd = windowDays === 7
    ? 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\''
    : 'calorie-cmd-read calorie.view.home --params \'{"windowDays":' + windowDays + ',"date":"今日"}\'';
  const homeMetrics = metricsOf({
    calorieGoal: d.calorieGoal, waterGoal: d.waterGoal,
    caloriePct: d.caloriePct, proteinPct: d.proteinPct, waterPct: d.waterPct,
    deficitToday: d.deficitToday, streakDays: d.streakDays,
    intakeCal: t.cal, proteinG: t.pro, carbsG: t.carbs, fatG: t.fat,
    waterMl: d.daily.waterMl, entryCount: d.daily.entryCount,
    avgIntake: d.week.avgIntake, avgDeficit: d.week.avgDeficit, loggedDays: d.week.loggedDays,
  });
  const copy = copyArea({
    data: {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.home',
        data: { metrics: homeMetrics },
      },
    },
    log: {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.home',
        data: { metrics: homeMetrics },
      },
      copyLog: copyLog({
        command: homeCmd,
        source: SOURCE_LOGGED + '（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  });
  sections.push('<section id="' + SEC_COPY + '"><h2 class="ilife-block-copy-block-title">' + ICON_COPY + ' 数据与日志</h2>' + copy + '</section>');
  // 页内导航走公共层 `renderTocBlock`（`t425` 裁定 3）：白底胶囊排，形态全在 `blocks.ts:1200-1216`；
  // 锚点清单与正文四个 `id` 逐字同源，不手抄第二份。
  // 承重例外：`--soft` 那处浅色面**不在**本页出现——它是结论条，见 `CONCLUSION_STYLE`。
  const content = [
    renderCaliberLine('缺数一律写 —；有记录才有数。'),
    '<p class="' + cx('block-page-shell-conclusion') + '" style="' + CONCLUSION_STYLE + '">'
      + escapeHtml(CONCLUSION_TEXT(d)) + '</p>',
    renderTocBlock({ items: [
      { id: SEC_OVERVIEW, text: '今日速览' },
      ...(charts ? [{ id: SEC_TREND, text: '每日摄入' }] : []),
      { id: SEC_DAILY, text: '按日汇总' },
      { id: SEC_COPY, text: '数据与日志' },
    ] }),
    sections.join(''),
    sourceLine({ source: SOURCE_LOGGED, start: d.week.start, end: d.week.end, count: d.week.loggedDays }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: windowName(windowDays),
    eyebrow: HOME_EYEBROW,
    subtitle: subtitleText(d),
    content,
    charts,
  });
}
