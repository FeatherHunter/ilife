// 口径层·枚举校验（遗产 references/enums.py 原文）：难度/状态/火候/食材分类/评分。
// 错值一律抛 ChefPolicyError，永不返空冒充。
import { ChefPolicyError } from '../fetch/errors.js';

export const DIFFICULTIES = ['快手菜', '简单', '中等', '困难', '大师'] as const;
export const STATUSES = ['未做', '已做', '熟练', '已废弃'] as const;
export const HEATS = ['微火', '小火', '中火', '大火', '猛火'] as const;
export const INGREDIENT_CATEGORIES = ['肉类', '海鲜', '蛋类', '蔬菜', '葱姜蒜', '香草', '调料', '豆制品', '主食', '干货', '其他'] as const;

export function validateDifficulty(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim() || !(DIFFICULTIES as readonly string[]).includes(raw.trim())) {
    throw new ChefPolicyError('POLICY_BAD_DIFFICULTY', '难度非法（期望 快手菜/简单/中等/困难/大师）：' + JSON.stringify(raw));
  }
  return (raw as string).trim();
}

export function validateStatus(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim() || !(STATUSES as readonly string[]).includes(raw.trim())) {
    throw new ChefPolicyError('POLICY_BAD_STATUS', '状态非法（期望 未做/已做/熟练/已废弃）：' + JSON.stringify(raw));
  }
  return (raw as string).trim();
}

export function validateHeat(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim() || !(HEATS as readonly string[]).includes(raw.trim())) {
    throw new ChefPolicyError('POLICY_BAD_HEAT', '火候非法（期望 微火/小火/中火/大火/猛火）：' + JSON.stringify(raw));
  }
  return (raw as string).trim();
}

export function validateCategory(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ChefPolicyError('POLICY_BAD_CATEGORY', '食材分类非法（期望 肉类/海鲜/蛋类/蔬菜/葱姜蒜/香草/调料/豆制品/主食/干货/其他）：' + JSON.stringify(raw));
  }
  const t = (raw as string).trim();
  // 别名认可：水产=海鲜（口语别名），统一归一到水产；水产输入恒等返回。
  if (t === '水产' || t === '海鲜') return '水产';
  if (!(INGREDIENT_CATEGORIES as readonly string[]).includes(t)) {
    throw new ChefPolicyError('POLICY_BAD_CATEGORY', '食材分类非法（期望 肉类/海鲜/蛋类/蔬菜/葱姜蒜/香草/调料/豆制品/主食/干货/其他）：' + JSON.stringify(raw));
  }
  return t;
}

export function validateRating(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 5) {
    throw new ChefPolicyError('POLICY_BAD_RATING', '评分非法（期望 0-5 数字，允许小数）：' + JSON.stringify(raw));
  }
  return raw as number;
}
