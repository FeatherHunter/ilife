/** cash-waterline · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  四条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      少一天与给错形态画出来都是"另外一张图"，而调用方以为自己拿到了想要的骨架。
 *   2. **读数的派生量只算一次**：柱高／条宽／净额／累计已用／占比／判定句全部从同一批输入出，
 *      渲染期不再自己算（两处各算一次必然走散）。
 *   3. 归一化只做「形状」与「算数」：**千分位由本件做**（这是排版），聚合与单位口径归调用方。
 *   4. **形态与读数对不上就拒**：`form` 是 `bullet` 却塞了 `days` ⇒ `badInput`
 *      （给错读数说明调用方拿错了骨架，静默挑一个只会把错画得更像对的）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  CASH_WATERLINE_DEFAULT_THRESHOLD_PCT,
  CASH_WATERLINE_DEFAULT_UNIT,
  CASH_WATERLINE_FORMS,
  CASH_WATERLINE_MAX_AXIS_COLUMNS,
  CASH_WATERLINE_MAX_AXIS_LABELS,
  CASH_WATERLINE_MISSING,
  type CashWaterlineFlowLine,
  type CashWaterlineForm,
} from './attrs.js';
/* 格式化与校验小件都住在 `fields.ts`（同一批三个形态共用，理由见那份的文件头）。 */
import { forbid, fmtPct, fmtQty, optInRange, optInt, reqDays, reqFlowLines, reqInt, reqPositive, reqWeeks,
  assertKeys, CASH_WATERLINE_INPUT_KEYS } from './fields.js';

/** 横轴的两种出法：`columns`＝一格一天（逐格对齐）／`range`＝一行区间读数（天数多到格子站不下字）。 */
export type CashWaterlineAxis =
  | { readonly mode: 'columns' }
  | { readonly mode: 'range'; readonly rangeText: string; readonly todayText?: string };

/** 形态 `waterline` 的一天（归一化后：柱高、点名信息、横轴刻度都已定）。 */
export interface CashWaterlineDayModel {
  readonly label: string;
  readonly pct: number;
  readonly pctText: string;
  /** 那天花了多少（**缺值写 `—`**，不写 0）。 */
  readonly spendText: string;
  /** 跌破底线（**严格小于**底线：正好压在线上不算跌破）。 */
  readonly low: boolean;
  readonly today: boolean;
  /** 横轴上要不要出这一天的字（其余天是空串）——**至多 `CASH_WATERLINE_MAX_AXIS_LABELS` 枚**。 */
  readonly axis: string;
}

/** 告急日点名的一行。 */
export interface CashWaterlineLowRow {
  readonly label: string;
  readonly pctText: string;
  readonly spendText: string;
}

/** 形态 `bullet` 的一周。 */
export interface CashWaterlineWeekModel {
  readonly label: string;
  readonly inflowText: string;
  readonly outflowText: string;
  /** 净额（带符号：`+6 760`／`−1 980`）。 */
  readonly netText: string;
  /** 本周结束时累计已用掉的比例（%）。 */
  readonly usedPct: number;
  readonly usedText: string;
  /** 越过 100%（**条形画到满格，读数照实写**）。 */
  readonly over: boolean;
  /** 余量跌破底线（累计已用 > `100 − 底线`）。 */
  readonly low: boolean;
  /** 轨道填充宽度（%，封顶 100）。 */
  readonly fillPct: number;
}

/** 进出水三栏里的一行。 */
export interface CashWaterlineFlowLineModel {
  readonly name: string;
  readonly amountText: string;
  /** 同行内与所在栏合计之比（%，封顶 100）。 */
  readonly fillPct: number;
}

/** 形态 `flow` 的读数与判定。 */
export interface CashWaterlineFlowReads {
  readonly inflow: readonly CashWaterlineFlowLineModel[];
  readonly outflow: readonly CashWaterlineFlowLineModel[];
  readonly inCountText: string;
  readonly outCountText: string;
  readonly inTotalText: string;
  readonly outTotalText: string;
  readonly leftText: string;
  readonly leftPctText: string;
  /** 余量占预算（%，可能为负——超支时照实写负数）。 */
  readonly leftPct: number;
  readonly leftFillPct: number;
  readonly avgText: string;
  readonly needText: string;
  readonly verdictWord: string;
  readonly verdictText: string;
  readonly ok: boolean;
}

/** 三形态共有的那几项。 */
interface CashWaterlineCommon {
  readonly title: string;
  readonly stamp?: string;
  readonly unit: string;
  readonly note: string;
  readonly thresholdPct: number;
  readonly thresholdText: string;
  /** 总预算写成钱了（给了 `budget` 才有）：卡头第三格「底线 1 800 元」用它。 */
  readonly budgetText?: string;
  readonly extraClass?: string;
}

export interface CashWaterlineWaterlineModel extends CashWaterlineCommon {
  readonly form: 'waterline';
  readonly days: readonly CashWaterlineDayModel[];
  readonly lowRows: readonly CashWaterlineLowRow[];
  readonly lowCount: number;
  readonly legendLow: string;
  readonly todayIndex?: number;
  /** 横轴怎么出（逐格刻度／一行区间读数）。 */
  readonly axis: CashWaterlineAxis;
  /** 卡头第三格：「底线 1 800 元（30%）」（给了 `budget`）／「底线 30%」。 */
  readonly headExtra: string;
  readonly ariaLabel: string;
}

export interface CashWaterlineBulletModel extends CashWaterlineCommon {
  readonly form: 'bullet';
  readonly weeks: readonly CashWaterlineWeekModel[];
  readonly usedThresholdPct: number;
  readonly legendLow: string;
  /** 卡头第三格：「竖线＝底线 30%」。 */
  readonly headExtra: string;
  readonly ariaLabel: string;
}

export interface CashWaterlineFlowModel extends CashWaterlineCommon {
  readonly form: 'flow';
  readonly flow: CashWaterlineFlowReads;
  /** 卡头第三格：「还剩 6 天」。 */
  readonly headExtra: string;
  readonly ariaLabel: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好（`render.ts` 只负责拼标记）。 */
export type CashWaterlineModel =
  | CashWaterlineWaterlineModel | CashWaterlineBulletModel | CashWaterlineFlowModel;


/** 横轴上要写字的那几列（**至多 `CASH_WATERLINE_MAX_AXIS_LABELS` 枚**）。
 *
 *  三条不变量（判据对所有 1–31 天的长度逐条断）：
 *   ① **枚数 ≤ 上限**：步长按「首尾已占两枚」算 ⇒ `stride = ceil((n−1) / (上限−1))`，
 *      中间再密也塞得下（旧算法 `ceil(n / 上限)` 在 n=12/17/18… 这些长度上会出 7 枚，2026-09-25 审查席抓到）；
 *   ② **首尾必出**（第一列与最后一列是这段读数的两个端点）；
 *   ③ **今天必占一枚**（月中标今天是常态：今天落在哪一列，哪一列就得写出「今天」——
 *      旧算法在 todayIndex=5/10 这些不在刻度位上的列上会把「今天」整条吞掉）。 */
function axisColumns(n: number, todayIndex: number | undefined): readonly number[] {
  const stride = Math.max(1, Math.ceil((n - 1) / (CASH_WATERLINE_MAX_AXIS_LABELS - 1)));
  const picked: number[] = [];
  for (let i = 0; i < n; i += 1) {
    if (i === 0 || i === n - 1 || i % stride === 0) picked.push(i);
  }
  if (todayIndex !== undefined && !picked.includes(todayIndex)) {
    /* 换掉离今天最近的那一枚「中间位」（首尾不动、枚数不变）——今天一定写得出来，总数也不超上限。 */
    const middle = picked.filter((i) => i !== 0 && i !== n - 1);
    let drop = middle[0];
    for (const i of middle) if (Math.abs(i - todayIndex) < Math.abs(drop - todayIndex)) drop = i;
    picked.splice(picked.indexOf(drop), 1, todayIndex);
  }
  return picked.sort((a, b) => a - b);
}

/** 逐日水位柱：柱高就是余量，跌破底线的日子逐条点名。 */
function buildWaterline(raw: Record<string, unknown>, common: CashWaterlineCommon): CashWaterlineWaterlineModel {
  forbid(raw, 'waterline', ['weeks', 'inflow', 'outflow', 'elapsedDays', 'remainDays']);
  const days = reqDays(raw.days);
  const todayIndex = optInt(raw.todayIndex, 'cash-waterline: input.todayIndex', 0, days.length - 1);
  const n = days.length;
  /* 天数多于逐格刻度的上限 ⇒ 改出一行区间读数（见 `CASH_WATERLINE_MAX_AXIS_COLUMNS` 那句）。 */
  const dense = n > CASH_WATERLINE_MAX_AXIS_COLUMNS;
  const picked = dense ? [] : axisColumns(n, todayIndex);
  const built: CashWaterlineDayModel[] = days.map((day, i) => {
    const today = todayIndex === i;
    return {
      label: day.label,
      pct: day.pct,
      pctText: fmtPct(day.pct) + '%',
      spendText: day.spend === undefined ? CASH_WATERLINE_MISSING : fmtQty(day.spend) + ' ' + common.unit,
      low: day.pct < common.thresholdPct,
      today,
      /* 今天那一格写「今天」；其余刻度位写**轴上那枚字**（`axisLabel`，缺省＝日期；
         两者都占着自己那一列，**逐格对齐**）。 */
      axis: today && !dense ? '今天' : (picked.includes(i) ? (day.axisLabel ?? day.label) : ''),
    };
  });
  const lowRows: CashWaterlineLowRow[] = built.filter((d) => d.low)
    .map((d) => ({ label: d.label, pctText: d.pctText, spendText: d.spendText }));
  const lowCount = lowRows.length;
  /* 图例那句话：**连着跌**才说「X 起 N 天」（不连着的说「共 N 天」——「起 N 天」会骗人）。 */
  const lowAt: number[] = built.map((d, i) => (d.low ? i : -1)).filter((i) => i >= 0);
  const contiguous = lowAt.every((at, i) => i === 0 || at === lowAt[i - 1] + 1);
  const legendLow = lowCount === 0 ? '全程在底线之上'
    : (contiguous ? built[lowAt[0]].label + ' 起 ' + String(lowCount) + ' 天'
      : '共 ' + String(lowCount) + ' 天');
  const first = built[0];
  const last = built[n - 1];
  return {
    ...common,
    form: 'waterline',
    days: built,
    lowRows,
    lowCount,
    legendLow,
    todayIndex,
    axis: dense
      ? { mode: 'range', rangeText: first.label + ' – ' + last.label,
        todayText: todayIndex === undefined ? undefined : '今天 ' + built[todayIndex].label }
      : { mode: 'columns' },
    headExtra: common.budgetText === undefined
      ? '底线 ' + common.thresholdText
      : '底线 ' + common.budgetText + '（' + common.thresholdText + '）',
    ariaLabel: '逐日水位柱：' + first.label + ' 余量 ' + first.pctText + '，' + last.label + ' 余量 ' + last.pctText
      + (todayIndex === undefined ? '' : '，今天（' + built[todayIndex].label + '）余量 ' + built[todayIndex].pctText)
      + '；底线 ' + common.thresholdText + '；'
      + (lowCount === 0 ? '全程在底线之上' : legendLow + '跌破底线'),
  };
}

/** 每周子弹图：横条＝**累计**已用掉的比例，竖线＝跌破底线的那个位置。 */
function buildBullet(raw: Record<string, unknown>, common: CashWaterlineCommon): CashWaterlineBulletModel {
  forbid(raw, 'bullet', ['days', 'todayIndex', 'inflow', 'outflow', 'elapsedDays', 'remainDays']);
  const weeks = reqWeeks(raw.weeks);
  const budget = reqPositive(raw.budget, 'cash-waterline: input.budget');
  let used = 0;
  const built: CashWaterlineWeekModel[] = weeks.map((week) => {
    used += week.outflow;
    const usedPct = Math.round((used / budget) * 1000) / 10;
    const net = week.inflow - week.outflow;
    const over = usedPct > 100;
    return {
      label: week.label,
      inflowText: fmtQty(week.inflow),
      outflowText: fmtQty(week.outflow),
      /* 净额 0 写「0」（**不带正号**：`+0` 读起来像"有进账"，而它是不进不出）。 */
      netText: net === 0 ? '0' : (net < 0 ? '−' : '+') + fmtQty(Math.abs(net)),
      usedPct,
      usedText: fmtPct(usedPct) + '%',
      over,
      /* 余量跌破底线 ⟺ 已用 > `100 − 底线`（等号不算跌破：正好压在线上）。 */
      low: usedPct + common.thresholdPct > 100,
      fillPct: Math.min(100, usedPct),
    };
  });
  const firstLow = built.find((w) => w.low);
  const legendLow = firstLow === undefined ? '全程在底线之上' : firstLow.label + ' 越过底线';
  return {
    ...common,
    form: 'bullet',
    weeks: built,
    usedThresholdPct: Math.round((100 - common.thresholdPct) * 10) / 10,
    legendLow,
    headExtra: '竖线＝底线 ' + common.thresholdText,
    ariaLabel: '每周子弹图：' + built.map((w) => w.label + ' 已用 ' + w.usedText).join('、')
      + '；底线 ' + common.thresholdText + '（换算成已用是 ' + fmtPct(100 - common.thresholdPct) + '%）；' + legendLow,
  };
}

/** 进出水三栏：进／出／余各一栏，**判定写成字**（撑得住／撑不住 ＋ 差多少）。 */
function buildFlow(raw: Record<string, unknown>, common: CashWaterlineCommon): CashWaterlineFlowModel {
  forbid(raw, 'flow', ['days', 'todayIndex', 'weeks']);
  const inflow = reqFlowLines(raw.inflow, 'cash-waterline: input.inflow');
  const outflow = reqFlowLines(raw.outflow, 'cash-waterline: input.outflow');
  const budget = reqPositive(raw.budget, 'cash-waterline: input.budget');
  const elapsedDays = reqInt(raw.elapsedDays, 'cash-waterline: input.elapsedDays', 1, 366);
  const remainDays = reqInt(raw.remainDays, 'cash-waterline: input.remainDays', 0, 366);
  const inTotal = inflow.reduce((acc, l) => acc + l.amount, 0);
  const outTotal = outflow.reduce((acc, l) => acc + l.amount, 0);
  const left = inTotal - outTotal;
  const leftPct = Math.round((left / budget) * 1000) / 10;
  /* 日均按**已花**算（`出 ÷ 已过天数`）：读的是「按这个花法，剩下的天数要花多少」。 */
  const avg = Math.round(outTotal / elapsedDays);
  const need = avg * remainDays;
  const gap = left - need;
  const ok = gap >= 0;
  const money = (n: number): string => fmtQty(n) + ' ' + common.unit;
  const asLines = (list: readonly CashWaterlineFlowLine[], total: number): readonly CashWaterlineFlowLineModel[] =>
    list.map((l) => ({
      name: l.name,
      amountText: money(l.amount),
      fillPct: total <= 0 ? 0 : Math.min(100, Math.round((l.amount / total) * 1000) / 10),
    }));
  const verdictText = '按这 ' + String(elapsedDays) + ' 天的日均 ' + money(avg) + '，剩下 ' + String(remainDays)
    + ' 天要花 ' + money(need) + '，' + (ok ? '还余 ' + money(gap) + '。' : '还差 ' + money(-gap) + '。');
  const flow: CashWaterlineFlowReads = {
    inflow: asLines(inflow, inTotal),
    outflow: asLines(outflow, outTotal),
    /* 那一格写「笔」还是「项」：**给没给真笔数**由调用方说清——
       屏上只列得出 N 行明细，把行数写成「N 笔」是拿明细行数冒名交易笔数（原型那格是「38 笔」）。 */
    inCountText: raw.inflowCount === undefined
      ? String(inflow.length) + ' 项'
      : String(reqInt(raw.inflowCount, 'cash-waterline: input.inflowCount', 1, 1000000)) + ' 笔',
    outCountText: raw.outflowCount === undefined
      ? String(outflow.length) + ' 项'
      : String(reqInt(raw.outflowCount, 'cash-waterline: input.outflowCount', 1, 1000000)) + ' 笔',
    inTotalText: money(inTotal),
    outTotalText: money(outTotal),
    leftText: money(left),
    leftPctText: '占预算 ' + fmtPct(leftPct) + '%',
    leftPct,
    leftFillPct: Math.max(0, Math.min(100, leftPct)),
    avgText: money(avg),
    needText: money(need),
    verdictWord: ok ? '✓ 撑得住' : '！ 撑不住',
    verdictText,
    ok,
  };
  return {
    ...common,
    form: 'flow',
    flow,
    headExtra: '还剩 ' + String(remainDays) + ' 天',
    ariaLabel: '进出水三栏：进 ' + flow.inTotalText + '、出 ' + flow.outTotalText + '、余 ' + flow.leftText
      + '（' + flow.leftPctText + '）；' + flow.verdictWord + '——' + verdictText,
  };
}

/** 形态 → 骨架的归一化（三个 builder 各自校验自己那份读数）。 */
const BUILDERS: Readonly<Record<CashWaterlineForm, (raw: Record<string, unknown>, common: CashWaterlineCommon)
=> CashWaterlineModel>> = {
  waterline: buildWaterline,
  bullet: buildBullet,
  flow: buildFlow,
};

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `CashWaterlineModel`，不再自己碰 `any`。 */
export function normalizeCashWaterline(input: unknown): CashWaterlineModel {
  assertPlainObject(input, 'renderCashWaterline: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, CASH_WATERLINE_INPUT_KEYS, 'renderCashWaterline: input');
  const form = raw.form === undefined ? CASH_WATERLINE_FORMS[0] : raw.form;
  if (!(CASH_WATERLINE_FORMS as readonly unknown[]).includes(form)) {
    badInput('cash-waterline: input.form 必须是 ' + CASH_WATERLINE_FORMS.join('／')
      + ' 之一（水位柱／子弹图／进出水三栏）');
  }
  const thresholdPct = raw.thresholdPct === undefined
    ? CASH_WATERLINE_DEFAULT_THRESHOLD_PCT
    : optInRange(raw.thresholdPct, 'cash-waterline: input.thresholdPct', 0, 100) as number;
  const thresholdText = fmtPct(thresholdPct) + '%';
  const unit = optText(raw.unit, 'cash-waterline: input.unit') ?? CASH_WATERLINE_DEFAULT_UNIT;
  /* 预算：三者都收——`bullet`／`flow` 用它算占比（必填，由各自的 builder 校验「给了没有」），
     `waterline` 可选（收下就把底线写成钱数，卡头第三格「底线 1 800 元（30%）」）。 */
  const budget = raw.budget === undefined ? undefined : reqPositive(raw.budget, 'cash-waterline: input.budget');
  const common: CashWaterlineCommon = {
    title: reqText(raw.title, 'cash-waterline: input.title'),
    stamp: optText(raw.stamp, 'cash-waterline: input.stamp'),
    unit,
    /* 口径行：不给就由本件按形态写一句（口径是这一件的契约，不该让调用方每次抄一遍）。 */
    note: optText(raw.note, 'cash-waterline: input.note') ?? defaultNote(form as CashWaterlineForm, thresholdText),
    thresholdPct,
    thresholdText,
    budgetText: budget === undefined ? undefined : fmtQty(budget) + ' ' + unit,
    extraClass: optExtraClass(raw.extraClass, 'cash-waterline: input.extraClass'),
  };
  return BUILDERS[form as CashWaterlineForm](raw, common);
}

/** 不给口径行时本件自己写的那一句（**口径是这一件的契约**，不该由调用方每次抄一遍）。
 *  口径必须与算出来的东西**是同一件事**：三栏那句说的是"拿余去减要花的钱"，不是"相除"（2026-09-25 审查席抓到
 *  旧文案写着「＝剩余额度 ÷ 近日均消耗」而实现算的是差额——文案照抄了原型的错）。 */
function defaultNote(form: CashWaterlineForm, thresholdText: string): string {
  if (form === 'waterline') {
    return '口径：柱高＝当天结束时「预算 − 已花」占预算的百分比；虚线是底线 ' + thresholdText
      + '；跌破的那几天在下面逐日点名（日期 ＋ 那天花了多少），不是只把柱子染红。';
  }
  if (form === 'bullet') {
    return '口径：横条＝本周结束时累计已用掉的比例（100% 是整段预算），竖线是余量跌破底线 ' + thresholdText
      + ' 的位置。超过 100% 的部分条形画到满格、读数里照实点名，不缩回 100%。';
  }
  return '口径：进／出／余三栏同一口径（含退款冲抵）；「撑不撑得住」＝拿余去减「按近日均消耗（日均）'
    + '还要花的钱」：够就说还余多少，不够就说还差多少——判定写成字（撑得住／撑不住 ＋ 差多少），不只靠颜色。';
}
