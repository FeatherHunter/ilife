/** command-palette · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的面板会让调用方以为自己拿到的是「能去哪儿、能做什么」的那块面。
 *      这一条管到两处**看得见**的漏（2026-09-25 对抗式审查席量出来、本席返修）：
 *      · **全空白串＝拒**（`'   '` 会在屏上留一块空白：空壳行、无字入口键、空的错态句、
 *        「不可用：   」这种说不清为什么的停用行）——口径与 `scatter-fit/model.ts` 的
 *        `reqRealText`／`optRealText` 同一条：空串＝未给（全层 `optText` 口径），**全空白＝拒**；
 *      · **入参表以外的键＝拒**（`{...ok, bogus:1}` 静默吞掉：写错一个键名，调用方以为自己设上了，
 *        屏上却没有——那正是「以为自己拿到了」的那种错）。
 *   2. **能算的都算出来**：可搜底串、屏上顺序（动作组在前、页面组在后）、脚注那句状态、
 *      空态那句、每一行的「这一行要干什么」——都在这里算好；`render.ts` 只拼标记，一个字都不算。
 *   3. **筛一次、只有一处改**：渲染期按 `query` 判一次「这一行露不露」，写进行的 `hidden`；
 *      运行时段只改这一位（不重排 DOM、不重建节点——重排会把输入法打断）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  COMMAND_PALETTE_FORMS,
  COMMAND_PALETTE_KINDS,
  COMMAND_PALETTE_TEXT,
  type CommandPaletteForm,
  type CommandPaletteKind,
} from './attrs.js';

/** 归一化后的一行（每个字段都已校验；`haystack`／`hidden`／`act` 都是算出来的）。 */
export interface CommandPaletteRow {
  readonly id: string;
  readonly kind: CommandPaletteKind;
  readonly label: string;
  readonly note?: string;
  readonly skill?: string;
  /** 行右那一格的字（执行／打开／不可用／调用方自己给的）。 */
  readonly act: string;
  /** 行右那一格走不走强调档（**是「这一行最像你要的」，不是「你选中了它」**）。 */
  readonly primary: boolean;
  readonly disabled: boolean;
  /** 可搜底串（小写）：主文字 ＋ 副文字 ＋ 来源技能 ＋ 别名，空格相连。 */
  readonly haystack: string;
  /** 渲染期按 `query` 判出来的「这一行现在露不露」；运行时段只改这一位。 */
  readonly hidden: boolean;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface CommandPaletteModel {
  readonly form: CommandPaletteForm;
  readonly id: string;
  readonly entry: string;
  readonly hint: string;
  readonly label: string;
  /** 上屏用的搜索词（已去首尾空白）。 */
  readonly query: string;
  /** 行：已按闭集顺序排好（**动作在前、页面在后**），组内保持调用方给的次序。 */
  readonly rows: readonly CommandPaletteRow[];
  /** 现在露着的行数（露着的才数）。 */
  readonly hits: number;
  /** 脚注那句：空输入列常用去处／命中几条／一条没中／正在找。 */
  readonly foot: string;
  /** 空态那句（没命中时上屏）。 */
  readonly empty: string;
  readonly error?: string;
  readonly loading: boolean;
  readonly extraClass?: string;
}

/** 机器值：非空、**只许标识符字符**（它要当 `id`／`popovertarget`／`data-*` 的值使）。 */
function reqIdentifier(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text)) {
    badInput(field + ' 只许标识符字符（字母、数字、下划线、连字符），它还要当 id 与 popovertarget 用');
  }
  return text;
}

/** 必填文本：非空串**且不是全空白**（全空白会在屏上留一块空白，那是看得到的错）。 */
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

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) badInput(field + ' 里没有 `' + key + '` 这个键（入参表以外的键一律拒：写错的键静默吞掉会让调用方以为自己设上了）');
  }
}

/** `CommandPaletteInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'items', 'entry', 'hint', 'label', 'query', 'error', 'loading', 'form', 'extraClass'] as const;

/** `CommandPaletteItem` 的键（一行的入参表）。 */
const ITEM_KEYS = ['id', 'kind', 'label', 'note', 'skill', 'go', 'primary', 'keywords', 'disabled', 'why'] as const;

/** 行的可搜底串：上屏的字 ＋ 别名，一律小写。 */
function haystackOf(label: string, note: string | undefined, skill: string | undefined, keywords: string | undefined): string {
  return [label, note, skill, keywords].filter((s) => s !== undefined).join(' ').toLowerCase();
}

/** 脚注那句状态（渲染期与运行时段**同一个口径**：按 `query` 与露着的行数挑一句）。 */
export function commandPaletteFoot(query: string, hits: number): string {
  const T = COMMAND_PALETTE_TEXT;
  if (query === '') return T.footIdle;
  if (hits === 0) return T.footNone;
  return T.footHitPre + String(hits) + T.footHitPost;
}

/** 空态那句（把用户打的词夹在中间；渲染期与运行时段同一句）。 */
export function commandPaletteEmpty(query: string): string {
  return COMMAND_PALETTE_TEXT.emptyPre + query + COMMAND_PALETTE_TEXT.emptyPost;
}

/** 一枚条目 → 一行（逐字段校验；`disabled` 必带 `why`）。 */
function reqItem(value: unknown, at: string, term: string, seen: Set<string>): CommandPaletteRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, ITEM_KEYS, at);
  const id = reqIdentifier(raw.id, at + '.id');
  if (seen.has(id)) badInput(at + '.id 与面板里前面某一项的 id 重了（每项的 id 面板内唯一）');
  seen.add(id);

  const kind = raw.kind;
  if (!(COMMAND_PALETTE_KINDS as readonly unknown[]).includes(kind)) {
    badInput(at + '.kind 必须是 ' + COMMAND_PALETTE_KINDS.join('／') + ' 之一（action＝动作、page＝页面）');
  }
  const label = reqRealText(raw.label, at + '.label');
  const note = optRealText(raw.note, at + '.note');
  const skill = optRealText(raw.skill, at + '.skill');
  const keywords = optRealText(raw.keywords, at + '.keywords');
  const go = optRealText(raw.go, at + '.go');

  const disabledRaw = raw.disabled;
  if (disabledRaw !== undefined && typeof disabledRaw !== 'boolean') {
    badInput(at + '.disabled 必须是布尔值');
  }
  const disabled = disabledRaw === true;
  const why = optRealText(raw.why, at + '.why');
  if (disabled && why === undefined) {
    badInput(at + '.disabled 为真时 input.' + at.slice(at.indexOf('items')) + '.why 必填：停用那一行要说得清为什么');
  }
  const primaryRaw = raw.primary;
  if (primaryRaw !== undefined && typeof primaryRaw !== 'boolean') badInput(at + '.primary 必须是布尔值');

  const T = COMMAND_PALETTE_TEXT;
  const act = disabled ? T.off : (go === undefined ? (kind === 'action' ? T.actAction : T.actPage) : go);
  const haystack = haystackOf(label, note, skill, keywords);
  return {
    id,
    kind: kind as CommandPaletteKind,
    label,
    note: disabled ? T.offPrefix + (why === undefined ? '' : why) : note,
    skill,
    act,
    primary: primaryRaw === true,
    disabled,
    haystack,
    hidden: term !== '' && !haystack.includes(term),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `CommandPaletteModel`。 */
export function normalizeCommandPalette(input: unknown): CommandPaletteModel {
  assertPlainObject(input, 'renderCommandPalette: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderCommandPalette: input');

  const form = raw.form === undefined ? COMMAND_PALETTE_FORMS[0] : raw.form;
  if (!(COMMAND_PALETTE_FORMS as readonly unknown[]).includes(form)) {
    badInput('command-palette: input.form 必须是 ' + COMMAND_PALETTE_FORMS.join('／')
      + ' 之一（本件只落地形态 A「单栏分组结果（动作在前／页面在后）」）');
  }

  const id = reqIdentifier(raw.id, 'command-palette: input.id');

  const list = raw.items;
  if (!Array.isArray(list) || list.length === 0) {
    badInput('command-palette: input.items 至少 1 条（面板里一条都没有，等于没有去处）');
  }
  /* `query` 是**搜索词**（不上屏的字），不是上屏文本：空串＝未给（全层口径），
     全空白＝**未给**（首尾空白一律 `trim` 掉——用户打的词带空格不算一条错）；
     上屏的那几处（入口／提示／无障碍名／错态／主文字／副文字／来源技能／行右那格）全空白＝拒。 */
  const queryRaw = optText(raw.query, 'command-palette: input.query');
  const query = queryRaw === undefined ? '' : queryRaw.trim();
  const term = query.toLowerCase();
  const seen = new Set<string>();
  const parsed = list.map((one, i) => reqItem(one, 'command-palette: input.items[' + String(i) + ']', term, seen));
  /* 屏上顺序＝闭集顺序（动作组在前、页面组在后），组内保持调用方给的次序。 */
  const rows = COMMAND_PALETTE_KINDS.flatMap((k) => parsed.filter((r) => r.kind === k));
  const hits = rows.filter((r) => !r.hidden).length;

  const loadingRaw = raw.loading;
  if (loadingRaw !== undefined && typeof loadingRaw !== 'boolean') {
    badInput('command-palette: input.loading 必须是布尔值');
  }
  const loading = loadingRaw === true;
  const entry = optRealText(raw.entry, 'command-palette: input.entry');
  const label = optRealText(raw.label, 'command-palette: input.label');
  const hint = optRealText(raw.hint, 'command-palette: input.hint');

  return {
    form: form as CommandPaletteForm,
    id,
    entry: entry === undefined ? COMMAND_PALETTE_TEXT.entry : entry,
    hint: hint === undefined ? COMMAND_PALETTE_TEXT.hint : hint,
    label: label === undefined ? (entry === undefined ? COMMAND_PALETTE_TEXT.entry : entry) : label,
    query,
    rows,
    hits,
    foot: loading ? COMMAND_PALETTE_TEXT.footBusy : commandPaletteFoot(query, hits),
    empty: commandPaletteEmpty(query),
    error: optRealText(raw.error, 'command-palette: input.error'),
    loading,
    extraClass: optExtraClass(raw.extraClass, 'command-palette: input.extraClass'),
  };
}
