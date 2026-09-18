/**
 * #599 · 补计划多天批量（写侧 `dates[]` ＋ SKILL 示例）。
 *
 * 挡板经 `tooling/contract-lark-stub.mjs` 注入（#695 起经配置文件 `lark.cliPath`，见 `./helpers/config-seam.mjs`；原 `LARK_CLI_PATH` 已删），禁真飞书。
 * B1 一次 7 天 → 落 7 行；B2 重复调用幂等不增行；B3 远端失败 exit 非 0 且点名天；
 * B4 SKILL 单条（速查表）＋批量（手写段）照抄即跑（同 #660 V5 形态：从文档原样取参喂出口）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope } from '../../../tooling/contract-seam.mjs';
import { makeScheduleSeam } from './helpers/config-seam.mjs';
import { buildHelpLookup } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const DAYS7 = [
  '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24',
  '2026-09-25', '2026-09-26', '2026-09-27',
];
const batchOf = (days) => ({
  op: 'ensure',
  dates: days.map((date) => ({ date, time_start: '09:00', time_end: '10:00', title: '晨会' })),
});
const createsOf = (s) => s.calls().map((c) => c.argv).filter((a) => a[1] === '+create');

test('#599 B1 一次7天→落7行，回执逐天分字段', () => {
  const s = makeScheduleSeam({ prefix: 't599-' });
  const r = s.runNew('schedule.plan.write', batchOf(DAYS7));
  assert.equal(r.status, 0, String(r.stderr).slice(0, 300));
  const d = envelope(r).data;
  assert.equal(s.localNew().length, 7, '本地落 7 行');
  assert.equal(d.op, 'ensure');
  assert.equal(d.counts.days, 7);
  assert.equal(d.counts.created, 7);
  assert.equal(d.counts.failed, 0);
  assert.deepEqual(d.dates, DAYS7);
  assert.equal(d.items.length, 7, '回执逐天分字段');
  for (const it of d.items) {
    assert.ok(it.date && it.id, '逐天带 date/id：' + JSON.stringify(it).slice(0, 120));
    assert.ok(it.local === 'created' || it.local === 'found', '逐天带 local：' + it.date);
    assert.ok(it.remote === 'created_feishu' || it.remote === 'found_feishu', '逐天带 remote：' + it.date);
    assert.ok('remoteId' in it && it.remoteId, '逐天带 remoteId：' + it.date);
  }
  console.log('#599 B1 读数：本地行=' + s.localNew().length + ' 天=' + d.counts.days + ' 逐天=' + d.items.length);
});

test('#599 B2 重复调用幂等不增行（本地＋远端都不重复）', () => {
  const s = makeScheduleSeam({ prefix: 't599-' });
  const r1 = s.runNew('schedule.plan.write', batchOf(DAYS7));
  assert.equal(r1.status, 0, String(r1.stderr).slice(0, 300));
  assert.equal(s.localNew().length, 7);
  s.stub.clearCalls();
  const r2 = s.runNew('schedule.plan.write', batchOf(DAYS7));
  assert.equal(r2.status, 0, String(r2.stderr).slice(0, 300));
  const d2 = envelope(r2).data;
  assert.equal(s.localNew().length, 7, '重复一遍本地仍 7 行');
  assert.equal(createsOf(s).length, 0, '远端零重复建');
  assert.equal(d2.counts.found, 7, '第二遍逐天都是已有');
  assert.equal(d2.counts.created, 0);
  console.log('#599 B2 读数：本地 7→' + s.localNew().length + ' 远端重复建=' + createsOf(s).length);
});

test('#599 B3 远端失败 exit 非0且点名天（本地照写）', () => {
  const s = makeScheduleSeam({ prefix: 't599-', state: { createFails: true } });
  const days = ['2026-09-21', '2026-09-22'];
  const r = s.runNew('schedule.plan.write', batchOf(days));
  assert.equal(r.status, 4, '远端没成 ⇒ 非 0：' + String(r.stderr).slice(0, 200));
  const d = envelope(r).data;
  assert.equal(s.localNew().length, 2, '本地照写（降级）');
  assert.equal(d.achieved, false);
  assert.equal(d.remote, 'unavailable');
  for (const day of days) {
    assert.ok(d.errors.some((e) => String(e).includes(day)), '失败点名 ' + day + '：' + JSON.stringify(d.errors));
  }
  assert.equal(d.items.length, 2);
  assert.ok(d.items.every((it) => it.remote === 'unavailable'), '逐天 remote 都是 unavailable');
  console.log('#599 B3 读数：exit=' + r.status + ' 本地行=' + s.localNew().length + ' 点名=' + JSON.stringify(days));
});

test('#599 B4 SKILL 示例照抄即跑（单条速查＋批量手写段，V5 形态）', () => {
  // 单条：速查表「补计划」那一行（SKILL.md:72 同源，skill.test 钉死两处相等）。
  const hit = buildHelpLookup().find((h) => h.phrase === '补计划');
  assert.ok(hit, '速查表缺唤醒词：补计划');
  const m = /--params '(.+)'$/.exec(hit.cli);
  assert.ok(m, '补计划的示例没有 --params：' + hit.cli);
  const params = JSON.parse(m[1]);
  for (const k of ['date', 'time_start', 'time_end', 'title']) {
    assert.ok(params[k] && params[k] !== '<值>', '单条示例缺必填 ' + k + '：' + hit.cli);
  }
  const s1 = makeScheduleSeam({ prefix: 't599-' });
  const r1 = s1.runNew('schedule.plan.write', params);
  assert.equal(r1.status, 0, '单条示例跑不通：' + String(r1.stderr).slice(0, 300));
  // 批量：SKILL.md 手写段里的原样命令（数组元素逐条带日期）。
  const skill = readFileSync(join(here, '..', 'SKILL.md'), 'utf8');
  const bm = /schedule\.plan\.write --params '(\{"op":"ensure","dates":\[.+?\]\})'/.exec(skill);
  assert.ok(bm, 'SKILL.md 缺批量照抄示例（dates[]）');
  const bp = JSON.parse(bm[1]);
  assert.ok(Array.isArray(bp.dates) && bp.dates.length >= 2, '批量示例 dates 非数组或不足 2 天');
  assert.ok(bp.dates.every((e) => e.date && e.time_start && e.time_end && e.title), '批量示例逐条须带 date/time 起止/title');
  const s2 = makeScheduleSeam({ prefix: 't599-' });
  const r2 = s2.runNew('schedule.plan.write', bp);
  assert.equal(r2.status, 0, '批量示例跑不通：' + String(r2.stderr).slice(0, 300));
  assert.equal(s2.localNew().length, bp.dates.length, '批量示例落行数对不上天数');
  console.log('#599 B4 读数：单条 → exit 0；批量 ' + bp.dates.length + ' 天 → exit 0 落 ' + s2.localNew().length + ' 行');
});
