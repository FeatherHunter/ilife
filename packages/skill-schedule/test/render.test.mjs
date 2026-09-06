import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEDULE_KEY_SHAPES, scheduleShapeFor, buildScheduleEnvelope, parseScheduleEnvelope,
  renderEnvelopeHtml, assertHtmlSize, estimateBytes,
  templateFor, loadTemplate, fillTemplate, SCHEDULE_TEMPLATES,
  buildRecordToday, buildRecordRange, buildRecordDetail, buildRecordReceipt,
  buildRecordCompare, buildCategoryDeep, buildAnomaly, buildPlanToday, buildPlanReceipt, buildHelpItems,
  ScheduleRenderError,
} from '../dist/index.js';

const REC = { id: 1, date: '2026-09-06', time_start: '09:00', time_end: '10:00', duration_minutes: 60, activity: '调优', category: '工作.AI调优' };
const PLAN = { id: 2, date: '2026-09-06', time_start: '09:00', time_end: '10:00', title: '晨会', category: null, completion: null, feishu_event_id: null };

describe('作息渲染 render（8 键全票）', () => {
  it('8 联动 shape 分配', () => {
    assert.deepEqual(SCHEDULE_KEY_SHAPES, {
      'schedule.record.today': 'list',
      'schedule.record.range': 'stat',
      'schedule.record.detail': 'detail',
      'schedule.record.write': 'receipt',
      'schedule.record.compare': 'analysis',
      'schedule.plan.today': 'list',
      'schedule.plan.write': 'receipt',
      'schedule.help.lookup': 'list',
    });
    assert.throws(() => scheduleShapeFor('schedule.nope'), ScheduleRenderError);
  });
  it('envelope 全字段（8 键各一）', () => {
    const cases = [
      ['schedule.record.today', buildRecordToday('2026-09-06', [REC])],
      ['schedule.record.range', buildRecordRange('2026-09-01', '2026-09-06', [REC])],
      ['schedule.record.detail', buildRecordDetail(REC)],
      ['schedule.record.write', buildRecordReceipt('已记一条：1')],
      ['schedule.record.compare', buildRecordCompare({ labelA: 'A', labelB: 'B', a: [REC], b: [REC] })],
      ['schedule.plan.today', buildPlanToday('2026-09-06', [PLAN])],
      ['schedule.plan.write', buildPlanReceipt('已落盘：2 个事件')],
      ['schedule.help.lookup', buildHelpItems([{ phrase: '查作息', key: 'schedule.record.today', shape: 'list', cli: 'x', desc: 'y' }])],
    ];
    for (const [key, data] of cases) {
      const env = buildScheduleEnvelope(key, data);
      assert.equal(env.version, '0.1.0');
      assert.equal(env.skill, 'schedule');
      assert.equal(env.key, key);
      assert.equal(env.shape, SCHEDULE_KEY_SHAPES[key]);
      assert.deepEqual(parseScheduleEnvelope(JSON.parse(JSON.stringify(env))).data, JSON.parse(JSON.stringify(data)));
      const html = renderEnvelopeHtml(env);
      assert.match(html, /<section data-skill="schedule"/);
      assert.match(html, new RegExp('data-key="' + key + '"'));
    }
    assert.throws(() => buildScheduleEnvelope('schedule.record.today', { nope: 1 }), ScheduleRenderError);
    assert.throws(() => buildScheduleEnvelope('schedule.nope', { items: [] }), ScheduleRenderError);
  });
  it('stat metrics 全 number + 对比/category/异常摘要非空', () => {
    const { metrics } = buildRecordRange('2026-09-01', '2026-09-06', [REC]);
    for (const v of Object.values(metrics)) assert.equal(typeof v, 'number');
    assert.ok(metrics['l1.工作'] === 60 && metrics.total === 60 && metrics.blocks === 1 && metrics.days === 1);
    assert.match(buildCategoryDeep('2026-09-01', '2026-09-06', '工作', [REC]).summary, /1 块/);
    const an = buildAnomaly('2026-09-06', 2, [
      { date: '2026-09-05', byL1: { '健康': 60 } },
      { date: '2026-09-06', byL1: { '健康': 120 } },
    ]);
    assert.match(an.summary, /2026-09-06/);
  });
  it('模板 8 件齐名 + 三标记 + 落盘快照', () => {
    assert.equal(SCHEDULE_TEMPLATES.length, 8);
    for (const key of Object.keys(SCHEDULE_KEY_SHAPES)) {
      const t = loadTemplate(templateFor(key));
      assert.match(t, /schedule-cmd-read/);
      for (const m of ['<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CONTENT-->']) {
        assert.equal(t.split(m).length - 1, 1, key + ' 标记 ' + m);
      }
      const env = buildScheduleEnvelope(key, key.endsWith('.today') || key.endsWith('.lookup')
        ? { items: [], total: 0 }
        : key.endsWith('.range') ? { metrics: { total: 0 } }
        : key.endsWith('.detail') ? { item: { id: 1 } }
        : key.endsWith('.compare') ? { summary: 's' }
        : { ok: true, message: 'm' });
      const full = fillTemplate(t, renderEnvelopeHtml(env));
      assert.match(full, /<style>/);
      assert.match(full, /<section/);
    }
    assert.throws(() => loadTemplate('nope'), ScheduleRenderError);
    assert.throws(() => fillTemplate('无标记', 'x'), ScheduleRenderError);
  });
  it('体积门 + 转义', () => {
    assert.throws(() => assertHtmlSize('x'.repeat(300 * 1024)), ScheduleRenderError);
    assert.ok(estimateBytes('作息') === Buffer.byteLength('作息', 'utf8'));
    const env = buildScheduleEnvelope('schedule.record.write', { ok: true, message: '<b>&"' });
    assert.match(renderEnvelopeHtml(env), /&lt;b&gt;&amp;&quot;/);
  });
});
