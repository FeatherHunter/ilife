// t407 移动端返工护栏：非复制区内部话清除＋符号串改形状＋复制标签写清给谁。
// 只断言呈现，不碰行为；新增文件，不改旧断言。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('t407 移动端返工 · 方向口径拆成独立形状', () => {
  it('summaryRow 不再用顿号分方向、分号缀分类', async () => {
    const { summaryRow } = await import('../dist/write/summaryRow.js');
    const html = summaryRow({ amount: null, category: '', account: '', ledger: '', time: '' });
    assert.ok(!html.includes('支出的金额记成负数、收入记成正数；'), '旧串须消失');
    assert.ok(html.includes('支出记负数') && html.includes('收入记正数'), '方向各一枚胶囊');
    assert.ok(html.includes('分类要选到最细那一级'), '分类单独一行');
  });
});

describe('t407 移动端返工 · 回执引导句分行', () => {
  it('nextStepOf 带退出口那档不用分号串两件事', async () => {
    const { nextStepOf } = await import('../dist/write/userWording.js');
    const s = nextStepOf({ page: 'receipt', exit: true });
    assert.ok(!s.includes('；'), '分号须消失');
    assert.ok(s.includes('撤销这一笔'), '仍要点出撤销');
  });
  it('typeBadge 按句分行各出一行口径', async () => {
    const { typeBadge } = await import('../dist/write/typeBadge.js');
    const { nextStepOf } = await import('../dist/write/userWording.js');
    const html = typeBadge({ kind: 'expense', status: 'ok', state: '写库成功', next: nextStepOf({ page: 'receipt', exit: true }) });
    const n = (html.match(/ilife-block-caliber/g) ?? []).length;
    assert.ok(n >= 2, '下一步动作须分行出两行口径，实得 ' + n);
  });
});

describe('t407 移动端返工 · diff 表走映射', () => {
  it('行名过 fieldLabelOf，列头用规范名词', async () => {
    const { diffOf, diffTable } = await import('../dist/write/diffTable.js');
    const rows = diffOf({ fields: ['deleted_at', 'note'], before: { deleted_at: null, note: 'a' }, after: { deleted_at: '2026-09-14 15:39:17', note: 'b' } });
    const html = diffTable({ rows });
    assert.ok(!html.includes('deleted_at'), '库列名不上屏');
    assert.ok(html.includes('撤销标记'), '映射到用户说法');
    // #728 第三轮换口径：列头从口语改写（`改了哪一项`）改成**规范名词**（`字段`）。
    // 维护者 2026-09-19 逐字：「图12太口语化」——规范词照 `docs/agents/wording.md` 取。
    assert.ok(html.includes('字段') && html.includes('改前') && html.includes('改后'), '列头用规范名词');
    assert.ok(!html.includes('改了哪一项'), '口语化列头不许回来');
  });
});

describe('t407 移动端返工 · 复制区写清给谁', () => {
  it('prompt 区标题写清复制给助手', async () => {
    const { promptCopyArea } = await import('../dist/shared/copyArea.js');
    const html = promptCopyArea('demo');
    assert.ok(html.includes('复制给助手'), '标题须写清给谁');
    assert.ok(html.includes('这一句可以直接复制'), '老字串保留，旧护栏不红');
  });
});
