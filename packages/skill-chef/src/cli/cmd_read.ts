#!/usr/bin/env node
// 私家大厨唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。写走 receipt（直通即真相）。
// 取数（#839 起按域落位，以各域签名为准）：开闭库与多域查询住 `fetch/db.ts`；
// 单域独占的取数住各域 run（search／history／shopping／data 内；旧址由 `fetch/index.ts` 转出）。
// 口径：policy WriteOp（add/update/deprecate）+ RecipeOp（add/update/discard/add-ingredient/add-step，CLI 兼容 discard=deprecate）；queryHistory 无参返全量；buildShoppingList 合并行含 optional/category 标记（住 shopping）。
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ChefFetchError, ChefPolicyError,
  openChefDb, closeChefDb,
} from '../fetch/index.js';
import { resolveDbPath, resolveDbDir, dbFilename } from '../fetch/paths.js';
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
import type { ChefDb } from '../fetch/db.js';
import { fail, note } from '../shared/slots.js';
import {
  chefShapeFor, buildChefEnvelope, renderEnvelopeHtml, assertHtmlSize,
  buildHelpItems,
  fillTemplate, loadTemplate, templateFor,
  ChefRenderError,
} from '../render/index.js';
import {
  buildHelpLookup, buildChefHelpDelivery, buildChefLookupLanding, deliverChefHelp,
} from '../help/index.js';
import type { ChefHtmlDelivery, HtmlLanding } from '../help/index.js';
import { helpReuseWindowOf } from 'base-paint/save-html';
// #839 · 各域处理经能力门进入（入口走公开接口，不直引域内部件）。
import { runRecipeView } from '../view/index.js';
import { runRecipeSearch } from '../search/index.js';
import { runRecipeWriteAdd } from '../add/index.js';
import { runRecipeWriteUpdate } from '../update/index.js';
import { runCookingRun } from '../cook/index.js';
import { runShoppingQuery } from '../shopping/index.js';
import { runHistoryRecord, runHistoryQuery } from '../history/index.js';
import { runDataQuery } from '../data/index.js';

const DEFAULT_TIMEOUT_MS = 30000;

function toast(msg: string): void { console.error('TOAST: ' + msg); }

function preflight(): void {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
}

// 槽位与参数原语（todayStr／needServings／resolveNameOrId／resolveRecipeId／pickStr／pickNum）
// 已搬入 `src/shared/slots.ts`（多域共用，旧址由本入口引用，不再本地定义）。

// 写 op 超集解析：add/update/discard/deprecate/add-ingredient/add-step（policy WriteOp 仅前三名，discard 与 deprecate 同义）。
function parseWriteOpCompat(params: Record<string, unknown>): string {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'discard' || op === 'deprecate' || op === 'add-ingredient' || op === 'add-step') return op;
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/discard/add-ingredient/add-step）：' + JSON.stringify(op));
}

/* ── #215 · 「私家大厨help」的交付装配（**在开库之前**走）────────────────────────────────
 *
 * 缺省（不给 `q`／`mode`）＝ 老实物同款 HELP 文件：`<库目录>/cook_html/help/
 * 私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`（两段目录名与主体名都从配置文件取，默认逐字等于老常量，
 * 见 `src/help/manifest.ts` 与 `src/config.ts`），独占落盘 ＋ 绝对路径回执（`delivery` 顶层追加）。
 * 显式 `mode:"lookup"` ＝ 全量速查表文件（主体 `私家大厨_速查表`，与 HELP 分名——照 #139 判法：
 * 一个键两种产物就分成两个名字，别让用户按一个名字打开到另一个东西），页面由信封走 `templates/help.html`。
 * 显式 `q` ＝ 现找：只回命中（stdout），`--html` 给了才落盘（检索式问答不刷目录）。
 * 显式 `reuseHours`（小时）＝ 复用窗口：`0`＝每次都落新的（要一份最新的）；不给＝**一天**（#245）——
 * 24 小时内反复读同一份 HELP 产物**只留一份、不再新建**（判据＝落盘名里的时间戳，不看 mtime；
 * 超龄那份不算命中 ⇒ 与未命中同路落一份新的，旧的留着当留档）。`--html` 那支不吃复用（说哪落哪）。
 * 落点只出**意图**（目录 ＋ 文件名主体）：时间戳与同秒递补由共用件 `saveHtmlFile` 钉死（裁决 8）。
 * 全程**不开库、本件自己也不建库目录**：库路径走 `resolveDbDir()`（**不 mkdir**）＋ 文件名拼——`resolveDbPath()`
 * 会 `mkdirSync`（`src/fetch/paths.ts:21`）。落点目录由落盘件按需递归建出（要落文件就必然建它），
 * 但要落的是 `<库目录>/cook_html/help/`，**不是** `chef_data.db`。
 */
interface HelpDeliver { readonly html?: string; readonly target: HtmlLanding; readonly reuseMs?: number; }
interface HelpDispatch { readonly data: unknown; readonly deliver?: HelpDeliver; }

/** HELP 产物吃的复用窗口（毫秒）：缺省**一天**、`reuseHours` 可改（`0`＝每次都落新的）。
 *  换算与坏参判定都在共用件（`helpReuseWindowOf` 把坏参 `RangeError` 交给这里给的处理器）⇒ 归到出口的
 *  「参数错」那一档（exit 2），与其余四家同档：坏参绝不静默当 0。 */
const helpWindowOrFail = helpReuseWindowOf((m) => fail(2, m));

function dispatchHelp(params: Record<string, unknown>): HelpDispatch {
  const dbPath = join(resolve(resolveDbDir()), dbFilename());
  const mode = params.mode === undefined ? undefined : String(params.mode);
  const q = params.q === undefined ? undefined : String(params.q);
  if (mode !== undefined && q !== undefined) fail(2, '参数 q 与 mode 互斥：q＝现找，mode＝速查表产物');
  if (mode !== undefined && mode !== 'lookup') fail(2, 'mode 非法（' + String(mode) + '）：本键只认 lookup');
  const reuseMs = helpWindowOrFail(params);
  if (q !== undefined) return { data: { ...buildHelpItems(buildHelpLookup(), q), mode: 'lookup', query: q } };
  if (mode === 'lookup') {
    return {
      data: { ...buildHelpItems(buildHelpLookup(), undefined), mode: 'lookup' },
      deliver: { target: buildChefLookupLanding(dbPath), reuseMs },
    };
  }
  const { html, target, index } = buildChefHelpDelivery(dbPath, new Date());
  return {
    data: { ...index, mode: 'file', bytes: Buffer.byteLength(html, 'utf8') },
    deliver: { html, target, reuseMs },
  };
}

// 八键分发：各域处理经能力门进入（薄注册表）；op／kind 的域内切分由注册表做，判定原文逐字保留。
function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const handle: ChefDb = openChefDb(dbPath);
  try {
    if (handle.initialized) note('大厨 DB 已初始化：' + dbPath);
    switch (key) {
      case 'chef.recipe.view': {
        return runRecipeView(handle, params);
      }
      case 'chef.recipe.search': {
        return runRecipeSearch(handle, params);
      }
      case 'chef.recipe.write': {
        // op 路由：add 系归录入域、update 系归修改域（集合与 `parseWriteOpCompat` 逐字对应，非法 op 上已拦）。
        const op = parseWriteOpCompat(params);
        if (op === 'add' || op === 'add-ingredient' || op === 'add-step') return runRecipeWriteAdd(handle, params, op);
        return runRecipeWriteUpdate(handle, params, op);
      }
      case 'chef.cooking.run': {
        return runCookingRun(handle, params);
      }
      case 'chef.shopping.query': {
        return runShoppingQuery(handle, params);
      }
      case 'chef.history.record': {
        return runHistoryRecord(handle, params);
      }
      case 'chef.history.query': {
        // kind 路由：timeline/stats 归历史域、quality/backup 归数据管理域（默认规则与非法报文与原文逐字对应）。
        const rawKind = params.kind;
        const kind = typeof rawKind === 'string' && rawKind ? rawKind : (params.name !== undefined ? 'timeline' : 'stats');
        if (kind === 'timeline' || kind === 'stats') return runHistoryQuery(handle, params, kind);
        if (kind === 'quality' || kind === 'backup') return runDataQuery(handle, params, kind);
        fail(2, 'history.query 只接受 kind=timeline/stats/quality/backup');
        return null;
      }
      case 'chef.help.lookup':
        // #215：本键由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
        fail(1, '内部错误：chef.help.lookup 须走 dispatchHelp（开库之前）');
        return null;
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
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params) as Record<string, unknown>; } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  // #695：三个配置 key（`chef.config.read/write/reset`）在库目录预检与形状表之前拦下——
  // 读写配置不该要求库已配，它们也不进 `CHEF_KEY_SHAPES`（不是唤醒词命令，见 `src/cli/config.ts`）。
  if (isConfigKey(o.key)) {
    process.stdout.write(runConfigKey(o.key, params) + '\n');
    return;
  }
  // #706 · 配置体检（`chef.config.check`）：同样是设置页专用的只读命令，同样在预检之前拦下——
  // 它要报的正是「库在哪、通不通」，不能先要求库目录已配。只读：不建目录、不写文件、不落默认配置。
  if (isHealthCheckKey(o.key)) {
    process.stdout.write(runHealthCheckKey(o.key) + '\n');
    return;
  }
  preflight();
  let shape = null;
  try { shape = chefShapeFor(o.key as string); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env = null;
  let delivery: ChefHtmlDelivery | undefined;
  try {
    // #215：HELP 在开库之前分派（只读页不建库）；其余七键照旧走 dispatch（内部开库）。
    const help = o.key === 'chef.help.lookup' ? dispatchHelp(params) : null;
    env = buildChefEnvelope(o.key as string, help ? help.data : dispatch(o.key as string, params));
    if (help?.deliver !== undefined) {
      // 本键的产物：缺省＝HELP 全页（自带 html）；`mode:"lookup"`＝速查表页（由信封走本技能模板渲染）。
      const html = help.deliver.html ?? fillTemplate(loadTemplate(templateFor(o.key as string)), renderEnvelopeHtml(env));
      assertHtmlSize(html);
      delivery = deliverChefHelp({
        explicit: o.html,
        target: help.deliver.target,
        html,
        ...(help.deliver.reuseMs === undefined ? {} : { reuseMs: help.deliver.reuseMs }),
      });
    } else if (o.html) {
      const html = renderEnvelopeHtml(env);
      assertHtmlSize(html);
      try { writeFileSync(o.html, html, 'utf8'); }
      catch (e) { fail(5, 'HTML 写盘失败：' + o.html); }
    }
  } catch (e) {
    if (e instanceof ChefFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof ChefPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof ChefRenderError) fail(5, '渲染失败：' + e.message);
    // 落盘失败：共用件 `saveHtmlFile` 的 code（`EEXIST`／`EINVAL`／`EIO`）原样穿过，落到 exit 5。
    if (/^E[A-Z]+$/.test(String((e as NodeJS.ErrnoException)?.code))) fail(5, '落盘失败：' + ((e as Error).message || String(e)));
    // 配置件（`base-link-core`）的报错本身就是人话（带行号与文件名）：归「预检」那一档原样交回。
    if (/(配置文件|配置项|测试缺隔离)/.test((e as Error).message ?? '')) fail(1, (e as Error).message);
    // #215：help 支一步取数都没有（只渲染 ＋ 落盘），未知错只可能出在渲染（共享模板抛的普通 Error
    // 没有 code）或落盘 ⇒ 归 exit 5，不落到「未知失败 4」。其余七键保持原样（取数面宽，无法这样归类）。
    if (o.key === 'chef.help.lookup') fail(5, '渲染/落盘失败：' + ((e as Error).message || String(e)));
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  // #83 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
}

await main();
