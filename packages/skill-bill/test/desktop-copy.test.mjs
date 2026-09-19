// t407 整改（二）的护栏：D1 桌面端 CSS 与 D2 复制区去重各自钉住，改坏一处就要红。
//
// 跑法：`node node_modules/typescript/bin/tsc -b packages/skill-bill --force` 之后 `node --test "packages/skill-bill/test/*.test.mjs"`。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assembleDocPage } from '../dist/shared/docPage.js';
import { copyArea, copyLog, undoExit } from '../dist/shared/copyArea.js';

describe('t407 整改（二）· D1 桌面端补丁只在宽屏生效（t728 换口径）', () => {
  const page = assembleDocPage({ docTitle: 't', title: 't', eyebrow: '', subtitle: '', content: '<p>x</p>' });
  // t728 换口径（票面判据 1「样式随它的选择器」）：改前本包自己写一条
  // `.ilife-block-page-shell { max-width: 1120px }`，于是桌面端**只有宽度补丁、没有版式**
  // （#728 诊断 R5：1200 以下没有专门版式，宽内容列里仍是单列长条、右侧一片空白）。
  // 现在版心与分栏回到公共层的**页面级配方**（`pageUi` ⑧／⑪ 段），本包只剩一条表格宽度收口。
  it('页面级配方已接线：viewport-fit=cover ＋ 版面根带 ilife-page-ui（两处可量测的证据）', () => {
    assert.match(page, /viewport-fit=cover/, 'viewport 串没带 viewport-fit=cover（iOS 安全区恒取 0）');
    assert.match(page, /class="wrap ilife-page ilife-page-ui"/, '版面根没挂 ilife-page-ui');
  });
  it('宽屏档在（只 ≥1001 生效）：正文列 880 ＋ 参数表单两列', () => {
    assert.match(page, /@media \(min-width: 1001px\)/, '宽屏版心档不见了');
    assert.match(page, /grid-template-columns: minmax\(0, 1fr\) 880px minmax\(0, 1fr\)/, '正文列 880 不见了');
    assert.match(page, /block-param-form \{\n    display: grid;/, '桌面端参数表单两列不见了');
  });
  it('本包不再写宽度补丁：1120 那一条不许回来', () => {
    assert.ok(!page.includes('max-width: 1120px'), '本包又长出一条自己的宽度补丁');
  });
  it('桌面端那条表格收口仍在 1200px 媒体查询里（只改呈现）', () => {
    assert.match(page, /@media \(min-width:1200px\) \{\n  \.ilife-block-page-shell \.ilife-block-data-table \{ max-width: none; \}/, '表格全宽那条不见了或跑到媒体查询外');
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
