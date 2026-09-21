// 空间能力的路由声明（**权威源**，#800 新立）。
//
// 推位置／找位置补 `needs`（路由层即报缺槽位，exit 2 与处理函数内报错同档，话更明白）：
// 推位置须 category_id（建议实现按同类聚合），找位置须 reference（实现按名搜）。
// 推位置／找位置的宿主场景（SM2-1）复核未通过（见迁移对账 structure-landing.md），
// 路由保持现状，待用户重裁，不擅自改 key。

import type { HomeRouteSpec } from '../shared/commandSpec.js';

export const SPACE_ROUTES: readonly HomeRouteSpec[] = [
  { phrase: '推位置', key: 'home.location.query', needs: ['category_id'], preset: { mode: 'suggest' } },
  { phrase: '找位置', key: 'home.location.query', needs: ['reference'], preset: { mode: 'find' } },
  { phrase: '管位置', key: 'home.location.write', preset: { op: 'manage' } },
  { phrase: '固定位', key: 'home.location.write', preset: { op: 'fixed' } },
  { phrase: '收纳建议', key: 'home.location.query', preset: { mode: 'storage' } },
  { phrase: '空间视图', key: 'home.location.query', preset: { mode: 'space' } },
  { phrase: '位置管理', key: 'home.location.write', preset: { op: 'manage' } },
  { phrase: '整理一下家里的位置', key: 'home.location.write', preset: { op: 'manage' } },
  { phrase: '位置怎么分的', key: 'home.location.write', preset: { op: 'manage' } },
  { phrase: '设置固定位', key: 'home.location.write', preset: { op: 'fixed' } },
  { phrase: '给我定个固定位置', key: 'home.location.write', preset: { op: 'fixed' } },
  { phrase: '收纳位置建议', key: 'home.location.query', preset: { mode: 'storage' } },
  { phrase: '帮我找个地方放', key: 'home.location.query', preset: { mode: 'storage' } },
  { phrase: '浏览空间视图', key: 'home.location.query', preset: { mode: 'space' } },
  { phrase: '看看家里每个地方都有啥', key: 'home.location.query', preset: { mode: 'space' } },
  { phrase: '客厅里都有什么', key: 'home.location.query', preset: { mode: 'space' } },
];
