// 取数层·文件 DB（老家 scripts/db.py + init_db.py + 17 表 schema 对应）：node:sqlite。
// 缺失/损坏大声失败，不返空。废弃 = status 置已废弃（只增不删，无物理删除）。
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { ChefFetchError } from './errors.js';
import { CHEF_TABLE_DDL } from './schema.js';

// 建表语句住 `src/fetch/schema.ts`（DDL 稳定、查询常变，变化频率分层；17 张表齐是体检的门槛，见 `src/health.ts`）。
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

/** #839 搬迁后包内共享的取数原语：域目录的 run 可直接引用（`src/<域>/run*.ts`），包门不管。 */
export function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// 建表语句已搬入 ./schema.ts（CHEF_TABLE_DDL）：DDL 稳定、查询常变，变化频率分层（#839）。
export function qAll<T>(h: ChefDb, sql: string, params: unknown[] = []): T[] {
  try {
    const stmt = h.db.prepare(sql) as unknown as { all: (...a: never[]) => T[] };
    return stmt.all(...(params as never[]));
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '查询失败', { cause: e });
  }
}

export function qGet<T>(h: ChefDb, sql: string, params: unknown[] = []): T | undefined {
  try {
    const stmt = h.db.prepare(sql) as unknown as { get: (...a: never[]) => T | undefined };
    return stmt.get(...(params as never[]));
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '查询失败', { cause: e });
  }
}

export function qRun(h: ChefDb, sql: string, params: unknown[] = []): void {
  try {
    const stmt = h.db.prepare(sql) as unknown as { run: (...a: never[]) => unknown };
    stmt.run(...(params as never[]));
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '写库失败', { cause: e });
  }
}

export function toRecipe(r: Record<string, unknown>): RecipeRow {
  return {
    id: String(r.id ?? ''), name: String(r.name ?? ''), description: String(r.description ?? ''),
    difficulty: String(r.difficulty ?? ''), servings: Number(r.servings ?? 2),
    total_time_minutes: Number(r.total_time_minutes ?? 30), status: String(r.status ?? ''),
    photo_url: String(r.photo_url ?? ''), source: String(r.source ?? ''),
    source_url: String(r.source_url ?? ''), created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  };
}

export function toIngredient(r: Record<string, unknown>): IngredientRow {
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

export function toHistory(r: Record<string, unknown>): HistoryRow {
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
    db.exec('PRAGMA foreign_keys=ON');
    let existed = false;
    try {
      const row = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recipes'") as unknown as { get: () => unknown }).get();
      existed = !!row;
    } catch { existed = false; }
    for (const ddl of CHEF_TABLE_DDL) db.exec(ddl);
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

// #854（承接 #819 G1）：菜名相等唯一口径——写前去首尾空格后精确相等、大小写敏感，
// 与未来唯一索引的二进制语义一致；新增与改名两处写路径引用它，不各写一份。
function canonicalRecipeName(name: unknown): string {
  return typeof name === 'string' ? name.trim() : '';
}

export function mustRecipe(h: ChefDb, idOrName: string): RecipeRow {
  // id 优先：按 id 精确命中一行即返回（id 唯一，不会撞）。
  const byId = qGet<Record<string, unknown>>(h, 'SELECT * FROM recipes WHERE id = ?', [idOrName]);
  if (byId) return toRecipe(byId);
  // 按名：去首尾空格后精确相等、大小写敏感；多行即遗留重名，报错不任取第一行。
  const name = canonicalRecipeName(idOrName);
  if (!name) throw new ChefFetchError('CHEF_RECIPE_NOT_FOUND', '无此菜谱：' + idOrName);
  const rows = qAll<Record<string, unknown>>(h, 'SELECT * FROM recipes WHERE name = ?', [name]);
  if (rows.length === 0) throw new ChefFetchError('CHEF_RECIPE_NOT_FOUND', '无此菜谱：' + idOrName);
  if (rows.length > 1) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '菜名撞名（库内多行同名，须先清重）：“' + name + '”共' + rows.length + '行');
  return toRecipe(rows[0]);
}

export function addRecipe(h: ChefDb, input: Record<string, unknown>): RecipeRow {
  const name = canonicalRecipeName((input as Record<string, unknown>)?.name);
  if (!name) throw new ChefFetchError('CHEF_BAD_QUERY', '加菜须给菜名 name');
  const dup = qGet<{ c: number }>(h, 'SELECT COUNT(*) AS c FROM recipes WHERE name = ?', [name]);
  if (dup && Number(dup.c) > 0) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '菜名已存在：“' + name + '”');
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
  // 818 定案（甲）：老库 quantity REAL NOT NULL，本次不改 schema，缺值不插 NULL，直接拦下让 AI 问用户补齐。
  if (qtyNum === null || Number.isNaN(qtyNum)) throw new ChefFetchError('CHEF_BAD_QUERY', '食材须给数字用量 quantity（老库 NOT NULL；适量请同时给估计数＋quantity_text）');
  const qty = qtyNum;
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
  // 818 定案（甲）：老库 duration_minutes INTEGER NOT NULL，本次不改 schema，缺值不插 NULL，直接拦下让 AI 问用户补齐。
  if (durNum === null || Number.isNaN(durNum)) throw new ChefFetchError('CHEF_BAD_QUERY', '步骤须给数字时长 duration_minutes（老库 NOT NULL；缺时长请问用户补齐）');
  const dur = durNum;
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

// `searchRecipes`／`filterRecipes` 已搬入 `src/search/run.ts`（本域独占；旧址由 `src/fetch/index.ts` 转出，不断链）。

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
  // #854（承接 #819 G1）：改名撞名即拦，引用同一口径；存去空格后的名字，与新增路径一致。
  if ((patch as Record<string, unknown>).name !== undefined) {
    const newName = canonicalRecipeName((patch as Record<string, unknown>).name);
    if (!newName) throw new ChefFetchError('CHEF_BAD_QUERY', '改名须给非空菜名 name');
    if (newName !== canonicalRecipeName(r.name)) {
      const hit = qGet<Record<string, unknown>>(h, 'SELECT id FROM recipes WHERE name = ?', [newName]);
      if (hit && String(hit.id) !== r.id) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '菜名已存在：“' + newName + '”');
    }
    (patch as Record<string, unknown>).name = newName;
  }
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

// `filterRecipes` 已搬入 `src/search/run.ts`（本域独占，见上）；`recordHistory` 已搬入 `src/history/run-record.ts`（本域独占；旧址由 `src/fetch/index.ts` 转出，不断链）。

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

// `buildShoppingList` 已搬入 `src/shopping/run.ts`、`healthCheck` 已搬入 `src/data/run-query.ts`
//（各本域独占；旧址由 `src/fetch/index.ts` 转出，不断链）。本文件到此结束。
