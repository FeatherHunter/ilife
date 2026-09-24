/** rank-list · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：猜出来的骨架会在页面上长成
 *      另一种东西，而调用方以为拿到了本件。
 *   2. **值给数、不给串**：条长按它算、数字也由它出——两处同源，才不会有「条长按 A、数字写 B」的榜。
 *   3. **占比不是本件算的**：窗内合计归调用方（末尾常有「其他 N 笔」聚合行），本件只把 0–100 的数
 *      写成一枚 `xx.x%`。名次同样归调用方：`rows` 的顺序就是名次，本件不排序也不并列。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  RANK_LIST_CALIBER_LABEL,
  RANK_LIST_FORMS,
  RANK_LIST_PODIUM_SIZE,
  type RankListForm,
} from './attrs.js';

/** 显示串：千分位 ＋ 最多两位小数（尾零去掉）＋ 负号。本件所有数字只经它上屏。 */
export function showNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = String(Math.abs(rounded));
  const dot = text.indexOf('.');
  const int = dot < 0 ? text : text.slice(0, dot);
  const frac = dot < 0 ? '' : text.slice(dot + 1);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (rounded < 0 ? '-' : '') + grouped + (frac === '' ? '' : '.' + frac);
}

/** 占比的显示串：一位小数 ＋ `%`（`31.7%`）。 */
function showShare(share: number): string {
  return (Math.round(share * 10) / 10).toFixed(1) + '%';
}

/** 条长：这一名的值 ÷ 全榜最大值（0–100 的一位小数）。**每一行都给条**（原型 A 的逐行区原本没有条）。 */
function widthOf(value: number, max: number): string {
  if (max <= 0) return '0';
  return String(Math.round((value / max) * 1000) / 10);
}

/** 一名归一化后的形状：名次文本、显示串、条长都在这里定下来，`render.ts` 只拼标记。 */
export interface RankListRowModel {
  /** 名次（从 1 数起：`rows` 的顺序就是名次）。 */
  readonly rank: number;
  /** 名次文本：进领奖台的写「第 N 名」，其余行写序号。 */
  readonly rankText: string;
  readonly name: string;
  readonly note?: string;
  readonly valueText: string;
  readonly shareText: string;
  readonly width: string;
}

/** 归一化后的入参（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface RankListModel {
  readonly form: RankListForm;
  /** 前三名（不足三名就有几名给几名）。 */
  readonly podium: readonly RankListRowModel[];
  /** 第 4 名及以后。 */
  readonly rest: readonly RankListRowModel[];
  readonly caliberLabel: string;
  readonly unit?: string;
  readonly caliber?: string;
  readonly extraClass?: string;
}

/** 必须是**有限数且 ≥ 0**（金额／次数／热量都不该是负的；负值的条长无从谈起）。 */
function reqAmount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数（榜单的值给数、不给串）');
  if (value < 0) badInput(field + ' 必须 ≥ 0（条长按「值 ÷ 全榜最大值」算，负值无长度可言）');
  return value;
}

/** 占比：0–100 的有限数（越界是调用方口径错了——不夹取、不静默）。 */
function reqShare(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数（0–100 的占比）');
  if (value < 0 || value > 100) badInput(field + ' 必须在 0–100 之间（占比口径归调用方，本件不夹取）');
  return value;
}

/** 一名归一化后、还没算条长与名次的中间形状。 */
interface RankListRawRow {
  readonly name: string;
  readonly note?: string;
  readonly value: number;
  readonly valueText: string;
  readonly shareText: string;
}

/** 一名：名称必填非空；值 ≥ 0；占比 0–100；副语可省。 */
function rowModel(raw: unknown, index: number): RankListRawRow {
  const field = 'rank-list: input.rows[' + index + ']';
  assertPlainObject(raw, field);
  const row = raw as Record<string, unknown>;
  const name = reqText(row.name, field + '.name');
  const value = reqAmount(row.value, field + '.value');
  const share = reqShare(row.share, field + '.share');
  const note = optText(row.note, field + '.note');
  return {
    name,
    value,
    valueText: showNumber(value),
    shareText: showShare(share),
    ...(note === undefined ? {} : { note }),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `RankListModel`。 */
export function normalizeRankList(input: unknown): RankListModel {
  assertPlainObject(input, 'renderRankList: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? RANK_LIST_FORMS[0] : raw.form;
  if (!(RANK_LIST_FORMS as readonly unknown[]).includes(form)) {
    badInput('rank-list: input.form 必须是 ' + RANK_LIST_FORMS.join('／') + ' 之一（本件只落地形态 A「领奖台」）');
  }
  const unit = optText(raw.unit, 'rank-list: input.unit');
  const caliber = optText(raw.caliber, 'rank-list: input.caliber');
  const extra = optExtraClass(raw.extraClass, 'rank-list: input.extraClass');

  const list = raw.rows;
  if (!Array.isArray(list)) badInput('rank-list: input.rows 必须是数组（顺序就是名次）');
  const rows = list.map((row, i) => rowModel(row, i));
  const max = rows.reduce((acc, r) => Math.max(acc, r.value), 0);
  const placed: RankListRowModel[] = rows.map((r, i) => {
    const rank = i + 1;
    return {
      rank,
      rankText: rank <= RANK_LIST_PODIUM_SIZE ? '第 ' + String(rank) + ' 名' : String(rank),
      name: r.name,
      ...(r.note === undefined ? {} : { note: r.note }),
      valueText: r.valueText,
      shareText: r.shareText,
      width: widthOf(r.value, max),
    };
  });

  return {
    form: form as RankListForm,
    podium: placed.slice(0, RANK_LIST_PODIUM_SIZE),
    rest: placed.slice(RANK_LIST_PODIUM_SIZE),
    caliberLabel: RANK_LIST_CALIBER_LABEL,
    ...(unit === undefined ? {} : { unit }),
    ...(caliber === undefined ? {} : { caliber }),
    ...(extra === undefined ? {} : { extraClass: extra }),
  };
}
