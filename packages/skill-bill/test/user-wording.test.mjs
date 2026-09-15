// t407 整改（一）的护栏：**用户语言映射**与**徽章形状**各自钉住，改坏一处就要红。
//
// 为什么要补这一件：本轮变异自证发现两处判定当时**没有断言管着**——
//   变异 A 把 `userWording.ts` 里的 `category: '分类'` 改回 `'category'`，116 条测试与机审**仍全绿**；
//   变异 B 把 `typeBadge.ts` 的四枚形状退回一行 `·` 串（那正是本轮要治的病），同样**全绿**。
// 本件逐条钉：① 映射表里的中文名与「不上屏的那几个标识」；② 徽章那四枚形状各自的承载与「容器上不许有 `·`」。
//
// 跑法：`npx tsc -b packages/skill-bill --force` 之后 `node --test "packages/skill-bill/test/*.test.mjs"`。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { statusNoteOf, wakeWordOf, fieldLabelOf, nextStepOf, badgeTextOf } from '../dist/shared/userWording.js';
import { typeBadge } from '../dist/shared/typeBadge.js';

describe('t407 整改（一）· 用户语言映射只此一处', () => {
  it('库列名一律给中文名，认不得的照实返回（不静默抹掉）', () => {
    for (const [name, want] of [
      ['id', '记录编号'], ['category', '分类'], ['amount', '金额'], ['time', '时间'],
      ['account', '账户'], ['ledger', '账本'], ['currency', '币种'], ['note', '备注'],
      ['source_id', '原记录编号'], ['who', '往来对象'], ['total', '总额'], ['periods', '期数'],
      ['start_date', '首期日'], ['deleted_at', '撤销标记'], ['op', '这一步做什么'],
    ]) {
      assert.equal(fieldLabelOf(name), want, name + ' 的中文名对不上');
    }
    assert.equal(fieldLabelOf('没这个列'), '没这个列', '认不得的照实印出，不假装认得出');
    assert.equal(fieldLabelOf('  '), '', '空串给空串');
  });

  it('W1 补钉：category 单独直断言（单文件跑即能红，不靠循环与全包）', () => {
    assert.equal(fieldLabelOf('category'), '分类', "category 必须映成'分类'");
  });

  it('内部型名一律给唤醒词；认不得的与空串都落「记一笔」', () => {
    const WANT = {
      expense: '记支出', income: '记收入', photo: '拍账单', batch: '批量录入', refund: '记退款',
      reimburse: '记报销', 'reimburse-done': '报销到账', lend: '记借出', borrow: '记借入',
      collect: '记收回', repay: '记偿还', installment: '记分期', plain: '记一笔',
    };
    for (const [kind, want] of Object.entries(WANT)) assert.equal(wakeWordOf(kind), want, kind);
    assert.equal(wakeWordOf('没这个型'), '记一笔', '认不得的落通用词那一件');
    assert.equal(wakeWordOf(''), '记一笔');
  });

  it('金额 0 视同没给（上级裁定第 3 条）：值栏与说明栏都不摆 0.00', async () => {
    const { money2, moneyDirection } = await import('../dist/shared/summaryRow.js');
    assert.equal(money2(0), '未给', '金额 0 的值栏写「未给」，不摆 0.00');
    assert.equal(moneyDirection(0), '还没给', '金额 0 的说明写「还没给」');
    assert.equal(money2(null), '未给');
  });

  it('复制载荷头行不再拼命令名（上级裁定第 2 条）：text 头行写用户说法', async () => {
    const { buildDataText } = await import('base-paint');
    const { copyArea } = await import('../dist/shared/copyArea.js');
    const envelope = { version: 'v1', skill: 'bill', shape: 'receipt', key: 'record.add', data: { ok: true, message: 'x' } };
    const html = copyArea({ data: { envelope }, log: { envelope, copyLog: { command: 'c', source: 's', detail: 'd', actionAt: 't' } } });
    assert.ok(!html.includes('【bill'), '复制区里不得出现命令名头行');
    void buildDataText;
  });

  it('内部状态串给用户说法；工程话里的那几个标识一个都不许留下', () => {
    assert.equal(statusNoteOf('待补槽位 · 未写库（已阻断）'), '还没写库');
    assert.equal(statusNoteOf('写库成功'), '这一笔已保存');
    assert.equal(statusNoteOf('软删打标（deleted_at = now，不物理删）'), '已撤销，记录还在，随时可恢复');
    assert.equal(statusNoteOf('置 NULL（deleted_at 清空）'), '已恢复');
    assert.equal(statusNoteOf('本仓尚未定额的型'), '分类按三级挂靠', '这一句给人话，不隐藏');
    // 认不得的状态串照实返回（不猜、不静默抹掉）——这条与上一条一起，锁住「映射」与「兜底」两岔。
    assert.equal(statusNoteOf('半生不熟的态'), '半生不熟的态');
    // 「工程话不许留在用户说法里」只对**映射得出**的那些说：拿一对认得的原串与用户说法比。
    const PAIRS = [
      ['软删打标（deleted_at = now，不物理删）', '已撤销，记录还在，随时可恢复'],
      ['置 NULL（deleted_at 清空）', '已恢复'],
      ['三形态之一：缺记录编号 · 先挑一条', '先挑一条记录'],
      ['批量·现单笔化', '一次只落一笔'],
      ['写库成功', '这一笔已保存'],
    ];
    for (const [raw, user] of PAIRS) {
      assert.equal(statusNoteOf(raw), user, raw + ' 的用户说法对不上');
      for (const word of ['deleted_at', 'NULL', 'restore', 'prompt', 'bill.record', '软删', 'rebuild', '.ts']) {
        assert.ok(!user.includes(word), '内部词不得留在用户说法里：' + word + '（' + user + '）');
      }
    }
  });

  it('下一步动作四档：缺项／采集页／回执页／回执页带退出口', () => {
    assert.equal(nextStepOf({ page: 'collect', missing: 2, wakeWord: '记支出' }), '还差 2 项：补齐了，再说一遍「记支出」。');
    assert.equal(nextStepOf({ page: 'collect' }), '这一页先不写库；看准了就照下面那句复制。');
    assert.equal(nextStepOf({ page: 'receipt' }), '这一笔已经记下了，不用再做什么。');
    assert.ok(nextStepOf({ page: 'receipt', exit: true }).includes('撤销这一笔'), '带退出口那一档要点出「撤销」');
  });

  it('摆进徽标的那句话：行内 `·` 一律换掉（徽标是版式位）', () => {
    assert.equal(badgeTextOf('候选 #3：同分类近邻 · 金额与本笔不符'), '候选 #3：同分类近邻　金额与本笔不符');
    assert.equal(badgeTextOf('没有中点'), '没有中点');
  });
});

describe('t407 整改（一）· 徽章改成若干枚独立形状', () => {
  const html = typeBadge({
    kind: 'expense', status: 'danger',
    state: '待补槽位 · 未写库（已阻断）',
    next: nextStepOf({ page: 'collect', missing: 1, wakeWord: '记支出' }),
  });

  it('四枚形状各自在：唤醒词胶囊／状态徽章／下一步动作', () => {
    assert.ok(html.includes('ilife-block-chip'), '第一枚：唤醒词与这一页的口径那枚胶囊');
    assert.ok(html.includes('记支出'), '胶囊里写唤醒词');
    assert.ok(html.includes('支出 金额取负数'), '口径那一段（方向写清，不靠分隔符）');
    assert.ok(html.includes('ilife-status-badge'), '第二枚：页面状态徽章');
    assert.ok(html.includes('还没写库'), '状态徽章写用户说法');
    assert.ok(html.includes('ilife-block-caliber'), '第三枚：下一步动作那行');
    assert.ok(html.includes('还差 1 项'), '下一步动作说清要做什么');
  });

  it('版式容器上不许出现 `·`（连形状都不许退回一行串）', () => {
    for (const cls of ['ilife-block-chip', 'ilife-status-badge', 'ilife-block-caliber']) {
      const re = new RegExp('class="[^"]*' + cls + '[^"]*"[^>]*>([^<]*)<');
      const m = re.exec(html);
      assert.ok(m !== null, '这一枚形状要在：' + cls);
      assert.ok(m[1].trim() !== '', '这一枚形状要有话说：' + cls);
      assert.ok(!m[1].includes('·'), '这一枚形状里不许有 `·`：' + cls + ' → ' + m[1]);
    }
  });

  it('命令名不上屏（上级裁定第 1 条）：`bill.record.add` 一个字都不印', () => {
    assert.ok(!html.includes('bill.record.add'), '徽章里不得出现命令名');
    assert.ok(!html.includes('bill.record.update'), '徽章里不得出现命令名');
  });

  it('认不得的型不印内部话：给「分类按三级挂靠」而不是「本仓尚未定额的型」', () => {
    const other = typeBadge({
      kind: '没这个型', status: 'danger', state: '待补槽位 · 未写库',
      next: nextStepOf({ page: 'collect', missing: 1, wakeWord: '记一笔' }),
    });
    assert.ok(other.includes('分类按三级挂靠'), '认不得的型给用户能懂的口径');
    assert.ok(!other.includes('本仓尚未定额的型'), '内部话不上屏');
    assert.ok(!other.includes('key'), '命令名不上屏');
  });
});
