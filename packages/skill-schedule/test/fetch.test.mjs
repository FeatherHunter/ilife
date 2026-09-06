import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openScheduleDb, closeScheduleDb, assertWritablePath,
  addRecord, amendRecord, getRecordById, listRecordsByDate, listRecordsRange, getStatus, getLastRecord,
  addSummary, getDailySummary,
  listPlanEvents, searchPlanEvent, ensurePlanEvent, upsertPlanEvents, updatePlanEvent, deactivatePlanEvent, getPlanEvent,
  validateUpdateInput, ScheduleFetchError,
} from '../dist/index.js';

let DB = '';
let H = null;

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'sched-fetch-'));
  assertWritablePath(join(DB, 'schedule_data.db'));
  H = openScheduleDb(join(DB, 'schedule_data.db'));
  assert.equal(H.initialized, true);
});

describe('作息取数 fetch（tmp 隔离）', () => {
  it('记/查/修正闭环（edit_count 审计）', () => {
    const r = addRecord(H, { date: '2026-09-06', time_start: '09:00', time_end: '10:00', duration_minutes: 60, activity: '调优', category: '工作.AI调优' });
    assert.equal(r.id, 1);
    assert.deepEqual(listRecordsByDate(H, '2026-09-06').map((x) => x.id), [1]);
    const m = amendRecord(H, 1, { activity: '调优改' });
    assert.equal(m.edit_count, 1);
    assert.equal(getRecordById(H, 1).activity, '调优改');
    assert.equal(getLastRecord(H).id, 1);
    const st = getStatus(H);
    assert.equal(st.records, 1);
    assert.equal(st.days, 1);
  });
  it('区间 + 摘要 upsert', () => {
    addRecord(H, { date: '2026-09-07', time_start: '07:00', time_end: '08:00', duration_minutes: 60, activity: '跑步', category: '健康.运动' });
    assert.equal(listRecordsRange(H, '2026-09-06', '2026-09-07').length, 2);
    addSummary(H, '2026-09-06', '工作', 60);
    addSummary(H, '2026-09-06', '工作', 120);
    assert.deepEqual(JSON.parse(JSON.stringify(getDailySummary(H, '2026-09-06'))), [{ date: '2026-09-06', category: '工作', total_minutes: 120 }]);
  });
  it('查无对条/非法 id 大声失败', () => {
    assert.throws(() => getRecordById(H, 999), ScheduleFetchError);
    assert.throws(() => getRecordById(H, -1), ScheduleFetchError);
    assert.throws(() => getPlanEvent(H, 999), ScheduleFetchError);
  });
  it('日程 ensure 幂等 + upsert 整日替换 + 改/删', () => {
    const a = ensurePlanEvent(H, { date: '2026-09-08', time_start: '09:00', time_end: '10:00', title: '晨会' });
    assert.equal(a.created, true);
    const b = ensurePlanEvent(H, { date: '2026-09-08', time_start: '09:00', time_end: '10:00', title: '晨会改名' });
    assert.equal(b.created, false);
    assert.equal(b.event.id, a.event.id);
    const ev = (s, e, title) => ({ time_start: s, time_end: e, title });
    const out = upsertPlanEvents(H, '2026-09-08', [ev('00:00', '12:00', '上午'), ev('12:00', '23:59', '下午')]);
    assert.equal(out.length, 2);
    assert.equal(listPlanEvents(H, '2026-09-08').length, 2);
    assert.equal(searchPlanEvent(H, '2026-09-08', '上午').length, 1);
    const u = updatePlanEvent(H, out[0].id, { completion: '已完成' });
    assert.equal(u.completion, '已完成');
    assert.throws(() => validateUpdateInput({ id: out[0].id, completion: '随便写' }), /completion/);
    assert.throws(() => validateUpdateInput({ id: out[0].id }), /至少改一个字段/);
    deactivatePlanEvent(H, out[1].id);
    assert.equal(listPlanEvents(H, '2026-09-08').length, 1);
    assert.equal(listPlanEvents(H, '2026-09-08', true).length, 3);
  });
  it('标题搜空 title 阻断 + 非 tmp 写盘守卫', () => {
    assert.throws(() => searchPlanEvent(H, '2026-09-08', '  '), ScheduleFetchError);
    assert.throws(() => assertWritablePath(join('D:', 'prod.db')), /SCHEDULE_FORCE_PROD/);
  });
});
