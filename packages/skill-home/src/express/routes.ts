// 快递购物能力的路由声明（**权威源**，#800 新立）。
import type { HomeRouteSpec } from '../shared/commandSpec.js';

export const EXPRESS_ROUTES: readonly HomeRouteSpec[] = [
  { phrase: '查快递', key: 'home.shopping.query', preset: { kind: 'express' } },
  { phrase: '购物清单', key: 'home.shopping.query', preset: { kind: 'list' } },
  { phrase: '缺货检测', key: 'home.shopping.query', preset: { kind: 'missing' } },
  { phrase: '囤货盘点', key: 'home.shopping.query', preset: { kind: 'stock' } },
  { phrase: '改购物清单', key: 'home.shopping.write', preset: { op: 'check' } },
];
