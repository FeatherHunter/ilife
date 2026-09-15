/** #435 第 1 条 · 场景 05 写后回执页「状态」卡副行（写入去向）的**结果型**判据。
 *
 * 缺陷（票面「一、状态卡兜底文案对撤销类不成立」）：`calorie.workout.plan-delete`（撤销整份计划）的
 * 回执页上，「状态」卡副行恒定说「已写入训练计划」，而同一页别处写着「已撤销训练计划「…」／已删除
 * （硬，不可恢复）」——同一页对同一动作一边说已写入、一边说已删除。
 *
 * 本件只判**结果取值**，不判关键词搭配（「已写入」与「已删除」并列即红这类正则不进机检——会误伤正常文案）：
 *   ① 撤销类那条页：「状态」卡副行**不是**「已写入训练计划」，且与同页「已删除」口径一致
 *      （副行说删 ＋ 改动对照的结果列说删 ＋ 整页不再出现「已写入训练计划」这句话）；
 *   ② 其余 9 条增改类页：「状态」卡副行**照旧不变**（逐条判等「已写入训练计划」）。
 *
 * 取数＝跑真 CLI（`dist/cli/cmd_read.js`）落盘的回执 HTML 文本，按 KPI 卡块自己的类名切出「状态」卡
 * （不猜正文散文），每词独立 tmp 库，串行跑。种子与起法照抄 `scene05-write-create.test.mjs`／
 * `scene05-write-mutate.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../packages/skill-calorie/dist/index.js';
import { DB_FILENAME } from '../packages/skill-calorie/dist/paths.js';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 增改类 9 条的「状态」卡副行原样（冻结取值：这 9 条一个字都不许变）。 */
const WRITTEN_DETAIL = '已写入训练计划';
/** 撤销类那条应有的写法（撤销后库里已无这份计划，说「已写入」与同页「已删除」自相矛盾）。 */
const DELETED_DETAIL = '已删除训练计划';

const WIZARD_PLAN = {
  config: { title: '示例计划', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫'] },
  weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑' }] }] }] }],
};

// [写命令键, 写参数, 「状态」卡副行期望取值, 是否撤销类]
const WRITES = [
  ['calorie.workout.plan-set', { plan: WIZARD_PLAN }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-copy', { newTitle: '示例副本' }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-set-week', { week: 2, days: [{ dayOfWeek: 2, sessionLabel: '背', movements: [{ name: '硬拉' }] }] }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-add-movement', { week: 1, dayOfWeek: 1, movement: { name: '深蹲' } }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-set-rest', { week: 1, dayOfWeek: 3 }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-update', { title: '新标题' }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-update-day', { week: 1, dayOfWeek: 3, newLabel: '腿部日' }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-delete-day', { week: 1, dayOfWeek: 3 }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-update-movement', { oldMovement: '俯卧撑', newMovement: { name: '钻石俯卧撑' } }, WRITTEN_DETAIL, false],
  ['calorie.workout.plan-delete', { confirm: true }, DELETED_DETAIL, true],
];

function seed() {
  const dir = mkdtempSync(join(tmpdir(), 'scene05-ws-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'seed计划', 'v1', 'desc', 4, '2026-09-07')").run();
  const sess = [
    [1, 1, '上肢', [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }]],
    [1, 3, '下肢', [{ name: '深蹲', part: '腿', type: '力量', sets: [] }]],
  ];
  for (const [wn, dow, label, moves] of sess) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, 1, ?, ?)').run(wn, dow, label, JSON.stringify(moves));
  }
  db.close();
  return dir;
}

function cli(dir, key, params) {
  return spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    env: { ...process.env, SKILLS_DB_PATH: dir }, encoding: 'utf8',
  });
}

/** 按 KPI 卡块自己的类名切卡：只认块结构（label／value／detail），不猜正文散文。 */
function kpiCards(html) {
  const re = new RegExp('<div class="ilife-block ilife-block-kpi-card">'
    + '<div class="ilife-block-kpi-card-label">([^<]*)</div>'
    + '<div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">([^<]*)<\/span>'
    + '(?:<span class="ilife-block-kpi-card-unit">([^<]*)<\/span>)?<\/div>'
    + '(?:<div class="ilife-block-kpi-card-detail">([^<]*)</div>)?', 'g');
  return [...html.matchAll(re)].map((m) => ({ label: m[1], value: m[2], unit: m[3] ?? null, detail: m[4] ?? null }));
}

/** 取某张卡（按卡自己的 label）。 */
function cardOf(html, label) {
  return kpiCards(html).find((c) => c.label === label) ?? null;
}

/** 取带该 caption 的数据表各行（二维单元格文本）；没有这张表返回 null。 */
function tableRows(html, caption) {
  const at = html.indexOf('<caption class="ilife-block-data-table-caption">' + caption + '</caption>');
  if (at < 0) return null;
  const rest = html.slice(at);
  const body = rest.slice(rest.indexOf('<tbody>') + 7, rest.indexOf('</tbody>'));
  return body.split('</tr>').filter((r) => r.includes('<td'))
    .map((r) => [...r.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]));
}

/** 跑一条写命令，返回 {html, env}；落盘与退出码在此断言。 */
function writeAndRead(key, params) {
  const dir = seed();
  const r = cli(dir, key, params);
  assert.equal(r.status, 0, key + ' 写 exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 400));
  const env = JSON.parse(String(r.stdout).trim());
  assert.equal(env.data.ok, true, key + ' 写 data.ok 非 true');
  assert.ok(isAbsolute(env.data.output) && existsSync(env.data.output), key + ' 回执未落盘');
  return { html: readFileSync(env.data.output, 'utf8'), env };
}

test('#435 撤销类回执页「状态」卡副行与同页口径一致，其余 9 条取值照旧', () => {
  assert.equal(WRITES.length, 10, '写命令清单应为 10 条');

  let pass = 0;
  for (const [key, params, want, revoked] of WRITES) {
    const { html } = writeAndRead(key, params);

    const card = cardOf(html, '状态');
    assert.ok(card, key + ' 回执页缺「状态」卡');
    assert.equal(card.detail, want, key + ' 「状态」卡副行取值');

    if (revoked) {
      // ① 取值不是恒定兜底那句话（票面第一条的原文要求）
      assert.notEqual(card.detail, '已写入训练计划', key + ' 「状态」卡副行仍是恒定兜底「已写入训练计划」');
      // ② 与同页「已撤销／已删除」口径一致：副行说删 ＋ 改动对照的结果列说删
      assert.match(card.detail, /已删除/, key + ' 「状态」卡副行未与同页撤销口径一致（应含「已删除」）');
      const rows = tableRows(html, '改动对照');
      assert.ok(rows && rows.length > 0, key + ' 回执页缺「改动对照」表行');
      const results = rows.map((r) => r[r.length - 1]);
      assert.ok(results.some((t) => t.includes('已删除')),
        key + ' 「改动对照」结果列未说「已删除」，实测 ' + JSON.stringify(results));
      // ③ 整页不再出现那句自相矛盾的话（同页两处口径互斥即本缺陷）
      assert.ok(!html.includes('已写入训练计划'), key + ' 回执页整页仍在说「已写入训练计划」');
      // ④ 写后现值仍明示已撤销（副行改口径不许动这处事实）
      const nowRows = tableRows(html, '写后现值');
      assert.ok(nowRows && nowRows.some((r) => r.join('｜').includes('已撤销')),
        key + ' 「写后现值」未明示已撤销');
    } else {
      assert.equal(card.value, '已改动', key + ' 「状态」卡取值应为「已改动」');
      assert.ok(html.includes('已写入训练计划'), key + ' 回执页整页不再出现「已写入训练计划」');
    }
    pass += 1;
  }
  assert.equal(pass, 10);
});
