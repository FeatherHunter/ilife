// 取数层·文件 DB（老家 scripts/db.py + init_db.py + 17 表 schema 对应）：node:sqlite。
// 缺失/损坏大声失败，不返空。废弃 = status 置已废弃（只增不删，无物理删除）。
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { ChefFetchError } from './errors.js';

export interface RecipeRow {
  id: string; name: string; description: string; difficulty: string;
  servings: number; total_time_minutes: number; status: string;
  photo_url: string; source: string; source_url: string;
  created_at: string; updated_at: string;
}

export interface IngredientRow {
  id: string; recipe_id: string; sequence: number; name: string;
  category: string; quantity: number | null; unit: string;
  quantity_text: string; is_optional: number; substitute: string;
}

export interface StepRow {
  id: string; recipe_id: string; sequence: number; action: string;
  duration_minutes: number | null; heat_level: string; temperature: string;
  expected_result: string;
}

export interface HistoryRow {
  id: string; recipe_id: string; cook_date: string; cook_sequence: number;
  rating: number | null; feedback: string;
}

export interface ShoppingItem {
  name: string; quantity: number; unit: string; recipes: string[];
  quantity_text?: string; from?: string; optional?: boolean; category?: string;
}

export interface HealthIssue {
  level: string; message?: string;
}

export interface ChefDb { db: DatabaseSync; path: string; initialized: boolean; }

function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', difficulty TEXT DEFAULT '', servings INTEGER DEFAULT 2, total_time_minutes INTEGER DEFAULT 30, status TEXT DEFAULT '未做', photo_url TEXT DEFAULT '', source TEXT DEFAULT '', source_url TEXT DEFAULT '', created_at TEXT DEFAULT '', updated_at TEXT DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name)`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty)`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status)`,
  `CREATE TABLE IF NOT EXISTS recipe_categories (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, cuisine_type TEXT DEFAULT '', region TEXT DEFAULT '', country TEXT DEFAULT '', FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe ON recipe_categories(recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_categories_cuisine ON recipe_categories(cuisine_type)`,
  `CREATE TABLE IF NOT EXISTS recipe_seasons (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, season TEXT NOT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_seasons_recipe ON recipe_seasons(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS recipe_cooking_methods (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, method TEXT NOT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_cooking_methods_recipe ON recipe_cooking_methods(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS recipe_flavors (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, flavor TEXT NOT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_flavors_recipe ON recipe_flavors(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS recipe_diet_tags (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, tag TEXT NOT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_diet_tags_recipe ON recipe_diet_tags(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS recipe_meal_types (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, meal_type TEXT NOT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_meal_types_recipe ON recipe_meal_types(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, sequence INTEGER DEFAULT 0, name TEXT NOT NULL, category TEXT DEFAULT '', quantity REAL DEFAULT NULL, unit TEXT DEFAULT '', quantity_text TEXT DEFAULT '', is_optional INTEGER DEFAULT 0, substitute TEXT DEFAULT '', FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients(recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name)`,
  `CREATE TABLE IF NOT EXISTS cooking_steps (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, sequence INTEGER NOT NULL, action TEXT NOT NULL, duration_minutes INTEGER DEFAULT NULL, heat_level TEXT DEFAULT '', temperature TEXT DEFAULT '', expected_result TEXT DEFAULT '', FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_cooking_steps_recipe ON cooking_steps(recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cooking_steps_sequence ON cooking_steps(recipe_id, sequence)`,
  `CREATE TABLE IF NOT EXISTS step_ingredients (id TEXT PRIMARY KEY, step_id TEXT NOT NULL, ingredient_id TEXT NOT NULL, quantity_used REAL DEFAULT NULL, introduced_at TEXT DEFAULT '', unit TEXT DEFAULT '', FOREIGN KEY (step_id) REFERENCES cooking_steps(id) ON DELETE CASCADE, FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_step_ingredients_step ON step_ingredients(step_id)`,
  `CREATE INDEX IF NOT EXISTS idx_step_ingredients_ingredient ON step_ingredients(ingredient_id)`,
  `CREATE TABLE IF NOT EXISTS step_techniques (id TEXT PRIMARY KEY, step_id TEXT NOT NULL, recipe_id TEXT NOT NULL, technique_name TEXT NOT NULL, description TEXT DEFAULT '', key_points TEXT DEFAULT '', FOREIGN KEY (step_id) REFERENCES cooking_steps(id) ON DELETE CASCADE, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_step_techniques_step ON step_techniques(step_id)`,
  `CREATE INDEX IF NOT EXISTS idx_step_techniques_recipe ON step_techniques(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS tips (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, step_id TEXT DEFAULT NULL, ingredient_id TEXT DEFAULT NULL, category TEXT DEFAULT '', content TEXT NOT NULL, priority INTEGER DEFAULT 0, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE, FOREIGN KEY (step_id) REFERENCES cooking_steps(id) ON DELETE SET NULL, FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_tips_recipe ON tips(recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tips_step ON tips(step_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tips_ingredient ON tips(ingredient_id)`,
  `CREATE TABLE IF NOT EXISTS recipe_history (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, cook_date TEXT NOT NULL, cook_sequence INTEGER DEFAULT 1, rating REAL DEFAULT NULL, feedback TEXT DEFAULT '', photo TEXT DEFAULT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_history_recipe ON recipe_history(recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_history_date ON recipe_history(cook_date)`,
  `CREATE TABLE IF NOT EXISTS background_knowledge (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL UNIQUE, origin_story TEXT DEFAULT '', historical_background TEXT DEFAULT '', cultural_significance TEXT DEFAULT '', FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_background_recipe ON background_knowledge(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS recipe_relations (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL, child_id TEXT NOT NULL, relation_type TEXT DEFAULT '', change_summary TEXT DEFAULT '', FOREIGN KEY (parent_id) REFERENCES recipes(id) ON DELETE CASCADE, FOREIGN KEY (child_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_relations_parent ON recipe_relations(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_relations_child ON recipe_relations(child_id)`,
  `CREATE TABLE IF NOT EXISTS cookware (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, name TEXT NOT NULL, category TEXT DEFAULT '', FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_cookware_recipe ON cookware(recipe_id)`,
  `CREATE TABLE IF NOT EXISTS nutrition_info (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL UNIQUE, serving_size REAL DEFAULT NULL, serving_unit TEXT DEFAULT '', calories INTEGER DEFAULT NULL, protein REAL DEFAULT NULL, fat REAL DEFAULT NULL, carbs REAL DEFAULT NULL, fiber REAL DEFAULT NULL, sodium REAL DEFAULT NULL, FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_nutrition_recipe ON nutrition_info(recipe_id)`,
];
function qAll<T>(h: ChefDb, sql: string, params: unknown[] = []): T[] {
  try {
    const stmt = h.db.prepare(sql) as unknown as { all: (...a: never[]) => T[] };
    return stmt.all(...(params as never[]));
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '查询失败', { cause: e });
  }
}

function qGet<T>(h: ChefDb, sql: string, params: unknown[] = []): T | undefined {
  try {
    const stmt = h.db.prepare(sql) as unknown as { get: (...a: never[]) => T | undefined };
    return stmt.get(...(params as never[]));
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '查询失败', { cause: e });
  }
}

function qRun(h: ChefDb, sql: string, params: unknown[] = []): void {
  try {
    const stmt = h.db.prepare(sql) as unknown as { run: (...a: never[]) => unknown };
    stmt.run(...(params as never[]));
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '写库失败', { cause: e });
  }
}

function toRecipe(r: Record<string, unknown>): RecipeRow {
  return {
    id: String(r.id ?? ''), name: String(r.name ?? ''), description: String(r.description ?? ''),
    difficulty: String(r.difficulty ?? ''), servings: Number(r.servings ?? 2),
    total_time_minutes: Number(r.total_time_minutes ?? 30), status: String(r.status ?? ''),
    photo_url: String(r.photo_url ?? ''), source: String(r.source ?? ''),
    source_url: String(r.source_url ?? ''), created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  };
}

function toIngredient(r: Record<string, unknown>): IngredientRow {
  const q = r.quantity === null || r.quantity === undefined || r.quantity === '' ? null : Number(r.quantity);
  return {
    id: String(r.id ?? ''), recipe_id: String(r.recipe_id ?? ''), sequence: Number(r.sequence ?? 0),
    name: String(r.name ?? ''), category: String(r.category ?? ''),
    quantity: q === null || Number.isNaN(q) ? null : q, unit: String(r.unit ?? ''),
    quantity_text: String(r.quantity_text ?? ''), is_optional: Number(r.is_optional ?? 0),
    substitute: String(r.substitute ?? ''),
  };
}

function toStep(r: Record<string, unknown>): StepRow {
  const d = r.duration_minutes === null || r.duration_minutes === undefined || r.duration_minutes === '' ? null : Number(r.duration_minutes);
  return {
    id: String(r.id ?? ''), recipe_id: String(r.recipe_id ?? ''), sequence: Number(r.sequence ?? 0),
    action: String(r.action ?? ''), duration_minutes: d === null || Number.isNaN(d) ? null : d,
    heat_level: String(r.heat_level ?? ''), temperature: String(r.temperature ?? ''),
    expected_result: String(r.expected_result ?? ''),
  };
}

function toHistory(r: Record<string, unknown>): HistoryRow {
  const rt = r.rating === null || r.rating === undefined || r.rating === '' ? null : Number(r.rating);
  return {
    id: String(r.id ?? ''), recipe_id: String(r.recipe_id ?? ''),
    cook_date: String(r.cook_date ?? ''), cook_sequence: Number(r.cook_sequence ?? 0),
    rating: rt === null || Number.isNaN(rt) ? null : rt, feedback: String(r.feedback ?? ''),
  };
}

export function openChefDb(dbPath: string): ChefDb {
  if (typeof dbPath !== 'string' || dbPath.length === 0) {
    throw new ChefFetchError('CHEF_DB_MISSING', '大厨 DB 路径未指定');
  }
  let db: DatabaseSync;
  try { db = new DatabaseSync(dbPath); }
  catch (e) { throw new ChefFetchError('CHEF_DB_UNREADABLE', '大厨 DB 打不开：' + dbPath, { cause: e }); }
  const h: ChefDb = { db, path: dbPath, initialized: false };
  try {
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA busy_timeout=5000');
    let existed = false;
    try {
      const row = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recipes'") as unknown as { get: () => unknown }).get();
      existed = !!row;
    } catch { existed = false; }
    for (const ddl of DDL) db.exec(ddl);
    h.initialized = !existed;
  } catch (e) {
    try { db.close(); } catch { /* ignore */ }
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '大厨 DB 初始化失败：' + dbPath, { cause: e });
  }
  return h;
}

export function closeChefDb(handle: ChefDb): void {
  try { handle.db.close(); } catch { /* ignore */ }
}

function mustRecipe(h: ChefDb, idOrName: string): RecipeRow {
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM recipes WHERE id = ? OR name = ?', [idOrName, idOrName]);
  if (!row) throw new ChefFetchError('CHEF_RECIPE_NOT_FOUND', '无此菜谱：' + idOrName);
  return toRecipe(row);
}

export function addRecipe(h: ChefDb, input: Record<string, unknown>): RecipeRow {
  const name = typeof (input as Record<string, unknown>)?.name === 'string' ? String((input as Record<string, unknown>).name).trim() : '';
  if (!name) throw new ChefFetchError('CHEF_BAD_QUERY', '加菜须给菜名 name');
  const id = randomUUID();
  const ts = now();
  const p = input as Record<string, unknown>;
  const servings = p.servings === undefined || p.servings === '' ? 2 : Number(p.servings);
  const totalTime = (p.total_time_minutes === undefined || p.total_time_minutes === '') ? (p.total_time === undefined || p.total_time === '' ? 30 : Number(p.total_time)) : Number(p.total_time_minutes);
  try {
    qRun(h, 'INSERT INTO recipes (id, name, description, difficulty, servings, total_time_minutes, status, photo_url, source, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, name,
      String(p.description ?? ''), String(p.difficulty ?? ''), servings,
      totalTime, String(p.status ?? '未做'),
      String(p.photo_url ?? ''), String(p.source ?? ''), String(p.source_url ?? ''), ts, ts,
    ]);
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '加菜写盘失败：' + name, { cause: e });
  }
  return mustRecipe(h, id);
}

export function addIngredient(h: ChefDb, recipeId: string, input: { name: string; category?: string; quantity?: number | null; unit?: string; quantity_text?: string; is_optional?: number | boolean; substitute?: string }): IngredientRow;
export function addIngredient(h: ChefDb, params: Record<string, unknown>): IngredientRow;
export function addIngredient(h: ChefDb, recipeIdOrParams: string | Record<string, unknown>, input?: Record<string, unknown>): IngredientRow {
  const params = typeof recipeIdOrParams === 'string' ? { ...(input ?? {}), recipe_id: recipeIdOrParams } : (recipeIdOrParams as Record<string, unknown>);
  const recipeId = String(params.recipe_id ?? params.recipeId ?? '');
  if (!recipeId) throw new ChefFetchError('CHEF_BAD_QUERY', '加食材须给 recipe_id');
  mustRecipe(h, recipeId);
  const name = typeof params?.name === 'string' ? String(params.name).trim() : '';
  if (!name) throw new ChefFetchError('CHEF_BAD_QUERY', '食材须给名 name');
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(sequence) AS m FROM ingredients WHERE recipe_id = ?', [recipeId]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  const qtyRaw = (params as Record<string, unknown>).quantity;
  const qtyNum = qtyRaw === undefined || qtyRaw === null || qtyRaw === '' ? null : Number(qtyRaw);
  const qty = qtyNum === null || Number.isNaN(qtyNum) ? null : qtyNum;
  const isOptRaw = (params as Record<string, unknown>).is_optional;
  const isOpt = isOptRaw === true || isOptRaw === 1 || isOptRaw === '1' ? 1 : 0;
  try {
    qRun(h, 'INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text, is_optional, substitute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, recipeId, seq, name, String(params.category ?? ''), qty, String(params.unit ?? ''), String(params.quantity_text ?? ''), isOpt, String(params.substitute ?? ''),
    ]);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '食材写盘失败：' + name, { cause: e });
  }
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM ingredients WHERE id = ?', [id]);
  if (!row) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '食材写后读回失败：' + name);
  return toIngredient(row);
}

export function addStep(h: ChefDb, recipeId: string, input: { action: string; heat_level?: string; duration_minutes?: number | null; temperature?: string; expected_result?: string }): StepRow;
export function addStep(h: ChefDb, params: Record<string, unknown>): StepRow;
export function addStep(h: ChefDb, recipeIdOrParams: string | Record<string, unknown>, input?: Record<string, unknown>): StepRow {
  const params = typeof recipeIdOrParams === 'string' ? { ...(input ?? {}), recipe_id: recipeIdOrParams } : (recipeIdOrParams as Record<string, unknown>);
  const recipeId = String(params.recipe_id ?? params.recipeId ?? '');
  if (!recipeId) throw new ChefFetchError('CHEF_BAD_QUERY', '加步骤须给 recipe_id');
  mustRecipe(h, recipeId);
  const action = typeof params?.action === 'string' ? String(params.action).trim() : '';
  if (!action) throw new ChefFetchError('CHEF_BAD_QUERY', '步骤须给操作 action');
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(sequence) AS m FROM cooking_steps WHERE recipe_id = ?', [recipeId]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  const durRaw = (params as Record<string, unknown>).duration_minutes;
  const durNum = durRaw === undefined || durRaw === null || durRaw === '' ? null : Number(durRaw);
  const dur = durNum === null || Number.isNaN(durNum) ? null : durNum;
  try {
    qRun(h, 'INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level, temperature, expected_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      id, recipeId, seq, action, dur, String(params.heat_level ?? ''), String(params.temperature ?? ''), String(params.expected_result ?? ''),
    ]);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '步骤写盘失败', { cause: e });
  }
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM cooking_steps WHERE id = ?', [id]);
  if (!row) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '步骤写后读回失败');
  return toStep(row);
}

export function listRecipes(h: ChefDb, opts: { difficulty?: string; includeDeprecated?: boolean } = {}): RecipeRow[] {
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (!opts.includeDeprecated) conds.push("status != '已废弃'");
  if (opts.difficulty !== undefined) { conds.push('difficulty = ?'); params.push(opts.difficulty); }
  const rows = qAll<Record<string, unknown>>(h, 'SELECT * FROM recipes WHERE ' + conds.join(' AND ') + ' ORDER BY name ASC', params);
  return rows.map(toRecipe);
}

export function searchRecipes(h: ChefDb, kw: string): RecipeRow[] {
  if (typeof kw !== 'string' || kw.trim().length === 0) {
    throw new ChefFetchError('CHEF_BAD_QUERY', '搜索须给关键词（空查询不返全量）');
  }
  const k = '%' + kw.trim() + '%';
  const rows = qAll<Record<string, unknown>>(h, "SELECT DISTINCT r.* FROM recipes r LEFT JOIN ingredients i ON i.recipe_id = r.id WHERE (r.name LIKE ? OR r.description LIKE ? OR i.name LIKE ?) AND r.status != '已废弃' ORDER BY r.name ASC", [k, k, k]);
  return rows.map(toRecipe);
}

export function getRecipeDetail(h: ChefDb, idOrName: string): { recipe: RecipeRow; ingredients: IngredientRow[]; steps: StepRow[] } {
  if (typeof idOrName !== 'string' || idOrName.trim().length === 0) {
    throw new ChefFetchError('CHEF_BAD_QUERY', '查看须给菜名或 id');
  }
  const recipe = mustRecipe(h, idOrName.trim());
  const ings = qAll<Record<string, unknown>>(h, 'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sequence ASC', [recipe.id]);
  const steps = qAll<Record<string, unknown>>(h, 'SELECT * FROM cooking_steps WHERE recipe_id = ? ORDER BY sequence ASC', [recipe.id]);
  return { recipe, ingredients: ings.map(toIngredient), steps: steps.map(toStep) };
}

export function deprecateRecipe(h: ChefDb, id: string): RecipeRow {
  const r = mustRecipe(h, id);
  qRun(h, 'UPDATE recipes SET status = ?, updated_at = ? WHERE id = ?', ['已废弃', now(), r.id]);
  return mustRecipe(h, r.id);
}

export function updateRecipe(h: ChefDb, id: string, patch: Record<string, unknown>): RecipeRow {
  const r = mustRecipe(h, id);
  const allowed = ['name', 'description', 'difficulty', 'servings', 'total_time_minutes', 'status', 'photo_url', 'source', 'source_url'] as const;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of allowed) {
    const v = (patch as Record<string, unknown>)[k];
    if (v !== undefined) { sets.push(k + ' = ?'); params.push(k === 'servings' || k === 'total_time_minutes' ? Number(v) : String(v)); }
  }
  if (!sets.length) throw new ChefFetchError('CHEF_BAD_QUERY', 'update 至少改一个字段');
  sets.push('updated_at = ?');
  params.push(now());
  params.push(r.id);
  try {
    qRun(h, 'UPDATE recipes SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '菜谱更新失败：' + id, { cause: e });
  }
  return mustRecipe(h, r.id);
}

export function filterRecipes(h: ChefDb, filters: Record<string, unknown> = {}): RecipeRow[] {
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (filters.status !== undefined && filters.status !== '') { conds.push('r.status = ?'); params.push(String(filters.status)); }
  else conds.push("r.status != '已废弃'");
  if (filters.difficulty !== undefined && filters.difficulty !== '') { conds.push('r.difficulty = ?'); params.push(String(filters.difficulty)); }
  if (filters.maxTime !== undefined && filters.maxTime !== '') { conds.push('r.total_time_minutes <= ?'); params.push(Number(filters.maxTime)); }
  const exists = (table: string, col: string, val: unknown): void => {
    conds.push('EXISTS (SELECT 1 FROM ' + table + ' t WHERE t.recipe_id = r.id AND t.' + col + ' = ?)');
    params.push(String(val));
  };
  if (filters.cuisine !== undefined && filters.cuisine !== '') exists('recipe_categories', 'cuisine_type', filters.cuisine);
  if (filters.season !== undefined && filters.season !== '') exists('recipe_seasons', 'season', filters.season);
  if (filters.method !== undefined && filters.method !== '') exists('recipe_cooking_methods', 'method', filters.method);
  if (filters.flavor !== undefined && filters.flavor !== '') exists('recipe_flavors', 'flavor', filters.flavor);
  if (filters.tag !== undefined && filters.tag !== '') exists('recipe_diet_tags', 'tag', filters.tag);
  if (filters.meal !== undefined && filters.meal !== '') exists('recipe_meal_types', 'meal_type', filters.meal);
  if (filters.cookware !== undefined && filters.cookware !== '') exists('cookware', 'name', filters.cookware);
  const rows = qAll<Record<string, unknown>>(h, 'SELECT DISTINCT r.* FROM recipes r WHERE ' + conds.join(' AND ') + ' ORDER BY r.name ASC', params);
  return rows.map(toRecipe);
}

export function recordHistory(h: ChefDb, input: { recipe_id: string; rating?: number | null; feedback?: string; cook_date?: string }): HistoryRow {
  const rid = typeof input?.recipe_id === 'string' ? input.recipe_id.trim() : '';
  if (!rid) throw new ChefFetchError('CHEF_BAD_QUERY', '记录做菜须给 recipe_id');
  const recipe = mustRecipe(h, rid);
  let rating: number | null = null;
  const rawRt = (input as Record<string, unknown>).rating;
  if (rawRt !== undefined && rawRt !== null && rawRt !== '') {
    const n = typeof rawRt === 'string' ? Number(String(rawRt).trim()) : rawRt;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new ChefFetchError('CHEF_HISTORY_CORRUPT', '评分须为数字');
    rating = n as number;
  }
  const cookDate = typeof input.cook_date === 'string' && input.cook_date.trim() ? input.cook_date.trim() : today();
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(cook_sequence) AS m FROM recipe_history WHERE recipe_id = ?', [recipe.id]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  try {
    qRun(h, 'INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES (?, ?, ?, ?, ?, ?)', [id, recipe.id, cookDate, seq, rating, input.feedback ?? '']);
    if (recipe.status === '未做') qRun(h, 'UPDATE recipes SET status = ?, updated_at = ? WHERE id = ?', ['已做', now(), recipe.id]);
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '历史写盘失败', { cause: e });
  }
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM recipe_history WHERE id = ?', [id]);
  if (!row) throw new ChefFetchError('CHEF_HISTORY_CORRUPT', '历史写后读回失败');
  return toHistory(row);
}

export function queryHistory(h: ChefDb, recipeId?: string): HistoryRow[] {
  if (recipeId === undefined || recipeId === null || recipeId === '') {
    const rows = qAll<Record<string, unknown>>(h, 'SELECT * FROM recipe_history ORDER BY cook_date DESC, cook_sequence ASC');
    return rows.map(toHistory);
  }
  const recipe = mustRecipe(h, recipeId);
  const rows = qAll<Record<string, unknown>>(h, 'SELECT * FROM recipe_history WHERE recipe_id = ? ORDER BY cook_sequence ASC', [recipe.id]);
  return rows.map(toHistory);
}

export function historyStats(h: ChefDb, recipeId: string): { count: number; avgRating: number | null } {
  const recipe = mustRecipe(h, recipeId);
  const row = qGet<{ c: number; a: number | null }>(h, 'SELECT COUNT(*) AS c, AVG(rating) AS a FROM recipe_history WHERE recipe_id = ?', [recipe.id]);
  const count = Number(row?.c ?? 0);
  const avg = row?.a === null || row?.a === undefined ? null : Number(row.a);
  return { count, avgRating: avg };
}

export function buildShoppingList(h: ChefDb, names: string[]): ShoppingItem[] {
  if (!Array.isArray(names) || names.length === 0) {
    throw new ChefFetchError('CHEF_BAD_QUERY', '采购须给菜名（空查询不返空）');
  }
  const ids: string[] = [];
  const nameById = new Map<string, string>();
  for (const n of names) {
    if (typeof n !== 'string' || !n.trim()) throw new ChefFetchError('CHEF_BAD_QUERY', '采购菜名含空串');
    const r = mustRecipe(h, n.trim());
    if (!ids.includes(r.id)) { ids.push(r.id); nameById.set(r.id, r.name); }
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = qAll<Record<string, unknown>>(h, 'SELECT i.*, r.name AS _recipe_name FROM ingredients i JOIN recipes r ON r.id = i.recipe_id WHERE i.recipe_id IN (' + placeholders + ') ORDER BY i.name ASC', ids);
  const merged = new Map<string, ShoppingItem>();
  for (const r of rows) {
    const ing = toIngredient(r);
    const recipeName = String(r._recipe_name ?? nameById.get(ing.recipe_id) ?? '');
    const key = ing.name + '|||' + ing.unit;
    const qty = ing.quantity ?? 0;
    const hit = merged.get(key);
    const qt = ing.quantity_text || (ing.quantity !== null ? String(ing.quantity) + ing.unit : '');
    if (!hit) {
      merged.set(key, { name: ing.name, quantity: qty, unit: ing.unit, recipes: [recipeName], quantity_text: qt, from: recipeName, optional: ing.is_optional === 1, category: ing.category });
    } else {
      hit.quantity += qty;
      if (!hit.recipes.includes(recipeName)) hit.recipes.push(recipeName);
      hit.from = hit.recipes.join('+');
      if (ing.is_optional !== 1) hit.optional = false;
    }
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}

export function healthCheck(h: ChefDb): HealthIssue[] {
  const issues: HealthIssue[] = [];
  try {
    const noIng = qAll<Record<string, unknown>>(h, "SELECT r.name AS name FROM recipes r LEFT JOIN ingredients i ON i.recipe_id = r.id WHERE i.id IS NULL AND r.status != '已废弃'");
    for (const r of noIng) issues.push({ level: 'warn', message: '无食材：' + String(r.name ?? '') });
    const noStep = qAll<Record<string, unknown>>(h, "SELECT r.name AS name FROM recipes r LEFT JOIN cooking_steps s ON s.recipe_id = r.id WHERE s.id IS NULL AND r.status != '已废弃'");
    for (const r of noStep) issues.push({ level: 'warn', message: '无步骤：' + String(r.name ?? '') });
    const noHeat = qAll<Record<string, unknown>>(h, "SELECT r.name AS name, s.sequence AS seq FROM cooking_steps s JOIN recipes r ON r.id = s.recipe_id WHERE (s.heat_level IS NULL OR s.heat_level = '') AND r.status != '已废弃'");
    for (const r of noHeat) issues.push({ level: 'warn', message: '步骤缺火候：' + String(r.name ?? '') + '第' + String(r.seq ?? '') + '步' });
    const never = qAll<Record<string, unknown>>(h, "SELECT r.name AS name FROM recipes r LEFT JOIN recipe_history hh ON hh.recipe_id = r.id WHERE hh.id IS NULL AND r.status != '已废弃'");
    for (const r of never) issues.push({ level: 'info', message: '从未做过：' + String(r.name ?? '') });
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '体检查询失败', { cause: e });
  }
  issues.sort((a, b) => (a.level < b.level ? -1 : a.level > b.level ? 1 : String(a.message ?? '').localeCompare(String(b.message ?? ''), 'zh')));
  return issues;
}
