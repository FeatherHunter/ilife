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
 */
import { cx, escapeHtml, token } from 'base-paint';
import { renderChartBlock, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
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

/* ── #371 · 主页完整文档（今日总览族 5 词共用同一组装配） ── */

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·主页';

/** envelope 头（值冻结对齐 `cli/keys.ts` ENVELOPE_VERSION 与 CALORIE_SKILL）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

function pctText(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '未设目标';
  return String(pct) + '%';
}

/** #401 · 结论小字整句（文案逐字照样张 `t401-样张-今日总览.html` 的 `#sec-summary`）：
 *  判定一句 ＋ 摄入／目标／还能吃三个数与算式。**「目标」不与「缺口」并排**（口径归 #396，
 *  两个数基准不同，并排会被先做减法）；「还能吃」恒按「目标 − 已摄入」算，超了改写成「已超」。
 *  热量目标可空（`home.ts:63` 的三段兜底）⇒ 缺目标时不硬凑算式，只写判定与摄入。 */
function conclusionText(d: HomeData): string {
  const cal = d.daily.totals.cal;
  const goal = d.calorieGoal;
  const head = '💡 ' + (d.daily.overCal ? '今日已超热量目标' : '热量在目标内')
    + ' —— 摄入 ' + fmt(cal, ' 卡') + ' · 目标 ' + fmt(goal, ' 卡');
  if (goal === null || goal === undefined) return head;
  const left = goal - cal;
  return left < 0
    ? head + ' · 已超 ' + -left + ' 卡（＝ 已摄入 ' + cal + ' − 目标 ' + goal + '）'
    : head + ' · 还能吃 ' + left + ' 卡（＝ 目标 ' + goal + ' − 已摄入 ' + cal + '）';
}

/** `calorie.view.home` · 今日总览族 5 词的结果型完整文档（`<!doctype html>` 起）。 */
export function buildHomeDoc(d: HomeData): string {
  const t = d.daily.totals;
  const windowDays = d.week.series.length;
  const parts: string[] = [
    /* #401 · 结论小字排在最前（读序＝标题 → 一句结论 → 数字卡）。类名与共享页面模板里副题行那行
       同源（`blocks.ts:173` 的 `blockPart('pageShell','subtitle')`）：字号与颜色都随公共层，页面本地不写。
       副题位（`assembleDocPage` 的 `subtitle`）已被窗口那行占用，故取页身内最近的同一档小字位。 */
    '<p class="' + cx('block-page-shell-subtitle') + '">' + escapeHtml(conclusionText(d)) + '</p>',
    renderKpiGrid([
      { label: '今日摄入', value: fmt(t.cal), unit: '卡', detail: '目标 ' + fmt(d.calorieGoal, ' 卡') + ' · 完成度 ' + pctText(d.caloriePct) },
      { label: '蛋白', value: fmt(t.pro), unit: 'g', detail: '完成度 ' + pctText(d.proteinPct) },
      { label: '饮水', value: fmt(d.daily.waterMl), unit: 'ml', detail: '目标 ' + fmt(d.waterGoal, ' ml') + ' · 完成度 ' + pctText(d.waterPct) },
      { label: '今日缺口', value: fmt(d.deficitToday), unit: '卡', detail: '正=缺口（TDEE＋运动－摄入）' },
      { label: '连续记录', value: String(d.streakDays), unit: '天', detail: '窗口 ' + d.week.loggedDays + '/' + windowDays + ' 天有记录' },
      { label: '周均摄入', value: fmt(d.week.avgIntake), unit: '卡', detail: d.week.start + ' ~ ' + d.week.end },
    ]),
  ];
  let charts = false;
  const loggedDays = d.week.series.filter((s) => s.calories !== null && s.calories !== undefined);
  if (loggedDays.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日摄入',
      input: {
        items: d.week.series.map((s) => ({ label: s.date.slice(5), value: s.calories })),
        options: {
          /* #401：空白日不补 0、只连线——没有记录的日期是 `null`，折线默认在 `null` 处抬笔断段，
             稀疏记录会只剩孤点（口径同 #160／`0da6472` 另外 4 处调用点）。 */
          connectNulls: true,
          markLine: { value: d.week.avgIntake ?? undefined, label: '周均' },
        },
      },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'cal', label: '摄入', align: 'right' },
      { key: 'deficit', label: '缺口', align: 'right' },
      { key: 'tdee', label: 'TDEE', align: 'right' },
      { key: 'goal', label: '目标', align: 'right' },
    ],
    rows: d.week.series.map((s) => ({
      date: s.date, cal: s.calories, deficit: s.deficit, tdee: s.tdee, goal: s.calorieGoal,
    })),
    caption: '按日汇总（' + d.week.start + ' ~ ' + d.week.end + '，无记录日留空，不断 0）',
    emptyText: '本窗无按日汇总',
  }));
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
  parts.push(copyArea({
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
        source: 'food_log＋exercise_log＋daily_goal（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '今日总览 ' + d.date,
    eyebrow: 'calorie.view.home · 主页',
    subtitle: d.week.start + ' ~ ' + d.week.end + ' · 连续 ' + d.streakDays + ' 天 · ' + d.week.loggedDays + '/' + windowDays + ' 天有记录',
    content: parts.join(''),
    charts,
  });
}
