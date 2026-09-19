/**
 * #716 重出器的时钟冻结件（进程外预载，不进产物）。
 *
 * 为什么需要它：本票判据面里有两条与墙钟耦合的产出者——
 *   ① `photo/help.ts:62` 的 `new Date()` → `formatHelpMinute(now)`（HELP 文件副标题的分钟），
 *   ② 只读页复制日志第 5 段走 `render/receipt.ts` 的 `nowStamp()`（`new Date()` 直读、无注入口）。
 * 不冻钟时：同一份源码连出两遍只跨 1 秒就逐字节不同、换一天再跑窗口整体平移 ⇒
 * 「逐页逐字节相同」这条判据照字面既出假红也出假绿（#704 具名过这条前置）。
 *
 * 处置：**不动源码**，在进程外把时钟冻住。实现直接复用仓内既有件
 * `packages/skill-calorie/test/freeze-clock.cjs`（#326 立，靠 `FAKE_NOW_ISO` 钉钟）
 * ——不另写一份同类钉钟件，免得两处走散（先例：`docs/skills/skill-calorie/t715-freeze.mjs`）。
 *
 * 用法：node --import .scratch/t716/freeze.mjs packages/skill-calorie/dist/cli/cmd_read.js …
 */
import { createRequire } from 'node:module';

process.env.FAKE_NOW_ISO ??= '2026-09-18T12:00:00';
createRequire(import.meta.url)('../../packages/skill-calorie/test/freeze-clock.cjs');
