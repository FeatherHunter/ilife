/** t342-收口-review 自设探针（只读：不改 src/test/冻结/生成物，全部断言走 dist + 真 CLI 实跑）。
 * 探针A（旧键回指咬否）：GREEN=今日/昨日路由指新命令；RED=实跑旧命令旧窗口，证其产物缺记录级列表标题
 *   （即：若把 150/151 改回旧键，测试第5条的 assertRecordsPage 必红——红线可执行复现）。
 * 探针B（昨日/今日混淆）：今日页含今日日期且不含昨日独有行；昨日页含昨日日期且不含今日独有行。
 * 探针C（冻结少同步咬否）：冻结 cli/data_source 与路由 cli 逐字比对；再以旧 cli 逐字比对，证 mismatch 被检出。
 * 收窄/放宽：今日窗口=收窄（仅当日行）；7d=放宽（含三日行）。
 * 用法（仓根执行，先 pnpm build）：node docs/skills/skill-calorie/t342-收口-review-探针.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PKG = join(process.cwd(), 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const { routesFor } = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'routing.js')).href);
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const NEW_KEY = 'calorie.view.exercise-records';
const OLD_KEY = 'calorie.view.exercise';

const idx = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 't342rev-'));
  const db = idx.openDb(join(dir, 'calorie_data.db'));
  db.close();
  return dir;
}
function runCli(dir, key, params, outName) {
  const out = join(dir, outName + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  return { status: r.status, out, stderr: String(r.stderr || '').trim(), file: existsSync(out) ? readFileSync(out, 'utf8') : null };
}
function shiftISO(iso, d) {
  return new Date(Date.parse(iso + 'T12:00:00Z') + d * 86400000).toISOString().slice(0, 10);
}
function todayISO() {
  const pin = process.env['CALORIE_TODAY'];
  if (pin !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(pin)) return pin;
  return new Date().toISOString().slice(0, 10);
}
function seed(dir) {
  const today = todayISO();
  const seeds = [
    { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, note: '夜练', date: shiftISO(today, -2) },
    { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: shiftISO(today, -1) },
    { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000, note: '通勤', date: today },
  ];
  seeds.forEach((s, i) => {
    const r = runCli(dir, 'calorie.exercise.add', s, 'seed-' + i);
    assert.equal(r.status, 0, 'seed ' + i + ' ' + r.stderr.slice(-200));
  });
  return today;
}

let pass = 0;
const ok = (name) => { pass += 1; console.log('✔ ' + name); };

// ---- 探针A GREEN：今日/昨日路由指新命令 ----
for (const w of ['看今日运动', '看昨日运动']) {
  const exec = routesFor(w).filter((x) => x.kind === 'exec');
  assert.ok(exec.some((x) => x.key === NEW_KEY), w + ' 未指新命令：' + JSON.stringify(exec));
  ok('探针A-绿：' + w + ' 指 ' + NEW_KEY);
}
// 余窗口词不动（防扩散）：本周仍指旧键、vs目标仍指 goal 键
{
  const w = routesFor('看本周运动').filter((x) => x.kind === 'exec');
  assert.ok(w.some((x) => x.key === OLD_KEY), '看本周运动被误搬：' + JSON.stringify(w));
  ok('探针A-绿：看本周运动仍指旧键（余窗口词不动）');
  const g = routesFor('看今日运动（vs 目标）').filter((x) => x.kind === 'exec');
  assert.ok(g.some((x) => x.key === 'calorie.view.exercise-goal'), 'vs目标被误搬：' + JSON.stringify(g));
  ok('探针A-绿：看今日运动（vs 目标）仍指 goal 键');
}

// ---- 探针A RED：旧命令旧窗口产物缺记录级标题（改回旧键即红的可执行依据） ----
{
  const dir = mkSeededDir();
  seed(dir);
  const r = runCli(dir, OLD_KEY, { window: '今日' }, 'old-today');
  assert.equal(r.status, 0, '旧命令应仍可跑，stderr=' + r.stderr.slice(-200));
  assert.ok(!String(r.file).includes('运动记录明细'), '旧命令产物意外含记录级标题，红线依据失效');
  console.log('✔ 探针A-红：旧键今日窗口产物缺「运动记录明细」（改回旧键→第5条 assertRecordsPage 必红）');
  pass += 1;
}

// ---- 探针B：昨日/今日不混淆 ----
{
  const dir = mkSeededDir();
  const today = seed(dir);
  const yesterday = shiftISO(today, -1);
  const rt = runCli(dir, NEW_KEY, { window: '今日' }, 'rev-today');
  const ry = runCli(dir, NEW_KEY, { window: '昨日' }, 'rev-yesterday');
  assert.equal(rt.status, 0); assert.equal(ry.status, 0);
  assert.ok(rt.file.includes(today), '今日页缺今日日期');
  assert.ok(!rt.file.includes('户外跑'), '今日页混入昨日独有行（户外跑）');
  assert.ok(ry.file.includes(yesterday), '昨日页缺昨日日期');
  assert.ok(!ry.file.includes('步行'), '昨日页混入今日独有行（步行）');
  ok('探针B-绿：今日/昨日窗口互不混淆');
}

// ---- 收窄/放宽样例 ----
{
  const dir = mkSeededDir();
  seed(dir);
  const narrow = runCli(dir, NEW_KEY, { window: '今日' }, 'rev-narrow');
  const wide = runCli(dir, NEW_KEY, { window: '7d' }, 'rev-wide');
  assert.ok(narrow.file.includes('步行') && !narrow.file.includes('卧推'), '收窄样例坏：今日窗应仅当日行');
  ok('收窄样例：window=今日 → 仅当日行（含步行，不含卧推）');
  assert.ok(wide.file.includes('步行') && wide.file.includes('卧推') && wide.file.includes('户外跑'), '放宽样例坏：7d 应含三日行');
  ok('放宽样例：window=7d → 含三日行（步行/卧推/户外跑）');
}

// ---- 探针C：冻结逐字同步；旧串比对即 mismatch（少同步1条即咬） ----
{
  const src = readFileSync(join(PKG, 'src', 'triggers', 'scene-04-exercise.ts'), 'utf8');
  const routeCli = {
    '看今日运动': 'calorie-cmd-read calorie.view.exercise-records --params \'{"window":"今日"}\'',
    '看昨日运动': 'calorie-cmd-read calorie.view.exercise-records --params \'{"window":"昨日"}\'',
  };
  for (const w of Object.keys(routeCli)) {
    const i = src.indexOf('"wake_word": "' + w + '"');
    assert.ok(i >= 0, '冻结缺词：' + w);
    const seg = src.slice(i, i + 2600);
    const unesc = (s) => s.replace(/\\"/g, '"');
    const cli = unesc(seg.match(/"cli": "(.*?)", "text"/)[1]);
    const ds = unesc(seg.match(/"data_source": "(.*?)", "prompt_template"/)[1]);
    assert.equal(cli, routeCli[w], w + ' 冻结 cli 与路由不一致');
    assert.equal(ds, routeCli[w], w + ' 冻结 data_source 与路由不一致');
    ok('探针C-绿：冻结「' + w + '」cli/data_source 与路由逐字一致');
    const stale = routeCli[w].replace('exercise-records', 'exercise');
    assert.notEqual(cli, stale, w + ' 新旧串竟相同，探针失效');
  }
  console.log('✔ 探针C-红：若冻结少同步1条（仍为旧串），逐字比对即 mismatch → D2④/路由断言咬住');
  pass += 1;
}

console.log('探针合计 pass=' + pass);
