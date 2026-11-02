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
import { m } from '../entries/index.js';

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
  const shown = m('skill-calorie.home-homeCards.c001', { p0: String(pctText(pct)) });
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
  return { status: 'ok' as StatusKind, statusText: m('skill-calorie.home-homeCards.c002') };
}

/** KPI 卡说明行：**只写目标**（缺目标写「未设目标」，不拼半截读数，`t425` 裁定 4 的缺值口径）。
 *  `unit` 可省——值那行已有单位槽，说明行再印一遍就是同一排两个「毫升」（#401e 的 R-b）。 */
function goalDetail(goal: number | null | undefined, unit?: string): string {
  if (goal === null || goal === undefined) return m('skill-calorie.home-homeCards.c003');
  return unit === undefined ? m('skill-calorie.home-homeCards.c004', { p0: String(goal) }) : m('skill-calorie.home-homeCards.c005', { p0: String(goal), p1: String(unit) });
}

/** 缺口那两件**读法**（不是读数）：卡与段尾口径行共用这一份文本，别在两处各写一遍。
 *  卡上只留「消耗 N 卡」这个参照物，读法落到「今日速览」那块段尾的口径行（同一页同一块，事实一条不丢；
 *  `396-gap-caliber` 的三条针——缺口等于消耗减摄入／日常消耗加运动／日常消耗取档案静态值——仍逐字在场）。
 *  **为什么要搬**：这三句原先整个塞在缺口卡的说明行里，那张卡因此比同排高出一截、排面参差。 */
export function deficitCaliber(): string {
  return m('skill-calorie.home-homeCards.c046');
}

/** 缺口卡说明行：只写**参照物**（消耗那个数）；消耗取不到时按缺值口径。 */
function burnDetail(burn: number | null | undefined): string {
  return burn === null || burn === undefined ? m('skill-calorie.home-homeCards.c006') : m('skill-calorie.home-homeCards.c007', { p0: String(burn) });
}

/** 缺口卡的方向胶囊（#401g 审查必改 #4）：四卡里唯一**没有目标**的读数，套完成率档位是假信息
 *  ⇒ 按差额正负给方向词；色沿用公共层四值，没有读数不给徽章。 */
function deficitDirection(n: number | null | undefined): Record<string, unknown> {
  if (n === null || n === undefined) return {};
  if (n > 0) return { status: 'ok' as StatusKind, statusText: m('skill-calorie.home-homeCards.c008') };
  if (n < 0) return { status: 'warn' as StatusKind, statusText: m('skill-calorie.home-homeCards.c009') };
  return { status: 'empty' as StatusKind, statusText: m('skill-calorie.home-homeCards.c010') };
}

/** 「今日速览」前五张：热量／蛋白／碳水／脂肪／饮水（原型的卡序，也是读者的读序）。 */
function macroCards(d: HomeData): readonly KpiCardInput[] {
  const t = d.daily.totals;
  return [
    {
      label: m('skill-calorie.home-homeCards.c011'), value: fmt(t.cal), unit: m('skill-calorie.home-homeCards.c012'),
      detail: goalDetail(d.calorieGoal), ...barOf(d.caloriePct), ...progressBadge(d.caloriePct),
    },
    {
      label: m('skill-calorie.home-cards.c001'), value: fmt(t.pro), unit: m('skill-calorie.home-cards.c002'),
      detail: goalDetail(d.proteinGoal), ...barOf(d.proteinPct), ...gapBadge(d.proteinGoal, t.pro, m('skill-calorie.home-cards.c002')),
    },
    {
      label: m('skill-calorie.home-cards.c003'), value: fmt(t.carbs), unit: m('skill-calorie.home-cards.c002'),
      detail: goalDetail(d.carbsGoal), ...barOf(d.carbsPct), ...gapBadge(d.carbsGoal, t.carbs, m('skill-calorie.home-cards.c002')),
    },
    {
      label: m('skill-calorie.home-cards.c004'), value: fmt(t.fat), unit: m('skill-calorie.home-cards.c002'),
      detail: goalDetail(d.fatGoal), ...barOf(d.fatPct), ...gapBadge(d.fatGoal, t.fat, m('skill-calorie.home-cards.c002')),
    },
    {
      label: m('skill-calorie.home-homeCards.c013'), value: fmt(d.daily.waterMl), unit: m('skill-calorie.home-homeCards.c014'),
      detail: goalDetail(d.waterGoal), ...barOf(d.waterPct), ...gapBadge(d.waterGoal, d.daily.waterMl),
    },
  ];
}

/** 缺口卡（第六张）：值 ＋ 消耗参照 ＋ 方向徽章（**不给条**：条住下面的等式条；读法住段尾口径行）。 */
function deficitCard(d: HomeData): KpiCardInput {
  return {
    label: m('skill-calorie.home-homeCards.c015'), value: fmt(d.deficitToday), unit: m('skill-calorie.home-homeCards.c016'),
    detail: burnDetail(d.burnToday),
    ...deficitDirection(d.deficitToday),
  };
}

/** 把一张卡改成**未记录态**（`renderKpiCard` 的 `pending` 位，#950 B1 就是为「有目标、无记录」造的）：
 *  值位印 `—`、进度条归零、徽章出「未记录」。
 *  **值位与 `gap`／`status` 两处必须撤掉**——`renderKpiCard` 对「一个槽两个来源」是点名拒的
 *  （`pending` 与 `value` 互斥、`gap` 与 `status` 互斥）。 */
function dropToPending(card: KpiCardInput): KpiCardInput {
  return {
    label: card.label,
    ...(card.detail === undefined ? {} : { detail: card.detail }),
    ...(card.unit === undefined ? {} : { unit: card.unit }),
    ...(card.bar === undefined ? {} : { bar: card.bar }),
    pending: true,
  };
}

/** 「今日速览」六张卡；`extra` 给了就**替换**缺口卡那张（`budget` 档换成「剩余预算」那个主角）。
 *
 *  **今天还没有记录时整排走未记录态**（`d.daily.entryCount === 0`）：这一天不是「摄入 0 卡」而是
 *  **没有数**——照旧印「完成 0%」「还差 135 克」「摄入与消耗持平」是**假精度**（读者会以为真吃了 0）；
 *  改走 `pending`：值位 `—`、徽章「未记录」，目标与消耗那两行照旧在（那两件本来就取得到）。 */
export function todayCards(d: HomeData, extra?: KpiCardInput): readonly KpiCardInput[] {
  const cards = [...macroCards(d), extra ?? deficitCard(d)];
  return d.daily.entryCount === 0 ? cards.map(dropToPending) : cards;
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
 *  **给不出等式就不出这一块**，三种给不出：
 *   · **今天没有记录**（`entryCount === 0`）：这一天的「缺口」是取数层的占位 0，不是算出来的差——
 *     照印会得到「摄入 0 ｜ 缺口 0 ｜ 合计 2872」这种**算式不成立**的读数（实跑抓到）；
 *   · 缺口为负（吃超了）：两段轨道铺不出来；
 *   · 缺口或消耗缺数。
 *  宁可不出形状，也不拿钳位后的宽度或占位值冒充事实（缺数不画，与全页缺值口径同）。 */
export function equationBlock(d: HomeData): string {
  const intake = d.daily.totals.cal;
  const gap = d.deficitToday;
  const burn = d.burnToday;
  if (d.daily.entryCount === 0) return '';
  if (gap === null || gap === undefined || burn === null || burn === undefined) return '';
  if (gap < 0 || burn <= 0) return '';
  return renderEquationBar({
    segments: [{ label: m('skill-calorie.home-homeCards.c017'), value: intake }, { label: m('skill-calorie.home-homeCards.c018'), value: gap }],
    total: burn,
    endLabels: true,
  });
}

/** `streak` 档的四张卡：连续天数是第一主角（打头那张），另三张给它做分母与参照。 */
export function streakCards(d: HomeData): readonly KpiCardInput[] {
  return [
    { label: m('skill-calorie.home-homeCards.c019'), value: String(d.streakDays), unit: m('skill-calorie.home-homeCards.c020'), detail: m('skill-calorie.home-homeCards.c021') },
    { label: m('skill-calorie.home-homeCards.c022'), value: String(d.week.loggedDays), unit: m('skill-calorie.home-homeCards.c023'), detail: m('skill-calorie.home-homeCards.c024', { p0: String(d.week.windowDays) }) },
    {
      label: m('skill-calorie.home-homeCards.c025'), value: String(Math.round((d.week.loggedDays / d.week.windowDays) * 100)), unit: '%',
      detail: m('skill-calorie.home-homeCards.c026'),
    },
    {
      label: m('skill-calorie.home-homeCards.c027'), value: fmt(d.daily.totals.cal), unit: m('skill-calorie.home-homeCards.c028'),
      detail: goalDetail(d.calorieGoal), ...progressBadge(d.caloriePct),
    },
  ];
}

/** `week`／`month` 两档的「窗内概览」六张卡：窗口是「到今日为止的 N 天」，故不写「本周」这种会与日历周
 *  打架的说法；「今日摄入」一卡沿用同一套徽章口径（完成率进徽章，说明行只写目标）。
 *
 *  **六张**（#950 第三轮补第六张）：原先五张在公共层网格里排成「4＋1」——第二行孤零零一张卡，
 *  看着像没排完（实拍见 `.scratch/t950/page-month-30.html`）。补的那张是「今日消耗」
 *  （`burnToday` ＝ 日常消耗＋当日运动）：它与末尾的「今日摄入」本是一对读数（进出两侧），
 *  这一页原先只在折线口径行里间接提过，补齐后两张网格（1200 的 4＋2、390 的 2＋2＋2）两档都齐整。 */
export function weekCards(d: HomeData): readonly KpiCardInput[] {
  const t = d.daily.totals;
  return [
    { label: m('skill-calorie.home-homeCards.c029'), value: fmt(seriesSum(d.week.series, 'calories')), unit: m('skill-calorie.home-homeCards.c030'), detail: m('skill-calorie.home-homeCards.c031', { p0: String(d.week.windowDays) }) },
    { label: m('skill-calorie.home-homeCards.c032'), value: fmt(d.week.avgIntake), unit: m('skill-calorie.home-homeCards.c033'), detail: m('skill-calorie.home-homeCards.c034') },
    { label: m('skill-calorie.home-homeCards.c035'), value: fmt(d.week.avgDeficit), unit: m('skill-calorie.home-homeCards.c036'), detail: m('skill-calorie.home-homeCards.c037') },
    { label: m('skill-calorie.home-homeCards.c038'), value: String(d.week.loggedDays), unit: m('skill-calorie.home-homeCards.c039'), detail: m('skill-calorie.home-homeCards.c040', { p0: String(d.streakDays) }) },
    { label: m('skill-calorie.home-homeCards.c041'), value: fmt(t.cal), unit: m('skill-calorie.home-homeCards.c042'), ...progressBadge(d.caloriePct) },
    { label: m('skill-calorie.home-homeCards.c043'), value: fmt(d.burnToday), unit: m('skill-calorie.home-homeCards.c044'), detail: m('skill-calorie.home-homeCards.c045') },
  ];
}
