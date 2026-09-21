// 穿搭出行能力的路由声明（**权威源**，#800 新立）。
import type { HomeRouteSpec } from '../shared/commandSpec.js';

export const OUTFIT_ROUTES: readonly HomeRouteSpec[] = [
  { phrase: '穿什么', key: 'home.outfit.pick' },
  { phrase: '衣橱分析', key: 'home.outfit.pick', preset: { kind: 'wardrobe' } },
  { phrase: '换季', key: 'home.outfit.pick', preset: { kind: 'season' } },
  { phrase: '旅行穿搭', key: 'home.outfit.pick', preset: { kind: 'trip-plan' } },
  { phrase: '带物品', key: 'home.trip.manage', preset: { mode: 'pack' } },
  { phrase: '归物品', key: 'home.trip.manage', preset: { mode: 'return' } },
];
