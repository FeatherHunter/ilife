/** portion-gauge · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不“尽量猜”：
 *      行数不够、克数不是数、占比越界，画出来都是“错位”，而调用方以为拿到了一组完整换算。
 *   2. **换算链三栏的数是同一份真值**：克数串、百分比、菜谱那一句都在这里**各算一次**，
 *      `render.ts` 只把算好的串写进两处（行头与换算栏各一处）——两处各算一遍必然走散。
 *      A 档量感条同此：那个百分比大字与已用那一段的长度是**同一个数**，两枚参照刻度值的位置
 *      与它们各自那句字也在这一处定形。
 *   3. **空白串不是文本**：全空白的 `title`／食材名会在屏上留一块空白，**一律拒**
 *      （与同层 `optExtraClass` 对空白串的口径一致；可选文本字段同办：空串仍按“未给”处理）。
 *
 *  **形态决定读哪一组字段**（同族先例 `spread-dist/model.ts`）：`convert` 读 `rows`、`gauge` 读 `gauge`，
 *  另一个形态的字段一概不读（缺了就是缺了，不拿另一形态的字段顶上）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PORTION_GAUGE_FORMS,
  PORTION_GAUGE_MAX_ROWS,
  PORTION_GAUGE_MIN_ROWS,
  type PortionGaugeForm,
  type PortionGaugeGauge,
  type PortionGaugeRow,
} from './attrs.js';

/** 一行的内部形状：每个字段都已校验、已归一、已算好（`render.ts` 只拼标记，一个算术都不写）。 */
export interface PortionGaugeRowModel {
  readonly name: string;
  /** 出处那句（`主料，菜谱写“2 份”`）：分档与菜谱写法拼在这里，换算左栏读的是同一个菜谱串。 */
  readonly sub: string;
  /** 这一行合计多少克的写法（`700 g`）：行头与换算右栏读的是**同一个串**。 */
  readonly gramsText: string;
  /** 菜谱写的那一句（`2 份`）：出处句与换算左栏读的是**同一个串**。 */
  readonly recipeText: string;
  /** 右栏口径名（`营养库口径`／`生重（1 碗 ＝ 150 g）`）。 */
  readonly toLabelText: string;
  /** 占比（0…100，取一位小数）：占比那句的字与占比条的宽度读的是**同一个数**。 */
  readonly sharePct: number;
  /** 占比那句（`占一天蛋白 70%`）。 */
  readonly shareText: string;
}

/** 轨道上的一根刻度竖线：位置与粗细都由 `model.ts` 定形（`render.ts` 只贴上去，不拼算术）。 */
export interface PortionGaugeTickModel {
  /** 行内定位（`left: 25%`）。 */
  readonly pos: string;
  /** 整份那一档（`0`／`50`）：刻度画长一档。 */
  readonly major: boolean;
}

/** 轨道上的一枚参照刻度竖线：一餐建议（实线）／一天上限（虚线）。 */
export interface PortionGaugeMarkModel {
  readonly kind: 'ref' | 'cap';
  /** 行内定位。右端那枚是 `right: 0`——`left: 100%` 会把它自己那 1px 描边推到轨道外面（横溢）。 */
  readonly pos: string;
}

/** A 档量感条（`gauge`）的内部形状：每个字段都已校验、已归一、已算好。 */
export interface PortionGaugeGaugeModel {
  /** 这一份叫什么（`红烧肉`）：卡头上屏 ＋ 进无障碍名。 */
  readonly name: string;
  /** 已用占上限的几成（0…100，取一位小数）：大字与已用那一段的长度读的是**同一个数**。 */
  readonly usedPct: number;
  /** 那个大字（`58%`）。 */
  readonly usedText: string;
  /** 上限那枚刻度值（`一天上限 2 份`），挂在尺子右端。 */
  readonly capLabel: string;
  /** 一餐建议那枚刻度值（`一餐建议 1.2 份`）；没给建议＝不出这一行。 */
  readonly refLabel?: string;
  /** 建议那枚刻度值那一行的**行内内距**（把那一行的话居中到它那枚刻度上）；正中那一档是空串＝不写。 */
  readonly refPad?: string;
  /** 实物参照那一行（`≈ 1 个拳头 ＋ 2 汤勺`）；不给＝不出那一行。 */
  readonly equiv?: string;
  /** 轨道那句话（`role="img"` 的无障碍名）：把这一条读数说成一句话，数出自上面同一批字段。 */
  readonly ariaText: string;
  /** 刻度竖线（四等分；右端那枚由「一天上限」那枚参照收口，同一处不画两条线）。 */
  readonly ticks: readonly PortionGaugeTickModel[];
  /** 参照刻度竖线（有建议时两枚，否则只有上限那一枚）。 */
  readonly marks: readonly PortionGaugeMarkModel[];
}

/** 内部类型：每个字段都已校验、已归一、已算好。 */
export interface PortionGaugeModel {
  readonly form: PortionGaugeForm;
  readonly title: string;
  readonly stamp?: string;
  readonly tail?: string;
  /** `convert` 的行；`gauge` 形态是**空数组**（那个形态读 `gauge`）。 */
  readonly rows: readonly PortionGaugeRowModel[];
  /** `gauge` 的那一份；`convert` 形态是 `null`。 */
  readonly gauge: PortionGaugeGaugeModel | null;
  readonly note: string;
  /** 缺换算的食材有几样（0＝没有缺的，那一行整行不出）。 */
  readonly missingCount: number;
  /** 缺换算那一行里的数（`还差 12 样没有换算` 里的 `12`）：**与克数走同一把分组**（同一处出，
   *  指数写法同样不被打散）；`missingCount` 是 0 时是空串（那一行整行不出）。 */
  readonly missingText: string;
  readonly extraClass?: string;
}

/** 本件的口径句（调用方不给 `note` 时用它；分隔符只用逗号与句号）。 */
export const PORTION_GAUGE_NOTE = '口径：左边永远是菜谱写的单位（份，碗，把），'
  + '右边永远是营养库认的单位（g）。中间是这一份菜的换算系数，'
  + '系数变了要写明是哪一版菜谱改的，不悄悄改数。'
  + '缺换算系数的食材整行不画，只在下面写还差几样没有换算。';

/** 必填文本：非空串**且不是全空白**（全空白的标题会在屏上留一块空白，那是“看得到的错”）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**（那会在屏上留一块空白）。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 三位分组（`1200` → `1,200`；负号留在最前；小数部分原样）。
 *
 *  **指数写法原样返回**：量级大到（或小到）`String()` 只给指数写法时（`1e+21`／`1e-7`），
 *  按三位插逗号会把它切成 `1e,+21`／`1,e-7`——那是**读不出来的数**（同族先例
 *  `spread-dist/scale.ts` 的 `numText()`）。**非有限值一律 `badInput`**：写不出数的东西不上屏。 */
function groupNum(value: number): string {
  if (!Number.isFinite(value)) badInput('portion-gauge: 要写的数必须是有限数（读不到 ' + String(value) + '）');
  const s = String(value);
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  const head = dot < 0 ? s : s.slice(0, dot);
  const frac = dot < 0 ? '' : s.slice(dot);
  const neg = head.startsWith('-');
  const body = neg ? head.slice(1) : head;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ',';
    out += body[i];
  }
  return (neg ? '-' : '') + out + frac;
}

/** 一行的克数（有限数且大于 0）：0 与负数不是“一行菜的量”，小数照收（`12.5 g`）。 */
function reqGrams(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  if (!(value > 0)) badInput(field + ' 必须大于 0（一行菜没有克数就谈不上换算）');
  return value;
}

/** 占比（有限数且落在 0…100）：越界的占比画出来会顶出轨道，不静默夹。 */
function reqSharePct(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  if (!(value >= 0 && value <= 100)) badInput(field + ' 必须落在 0 到 100 之间（越界的占比会顶出轨道）');
  return Math.round(value * 10) / 10;
}

/** 换算各行：1–8 行；每一行的名字、菜谱写法、克数、占比项、占比都得到位。 */
function reqRows(value: unknown): readonly PortionGaugeRow[] {
  if (!Array.isArray(value) || value.length < PORTION_GAUGE_MIN_ROWS) {
    badInput('portion-gauge: input.rows 至少 ' + String(PORTION_GAUGE_MIN_ROWS)
      + ' 行（一道菜也要换算，请调用方至少给一行）');
  }
  if (value.length > PORTION_GAUGE_MAX_ROWS) {
    badInput('portion-gauge: input.rows 最多 ' + String(PORTION_GAUGE_MAX_ROWS)
      + ' 行（再多一屏读不完，请调用方先按餐分组）');
  }
  assertDenseArray(value, 'portion-gauge: input.rows');
  return value.map((item, i) => {
    const at = 'portion-gauge: input.rows[' + String(i) + ']';
    assertPlainObject(item, at);
    const r = item as Record<string, unknown>;
    const row: PortionGaugeRow = {
      name: reqRealText(r.name, at + '.name'),
      recipe: reqRealText(r.recipe, at + '.recipe'),
      grams: reqGrams(r.grams, at + '.grams'),
      shareOf: reqRealText(r.shareOf, at + '.shareOf'),
      sharePct: reqSharePct(r.sharePct, at + '.sharePct'),
    };
    const kind = optRealText(r.kind, at + '.kind');
    const basis = optRealText(r.basis, at + '.basis');
    const toLabel = optRealText(r.toLabel, at + '.toLabel');
    return {
      ...row,
      ...(kind === undefined ? {} : { kind }),
      ...(basis === undefined ? {} : { basis }),
      ...(toLabel === undefined ? {} : { toLabel }),
    };
  });
}

/** 缺换算有几样（非负整数；0＝没有缺的）。**写法与克数同一处出**：屏上那个数经 `groupNum()`。 */
function reqMissingCount(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    badInput('portion-gauge: input.missingCount 必须是非负整数（缺几样就写几样，没有缺的就不给）');
  }
  return value;
}

/** A 档那一份量感：名字、已用几成、上限那个量必给；**建议那句与它落的位置成对给**。 */
function reqGauge(value: unknown): PortionGaugeGauge {
  assertPlainObject(value, 'portion-gauge: input.gauge');
  const g = value as Record<string, unknown>;
  const at = 'portion-gauge: input.gauge';
  const name = reqRealText(g.name, at + '.name');
  const usedPct = reqSharePct(g.usedPct, at + '.usedPct');
  const capText = reqRealText(g.capText, at + '.capText');
  const refText = optRealText(g.refText, at + '.refText');
  const refPct = g.refPct === undefined ? undefined : reqSharePct(g.refPct, at + '.refPct');
  if ((refText === undefined) !== (refPct === undefined)) {
    badInput(at + ' 的一餐建议要**成对**给（`refText` 那句字与 `refPct` 它落在几成处）——'
      + '只给一样，那句参照要么没地方挂，要么挂在编出来的位置上');
  }
  const equiv = optRealText(g.equiv, at + '.equiv');
  return {
    name,
    usedPct,
    capText,
    ...(refText === undefined ? {} : { refText, refPct }),
    ...(equiv === undefined ? {} : { equiv }),
  };
}

/** 尺子的刻度：四等分（0／25／50／75）。**右端那枚不画**——它由「一天上限」那枚参照收口
 *  （同一处画两条线＝同一个位置说两遍）。 */
const RAIL_TICKS = [0, 25, 50, 75] as const;

/** 参照刻度值那一行的**行内内距**：把那一行的话**居中到它那枚刻度**上（`text-align: center` ＋ 一侧内距）。
 *  刻度过半时内距压在左边、不过半时压右边 —— 两侧都推不出轨道，也不用 `translateX`（那会让
 *  0 宽刻度上的标签自己吃掉一半宽）。
 *
 *  **内距最多压到 `REF_PAD_MAX_PCT`**：刻度贴着尺子两端时（0／100），按上面那把尺算出来的内距
 *  会把那一行的可用宽压成 0，一个字居中在 0 宽里 ⇒ 半个字被推到轨道外（真机读数 `scrollWidth`
 *  比 `clientWidth` 多 12px）。压到 75% ＝ 至少给那枚标签留四分之一条轨道：话仍**贴着它那一端**，
 *  只是不再严格居中（尺子两端本来就摆不下居中）。 */
const REF_PAD_MAX_PCT = 75;
function refPad(pct: number): string {
  if (pct > 50) return 'padding-left: ' + String(Math.min(2 * pct - 100, REF_PAD_MAX_PCT)) + '%';
  if (pct < 50) return 'padding-right: ' + String(Math.min(100 - 2 * pct, REF_PAD_MAX_PCT)) + '%';
  return '';
}

/** 一枚刻度／参照竖线的位置：贴着尺子右端（100%）的那一枚用 `right: 0` 收口 ——
 *  `left: 100%` 会把它自己那 1px 描边推到轨道外面（真机读数：`scrollWidth` 比 `clientWidth` 多 1）。 */
function markPos(pct: number): string {
  return pct >= 100 ? 'right: 0' : 'left: ' + String(pct) + '%';
}

/** A 档那一份量感：大字、两枚参照刻度值、刻度竖线、无障碍名都在这一处定形。 */
function gaugeModel(g: PortionGaugeGauge): PortionGaugeGaugeModel {
  const usedText = String(g.usedPct) + '%';
  const capLabel = '一天上限 ' + g.capText;
  const ticks: readonly PortionGaugeTickModel[] = RAIL_TICKS
    .map((p) => ({ pos: 'left: ' + String(p) + '%', major: p % 50 === 0 }));
  /* 上限那枚收右端；有建议时它排在前面（屏上先读到建议，再读到上限）。 */
  const marks: PortionGaugeMarkModel[] = [{ kind: 'cap', pos: markPos(100) }];
  let refLabel: string | undefined;
  let pad: string | undefined;
  if (g.refPct !== undefined && g.refText !== undefined) {
    refLabel = '一餐建议 ' + g.refText;
    pad = refPad(g.refPct);
    marks.unshift({ kind: 'ref', pos: markPos(g.refPct) });
  }
  /* 无障碍名把这一条读数说成一句话：数**出自上面同一批字段**（不另算一遍）。 */
  const ariaText = '量感条：' + g.name + '用掉一天上限 ' + g.capText + '的' + usedText
    + (refLabel === undefined || g.refPct === undefined
      ? '。' : '，' + refLabel + '那枚刻度落在 ' + String(g.refPct) + '% 处。');
  return {
    name: g.name,
    usedPct: g.usedPct,
    usedText,
    capLabel,
    ...(refLabel === undefined ? {} : { refLabel }),
    ...(pad === undefined ? {} : { refPad: pad }),
    ...(g.equiv === undefined ? {} : { equiv: g.equiv }),
    ariaText,
    ticks,
    marks,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `PortionGaugeModel`，不再自己碰 `any`。 */
export function normalizePortionGauge(input: unknown): PortionGaugeModel {
  assertPlainObject(input, 'renderPortionGauge: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PORTION_GAUGE_FORMS[0] : raw.form;
  if (!(PORTION_GAUGE_FORMS as readonly unknown[]).includes(form)) {
    badInput('portion-gauge: input.form 必须是 ' + PORTION_GAUGE_FORMS.join('／')
      + ' 之一（A 量感条／B 换算三栏）');
  }
  const gauge = form === 'gauge' ? gaugeModel(reqGauge(raw.gauge)) : null;

  const rows = form === 'gauge' ? [] : reqRows(raw.rows).map((r) => {
    /* 同一份真值各算一次：克数串只拼一遍（行头与右栏同引），菜谱串只收一遍
       （出处句与左栏同引），百分比只取一位（占比句与条宽同引）。 */
    const gramsText = groupNum(r.grams) + ' g';
    const pctText = String(r.sharePct) + '%';
    const toName = r.toLabel ?? '营养库口径';
    const model: PortionGaugeRowModel = {
      name: r.name,
      sub: (r.kind === undefined ? '' : r.kind + '，') + '菜谱写「' + r.recipe + '」',
      gramsText,
      recipeText: r.recipe,
      toLabelText: r.basis === undefined ? toName : toName + '（' + r.basis + '）',
      sharePct: r.sharePct,
      shareText: '占一天' + r.shareOf + ' ' + pctText,
    };
    return model;
  });

  /* 缺换算那个数也在这一处定形（写法与克数同一把分组）：`render.ts` 只贴它，不再自己 `String()`。 */
  const missingCount = reqMissingCount(raw.missingCount);
  /* 脚注缺省按形态分：`convert` 用本件的口径句；`gauge` **不出脚注**（那两条参照刻度值在尺子上
     自己报了名，再写一句口径＝同一件事印两遍，正是用户砍掉的那类文字）。 */
  const noteIn = optRealText(raw.note, 'portion-gauge: input.note');
  const note = noteIn ?? (form === 'gauge' ? '' : PORTION_GAUGE_NOTE);

  return {
    form: form as PortionGaugeForm,
    title: reqRealText(raw.title, 'portion-gauge: input.title'),
    stamp: optRealText(raw.stamp, 'portion-gauge: input.stamp'),
    tail: optRealText(raw.tail, 'portion-gauge: input.tail'),
    rows,
    gauge,
    note,
    missingCount,
    missingText: missingCount > 0 ? groupNum(missingCount) : '',
    extraClass: optExtraClass(raw.extraClass, 'portion-gauge: input.extraClass'),
  };
}
