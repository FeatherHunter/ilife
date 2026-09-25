/** undo-timeline · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在屏上长成另一种东西（少一项影响面、三态写错），而调用方以为拿到了本件。
 *   2. **形态决定读哪个数组**（`track` 读 `entries`，`impact` 读 `change`）：缺了就是缺了，
 *      不拿另一个形态的字段顶上——那是静默降级。
 *   3. **归一化只做「形状」**：取整、千分位、金额怎么算、撤销要写哪些表**归调用方**；
 *      本件只收「已经是给人看的样子」的串与**结构化的影响面**（哪一项、连带什么、几个）。
 *
 *  三处要点（判据逐条断）：
 *   · `lockedReason` 只在 `state: 'locked'` 时给，且那时**必填**——一枚按不动的按钮没处可说理由，
 *     屏上就会是一枚"看着按不动、不知道为什么"的灰按钮；
 *   · `openKey` 必须命中一条**带 `impact`、能撤、没在跑**的改动——摊开的那张单里
 *     「撤销这 N 项」是能按的，命中锁着／已撤／忙碌的那一条等于留后门。
 *   · 影响面一行的 `lockedReason` 同办（勾不动必须写得清为什么）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  UNDO_TIMELINE_CANCEL_TEXT,
  UNDO_TIMELINE_EMPTY_TEXT,
  UNDO_TIMELINE_FORMS,
  UNDO_TIMELINE_GO_TEXT,
  UNDO_TIMELINE_STATES,
  UNDO_TIMELINE_SUM_NOTE,
  UNDO_TIMELINE_TITLE,
  type UndoTimelineEntry,
  type UndoTimelineForm,
  type UndoTimelineImpact,
  type UndoTimelineImpactRow,
  type UndoTimelineInput,
  type UndoTimelineReading,
  type UndoTimelineRollback,
  type UndoTimelineState,
} from './attrs.js';

/** 改动条数的上限（再多就不该用"一条轨"了，该按时间窗筛）。 */
export const UNDO_TIMELINE_ENTRY_MAX = 200;
/** 影响面项数的上限（回滚单是让人**逐项读**的，再长就读不完）。 */
export const UNDO_TIMELINE_IMPACT_MAX = 50;
/** 一条改动上读数的条数上限（超过就说明这不是"一条改动"）。 */
export const UNDO_TIMELINE_READING_MAX = 6;
/** `impact` 形态那一块的机器键缺省值（`changeKey` 不给时用它）。 */
export const UNDO_TIMELINE_CHANGE_KEY = 'change';

/** 一条读数（已校验、已归一）。 */
export interface UndoTimelineReadingModel {
  readonly label?: string;
  readonly from: string;
  readonly to: string;
}

/** 影响面里的一行（已校验、已归一）。 */
export interface UndoTimelineImpactRowModel {
  readonly key: string;
  readonly title: string;
  readonly note?: string;
  readonly count?: string;
  readonly checked: boolean;
  readonly locked: boolean;
  readonly lockedReason?: string;
}

/** 一张回滚单（已校验、已归一；页脚那句结论的**注**在这一层定下来，读数归运行时现算）。 */
export interface UndoTimelineImpactModel {
  readonly title: string;
  readonly note?: string;
  readonly rows: readonly UndoTimelineImpactRowModel[];
  readonly sumNote: string;
  readonly cancelLabel: string;
  readonly checkedCount: number;
}

/** 一条改动（已校验、已归一）。 */
export interface UndoTimelineEntryModel {
  readonly key: string;
  readonly time: string;
  readonly say: string;
  readonly state: UndoTimelineState;
  readonly readings: readonly UndoTimelineReadingModel[];
  readonly note?: string;
  readonly tag?: string;
  readonly lockedReason?: string;
  readonly impact?: UndoTimelineImpactModel;
  readonly go: string;
  readonly busy: boolean;
  readonly error?: string;
}

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface UndoTimelineModel {
  readonly form: UndoTimelineForm;
  readonly name: string;
  readonly title: string;
  readonly cap?: string;
  readonly entries: readonly UndoTimelineEntryModel[];
  readonly rollback?: UndoTimelineRollback;
  readonly openKey?: string;
  readonly emptyText: string;
  readonly hint?: string;
  readonly change?: UndoTimelineImpactModel;
  readonly changeKey: string;
  readonly extraClass?: string;
}

/* ── 小件：类型不对就抛，不猜 ─────────────────────────────────────── */

/** 可选布尔：非布尔一律拒（`1`／`'true'` 这种"看着像"的值不猜）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔值');
  return value;
}

/** 必填文本：非空串**且不是全空白**（全空白会在屏上留一块空白，那是"看得到的错"）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 必填数组（**顺手把洞堵上**：稀疏数组的洞会被 `map` 跳过、渲染那一头才抛 `TypeError`）。 */
function reqList(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) badInput(field + ' 必须是数组');
  const list = value as readonly unknown[];
  assertDenseArray(list, field);
  return list;
}

/* ── 三块：读数／影响面／一条改动 ─────────────────────────────────── */

/** 一条读数：两个值都得给（改前是什么、改后是什么，缺一半就读不出"动了什么读数"）。 */
function readingOf(value: unknown, at: number, field: string): UndoTimelineReadingModel {
  const path = field + '[' + String(at) + ']';
  assertPlainObject(value, path);
  const raw = value as UndoTimelineReading;
  return {
    label: optRealText(raw.label, path + '.label'),
    from: reqRealText(raw.from, path + '.from'),
    to: reqRealText(raw.to, path + '.to'),
  };
}

/** 影响面里的一行。 */
function impactRowOf(value: unknown, at: number, field: string, seen: Set<string>): UndoTimelineImpactRowModel {
  const path = field + '[' + String(at) + ']';
  assertPlainObject(value, path);
  const raw = value as UndoTimelineImpactRow;
  const key = reqRealText(raw.key, path + '.key');
  if (seen.has(key)) badInput(path + '.key 在清单里重复了：' + key + '（机器键必须唯一）');
  seen.add(key);
  const locked = optBool(raw.locked, path + '.locked') === true;
  const why = optRealText(raw.lockedReason, path + '.lockedReason');
  if (why !== undefined && !locked) {
    badInput(path + '.lockedReason 只在 locked: true 时给（孤零零一句原因没人看得见）');
  }
  if (locked && why === undefined) {
    badInput(path + '.lockedReason 必填：勾不动的那一项要写清为什么（只标一枚灰方块等于没说）');
  }
  const checkedRaw = optBool(raw.checked, path + '.checked');
  if (locked && checkedRaw === true) {
    badInput(path + '.checked 不许在 locked: true 的一行上给真值'
      + '（那一项勾不动 ⇒ 它撤不了；页脚那句「勾了 N 项」得数得出真正会撤的那几项）');
  }
  return {
    key,
    title: reqRealText(raw.title, path + '.title'),
    note: optRealText(raw.note, path + '.note'),
    count: optRealText(raw.count, path + '.count'),
    /* 缺省**勾上**：撤销＝回到改动前，默认都撤；个别项默认不勾时显式给 `false`。
       勾不动的那一行相反（缺省不勾）——它撤不了，数进去只会让页脚那句话骗人。 */
    checked: locked ? false : checkedRaw !== false,
    locked,
    lockedReason: locked ? why : undefined,
  };
}

/** 一张回滚单（`track` 的就地面与 `impact` 的主体共用这一份校验）。 */
function impactOf(value: unknown, field: string): UndoTimelineImpactModel {
  assertPlainObject(value, field);
  const raw = value as UndoTimelineImpact;
  const rowsRaw = reqList(raw.rows, field + '.rows');
  if (rowsRaw.length === 0) badInput(field + '.rows 至少要有一项（没有影响面的回滚单没有意义）');
  if (rowsRaw.length > UNDO_TIMELINE_IMPACT_MAX) {
    badInput(field + '.rows 至多 ' + String(UNDO_TIMELINE_IMPACT_MAX) + ' 项（逐项读的东西再多就读不完）');
  }
  const seen = new Set<string>();
  const rows = rowsRaw.map((one, i) => impactRowOf(one, i, field + '.rows', seen));
  let checkedCount = 0;
  for (const r of rows) if (r.checked) checkedCount += 1;
  return {
    title: reqRealText(raw.title, field + '.title'),
    note: optRealText(raw.note, field + '.note'),
    rows,
    sumNote: optRealText(raw.sumNote, field + '.sumNote') ?? UNDO_TIMELINE_SUM_NOTE,
    cancelLabel: optRealText(raw.cancelLabel, field + '.cancelLabel') ?? UNDO_TIMELINE_CANCEL_TEXT,
    checkedCount,
  };
}

/** 一条改动。 */
function entryOf(value: unknown, at: number, seen: Set<string>): UndoTimelineEntryModel {
  const path = 'undo-timeline: input.entries[' + String(at) + ']';
  assertPlainObject(value, path);
  const raw = value as UndoTimelineEntry;
  const key = reqRealText(raw.key, path + '.key');
  if (seen.has(key)) badInput(path + '.key 在改动记录里重复了：' + key + '（机器键必须唯一）');
  seen.add(key);

  const stateRaw = raw.state === undefined ? UNDO_TIMELINE_STATES[0] : raw.state;
  if (!(UNDO_TIMELINE_STATES as readonly unknown[]).includes(stateRaw)) {
    badInput(path + '.state 必须是 ' + UNDO_TIMELINE_STATES.join('／') + ' 之一（能撤／已撤／不能撤）');
  }
  const state = stateRaw as UndoTimelineState;

  const lockedReason = optRealText(raw.lockedReason, path + '.lockedReason');
  if (lockedReason !== undefined && state !== 'locked') {
    badInput(path + '.lockedReason 只在 state: \'locked\' 时给（能撤或已撤的那一条没有"为什么不能撤"）');
  }
  if (state === 'locked' && lockedReason === undefined) {
    badInput(path + '.lockedReason 必填：不能撤的那一条要写清为什么（按钮那时按不动，得说得清）');
  }

  const readings = raw.readings === undefined ? [] : reqList(raw.readings, path + '.readings');
  if (readings.length > UNDO_TIMELINE_READING_MAX) {
    badInput(path + '.readings 至多 ' + String(UNDO_TIMELINE_READING_MAX) + ' 条（一条改动动不了这么多读数）');
  }
  return {
    key,
    time: reqRealText(raw.time, path + '.time'),
    say: reqRealText(raw.say, path + '.say'),
    state,
    readings: readings.map((one, i) => readingOf(one, i, path + '.readings')),
    note: optRealText(raw.note, path + '.note'),
    tag: optRealText(raw.tag, path + '.tag'),
    lockedReason: state === 'locked' ? lockedReason : undefined,
    impact: raw.impact === undefined ? undefined : impactOf(raw.impact, path + '.impact'),
    go: optRealText(raw.go, path + '.go') ?? UNDO_TIMELINE_GO_TEXT[state],
    busy: optBool(raw.busy, path + '.busy') === true,
    error: optRealText(raw.error, path + '.error'),
  };
}

/* ── 入口 ────────────────────────────────────────────────────────── */

/** 入参归一化。**唯一入口**：`render.ts` 与运行时都只吃它产出的 `UndoTimelineModel`。 */
export function normalizeUndoTimeline(input: unknown): UndoTimelineModel {
  assertPlainObject(input, 'renderUndoTimeline: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? UNDO_TIMELINE_FORMS[0] : raw.form;
  if (!(UNDO_TIMELINE_FORMS as readonly unknown[]).includes(form)) {
    badInput('undo-timeline: input.form 必须是 ' + UNDO_TIMELINE_FORMS.join('／')
      + ' 之一（一条轨／一次改动的回滚单）');
  }

  const name = reqRealText(raw.name, 'undo-timeline: input.name');
  const common: UndoTimelineModel = {
    form: form as UndoTimelineForm,
    name,
    title: optRealText(raw.title, 'undo-timeline: input.title') ?? UNDO_TIMELINE_TITLE,
    cap: optRealText(raw.cap, 'undo-timeline: input.cap'),
    entries: [],
    rollback: undefined,
    openKey: undefined,
    emptyText: optRealText(raw.emptyText, 'undo-timeline: input.emptyText') ?? UNDO_TIMELINE_EMPTY_TEXT,
    hint: optRealText(raw.hint, 'undo-timeline: input.hint'),
    change: undefined,
    changeKey: optRealText(raw.changeKey, 'undo-timeline: input.changeKey') ?? UNDO_TIMELINE_CHANGE_KEY,
    extraClass: optExtraClass(raw.extraClass, 'undo-timeline: input.extraClass'),
  };

  /* ── 形态 `impact`：只读 `change` ── */
  if (form === 'impact') {
    if (raw.change === undefined) {
      badInput('undo-timeline: input.change 必填（形态 impact 就是"一次改动的回滚单"，没有它没有骨架）');
    }
    return { ...common, change: impactOf(raw.change, 'undo-timeline: input.change') };
  }

  /* ── 形态 `track`：只读 `entries` ── */
  if (raw.entries === undefined) {
    badInput('undo-timeline: input.entries 必填（形态 track 是一列改动；空数组＝出空态）');
  }
  const entriesRaw = reqList(raw.entries, 'undo-timeline: input.entries');
  if (entriesRaw.length > UNDO_TIMELINE_ENTRY_MAX) {
    badInput('undo-timeline: input.entries 至多 ' + String(UNDO_TIMELINE_ENTRY_MAX)
      + ' 条（再多请调用方按时间窗先筛）');
  }
  const seen = new Set<string>();
  const entries = entriesRaw.map((one, i) => entryOf(one, i, seen));

  const openKey = optRealText(raw.openKey, 'undo-timeline: input.openKey');
  if (openKey !== undefined) {
    const hit = entries.find((e) => e.key === openKey);
    if (hit === undefined) badInput('undo-timeline: input.openKey 必须命中 input.entries 里的一条改动：' + openKey);
    if (hit.impact === undefined) {
      badInput('undo-timeline: input.openKey 命中的那条改动没有 input.entries[].impact'
        + '（没有影响面的改动按下去直接派发事件，没有回滚单可摊开）');
    }
    /* 摊开的那张单里「撤销这 N 项」是能按的 ⇒ 只许摊开**能撤、没在跑**的那一条：
       `locked`／`undone` 的行按下去不该有动作，`busy` 的行等跑完再说（渲染出一块能派发的单等于留后门）。 */
    if (hit.state !== 'undoable') {
      badInput('undo-timeline: input.openKey 命中的那条改动 state 是 ' + hit.state
        + '（只有 state: \'undoable\' 的改动才有回滚单可摊开）');
    }
    if (hit.busy) {
      badInput('undo-timeline: input.openKey 命中的那条改动正在 busy（跑完再摊开：忙碌时那一块按不动）');
    }
  }

  let rollback: UndoTimelineRollback | undefined;
  if (raw.rollback !== undefined) {
    assertPlainObject(raw.rollback, 'undo-timeline: input.rollback');
    const r = raw.rollback as UndoTimelineRollback;
    rollback = {
      label: reqRealText(r.label, 'undo-timeline: input.rollback.label'),
      note: optRealText(r.note, 'undo-timeline: input.rollback.note'),
    };
  }

  return { ...common, entries, rollback, openKey };
}

/* ── 行内 `id` 的拼法住同目录 `ids.ts`（本文件已经贴着告警线，见那份的件头） ────── */

export {
  undoTimelineErrorId,
  undoTimelineHintId,
  undoTimelinePickId,
  undoTimelineSumId,
  undoTimelineTagId,
} from './ids.js';

/** 未使用的入参键（判据用：调用方多给键照实忽略，但键名要能一眼看出来）。 */
export type UndoTimelineInputShape = UndoTimelineInput;

/** 缺省卡头标题（判据与 README 按同一个常量对账，不各抄一份字面量）。 */
export const UNDO_TIMELINE_DEFAULT_TITLE = UNDO_TIMELINE_TITLE;
