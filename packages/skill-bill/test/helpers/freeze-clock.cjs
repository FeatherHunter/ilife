/**
 * #726 · 测试用「钉住时钟」预载件（`node --require` 载入，**不是**测试件故不匹配 `test/*.test.mjs`）。
 *
 * 为什么需要：`bill.record.range` 的「本周／本月」窗口锚在**当刻**（`query/read.ts` 的
 * `rangeAnchor`，机器时钟 UTC 日）。老线用环境变量 `BILL_TODAY` 钉这个锚点，该变量随「环境变量
 * 全部删掉」（#675）退役；替代品就是本件——测试把「当刻」钉到固定时刻，判据即与真实日期无关。
 *
 * 手法沿仓内既有先例（`packages/skill-calorie/test/freeze-clock.cjs`，同一套 `--require` 钉 `Date` 写法）。
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
