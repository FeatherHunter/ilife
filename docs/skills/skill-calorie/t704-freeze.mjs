/**
 * #704 重出器的时钟冻结件（进程外预载，不进产物）。
 *
 * 为什么需要它：只读页的复制日志第 5 段走 `render/receipt.ts` 的 `nowStamp()`，
 * 那是 `new Date()` 的直接调用，没有注入口（件头自述：本仓唯一的时间戳口径，#239 起对外给出去）。
 * ⇒ 同一份源码连出两遍，只要跨过 1 秒，产物 sha256 必不同——「逐页逐字节相同」这条判据
 * 照字面就不可满足，红是假红、绿也可能假绿。
 *
 * 处置：**不动源码**，在进程外把时钟冻住（`node --import …`），判据保持字面口径不放宽。
 * 用法：node --import .scratch/t704/freeze.mjs packages/skill-calorie/dist/cli/cmd_read.js …
 */
const FIXED = new Date(2026, 8, 18, 12, 0, 0).getTime(); // 2026-09-18 12:00:00 本地时
const RealDate = Date;
class FrozenDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(FIXED);
    else super(...args);
  }
  static now() { return FIXED; }
}
globalThis.Date = FrozenDate;
