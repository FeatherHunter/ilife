/** page-head · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件。
 *   2. **缺值与空串是两件事**：`reading.value` 给 `null` ＝ 缺值（写成 `—`）；给空串 ＝ 错。
 *   3. 归一化只做「形状」：取整、千分位、单位口径**归调用方**——本件只收「已经是给人看的样子」的串。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PAGE_HEAD_CALIBER_LABEL,
  PAGE_HEAD_FORMS,
  PAGE_HEAD_MISSING,
  type PageHeadForm,
  type PageHeadReading,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface PageHeadModel {
  readonly form: PageHeadForm;
  readonly skill: string;
  readonly domain?: string;
  readonly title: string;
  readonly reading: {
    readonly value: string;
    readonly unit?: string;
    readonly denominator?: string;
    readonly note?: string;
  };
  readonly sub: readonly string[];
  readonly caliber: readonly string[];
  readonly tool?: string;
  readonly extraClass?: string;
}

/** 串或串数组 → 段数组（`''` 与 `[]` 都按「不出这一行」处理；数组里的空串与非串一律拒）。 */
function reqTextList(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    const one = optText(value, field);
    return one === undefined ? [] : [one];
  }
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) out.push(reqText(value[i], field + '[' + i + ']'));
  return out;
}

/** 主读数：`null` ＝ 缺值（`—`）；空串与缺席都是错（它们说不清「这页到底有没有数」）。 */
function reqReading(value: unknown): PageHeadModel['reading'] {
  assertPlainObject(value, 'page-head: input.reading');
  const raw = value as PageHeadReading;
  const given: unknown = raw.value;
  let shown: string;
  if (given === null) {
    shown = PAGE_HEAD_MISSING;
  } else if (given === undefined) {
    badInput('page-head: input.reading.value 必填（缺值请显式给 null）');
  } else if (typeof given !== 'string') {
    badInput('page-head: input.reading.value 必须是字符串或 null（缺值）');
  } else if (given === '') {
    badInput('page-head: input.reading.value 不许给空串：缺值请给 null（写成 ' + PAGE_HEAD_MISSING + '）');
  } else {
    shown = given;
  }
  return {
    value: shown,
    unit: optText(raw.unit, 'page-head: input.reading.unit'),
    denominator: optText(raw.denominator, 'page-head: input.reading.denominator'),
    note: optText(raw.note, 'page-head: input.reading.note'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `PageHeadModel`，不再自己碰 `any`。 */
export function normalizePageHead(input: unknown): PageHeadModel {
  assertPlainObject(input, 'renderPageHead: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PAGE_HEAD_FORMS[0] : raw.form;
  if (!(PAGE_HEAD_FORMS as readonly unknown[]).includes(form)) {
    badInput('page-head: input.form 必须是 ' + PAGE_HEAD_FORMS.join('／') + ' 之一（本件只落地形态 B「读数当第二行」）');
  }

  const sub = reqTextList(raw.sub, 'page-head: input.sub');
  const caliber = reqTextList(raw.caliber, 'page-head: input.caliber');
  return {
    form: form as PageHeadForm,
    skill: reqText(raw.skill, 'page-head: input.skill'),
    domain: optText(raw.domain, 'page-head: input.domain'),
    title: reqText(raw.title, 'page-head: input.title'),
    reading: reqReading(raw.reading),
    sub,
    caliber,
    tool: optText(raw.tool, 'page-head: input.tool'),
    extraClass: optExtraClass(raw.extraClass, 'page-head: input.extraClass'),
  };
}

/** 口径行左端的标签（归一化期就定下来：口径行只要出，就带它）。 */
export const PAGE_HEAD_CALIBER = PAGE_HEAD_CALIBER_LABEL;
