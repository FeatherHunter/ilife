/** 完整文档断言助手（#264 新建，唯一定义地）。
 *
 * 五连（`profile-receipt-175.test.mjs`／`wizard-86.test.mjs`／`profile-doc-179.test.mjs`
 * 三份各写一份的同一件事，本票收成一处；既有三份本票不动，留底座线收口）：
 * doctype ＋ charset ＋ 样式段 ＋ 脚本段 ＋ 版面。另带无残留标记断言
 * （`assembleDocPage` 的 `fillTemplate` 应把 `<!--SHARED-CSS-->` 等全换掉，残留即未装配完）。
 * 后续票（#342／#267 起）只引用它，不另写。
 */
import { strict as assert } from 'node:assert';

/** 完整文档五连＋无残留：产物是 `assembleDocPage` 装出的整页（非片段）。 */
export function assertDocPage(html, what) {
  assert.ok(html !== null && html !== undefined, what + ' 未落盘');
  assert.ok(typeof html === 'string' && html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}
