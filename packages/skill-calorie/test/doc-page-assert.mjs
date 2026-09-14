/** 完整文档断言助手（#264 新建，唯一定义地）。
 *
 * 五连（`profile-receipt-175.test.mjs`／`wizard-86.test.mjs`／`profile-doc-179.test.mjs`
 * 三份各写一份的同一件事，本票收成一处；既有三份本票不动，留底座线收口）：
 * doctype ＋ charset ＋ 样式段 ＋ 脚本段 ＋ 版面。另带无残留标记断言
 * （`assembleDocPage` 的 `fillTemplate` 应把 `<!--SHARED-CSS-->` 等全换掉，残留即未装配完）。
 * 后续票（#342／#267 起）只引用它，不另写。
 *
 * 残留判据＝「**无未填充的模板残留标记**」，**不是**「全文一条 HTML 注释都不许有」：
 * 有意保留的口径注释是允许的，见 `TEMPLATE_RESIDUE` 旁的理由（#160 收口）。
 */
import { strict as assert } from 'node:assert';

/** 模板**未填充**的槽位标记（逐字表＝`base-render/src/spec/template.ts::TEMPLATE_MARKERS`
 *  里由 `fillTemplate` 填充的五个装配槽位）——与同族 `trend-homogeneity-110.test.mjs::docChecks`
 *  的 `noResidue`、`trend-misc-port-113.test.mjs::assertDoc` 同源同判据（#160 同步，三处一致）。 */
const TEMPLATE_RESIDUE = ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CHARTS-HELPERS-->', '<!--INJECT-DATA-->'];

/** 完整文档五连＋无残留：产物是 `assembleDocPage` 装出的整页（非片段）。 */
export function assertDocPage(html, what) {
  assert.ok(html !== null && html !== undefined, what + ' 未落盘');
  assert.ok(typeof html === 'string' && html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  /* 判据＝「无**未填充**的模板残留标记」，而不是「全文一条 HTML 注释都不许有」——上面那五个槽位
   * 是 `fillTemplate` 必须换掉的，残留即未装配完；这条照旧必红。
   * 但有些整页产物**有意保留**口径注释（#160 定稿：读者用不上的技术口径不进可见正文、改住 HTML 注释），
   * 例如组合配对页 `src/render/trendDocs.ts::buildCombinedDoc` 的 `techNote`（`<!-- 配对<key> 窗口<window> … -->`）、
   * 热量趋势页 `src/render/trendMiscPortDocs.ts::buildCalorieTrendDoc` 的 `techNote`
   * （`<!-- calorie.view.calorie-trend window <起> <止> … -->`）；其中 `配对…`／`窗口…`／
   * `calorie.view.calorie-trend` 正是 e2e（`.scratch/t381/e2e-check.mjs`）与 #380 查「入参真的落进产物」的唯一落点。
   * 故判据不能写成 `!html.includes('<!--')`——那是个**过宽的替身**，会把有意保留的口径注释一起判死。
   * 同理由与同款写法见 `trend-homogeneity-110.test.mjs::docChecks.noResidue`／`trend-misc-port-113.test.mjs::assertDoc`。 */
  assert.ok(TEMPLATE_RESIDUE.every((m) => !html.includes(m)), what + ' 有残留标记');
}
