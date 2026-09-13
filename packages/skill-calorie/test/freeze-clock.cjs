/**
 * #326 · 测试用「钉住时钟」预载件（`node --require` 载入，**不是**测试件故不匹配 `test/*.test.mjs`）。
 *
 * 为什么需要：`calorie.history` 的窗口是「最近 N 天」，锚点＝进程内的 `new Date()`
 * （`analysis/historyStore.ts` 的 `fmtDate` 取**本地**日，`viewHistory` 只传 `days`）。
 * 种子历史锚在固定两条日，只要真实当刻日期往前走出窗口，该门就由绿变红——
 * 这不是回归而是**与墙钟耦合**。测试用本件把「当刻」钉到固定时刻，判据即与当刻日期无关。
 *
 * 手法沿仓内既有先例 `docs/research/t63-line1-review-dateshift.mjs`（同一个 `--require` 钉 `Date` 写法）。
 * 只替换 `Date` 一个内建；`FAKE_NOW_ISO` 缺省时**原样不动**，故不设变量即按机器时钟跑。
 */
'use strict';

const raw = process.env['FAKE_NOW_ISO'];
if (raw !== undefined && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
  const RealDate = Date;
  const fixed = RealDate.parse(raw + 'Z');
  if (Number.isNaN(fixed)) throw new Error('FAKE_NOW_ISO 非法：' + raw);
  class FakeDate extends RealDate {
    constructor(...a) {
      if (a.length === 0) super(fixed);
      else super(...a);
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FakeDate;
}
