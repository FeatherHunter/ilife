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
import { addPhotos } from '../../packages/skill-calorie/dist/fetch/photos.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 占位符 → 临时真实文件（示例 cli 用占位符，冻结 SoT 同风格；E-4 裁定：证据表注明需真实路径）。 */
export const PLACEHOLDER_SUBSTITUTIONS = new Map([['<照片路径>', null]]);
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
  for (let i = 0; i < 367; i++) {
    const d = new Date(Date.parse('2025-09-07T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    const w = Math.round((75.0 - i * 0.012) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
  for (const [d, pct] of [['2026-09-05', 19.5], ['2026-09-06', 19.2], ['2026-09-07', 18.9]]) {
    db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm) VALUES (?, ?, ?, 10, 12, 14, 11, 13, 12, 10)').run(d, 'home_caliper', pct);
  }
  for (const [d, waist, hip] of [['2026-09-05', 85, 95], ['2026-09-06', 84.5, 94.5], ['2026-09-07', 84, 94]]) {
    db.prepare('INSERT INTO body_measurements (date, waist_cm, hip_cm) VALUES (?, ?, ?)').run(d, waist, hip);
  }
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'seed计划', 'v1', 'desc', 4, '2026-09-01')").run();
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, ?, ?)').run('上肢', JSON.stringify([{ name: '硬拉', part: '背', type: '力量', sets: [] }]));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, ?, ?)').run('下肢', JSON.stringify([{ name: '深蹲', part: '腿', type: '力量', sets: [] }]));
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
    const toks = tokenize(effective);
    const r = spawnSync(NODE, [CLI, ...toks.slice(1)], {
      encoding: 'utf8',
      env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photosDir },
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
