/** #336 双按钮一行 ＋ 标题去重（base 侧兜底）——单测。
 *
 *  口径（与派单逐条对上）：
 *  1. `renderCopyBlock` 标题「复制数据」与按钮同名时不出 `<h2>`（与 `copyArea` 去重口径对齐）；
 *  2. `renderActionBar` 有数据位则同时出复制数据＋复制日志（无日志位补禁用占位，互不串味，
 *     沿用 `ACTION_BAR_DEFAULTS` 双 label）；同一 ghost 行；
 *  3. 复制逻辑：数据→数据位原文（三格式为菜单各带各的 `data-t`），日志→日志位，成功回执保留
 *     （`renderErrorReceipt` 双位都在场仍全使能、无 `disabled`）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_BAR_DEFAULTS,
  ACTION_ID_ATTR,
  COPY_ACTION_IDS,
  COPY_FORMATS,
  DEFAULT_DATA_ATTR,
  renderActionBar,
  renderErrorReceipt,
} from '../dist/index.js';
import { renderCopyBlock } from '../dist/blocks.js';

const DATA_LABEL = ACTION_BAR_DEFAULTS.copyDataLabel;
const LOG_LABEL = ACTION_BAR_DEFAULTS.copyLogLabel;

function ghostRows(html) {
  return (html.match(/ilife-action-row-ghost/g) ?? []).length;
}

function buttons(html) {
  return (html.match(/<button /g) ?? []).length;
}

describe('#336 标题去重（base 侧兜底）', () => {
  it('标题「复制数据」与按钮同名 → 不出 h2，双按钮照出', () => {
    const html = renderCopyBlock({ title: '复制数据', dataText: 'D', logText: 'L' });
    assert.equal(html.includes('<h2'), false, '同名标题不得出 h2');
    assert.ok(html.includes('>' + DATA_LABEL + '</button>'), '复制数据按钮必须在');
    assert.ok(html.includes('>' + LOG_LABEL + '</button>'), '复制日志按钮必须在');
  });

  it('非同名标题照旧出 h2（如「复制榜单」）', () => {
    const html = renderCopyBlock({ title: '复制榜单', dataText: 'D', logText: 'L' });
    assert.ok(html.includes('<h2 class="ilife-block-copy-block-title">复制榜单</h2>'), '非同名标题必须出 h2');
  });

  it('无标题照旧不出 h2', () => {
    const html = renderCopyBlock({ dataText: 'D', logText: 'L' });
    assert.equal(html.includes('<h2'), false, '无标题不得出 h2');
  });
});

describe('#336 ActionBar 双按钮一行（有数据位即补日志位）', () => {
  it('单格式数据位单传 → 双按钮同行：数据带原文，日志禁用占位（无 data-t、disabled）', () => {
    const html = renderActionBar({ copyData: { actionId: 'cd', text: 'D' } });
    assert.equal(ghostRows(html), 1, '必须同一 ghost 行');
    assert.equal(buttons(html), 2, '必须两颗按钮');
    assert.ok(html.includes(ACTION_ID_ATTR + '="cd"'), '数据 id 必须保留调用方那颗');
    assert.ok(html.includes(ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.actionBar.copyLog + '"'), '日志 id 必须取冻结缺省');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="D"'), '数据位必须带原文');
    assert.ok(html.includes('>' + DATA_LABEL + '</button>'), '数据文案必须沿用缺省双 label');
    assert.ok(html.includes('>' + LOG_LABEL + '</button>'), '日志文案必须沿用缺省双 label');
    const logSeg = html.slice(html.indexOf(COPY_ACTION_IDS.actionBar.copyLog) - 200, html.indexOf(COPY_ACTION_IDS.actionBar.copyLog) + 300);
    void logSeg;
    // 日志占位段：有 disabled、无 data-t（互不串味：数据的 D 不得漏进日志位）。
    const logBtn = /<button[^>]*ilife-copy-log"[^>]*>复制日志<\/button>/.exec(html);
    assert.ok(logBtn !== null, '缺禁用态复制日志按钮');
    assert.ok(logBtn[0].includes('disabled'), '无对应位必须禁用');
    assert.equal(logBtn[0].includes(DEFAULT_DATA_ATTR), false, '禁用占位不得带 data-t（互不串味）');
  });

  it('三格式数据位单传 → 菜单三项各带各的 data-t ＋ 禁用日志同行', () => {
    const html = renderActionBar({
      copyData: { actionId: 'cd', formats: { text: 'T', json: 'J', csv: 'C' } },
      // 日志位缺席 → 应补禁用占位。
    });
    assert.equal(ghostRows(html), 1, '必须同一 ghost 行');
    for (const key of COPY_FORMATS) {
      assert.ok(html.includes('data-fmt="' + key + '"'), '菜单缺项：' + key);
    }
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="T"'), '纯文本项必须带自己的 data-t');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="J"'), 'JSON 项必须带自己的 data-t');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="C"'), 'CSV 项必须带自己的 data-t');
    const logBtn = /<button[^>]*ilife-copy-log"[^>]*>复制日志<\/button>/.exec(html);
    assert.ok(logBtn !== null && logBtn[0].includes('disabled'), '三格式下同样要补禁用日志');
  });

  it('双位都在场 → 照旧双使能（无 disabled），各带各的 data-t', () => {
    const html = renderActionBar({
      copyData: { actionId: 'cd', text: 'D' },
      copyLog: { actionId: 'cl', text: 'L' },
    });
    assert.equal(buttons(html), 2, '必须两颗');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="D"'), '数据位原文');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="L"'), '日志位原文');
    assert.equal(html.includes('disabled'), false, '两边都在场不得禁用任何一颗');
  });

  it('空输入仍空骨架（不补位）；仅日志位不补数据位', () => {
    const empty = renderActionBar({});
    assert.equal(buttons(empty), 0, '空输入不得补按钮');
    const logOnly = renderActionBar({ copyLog: { actionId: 'cl', text: 'L' } });
    assert.equal(buttons(logOnly), 1, '仅日志位不补数据位');
    assert.ok(logOnly.includes(DEFAULT_DATA_ATTR + '="L"'), '日志位原文保留');
    assert.equal(logOnly.includes('disabled'), false, '仅日志位不得禁用');
  });

  it('复制逻辑对位：成功回执双位都在场仍全使能（成功回执保留）', () => {
    const html = renderErrorReceipt({ message: 'e', dataText: 'D', logText: 'L' });
    assert.ok(html.includes('>' + DATA_LABEL + '</button>'), '回执数据按钮');
    assert.ok(html.includes('>' + LOG_LABEL + '</button>'), '回执日志按钮');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="D"'), '回执数据位原文');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="L"'), '回执日志位原文');
    assert.equal(html.includes('disabled'), false, '成功回执不得禁用（保留）');
  });
});
