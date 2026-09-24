/** #336 双按钮一行 ＋ 标题去重（base 侧兜底）——单测。
 *
 *  口径（与派单逐条对上）：
 *  1. `renderCopyBlock` 标题「复制数据」与按钮同名时不出 `<h2>`（与 `copyArea` 去重口径对齐）；
 *  2. `renderActionBar` **只渲染真存在的动作**（#654 起：有数据位不再补禁用态复制日志占位，
 *     单颗时挂 `action-row-ghost-single` 让它在整行轨道铺满）；同一 ghost 行；
 *  3. 复制逻辑：数据→数据位原文（三格式为菜单各带各的 `data-t`），日志→日志位，成功回执保留
 *     （`renderErrorReceipt` 双位都在场，**那两颗复制按钮**仍全使能）。
 *
 *  口径收窄（#733 起，本件不改 UI 只改判据）：原先第 3 条断的是**整块回执一个 `disabled` 都不许有**，
 *  而 #733 起回执里那颗「修正重试」按设计就是**标记**而非可点控件——它不带 `data-action-id`，
 *  点了零动作零反馈，维护者逐字要求它「看起来就不能点」，于是它必须带 `disabled`。两件并存 ⇒
 *  整块断言会把 #733 的既定视觉判红。本件真正要守的是**复制那两颗**，故收窄到「这两颗不许禁用」，
 *  并把 #733 那一侧的「重试键必须看得出不能点」一并钉住（免得有人拿掉它的 `disabled` 来消红）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_BAR_DEFAULTS,
  ACTION_ID_ATTR,
  COPY_FORMATS,
  DEFAULT_DATA_ATTR,
  renderActionBar,
  renderErrorReceipt,
} from '../dist/index.js';
import { renderCopyBlock } from '../dist/blocks.js';

const DATA_LABEL = ACTION_BAR_DEFAULTS.copyDataLabel;
const LOG_LABEL = ACTION_BAR_DEFAULTS.copyLogLabel;

function ghostRows(html) {
  // 只数 ghost 行本体；`-single`（#654 单颗修饰类）是同一行的第二个类名，别数进来。
  return (html.match(/ilife-action-row-ghost(?!-)/g) ?? []).length;
}

function buttons(html) {
  return (html.match(/<button /g) ?? []).length;
}

/** 取「文案＝label」那颗按钮的**开始标签**（从它前面最近的 `<button`，到该按钮自己的 `>`）。
 *  用途：把「不许禁用」判到点名的那一颗上，而不是整块产物里有没有 `disabled` 这个子串。 */
function buttonTag(html, label) {
  const end = html.indexOf('>' + label + '</button>');
  assert.ok(end >= 0, '找不到按钮：' + label);
  return html.slice(html.lastIndexOf('<button', end), end + 1);
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

describe('#336／#654 ActionBar 双按钮一行（有数据位不再补日志位）', () => {
  it('#654 单格式数据位单传 → 只有一颗真按钮（不补禁用占位）＋ 挂单颗修饰类', () => {
    const html = renderActionBar({ copyData: { actionId: 'cd', text: 'D' } });
    assert.equal(ghostRows(html), 1, '必须同一 ghost 行');
    assert.equal(buttons(html), 1, '只许一颗按钮（#654：不许补点不动的占位）');
    assert.ok(html.includes('ilife-action-row-ghost-single'), '单颗必须挂单颗修饰类（几何靠列数，不靠假按钮）');
    assert.equal(html.includes('disabled'), false, '不该有任何禁用控件');
    assert.ok(html.includes(ACTION_ID_ATTR + '="cd"'), '数据 id 必须保留调用方那颗');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="D"'), '数据位必须带原文');
    assert.ok(html.includes('>' + DATA_LABEL + '</button>'), '数据文案必须沿用缺省 label');
    assert.equal(html.includes('>' + LOG_LABEL + '</button>'), false, '没有日志位就不该出现「复制日志」');
  });

  it('#654 三格式数据位单传 → 菜单三项各带各的 data-t，仍只有一颗真按钮', () => {
    const html = renderActionBar({
      copyData: { actionId: 'cd', formats: { text: 'T', json: 'J', csv: 'C' } },
      // #654：日志位缺席 → 不再补占位。
    });
    assert.equal(ghostRows(html), 1, '必须同一 ghost 行');
    for (const key of COPY_FORMATS) {
      assert.ok(html.includes('data-fmt="' + key + '"'), '菜单缺项：' + key);
    }
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="T"'), '纯文本项必须带自己的 data-t');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="J"'), 'JSON 项必须带自己的 data-t');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="C"'), 'CSV 项必须带自己的 data-t');
    // 菜单三项本身就是按钮（真动作，不算占位）；这里判的是「复制胶囊只有一颗」。
    assert.equal((html.match(/class="ilife-copy-btn(?!-)/g) ?? []).length, 1, '只许一颗复制胶囊（#654）');
    assert.equal(html.includes('disabled'), false, '不该有任何禁用控件');
    assert.equal(html.includes('>' + LOG_LABEL + '</button>'), false, '没有日志位就不该出现「复制日志」');
  });

  it('双位都在场 → 照旧双使能（无 disabled），各带各的 data-t，且不挂单颗修饰类', () => {
    const html = renderActionBar({
      copyData: { actionId: 'cd', text: 'D' },
      copyLog: { actionId: 'cl', text: 'L' },
    });
    assert.equal(buttons(html), 2, '必须两颗');
    assert.equal(html.includes('ilife-action-row-ghost-single'), false, '两颗时不得挂单颗修饰类（#247 两列平分）');
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
    assert.equal(buttonTag(html, DATA_LABEL).includes('disabled'), false, '回执「复制数据」不得禁用（#336 保留）');
    assert.equal(buttonTag(html, LOG_LABEL).includes('disabled'), false, '回执「复制日志」不得禁用（#336 保留）');
    assert.ok(buttonTag(html, '修正重试').includes('disabled'), '#733：重试标记键必须看得出来不能点');
  });
});
