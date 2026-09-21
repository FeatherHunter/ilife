/** 初始化域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 只有一条命令，且是**开库前分派**（`pre-open`）：`memo.init` 只渲染、不建库不写配置，
 * 库不存在时也要能跑——故它的处理函数只吃参数、不拿库句柄（出口 `main` 在开库之前调登记表）。
 * `example` 必须照抄即能跑：一条最小诊断 JSON（一项检查，无待办无验证）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runInit } from './run.js';

export const INIT_COMMANDS = [
  {
    kind: 'pre-open',
    key: 'memo.init',
    shape: 'receipt',
    title: '首次使用',
    wakeWord: '首次使用',
    example: 'memo-cmd-read memo.init --params \'{"data":{"items":[{"name":"数据目录","status":"ok"}],"todos":[],"verify":[]}}\'',
    run: runInit,
  },
] satisfies readonly CommandSpec[];
