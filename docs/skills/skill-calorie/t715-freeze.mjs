/**
 * #715 重出器的时钟冻结件（进程外预载，不进产物）。
 *
 * 为什么需要它：这五页的复制日志都走 `render/receipt.ts` 的 `nowStamp()`（`new Date()` 直读、无注入口），
 * 且窗口缺省口径 `defaultRange(db, params)` 以「今天」为锚 ⇒ 不冻钟时
 * ① 同一份源码连出两遍只跨 1 秒就逐字节不同，「逐页逐字节相同」这条判据照字面既出假红也出假绿；
 * ② 换一天再跑，缺省窗口整体平移，既存的基线当场失效。
 *
 * 处置：**不动源码**，在进程外把时钟冻住。实现直接复用仓内既有件
 * `packages/skill-calorie/test/freeze-clock.cjs`（#326 立，靠 `FAKE_NOW_ISO` 钉钟）
 * —— 不另写一份同类钉钟件，免得两处走散。
 *
 * 用法：node --import .scratch/t715/freeze.mjs packages/skill-calorie/dist/cli/cmd_read.js …
 * 说明：`--import` 是 ESM 预载；被载入的自己是 CJS，用 createRequire 载入。
 */
import { createRequire } from 'node:module';

process.env.FAKE_NOW_ISO ??= '2026-09-18T12:00:00';
createRequire(import.meta.url)('../../packages/skill-calorie/test/freeze-clock.cjs');
