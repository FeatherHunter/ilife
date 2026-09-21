/** 派生能力的路由声明（占位）：三组短语暂无 key。
 *
 * 三行对应 #767 资产里派生的三组短语，`key: 'tbd'`、`order: 0`（未入 `WAKE_TABLE`，
 * 运行时唤醒词未命中）。`cli` 为空串——无可跑命令行，占位等域票接入。
 * 对账脚本认 `key: 'tbd'` 行为 tbd 行（仅 relation/setup 允许出现）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 派生能力的路由声明表：恰好导出一个声明数组（全 tbd，域票接入时填实）。 */
export const RELATION_ROUTES: readonly RouteDecl[] = [
  {
    order: 0,
    wakeWord: '添加派生关系',
    key: 'tbd',
    cli: '',
  },
  {
    order: 0,
    wakeWord: '查看派生关系',
    key: 'tbd',
    cli: '',
  },
  {
    order: 0,
    wakeWord: '从已有派生新菜',
    key: 'tbd',
    cli: '',
  },
];
