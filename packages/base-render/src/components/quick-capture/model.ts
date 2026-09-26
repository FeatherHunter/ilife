/** quick-capture · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `relation-picker/model.ts`／`reminder-setter/model.ts` 同一条）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      · **上屏文本全空白＝拒**（`'   '` 会在屏上留一块空白：无字的一句话、无字的一格、无字的一枚候选；
 *        **零宽字符那类不可见字符同样算空白**——`String.prototype.trim()` 剥不掉它们，得先剥再判）；
 *      · **入参表以外的键＝拒**（写错一个键名，调用方以为自己设上了，屏上却没有；
 *        自有的不可枚举键与原型链上继承来的键**同样算**）；
 *      · **改不到的值＝拒**：一格现在认成的那一枚必须真的在它的候选里（否则屏上那一串从哪来）、
 *        `from` 与 `label` 必须恰好给一个（两个都给＝不知道印哪一条，都不给＝这一格没有名字）。
 *   2. **能算的都算出来**：每一格屏上读的那一串（`to`）、这一格叫什么（`name`）、它是不是**补出来的**
 *      （`added`）、候选带里哪一枚是现在这一枚（`on`）——都在这里算好；`render.ts` 只拼标记，一个字都不算。
 *   3. **一句话怎么拆由调用方给**：本件不猜「午饭」是哪一类、也不猜 32 元该记成 32.00 还是 3.20
 *      （那是各技能自己的词表）。故 `text` 与 `cells` **必须一起给**：屏上只印一半会自相矛盾。
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
  QUICK_CAPTURE_FORMS,
  QUICK_CAPTURE_MAX_CELLS,
  QUICK_CAPTURE_MAX_CHOICES,
  QUICK_CAPTURE_MAX_RECENT,
  QUICK_CAPTURE_MIN_CELLS,
  QUICK_CAPTURE_MIN_CHOICES,
  quickCaptureChoiceOn,
  type QuickCaptureForm,
} from './attrs.js';

/** 归一化后的一枚候选（`on`＝现在这一格认成的就是它）。 */
export interface QuickCaptureChoiceRow {
  readonly key: string;
  readonly label: string;
  readonly on: boolean;
}

/** 归一化后的一格。 */
export interface QuickCaptureCellRow {
  /** 这一格的机器键（事件 `detail.key`）。 */
  readonly key: string;
  /** 这一格叫什么：原文那一截（`from`），或补出来的那一格的名字（`label`）。 */
  readonly name: string;
  /** 是不是**补出来的**那一格（原文里没写，形是虚线边框，屏上不带引号）。 */
  readonly added: boolean;
  /** 现在认成的机器键。 */
  readonly value: string;
  /** 屏上那一串（从 `choices` 里算出来的，不信调用方重写一遍）。 */
  readonly to: string;
  readonly choices: readonly QuickCaptureChoiceRow[];
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface QuickCaptureModel {
  readonly form: QuickCaptureForm;
  readonly id: string;
  readonly text: string;
  readonly cells: readonly QuickCaptureCellRow[];
  /** 「记过的」那几条（原样，顺序＝屏上顺序；空数组＝不出这一条带）。 */
  readonly recent: readonly string[];
  readonly extraClass?: string;
}

/** 不可见字符：零宽与格式那一类（`\u200b` 零宽空格、`\u200c/\u200d` 连接符、`\u200e/\u200f` 方向标记、
 *  `\u2060` 词连接符、`\ufeff` 零宽不换行空格、`\u00ad` 软连字符）。`String.prototype.trim()` 不管它们
 *  ——它按 Unicode WhiteSpace 剥，这几个是格式类（Cf）——所以「全空白」的判定得先把它们剥掉
 *  （口径与 `reminder-setter/model.ts` 同一处；这里不是抄它的实现，是这层每个件各自守自己那几处文本）。 */
const INVISIBLE_RE = /[\u00ad\u200b-\u200f\u2060\ufeff]/g;

/** 「在屏上就是一块空白」：剥掉不可见字符再 `trim()`，剩下的还是空。 */
function isBlank(text: string): boolean {
  return text.replace(INVISIBLE_RE, '').trim() === '';
}

/** 机器值：非空、**只许标识符字符**（它要当 `data-*` 的值使）。 */
function reqIdentifier(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text)) {
    badInput(field + ' 只许标识符字符（字母、数字、下划线、连字符），它还要当 data-* 的值用');
  }
  return text;
}

/** 必填文本：非空串**且不是全空白**（全空白——含零宽那类不可见字符——会在屏上留一块空白，那是看得到的错）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (isBlank(text)) badInput(field + ' 必须是真正的文本（全空白不算，零宽字符这类不可见字符也不算）');
  return text;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *
 *  **两条都会被查到**（只走 `Object.keys` 会漏一半）：自有的**全部**键名（含不可枚举的）＋
 *  `for…in` 走**整条原型链**（继承来的键就是这一路）。 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：'
      + '写错的键静默吞掉会让调用方以为自己设上了；继承来的与不可枚举的键同样算）');
  }
}

/** `QuickCaptureInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'text', 'cells', 'recent', 'form', 'extraClass'] as const;
/** `QuickCaptureCell` 的键（一格的入参表）。 */
const CELL_KEYS = ['key', 'value', 'choices', 'from', 'label'] as const;
/** `QuickCaptureChoice` 的键（一枚候选的入参表）。 */
const CHOICE_KEYS = ['key', 'label'] as const;

/** 一格能改成的那几枚候选（1–6 枚；键在本格内唯一；名字上屏）。 */
function reqChoices(value: unknown, field: string): { key: string; label: string }[] {
  if (!Array.isArray(value)) {
    badInput(field + ' 必须是数组（这一格能改成的那 ' + String(QUICK_CAPTURE_MIN_CHOICES) + '–'
      + String(QUICK_CAPTURE_MAX_CHOICES) + ' 枚）');
  }
  assertDenseArray(value, field);
  if (value.length < QUICK_CAPTURE_MIN_CHOICES || value.length > QUICK_CAPTURE_MAX_CHOICES) {
    badInput(field + ' 要 ' + String(QUICK_CAPTURE_MIN_CHOICES) + '–' + String(QUICK_CAPTURE_MAX_CHOICES)
      + ' 枚，读到 ' + String(value.length) + ' 枚（一枚都改不了的格不该做成可点件）');
  }
  const seen = new Set<string>();
  return value.map((one, i) => {
    const at = field + '[' + String(i) + ']';
    assertPlainObject(one, at);
    const raw = one as Record<string, unknown>;
    assertKeys(raw, CHOICE_KEYS, at);
    const key = reqIdentifier(raw.key, at + '.key');
    if (seen.has(key)) badInput(at + '.key 与这一格前面某一枚重了（同一格内键唯一）');
    seen.add(key);
    return { key, label: reqRealText(raw.label, at + '.label') };
  });
}

/** 一句话拆出来的一格（逐字段校验；键在表内唯一）。 */
function reqCell(value: unknown, at: string, seen: Set<string>): QuickCaptureCellRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, CELL_KEYS, at);
  const key = reqIdentifier(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与表里前面某一格重了（每一格的 key 表内唯一）');
  seen.add(key);
  const choices = reqChoices(raw.choices, at + '.choices');
  const picked = reqIdentifier(raw.value, at + '.value');
  const onChoice = quickCaptureChoiceOn(choices.map((c) => c.key), picked);
  if (onChoice === '') {
    badInput(at + '.value 在 choices 里没有这一枚: ' + picked
      + '（这一格屏上读的那一串就是它的名字——不在候选里就印不出读数）');
  }
  const fromRaw = optText(raw.from, at + '.from');
  const labelRaw = optText(raw.label, at + '.label');
  if (fromRaw !== undefined && labelRaw !== undefined) {
    badInput(at + ' 的 from 与 label 只许给一个（给了原文那一截就不再给这一格的名字：'
      + '两个都给＝不知道该印哪一条）');
  }
  if (fromRaw === undefined && labelRaw === undefined) {
    badInput(at + ' 要给 from 或 label 之一（`from`＝原文那一截，`label`＝这一格叫什么；'
      + '一个都不给＝这一格没有名字，屏上读不出它是哪一格）');
  }
  const added = fromRaw === undefined;
  const name = reqRealText(added ? labelRaw : fromRaw, at + (added ? '.label' : '.from'));
  const on = choices.filter((c) => c.key === onChoice)[0];
  return {
    key,
    name,
    added,
    value: picked,
    to: on.label,
    choices: choices.map((c) => ({ key: c.key, label: c.label, on: c.key === onChoice })),
  };
}

/** 「记过的」那几条：0–4 条，每条是一句完整的话（非空、非全空白），**不许重**（同一句话摆两遍没意义）。 */
function reqRecent(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) badInput(field + ' 必须是数组（0–' + String(QUICK_CAPTURE_MAX_RECENT) + ' 条）');
  assertDenseArray(value, field);
  if (value.length > QUICK_CAPTURE_MAX_RECENT) {
    badInput(field + ' 至多 ' + String(QUICK_CAPTURE_MAX_RECENT) + ' 条，读到 ' + String(value.length) + ' 条');
  }
  const out: string[] = [];
  value.forEach((one, i) => {
    const at = field + '[' + String(i) + ']';
    const text = reqRealText(one, at);
    if (out.includes(text)) badInput(at + ' 与前面某一条重了（同一句话摆两遍没有意义）');
    out.push(text);
  });
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `QuickCaptureModel`。 */
export function normalizeQuickCapture(input: unknown): QuickCaptureModel {
  assertPlainObject(input, 'renderQuickCapture: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderQuickCapture: input');

  const form = raw.form === undefined ? QUICK_CAPTURE_FORMS[0] : raw.form;
  if (!(QUICK_CAPTURE_FORMS as readonly unknown[]).includes(form)) {
    badInput('quick-capture: input.form 必须是 ' + QUICK_CAPTURE_FORMS.join('／')
      + ' 之一（本件落地两档：`oneline`＝一行式录入 ＋ 解析预览，`drawer`＝常驻条 ＋ 推开的 6 格）');
  }

  const id = reqIdentifier(raw.id, 'quick-capture: input.id');
  const text = reqRealText(raw.text, 'quick-capture: input.text');

  const list = raw.cells;
  if (!Array.isArray(list)) {
    badInput('quick-capture: input.cells 必须是数组（一句话拆出来的那 '
      + String(QUICK_CAPTURE_MIN_CELLS) + '–' + String(QUICK_CAPTURE_MAX_CELLS) + ' 格）');
  }
  assertDenseArray(list, 'quick-capture: input.cells');
  if (list.length < QUICK_CAPTURE_MIN_CELLS || list.length > QUICK_CAPTURE_MAX_CELLS) {
    badInput('quick-capture: input.cells 要 ' + String(QUICK_CAPTURE_MIN_CELLS) + '–'
      + String(QUICK_CAPTURE_MAX_CELLS) + ' 格，读到 ' + String(list.length) + ' 格');
  }
  const seen = new Set<string>();
  const cells = list.map((one, i) => reqCell(one, 'quick-capture: input.cells[' + String(i) + ']', seen));

  const recentRaw = raw.recent;
  const recent = recentRaw === undefined ? [] : reqRecent(recentRaw, 'quick-capture: input.recent');

  return {
    form: form as QuickCaptureForm,
    id,
    text,
    cells,
    recent,
    /* `optText` 在这里只为把「不是字符串」挡掉；类名正则由 `optExtraClass` 管。 */
    extraClass: optExtraClass(optText(raw.extraClass, 'quick-capture: input.extraClass'),
      'quick-capture: input.extraClass'),
  };
}
