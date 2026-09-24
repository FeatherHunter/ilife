/** #950 · 主页族的**卡件与算式件**：「今日速览」那六张卡、周卡、连续记录卡、预算卡，以及缺口那条等式条。
 *
 * 本次改动（用户裁定：主页照已认可原型 `proto-final-A+C.html` 重做）——「今日速览」由四张卡补成原型那六张
 * （热量／蛋白／碳水／脂肪／饮水／今日缺口），卡上的槽按原型的读法重排：
 *   · **有目标的四张走 `gap` 槽**（蛋白／碳水／脂肪／饮水）＝「还差 N 单位」，与原型那四枚琥珀色小签同字；
 *   · **热量卡走 `status` 槽 ＋ 自定义文案**「完成 N%」（原型那枚灰签），档位按精确百分比判（90／60 两道线）；
 *   · **缺口卡不给进度条**：它相对的不是目标是消耗；方向词住徽章（`#401g`／`#401i` 的裁定一字未动），
 *     两段关系（摄入加缺口等于消耗）改由等式条 `equationBlock` 承载（原型那张卡里也是这条算式）。
 * 证据与读数见 `docs/skills/skill-calorie/t950-主页原型-证据.md`；原型住 `.scratch/ui-drafts/proto-final-A+C.html`。
 *
 * 为什么另立一件：`homeDocs.ts` 已贴着 350 行告警线（本件从它搬出卡件，页框件另立同目录 `homeFrame.ts`）。
 * **单位归调用方**：本件只把「已经是给人看的样子」的串交给公共层；数字取整与单位口径都在这里定，公共层不定。
 */
import { renderEquationBar } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { seriesSum } from '../analysis/series.js';
import type { HomeData } from './home.js';

/** 数字格式化（缺值写 `—`，与全页缺值口径同）。 */
export function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n);
}

/** 百分比取整上屏（只改显示，档位仍按精确值判——与 #401 那条「取整只改显示」同口径）。 */
function pctText(pct: number): string {
  return Math.round(pct) + '%';
}

/** 完成度徽章（热量卡那一枚）：文案是**业务说法**「完成 N%」，档位取自 `renderKpiCard` 已支持的 `status`。
 *  三档与公共层语义色同一套（`ok` 达标／`warn` 接近／`danger` 偏少），不发明新色。 */
function progressBadge(pct: number | null | undefined): Record<string, unknown> {
  if (pct === null || pct === undefined) return {};
  const shown = '完成 ' + pctText(pct);
  if (pct >= 90) return { status: 'ok' as StatusKind, statusText: shown };
  if (pct >= 60) return { status: 'warn' as StatusKind, statusText: shown };
  return { status: 'danger' as StatusKind, statusText: shown };
}

/** 进度条位（公共层只吃 0–100；超目标的读数夹到 100，不报错——与公共层条位同口径）。 */
function barOf(pct: number | null | undefined): Record<string, unknown> {
  if (pct === null || pct === undefined) return {};
  return { bar: { pct: Math.min(100, Math.max(0, pct)) } };
}

/** 「还差多少」徽章（有目标的四张卡）：**还有差数**才出「还差 N 单位」；已经补满的那天出「已达标」。
 *  没设目标时整枚徽章不出（没目标可比的差值写出来是假信息，同 `goalDetail` 的缺值口径）。 */
function gapBadge(goal: number | null | undefined, actual: number, unit?: string): Record<string, unknown> {
  if (goal === null || goal === undefined) return {};
  const left = Math.round(goal - actual);
  if (left > 0) return { gap: unit === undefined ? { value: String(left) } : { value: String(left), unit } };
  return { status: 'ok' as StatusKind, statusText: '已达标' };
}

/** KPI 卡说明行：**只写目标**（缺目标写「未设目标」，不拼半截读数，`t425` 裁定 4 的缺值口径）。
 *  `unit` 可省——值那行已有单位槽，说明行再印一遍就是同一排两个「毫升」（#401e 的 R-b）。 */
function goalDetail(goal: number | null | undefined, unit?: string): string {
  if (goal === null || goal === undefined) return '未设目标';
  return unit === undefined ? '目标 ' + goal : '目标 ' + goal + ' ' + unit;
}

/** 缺口卡说明行：它相对的不是目标是**消耗** ⇒ 给消耗这个参照物，方向归徽章。 */
function burnDetail(burn: number | null | undefined): string {
  return burn === null || burn === undefined ? '未记消耗' : '消耗 ' + burn + '（日常消耗加运动。日常消耗取档案静态值）';
}

/** 缺口卡的方向胶囊（#401g 审查必改 #4）：四卡里唯一**没有目标**的读数，套完成率档位是假信息
 *  ⇒ 按差额正负给方向词；色沿用公共层四值，没有读数不给徽章。 */
function deficitDirection(n: number | null | undefined): Record<string, unknown> {
  if (n === null || n === undefined) return {};
  if (n > 0) return { status: 'ok' as StatusKind, statusText: '摄入比消耗少。与目标减摄入基准不同' };
  if (n < 0) return { status: 'warn' as StatusKind, statusText: '摄入比消耗多。与目标减摄入基准不同' };
  return { status: 'empty' as StatusKind, statusText: '摄入与消耗持平。与目标减摄入基准不同' };
}

/** 「今日速览」前五张：热量／蛋白／碳水／脂肪／饮水（原型的卡序，也是读者的读序）。 */
function macroCards(d: HomeData): readonly KpiCardInput[] {
  const t = d.daily.totals;
  return [
    {
      label: '今日摄入', value: fmt(t.cal), unit: '卡',
      detail: goalDetail(d.calorieGoal), ...barOf(d.caloriePct), ...progressBadge(d.caloriePct),
    },
    {
      label: '蛋白', value: fmt(t.pro), unit: '克',
      detail: goalDetail(d.proteinGoal), ...barOf(d.proteinPct), ...gapBadge(d.proteinGoal, t.pro, '克'),
    },
    {
      label: '碳水', value: fmt(t.carbs), unit: '克',
      detail: goalDetail(d.carbsGoal), ...barOf(d.carbsPct), ...gapBadge(d.carbsGoal, t.carbs, '克'),
    },
    {
      label: '脂肪', value: fmt(t.fat), unit: '克',
      detail: goalDetail(d.fatGoal), ...barOf(d.fatPct), ...gapBadge(d.fatGoal, t.fat, '克'),
    },
    {
      label: '饮水', value: fmt(d.daily.waterMl), unit: '毫升',
      detail: goalDetail(d.waterGoal), ...barOf(d.waterPct), ...gapBadge(d.waterGoal, d.daily.waterMl),
    },
  ];
}

/** 缺口卡（第六张）：值 ＋ 消耗参照 ＋ 方向徽章（**不给条**：条住下面的等式条）。 */
function deficitCard(d: HomeData): KpiCardInput {
  return {
    label: '今日缺口（热量缺口）', value: fmt(d.deficitToday), unit: '卡',
    detail: burnDetail(d.burnToday) + '。缺口等于消耗减摄入',
    ...deficitDirection(d.deficitToday),
  };
}

/** 「今日速览」六张卡；`extra` 给了就**替换**缺口卡那张（`budget` 档换成「剩余预算」那个主角）。 */
export function todayCards(d: HomeData, extra?: KpiCardInput): readonly KpiCardInput[] {
  return [...macroCards(d), extra ?? deficitCard(d)];
}

/** 「今日速览」的卡排：**一张网格、六张卡**。
 *
 *  **为什么不是原型那张 3×2**（两条读数都量过，记在此免得后人再试一遍）：
 *  公共层的读数卡网格按可用宽自动定列数（本页正文列 880 ⇒ 落成 **4 列**，六张卡排成 4＋2）；
 *  想凑出原型的 3＋3 只有一条页内可走的路——把它拆成**两张三卡网格**，本页试过并实拍复评：
 *  1200 档确成 3＋3，但 **390 档塌成「2＋1」两段 ragged**（窄屏是公共层强制的 2 列，三张卡每段
 *  多出一张半宽卡＋一个空格）——屏幕上的洞比列数差异更难看，故退回一张网格。
 *  **登记缺口**（按「公共面缺口不自己扩」的规矩，不动 `packages/base-render/**`）：读数卡网格
 *  缺一个**列数位**（如 `renderKpiGrid(cards, { columns: 3 })`），或整页装配缺一个正文列宽位
 *  （`pageUiCss({ column })` 的口子 `assembleDocPage` 没透出）。两者任一落地，本页把 3×2 补齐即可；
 *  证据与两档实拍见 `docs/skills/skill-calorie/t950-主页原型-证据.md`。 */
export function todayGridHtml(d: HomeData, extra?: KpiCardInput): string {
  return renderKpiGrid(todayCards(d, extra));
}

/** 缺口那条 `A＋B＝C` 的等式条（原型：摄入加缺口等于消耗）：两段轨道 ＋ 逐段读数 ＋ 合计。
 *  **给不出等式就不出这一块**：缺口为负（吃超了）时「摄入＋缺口＝消耗」的两段轨道铺不出来，
 *  宁可不出形状，也不拿钳位后的宽度冒充事实（缺数不画，与全页缺值口径同）。 */
export function equationBlock(d: HomeData): string {
  const intake = d.daily.totals.cal;
  const gap = d.deficitToday;
  const burn = d.burnToday;
  if (gap === null || gap === undefined || burn === null || burn === undefined) return '';
  if (gap < 0 || burn <= 0) return '';
  return renderEquationBar({
    segments: [{ label: '摄入', value: intake }, { label: '缺口', value: gap }],
    total: burn,
    endLabels: true,
  });
}

/** `streak` 档的四张卡：连续天数是第一主角（打头那张），另三张给它做分母与参照。 */
export function streakCards(d: HomeData): readonly KpiCardInput[] {
  return [
    { label: '连续记录（天）', value: String(d.streakDays), unit: '天', detail: '从最近一次断点起算' },
    { label: '窗内记录天数', value: String(d.week.loggedDays), unit: '天', detail: '窗内共 ' + d.week.windowDays + ' 天' },
    {
      label: '记录覆盖率', value: String(Math.round((d.week.loggedDays / d.week.windowDays) * 100)), unit: '%',
      detail: '有记录的天 ÷ 窗内天数',
    },
    {
      label: '今日摄入', value: fmt(d.daily.totals.cal), unit: '卡',
      detail: goalDetail(d.calorieGoal), ...progressBadge(d.caloriePct),
    },
  ];
}

/** `week`／`month` 两档的「窗内概览」五张卡：窗口是「到今日为止的 N 天」，故不写「本周」这种会与日历周
 *  打架的说法；「今日摄入」一卡沿用同一套徽章口径（完成率进徽章，说明行只写目标）。 */
export function weekCards(d: HomeData): readonly KpiCardInput[] {
  const t = d.daily.totals;
  return [
    { label: '窗内摄入合计', value: fmt(seriesSum(d.week.series, 'calories')), unit: '卡', detail: '本窗共 ' + d.week.windowDays + ' 天' },
    { label: '日均摄入', value: fmt(d.week.avgIntake), unit: '卡', detail: '只算有记录的天' },
    { label: '日均缺口', value: fmt(d.week.avgDeficit), unit: '卡', detail: '消耗减摄入' },
    { label: '有记录', value: String(d.week.loggedDays), unit: '天', detail: '连续记录 ' + d.streakDays + ' 天' },
    { label: '今日摄入', value: fmt(t.cal), unit: '卡', ...progressBadge(d.caloriePct) },
  ];
}
