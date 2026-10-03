/** lookup-index · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 速查索引（h02 那一纸：8 锚 ＋ 8 组 ＋ 自律计数 ＋ 别名标黄不混数）——
 *
 *  锚点行是页内跳转（`<a href="#id">`，非筛选语义）；组内行复用“唤醒词 → 去向”
 *  的读法；别名行标黄且不混入总数（总数自律由 `total` 与 `countNote` 共同声明）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式与运行时都从这里取，不各写一份）。 */
export const LOOKUP_INDEX_CLASS = 'ilife-block-lookup-index';
/** 锚点标记（运行时按它找锚点行）。 */
export const LOOKUP_INDEX_ANCHOR_ATTR = 'data-lookup-anchor';
/** 组标记（锚点跳转的落点：`id` 与锚的 `href` 逐字相同）。 */
export const LOOKUP_INDEX_GROUP_ATTR = 'data-lookup-group';
/** 绑定标记（运行时幂等用）。 */
export const LOOKUP_INDEX_BOUND_ATTR = 'data-lookup-bound';
/** 运行时标记（文档根上只绑一次）。 */
export const LOOKUP_INDEX_RUNTIME_ATTR = 'data-lookup-runtime';
/** 别名标黄规则（别名行标黄、且不混入总数）。 */
export const LOOKUP_INDEX_ALIAS_MARK = '别名标黄、不混数';
/** 槽位闭集。 */
export const LOOKUP_INDEX_SLOTS = ['nav', 'anchor', 'group', 'head', 'row', 'wake', 'goto', 'note'] as const;
export type LookupIndexSlot = (typeof LOOKUP_INDEX_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function lookupIndexSlot(slot: LookupIndexSlot, prefix = 'ilife-'): string {
  return prefix + 'block-lookup-index-' + slot;
}
/** 一个锚点（`id` 与目标组的 `id` 逐字相同）。 */
export interface LookupAnchor { readonly id: string; readonly label: string; }
/** 组内一行（唤醒词 → 去向；`alias` 为真＝别名行，标黄且不混数）。 */
export interface LookupRow { readonly wake: string; readonly goto: string; readonly alias?: boolean; }
/** 一组（标题 ＋ 若干行）。 */
export interface LookupGroup { readonly label: string; readonly rows: readonly LookupRow[]; }
/** 速查索引入参（5 位）。 */
export interface LookupIndexInput {
  readonly anchors: readonly LookupAnchor[];
  readonly groups: readonly LookupGroup[];
  /** 总数（自律条里的那个数，如 77）。 */
  readonly total: number;
  /** 自律条（如“16+17+25+4+4+2+6+3=77，每行一遍”）。 */
  readonly countNote?: string;
  /** 别名说明（缺省“别名标黄、不混数”）。 */
  readonly aliasMark?: string;
  readonly extraClass?: string;
}
/** 归一化后的入参（内部形态）。 */
export interface LookupIndexModel {
  readonly anchors: readonly { readonly id: string; readonly label: string }[];
  readonly groups: readonly { readonly label: string; readonly rows: readonly { readonly wake: string; readonly goto: string; readonly alias: boolean }[] }[];
  readonly total: number;
  readonly countNote?: string;
  readonly aliasMark: string;
  readonly extraClass?: string;
}
/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['anchors', 'groups', 'total', 'countNote', 'aliasMark', 'extraClass'];
/** 一个锚点只许带的键。 */
const ANCHOR_KEYS: readonly string[] = ['id', 'label'];
/** 一组只许带的键。 */
const GROUP_KEYS: readonly string[] = ['label', 'rows'];
/** 组内一行只许带的键。 */
const ROW_KEYS: readonly string[] = ['wake', 'goto', 'alias'];

/** 总数量级上限：判据是「两笔同量级的读数相加会不会溢出」——`1e308` 是有限数，
 *  可它与任何同量级的读数相加就成 `Infinity`，屏上写出 `1e+308` 这种读不出来的数。 */
const LOOKUP_INDEX_MAGNITUDE_MAX = Number.MAX_VALUE;

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}

function reqAnchors(value: unknown): LookupIndexModel['anchors'] {
  if (!Array.isArray(value) || value.length === 0) badInput('renderLookupIndex: input.anchors 必须是非空数组');
  return value.map((a, i) => {
    assertPlainObject(a, 'renderLookupIndex: input.anchors[' + i + ']');
    assertKeys(a as Record<string, unknown>, ANCHOR_KEYS, 'renderLookupIndex: input.anchors[' + i + ']');
    const r = a as Record<string, unknown>;
    return { id: reqText(r.id, 'renderLookupIndex: input.anchors[' + i + '].id'), label: reqText(r.label, 'renderLookupIndex: input.anchors[' + i + '].label') };
  });
}
function reqGroups(value: unknown): LookupIndexModel['groups'] {
  if (!Array.isArray(value) || value.length === 0) badInput('renderLookupIndex: input.groups 必须是非空数组');
  return value.map((g, i) => {
    assertPlainObject(g, 'renderLookupIndex: input.groups[' + i + ']');
    assertKeys(g as Record<string, unknown>, GROUP_KEYS, 'renderLookupIndex: input.groups[' + i + ']');
    const r = g as Record<string, unknown>;
    const label = reqText(r.label, 'renderLookupIndex: input.groups[' + i + '].label');
    if (!Array.isArray(r.rows) || r.rows.length === 0) badInput('renderLookupIndex: input.groups[' + i + '].rows 必须是非空数组');
    const rows = (r.rows as unknown[]).map((row, j) => {
      assertPlainObject(row, 'renderLookupIndex: input.groups[' + i + '].rows[' + j + ']');
      assertKeys(row as Record<string, unknown>, ROW_KEYS, 'renderLookupIndex: input.groups[' + i + '].rows[' + j + ']');
      const o = row as Record<string, unknown>;
      const alias = o.alias === undefined ? false : o.alias;
      if (typeof alias !== 'boolean') badInput('renderLookupIndex: input.groups[' + i + '].rows[' + j + '].alias 必须是布尔值');
      return { wake: reqText(o.wake, 'renderLookupIndex: input.groups[' + i + '].rows[' + j + '].wake'), goto: reqText(o.goto, 'renderLookupIndex: input.groups[' + i + '].rows[' + j + '].goto'), alias };
    });
    return { label, rows };
  });
}
/** 入参归一化（唯一入口：`renderLookupIndex` 只吃它产出的模型）。 */
export function normalizeLookupIndex(input: unknown): LookupIndexModel {
  assertPlainObject(input, 'renderLookupIndex: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderLookupIndex: input 不得含内联事件字段：' + k);
  assertKeys(raw, ROOT_KEYS, 'renderLookupIndex: input');
  const total = raw.total;
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) badInput('renderLookupIndex: input.total 必须是非负有限数');
  if (Math.abs(total) + Math.abs(total) > LOOKUP_INDEX_MAGNITUDE_MAX) {
    badInput('renderLookupIndex: input.total 的量级太大：两笔同量级的读数相加就溢出成 `Infinity`'
      + '（屏上会写出 `1e+308` 这类读不出来的数）');
  }
  return {
    anchors: reqAnchors(raw.anchors),
    groups: reqGroups(raw.groups),
    total,
    countNote: optText(raw.countNote, 'renderLookupIndex: input.countNote'),
    aliasMark: optText(raw.aliasMark, 'renderLookupIndex: input.aliasMark') ?? LOOKUP_INDEX_ALIAS_MARK,
    extraClass: optExtraClass(raw.extraClass, 'renderLookupIndex: input.extraClass'),
  };
}
/** 渲染速查索引（纯函数：同样入参恒产同样字节；转义只经 `shared/escape.ts`）。 */
export function renderLookupIndex(input: unknown): string {
  const m = normalizeLookupIndex(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const parts: string[] = ['<div class="' + LOOKUP_INDEX_CLASS + extra + '">'];
  parts.push('<nav class="' + lookupIndexSlot('nav') + '" aria-label="速查锚点">');
  for (const a of m.anchors) {
    parts.push('<a class="' + lookupIndexSlot('anchor') + '" href="#' + esc(a.id) + '" ' + LOOKUP_INDEX_ANCHOR_ATTR + '="' + esc(a.id) + '">' + esc(a.label) + '</a>');
  }
  parts.push('</nav>');
  for (const g of m.groups) {
    const gid = 'lookup-' + g.label;
    parts.push('<section class="' + lookupIndexSlot('group') + '" id="' + esc(gid) + '" ' + LOOKUP_INDEX_GROUP_ATTR + '="' + esc(gid) + '">');
    parts.push('<h3 class="' + lookupIndexSlot('head') + '">' + esc(g.label) + '</h3>');
    for (const r of g.rows) {
      parts.push('<p class="' + lookupIndexSlot('row') + (r.alias ? ' is-alias' : '') + '">'
        + '<span class="' + lookupIndexSlot('wake') + '">' + esc(r.wake) + '</span>'
        + '<span class="' + lookupIndexSlot('goto') + '">' + esc(r.goto) + '</span></p>');
    }
    parts.push('</section>');
  }
  parts.push('<p class="' + lookupIndexSlot('note') + '">' + esc(m.aliasMark) + ' · 共 ' + String(m.total) + ' 条'
    + (m.countNote === undefined ? '' : ' · ' + esc(m.countNote)) + '</p>');
  parts.push('</div>');
  return parts.join('');
}
