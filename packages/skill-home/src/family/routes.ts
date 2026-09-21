// 家庭协作能力的路由声明（**权威源**，#800 新立）。
//
// 借出／借入／归还／催还 4 词是票面⑤新登记的写侧可达词，宿主场景 SM7-1（借用管理，
// prompt 操作含借出／借入／归还／催还）：借出／借入走登记（op=borrow，页面借出／借入
// 双向分区），归还走 op=return，催还走读侧借用列表（超期标记在查询结果里）。
// 查异常／首次使用／备份导出／导入恢复 4 词挂开始使用场景（SM8-2／SM8-1／SM8-3／
// SM8-4），键走本能力的 care 双键（键的家定在 family，见 care.ts 件头）。

import type { HomeRouteSpec } from '../shared/commandSpec.js';

export const FAMILY_ROUTES: readonly HomeRouteSpec[] = [
  { phrase: '查异常', key: 'home.care.query', preset: { kind: 'lint' } },
  { phrase: '借用', key: 'home.care.query', preset: { kind: 'borrow' } },
  { phrase: '借出', key: 'home.care.write', preset: { kind: 'borrow', op: 'borrow' } },
  { phrase: '借入', key: 'home.care.write', preset: { kind: 'borrow', op: 'borrow' } },
  { phrase: '归还', key: 'home.care.write', preset: { kind: 'borrow', op: 'return' } },
  { phrase: '催还', key: 'home.care.query', preset: { kind: 'borrow' } },
  { phrase: '家人档案', key: 'home.care.query', preset: { kind: 'member' } },
  { phrase: '首次使用', key: 'home.care.write', preset: { kind: 'init' } },
  { phrase: '备份导出', key: 'home.care.write', preset: { kind: 'backup' } },
  { phrase: '导入恢复', key: 'home.care.write', preset: { kind: 'import' } },
];
