// #81 · 「标准种子库 ＋ 真实路径替换」单一定义（FX-81-5 不变量的数据面）。
//
// 被 docs/research/t81-exec-smoke.mjs（exec 桶逐条实跑）与 docs/research/t81-route-evidence.mjs
// （§2.3 旧词 → 等价单命令的实跑 exit）共用：两处必须用**同一个**种子库，否则「exec ⟺ exit 0」
// 的判据会在两个脚本间漂移。
//
// 只写系统 tmp（不入仓、不写库文件到仓内）；占位符替换值亦为 tmp 下的临时真实文件。
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, DB_FILENAME } from '../../packages/skill-calorie/dist/index.js';
import { addPhotos } from '../../packages/skill-calorie/dist/photo/photos.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 占位符 → 临时真实文件／种子日期（示例 cli 用占位符，冻结 SoT 同风格；E-4 裁定：证据表注明需真实路径）。
 *  #250 · 日期占位符也走这张表：**自定义区间**与**写命令**的日期由用户给，示例里是占位符；
 *  跑快照时按种子库的日子替换成真实日期（与 `CALORIE_TODAY` 同锚点），判据「exec ⟺ 实跑 exit 0」才成立。 */
export const PLACEHOLDER_SUBSTITUTIONS = new Map([
  ['<照片路径>', null],
  ['<开始日期>', '2026-09-01'],
  ['<结束日期>', '2026-09-07'],
  ['<对比开始日期>', '2026-08-23'],
  ['<对比结束日期>', '2026-08-29'],
  ['<日期>', '2026-09-06'],
  // 设训记 KEY 示例的占位符：示例值（真跑会写进**临时家目录**的配置文件，不碰真实 KEY；
  // 家目录隔离见下 `runCli`，#763 起测试隔离一律改家目录、不读环境变量开关）。
  ['<KEY值>', 'EXAMPLE-ONLY-KEY-0000'],
]);
/** 占位符位于 JSON 字符串内，替换值须 JSON 转义（Windows 路径含反斜杠）。 */
const jsonEscape = (s) => JSON.stringify(String(s)).slice(1, -1);

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test(String(p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();

/** 种子库的数据日（＝跑快照时钉住的「今天」）。 */
export const SEED_TODAY = '2026-09-07';

/** 钉钟预载件（`node --require` 载入，只替换 `Date` 一个内建）。
 *  #943：`CALORIE_TODAY` 这颗旧钉子**已随 #675／#676 退役**（「环境变量读取全部删除」），再设它等于没钉——
 *  「今日／本周／最近 N 天」这类相对窗口会按**机器当天**取窗，种子数据全在窗外，本门就随墙钟变红
 *  （2026-09-23 实测：137 行里 25 行红，全是「无今日数据（2026-09-23…）」）。替代品是仓内既有的这一件，
 *  与技能侧测试基座（`packages/skill-calorie/test/helpers/config-test.mjs#freezeClock`）**同一件**，不另写第二份。 */
const FREEZE_CLOCK_CJS = join(ROOT, 'packages', 'skill-calorie', 'test', 'freeze-clock.cjs');

/** 训记出口的挡板（#943）：指到本仓既有的那个 fixture（技能侧 `t612`／`t613`／`t614` 用的同一件）。
 *  它按 `argv[0]` 认身份，`push-plan`／`backfill` 缺省吐成功回执；不给 `T676_LAND_FIXTURE` 即全绿。 */
const XUNJI_STUB = join(ROOT, 'packages', 'skill-calorie', 'test', 'helpers', 'land-fixture.mjs');

/** 子进程的钉钟环境：`--require` 预载 ＋ `FAKE_NOW_ISO`（缺一不可——只给变量不预载没人读它）。
 *  当刻进程已有 `NODE_OPTIONS`（如测试运行器自己那些）时**追加**，不覆盖。 */
function fakeClockEnv() {
  const preload = '--require ' + FREEZE_CLOCK_CJS;
  const prior = process.env['NODE_OPTIONS'] ?? '';
  return {
    NODE_OPTIONS: prior.includes('freeze-clock.cjs') ? prior : (prior === '' ? preload : prior + ' ' + preload),
    FAKE_NOW_ISO: SEED_TODAY + 'T12:00:00',
  };
}

/** 标准种子库（覆盖被跑键所需数据区间；只写系统 tmp）。 */
export function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 'seed')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 300)").run();
  // 饮食：2026-09-01~02 供「批量删饮食」示例；09-05~07 供读类视图。
  const meals = [
    ['2026-09-01', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-02', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5],
    ['2026-09-06', '12:00:00', '米饭', 200, 550, 12, 85, 6],
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '15:00:00', '苹果', 200, 100, 1, 25, 0],
    ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  // 上月（2026-08）饮食：FX-81-7 家族「看上月饮食」等按月词需要窗口内有数据。
  for (const [d, name, cal, p, cb, f] of [
    ['2026-08-01', '米饭', 500, 10, 80, 5], ['2026-08-08', '鸡胸', 200, 35, 2, 4],
    ['2026-08-15', '粥', 150, 3, 30, 2], ['2026-08-22', '包子', 300, 8, 50, 5],
    ['2026-08-29', '米饭', 550, 12, 85, 6], ['2026-08-31', '燕麦', 389, 13, 66, 7],
  ]) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, 200, ?, ?, ?, ?)').run(d, '12:00:00', name, cal, p, cb, f);
  }
  // 饮水（food_log 内 name='💧水'，见 fetch/diet.ts WATER_NAME）：供「看饮水 vs 体重」配对与 home 视图。
  for (const [d, ml] of [['2026-09-01', 1200], ['2026-09-02', 1600], ['2026-09-05', 1500], ['2026-09-06', 1800], ['2026-09-07', 2000]]) {
    db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, '10:00:00', '💧水', ?, 0, 0, 0, 0)").run(d, ml);
  }
  // 运动：2026-09-01~02 供「批量删运动」示例；09-06~07 供读类视图。
  for (const [d, t, name, min, kcal] of [
    ['2026-09-01', '07:00:00', '慢跑', 30, 300],
    ['2026-09-02', '07:00:00', '慢跑', 30, 300],
    ['2026-09-06', '07:00:00', '户外跑', 30, 300],
    ['2026-09-07', '07:00:00', '慢跑', 30, 320],
  ]) {
    db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, ?, ?, ?, ?, '有氧')").run(d, t, name, min, kcal);
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-05', '19:00:00', '卧推', 40, 180, '力量')").run();
  // 上月运动：FX-81-7 家族「看上月运动」需要窗口内有数据。
  for (const [d, t, name, min, kcal] of [
    ['2026-08-01', '07:00:00', '慢跑', 30, 300],
    ['2026-08-15', '07:00:00', '慢跑', 30, 300],
    ['2026-08-31', '07:00:00', '户外跑', 30, 300],
  ]) {
    db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, ?, ?, ?, ?, '有氧')").run(d, t, name, min, kcal);
  }
  // 体重：2025-09-07 ~ 2026-09-07 逐日（覆盖 FX-81-7 家族的两期对比锚点：一年前／半年前／三月前、
  // 「最近 30 天 vs 之前 30 天」，以及 ≥14 天能力 view.predict／view.goal-predict／view.weight-compare）。
  // **互链（#591／#609 重冻第二批）**：下面这条式子（`75.0 − i×0.012`，最近一次称重＝**70.6kg**）是
  // 「档案 TDEE」的体重入参——`src/analysis/series.ts::loadProfileTdee` 自提交 `7831393`（#518 W2，
  // #463 候选 A）起改读**最近一次称重**（无记录才回退 70.0）。**改这条式子会令这些冻结值再红**：
  // `test/396-gap-caliber.test.mjs`（缺口 1696／消耗 2885）、`test/566-result-title.test.mjs`
  // （10886／1555／20357／679／2.64）、`test/goal-result-254.test.mjs`（同五值）——三件都按当刻口径
  // 重冻过，重冻逐条出处见 `docs/skills/skill-calorie/t591-重冻二批-证据.md`。
  for (let i = 0; i < 367; i++) {
    const d = new Date(Date.parse('2025-09-07T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    const w = Math.round((75.0 - i * 0.012) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
  // #559：对比段 2026-08-23~08-29 补体脂行（与 PLACEHOLDER_SUBSTITUTIONS 登记的 <对比开始日期>/<对比结束日期> 对齐）。
  for (const [d, pct] of [['2026-08-23', 20.3], ['2026-08-29', 20.0], ['2026-09-05', 19.5], ['2026-09-06', 19.2], ['2026-09-07', 18.9]]) {
    db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm) VALUES (?, ?, ?, 10, 12, 14, 11, 13, 12, 10)').run(d, 'home_caliper', pct);
  }
  // #559：对比段 2026-08-23~08-29 补围度行（同上）。
  for (const [d, waist, hip] of [['2026-08-23', 86.5, 96.5], ['2026-08-29', 86, 96], ['2026-09-01', 85.5, 95.5], ['2026-09-05', 85, 95], ['2026-09-06', 84.5, 94.5], ['2026-09-07', 84, 94]]) {
    db.prepare('INSERT INTO body_measurements (date, waist_cm, hip_cm) VALUES (?, ?, ?)').run(d, waist, hip);
  }
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'seed计划', 'v1', 'desc', 4, '2026-09-01')").run();
  // #308：会话日期是**算出来的**（不是存的）：sessionDate = mondayOf(planStart) + (week-1)*7 + (day-1)
  //   （packages/skill-calorie/src/render/exercisePort.ts）。planStart='2026-09-01'（周二）⇒ mondayOf=08-31；
  //   第 1 周第 1 天原落在 08-31，而 SEED_TODAY='2026-09-07'（周一）下「本周」＝单日窗 09-07~09-07
  //   ⇒ calorie.view.exercise-review --params '{"window":"本周"}' 窗内无计划会话，取数失败（exit 4）。
  //   改成**第 2 周第 1 天** ⇒ 08-31 + 7 = 09-07，正好落进「本周」窗；第 1 周第 3 天（09-02）不动。
  //   走的是「只改种子库」这条：示例口径（src/workout/commands.ts ＋ scripts/build-help.mjs ＋ SKILL.md）一字未动。
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (2, 1, 1, ?, ?)').run('上肢', JSON.stringify([{ name: '硬拉', part: '背', type: '力量', sets: [] }]));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, ?, ?)').run('下肢', JSON.stringify([{ name: '深蹲', part: '腿', type: '力量', sets: [] }]));
  // #943：`<日期>` 占位符落在 2026-09-06（周日＝第 1 周第 7 天）。旧口径下这天 0 段也回 exit 0，
  //   示例门看不出问题；「无段即缺失阻断」落地后，三行落地示例（落地训练／落地到本周末／落地到本月底）
  //   必须落在一个真有训练段的日子上——走的是「只改种子库」这条（同 #308 的做法，示例口径一字未动）。
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 7, 1, ?, ?)').run('有氧', JSON.stringify([{ name: '慢跑', part: '全身', type: '有氧', sets: [] }]));
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 170, 30, 4, 0, 72, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '测试')").run();
}

/**
 * 开一个标准种子环境：模板库 ＋ 临时照片目录。
 * @returns {{ runCli: (cli: string) => {status: number|null, envelopeKey: string|null, stderr: string, substituted: string[]}, cleanup: () => void, workDir: string }}
 */
export function createHarness() {
  const workDir = mkdtempSync(join(tmpdir(), 't81-seed-'));
  const photosDir = join(workDir, 'photos');
  const srcDir = join(workDir, 'src');
  const tplDir = join(workDir, 'tpl');
  for (const d of [photosDir, srcDir, tplDir]) mkdirSync(d, { recursive: true });
  const srcFile = (n) => { const p = join(srcDir, n); writeFileSync(p, 'seed-' + n); return p; };
  {
    const db = openDb(join(tplDir, DB_FILENAME));
    seedFull(db);
    addPhotos(db, photosDir, { srcPaths: [srcFile('a.jpg'), srcFile('b.jpg')], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
    db.close();
  }
  const templateDb = join(tplDir, DB_FILENAME);
  PLACEHOLDER_SUBSTITUTIONS.set('<照片路径>', srcFile('placeholder.jpg'));
  let runSeq = 0;
  const tokenize = (cli) => {
    const out = []; let cur = ''; let q = null;
    for (const ch of String(cli)) {
      if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch;
      else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  };
  const runCli = (cli) => {
    let effective = String(cli);
    const substituted = [];
    for (const [ph, real] of PLACEHOLDER_SUBSTITUTIONS) {
      if (effective.includes(ph)) { effective = effective.split(ph).join(jsonEscape(real)); substituted.push(ph); }
    }
    runSeq += 1;
    const dir = join(workDir, 'run-' + runSeq);
    mkdirSync(dir, { recursive: true });
    copyFileSync(templateDb, join(dir, DB_FILENAME));
    // 家目录隔离（#763 口径）：子进程的家目录指到本次运行的临时目录，并在那里落一份
    // 只写库目录的配置文件——于是子进程读到的库正是上面拷过去的种子库副本，写也只写临时目录。
    // 背景：`SKILLS_DB_PATH` 等环境变量已退役（#675／#676），不指家目录就落到真实家目录
    // （2026-09-22 实测：示例门禁把真库写脏）。两格（USERPROFILE／HOME）与本仓测试基座同口径。
    const fakeHome = join(dir, 'home');
    mkdirSync(join(fakeHome, '.ilife'), { recursive: true });
    // #943 · 训记入口指到本仓既有的挡板：落地训练族五条键的**实跑**形态要调训记两步
    // （`push-plan`／`backfill`），而种子环境无 KEY 无网 ⇒ 实跑恒非 0 ⇒ 「例」列只能写成预演形态，
    // 照抄示例的 AI 一次真落地也做不成。这是**生产自己留的那一个配置口**（`xunjiRunner.ts` 件头：
    // 外调只留 `xunji.cli` 一个口），不是为门新开的后门；作息／备忘两步走真实兄弟包（家目录已隔离）。
    writeFileSync(
      join(fakeHome, '.ilife', 'calorie.yaml'),
      'db:\n  dir: ' + JSON.stringify(dir) + '\n' + 'xunji:\n  cli: ' + JSON.stringify(XUNJI_STUB) + '\n',
      'utf8',
    );
    const toks = tokenize(effective);
    const r = spawnSync(NODE, [CLI, ...toks.slice(1)], {
      encoding: 'utf8',
      // #943 · 钉钟：`CALORIE_TODAY` 已退役（见 `fakeClockEnv` 件头），改用 `--require` 预载件钉住 `Date`。
      // 原先还设的 `SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 同为退役开关（源码里已无读取点），一并删——
      // 库与照片目录的唯一真相是下面那份 `calorie.yaml` ＋ 家目录隔离。
      env: {
        ...process.env, ...fakeClockEnv(),
        USERPROFILE: fakeHome, HOME: fakeHome,
      },
    });
    let envelopeKey = null;
    try { envelopeKey = JSON.parse(String(r.stdout || '').trim()).key ?? null; } catch { envelopeKey = null; }
    const stderr = String(r.stderr || '').trim().split(workDir).join('<tmp>').slice(0, 200);
    return { status: r.status, envelopeKey, stderr, substituted };
  };
  return { runCli, workDir, cleanup: () => { /* 调用方按需 rmSync */ } };
}

/** 单条命令形态：`calorie-cmd-read calorie.<key> [--params '{…}']`（不含「→」多步链）。 */
export const SINGLE_COMMAND_RE = /^calorie-cmd-read calorie\.[a-z0-9.-]+( --params '\{.*\}')?$/;
