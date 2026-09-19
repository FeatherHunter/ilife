// t407 第二步：写入域 16 条唤醒词的场景落点 ＋ 三个新冻的缺口块（候选单选／逐行可编辑表／diff 表）。
// 这一段只读 dist 的公开面，不碰库、不起命令：验的是「落点齐不齐」与「三个块的判定对不对」。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectWakeWord, routeWakeword } from '../dist/index.js';
import { SCENES, sceneFor } from '../dist/write/scene.js';
import { candidateEmpty, candidatePick, candidateRows } from '../dist/write/candidatePick.js';
import { rowEditorMissing, rowEditorTable } from '../dist/write/rowEditorTable.js';
import { diffChangeRows, diffOf, diffTable } from '../dist/write/diffTable.js';

const here = dirname(fileURLToPath(import.meta.url));

/** 写入域 16 条唤醒词，顺序照施工图 `t407-页面块清单-16词.md` 第二节。 */
const WORDS = [
  '记支出', '记收入', '拍账单', '批量录入', '记退款', '记报销', '报销到账',
  '记借出', '记借入', '记收回', '记偿还', '记分期', '记一笔',
  '改记录', '撤销', '恢复',
];

/** 每条词该落的那一件（与 `docs/skills/skill-bill/t407-场景落点清单.md` 逐行对）。 */
const EXPECTED_IDS = [
  'expense', 'income', 'photo', 'batch', 'refund', 'reimburse', 'reimburse-done',
  'lend', 'borrow', 'collect', 'repay', 'installment', 'plain',
  'update', 'undo', 'restore',
];

describe('t407 · 写入域 16 条唤醒词一场景一件', () => {
  it('16 条词各落一件：落点两两不同、顺序与清单一致、每件场景件在盘上', () => {
    assert.equal(WORDS.length, 16, '写入域就是 16 条词');
    const ids = WORDS.map((w) => {
      const r = routeWakeword(w, { id: 1 });
      return sceneFor({ key: r.key, kind: r.params.kind, op: r.params.op }).id;
    });
    assert.deepEqual(ids, EXPECTED_IDS);
    assert.equal(new Set(ids).size, 16, '一件一条词，不许两条词挤一件');
    for (const id of ids) {
      const file = join(here, '..', 'src', 'write', 'scene-' + id + '.ts');
      assert.ok(existsSync(file), '场景件须在盘上：' + file);
    }
  });

  it('登记表 16 行、与唤醒词表双向对得上（每件报的词都真路由到它自己那一件）', () => {
    assert.equal(SCENES.length, 16);
    for (const s of SCENES) {
      // #721 起落点行不写唤醒词了：按它认的 kind／op 从域声明算回那一条词。
      const word = projectWakeWord({ key: s.key, kind: s.kind, op: s.op });
      const r = routeWakeword(word, { id: 1 });
      assert.equal(r.key, s.key, word + ' 命令名对不上');
      assert.equal(String(r.params.kind ?? ''), s.kind, word + ' 的 kind 对不上');
      assert.equal(String(r.params.op ?? ''), s.op, word + ' 的 op 对不上');
      assert.ok(s.family.trim() !== '', word + ' 要写明待哪一族窗口来填');
      assert.equal(typeof s.collect, 'function');
      assert.equal(typeof s.receipt, 'function');
    }
  });

  it('认不得的 kind 落通用词那一件；不带 kind 的「记一笔」也落它', () => {
    assert.equal(sceneFor({ key: 'bill.record.add', kind: '没这个型' }).id, 'plain');
    assert.equal(sceneFor({ key: 'bill.record.add' }).id, 'plain');
    assert.equal(sceneFor({ key: 'bill.record.update' }).id, 'update');
    assert.equal(sceneFor({ key: 'bill.record.update', op: 'undo' }).id, 'undo');
    assert.equal(sceneFor({ key: 'bill.record.update', op: 'restore' }).id, 'restore');
  });
});

const CANDIDATES = [
  { id: 7, label: '餐饮/外卖/午餐 · 支付宝', amount: '-12.50', time: '2026-09-14 12:00:00', why: '同类同额，最近一笔' },
  { id: 9, label: '餐饮/外卖/晚餐 · 微信', amount: '-42.00', time: '2026-09-12 19:00:00', why: '同类，金额最接近' },
];

describe('t407 · 缺口块一：候选单选', () => {
  it('候选为空只出空态：不出下拉、不出表、不拿最近一笔兜底', () => {
    const html = candidatePick({ name: 'id', label: '原支出', candidates: [] });
    assert.ok(html.includes('没有可选的原支出'), '候选为空须出空态');
    assert.ok(html.includes('不拿最近一笔顶替'), '空态须写明不给兜底');
    assert.ok(!html.includes('<select'), '候选为空不出下拉');
    assert.ok(!html.includes('<table'), '候选为空不出表');
  });

  it('有候选：出下拉与记录表，每条带「为什么是它」，没给 selectedId 就不预选', () => {
    const html = candidatePick({ name: 'id', label: '原支出', candidates: CANDIDATES });
    assert.equal((html.match(/<select/g) ?? []).length, 1, '单选就一枚下拉');
    assert.ok(html.includes('<table'), '候选须列出记录表');
    assert.ok(html.includes('>#7</option>') && html.includes('#7'), '选项要带编号（详情在下表逐列列着）');
    assert.ok(html.includes('候选 #7：同类同额，最近一笔'), '每条候选要带依据徽标（只写第几条＋依据）');
    assert.ok(!html.includes('selected'), '没给 selectedId 就不预选（不拿第一条兜底）');
  });

  it('给了 selectedId 才预选；候选写不出依据就抛错，不静默出一张没有依据的表', () => {
    const html = candidatePick({ name: 'id', label: '原支出', candidates: CANDIDATES, selectedId: 9 });
    assert.ok(html.includes('selected'), '给了 selectedId 须预选那一条');
    assert.ok(html.includes('候选已认准 #9'), '预选那一条要写在口径行里');
    assert.throws(() => candidateRows([{ ...CANDIDATES[0], why: '   ' }]), /为什么是它/);
  });

  // 返工第 3 轮：这个共用件一句模板串错在两处，三页（报销到账／记偿还／记收回）同一行同时中招。
  it('空态模板串不重复、标点不粘连（一处救三页）', () => {
    const hint = '这一格要的是还没还回来的那笔借出；拿不准就让助手先查「查欠款」。';
    const html = candidatePick({ name: 'source_id', label: '借出记录编号', candidates: [], hint });
    assert.ok(!html.includes('这一格要的是这一格要的是'), '模板串不得重复');
    assert.ok(!html.includes('。，'), '句尾不得标点粘连');
    assert.ok(html.includes('这一格要的是还没还回来的那笔借出。列表里一条都没有。'), '正文两句各自成句');
    assert.ok(html.includes('拿不准就让助手先查「查欠款」。'), '后一句挪进「下一步」，一个字不丢');
  });
});

const FIELDS = [
  { name: 'amount', label: '金额', required: true },
  { name: 'category', label: '分类', required: true },
  { name: 'note', label: '备注' },
];

describe('t407 · 缺口块二：逐行可编辑表', () => {
  it('缺项逐行算得出来：只数必需列，可选列空着不算缺', () => {
    const missing = rowEditorMissing({
      fields: FIELDS,
      rows: [{ amount: '-12.5', category: '餐饮/外卖/午餐' }, { amount: '', category: '' }, { category: '交通/打车' }],
    });
    assert.deepEqual(missing, [
      { row: 2, fields: ['amount', 'category'] },
      { row: 3, fields: ['amount'] },
    ]);
  });

  it('表里逐行标红，红标说清第几行缺哪一列（用中文名报）', () => {
    const html = rowEditorTable({ name: 'batch', fields: FIELDS, rows: [{ amount: '-12.5' }, { category: '' }] });
    assert.ok(html.includes('第 1 行缺：分类'), '第 1 行缺分类须报出来：' + html.slice(0, 200));
    assert.ok(html.includes('第 2 行缺：金额、分类'), '第 2 行两列都缺须一并报出来');
    assert.ok(!html.includes('<table'), '可编辑表不是只读表格，不许用只读件顶');
  });

  it('零行只出空态；每行必需格齐了就不出红标，并给一行合计', () => {
    const empty = rowEditorTable({ name: 'batch', fields: FIELDS, rows: [] });
    assert.ok(empty.includes('这张表一行都没有'), '零行须出空态');
    assert.ok(!empty.includes('缺：'), '零行不该有缺项红标');
    const ok = rowEditorTable({
      name: 'batch', fields: FIELDS, totalOf: 'amount',
      rows: [{ amount: '-12.5', category: '餐饮/外卖/午餐' }, { amount: '-7.5', category: '交通/打车' }],
    });
    assert.ok(!ok.includes('缺：'), '每行齐了就别标红');
    assert.ok(ok.includes('合计 2 行，其中 2 行有金额，合计 -20.00'), '合计只算解析得出的格');
  });
});

describe('t407 · 缺口块三：diff 表', () => {
  it('原值与新值一样就不算改动，整块只出空态、不出表', () => {
    const rows = diffOf({
      fields: ['note', 'amount'],
      before: { note: '午饭', amount: '-12.5' },
      after: { note: '午饭', amount: '-12.5' },
    });
    assert.equal(rows.filter((r) => r.changed).length, 0, '一模一样就不算改动');
    const html = diffTable({ rows });
    assert.ok(html.includes('没有一处改动'), '零改动须出空态');
    assert.ok(!html.includes('<table'), '零改动不出空表');
    assert.equal(diffChangeRows({ rows }), '', '紧凑形态零改动返回空串');
  });

  it('只列真改动的行，行数与「共比了几个字段」分开报', () => {
    const rows = diffOf({
      fields: ['note', 'amount'],
      before: { note: '午饭', amount: '-12.5' },
      after: { note: '晚饭', amount: '-12.5' },
    });
    const html = diffTable({ rows });
    assert.ok(html.includes('<table'), '有改动须出表');
    assert.ok(html.includes('晚饭'), '新值要进表');
    assert.ok(html.includes('本次改动的字段（1 项）'), '只列真改动那一行');
    assert.ok(html.includes('共比了 2 个字段，真改动 1 个'), '比了几个与改了几个分开报');
    assert.ok(diffChangeRows({ rows }).includes('晚饭'), '紧凑形态要出改后那一栏');
  });

  it('没给这一列与给了空串同面（都写「未设置」）', () => {
    const rows = diffOf({ fields: ['note'], before: {}, after: { note: '' } });
    assert.equal(rows[0].before, '未设置');
    assert.equal(rows[0].changed, false, '都没给就是没改动');
  });
});
