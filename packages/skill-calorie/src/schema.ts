/** T1 #20 · 卡路里 13 表 TS 化与迁移史收敛单线（对照老家 scripts/db.py 688 行）。
 *
 * 收敛决策（相对老家的增量史）：
 * - 新库直接建终态 11 张持久表；老家的 body_composition_new / body_composition_mig
 *   只是历史重建过程的临时表，TS 线永不创建，残留则清理（见 MIGRATION cleanup-strays）。
 * - 老迁移史收敛为一条有序幂等 MIGRATIONS：PRAGMA 列检查 / IF NOT EXISTS /
 *   条件回填，重复运行不报错（老家 apply_migrations 语义的超集）。
 * - intensity 列（中文低中高）终态已删除；老库残留则做一次性 difficulty 回填后保留列
 *   （SQLite 不便删列，读路径统一用 difficulty）。
 * - 真实 DB 只读不迁：本模块默认只开显式传入路径；见 paths.assertWritablePath。
 */
import { DatabaseSync } from 'node:sqlite';
import { SOURCE_CHOICES } from './kcal.js';

export const SCHEMA_VERSION = 1;

const SOURCE_IN = SOURCE_CHOICES.map((s) => `'${s}'`).join(', ');

/** 终态 DDL：11 张持久表（老家 13 表 − 2 张历史临时表）。 */
export const TABLE_DDLS: Record<string, string> = {
  food_log: `CREATE TABLE IF NOT EXISTS food_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, time TEXT, food_name TEXT NOT NULL,
    grams INTEGER NOT NULL, calories INTEGER NOT NULL,
    protein INTEGER DEFAULT 0, carbs INTEGER DEFAULT 0, fat INTEGER DEFAULT 0,
    sodium_mg REAL, sugar_g REAL, fiber_g REAL,
    note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  daily_goal: `CREATE TABLE IF NOT EXISTS daily_goal (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    calorie_goal INTEGER NOT NULL DEFAULT 1800,
    protein_goal INTEGER DEFAULT 150, carbs_goal INTEGER DEFAULT 200, fat_goal INTEGER DEFAULT 60,
    weight_goal REAL, goal_deadline TEXT, water_goal INTEGER DEFAULT 2000,
    goal_paused INTEGER DEFAULT 0, exercise_goal INTEGER,
    start_weight REAL, start_date TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  exercise_log: `CREATE TABLE IF NOT EXISTS exercise_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, time TEXT, exercise_type TEXT NOT NULL,
    duration_minutes INTEGER, calories_burned INTEGER NOT NULL,
    category TEXT, difficulty TEXT, distance_km REAL, avg_heart_rate INTEGER,
    set_index INTEGER, load_kg REAL, reps INTEGER, updated_at TEXT,
    steps INTEGER, max_heart_rate INTEGER,
    is_deleted INTEGER DEFAULT 0, is_backfill INTEGER DEFAULT 0,
    xunji_localid TEXT, xunji_title TEXT,
    note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  weight_log: `CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, time TEXT, weight_kg REAL NOT NULL,
    height_cm REAL, bmi REAL, note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  nutrition_products: `CREATE TABLE IF NOT EXISTS nutrition_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL, brand TEXT,
    calories REAL NOT NULL, protein REAL NOT NULL, fat REAL NOT NULL,
    saturated_fat REAL, carbohydrates REAL NOT NULL, sugar REAL,
    dietary_fiber REAL, sodium REAL NOT NULL,
    source TEXT NOT NULL DEFAULT '未知', is_deprecated INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT '', note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  workout_plan_config: `CREATE TABLE IF NOT EXISTS workout_plan_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL, version TEXT, description TEXT,
    total_weeks INTEGER NOT NULL, start_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  workout_plans: `CREATE TABLE IF NOT EXISTS workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_number INTEGER NOT NULL, day_of_week INTEGER NOT NULL,
    session_index INTEGER NOT NULL DEFAULT 1, session_label TEXT NOT NULL,
    time_start TEXT, time_end TEXT, is_rest_day INTEGER DEFAULT 0,
    total_sets INTEGER, movements TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_number, day_of_week, session_index))`,
  body_photos: `CREATE TABLE IF NOT EXISTS body_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, time TEXT NOT NULL, photo_path TEXT NOT NULL,
    tag TEXT NOT NULL, note TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  user_profile: `CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    age INTEGER, gender TEXT, height_cm REAL, note TEXT DEFAULT '',
    activity_level TEXT DEFAULT 'moderate',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  body_composition: `CREATE TABLE IF NOT EXISTS body_composition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, source TEXT NOT NULL CHECK (source IN (${SOURCE_IN})),
    age INTEGER, sex TEXT CHECK (sex IN ('male', 'female')),
    caliper_chest_mm REAL CHECK (caliper_chest_mm > 0 AND caliper_chest_mm < 100),
    caliper_abdominal_mm REAL CHECK (caliper_abdominal_mm > 0 AND caliper_abdominal_mm < 100),
    caliper_thigh_mm REAL CHECK (caliper_thigh_mm > 0 AND caliper_thigh_mm < 100),
    caliper_tricep_mm REAL CHECK (caliper_tricep_mm > 0 AND caliper_tricep_mm < 100),
    caliper_subscapular_mm REAL CHECK (caliper_subscapular_mm > 0 AND caliper_subscapular_mm < 100),
    caliper_suprailiac_mm REAL CHECK (caliper_suprailiac_mm > 0 AND caliper_suprailiac_mm < 100),
    caliper_midaxillary_mm REAL CHECK (caliper_midaxillary_mm > 0 AND caliper_midaxillary_mm < 100),
    body_fat_pct REAL NOT NULL CHECK (body_fat_pct >= 0 AND body_fat_pct <= 60),
    calculated_at TEXT, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  body_measurements: `CREATE TABLE IF NOT EXISTS body_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
    chest_cm REAL CHECK (chest_cm IS NULL OR (chest_cm > 20 AND chest_cm < 200)),
    waist_cm REAL CHECK (waist_cm IS NULL OR (waist_cm > 20 AND waist_cm < 200)),
    abdomen_cm REAL CHECK (abdomen_cm IS NULL OR (abdomen_cm > 20 AND abdomen_cm < 200)),
    hip_cm REAL CHECK (hip_cm IS NULL OR (hip_cm > 20 AND hip_cm < 200)),
    left_thigh_cm REAL CHECK (left_thigh_cm IS NULL OR (left_thigh_cm > 10 AND left_thigh_cm < 100)),
    right_thigh_cm REAL CHECK (right_thigh_cm IS NULL OR (right_thigh_cm > 10 AND right_thigh_cm < 100)),
    left_calf_cm REAL CHECK (left_calf_cm IS NULL OR (left_calf_cm > 10 AND left_calf_cm < 80)),
    right_calf_cm REAL CHECK (right_calf_cm IS NULL OR (right_calf_cm > 10 AND right_calf_cm < 80)),
    left_arm_cm REAL CHECK (left_arm_cm IS NULL OR (left_arm_cm > 10 AND left_arm_cm < 60)),
    right_arm_cm REAL CHECK (right_arm_cm IS NULL OR (right_arm_cm > 10 AND right_arm_cm < 60)),
    left_forearm_cm REAL CHECK (left_forearm_cm IS NULL OR (left_forearm_cm > 10 AND left_forearm_cm < 50)),
    right_forearm_cm REAL CHECK (right_forearm_cm IS NULL OR (right_forearm_cm > 10 AND right_forearm_cm < 50)),
    shoulder_cm REAL CHECK (shoulder_cm IS NULL OR (shoulder_cm > 20 AND shoulder_cm < 200)),
    note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
};

export const INDEX_SQLS: string[] = [
  'CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log(date)',
  'CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_log(date)',
  'CREATE INDEX IF NOT EXISTS idx_exercise_date ON exercise_log(date)',
  'CREATE INDEX IF NOT EXISTS idx_exercise_category ON exercise_log(category)',
  'CREATE INDEX IF NOT EXISTS idx_exercise_type ON exercise_log(exercise_type)',
  'CREATE INDEX IF NOT EXISTS idx_exercise_xunji_localid ON exercise_log(xunji_localid)',
  'CREATE INDEX IF NOT EXISTS idx_product_name ON nutrition_products(product_name)',
  'CREATE INDEX IF NOT EXISTS idx_product_source ON nutrition_products(source)',
  'CREATE INDEX IF NOT EXISTS idx_wp_week_day ON workout_plans(week_number, day_of_week)',
  'CREATE INDEX IF NOT EXISTS idx_body_photos_date ON body_photos(date)',
  'CREATE INDEX IF NOT EXISTS idx_body_photos_tag ON body_photos(tag)',
  'CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date)',
  'CREATE INDEX IF NOT EXISTS idx_body_composition_source ON body_composition(source)',
  'CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(date)',
];

export const TRIGGER_SQLS: string[] = [
  `CREATE TRIGGER IF NOT EXISTS user_profile_activity_level_check
   BEFORE INSERT ON user_profile
   WHEN (NEW.activity_level IS NOT NULL AND NEW.activity_level NOT IN
     ('sedentary', 'light', 'moderate', 'active', 'very_active'))
   BEGIN SELECT RAISE(ABORT, 'activity_level 必须是 sedentary/light/moderate/active/very_active 之一'); END`,
  `CREATE TRIGGER IF NOT EXISTS user_profile_activity_level_check_update
   BEFORE UPDATE OF activity_level ON user_profile
   WHEN (NEW.activity_level IS NOT NULL AND NEW.activity_level NOT IN
     ('sedentary', 'light', 'moderate', 'active', 'very_active'))
   BEGIN SELECT RAISE(ABORT, 'activity_level 必须是 sedentary/light/moderate/active/very_active 之一'); END`,
  `CREATE TRIGGER IF NOT EXISTS body_measurements_require_metric
   BEFORE INSERT ON body_measurements
   WHEN (NEW.chest_cm IS NULL AND NEW.waist_cm IS NULL AND NEW.abdomen_cm IS NULL
     AND NEW.hip_cm IS NULL AND NEW.left_thigh_cm IS NULL AND NEW.right_thigh_cm IS NULL
     AND NEW.left_calf_cm IS NULL AND NEW.right_calf_cm IS NULL
     AND NEW.left_arm_cm IS NULL AND NEW.right_arm_cm IS NULL
     AND NEW.left_forearm_cm IS NULL AND NEW.right_forearm_cm IS NULL
     AND NEW.shoulder_cm IS NULL)
   BEGIN SELECT RAISE(ABORT, 'body_measurements 需要 date + 至少 1 个围度'); END`,
];

function tableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function tableSql(db: DatabaseSync, table: string): string {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
    .get(table) as { sql: string } | undefined;
  return row?.sql ?? '';
}

function tableExists(db: DatabaseSync, table: string): boolean {
  return tableSql(db, table) !== '';
}

const CALIPERS = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm', 'caliper_tricep_mm',
  'caliper_subscapular_mm', 'caliper_suprailiac_mm', 'caliper_midaxillary_mm',
];

/** 收敛单线：有序幂等迁移。老库（py 建）与新库统一走同一入口。 */
export function applyMigrations(db: DatabaseSync): void {
  // M1 遗留表清理：entries 合并 → food_log；sleep_records / fitness_goals 删除。
  const tables = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );
  if (tables.has('entries') && !tables.has('food_log')) {
    db.exec('ALTER TABLE entries RENAME TO food_log');
  } else if (tables.has('entries') && tables.has('food_log')) {
    db.exec(
      'INSERT OR IGNORE INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note, created_at) ' +
        'SELECT date, time, food_name, grams, calories, protein, carbs, fat, note, created_at FROM entries',
    );
    db.exec('DROP TABLE entries');
  }
  for (const dead of ['sleep_records', 'fitness_goals', 'body_composition_new', 'body_composition_mig']) {
    db.exec(`DROP TABLE IF EXISTS ${dead}`);
  }

  // M2 food_log 钠糖纤维列 + 回填（老家 2026-08-02 ticket #10）。
  const foodCols = tableColumns(db, 'food_log');
  for (const [col, type] of [['sodium_mg', 'REAL'], ['sugar_g', 'REAL'], ['fiber_g', 'REAL']] as const) {
    if (!foodCols.has(col)) db.exec(`ALTER TABLE food_log ADD COLUMN ${col} ${type}`);
  }
  db.exec(`UPDATE food_log SET
    sodium_mg = ROUND((SELECT n.sodium FROM nutrition_products n
      WHERE n.product_name = food_log.food_name AND n.is_deprecated = 0
      ORDER BY n.id DESC LIMIT 1) * food_log.grams / 100.0, 1),
    sugar_g = ROUND((SELECT n.sugar FROM nutrition_products n
      WHERE n.product_name = food_log.food_name AND n.is_deprecated = 0
      ORDER BY n.id DESC LIMIT 1) * food_log.grams / 100.0, 1),
    fiber_g = ROUND((SELECT n.dietary_fiber FROM nutrition_products n
      WHERE n.product_name = food_log.food_name AND n.is_deprecated = 0
      ORDER BY n.id DESC LIMIT 1) * food_log.grams / 100.0, 1)
    WHERE food_log.sodium_mg IS NULL OR food_log.sugar_g IS NULL OR food_log.fiber_g IS NULL`);

  // M3 daily_goal 增量列（PRAGMA 守卫，老家 try/except 语义）。
  const goalCols = tableColumns(db, 'daily_goal');
  for (const [col, type] of [
    ['weight_goal', 'REAL'], ['goal_deadline', 'TEXT'], ['water_goal', 'INTEGER DEFAULT 2000'],
    ['goal_paused', 'INTEGER DEFAULT 0'], ['exercise_goal', 'INTEGER'],
    ['start_weight', 'REAL'], ['start_date', 'TEXT'],
  ] as const) {
    if (!goalCols.has(col)) db.exec(`ALTER TABLE daily_goal ADD COLUMN ${col} ${type}`);
  }

  // M4 nutrition_products 扩展列 + [已废弃] 回填。
  const prodCols = tableColumns(db, 'nutrition_products');
  for (const [col, type] of [
    ['source', "TEXT DEFAULT '未知'"], ['is_deprecated', 'INTEGER DEFAULT 0'],
    ['category', "TEXT DEFAULT ''"],
  ] as const) {
    if (!prodCols.has(col)) db.exec(`ALTER TABLE nutrition_products ADD COLUMN ${col} ${type}`);
  }
  db.exec(`UPDATE nutrition_products SET is_deprecated = 1 WHERE is_deprecated = 0 AND (
    note LIKE '%[已废弃]%' OR product_name LIKE '%[已废弃]%' OR brand LIKE '%[已废弃]%')`);

  // M5 exercise_log 扩展列 + intensity→difficulty 数据迁移 + xunji 关联列。
  const exCols = tableColumns(db, 'exercise_log');
  for (const [col, type] of [
    ['category', 'TEXT'], ['difficulty', 'TEXT'], ['distance_km', 'REAL'],
    ['avg_heart_rate', 'INTEGER'], ['set_index', 'INTEGER'], ['load_kg', 'REAL'],
    ['reps', 'INTEGER'], ['updated_at', 'TEXT'], ['steps', 'INTEGER'],
    ['max_heart_rate', 'INTEGER'], ['is_deleted', 'INTEGER DEFAULT 0'],
    ['is_backfill', 'INTEGER DEFAULT 0'],
    ['xunji_localid', 'TEXT'], ['xunji_title', 'TEXT'],
  ] as const) {
    if (!exCols.has(col)) db.exec(`ALTER TABLE exercise_log ADD COLUMN ${col} ${type}`);
  }
  if (exCols.has('intensity')) {
    db.exec(`UPDATE exercise_log SET difficulty = CASE intensity
      WHEN '低' THEN 'easy' WHEN '中' THEN 'normal' WHEN '高' THEN 'hard' ELSE NULL END
      WHERE difficulty IS NULL AND intensity IS NOT NULL`);
  }

  // M6 user_profile.activity_level + 回填。
  if (!tableColumns(db, 'user_profile').has('activity_level')) {
    db.exec("ALTER TABLE user_profile ADD COLUMN activity_level TEXT DEFAULT 'moderate'");
    db.exec("UPDATE user_profile SET activity_level = 'moderate' WHERE activity_level IS NULL");
  }

  // M7 body_composition 重建收敛：旧 CHECK（无 gym）或皮褶 NOT NULL → 一次重建为终态。
  if (tableExists(db, 'body_composition')) {
    const sql = tableSql(db, 'body_composition');
    const info = db.prepare('PRAGMA table_info(body_composition)').all() as {
      name: string;
      notnull: number;
    }[];
    const notnullBy = new Map(info.map((c) => [c.name, c.notnull]));
    const needsRebuild =
      !SOURCE_CHOICES.every((s) => sql.includes(`'${s}'`)) ||
      CALIPERS.some((c) => (notnullBy.get(c) ?? 0) === 1);
    if (needsRebuild) {
      const cols = info.map((c) => c.name);
      const colList = cols.map((c) => `"${c}"`).join(', ');
      db.exec(TABLE_DDLS.body_composition.replace('body_composition (', 'body_composition_ts ('));
      db.exec(`INSERT INTO body_composition_ts (${colList}) SELECT ${colList} FROM body_composition`);
      db.exec('DROP TABLE body_composition');
      db.exec('ALTER TABLE body_composition_ts RENAME TO body_composition');
    }
  }

  for (const sql of INDEX_SQLS) db.exec(sql);
  for (const sql of TRIGGER_SQLS) db.exec(sql);
}

/** 建库入口：终态 DDL + 收敛迁移（幂等，可重入）。 */
export function initDb(db: DatabaseSync): void {
  for (const ddl of Object.values(TABLE_DDLS)) db.exec(ddl);
  applyMigrations(db);
}

/** 开库：仅显式路径（测试传 tmp；生产见 paths.resolveDbPath）。 */
export function openDb(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  initDb(db);
  return db;
}

export function listUserTables(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}
