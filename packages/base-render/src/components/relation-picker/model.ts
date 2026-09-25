/** relation-picker · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `command-palette/model.ts` 同一条）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      全空白串＝拒（屏上留空白是看得到的错）；入参表以外的键＝拒（写错键名静默吞掉最坑人）；
 *      稀疏数组＝拒（空洞会让校验遍历跳过、渲染那头抛 `TypeError`）。
 *   2. **能算的都算出来**：可搜底串、选中项的名字、「全部」组名、脚注与空态那两句、
 *      每一行露不露——都在这里算好；`render.ts` 只拼标记，一个字都不算。
 *   3. **引用完整性**：`recentKeys` 的每一项与 `selectedKey` 必须命中 `options` 里的一项；
 *      搜不到就地新建的那条路（`create` 键的值＝当前搜索词）也在这里拼好。
 */
import {
  assertDenseArray,
  assertPlainObject,
  badInput,
  optExtraClass,
  optText,
  reqText,
} from '../shared/validate.js';
import {
  RELATION_PICKER_FORMS,
  RELATION_PICKER_TEXT,
  type RelationPickerForm,
} from './attrs.js';

/** 机器键：非空、**只许标识符字符**（它要当 `id`／`popovertarget`／`data-*` 的值使）。 */
function reqKey(value: unknown, field: string): string {
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
    if (!allowed.includes(key)) badInput(field + ' 里没有 `' + key + '` 这个键（入参表以外的键一律拒）');
  }
}

/** `RelationPickerInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'label', 'options', 'recentKeys', 'selectedKey', 'query', 'allLabel',
  'readingLabel', 'newPrefix', 'emptyText', 'hint', 'error', 'open', 'form', 'extraClass'] as const;

/** `RelationPickerOption` 的键（一行的入参表）。 */
const OPTION_KEYS = ['key', 'title', 'note', 'reading'] as const;

/** 归一化后的一行（每个字段都已校验；`haystack`／`hidden`／`recent`／`selected` 都是算出来的）。 */
export interface RelationPickerRow {
  readonly key: string;
  readonly title: string;
  readonly note?: string;
  readonly reading?: string;
  /** 可搜底串（小写）：名字 ＋ 副语 ＋ 读数，空格相连。 */
  readonly haystack: string;
  /** 渲染期按 `query` 判出来的「这一行现在露不露」；运行时段只改这一位。 */
  readonly hidden: boolean;
  /** 是不是「最近用过」组里的那一行。 */
  readonly recent: boolean;
  /** 是不是当前选中的那一行（字段行与结果行读的是同一项）。 */
  readonly selected: boolean;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface RelationPickerModel {
  readonly form: RelationPickerForm;
  readonly id: string;
  readonly label: string;
  readonly rows: readonly RelationPickerRow[];
  /** 「最近用过」组里的行（按 `recentKeys` 的顺序）。 */
  readonly recents: readonly RelationPickerRow[];
  /** 「全部」组里的行（调用方给的顺序）。 */
  readonly all: readonly RelationPickerRow[];
  /** 「全部」组名的字。 */
  readonly allLabel: string;
  /** 读数列的列头（给了才出列头行）。 */
  readonly readingLabel?: string;
  /** 当前选中的那一行（没选＝`undefined`，字段行读「还没选」）。 */
  readonly selected?: RelationPickerRow;
  /** 上屏用的搜索词（已去首尾空白）。 */
  readonly query: string;
  /** 现在露着的行数（露着的才数）。 */
  readonly hits: number;
  /** 脚注那句：空输入列常用去处／命中几条／一条没中。 */
  readonly foot: string;
  /** 空态那句（没命中时上屏）。 */
  readonly empty: string;
  /** 新建那枚键上的字（把当前搜索词夹在中间；搜索词为空时退成「新建一个」）。 */
  readonly createLabel: string;
  /** 末行新建排前面那句。 */
  readonly newPrefix: string;
  readonly emptyText?: string;
  readonly hint?: string;
  readonly error?: string;
  /** 行内那一块摊开还是收起（`inline` 下：没选＝摊开，有选＝`open===true` 才摊开）。 */
  readonly expanded: boolean;
  readonly extraClass?: string;
}

/** 一枚选项 → 一行（逐字段校验；机器键表内唯一）。 */
function reqOption(value: unknown, at: string, term: string, seen: Set<string>): RelationPickerRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, OPTION_KEYS, at);
  const key = reqKey(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与表里前面某一项的 key 重了（每项的 key 表内唯一）');
  seen.add(key);
  const title = reqRealText(raw.title, at + '.title');
  const note = optRealText(raw.note, at + '.note');
  const reading = optRealText(raw.reading, at + '.reading');
  const haystack = [title, note, reading].filter((s) => s !== undefined).join(' ').toLowerCase();
  return {
    key, title, note, reading, haystack,
    hidden: term !== '' && !haystack.includes(term),
    recent: false, selected: false,
  };
}

/** 脚注那句状态（渲染期与运行时段**同一个口径**：按 `query` 与露着的行数挑一句）。 */
export function relationPickerFoot(query: string, hits: number): string {
  const T = RELATION_PICKER_TEXT;
  if (query === '') return T.footIdle;
  if (hits === 0) return T.footNone;
  return T.footHitPre + String(hits) + T.footHitPost;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `RelationPickerModel`。 */
export function normalizeRelationPicker(input: unknown): RelationPickerModel {
  assertPlainObject(input, 'renderRelationPicker: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderRelationPicker: input');

  const form = raw.form === undefined ? RELATION_PICKER_FORMS[0] : raw.form;
  if (!(RELATION_PICKER_FORMS as readonly unknown[]).includes(form)) {
    badInput('relation-picker: input.form 必须是 ' + RELATION_PICKER_FORMS.join('／')
      + ' 之一（overlay＝浮层选一个、inline＝行内展开选一个）');
  }

  const id = reqKey(raw.id, 'relation-picker: input.id');
  const label = reqRealText(raw.label, 'relation-picker: input.label');

  const list = raw.options;
  if (!Array.isArray(list) || list.length === 0) {
    badInput('relation-picker: input.options 至少 1 项（一个可选的都没有，等于没东西可选）');
  }
  assertDenseArray(list, 'relation-picker: input.options');
  /* `query` 是**搜索词**（不上屏的字）：空串＝未给，首尾空白一律去掉，只有空白＝未给。 */
  const queryRaw = optText(raw.query, 'relation-picker: input.query');
  const query = queryRaw === undefined ? '' : queryRaw.trim();
  const term = query.toLowerCase();
  const seen = new Set<string>();
  const parsed = list.map((one, i) => reqOption(one, 'relation-picker: input.options[' + String(i) + ']', term, seen));

  const recentRaw = raw.recentKeys;
  let recentKeys: string[] = [];
  if (recentRaw !== undefined) {
    if (!Array.isArray(recentRaw)) badInput('relation-picker: input.recentKeys 必须是机器键数组');
    assertDenseArray(recentRaw, 'relation-picker: input.recentKeys');
    if (recentRaw.length > 6) badInput('relation-picker: input.recentKeys 至多 6 项（最近用过只排最常用的几个）');
    const dup = new Set<string>();
    recentKeys = recentRaw.map((k, i) => {
      const key = reqKey(k, 'relation-picker: input.recentKeys[' + String(i) + ']');
      if (dup.has(key)) badInput('relation-picker: input.recentKeys[' + String(i) + '] 与前面重了');
      dup.add(key);
      if (!seen.has(key)) badInput('relation-picker: input.recentKeys[' + String(i) + '] 在 options 里没有这一项');
      return key;
    });
  }

  const selRaw = optText(raw.selectedKey, 'relation-picker: input.selectedKey');
  const selKey = selRaw === undefined ? undefined : selRaw.trim();
  if (selKey !== undefined && selKey === '') badInput('relation-picker: input.selectedKey 必须是真正的键（全空白不算）');
  if (selKey !== undefined && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(selKey)) {
    badInput('relation-picker: input.selectedKey 只许标识符字符');
  }
  if (selKey !== undefined && !seen.has(selKey)) {
    badInput('relation-picker: input.selectedKey 在 options 里没有这一项');
  }

  const rows = parsed.map((r) => ({
    ...r,
    recent: recentKeys.includes(r.key),
    selected: r.key === selKey,
  }));
  const recents = recentKeys.map((k) => rows.find((r) => r.key === k) as RelationPickerRow);
  const selected = selKey === undefined ? undefined : rows.find((r) => r.key === selKey);
  const hits = rows.filter((r) => !r.hidden).length;

  const allLabelRaw = optRealText(raw.allLabel, 'relation-picker: input.allLabel');
  const readingLabel = optRealText(raw.readingLabel, 'relation-picker: input.readingLabel');
  const newPrefixRaw = optRealText(raw.newPrefix, 'relation-picker: input.newPrefix');
  const T = RELATION_PICKER_TEXT;

  const openRaw = raw.open;
  if (openRaw !== undefined && typeof openRaw !== 'boolean') {
    badInput('relation-picker: input.open 必须是布尔值');
  }

  return {
    form: form as RelationPickerForm,
    id,
    label,
    rows,
    recents,
    all: rows,
    allLabel: allLabelRaw === undefined ? '全部' + label : allLabelRaw,
    readingLabel,
    selected,
    query,
    hits,
    foot: relationPickerFoot(query, hits),
    empty: optRealText(raw.emptyText, 'relation-picker: input.emptyText')
      === undefined ? T.emptyPre + query + T.emptyPost
      : (raw.emptyText as string).trim(),
    createLabel: query === '' ? T.createEmpty : T.createPre + query + T.createPost,
    newPrefix: newPrefixRaw === undefined ? T.newPrefix : newPrefixRaw,
    hint: optRealText(raw.hint, 'relation-picker: input.hint'),
    error: optRealText(raw.error, 'relation-picker: input.error'),
    expanded: form === 'inline' ? (selected === undefined ? true : openRaw === true) : true,
    extraClass: optExtraClass(raw.extraClass, 'relation-picker: input.extraClass'),
  };
}
