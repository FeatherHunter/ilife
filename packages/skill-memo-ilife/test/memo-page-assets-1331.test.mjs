/** #1331 备忘录页面资产里硬编码的复制按钮文案——单测。
 *
 *  风险 2（#1197 收口评审点名）：`src/render/memoPageAssets.ts` 的 `memoRuntimeJs()` 把
 *  错误回执卡两颗 copy 按钮的文案直接写死在页内 JS 里（「复制数据／复制日志」），
 *  英文渲染下页面资产因此仍印中文。
 *
 *  修法：生成时刻按当前渲染语言取词（`m()`），JSON 字面量拼进页内 JS。
 *  本件钉：中文下**逐字**仍是原来那两行（页内资产逐字节不变）；英文下出「Copy data／Copy log」。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runWithLanguage } from 'base-entries';
import { memoRuntimeJs } from '../dist/render/memoPageAssets.js';

const ZH_DATA_LINE = 'errorCopyBtn("memo-error-copy-data", "ilife-copy-btn-ghost", "复制数据", dataText);';
const ZH_LOG_LINE = 'errorCopyBtn("memo-error-copy-log", "ilife-copy-btn-ghost", "复制日志", logText);';
const EN_DATA_LINE = 'errorCopyBtn("memo-error-copy-data", "ilife-copy-btn-ghost", "Copy data", dataText);';
const EN_LOG_LINE = 'errorCopyBtn("memo-error-copy-log", "ilife-copy-btn-ghost", "Copy log", logText);';
const ZH_RETRY_LINE =
  'errorCopyBtn("memo-error-retry", "ilife-copy-btn-primary ilife-copy-btn-wide", "修正重试", retry);';
const EN_RETRY_LINE =
  'errorCopyBtn("memo-error-retry", "ilife-copy-btn-primary ilife-copy-btn-wide", "Retry", retry);';
const CJK = /[\u4e00-\u9fff]/u;

describe('#1331 备忘录页内资产复制按钮文案', () => {
  it('中文：两行生成文本与改动前逐字相同', () => {
    const js = runWithLanguage('zh', () => memoRuntimeJs());
    assert.ok(js.includes(ZH_DATA_LINE), '中文数据按钮行必须逐字不变');
    assert.ok(js.includes(ZH_LOG_LINE), '中文日志按钮行必须逐字不变');
    assert.ok(js.includes(ZH_RETRY_LINE), '中文修正重试按钮行必须逐字不变');
    assert.equal(js.includes('Copy data'), false, '中文资产不得混英文');
  });

  it('英文：两行生成文本出英文，不出中文按钮标签', () => {
    const js = runWithLanguage('en', () => memoRuntimeJs());
    assert.ok(js.includes(EN_DATA_LINE), '英文数据按钮行须取英文词条');
    assert.ok(js.includes(EN_LOG_LINE), '英文日志按钮行须取英文词条');
    assert.ok(js.includes(EN_RETRY_LINE), '英文修正重试按钮行须取英文词条');
    assert.equal(js.includes('"复制数据"'), false, '英文资产不得残留中文数据按钮标签');
    assert.equal(js.includes('"复制日志"'), false, '英文资产不得残留中文日志按钮标签');
    assert.equal(js.includes('"修正重试"'), false, '英文资产不得残留中文修正重试按钮标签');
    // 英文页内资产里凡 errorCopyBtn 调用行的标签都不得含汉字（#1331 验收：不含硬编码中文按钮标签）。
    const btnLines = js.split(String.fromCharCode(10)).filter((line) => line.includes('errorCopyBtn('));
    assert.ok(btnLines.length >= 3, 'errorCopyBtn 调用行应在生成文本里可见');
    for (const line of btnLines) {
      // 第 1 行是函数定义（形参无文案），其余是调用行；调用行的三参必须是英文。
      if (line.includes('function errorCopyBtn(')) continue;
      assert.equal(CJK.test(line), false, '英文资产仍含中文按钮标签行：' + line.trim());
    }
  });
});
