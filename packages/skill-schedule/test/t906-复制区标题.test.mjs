/** #906 复制区用例：**复制区那行小标题不再上屏**，而复制区本身照旧（三格式菜单 ＋ 复制日志 ＋ 页内锚点可达）。
 *
 *  为什么单独立一件（不并进 `t887-复制区.test.mjs`）：#887 判的是「复制区有几个、里面装了什么」，
 *  本票判的是「**按钮上方那行文字没了，而别的一样没少**」—— 两条判据各自会被各自的回退打红，
 *  并在一起会让「谁红谁绿」说不清。
 *
 *  判据四条（每条都有反例）：
 *    ① 复制区里 `-copy-block-title` **为 0**（本票要删的就是它）；
 *    ② 「复制数据 ▾ ＋ 三格式菜单（纯文本／JSON／CSV）＋ 复制日志」仍在；
 *    ③ `title` 入参照旧被接受（声明位，不抛错、不上屏）；
 *    ④ 每个 `href="#x"` 都有 `id="x"`（删标题不许把页内跳转的锚点带走 —— 锚点本挂在 `<section>` 上）。
 *
 *  变异自证（在 `docs/skills/skill-schedule/t906-证据.md` 有逐行读数）：
 *    把 `renderCopyBlock({ dataFormats, … })` 改回 `{ title: input.title, dataFormats, … }` ⇒ ① 逐页红；
 *    把 `dataFormats` 拿掉 ⇒ ② 红；把 `<section id="sec-N">` 的 id 拿掉 ⇒ ④ 红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openScheduleDb, closeScheduleDb, addRecord, ensurePlanEvent } from '../dist/fetch/db.js';
import { scheduleCopyArea } from '../dist/render/copyArea.js';
import { viewRecordToday, viewRecordRange, viewPlanToday } from '../dist/query/handlers.js';
import { writePlan } from '../dist/plan/handlers.js';
import { renderFirstUsePage } from '../dist/admin/adminDocs.js';
// #906：向导页那一档要真出页，入参照 `t790-辅助与管理.test.mjs` 的 V3（steps／todos／verify／prompt／feishu 五件）。

const DAY = '2026-09-21';
const NEXT = '2026-09-22';

/** 复制区块那一段的边界（标记形态，取最后一处：样式表里也有同名类名）。 */
const COPY_OPEN = '<section class="ilife-block ilife-block-copy-block">';
function copyBlocks(html) {
  const body = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const out = [];
  let at = body.indexOf(COPY_OPEN);
  while (at >= 0) {
    const end = body.indexOf('</section>', at);
    out.push(body.slice(at, end < 0 ? at + 4000 : end + 10));
    at = body.indexOf(COPY_OPEN, at + 1);
  }
  return out;
}
const count = (s, re) => (s.match(re) ?? []).length;

/** 四条判据一次过（每张页都跑同一套）。 */
function assertTitleGone(html, label) {
  const blocks = copyBlocks(html);
  assert.ok(blocks.length >= 1, label + '：复制区不见了（这一页原本有 ' + blocks.length + ' 处）');
  for (const b of blocks) {
    assert.equal(count(b, /class="[^"]*copy-block-title"/g), 0,
      label + '：复制区里还有小标题（本票要删的就是按钮正上方那行）');
    assert.ok(b.includes('data-fmt-open="1"'), label + '：复制数据按钮没了');
    assert.equal(count(b, /data-fmt="/g), 3, label + '：三格式菜单不是三项');
    for (const fmt of ['data-fmt="text"', 'data-fmt="json"', 'data-fmt="csv"']) {
      assert.ok(b.includes(fmt), label + '：缺格式项 ' + fmt);
    }
    assert.match(b, /data-action-id="[^"]*-copy-log"/, label + '：复制日志按钮没了');
  }
  // 页内跳转：每个 href="#x" 都要有 id="x"
  const markup = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  for (const m of markup.matchAll(/<a href="#([^"]+)"/g)) {
    assert.ok(markup.includes('id="' + m[1] + '"'), label + '：锚点指空 #' + m[1]);
  }
}

function withDb(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't906-test-'));
  const handle = openScheduleDb(join(dir, 'schedule_data.db'));
  try {
    for (const [s, e, a, c] of [['07:30', '08:00', '晨间冥想', '健康.冥想'], ['09:00', '11:30', '写代码', '工作.开发']]) {
      addRecord(handle, { date: DAY, time_start: s, time_end: e, duration_minutes: 30, activity: a, category: c });
    }
    ensurePlanEvent(handle, { date: DAY, time_start: '09:00', time_end: '10:00', title: '写代码', category: '工作' });
    return fn(handle);
  } finally {
    closeScheduleDb(handle);
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('#906 复制区标题不再上屏', () => {
  it('V1 · 六张页型的代表页：小标题归 0、复制区三件齐、锚点全可达', () => {
    withDb((handle) => {
      const pages = [
        ['今天总结', viewRecordToday({ date: DAY }, handle).html],
        ['周视图', viewRecordRange({ view: 'week', date: DAY }, handle).html],
        ['汇总作息', viewRecordRange({ start: '2026-09-01', end: '2026-09-30' }, handle).html],
        ['24h 概览', viewPlanToday({ view: 'aggregate', date: DAY }, handle).html],
        ['查日程', viewPlanToday({ date: DAY }, handle).html],
        ['补计划回执', writePlan({ op: 'ensure', date: NEXT, time_start: '10:00', time_end: '11:00', title: '写用例', category: '工作' }, handle).html],
      ];
      for (const [label, html] of pages) assertTitleGone(html, label);
    });
  });

  it('V2 · 各能力目录自己装配的页（向导那一档）：同样归 0', () => {
    const html = renderFirstUsePage({
      created: true,
      paths: {
        dbDir: join(tmpdir(), 'unit', 'data'),
        dbFile: join(tmpdir(), 'unit', 'data', 'schedule_data.db'),
        pagesRoot: join(tmpdir(), 'unit', 'data', 'schedule_html'),
        helpDir: join(tmpdir(), 'unit', 'data', 'schedule_html', 'help'),
      },
      counts: { records: 0, days: 0, plans: 0, summaries: 0, firstDate: null, lastDate: null },
      steps: [
        { name: '环境检测', status: 'todo', statusText: '待办', desc: '运行环境可用' },
        { name: '完成', status: 'ok', statusText: '通过', desc: '跑完了' },
      ],
      todos: [{ title: '飞书联动待装', steps: ['装好飞书命令行'] }],
      verify: ['第一条作息已记进库里'],
      prompt: '请帮我初始化作息管家，我是第一次使用',
      feishu: { note: '本机没找到飞书命令行。', unavailable: true },
    });
    assert.equal(typeof html, 'string', '向导页没出字符串，入参形状可能变了（本用例要修）');
    assertTitleGone(html, '首次使用向导');
  });

  it('V3 · `title` 入参照旧被接受：声明位收下、不上屏（不抛错、产物里也没有那行）', () => {
    const html = scheduleCopyArea({
      key: 'schedule.record.today',
      payload: { items: [{ id: 1, activity: '睡眠' }], total: 1 },
      title: '复制与留档',
      dataActionId: 'x-copy-data',
      logActionId: 'x-copy-log',
      log: { thinking: '无', dataStructure: 'schedule_data.db', callChain: 'c', timestamp: 't', exception: '无' },
    });
    assert.ok(html.includes(COPY_OPEN), '复制区块没出');
    assert.equal(count(html, /class="[^"]*copy-block-title"/g), 0, '`title` 又被渲染成小标题了');
    assert.ok(html.includes('data-fmt-open="1"'), '复制数据按钮没了');
    assert.ok(!html.includes('<h2'), '复制区里不该再出任何 <h2>');
  });
});
