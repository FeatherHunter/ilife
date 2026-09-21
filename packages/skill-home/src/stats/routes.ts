// 统计能力的路由声明（**权威源**，#800 新立）。
import type { HomeRouteSpec } from '../shared/commandSpec.js';

export const STATS_ROUTES: readonly HomeRouteSpec[] = [
  { phrase: '统物品(HTML)', key: 'home.stats.overview' },
  { phrase: '统物品', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '查高频', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '盘点统计', key: 'home.stats.overview', preset: { kind: 'inventory' } },
  { phrase: '统计物品', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '物品总览', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '家里都有啥', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '给我个总数', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '一共多少件', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '整体啥情况', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '查低频', key: 'home.stats.alert', preset: { kind: 'idle' } },
  { phrase: '查过期', key: 'home.stats.alert', preset: { kind: 'expiring' } },
  { phrase: '查闲置', key: 'home.stats.alert', preset: { kind: 'idle' } },
];
