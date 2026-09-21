// 票据凭证能力的路由声明（**权威源**，#800 新立）。
import type { HomeRouteSpec } from '../shared/commandSpec.js';

export const RECEIPT_ROUTES: readonly HomeRouteSpec[] = [
  { phrase: '查账号', key: 'home.ticket.query', preset: { kind: 'account' } },
  { phrase: '存账号', key: 'home.ticket.write', preset: { kind: 'account', op: 'add' } },
  { phrase: '改账号', key: 'home.ticket.write', preset: { kind: 'account', op: 'update' } },
  { phrase: '看密码', key: 'home.ticket.write', preset: { kind: 'account', op: 'show' } },
  { phrase: '查购买记录', key: 'home.ticket.query', preset: { kind: 'purchase' } },
  { phrase: '查上月购买', key: 'home.ticket.query', preset: { kind: 'purchase', range: 'last-month' } },
  { phrase: '查今年花费', key: 'home.ticket.query', preset: { kind: 'purchase', range: 'year' } },
  { phrase: '查退货窗口', key: 'home.ticket.query', preset: { kind: 'purchase', range: 'return' } },
  { phrase: '登记购买记录', key: 'home.ticket.write', preset: { kind: 'purchase', op: 'add' } },
  { phrase: '查保修状态', key: 'home.ticket.query', preset: { kind: 'warranty' } },
  { phrase: '登记保修', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'register' } },
  { phrase: '记录维修', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'repair' } },
  { phrase: '设置保养周期', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'cycle' } },
  { phrase: '执行保养', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'maintain' } },
  { phrase: '查证件到期', key: 'home.ticket.query', preset: { kind: 'cert' } },
  { phrase: '登记证件', key: 'home.ticket.write', preset: { kind: 'cert', op: 'add' } },
  { phrase: '证件归档', key: 'home.ticket.write', preset: { kind: 'cert', op: 'archive' } },
  { phrase: '更新证件', key: 'home.ticket.write', preset: { kind: 'cert', op: 'update' } },
];
