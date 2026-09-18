/**
 * #660 · 24h 聚合视图与多日查询（HELP #15／#16）。
 *
 * 分桶口径照老实物（`schedule_db.py:697-746`）：每条活跃事件按 time_start 的整点落桶，同一小时多条以 `+` 合并，
 * 空桶出「未规划」，随附该日 created_at／updated_at。这条视图**有意丢** notes／飞书同步状态／ID
 * （老实物自己在输出里就点名了），要全字段走 `查日程`。
 *
 * 唤醒词两条（#15／#16）接上 `view:'aggregate'`；`#12 查日程` 仍是全字段缺省档——「改坏必红」：
 * 把 preset 拿掉 → V3 红；把分桶口径改回「按整条事件列」→ V1 红。
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeWakeword, buildHelpLookup } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const D1 = '2026-09-22';
const D2 = '2026-09-23';
/** 配置目录（`ILIFE_CONFIG_DIR` 整体接管的那一处）；库落在 `<它>/data/`。 */
let CFG = '';

const P = (o) => JSON.stringify(o);
function run(args, envExtra) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: here, encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: CFG, ...(envExtra || {}) },
  });
}

before(() => {
  CFG = mkdtempSync(join(tmpdir(), 'schedov-'));
  const seed = (date, s, e, title) => {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date, time_start: s, time_end: e, title, feishu: 'skip' })]);
    assert.equal(r.status, 0, '种子失败：' + String(r.stderr).slice(0, 200));
  };
  seed(D1, '08:00', '09:00', '早餐');
  seed(D1, '08:30', '09:30', '并行事'); // 同一整点里的第二条
  seed(D1, '13:00', '14:00', '午后');
  seed(D2, '09:00', '10:00', '另一天');
});

test('#660 V1 24h 聚合视图：整点分桶 ＋ 同小时 + 合并 ＋ 空桶「未规划」', () => {
  const r = run(['schedule.plan.today', '--params', P({ date: D1, view: 'aggregate' })]);
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const d = JSON.parse(r.stdout).data;
  assert.equal(d.view, 'aggregate');
  assert.equal(d.total, 1);
  const day = d.items[0];
  assert.equal(day.hours.length, 24, '一天 24 格都在（空桶也要出）');
  assert.equal(day.hours[8].label, '08:00 - 09:00');
  assert.equal(day.hours[8].text, '早餐+并行事', '同小时多条用 + 合并');
  assert.equal(day.hours[13].text, '午后');
  assert.equal(day.hours[7].text, '未规划');
  assert.equal(day.plannedHours, 2);
  assert.ok(day.createdAt && day.updatedAt, '随附该日首建／末改时间');
  assert.ok(String(d.note).includes('聚合'), '页面上说清这是聚合视图（丢 notes／同步态／ID）');
  console.log('#660 V1 读数：格 8=' + day.hours[8].text + ' 格 13=' + day.hours[13].text + ' 已排格数=' + day.plannedHours);
});

test('#660 V2 多日查询：一次给多天，逐日一段（#16 独门能力）', () => {
  const r = run(['schedule.plan.today', '--params', P({ dates: [D1, D2], view: 'aggregate' })]);
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const d = JSON.parse(r.stdout).data;
  assert.equal(d.total, 2);
  assert.deepEqual(d.dates, [D1, D2]);
  assert.deepEqual(d.items.map((x) => x.date), [D1, D2]);
  assert.equal(d.items[1].hours[9].text, '另一天');
  console.log('#660 V2 读数：天数=' + d.total + ' 日=' + JSON.stringify(d.items.map((x) => x.date)));
});

test('#660 V3 两个唤醒词接上聚合视图（#15 24h 概览／#16 查多日计划）', () => {
  const one = routeWakeword('24h 概览');
  assert.equal(one.key, 'schedule.plan.today');
  assert.equal(one.params.view, 'aggregate');
  const multi = routeWakeword('查多日计划', { dates: [D1, D2] });
  assert.equal(multi.key, 'schedule.plan.today');
  assert.equal(multi.params.view, 'aggregate');
  assert.deepEqual(multi.params.dates, [D1, D2]);
  assert.throws(() => routeWakeword('查多日计划'), /缺槽位/, '多日那条要日期，不许空跑');
  // #12 查日程不被聚合视图顶掉（缺省仍是全字段那条路）
  assert.equal(routeWakeword('查日程').params.view, undefined);
  console.log('#660 V3 读数：24h 概览=' + JSON.stringify(one.params) + ' 查多日计划=' + JSON.stringify(multi.params));
});

test('#660 V4 两条路各走各的：查日程仍带 notes／同步态／ID（S-19 口径）', () => {
  const list = JSON.parse(run(['schedule.plan.today', '--params', P({ date: D1 })]).stdout).data;
  assert.equal(list.items.length, 3);
  assert.ok(list.items.every((x) => 'id' in x && 'synced' in x && 'completion' in x), '全字段档三样都在');
  assert.equal(list.view, undefined, '缺省档不是聚合视图');
});

test('#660 V5 速查表里那两条唤醒词的示例「照抄即能跑」（HELP 速查 → SKILL.md 也是它）', () => {
  const hits = buildHelpLookup();
  for (const phrase of ['24h 概览', '查多日计划']) {
    const hit = hits.find((h) => h.phrase === phrase);
    assert.ok(hit, '速查表缺唤醒词：' + phrase);
    const m = /--params '(.+)'$/.exec(hit.cli);
    assert.ok(m, phrase + ' 的示例没有 --params：' + hit.cli);
    const params = JSON.parse(m[1]);
    assert.equal(params.view, 'aggregate', phrase + ' 的示例要落在聚合视图上');
    if (phrase === '查多日计划') assert.ok(Array.isArray(params.dates), 'dates 槽位在示例里必须是数组（照抄能跑）');
    const r = run(['schedule.plan.today', '--params', m[1]]);
    assert.equal(r.status, 0, phrase + ' 的示例跑不通：' + String(r.stderr).slice(0, 200));
    const d = JSON.parse(r.stdout).data;
    assert.equal(d.view, 'aggregate');
    console.log('#660 V5 读数：' + phrase + ' → ' + hit.cli.replace('schedule-cmd-read ', '') + ' ⇒ exit 0，天数=' + d.total);
  }
});
