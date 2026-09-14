/** #342 独立对抗审查探针（审查者自设，原测试未覆盖的盲区）。
 *
 * 运行前置：`pnpm build` 已跑过（读 `dist`，不写仓内任何实施件）。
 * 用法：`node docs/skills/skill-calorie/t342-review-probe.mjs`
 * 退出码：全部探针 PASS → 0；任一 FAIL → 1。
 * 机器读数：每探针一行 `PROBE-<id>: PASS|FAIL <一句话>`，末尾一行 `RESULT: n/n`。
 *
 * 探针一览（种子与原测试不同值，避免照抄）：
 *  - P1 越界参数：`hasNote:"yes"`（字符串，非布尔）→ 必须拒绝（exit≠0）。
 *       若静默接受＝实现把关放宽（本票范围缺陷）。
 *  - P2 空串归一：`category:""` → 视同未给，全量返回（4 行都在）。
 *  - P3 未知分类：`category:"不存在分类XYZ"` → 必须 `missing-data` 拒绝（exit≠0），
 *       证“收窄未变放宽”（筛空不返空表）。
 *  - P4 今日收窄：`window:"今日"` → 只含今日行，不含昨日行。
 *  - P5 冻结逐字：3 词（有备注／按力量／按有氧）的 `routesFor exec cli`
 *       ＝＝ 冻结表 `main_prompt.cli` ＝＝ 冻结表 `data_source`。
 *  - P6 真权威样例（收窄变放宽）：独立种子（深蹲·力量·有备注／骑行·有氧·无备注／
 *       硬拉·力量·无备注／八段锦·日常·有备注）→ 力量子集含深蹲/硬拉不含骑行；
 *       有氧子集含骑行不含深蹲；有备注子集含深蹲不含骑行/硬拉。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..', '..', '..', 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const NEW_KEY = 'calorie.view.exercise-records';

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}
function todayISO() {
  const pin = process.env['CALORIE_TODAY'];
  if (pin !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(pin)) return pin;
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
  const { routesFor } = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'routing.js')).href);
  const { SCENE_04_EXERCISE } = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'scene-04-exercise.js')).href);

  const dir = mkdtempSync(join(tmpdir(), 't342-review-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();

  function runCli(key, params, outName) {
    const out = join(dir, outName + '.html');
    const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
      encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
    });
    return {
      status: r.status,
      out,
      stderr: String(r.stderr || '').trim(),
      stdout: String(r.stdout || '').trim(),
      file: existsSync(out) ? readFileSync(out, 'utf8') : null,
    };
  }

  const results = [];
  function check(id, ok, detail) {
    results.push({ id, ok, detail });
    console.log('PROBE-' + id + ': ' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
  }

  // —— 独立种子（与原测试不同值）：深蹲·力量·有备注／骑行·有氧·无备注／硬拉·力量·无备注／八段锦·日常·有备注
  const today = todayISO();
  const yesterday = shiftISO(today, -1);
  const seeds = [
    { type: '深蹲', calories: 120, minutes: 25, category: '力量', loadKg: 50, reps: 12, note: '晨练', date: today },
    { type: '骑行', calories: 260, minutes: 40, category: '有氧', distance: 12, date: yesterday },
    { type: '硬拉', calories: 180, minutes: 35, category: '力量', loadKg: 80, reps: 8, date: yesterday },
    { type: '八段锦', calories: 60, minutes: 15, category: '日常', steps: 1000, note: '拉伸', date: today },
  ];
  let seedOk = true;
  for (let i = 0; i < seeds.length; i += 1) {
    const s = runCli('calorie.exercise.add', seeds[i], 'seed-' + i);
    if (s.status !== 0) { seedOk = false; console.log('SEED-' + i + ' exit=' + s.status + ' ' + s.stderr.slice(-200)); }
  }
  check('S0-seed', seedOk, '独立种子 4 行落库');

  // P1：hasNote 非布尔必须拒绝
  const p1 = runCli(NEW_KEY, { window: '7d', hasNote: 'yes' }, 'p1-bad-hasnote');
  check('P1-bad-hasNote', p1.status !== 0, 'hasNote="yes" exit=' + p1.status + '（期望≠0，用法错被拒）');

  // P2：category 空串视同未给
  const p2 = runCli(NEW_KEY, { window: '7d', category: '' }, 'p2-empty-cat');
  const p2ok = p2.status === 0 && p2.file !== null
    && p2.file.includes('深蹲') && p2.file.includes('骑行')
    && p2.file.includes('硬拉') && p2.file.includes('八段锦');
  check('P2-empty-category', p2ok, 'category:"" exit=' + p2.status + '（期望 0 且 4 行全在）');

  // P3：未知分类必须 missing-data 拒绝（筛空不返空表）
  const p3 = runCli(NEW_KEY, { window: '7d', category: '不存在分类XYZ' }, 'p3-unknown-cat');
  check('P3-unknown-category', p3.status !== 0, '未知分类 exit=' + p3.status + '（期望≠0，筛空即阻断）');

  // P4：今日窗口收窄（只含今日行）
  const p4 = runCli(NEW_KEY, { window: '今日' }, 'p4-today');
  const p4ok = p4.status === 0 && p4.file !== null
    && p4.file.includes('深蹲') && p4.file.includes('八段锦')
    && !p4.file.includes('骑行') && !p4.file.includes('硬拉');
  check('P4-today-narrow', p4ok, '今日窗 exit=' + p4.status + '（期望只含今日两行）');

  // P5：冻结逐字（3 词 × cli/data_source == 路由 cli）
  const words = ['看运动记录（有备注）', '看运动记录（按力量筛选）', '看运动记录（按有氧筛选）'];
  let p5ok = true;
  const p5notes = [];
  for (const w of words) {
    const execs = routesFor(w).filter((x) => x.kind === 'exec' && x.key === NEW_KEY);
    const frozen = SCENE_04_EXERCISE.filter((t) => t.wake_word === w);
    if (execs.length === 0 || frozen.length === 0) { p5ok = false; p5notes.push(w + ':缺exec或缺冻结行'); continue; }
    const cli = execs[0].cli;
    const f = frozen[0];
    const same = f.main_prompt.cli === cli && f.data_source === cli;
    if (!same) { p5ok = false; p5notes.push(w + ':逐字不一致'); }
  }
  check('P5-frozen-verbatim', p5ok, p5notes.length === 0 ? '3 词路由cli==冻结cli==data_source' : p5notes.join('；'));

  // P6：真权威样例（收窄变放宽：应抓仍被抓，应排仍被排）
  const gStrength = runCli(NEW_KEY, { window: '7d', category: '力量' }, 'p6-strength');
  const gCardio = runCli(NEW_KEY, { window: '7d', category: '有氧' }, 'p6-cardio');
  const gNote = runCli(NEW_KEY, { window: '7d', hasNote: true }, 'p6-hasnote');
  const p6ok = gStrength.status === 0 && gCardio.status === 0 && gNote.status === 0
    && gStrength.file.includes('深蹲') && gStrength.file.includes('硬拉') && !gStrength.file.includes('骑行')
    && gCardio.file.includes('骑行') && !gCardio.file.includes('深蹲') && !gCardio.file.includes('硬拉')
    && gNote.file.includes('深蹲') && gNote.file.includes('八段锦')
    && !gNote.file.includes('骑行') && !gNote.file.includes('硬拉');
  check('P6-authority-sample', p6ok, '力量/有氧/备注三子集抓排均对（exit ' + gStrength.status + '/' + gCardio.status + '/' + gNote.status + '）');

  const passed = results.filter((r) => r.ok).length;
  console.log('RESULT: ' + passed + '/' + results.length);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.log('PROBE-harness: FAIL ' + String(e && e.message || e)); console.log('RESULT: 0/1'); process.exit(1); });
