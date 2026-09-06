// 口径层·分类/位置/状态（老家 references/categories.md + statuses.md 对应）。
// 8 顶级统一不带前缀；位置须两级路径；11 状态机；食品判定关键词（seed_key 落库前启发式）。
import { HomePolicyError } from '../fetch/errors.js';

export const HOME_TOPS = [
  '食物与饮品', '衣物与穿戴', '家居与陈设', '工具与器材',
  '数码与电子', '健康与医药', '文体与娱乐', '资产与凭证',
] as const;
export type HomeTop = (typeof HOME_TOPS)[number];

export const HOME_STATUSES = [
  '在家', '备用', '穿着中', '旅游中', '洗护中', '借用中', '维修中', '已用完', '快递中', '待处理', '已废弃',
] as const;

const FOOD_CATS = ['食物', '饮品', '饮料', '零食', '酒', '茶', '咖啡'];
const FOOD_NAMES = ['水', '奶', '茶', '咖啡', '果汁', '酒', '酸奶', '面包', '饼干', '米', '面', '油', '醋', '糖', '果', '菜', '肉', '蛋', '零食'];

export function normalizeLocation(loc: unknown): string {
  if (typeof loc !== 'string' || !loc.trim()) throw new HomePolicyError('POLICY_BAD_LOCATION', '位置须为非空字符串（至少两级，如 客厅/冰箱）');
  const segs = loc.replace(/／/g, '/').split('/').map((s) => s.trim()).filter(Boolean);
  if (segs.length < 2) throw new HomePolicyError('POLICY_BAD_LOCATION', '位置须至少两级路径：' + loc);
  return segs.join('/');
}

export function normalizeStatus(st: unknown): string {
  if (typeof st !== 'string' || !(HOME_STATUSES as readonly string[]).includes(st)) {
    throw new HomePolicyError('POLICY_BAD_STATUS', '非法状态：' + String(st) + '（11 态：' + HOME_STATUSES.join('、') + '）');
  }
  return st;
}

export function isFoodItem(category: string | null, name: string): boolean {
  const c = category ?? '';
  if (FOOD_CATS.some((k) => c.includes(k))) return true;
  return FOOD_NAMES.some((k) => name.includes(k));
}

export function validateCategoryName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 30) {
    throw new HomePolicyError('POLICY_BAD_CATEGORY', '分类名须 1~30 字非空');
  }
  const n = name.trim();
  if (/^[\d\[\(]/.test(n)) throw new HomePolicyError('POLICY_BAD_CATEGORY', '分类名禁数字前缀：' + n);
  if (/[\u{1F300}-\u{1FAFF}]/u.test(n)) throw new HomePolicyError('POLICY_BAD_CATEGORY', '分类名禁 emoji：' + n);
  return n;
}
