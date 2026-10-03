/** type-badge · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  ——页面徽章列（页型／口径两枚胶囊 ＋ 状态徽章 ＋ 按句分行的下一步动作）——
 *  判地＝`proto/acct-goal/` 十三件的页首徽章列；原件＝`packages/skill-bill/src/write/typeBadge.ts`。
 *  两档形态（**默认档零回归**）：
 *    · `form:'plain'`（缺省）＝两枚胶囊（`renderChips`）＋ 状态徽章（`renderStatusBadge`）＋ 口径行——账户／目标两域用的那一版；
 *    · `form:'row'`＝两枚胶囊收进一行（`renderChipRow` 的 `tailHtml`）＋ 状态徽章——写入域用的那一版（t728 起）。
 *  它替掉哪几种错法：三处逐字重写的组合（`write/typeBadge.ts`／`account/pageParts.badgeOf`／`goal/pageParts.badgeOf`）；
 *  下一步动作挤成一枚胶囊（一件事排了三件）。
 */
import { renderCaliberLine, renderChips, renderChipRow } from '../../blocks.js';
import { renderStatusBadge } from '../../controls.js';
import { assertPlainObject, badInput } from '../shared/validate.js';
import type { StatusKind } from '../../spec/controls.js';

/** 本件的类名根（胶囊／徽章／口径行三枚零件各自的类名由 blocks 出，本件只出组合）。 */
export const TYPE_BADGE_CLASS = 'ilife-block-type-badge';
/** 形态闭集（两档，见件头）。 */
export const TYPE_BADGE_FORMS = ['plain', 'row'] as const;
export type TypeBadgeForm = (typeof TYPE_BADGE_FORMS)[number];
/** 入参（六位，≤8）。 */
export interface TypeBadgeInput {
  /** 第一枚胶囊（页型／唤醒词那一类；空串＝不出这一枚）。 */
  readonly pageKind?: string;
  /** 第二枚胶囊（口径那一句；空串＝不出这一枚）。 */
  readonly caliber?: string;
  /** 状态徽章的语义色。 */
  readonly status: StatusKind;
  /** 状态徽章的字（空串＝只出语义色）。 */
  readonly statusText?: string;
  /** 下一步动作（整句；按句号分行，一句一行口径；空串＝不出）。 */
  readonly next?: string;
  /** 形态；缺省 `plain`。 */
  readonly form?: TypeBadgeForm;
}
/** 归一化后的入参。 */
export interface TypeBadgeModel {
  readonly pageKind: string;
  readonly caliber: string;
  readonly status: StatusKind;
  readonly statusText: string;
  readonly next: string;
  readonly form: TypeBadgeForm;
}
const ROOT_KEYS: readonly string[] = ['pageKind', 'caliber', 'status', 'statusText', 'next', 'form'];
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
/** 入参归一化（唯一入口）。 */
export function normalizeTypeBadge(input: unknown): TypeBadgeModel {
  // 抛错一律走公共层的 `badInput`（抛 `BlocksError`，与其余件同一类）；#1123 收尾：
  // 跨件不变量 ③ 要求未知键抛 `BlocksError`，第一版抛的是 `TypeError`，本行是修法。
  assertPlainObject(input, 'type-badge');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (!ROOT_KEYS.includes(k)) badInput('type-badge 不认识这个键：' + k);
  const form = raw.form === undefined ? 'plain' : raw.form;
  if (!(TYPE_BADGE_FORMS as readonly unknown[]).includes(form)) {
    badInput('type-badge.form 必须是 ' + TYPE_BADGE_FORMS.join('／') + ' 之一');
  }
  if (typeof raw.status !== 'string') badInput('type-badge.status 必须给');
  return {
    pageKind: str(raw.pageKind),
    caliber: str(raw.caliber),
    status: raw.status as StatusKind,
    statusText: str(raw.statusText),
    next: str(raw.next),
    form: form as TypeBadgeForm,
  };
}
/** 产徽章列（默认档＝账户／目标两域那一版；字节与 `badgeOf` 逐字相同）。 */
export function renderTypeBadge(input: unknown): string {
  const m = normalizeTypeBadge(input);
  const items: { text: string }[] = [];
  if (m.pageKind !== '') items.push({ text: m.pageKind });
  if (m.caliber !== '') items.push({ text: m.caliber });
  const badge = m.statusText === '' ? renderStatusBadge({ status: m.status }) : renderStatusBadge({ status: m.status, text: m.statusText });
  // 本件的**分组包裹节**：本件只做组合、零新视觉，故这一层从布局里退场（`display: contents`，
  // 与 `docPage` 的 `.ilife-write` 同一手法）——它同时是本件样式段的真实选择器（皮肤矩阵 ②）。
  const head = m.form === 'row'
    ? renderChipRow({ items, tailHtml: badge })
    : renderChips({ items }) + badge;
  const parts = ['<div class="' + TYPE_BADGE_CLASS + '">' + head + '</div>'];
  if (m.next !== '') {
    for (const line of m.next.split('。').map((s) => s.trim()).filter((s) => s !== '')) {
      parts.push(renderCaliberLine(line + '。'));
    }
  }
  return parts.join('');
}
