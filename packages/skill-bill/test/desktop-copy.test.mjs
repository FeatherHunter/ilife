// t407 整改（二）的护栏：D1 桌面端 CSS 与 D2 复制区去重各自钉住，改坏一处就要红。
//
// 跑法：`node node_modules/typescript/bin/tsc -b packages/skill-bill --force` 之后 `node --test "packages/skill-bill/test/*.test.mjs"`。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assembleDocPage } from '../dist/shared/docPage.js';
import { copyArea, copyLog, undoExit } from '../dist/shared/copyArea.js';

describe('t407 整改（二）· D1 桌面端补丁只在宽屏生效', () => {
  const page = assembleDocPage({ docTitle: 't', title: 't', eyebrow: '', subtitle: '', content: '<p>x</p>' });
  it('head 样式带桌面补丁：1200px 以上内容列 1120、卡片 minmax(220px,1fr)', () => {
    assert.match(page, /@media \(min-width:1200px\)/, '桌面补丁的媒体查询不见了');
    assert.match(page, /\.ilife-block-page-shell \{ max-width: 1120px; \}/, '内容列 1120 不见了');
    assert.match(page, /minmax\(220px, 1fr\)/, '卡片 minmax(220px,1fr) 不见了');
  });
  it('手机端 CSS 不动：640 档断点仍在（复量不得回退的底）', () => {
    assert.match(page, /max-width: 640px/, '手机端 640 档断点不见了');
  });
});

describe('t407 整改（二）· D2 回执页只剩一组复制按钮', () => {
  it('undoExit 不再带复制按钮：无复制位、无 data-t，退出口仍在', () => {
    const html = undoExit(6);
    assert.ok(!html.includes('ilife-copy-btn'), '退出口又带出复制位按钮');
    assert.ok(!html.includes('data-t='), '退出口又带出 data-t 载荷');
    assert.ok(!html.includes('ilife-exit-undo-copy'), '退出口又带出旧的复制动作号');
    assert.ok(html.includes('撤销这一笔'), '退出口标记不见了');
  });
  it('复制区功能不受影响：数据三格式与日志载荷仍在 data-t 里', () => {
    const envelope = {
      version: '0.1.0', skill: 'bill', shape: 'receipt',
      key: 'bill.record.add', data: { ok: true, message: 'm' },
    };
    const html = copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({ command: "bill-cmd-read bill.record.add --params '{}'", actionAt: '2026-09-14 12:00:00' }),
      },
    });
    assert.ok(html.includes('复制数据') && html.includes('复制日志'), '复制区那组按钮不见了');
    assert.match(html, /data-t="[^"]*记账数据/, '复制数据载荷头行不见了');
  });
});
