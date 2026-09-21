/**
 * #715 重出器的种子库（本票独占草稿目录）。
 *
 * 口径：**确定性**——同一份源码任何时候重建这份库，读出的行与字节都一样。
 * 所以：日期由固定窗口 `[2025-08-01, 2026-09-18]` 两步一落，不取 `new Date()`；
 * 数值由记录序号派生，不用随机数。时钟另有钉子（`freeze.mjs` 钉 2026-09-18T12:00:00Z）。
 *
 * 为什么要有值：这一批的五页里有三页的分支只在「窗内有数据」时才出现——
 * 截断明示（逐日表 > 100 行、逐条明细 > 100 行）、折线量程、分布桶、力量轨迹跨年（#615／#623）。
 * 空库只跑得到空态那一支，覆盖不到被搬的那件真正在产出的分支。
 *
 * 为什么走写出口而不是直接 INSERT：运动记录与饮食记录的字段口径（分类推断、难度推断、软删位、
 * 同餐去重）住在写处理函数里，直接 INSERT 等于把那些口径在重出器里再抄一遍——抄的这份迟早与正本
 * 走散，而本重出器要判的恰恰是「搬迁前后逐字节相同」，种子的口径漂移会把判据搅成假红。
 * 走批量写口（`items`）只需十几次进程调用；产出的 HTML 直接丢弃（写自己的 `--html` 落点）。
 *
 * 用法：node packages/skill-calorie/dist/... 不需要；直接：node .scratch/t715/seed.mjs [--dir <库目录>]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { calorieConfigDir, freezeClock } = require(join(ROOT, 'packages/skill-calorie/test/helpers/config-test.mjs'));

const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const DIR = join(ROOT, argOf('--dir', '.scratch/t715/db'));
/** 冻结日（与 freeze.mjs 同一刻）。窗口与「今天」都锚在它上面，判据才与墙钟无关。 */
const TODAY = '2026-09-18';
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');   // 读写同一个出口：按 key 的 kind 分派
const SEED_START = '2025-08-01';                     // 距冻结日 413 天 ⇒ 366 天窗也落得进

/* ── 日期工具：纯字符串算术，不碰 Date（碰了就把时钟钉子的效果绕过去了） ───────── */
function shiftDay(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10);
}
const dayIndex = (iso) => Math.round((Date.parse(iso) - Date.parse(SEED_START)) / 86400000);

/** 空窗那几态：割出几天完全无记录。**注意**：这几天的序号必须落在「落记录」的那一半上才有效
 *  （2025-12-24 序号 145、2025-12-31 序号 152、2026-01-01 序号 153、2026-09-05 序号 400、2026-09-06 序号 401，
 *  全是偶数；奇数日本来就不落记录，写进本集合等于没写）。 */
const REST = new Set(['2026-09-05', '2026-09-06', '2025-12-24', '2025-12-31', '2026-01-01']);

/** 力量课：按表轮换动作，一组一条记录（`set_index` 让力量页的轨迹与组数都出得来）。 */
const STRENGTH_LESSONS = [
  [{ type: '杠铃卧推', load: 60, reps: 10 }, { type: '哑铃弯举', load: 12.5, reps: 12 }],
  [{ type: '史密斯深蹲', load: 80, reps: 8 }, { type: '杠铃划船', load: 50, reps: 10 }],
  [{ type: '哑铃推举', load: 20, reps: 10 }, { type: '引体向上', load: 0, reps: 6 }],
];
const CARDIO_KINDS = [
  { type: '慢跑', minutes: 35, distance: 6.2 }, { type: '骑行', minutes: 50, distance: 15.5 },
  { type: '跳绳', minutes: 20, distance: null }, { type: '游泳', minutes: 45, distance: 1.2 },
];
const SOFT_KINDS = [{ type: '瑜伽', minutes: 40 }, { type: '八段锦', minutes: 25 }];

/** 运动记录：四天一个循环（力量·力量·有氧·柔韧），隔日落一条。
 *  循环长度 4 × 半步 2 ＝ 每 8 个自然日必出一次有氧、两次力量 ⇒ **任意 7 天窗都非空、且两类都出得到**
 *  （这是本重出器能跑出「力量 7d」「有氧 7d」两页而不是取数失败的前提）。 */
const EXERCISE_BY_DAY = new Map();
for (let d = SEED_START; d <= TODAY; d = shiftDay(d, 1)) {
  const i = dayIndex(d);
  if (i % 2 !== 0 || REST.has(d)) continue;
  const rows = [];
  const kind = (i / 2) % 4;
  if (kind === 0 || kind === 1) {
    const lesson = STRENGTH_LESSONS[Math.floor(i / 2) % STRENGTH_LESSONS.length];
    const sets = kind === 0 ? 4 : 3;
    for (const m of lesson) {
      for (let s = 1; s <= sets; s += 1) {
        rows.push({ type: m.type, date: d, minutes: 6, reps: m.reps, loadKg: m.load, setIndex: s,
          calories: Math.round((5.0 * 75 * 0.05 + Math.max(0, m.load - 20) * 0.03) * 10) / 10 });
      }
    }
  } else if (kind === 2) {
    const c = CARDIO_KINDS[Math.floor(i / 2) % CARDIO_KINDS.length];
    const met = { 慢跑: 9.0, 骑行: 6.0, 跳绳: 12.0, 游泳: 7.0 }[c.type] ?? 6.0;
    rows.push({ type: c.type, date: d, minutes: c.minutes, distance: c.distance,
      calories: Math.round(met * 75 * (c.minutes / 60) * 10) / 10 });
  } else {
    const s = SOFT_KINDS[Math.floor(i / 2) % SOFT_KINDS.length];
    rows.push({ type: s.type, date: d, minutes: s.minutes, calories: Math.round(2.5 * 75 * (s.minutes / 60) * 10) / 10 });
  }
  EXERCISE_BY_DAY.set(d, rows);
}

/** 饮食记录：每天三餐各一条（分布页要把运动与摄入／TDEE 联动起来才出得了那几格读数）。 */
const DIET_BY_DAY = new Map();
for (let d = SEED_START; d <= TODAY; d = shiftDay(d, 1)) {
  if (REST.has(d)) continue;
  const i = dayIndex(d);
  const meals = [
    { meal: '早餐', foodName: '燕麦牛奶', calories: 460, protein: 22, fat: 12, carbs: 62 },
    { meal: '午餐', foodName: '鸡胸糙米', calories: 680, protein: 48, fat: 16, carbs: 82 },
    { meal: '晚餐', foodName: '三文鱼沙拉', calories: 520 + (i % 4) * 40, protein: 38, fat: 26, carbs: 30 },
  ];
  DIET_BY_DAY.set(d, meals.map((m) => ({ ...m, date: d })));
}

/** 体重记录：6 月起每天一条（分布页的 TDEE 折算要真实体重；缺记录时按 70.0 兜底那一条另由空窗页覆盖）。 */
const WEIGHT = [];
for (let d = '2026-06-01'; d <= TODAY; d = shiftDay(d, 1)) {
  WEIGHT.push({ date: d, kg: Math.round((78.4 - dayIndex(d) * 0.016) * 10) / 10 });
}

export function seed(dir = DIR) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const env = { ...process.env, ...freezeClock(TODAY), USERPROFILE: calorieConfigDir(dir), HOME: calorieConfigDir(dir)};
  const out = join(HERE, 'tmp-out', 'seed.html');
  mkdirSync(dirname(out), { recursive: true });
  const run = (key, params, tag) => {
    const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params), '--html', out], {
      encoding: 'utf8', env, timeout: 120000,
    });
    if (r.status !== 0) {
      console.log(`SEED-FAIL ${tag} ${key} exit=${r.status} stderr=${String(r.stderr || '').slice(-300)}`);
      process.exitCode = 1;
    }
    return r.status === 0;
  };

  let exerciseRows = 0;
  for (const [date, rows] of EXERCISE_BY_DAY) {
    if (!run('calorie.exercise.add', { items: rows }, date)) continue;
    exerciseRows += rows.length;
  }
  let dietRows = 0;
  for (const [date, rows] of DIET_BY_DAY) {
    if (!run('calorie.diet.batch', { items: rows }, date)) continue;
    dietRows += rows.length;
  }
  for (let i = 0; i < WEIGHT.length; i += 60) {
    const chunk = WEIGHT.slice(i, i + 60);
    run('calorie.weight.batch', { items: chunk }, 'weight+' + i);
  }
  console.log(`SEED 天=${EXERCISE_BY_DAY.size}(运动 ${exerciseRows} 条) 饮食天=${DIET_BY_DAY.size}(${dietRows} 条) 体重=${WEIGHT.length} 条 → ${dir}`);
  return dir;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) seed();
