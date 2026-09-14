/**
 * #108／#109／#110 日期腐坏修复 · 测试用「就地钉钟」。
 *
 * 为什么需要：这三件的种子是**绝对日**（止于 2026-09-07），而它们要走的路由 cli 带的是**相对窗**
 * （`7d`／`本周`／`30d`／体成分与围度的缺省 90 天），锚点＝进程内「当刻」。真实墙钟一滑过种子末日，
 * 窗口就整个落到种子之外 → `missing-data`（exit 4）——这不是回归，是测试与墙钟耦合（日期腐坏）。
 *
 * 为什么钉 `Date`，而不是 #250 的 `CALORIE_TODAY`：`CALORIE_TODAY` 只覆盖 `todayISO()` 一条路
 * （`analysis/utils.ts`），而 `fetch/body.ts` 的 `daysAgo()` 等**直接读 `new Date()`**（体成分／围度
 * 缺省 90 天即走它）。只钉 `CALORIE_TODAY` 时，模拟「当刻 +365 天」体成分／围度两测仍会红（实测）。
 * 钉 `Date` 把进程里所有「当刻」读数一次盖住，且不新增产品语义：`todayISO()` 未被钉钟时照旧走
 * `new Date()`，钉钟后自然跟着走钉住的当刻。
 *
 * 为什么另起一件而不直接复用 #326 的 `freeze-clock.cjs`：那是 **`node --require` 预载**，
 * 钉的是 **spawn 出去的 CLI 子进程**；本三件走的是**就地 `dispatch()`**，子进程预载够不着。
 * 替换对象与写法是同一套（只换 `Date` 一个内建、只改无参构造与 `now()`）。
 *
 * 本件**不是测试件**（不匹配 `test/*.test.mjs`，不进 `pnpm test` 的 glob），与同目录
 * `declared.mjs`／`legacy-frozen-295.mjs` 同列。
 */

/** 钉住的时刻取当日 12:00Z：UTC 日与本地日（-12..+11）都落在同一天，避免时区把锚点挪一天。 */
const ANCHOR_UTC_HOUR = 'T12:00:00Z';

let realDate = null;

/**
 * 把进程内「当刻」钉到 `isoDay`（YYYY-MM-DD）当天。**整件生效**，重复调用以最后一次为准。
 * 只替换 `Date` 的无参构造与 `Date.now()`；带参构造、`parse`／`UTC` 等一律原样。
 */
export function pinClockTo(isoDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) throw new Error('pinClockTo 需 YYYY-MM-DD：' + isoDay);
  const fixed = Date.parse(isoDay + ANCHOR_UTC_HOUR);
  if (Number.isNaN(fixed)) throw new Error('pinClockTo 日期非法：' + isoDay);
  if (realDate === null) realDate = Date;
  const Base = realDate;
  class PinnedDate extends Base {
    constructor(...a) {
      if (a.length === 0) super(fixed);
      else super(...a);
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = PinnedDate;
}

/** 还原真钟（本仓三件都不用；留给「同一进程里既跑钉钟件又跑真钟件」的将来）。 */
export function unpinClock() {
  if (realDate !== null) {
    globalThis.Date = realDate;
    realDate = null;
  }
}
