#!/usr/bin/env node
// 私家大厨唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。写走 receipt（直通即真相）。
// 取数（fetch/db.ts 已落盘，以其签名为准）：openChefDb/closeChefDb/listRecipes/filterRecipes/searchRecipes/getRecipeDetail/addRecipe/updateRecipe/addIngredient(h,recipeId,input)/addStep(h,recipeId,input)/deprecateRecipe/recordHistory/queryHistory(h,recipeId?)/historyStats/buildShoppingList/healthCheck。
// 口径：policy WriteOp（add/update/deprecate）+ RecipeOp（add/update/discard/add-ingredient/add-step，CLI 兼容 discard=deprecate）；queryHistory 无参返全量；buildShoppingList 合并行含 optional/category 标记。
import { writeFileSync } from 'node:fs';
import {
  ChefFetchError, ChefPolicyError,
  openChefDb, closeChefDb,
  listRecipes, filterRecipes, searchRecipes, getRecipeDetail,
  addRecipe, updateRecipe, deprecateRecipe,
  addIngredient, addStep,
  recordHistory, queryHistory, historyStats,
  buildShoppingList, healthCheck,
} from '../fetch/index.js';
import { resolveDbPath } from '../fetch/paths.js';
import type { RecipeRow, ChefDb } from '../fetch/db.js';
import { needName, needNames, validateCategory, validateRating } from '../policy/index.js';
import {
  chefShapeFor, buildChefEnvelope, renderEnvelopeHtml, assertHtmlSize,
  toRecipeItem, recipeDetail, buildRecipeSearch, buildRecipeReceipt,
  buildCookingRun, buildShopping, buildHistoryRecord, buildHistoryQuery,
  toHistoryItem, buildHelpItems,
  ChefRenderError,
} from '../render/index.js';
import type { CookingStep } from '../render/index.js';
import { buildHelpLookup } from '../help/index.js';

const DEFAULT_TIMEOUT_MS = 30000;

// #43 F2 一期限制：FILTER 维度只读（recipe.search 透传过滤），recipe.write 一期只写主表，维度表落库走二期。
const FILTER_KEYS = ['cuisine', 'season', 'method', 'flavor', 'tag', 'meal', 'cookware', 'difficulty', 'status', 'maxTime', 'filter'] as const;

function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function toast(msg: string): void { console.error('TOAST: ' + msg); }
function note(msg: string): void { console.error('NOTE: ' + msg); }

function preflight(): string {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p as string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function needServings(params: Record<string, unknown>): number | undefined {
  if (params.servings === undefined) return undefined;
  const n = typeof params.servings === 'string' ? Number((params.servings as string).trim()) : params.servings;
  if (!Number.isInteger(n) || (n as number) <= 0) fail(2, 'servings 须为正整数');
  return n as number;
}

// 查看定位：nameOrId（任务口径）兼容 name/id（policy needNameOrId 口径）；缺失走取数错 exit4（任务要求缺失抛4）。
function resolveNameOrId(params: Record<string, unknown>): string {
  const cands = [params.nameOrId, params.name, params.id];
  for (const c of cands) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (typeof c === 'number' && Number.isFinite(c)) return String(c);
  }
  throw new ChefFetchError('CHEF_BAD_QUERY', '须给 nameOrId（菜名或 id，缺失阻断）');
}

// 写 op 超集解析：add/update/discard/deprecate/add-ingredient/add-step（policy WriteOp 仅前三名，discard 与 deprecate 同义）。
function parseWriteOpCompat(params: Record<string, unknown>): string {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'discard' || op === 'deprecate' || op === 'add-ingredient' || op === 'add-step') return op;
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/discard/add-ingredient/add-step）：' + JSON.stringify(op));
}

// recipe_id 定位：recipe_id 直给，或 recipe_name 解析；缺失阻断。
function resolveRecipeId(handle: ChefDb, params: Record<string, unknown>): string {
  const rid = params.recipe_id;
  if (typeof rid === 'string' && rid.trim()) return rid.trim();
  const rn = params.recipe_name;
  if (typeof rn === 'string' && rn.trim()) return getRecipeDetail(handle, rn.trim()).recipe.id;
  throw new ChefPolicyError('POLICY_MISSING_SLOT', '须给 recipe_id（或 recipe_name 解析）');
}

function pickStr(params: Record<string, unknown>, key: string): string | undefined {
  const v = params[key];
  return typeof v === 'string' ? v : undefined;
}

function pickNum(params: Record<string, unknown>, key: string): number | undefined {
  const v = params[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.trim()))) return Number(v.trim());
  return undefined;
}

// 八键分发：读走 fetch 读，写走 fetch 写+口径校验；未知键上游已拦，此处再拦一道。
function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const handle: ChefDb = openChefDb(dbPath);
  try {
    if (handle.initialized) note('大厨 DB 已初始化：' + dbPath);
    switch (key) {
      case 'chef.recipe.view': {
        return recipeDetail(getRecipeDetail(handle, resolveNameOrId(params)));
      }
      case 'chef.recipe.search': {
        const q = params.q;
        let rows: RecipeRow[];
        let kind: string;
        if (typeof q === 'string' && q.trim()) {
          rows = searchRecipes(handle, q.trim());
          kind = 'search:' + q.trim();
        } else if (params.kind === 'all') {
          rows = listRecipes(handle);
          kind = 'all';
        } else {
          const present = FILTER_KEYS.filter((k) => params[k] !== undefined && params[k] !== '');
          if (!present.length) fail(2, 'search 须给 q、kind=all，或过滤条件（cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter）');
          const f: Record<string, unknown> = {};
          for (const k of ['cuisine', 'season', 'method', 'flavor', 'tag', 'meal', 'cookware', 'difficulty', 'status', 'maxTime'] as const) {
            const v = params[k];
            if (v !== undefined && v !== '') f[k] = typeof v === 'string' ? v.trim() : v;
          }
          // 别名：filter=通用筛选（川菜类示例按菜系走，与 HELP 示例对齐）；time_max/time=最大用时别名。
          if (f.cuisine === undefined && typeof params.filter === 'string' && params.filter.trim()) f.cuisine = params.filter.trim();
          if (f.maxTime === undefined && params.time_max !== undefined && params.time_max !== '') f.maxTime = params.time_max;
          if (f.maxTime === undefined && params.time !== undefined && params.time !== '') f.maxTime = params.time;
          if (!Object.keys(f).length) fail(2, 'search 过滤条件为空（须给 cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter 之一）');
          rows = filterRecipes(handle, f);
          kind = 'filter:' + Object.keys(f).sort().join(',');
        }
        if (!rows.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '搜菜无结果（缺失阻断，不返空冒充）');
        return buildRecipeSearch(kind, rows.map(toRecipeItem));
      }
      case 'chef.recipe.write': {
        const op = parseWriteOpCompat(params);
        if (op === 'add') {
          const name = needName(params);
          const input: { name: string; difficulty?: string; status?: string; servings?: number; total_time_minutes?: number; description?: string; photo_url?: string; source?: string; source_url?: string } = { name };
          for (const k of ['difficulty', 'status', 'description', 'photo_url', 'source', 'source_url'] as const) {
            const s = pickStr(params, k);
            if (s !== undefined) (input as Record<string, unknown>)[k] = s;
          }
          for (const k of ['servings', 'total_time_minutes'] as const) {
            const n = pickNum(params, k);
            if (n !== undefined) (input as Record<string, unknown>)[k] = n;
          }
          const r = addRecipe(handle, input);
          // 兼容测试内嵌写法：params.ingredients/params.steps 数组随菜同存（与 add-ingredient/add-step 同语义，category 走 validateCategory 归一）。
          if (Array.isArray(params.ingredients)) {
            for (const g of params.ingredients as Record<string, unknown>[]) {
              if (g && typeof g === 'object') {
                const gg = { ...(g as Record<string, unknown>) };
                if (typeof gg.category === 'string' && gg.category.trim()) gg.category = validateCategory(gg.category);
                addIngredient(handle, r.id, gg as never);
              }
            }
          }
          if (Array.isArray(params.steps)) {
            for (const s of params.steps as Record<string, unknown>[]) {
              if (s && typeof s === 'object') addStep(handle, r.id, s as never);
            }
          }
          return buildRecipeReceipt('已新增菜谱：' + r.name + '（id=' + r.id + '）');
        }
        if (op === 'update') {
          const hasId = typeof params.id === 'string' && (params.id as string).trim() ? true : false;
          const rid = hasId
            ? (params.id as string).trim()
            : getRecipeDetail(handle, resolveNameOrId(params)).recipe.id;
          const patch: Record<string, unknown> = {};
          // name 为标识符时不计入补丁（仅 id 定位时 name 视为改名）；其余直给字段即补丁。
          for (const k of ['description', 'difficulty', 'servings', 'total_time_minutes', 'status', 'photo_url', 'source', 'source_url'] as const) {
            if (params[k] !== undefined) patch[k] = params[k];
          }
          if (hasId && typeof params.name === 'string' && (params.name as string).trim()) patch.name = (params.name as string).trim();
          if (patch.total_time_minutes === undefined && params.total_time !== undefined) patch.total_time_minutes = params.total_time;
          if (params.patch !== undefined && typeof params.patch === 'object' && params.patch !== null && !Array.isArray(params.patch)) {
            for (const [k, v] of Object.entries(params.patch as Record<string, unknown>)) {
              if (k === 'total_time' && patch.total_time_minutes === undefined) patch.total_time_minutes = v;
              else if (['name', 'description', 'difficulty', 'servings', 'total_time_minutes', 'status', 'photo_url', 'source', 'source_url'].includes(k)) patch[k] = v;
            }
          }
          if (!Object.keys(patch).length) fail(2, 'update 至少改一个字段（name/description/difficulty/servings/total_time_minutes/status/photo_url/source/source_url/patch）');
          const r = updateRecipe(handle, rid, patch);
          return buildRecipeReceipt('已更新菜谱：' + r.name + '（id=' + r.id + '）');
        }
        if (op === 'discard' || op === 'deprecate') {
          const id = params.id;
          const rid = typeof id === 'string' && id.trim() ? id.trim() : getRecipeDetail(handle, resolveNameOrId(params)).recipe.id;
          const r = deprecateRecipe(handle, rid);
          return buildRecipeReceipt('已废弃菜谱：' + r.name + '（id=' + r.id + '，只增不删）');
        }
        if (op === 'add-ingredient') {
          const recipeId = resolveRecipeId(handle, params);
          const name = needName(params);
          const input: { name: string; category?: string; quantity?: number | null; unit?: string; quantity_text?: string; is_optional?: number | boolean; substitute?: string } = { name };
          const cat = pickStr(params, 'category');
          if (cat !== undefined) input.category = validateCategory(cat);
          if (params.quantity !== undefined) {
            const n = pickNum(params, 'quantity');
            input.quantity = n === undefined ? null : n;
          }
          for (const k of ['unit', 'quantity_text', 'substitute'] as const) {
            const s = pickStr(params, k);
            if (s !== undefined) (input as Record<string, unknown>)[k] = s;
          }
          if (params.is_optional !== undefined) input.is_optional = params.is_optional === true || params.is_optional === 1 ? 1 : 0;
          const g = addIngredient(handle, recipeId, input);
          return buildRecipeReceipt('已加食材：' + g.name + '（菜 id=' + recipeId + '）');
        }
        if (op === 'add-step') {
          const recipeId = resolveRecipeId(handle, params);
          const action = params.action;
          if (typeof action !== 'string' || !action.trim()) throw new ChefPolicyError('POLICY_MISSING_SLOT', 'add-step 须给 action（做法）');
          const input: { action: string; heat_level?: string; duration_minutes?: number | null; temperature?: string; expected_result?: string } = { action: action.trim() };
          for (const k of ['heat_level', 'temperature', 'expected_result'] as const) {
            const s = pickStr(params, k);
            if (s !== undefined) (input as Record<string, unknown>)[k] = s;
          }
          if (params.duration_minutes !== undefined) {
            const n = pickNum(params, 'duration_minutes');
            input.duration_minutes = n === undefined ? null : n;
          }
          const s = addStep(handle, recipeId, input);
          return buildRecipeReceipt('已加步骤' + s.sequence + '：' + s.action);
        }
        fail(2, 'recipe.write 只接受 op=add/update/discard/add-ingredient/add-step');
        return null;
      }
      case 'chef.cooking.run': {
        const servings = needServings(params);
        const detail = getRecipeDetail(handle, resolveNameOrId(params));
        const base = detail.recipe.servings > 0 ? detail.recipe.servings : 2;
        const factor = servings === undefined ? 1 : (servings as number) / base;
        const scaled = detail.ingredients.map((g) => ({
          name: g.name,
          quantity: g.quantity === null ? null : Math.round(g.quantity * factor * 100) / 100,
          unit: g.unit, quantity_text: g.quantity_text, optional: g.is_optional === 1,
        }));
        const steps: CookingStep[] = [...detail.steps]
          .sort((a, b) => a.sequence - b.sequence)
          .map((s) => ({
            sequence: s.sequence, action: s.action, duration_minutes: s.duration_minutes,
            heat_level: s.heat_level, temperature: s.temperature, expected_result: s.expected_result,
            ingredients: scaled,
          }));
        const history = historyStats(handle, detail.recipe.id);
        return buildCookingRun({ recipe: toRecipeItem(detail.recipe), steps, servings, history });
      }
      case 'chef.shopping.query': {
        const names = needNames(params);
        const servings = needServings(params);
        const excludeOptional = params.excludeOptional === true;
        let items = buildShoppingList(handle, names);
        if (!items.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '采购清单为空（缺失阻断）');
        // fetch 合并行自带 optional 标记（db.ts buildShoppingList）：excludeOptional 在此过滤。
        if (excludeOptional) items = items.filter((x) => !x.optional);
        // 库存核对不直调居家管家：只给清单，核对请复制 prompt 走居家管家技能。
        note('库存核对请复制 prompt 走「居家管家」技能，不直调');
        return buildShopping({ items, recipes: names, servings, excludeOptional });
      }
      case 'chef.history.record': {
        const name = needName(params);
        const detail = getRecipeDetail(handle, name);
        let rating: number | null = null;
        if (params.rating !== undefined) {
          const raw = typeof params.rating === 'string' && (params.rating as string).trim() !== '' ? Number((params.rating as string).trim()) : params.rating;
          rating = validateRating(raw);
        }
        const feedback = params.feedback === undefined ? '' : String(params.feedback);
        const cookDate = params.date === undefined || params.date === '' ? todayStr() : String(params.date);
        const h = recordHistory(handle, { recipe_id: detail.recipe.id, rating, feedback, cook_date: cookDate });
        return buildHistoryRecord('已记录做菜：' + detail.recipe.name + '（' + h.cook_date + (rating !== null ? '，评分 ' + rating : '') + '）');
      }
      case 'chef.history.query': {
        const rawKind = params.kind;
        const kind = typeof rawKind === 'string' && rawKind ? rawKind : (params.name !== undefined ? 'timeline' : 'stats');
        if (kind === 'timeline') {
          const name = needName(params);
          const detail = getRecipeDetail(handle, name);
          const rows = queryHistory(handle, detail.recipe.id);
          return buildHistoryQuery('timeline:' + detail.recipe.name, rows.map((h) => toHistoryItem(h, detail.recipe.name)));
        }
        if (kind === 'stats') {
          const name = params.name;
          if (typeof name === 'string' && name.trim()) {
            const detail = getRecipeDetail(handle, name.trim());
            const st = historyStats(handle, detail.recipe.id);
            return buildHistoryQuery('stats:' + detail.recipe.name, [{ name: detail.recipe.name, count: st.count, avgRating: st.avgRating }]);
          }
          const recipes = listRecipes(handle);
          const items = recipes.map((r) => {
            const st = historyStats(handle, r.id);
            return { id: r.id, name: r.name, count: st.count, avgRating: st.avgRating };
          });
          return buildHistoryQuery('stats:all', items);
        }
        if (kind === 'quality') {
          const recipes = listRecipes(handle);
          const items = recipes.map((r) => {
            const rows = queryHistory(handle, r.id);
            let total = 0; let rated = 0; let low = 0;
            for (const h of rows) {
              if (h.rating !== null && h.rating !== undefined) {
                total += h.rating; rated += 1;
                if (h.rating < 3) low += 1;
              }
            }
            const avg = rated ? Math.round((total / rated) * 10) / 10 : null;
            return {
              recipe_id: r.id, name: r.name, count: rows.length, avgRating: avg, lowCount: low,
              note: rated === 0 ? '暂无评分' : (avg as number) < 3 ? '口碑偏低，建议改良' : '口碑稳定',
            };
          });
          return buildHistoryQuery('quality', items);
        }
        if (kind === 'backup') {
          // fetch 无 exportAll：healthCheck 体检问题作条目统一 list；无异常则单条 ok。
          const issues = healthCheck(handle);
          const items = issues.length ? issues.map((i) => ({ level: i.level, message: i.message ?? '' })) : [{ level: 'ok', message: '库自检无异常' }];
          return buildHistoryQuery('backup', items);
        }
        fail(2, 'history.query 只接受 kind=timeline/stats/quality/backup');
        return null;
      }
      case 'chef.help.lookup': {
        const all = buildHelpLookup();
        const q = params.q === undefined ? undefined : String(params.q);
        return buildHelpItems(all, q);
      }
      default: fail(3, '未知 chef key：' + key); return null;
    }
  } finally {
    try { closeChefDb(handle); } catch { /* ignore */ }
  }
}

function parseArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  const o: { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } = { key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || o.timeout <= 0) fail(2, '--timeout 须为正数毫秒');
    }
    else fail(2, '未知参数：' + a[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.key) fail(2, '用法：chef-cmd-read <chef.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  const dbPath = preflight();
  void dbPath;
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params) as Record<string, unknown>; } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape = null;
  try { shape = chefShapeFor(o.key as string); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env = null;
  try {
    const data = dispatch(o.key as string, params);
    env = buildChefEnvelope(o.key as string, data);
    if (o.html) {
      const html = renderEnvelopeHtml(env);
      assertHtmlSize(html);
      try { writeFileSync(o.html, html, 'utf8'); }
      catch (e) { fail(5, 'HTML 写盘失败：' + o.html); }
    }
  } catch (e) {
    if (e instanceof ChefFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof ChefPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof ChefRenderError) fail(5, '渲染失败：' + e.message);
    if ((e as Error).message?.includes('SKILLS_DB_PATH')) fail(1, (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  process.stdout.write(JSON.stringify(env) + '\n');
}

await main();
