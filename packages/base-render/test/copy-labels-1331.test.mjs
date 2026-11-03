/** #1331 复制区缺省按钮文案按语言取词——单测。
 *
 *  #1197 收口评审点名：英文渲染下 `renderCopyBlock`／`renderActionBar`／`renderErrorReceipt`
 *  的缺省复制按钮仍印「复制数据／复制日志」——缺省值原先直接取冻结契约
 *  `ACTION_BAR_DEFAULTS.copyDataLabel`／`copyLogLabel` 里的中文字面量。
 *
 *  本件钉两件事：
 *  1. 中文渲染下逐字仍是「复制数据／复制日志」（快照门另有逐字节比对，这里给直接断言）；
 *  2. 英文渲染下缺省路径出「Copy data／Copy log」，且标题去重判据跟着当前语言走
 *     （英文标题「Copy data」照样去重；中文标题「复制数据」在英文上下文里不再误去重）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runWithLanguage } from 'base-entries';
import { ACTION_BAR_DEFAULTS, renderActionBar, renderErrorReceipt } from '../dist/index.js';
import { renderCopyBlock } from '../dist/blocks.js';

const ZH_DATA = '复制数据';
const ZH_LOG = '复制日志';
const EN_DATA = 'Copy data';
const EN_LOG = 'Copy log';

function count(html, text) {
  return (html.match(new RegExp('>' + text + '</button>', 'g')) ?? []).length;
}

describe('#1331 复制区缺省按钮文案', () => {
  it('冻结常量仍是中文（本票不许改它的值）', () => {
    assert.equal(ACTION_BAR_DEFAULTS.copyDataLabel, ZH_DATA);
    assert.equal(ACTION_BAR_DEFAULTS.copyLogLabel, ZH_LOG);
  });

  it('中文：三处缺省路径逐字出「复制数据／复制日志」，不出英文', () => {
    const bar = runWithLanguage('zh', () => renderActionBar({ copyData: { actionId: 'a' }, copyLog: { actionId: 'b' } }));
    assert.equal(count(bar, ZH_DATA), 1, 'renderActionBar 数据位缺省文案必须是中文');
    assert.equal(count(bar, ZH_LOG), 1, 'renderActionBar 日志位缺省文案必须是中文');
    assert.equal(bar.includes(EN_DATA), false, '中文上下文不得混英文');

    const block = runWithLanguage('zh', () => renderCopyBlock({ dataText: 'D', logText: 'L' }));
    assert.equal(count(block, ZH_DATA), 1);
    assert.equal(count(block, ZH_LOG), 1);

    const receipt = runWithLanguage('zh', () => renderErrorReceipt({ message: 'e', dataText: 'D', logText: 'L' }));
    assert.equal(count(receipt, ZH_DATA), 1);
    assert.equal(count(receipt, ZH_LOG), 1);
  });

  it('英文：三处缺省路径出「Copy data／Copy log」，不出中文', () => {
    const bar = runWithLanguage('en', () => renderActionBar({ copyData: { actionId: 'a' }, copyLog: { actionId: 'b' } }));
    assert.equal(count(bar, EN_DATA), 1, 'renderActionBar 缺省文案须按语言取词');
    assert.equal(count(bar, EN_LOG), 1);
    assert.equal(bar.includes(ZH_DATA), false, '英文上下文不得混中文');
    assert.equal(bar.includes(ZH_LOG), false);

    const block = runWithLanguage('en', () => renderCopyBlock({ dataText: 'D', logText: 'L' }));
    assert.equal(count(block, EN_DATA), 1);
    assert.equal(count(block, EN_LOG), 1);
    assert.equal(block.includes(ZH_DATA), false);

    const receipt = runWithLanguage('en', () => renderErrorReceipt({ message: 'e', dataText: 'D', logText: 'L' }));
    assert.equal(count(receipt, EN_DATA), 1);
    assert.equal(count(receipt, EN_LOG), 1);
    assert.equal(receipt.includes(ZH_DATA), false);
  });

  it('英文：标题去重判据跟着当前语言走', () => {
    const enDup = runWithLanguage('en', () => renderCopyBlock({ title: 'Copy data', dataText: 'D' }));
    assert.equal(enDup.includes('<h2'), false, '英文标题与英文按钮同名时须去重');
    const zhTitleInEn = runWithLanguage('en', () => renderCopyBlock({ title: ZH_DATA, dataText: 'D' }));
    assert.ok(zhTitleInEn.includes('<h2'), '中文标题在英文上下文里与按钮不同名，须照常出 h2');
    const zhDup = runWithLanguage('zh', () => renderCopyBlock({ title: ZH_DATA, dataText: 'D' }));
    assert.equal(zhDup.includes('<h2'), false, '中文上下文维持改动前去重口径');
  });
});
