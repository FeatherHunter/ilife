import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MEMO_KEY_SHAPES, memoShapeFor, buildMemoEnvelope, parseMemoEnvelope, escapeHtml, renderEnvelopeHtml, assertHtmlSize, MEMO_HTML_MAX_BYTES, MEMO_TEMPLATES, loadTemplate, fillTemplate, fillMemoPage, pageEnvelope, wishPlanSnapshot, MemoRenderError } from '../dist/render/index.js';;

const GOOD = {
  'memo.search': { items: [{ id: 1, content: '去医院复查', category: '备忘' }] },
  'memo.detail': { item: { id: 1, content: '去医院复查' } },
  'memo.create': { ok: true, message: '已记一条' },
  'memo.update': { ok: true, message: '已更新' },
  'memo.remove': { ok: true, message: '已废弃' },
  'memo.remind': { items: [] },
  'memo.wish': { items: [] },
  'memo.sync': { ok: true, message: '已同步' },
  'memo.batch': { ok: true, message: '批量完成' },
  // #229：命令表 10 → 11（缺省「备忘录 help」＝ HELP 文件那条主路，list 形＝域级索引载荷）。
  'memo.help.lookup': { items: [{ id: '1', icon: '📝', label: '备忘', subgroupCount: 1, sceneCount: 6 }], total: 1, version: '1.3.0' },
  // #665：命令表 11 → 12（飞书授权引导 memo.auth，回执形）。
  'memo.auth': { ok: true, message: '授权状态', step: 'status' },
  // #850：命令表 12 → 14（命令面四问：初始化渲染 memo.init＋提醒写 memo.reminder，回执形）。
  // #858：命令表 14 → 13（`memo.stats` 整条退役，见 `render/envelope.ts` 表头注）。
  'memo.init': { ok: true, message: '初始化报告已生成' },
  'memo.reminder': { ok: true, message: '提醒已设置' },
};

describe('memo 渲染层', () => {
  it('13 key 建 envelope 全字段可用', () => {
    assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 13);
    for (const [key, shape] of Object.entries(MEMO_KEY_SHAPES)) {
      assert.equal(memoShapeFor(key), shape);
      const env = buildMemoEnvelope(key, GOOD[key]);
      assert.equal(env.skill, 'memo');
      assert.equal(env.shape, shape);
      assert.ok(parseMemoEnvelope(JSON.parse(JSON.stringify(env))));
      assert.match(renderEnvelopeHtml(env), /<section/);
    }
  });
  it('坏 key/错形状 throw（#34 题面追认：未知形状/超体积一律 throw）', () => {
    assert.throws(() => memoShapeFor('memo.nope'), (e) => e instanceof MemoRenderError);
    assert.throws(() => buildMemoEnvelope('today', { items: [] }), (e) => e.code === 'MEMO_UNKNOWN_KEY');
    assert.throws(() => buildMemoEnvelope('memo.search', { noItems: 1 }), (e) => e.code === 'MEMO_SHAPE_MISMATCH');
    assert.throws(() => renderEnvelopeHtml({ version: '0.1.0', skill: 'memo', shape: 'nope', key: 'memo.search', data: {} }), (e) => e.code === 'MEMO_SHAPE_MISMATCH');
  });
  it('转义（代理对原样保留）与超体积门', () => {
    assert.equal(escapeHtml('<a>&"'), '&lt;a&gt;&amp;&quot;');
    const emoji = '\uD83D\uDE00';
    assert.ok(escapeHtml(emoji).includes(emoji));
    const env = buildMemoEnvelope('memo.create', GOOD['memo.create']);
    assert.match(renderEnvelopeHtml(env), /已记一条/);
    assert.throws(() => assertHtmlSize('x'.repeat(MEMO_HTML_MAX_BYTES + 1), MEMO_HTML_MAX_BYTES), (e) => e.code === 'MEMO_HTML_TOO_LARGE');
  });
  it('模板：7 随包（含 init_report，M6 落定；receipt＝通用回执族，#831），共享 filler 一次填完三标记', () => {
    assert.equal(MEMO_TEMPLATES.length, 7);
    for (const n of MEMO_TEMPLATES) {
      const t = loadTemplate(n);
      assert.ok(t.includes('<!--SHARED-CSS-->') && t.includes('<!--SHARED-HELPERS-->') && t.includes('<!--INJECT-DATA-->'));
      const filled = fillTemplate(t, { status: 'ok', data: {}, message: 'probe' });
      assert.ok(!filled.includes('<!--SHARED-CSS-->') && !filled.includes('<!--SHARED-HELPERS-->') && !filled.includes('<!--INJECT-DATA-->'));
      assert.ok(filled.includes('<style>') && filled.includes('<script'));
    }
    assert.throws(() => fillTemplate('无标记', {}), (e) => e instanceof MemoRenderError);
    assert.throws(() => loadTemplate('nope'), (e) => e instanceof MemoRenderError);
  });
  it('整页：信封＋快照＋填充一次成（排期向导为例）', () => {
    const snap = wishPlanSnapshot(
      [{ id: 1, content: '学游泳', category: '心愿', current_due: null, feishu_task_guid: null }],
      '2026-10-01',
      false,
    );
    const payload = pageEnvelope({
      commandCn: '心愿排期',
      wakeWord: '心愿排期',
      sceneId: 'wish-batch-plan',
      title: snap.title,
      summary: snap.summary,
      sections: snap.sections,
      copyLog: { thinking: 't', data_structure: 'd', call_chain: 'c', timestamp: 'ts', exception: '无' },
      extra: { items: [], suggest_due: '2026-10-01' },
      message: '找到 1 个心愿',
    });
    const html = fillMemoPage('wish_plan', payload);
    assert.ok(html.includes('心愿排期向导'));
    assert.ok(html.includes('window.copyText') && html.includes('window.toast'));
    assert.ok(!html.includes('<!--INJECT-DATA-->'));
  });
});
