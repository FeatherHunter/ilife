/** T3 #22 · envelope 取数段（结构段）：取数函数产出可直接装 envelope 的载荷。
 *
 * 仅 type-only 消费 link-core（零运行时依赖，沿 02 render type-only 前例）；
 * version/skill 由 T11 cmd_read 统一装配，此处只定 shape+key+data。
 * key 命名空间形如 calorie.<域>_<动作>，registry 对不上即 fail（T11 校验）。
 */
import type { EnvelopeDataByShape, EnvelopeShape } from 'base-link-core';

export const CALORIE_SKILL = 'calorie' as const;

export function calorieKey(domain: string, op: string): string {
  return `${CALORIE_SKILL}.${domain}_${op}`;
}

export interface FetchPayload<S extends EnvelopeShape = EnvelopeShape> {
  shape: S;
  key: string;
  data: EnvelopeDataByShape[S];
}

export function fetchPayload<S extends EnvelopeShape>(
  shape: S, key: string, data: EnvelopeDataByShape[S],
): FetchPayload<S> {
  if (!key.startsWith(`${CALORIE_SKILL}.`)) {
    throw new Error(`key 命名空间非法（须 calorie.*）：${key}`);
  }
  return { shape, key, data };
}

// 域常用 key（T8-T10 渲染与 T11 出口复用同一命名）：
// T4 #23 落子时只定了 T3 四域；T4 五域（目标/计划/食品库/照片）key 在 T8 #27 内补，T9 #28 复用同值。
export const KEYS = {
  dietList: calorieKey('diet', 'list'),
  dietDetail: calorieKey('diet', 'detail'),
  dietStat: calorieKey('diet', 'stat'),
  dietReceipt: calorieKey('diet', 'receipt'),
  weightList: calorieKey('weight', 'list'),
  weightDetail: calorieKey('weight', 'detail'),
  weightStat: calorieKey('weight', 'stat'),
  weightReceipt: calorieKey('weight', 'receipt'),
  exerciseList: calorieKey('exercise', 'list'),
  exerciseStat: calorieKey('exercise', 'stat'),
  exerciseReceipt: calorieKey('exercise', 'receipt'),
  bodyList: calorieKey('body', 'list'),
  bodyStat: calorieKey('body', 'stat'),
  bodyReceipt: calorieKey('body', 'receipt'),
  goalStatus: calorieKey('goal', 'status'),
  goalHistory: calorieKey('goal', 'history'),
  nutritionGoal: calorieKey('nutrition', 'goal'),
  nutritionRecommend: calorieKey('nutrition', 'recommend'),
  planDetail: calorieKey('plan', 'detail'),
  planList: calorieKey('plan', 'list'),
  productList: calorieKey('product', 'list'),
  productDetail: calorieKey('product', 'detail'),
  photoList: calorieKey('photo', 'list'),
} as const;
