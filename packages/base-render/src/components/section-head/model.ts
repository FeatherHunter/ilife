/** section-head · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `page-head` 同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」；
 *   2. 必填缺、类型错、闭集外、越界各点各的名（报错文案里带字段路径，调用方一眼定位）；
 *   3. 归一化只做「形状」：序号的十进写法、计数的文案**归调用方**——本件只收「已经是给人看的样子」的串。
 *
 *  唯一「受信透传」的字段是 `body`：它接已渲染好的区块标记，不转义（与 `sheet-frame.content` 同口径）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SECTION_HEAD_FORMS,
  SECTION_HEAD_SEQ_MAX,
  SECTION_HEAD_SEQ_MIN,
  type SectionHeadForm,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」）。
 *  `readonly` 的**可选**字段与 `exactOptionalPropertyTypes` 无关：本仓不开该档，`undefined` 即「不给」。 */
export interface SectionHeadModel {
  readonly form: SectionHeadForm;
  readonly title: string;
  readonly body: string;
  readonly seq?: number;
  readonly count?: string;
  readonly open: boolean;
  readonly id?: string;
  readonly extraClass?: string;
}

/** id 的合法形状：可作页内锚点、可进 `querySelector`（不以数字打头、无空白与引号）。 */
const ID_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** 序号：整数且在闭区间内；`undefined` 透传（＝不出这一槽）。 */
function optOrdinal(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  const range = SECTION_HEAD_SEQ_MIN + '–' + SECTION_HEAD_SEQ_MAX;
  if (typeof value !== 'number' || !Number.isInteger(value)) badInput(field + ' 必须是 ' + range + ' 的整数');
  if (value < SECTION_HEAD_SEQ_MIN || value > SECTION_HEAD_SEQ_MAX) {
    badInput(field + ' 必须在 ' + range + ' 之间，收到 ' + String(value));
  }
  return value;
}

/** 锚点 id：可省；给了就得是合法锚点。 */
function optId(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text === undefined) return undefined;
  if (!ID_RE.test(text)) badInput(field + ' 只许字母／数字／连字符，且不以数字打头：' + text);
  return text;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SectionHeadModel`，不再自己碰 `any`。 */
export function normalizeSectionHead(input: unknown): SectionHeadModel {
  assertPlainObject(input, 'renderSectionHead: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SECTION_HEAD_FORMS[0] : raw.form;
  if (!(SECTION_HEAD_FORMS as readonly unknown[]).includes(form)) {
    badInput('section-head: input.form 必须是 ' + SECTION_HEAD_FORMS.join('／')
      + ' 之一（本件只落地形态 C「可折叠小节」）');
  }

  const body: unknown = raw.body;
  if (typeof body !== 'string') {
    badInput('section-head: input.body 必须是字符串（受信标记，不转义；空小节给空串）');
  }

  const open: unknown = raw.open;
  if (open !== undefined && typeof open !== 'boolean') badInput('section-head: input.open 必须是布尔值');

  return {
    form: form as SectionHeadForm,
    title: reqText(raw.title, 'section-head: input.title'),
    body,
    seq: optOrdinal(raw.seq, 'section-head: input.seq'),
    count: optText(raw.count, 'section-head: input.count'),
    open: open === true,
    id: optId(raw.id, 'section-head: input.id'),
    extraClass: optExtraClass(raw.extraClass, 'section-head: input.extraClass'),
  };
}
