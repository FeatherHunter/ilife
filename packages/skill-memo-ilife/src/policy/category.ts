// 口径层·分类（M3）：顶层 4 种（备忘默认/心愿/打卡/情绪日记）；sub 自由文本可 NULL；子唤醒词自带顶层。
import { MemoPolicyError } from '../fetch/errors.js';

export const MEMO_TOPS = ['备忘', '心愿', '打卡', '情绪日记'] as const;
export type MemoTop = (typeof MEMO_TOPS)[number];
export const MEMO_DEFAULT_TOP: MemoTop = '备忘';

// 子唤醒词→顶层（记/查/改/删四组同表）。
export const WAKE_TOPS: Record<string, MemoTop> = {
  '记心愿': '心愿', '记打卡': '打卡', '记情绪日记': '情绪日记',
  '查心愿': '心愿', '查打卡': '打卡', '查情绪日记': '情绪日记',
  '改心愿': '心愿', '改打卡': '打卡', '改情绪日记': '情绪日记',
  '删心愿': '心愿', '删打卡': '打卡', '删情绪日记': '情绪日记',
};

export function normalizeTop(top: unknown): MemoTop {
  if (top === undefined || top === null || top === '') return MEMO_DEFAULT_TOP;
  if (typeof top !== 'string' || !MEMO_TOPS.includes(top as MemoTop)) {
    throw new MemoPolicyError('POLICY_BAD_CATEGORY', '未知顶层分类：' + String(top) + '（仅备忘/心愿/打卡/情绪日记）');
  }
  return top as MemoTop;
}

// sub 自由文本：空串/空白归一为 null（AI 推断不出维度时不追问）。
export function normalizeSub(sub: unknown): string | null {
  if (sub === undefined || sub === null) return null;
  if (typeof sub !== 'string') throw new MemoPolicyError('POLICY_BAD_CATEGORY', '子分类须为文本');
  const t = sub.trim();
  return t.length === 0 ? null : t;
}
