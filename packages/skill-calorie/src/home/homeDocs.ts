/** #370 · 主页整页装配的归位件（HELP 一级分组「主页」下一级「看今日主页」）。
 * 沿革（每票一行；逐条证据与读数见 `docs/skills/skill-calorie/t401-样板-文本结构-证据.md`）：
 * #370 自 `src/render/html.ts` **逐字迁入** `renderHomeHtml`（纯搬迁）——旧片段只给 `render-t8` 锁形状。
 * #371 新增 `buildHomeDoc`（结果型完整文档，经 `assembleDocPage` 包裹、复用 `copyArea`、不自造模板）；
 *   live 出口（`src/home/today.ts` 的 `calorie.view.home`）走它。
 * #375 横幅返修：提示 toast 原样；复制区去掉与按钮同字的标题并补 `log`，双按钮同行、日志命令补全窗口参数。
 * #401 ① 深底提示条退场（`notice()` 是瞬时浮层，当常驻块用就是错位）⇒ 那句结论保留成贴副题行的一行小字，
 *   读序＝标题 → 一句结论 → 数字卡；② 折线跨空白日连线（`connectNulls: true`，同 #160 另外 4 处口径；
 *   无记录日仍是 `null`、不补 0）。裁决见 `t401-融合设计.md` 第三节冲突 4。
 * #401c 整页融合返修（**本页先做样板，其余 8 页认可后再铺**）：① **文本纪律**（`t425-融合基准.md:129`
 *   「参数名、常量名、英文内部标识符一律不上屏」）——眉标不印命令键、表头不印 `TDEE`、卡说明不印算式，
 *   换成读者看得懂的中文，判据见 `test/t401c-页面机器话探针.test.mjs`；② **版面单源**（版面源只在
 *   `packages/base-render/`）：生产出口一律走公共层产出器——`renderKpiGrid`／`renderDataTable`／
 *   `renderChartBlock`／`renderTocBlock`／`renderCaliberLine`／`renderConclusionBar`，本页不写
 *   `font-size`／`color`；视觉升级只取已冻结 token 与已支持 API。**KPI 完成度条属票 #418**，本样板不做条。
 * #401 文本与结构返修（工单 `.scratch/sep-audit/报告.md`：8 处分隔符债 ＋ 冗余 R1–R9）：① 不用 `·`／`；`
 *   串并列事实（有记录／连续天数改页头胶囊 `renderChips`）；② 同一事实一页一处；③ KPI 六张减到四张。
 * #401e 页内文字修正（审查 `.scratch/t401d/review-ui/审查报告.md` #6／#7）：胶囊只说比例；页脚「窗内共 N
 *   条记录」整条删（那个 N 就是 `loggedDays`＝**天数**）；caption 去单位与目标、单位上表头；区间连接 `~`
 *   改「至」；括号只装所注文本自己的属性。
 * #507 结论条形状搬进公共层 `renderConclusionBar`；段标题三族同名同值由 `blocks.ts` 给（本页至此**真的**
 *   没有自写 `color`／`font-size` 了——此前那条自述与实现对不上）。
 *
 * #401g · 截图复审（81／100）页内六条返修（旧→新与读数见证据件第十二节）：
 * ① 缺口卡补**方向胶囊**（`deficitDirection`）——四卡里只有它没有目标，套完成率档位是假信息；
 * ② 日期收敛成两种各有其位的长法：单日一律 `MM-DD`（表内与图轴同走 `dayLabel`），窗口区间仍在页头写 ISO；
 * ③ emoji 只留**段标题**一处（每块一枚：导航不复印同图、结论句去 💡）；④ 三条口径行不再拿 `＝`／`−` 顶 UI
 *   （**#401i（复审第 5 点）**改：缺数口径归表下那条、页脚只说来源——四处压到三处）；⑤ 四处段标题同走
 *   `SECTIONS` 一份清单派生的文本形状，「数据与日志」走 `copyArea` 的 `title` 位（公共层产出，不手写 `<h2>`）；
 * ⑥ 今日行标记复核：`DataTableInput`（`blocks.ts:588-593`）四槽里**没有行标记槽**，故仍靠文本 `（今日）`
 *   收尾——**需公共层加槽**（证据件「需公共层加槽」一节）。
 *
 * #401m · **按视图分**（用户一眼看见的缺陷：场景 01 五条主页唤醒词出同一份页，验收墙上四张一模一样的图）：
 * 本件由「一页四块」改成**按 `section` 逐档拼页**——正文区块、页名、结论句全随档变。分档内容件住同目录
 * 姊妹件 `homeViewParts.ts`（五档：`overview`／`week`／`streak`／`budget`／`month`，路由声明逐条给值），
 * 本件留「页框接线 ＋ 四支 KPI 卡件 ＋ 折线块 ＋ 复制区」并把卡件按档传给姊妹件。
 * `overview` 档形状**逐字不变**（#401 样板页，`t401c` 探针与 `t401-可见文本守卫` 都锁在它上面）。
 */
import { cx, escapeHtml, token } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { renderCaliberLine, renderChips, renderConclusionBar, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import type { HomeData } from './home.js';
import {
  HOME_VIEW_BODIES, partTitle, viewConclusion, viewTitle, weekCardInputs,
} from './homeViewParts.js';
import type { HomeSection } from './homeViewParts.js';

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

/* ── #371 · 主页完整文档（按唤醒词的 `section` 分档；`overview` 档＝#401 样板页）── */

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #401 债 #1：原为 `卡路里·主页`（与眉标两种写法）→ 统一成「产品名＋空格＋页名」，不带 `·`：
 *  `·` 是「用符号挡 UI」，且分隔符探针把 `<title>` 文本也算可见文本。 */
const DOC_TITLE = '卡路里 主页';

/** envelope 头（值冻结对齐 `cli/keys.ts` ENVELOPE_VERSION 与 CALORIE_SKILL）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页头眉标（人话）：**只留产品名**（`t425` 裁定 1 禁上屏英文内部标识符，故不印命令键）。
 *  #401 债 #2：原 `卡路里 · 主页` 用 `·` 并排了「谁的产品」与「哪一页」；页面身份改由 `headBadges` 承担。 */
const HOME_EYEBROW = '卡路里';

/** `overview` 档的四个区块身份（锚点 id ＋ 图标 ＋ 名）：页内导航与四处段标题**同走这一份**，
 *  锚点不会指到不存在的 id。段标题的**文本形状**由姊妹件 `partTitle()` 给（两件同形、各有一份清单）。
 *  #401g · emoji 全页只留**段标题**这一处、每块一枚——导航不再把同一枚图标印第二遍（原为 9 枚 → 4 枚）。 */
const SEC_OVERVIEW = { id: 'sec-overview', icon: '🔥', name: '今日速览' } as const;
const SEC_TREND = { id: 'sec-trend', icon: '📈', name: '每日摄入' } as const;
const SEC_COPY = { id: 'sec-copy', icon: '💰', name: '数据与日志' } as const;

/** 来源脚注上给**读者看**的来源名：可见文本零 snake_case（库表名只留在复制日志的「来源」段里，那是给复核
 *  的人照抄用的技术原件，不上页面——同 `render/sportDocs.ts:54-57` 口径）。#401 分隔符债 #8：三件来源
 *  **不再用 `＋` 串**（`＋` 与 `·`／`、` 同属「≥3 段并列」判据里的分隔符，见 `.scratch/sep-audit/probe.mjs:39`），
 *  改用行文逗号，三件来源仍在一句话里读得完。 */
const SOURCE_LOGGED = '饮食记录，运动记录，每日目标';

/** 完成度 → 档位徽章（四档 `STATUS_KINDS`；文案随档给，不印状态机里的英文枚举——`STATUS_DEFAULT_TEXT`
 *  是「成功／警告／失败／无数据」，那是控件缺省值，页面自己给业务说法）。档位取自 `renderKpiCard` 已支持的
 *  `status`（`blocks.ts:533-539`），**没有目标就不给徽章**——没目标可比的读数摆一枚「无数据」徽章是假信息。
 *  #401 分隔符债 #4／#5：完成率此前挤在说明行里与目标用 `·` 并排 → 现并进徽章文案
 *  （`接近目标 66%`／`达标 100%`）；**取整只改显示**，档位仍按精确值判（90／60 两道线）。
 *  **#401m**：`week` 档那五张卡也要这一档（`weekCardInputs` 的 `status` 入参），返 `KpiCardInput` 的一截。 */
function pctStatus(pct: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (pct === null || pct === undefined) return null;
  const shown = Math.round(pct) + '%';
  if (pct >= 90) return { status: 'ok', statusText: '达标 ' + shown };
  if (pct >= 60) return { status: 'warn', statusText: '接近目标 ' + shown };
  return { status: 'danger', statusText: '偏少 ' + shown };
}

/** 交给姊妹件的徽章件（`weekCardInputs` 的第三参）：返回的键给 `KpiCardInput` 展开用，故类型放松。 */
function statusOf(pct: number | null | undefined): Record<string, unknown> {
  return (pctStatus(pct) ?? {}) as Record<string, unknown>;
}

/** KPI 卡说明行：**只写目标**（缺目标写「未设目标」，不拼半截读数，`t425` 裁定 4 的缺值口径）。
 *  #401e：`unit` 可省——值那行已有单位槽，说明行再印一遍就是同一排两个「毫升」（R-b）；三张有目标的卡同一写法。 */
function goalDetail(goal: number | null | undefined, unit?: string): string {
  if (goal === null || goal === undefined) return '未设目标';
  return unit === undefined ? '目标 ' + goal : '目标 ' + goal + ' ' + unit;
}

/** 缺口卡说明行（同 `goalDetail` 的槽位）：它相对的不是目标是**消耗** ⇒ 给消耗这个参照物，方向归徽章。
 *  **#401i（复审第 4 点）**：补这格前本卡比同排早 22px（少一行说明、徽章上浮）；缺消耗同 `goalDetail` 口径。 */
function burnDetail(burn: number | null | undefined): string {
  return burn === null || burn === undefined ? '未记消耗' : '消耗 ' + burn;
}

/** 缺口卡的方向胶囊（#401g · 审查必改 #4）：四卡里唯一**没有目标**的读数（相对的是消耗），套完成率档位
 *  是假信息 ⇒ 按差额正负给方向词；**#401i（复审第 4 点）**措辞统一到「摄入比消耗多／少」——徽章就是卡名
 *  那个词的展开（缺口为正 ⟺ 摄入比消耗少），不再反着说「消耗多于摄入」；色沿用四值，没有读数不给徽章。 */
function deficitDirection(n: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (n === null || n === undefined) return null;
  if (n > 0) return { status: 'ok', statusText: '摄入比消耗少' };
  if (n < 0) return { status: 'warn', statusText: '摄入比消耗多' };
  return { status: 'empty', statusText: '摄入与消耗持平' };
}

/** 单日日期上屏只有一种长法：`09-07`（窗口跨年才补两位年份，同 `analysis/multiTrendPage.ts:145-152`）。
 *  表内日期与图轴刻度**同走本函数**（同一语义一处实现 ⇒ 页上日期写法从三种降到两种）。
 *  窗口区间不在此列：它是**窗口标识**（跨年要读得出年份、要与复制载荷对得上），页头一处写 ISO。 */
function dayLabel(start: string, end: string): (date: string) => string {
  const crossYear = start.slice(0, 4) !== end.slice(0, 4);
  return (date: string): string => (crossYear ? date.slice(2) : date.slice(5));
}

/** 页头副题：**只写窗口**——窗口区间全页只在这里出现一次（#401 冗余 R2）；#401e 区间连接用「至」不用 `~`。
 *  #401g：区间保持 ISO 长法（它是**窗口标识**：跨年读得出年份、与复制载荷里的命令对得上），单日那两处
 *  （表内／图轴）另走 `dayLabel` 的 `MM-DD`——页上日期写法因此只剩这两种，各有其位。 */
function subtitleText(d: HomeData): string {
  return d.week.start + ' 至 ' + d.week.end;
}

/** 页头胶囊行（#401 债 #3 ＋ 冗余 R3／R6）：副题里 `有记录 5 天 · 连续 3 天` 两段并列改用现成胶囊件
 *  `renderChips`（`blocks.ts:459`）；「主页」那枚承接从眉标撤下的页面身份（债 #2）。页面模板
 *  （`renderPageShell`）只有 eyebrow／title／subtitle 三槽、没有徽章槽 ⇒ 不改公共层签名，落正文首行。
 *  #401e：这枚只说比例，不冠「窗内」（窗口归副题那行区间）。 */
function headBadges(d: HomeData): string {
  return renderChips({ items: [
    { text: '主页' },
    { text: '有记录 ' + d.week.loggedDays + '/' + d.week.windowDays + ' 天' },
    { text: '连续记录 ' + d.streakDays + ' 天' },
  ] });
}

/** `overview`／`budget` 两档共用的四张今日卡（#401 三：KPI 六张减到四张——「今日速览」只留今日四个核心
 *  读数；连续记录搬页头胶囊（它说的是窗口的事），周均摄入随卡位撤出、口径挂折线说明行）。
 *  #401i：缺口卡补说明格「消耗 N」，徽章词与卡名同向；`budget` 档把「今日缺口」换成「剩余预算」那一张。 */
function todayCards(d: HomeData, extra?: KpiCardInput): readonly KpiCardInput[] {
  const t = d.daily.totals;
  return [
    {
      label: '今日摄入', value: fmt(t.cal), unit: '卡',
      detail: goalDetail(d.calorieGoal), ...(pctStatus(d.caloriePct) ?? {}),
    },
    {
      label: '蛋白', value: fmt(t.pro), unit: '克',
      detail: goalDetail(d.proteinGoal), ...(pctStatus(d.proteinPct) ?? {}),
    },
    {
      label: '饮水', value: fmt(d.daily.waterMl), unit: '毫升',
      detail: goalDetail(d.waterGoal), ...(pctStatus(d.waterPct) ?? {}),
    },
    // 缺口定义全页只留在按日汇总那条口径行（#401 冗余 R5）。#401g：四卡里只有本卡没有目标、完成率套不上
    // ⇒ 给**方向**胶囊（`deficitDirection`）；#401i：补说明格「消耗 N」，徽章词与卡名同向，卡内四件齐。
    // #401m：`budget` 档把这一张换成「剩余预算」（目标减已摄入）——那档的主角，故卡名／值／说明三格换掉，
    // 徽章位不给（预算相对的是目标，档位归「今日摄入」那张）。
    extra === undefined
      ? {
        label: '今日缺口', value: fmt(d.deficitToday), unit: '卡', detail: burnDetail(d.burnToday),
        ...(deficitDirection(d.deficitToday) ?? {}),
      }
      : { label: extra.label, value: extra.value, unit: '卡', detail: extra.detail },
  ];
}

/** `streak` 档的四张卡：连续天数是第一主角（打头那张），另三张给它做分母与参照。 */
function streakCards(d: HomeData): readonly KpiCardInput[] {
  return [
    { label: '连续记录（天）', value: String(d.streakDays), unit: '天', detail: '从最近一次断点起算' },
    { label: '窗内记录天数', value: String(d.week.loggedDays), unit: '天', detail: '窗内共 ' + d.week.windowDays + ' 天' },
    {
      label: '记录覆盖率', value: String(Math.round((d.week.loggedDays / d.week.windowDays) * 100)), unit: '%',
      detail: '有记录的天 ÷ 窗内天数',
    },
    {
      label: '今日摄入', value: fmt(d.daily.totals.cal), unit: '卡',
      detail: goalDetail(d.calorieGoal), ...(pctStatus(d.caloriePct) ?? {}),
    },
  ];
}

/** 复制载荷里的**命令原文**：窗口非缺省 7 天时把窗口写全，`section` 逐档照写——照抄重跑得到同一张页
 *  （逐字照 `home/routes.ts` 的声明形状；缺省档位也要写全，读者才看得出这页是哪一档出的）。 */
function homeCommand(windowDays: number, section: HomeSection): string {
  return 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"'
    + (windowDays === 7 ? '' : ',"windowDays":' + windowDays) + ',"section":"' + section + '"}\'';
}

/** `calorie.view.home` · 结果型完整文档（`<!doctype html>` 起）：按 `section` 逐档拼页。
 *  结论条：形状全在公共层（#507 把本件内联的 8 个魔法值搬进 `renderConclusionBar`），本页只传文本；
 *  #401g 去掉句首 💡——emoji 全页只留段标题一处，这一行自己就是浅底条、不需要再加视觉锚。 */
export function buildHomeDoc(d: HomeData, section: HomeSection = 'overview'): string {
  const windowDays = d.week.windowDays;
  const t = d.daily.totals;
  const day = dayLabel(d.week.start, d.week.end);
  const body = HOME_VIEW_BODIES[section]({
    d,
    todayCards: renderKpiGrid(todayCards(d)),
    weekCards: renderKpiGrid(weekCardInputs(d, statusOf)),
    streakCards: renderKpiGrid(streakCards(d)),
    budgetCards: renderKpiGrid(todayCards(d, {
      label: '剩余预算', value: fmt(d.calorieGoal === null || d.calorieGoal === undefined
        ? null
        : d.calorieGoal - t.cal),
      detail: '目标减已摄入',
    })),
    day,
  });
  // #401 · 这里原有一条 `notice({…})` 深底提示条，已撤（裁决见件头与 `t401-融合设计.md` 第三节冲突 4）。
  // #375 · 复制区：不给与按钮同字的 `title`；`data`（业务数据文本）＋ `log`（运行日志文本）双双在场＝双按钮同行。
  // 日志第 4 段写「本页命令原文」：窗口与 `section` 都写全，照抄重跑得到同一张页（逐字照 `home/routes.ts`）。
  const homeMetrics = metricsOf({
    calorieGoal: d.calorieGoal, waterGoal: d.waterGoal,
    caloriePct: d.caloriePct, proteinPct: d.proteinPct, waterPct: d.waterPct,
    deficitToday: d.deficitToday, streakDays: d.streakDays,
    intakeCal: t.cal, proteinG: t.pro, carbsG: t.carbs, fatG: t.fat,
    waterMl: d.daily.waterMl, entryCount: d.daily.entryCount,
    avgIntake: d.week.avgIntake, avgDeficit: d.week.avgDeficit, loggedDays: d.week.loggedDays,
  });
  const copy = copyArea({
    // #401g：这一段的标题不再手写 `<h2>`——走 `title` 位由公共层 `renderCopyBlock` 产出（同一个类名同一把尺）。
    title: partTitle(SEC_COPY),
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
        command: homeCommand(windowDays, section),
        source: SOURCE_LOGGED + '（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  });
  // 页内导航走公共层 `renderTocBlock`（`t425` 裁定 3）：白底胶囊排，形态全在 `blocks.ts:1200-1216`；
  // 锚点清单与正文各 `id` 逐字同源（本档那一份由姊妹件给），不手抄第二份。**#401g**：导航只给名、不印图标
  // ——同一枚图标一页只印一次（段标题那处）；R9 那条「两处写法不一致」由「同走一份清单」解决。
  // #507：结论条改走公共层 `renderConclusionBar`（本页只传文本，形状住 `blocks.ts` 的 `pageShell` 区）。
  const content = [
    headBadges(d),
    renderConclusionBar(viewConclusion(section, d)),
    renderTocBlock({ items: [...body.toc, { id: SEC_COPY.id, text: SEC_COPY.name }] }),
    body.sections.join(''),
    '<section id="' + SEC_COPY.id + '">' + copy + '</section>',
    // #401e 债 #8 收口：来源脚注只留一条（原第二条「窗内共 N 条记录」整条删——那个 N 就是 `loggedDays`＝
    // **天数**）。**#401i（复审第 5 点）**：这条只说来源（缺数口径已归表下），页脚不再一句拼两件事。
    renderCaliberLine('数据来源：' + SOURCE_LOGGED + '。'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: viewTitle(section, d),
    eyebrow: HOME_EYEBROW,
    subtitle: subtitleText(d),
    content,
    charts: body.charts,
  });
}
