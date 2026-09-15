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
 * ③ emoji 只留**段标题**一处（每块一枚：导航不复印同图、结论句去 💡）；④ 三条口径行不再拿 `＝`／`−` 顶 UI，
 *   缺数口径并入页脚来源行（页首只剩胶囊行与结论条）；⑤ 四处段标题同走 `SECTIONS` 一份清单派生的文本形状，
 *   其中「数据与日志」改走 `copyArea` 的 `title` 位（公共层 `renderCopyBlock` 产出，不再手写 `<h2>`）；
 * ⑥ 今日行标记复核：`DataTableInput`（`blocks.ts:588-593`）四槽里**没有行标记槽**，故仍靠文本 `（今日）`
 *   收尾——**需公共层加槽**（证据件「需公共层加槽」一节）。
 */
import { cx, escapeHtml, token } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { renderCaliberLine, renderChartBlock, renderChips, renderConclusionBar, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
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

/* ── #371 · 主页完整文档（今日总览族 5 词共用同一组装配）；#401c 整页融合返修 ── */

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

/** 四个区块的身份清单（锚点 id ＋ 图标 ＋ 名）：页内导航与四处段标题**同走这一份**，锚点不会指到不存在的 id。
 *  #401g · emoji 全页只留**段标题**这一处、每块一枚——导航不再把同一枚图标印第二遍（原为 9 枚 → 4 枚）。 */
const SEC_OVERVIEW = { id: 'sec-overview', icon: '🔥', name: '今日速览' } as const;
const SEC_TREND = { id: 'sec-trend', icon: '📈', name: '每日摄入' } as const;
const SEC_DAILY = { id: 'sec-daily', icon: '📊', name: '按日汇总' } as const;
const SEC_COPY = { id: 'sec-copy', icon: '💰', name: '数据与日志' } as const;

/** 段标题的**文本形状**（图标 ＋ 空格 ＋ 名）：四处（三处 `<h2>` ＋ 表格 caption）都走它，不手抄第二遍。
 *  **产出**仍分三档：公共层产出器（chart `title`／copy `title`）／表格自己的 caption 槽／本页手写（KPI 网格
 *  没有标题槽）。公共层也无页面级段标题产出器——这两处缺口同见证据件「需公共层加槽」一节。 */
function secTitle(section: { readonly icon: string; readonly name: string }): string {
  return section.icon + ' ' + section.name;
}

/** 来源脚注上给**读者看**的来源名：可见文本零 snake_case（库表名只留在复制日志的「来源」段里，那是给复核
 *  的人照抄用的技术原件，不上页面——同 `render/sportDocs.ts:54-57` 口径）。#401 分隔符债 #8：三件来源
 *  **不再用 `＋` 串**（`＋` 与 `·`／`、` 同属「≥3 段并列」判据里的分隔符，见 `.scratch/sep-audit/probe.mjs:39`），
 *  改用行文逗号，三件来源仍在一句话里读得完。 */
const SOURCE_LOGGED = '饮食记录，运动记录，每日目标';

/** 完成度 → 档位徽章（四档 `STATUS_KINDS`；文案随档给，不印状态机里的英文枚举——`STATUS_DEFAULT_TEXT`
 *  是「成功／警告／失败／无数据」，那是控件缺省值，页面自己给业务说法）。档位取自 `renderKpiCard` 已支持的
 *  `status`（`blocks.ts:533-539`），**没有目标就不给徽章**——没目标可比的读数摆一枚「无数据」徽章是假信息。
 *  #401 分隔符债 #4／#5：完成率此前挤在说明行里与目标用 `·` 并排 → 现并进徽章文案
 *  （`接近目标 66%`／`达标 100%`）；**取整只改显示**，档位仍按精确值判（90／60 两道线）。 */
function pctStatus(pct: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (pct === null || pct === undefined) return null;
  const shown = Math.round(pct) + '%';
  if (pct >= 90) return { status: 'ok', statusText: '达标 ' + shown };
  if (pct >= 60) return { status: 'warn', statusText: '接近目标 ' + shown };
  return { status: 'danger', statusText: '偏少 ' + shown };
}

/** KPI 卡说明行：**只写目标**（缺目标写「未设目标」，不拼半截读数，`t425` 裁定 4 的缺值口径）。
 *  #401e：`unit` 可省——值那行已有单位槽，说明行再印一遍就是同一排两个「毫升」（R-b）；三张有目标的卡同一写法。 */
function goalDetail(goal: number | null | undefined, unit?: string): string {
  if (goal === null || goal === undefined) return '未设目标';
  return unit === undefined ? '目标 ' + goal : '目标 ' + goal + ' ' + unit;
}

/** 缺口卡的方向胶囊（#401g · 审查必改 #4）：它是四张卡里唯一**没有目标**的读数（相对的是消耗），
 *  套完成率档位是假信息 ⇒ 按差额正负给方向词。文案不写「缺口／盈余」——卡名已是「今日缺口」，
 *  徽章再印一遍就是同一张卡里同一个词两遍；档位色沿用四值（缺口＝ok、盈余＝warn、持平＝中性灰）。
 *  没有读数就不给徽章（同 `pctStatus`：没得比就不出假徽章）。 */
function deficitDirection(n: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (n === null || n === undefined) return null;
  if (n > 0) return { status: 'ok', statusText: '消耗多于摄入' };
  if (n < 0) return { status: 'warn', statusText: '摄入多于消耗' };
  return { status: 'empty', statusText: '两者持平' };
}

/** 单日日期上屏只有一种长法：`09-07`（窗口跨年才补两位年份，同 `analysis/multiTrendPage.ts:145-152`）。
 *  表内日期与图轴刻度**同走本函数**（同一语义一处实现 ⇒ 页上日期写法从三种降到两种）。
 *  窗口区间不在此列：它是**窗口标识**（跨年要读得出年份、要与复制载荷对得上），页头一处写 ISO。 */
function dayLabel(start: string, end: string): (date: string) => string {
  const crossYear = start.slice(0, 4) !== end.slice(0, 4);
  return (date: string): string => (crossYear ? date.slice(2) : date.slice(5));
}

/** 页头窗口词：本页名如实写**本唤醒词的窗口**（同一命令键带不同 `windowDays`）——窗口是「到今日为止的
 *  N 天」不是日历周／月，故按天数直说「今日／近 N 天」，不写会与日历口径打架的「本周／本月」。 */
function windowName(days: number): string {
  return days <= 1 ? '今日总览' : '近 ' + days + ' 天总览';
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

/** 页首结论句（读序＝标题 → 一句结论 → 数字卡）：只给判定与「还差／已超」一个读数，**不复述摄入与目标**
 *  （那两个数在同排 KPI 卡里，复述即冗余）；算式归下方口径句。#401e（R-d）：参照写「目标」——「还能吃」
 *  既省略参照，又与同日那张「今日缺口」并列成两个没写清谁相对谁的剩余量；本句是主读法（相对目标）。 */
function conclusionText(d: HomeData): string {
  const cal = d.daily.totals.cal;
  const goal = d.calorieGoal;
  if (goal === null || goal === undefined) return '热量目标还没有，先在「定营养目标」里设一个。';
  const left = goal - cal;
  return left < 0
    ? '今日已超热量目标 ' + -left + ' 卡，明天把摄入压回目标内。'
    : '热量在目标内，距目标还差 ' + left + ' 卡。';
}

/** `calorie.view.home` · 今日总览族 5 词的结果型完整文档（`<!doctype html>` 起）。
 *  结论条：形状全在公共层（#507 把本件内联的 8 个魔法值搬进 `renderConclusionBar`），本页只传文本；
 *  #401g 去掉句首 💡——emoji 全页只留段标题一处，这一行自己就是浅底条、不需要再加视觉锚。 */
export function buildHomeDoc(d: HomeData): string {
  const t = d.daily.totals;
  const windowDays = d.week.windowDays;
  // #401 三：KPI 六张减到四张——「今日速览」只留今日四个核心读数；连续记录搬页头胶囊（它说的是窗口的事），周均摄入随卡位撤出、口径挂折线说明行。
  const cards: KpiCardInput[] = [
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
    {
      // 缺口定义全页只留在按日汇总那条口径行（#401 冗余 R5）。#401g（审查必改 #4）：本卡补档位槽——
      // 它相对的是消耗不是目标，完成率套不上 ⇒ 给**方向**胶囊；说明行那半截裸名词「相对消耗」撤掉，
      // 参照由徽章说（与结论句「距目标还差」各写各的参照，R-d）。
      label: '今日缺口', value: fmt(d.deficitToday), unit: '卡', ...(deficitDirection(d.deficitToday) ?? {}),
    },
  ];
  // 区块标题带图标（`blocks.ts:655-657` 的 `title` 位；老实物每块都带）。#401g：段标题的**文本形状**
  // 一律由 `secTitle(区块)` 出，本页手写 `<h2>` 只剩「今日速览」一处（KPI 网格没有标题槽，见证据件）。
  const day = dayLabel(d.week.start, d.week.end);
  const sections: string[] = [
    '<section id="' + SEC_OVERVIEW.id + '"><h2 class="ilife-block-kpi-card-title">' + secTitle(SEC_OVERVIEW) + '</h2>'
      + renderKpiGrid(cards) + '</section>',
  ];
  let charts = false;
  const loggedDays = d.week.series.filter((s) => s.calories !== null && s.calories !== undefined);
  if (loggedDays.length > 0) {
    sections.push('<section id="' + SEC_TREND.id + '">' + renderChartBlock({
      kind: 'line',
      title: secTitle(SEC_TREND),
      input: {
        // #401g：横轴刻度与表内日期**同走 `dayLabel`**（单日一种长法；图轴是图形语言、等宽短式）。
        items: d.week.series.map((s) => ({ label: day(s.date), value: s.calories })),
        options: {
          /* #401：空白日不补 0、只连线——没有记录的日期是 `null`，折线默认在 `null` 处抬笔断段，
             稀疏记录会只剩孤点（口径同 #160／`0da6472` 另外 4 处调用点）。 */
          connectNulls: true,
          markLine: { value: d.week.avgIntake ?? undefined, label: '周均' },
        },
      },
      // 口径句走公共层 `renderCaliberLine`（`t425` 裁定 3）：原「无记录的日子留空、不按 0 算」整条删
      // （#401 冗余 R4：空值口径页级已说一处）；这条只讲虚线是什么——周均摄入随 KPI 卡位撤出后，
      // 「只算有记录的天」这个口径归口径行（#401 三）。窗口区间归页头一处，此处不抄第二遍。
      // #401g：`＝` 不当 UI 符号（审查必改 #8）⇒ 读成一句话。
    }) + renderCaliberLine('这条虚线是周均摄入，只算有记录的天。') + '</section>');
    charts = true;
  }
  // 目标列是**常量列**（`series` 的 `calorieGoal` 全窗口同一个值，`analysis/series.ts:248`），七行印同一个数
  // ＝冗余 R7 的 7／8 处 → 删列；#401e 照 R-c 再收一步：目标只留「今日摄入」卡说明行一处（此前卡与 caption
  // 各印一次「1800」，caption 一条挤了图标＋表名＋单位＋目标四件事），列单位改由表头承担。
  sections.push('<section id="' + SEC_DAILY.id + '">' + renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'cal', label: '摄入（卡）', align: 'right' },
      { key: 'deficit', label: '缺口（卡）', align: 'right' },
    ],
    // 倒序＝最近的一天在最上（老实物明细表同此序）；空记录日不补 0。
    // #401 债 #7：表下那条「没有记录的那天留空」已按工单删（空值口径全页只留页级一句）⇒ 表格必须真的
    // 照页级那句做、「缺数一律写 —」才不是假话：空格改印 `—`（仍不是 0）。R8：今日行与 KPI 卡同值，
    // 行标记点明「今日」，不必读者自己认。**#401g 复核**：`DataTableInput`（`blocks.ts:588-593`）只有
    // columns／rows／caption／emptyText 四槽、**没有行标记槽**（行前置色点／首列加粗都落不进去，单元格
    // 只吃纯文本）⇒ 今日行仍靠文本 `（今日）` 收尾，视觉通道待**公共层加槽**（证据件同名一节）。
    rows: d.week.series.slice().reverse().map((s) => ({
      date: s.date === d.date ? day(s.date) + '（今日）' : day(s.date),
      cal: s.calories ?? '—', deficit: s.deficit ?? '—',
    })),
    caption: secTitle(SEC_DAILY),
    emptyText: '本窗无按日汇总',
  }) + renderCaliberLine('缺口是消耗减摄入的差。') + '</section>');
  // #401 · 这里原有一条 `notice({…})` 深底提示条，已撤（裁决见件头与 `t401-融合设计.md` 第三节冲突 4）。
  // #375 · 复制区：不给与按钮同字的 `title`；`data`（业务数据文本）＋ `log`（运行日志文本）双双在场＝双按钮同行。
  // 日志第 3 段写「本页命令原文」：窗口非缺省 7 天时把窗口写全，照抄重跑得到同一张页（逐字照 `home/routes.ts`）。
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
    // #401g：这一段的标题不再手写 `<h2>`——走 `title` 位由公共层 `renderCopyBlock` 产出（同一个类名同一把尺）。
    title: secTitle(SEC_COPY),
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
  sections.push('<section id="' + SEC_COPY.id + '">' + copy + '</section>');
  // 页内导航走公共层 `renderTocBlock`（`t425` 裁定 3）：白底胶囊排，形态全在 `blocks.ts:1200-1216`；
  // 锚点清单与正文四个 `id` 逐字同源，不手抄第二份。**#401g**：导航只给名、不再印图标——同一枚图标
  // 一页只印一次（段标题那处）；R9 那条「两处写法不一致」由「同走 `SECTIONS` 一份清单」解决。
  // #507：结论条改走公共层 `renderConclusionBar`（本页只传文本，形状住 `blocks.ts` 的 `pageShell` 区）。
  const content = [
    headBadges(d),
    renderConclusionBar(conclusionText(d)),
    renderTocBlock({ items: [
      { id: SEC_OVERVIEW.id, text: SEC_OVERVIEW.name },
      ...(charts ? [{ id: SEC_TREND.id, text: SEC_TREND.name }] : []),
      { id: SEC_DAILY.id, text: SEC_DAILY.name },
      { id: SEC_COPY.id, text: SEC_COPY.name },
    ] }),
    sections.join(''),
    // #401e 债 #8 收口：来源脚注只留一条（原第二条「窗内共 N 条记录」整条删——那个 N 就是 `loggedDays`，
    // **天数**，与页头胶囊同源同值却写成「条记录」）。#401g（审查必改 #8）：「缺数一律写 —」从页首第 4 行
    // 并入这一行——它讲的是这份数据怎么读（缺的就是缺的、不补 0），与来源是同一件事；页首因此只剩
    // 胶囊行与结论条两块，正文从数字卡起步。窗口区间仍只归副题一处。
    renderCaliberLine('数据来源：' + SOURCE_LOGGED + '。缺数一律写 —。'),
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
