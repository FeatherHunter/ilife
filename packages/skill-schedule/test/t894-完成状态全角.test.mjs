/** #894 · 完成状态上屏全角：取值不动、页上走展示层映射。
 *
 * 判据：产物可见文本里不得出现「半角括号含中文」（`\\([^)]*[\\u4e00-\\u9fa5][^)]*\\)`）。
 * 取值（`VALID_COMPLETIONS`）保持半角原样，只换上屏。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  VALID_COMPLETIONS, COMPLETION_DISPLAY_LABELS, completionLabelOf,
  openScheduleDb, closeScheduleDb, ensurePlanEvent, updatePlanEvent, addRecord,
} from '../dist/index.js';
import { reviewPage } from '../dist/plan/reviewDocs.js';
import { renderPlanDayPage } from '../dist/plan/planDocs.js';
import { replayPage } from '../dist/plan/replaySections.js';
import { replayWindowOf } from '../dist/plan/replayDocs.js';
import { renderEnvelopeHtml } from '../dist/render/html.js';

const DAY = '2026-09-15';
const HALF_CN = /\([^)]*[一-鿿][^)]*\)/;

const strip = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const visible = (html) => strip(html).replace(/<[^>]*>/g, ' ');
const halfHits = (html) => visible(html).match(new RegExp(HALF_CN, 'g')) ?? [];

const ev = (id, completion) => ({
  id, date: DAY, time_start: '07:30', time_end: '08:00', title: '晨间冥想',
  notes: null, category: '健康.冥想', completion, completion_note: null,
  is_active: 1, feishu_event_id: null, created_at: null, updated_at: null,
});

let dir = '';
let handle = null;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'sched894-'));
  handle = openScheduleDb(join(dir, 'sched.db'));
  const seeds = [
    ['07:30', '08:00', '晨间冥想', '健康.冥想', '已完成(超时)'],
    ['09:00', '11:30', '深度开发', '工作.开发', '未完成(不可抗力)'],
    ['14:00', '16:00', '需求评审会', '工作.会议', '已完成'],
  ];
  for (const [s, e, title, category, completion] of seeds) {
    const { event } = ensurePlanEvent(handle, { date: DAY, time_start: s, time_end: e, title, category });
    updatePlanEvent(handle, event.id, { completion });
  }
  addRecord(handle, {
    date: DAY, time_start: '07:30', time_end: '08:00', duration_minutes: 30,
    activity: '冥想', category: '健康.冥想',
  });
});

after(() => {
  if (handle !== null) closeScheduleDb(handle);
  rmSync(dir, { recursive: true, force: true });
});

describe('#894 完成状态上屏全角（取值不动）', () => {
  it('取值不动：VALID_COMPLETIONS 仍是半角原样 6 态', () => {
    assert.deepEqual(VALID_COMPLETIONS, ['已完成', '已完成(超时)', '部分完成', '未完成', '未完成(不可抗力)', '未复盘']);
  });

  it('映射一处：两处半角态换全角，其余不动，未知串兜底换括号', () => {
    assert.equal(completionLabelOf('已完成(超时)'), '已完成（超时）');
    assert.equal(completionLabelOf('未完成(不可抗力)'), '未完成（不可抗力）');
    assert.equal(completionLabelOf('已完成'), '已完成');
    assert.equal(completionLabelOf('部分完成'), '部分完成');
    assert.equal(completionLabelOf('未完成'), '未完成');
    assert.equal(completionLabelOf('未复盘'), '未复盘');
    assert.equal(completionLabelOf('自造(态)'), '自造（态）');
    assert.equal(completionLabelOf('WIP(x)'), 'WIP(x)');
    assert.equal(COMPLETION_DISPLAY_LABELS['已完成(超时)'], '已完成（超时）');
  });

  it('查日程：逐条完成状态无半角括号含中文，且有全角写法', () => {
    const html = renderPlanDayPage([ev(1, '已完成(超时)'), ev(2, '未完成(不可抗力)')], DAY);
    assert.equal(halfHits(html).length, 0, '半角括号含中文须归 0，实得 ' + halfHits(html).join(' | '));
    assert.ok(visible(html).includes('已完成（超时）'), '须印全角 已完成（超时）');
    assert.ok(visible(html).includes('未完成（不可抗力）'), '须印全角 未完成（不可抗力）');
  });

  it('复盘单页：逐条＋分布＋讨论区都无半角括号含中文', () => {
    const html = reviewPage(handle, DAY);
    assert.equal(halfHits(html).length, 0, '半角括号含中文须归 0，实得 ' + halfHits(html).join(' | '));
    assert.ok(visible(html).includes('已完成（超时）'), '逐条或分布须印全角');
    assert.ok(visible(html).includes('未完成（不可抗力）'), '逐条或分布须印全角');
    assert.ok(visible(html).includes('已完成（超时）') && visible(html).includes('未完成（不可抗力）'), '讨论区六种说明须是全角');
  });

  it('复盘一体页（日档与通用档）：对照＋分布＋跨域都无半角括号含中文', () => {
    const day = replayPage(handle, replayWindowOf('day', { date: DAY }));
    assert.equal(halfHits(day).length, 0, '日档半角括号含中文须归 0，实得 ' + halfHits(day).join(' | '));
    const range = replayPage(handle, replayWindowOf('range', { start: '2026-07-17', end: DAY }));
    assert.equal(halfHits(range).length, 0, '通用档半角括号含中文须归 0，实得 ' + halfHits(range).join(' | '));
  });

  it('envelope 小块：完成徽章也走全角映射', () => {
    const html = renderEnvelopeHtml({
      shape: 'list', key: 'schedule.plan.today', data: {
        items: [{ time: '07:30~08:00', title: '晨间冥想', completion: '已完成(超时)', synced: false }],
      },
    });
    assert.equal(halfHits(html).length, 0, '小块半角括号含中文须归 0');
    assert.ok(visible(html).includes('已完成（超时）'), '小块须印全角');
  });
});
