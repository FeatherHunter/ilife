/** 分析域的命令声明（**权威源**，三条读命令）。
 *
 * 每条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从分析域声明（`src/analysis/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 形状照搬迁前的过渡表逐字不动（`src/render/envelope.ts` 那三行已在本票删掉，形状事实搬来这里）：
 *       `bill.analysis.overview`＝`stat`（`metrics` 全 number）、另两条＝`analysis`（`summary` 非空串）；
 *   - 可执行示例**照抄即能跑**：三条都在合成库上真跑过、退出码 0（示例里的窗口换成本月即本票
 *     `docs/skills/skill-bill/t729-探针-真出口.mjs` 跑的那几条）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 由 `pnpm gen` 重生成，
 *  `src/cli/cmd_read.ts` 一行不动（本票把这三条命令的 `case` 从出口分派里搬进来，见 `./read.js`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewAnalysisCompare, viewAnalysisOverview, viewAnalysisTrend } from './read.js';

export const ANALYSIS_COMMANDS = [
  {
    kind: 'read',
    key: 'bill.analysis.overview',
    shape: 'stat',
    title: '收支分析总览',
    example: 'bill-cmd-read bill.analysis.overview --params \'{"kind":"monthly","month":"2026-05"}\'',
    run: viewAnalysisOverview,
  },
  {
    kind: 'read',
    key: 'bill.analysis.compare',
    shape: 'analysis',
    title: '两段收支对比',
    example: 'bill-cmd-read bill.analysis.compare --params \'{"kind":"range","from1":"2026-04-01","to1":"2026-04-30","from2":"2026-05-01","to2":"2026-05-31"}\'',
    run: viewAnalysisCompare,
  },
  {
    kind: 'read',
    key: 'bill.analysis.trend',
    shape: 'analysis',
    title: '收支趋势与排行',
    example: 'bill-cmd-read bill.analysis.trend --params \'{"kind":"trend","months":6}\'',
    run: viewAnalysisTrend,
  },
] satisfies readonly CommandSpec[];
