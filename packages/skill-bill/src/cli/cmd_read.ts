#!/usr/bin/env node
// 饼干记账唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。写走 receipt（直通即真相）。
import { existsSync } from 'node:fs';
import {
  BillFetchError, BillPolicyError,
  resolveDbPath, resolveGoalsPath, openBillDb, closeBillDb,
  fetchAll, listRange,
  loadGoals, saveGoals,
} from '../fetch/index.js';
// #689 结构搬迁第三批：`policy/` 与 `render/views.ts` 已拆散删除，下列名字按归属律各回自己的域／共用位
// （`../shared/` 三件、`../analysis/`、`../goal/`、`../help/`、`../write/`）——
// 外壳只认各域的门（一个命令族一处；随命令迁移收窄）。
// #691 起 `../account/` 的四个名字也从本文件消失：账户域两条命令搬进能力目录，
// 出口只查注册表（`runRegistered`）再调命令声明里的 `run`；本域的门只转出命令声明一件。
// #731 起开始使用域同理：`bill.setup.run` 的六种 op（含备份目录与 CSV 那两摊）搬进 `src/setup/`，
// 本文件不再 import `../fetch/paths.js` 的备份两件、也不再用 fs 的读／写／拷三件（`existsSync` 仍用于 HELP 判定）。
// #730 起目标域同理：两条命令（`bill.goal.write`／`query`）搬进 `src/goal/`，本文件不再 import `../goal/`——
// 一个域里读写两类命令同域时，域门也只转出命令声明一件（结论写在 `src/goal/index.ts` 的门注释里）。
import { monthRange, resolveRange } from '../shared/dateRange.js';
import {
  billShapeFor, buildBillEnvelope, renderEnvelopeHtml, assertHtmlSize,
  templateFor, loadTemplate, fillTemplate,
  buildHelpIndex, buildHelpFileData, renderHelpFileHtml,
  BillRenderError,
} from '../render/index.js';
// #726 产物目录名改读配置；#762 两个文件名主体回代码常量；#749 起算式整个住 `../fetch/paths.js`。
import { HELP_FILE_STEM } from '../help/helpFile.js';
import { LOOKUP_FILE_STEM } from '../help/helpPaths.js';
import { resolveHtmlDir } from '../fetch/paths.js';
import { deliverHtml, type HtmlDelivery, type HtmlLanding } from '../output.js';
import { helpReuseWindowOf } from 'base-paint/save-html';
import { buildHelpLookup, buildHelpItems } from '../help/index.js';
import { REGISTRY } from './registry.js';
// #677 · 设置页的三个配置 key 由本文件在**预检与分派层之前**拦下（见下行 main 里那一处拦截与 cli/config.ts 的件头）。
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
import { buildRecordReceipt } from '../write/index.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import type { BillRow } from '../fetch/db.js';

const DEFAULT_TIMEOUT_MS = 30000;

function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function toast(msg: string): void { console.error('TOAST: ' + msg); }
function note(msg: string): void { console.error('NOTE: ' + msg); }

/** 预检只留 node 版本这一道门（#726）：库目录不再要求环境变量——落点由配置文件唯一决定，
 *  缺项一律按默认落点走，故「没配」不再是阻断项。测试隔离那道响亮失败住 `base-link-core`
 *  （跑在 `node --test` 里却要落到真实家目录即抛 `CONFIG_TEST_ISOLATION_MISSING`）。 */
function preflight(): void {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
}

/* 时间窗口（周／月／昨天）与日期归一不再是本文件的文件级函数：查询域搬迁（#411）时它们被
 * 查询的四条命令与分析的三个命令同时需要，按口径层的位置摆正；#689 第三批随 `policy/` 拆散落进
 * `src/shared/dateRange.ts`（`monthRange`／`weekRange`／`yesterdayStr` 等）——本文件引用的是新家。 */

/* ── #144 · 「饼干记账help」的交付装配（**在开库之前**走） ────────────────────────────────
 *
 * 缺省（不给任何参数）＝ 老实物同款 HELP 文件：`<库目录>/<产物目录名>/<HELP 文件名主体>_<YYYYMMDD_HHMMSS>[_N].html`，
 * 独占落盘 ＋ 绝对路径回执（`delivery` 顶层追加）。#726 起三处取值（库目录／产物目录名／文件名主体）
 * 全部读配置文件里的 `db.dir`／`html.dir`／`html.helpStem`，默认逐字等于老常量。
 * 显式 `mode:"lookup"` ＝ 全量速查表文件（主体取 `html.quickRefStem`，与 HELP 分名——照 #139 判法：
 * 一条命令两种产物就分成两个名字，别让用户按一个名字打开到另一个东西）。
 * 显式 `q` ＝ 现找：只回命中（stdout），`--html <路径>` 给了才落盘（检索式问答不刷目录）。
 * 显式 `reuseHours`（小时）＝ 复用窗口：`0`＝每次都落新的（要一份最新的）；不给＝**一天**——
 * 24 小时内反复读同一份 HELP 产物**只留一份、不再新建**（#245）。判据在共用件里按**落盘名里的
 * 时间戳**算（不看 mtime），超龄那份不算命中 ⇒ 与未命中同路落一份新的（旧的留着当留档，不清）。
 * `--html` 那支不吃复用（用户逐字指定的落点＝说哪落哪）。
 * #237 起落点只出**意图**（目录 ＋ 文件名主体）：时间戳与同秒递补由共用件 `saveHtmlFile` 钉死。
 * 全程**不开库**：初始化状态用「DB 文件是否存在」判定（见 render/helpFile.ts 头注释的取舍），
 * 免得「看帮助」把记账库 `new DatabaseSync` 出来并跑 DDL 自愈。
 */
interface DeliverIntent { readonly html?: string; readonly target: HtmlLanding; readonly reuseMs?: number; }
interface HelpDispatch { readonly data: unknown; readonly deliver?: DeliverIntent; }

/** 吃复用窗口的 HELP 产物名（本技能自己的两个主体）。#245：判据**按落点名**而不是按 key——
 *  `bill.help.lookup` 这条命令下挂着两种产物（HELP 文件与速查表），两种都算「反复读的 HELP 产物」；
 *  而 `--html` 那支是用户逐字指定的落点（共用件的 `file` 口子），本来不吃复用。
 *  #762 起两个主体是代码常量（配置项 `html.helpStem`／`html.quickRefStem` 已退休），故本件直接引常量。 */
function helpReuseStems(): readonly string[] {
  return [HELP_FILE_STEM, LOOKUP_FILE_STEM];
}

/** 本次交付吃不吃复用窗口 ⇒ 给出窗口毫秒数（不吃 = `undefined`，交付退回「独占创建 ＋ 递补」老口径）。
 *
 *  窗口来自 `--params` 的 `reuseHours`（小时）：不给＝缺省一天（`HELP_REUSE_DEFAULT_HOURS`）、
 *  `0`＝每次都落新的、正数＝该窗口。换算与校验都在共用件，坏参抛 `RangeError` ⇒ 用共用件的
 *  `helpReuseWindowOf` 把它翻成出口的「参数错」那一档（exit 2）——五家技能同一档，坏参绝不静默当 0。 */
const windowOf = helpReuseWindowOf((m) => fail(2, m));

function windowForHelpDelivery(stem: string, params: Record<string, unknown>): number | undefined {
  if (!helpReuseStems().includes(stem)) return undefined;
  return windowOf(params);
}

/** 初始化状态：DB **文件存在**＝已初始化（照老 `render_help._is_initialized`）；
 *  判定本身异常 ⇒ `false`＝横幅照显（fail-open，理由见 render/helpFile.ts 头注释）。 */
function helpInitialized(): boolean {
  try { return existsSync(resolveDbPath()); } catch { return false; }
}

function dispatchHelp(params: Record<string, unknown>): HelpDispatch {
  const now = new Date();
  const mode = params.mode === undefined ? undefined : String(params.mode);
  const q = params.q === undefined ? undefined : String(params.q);
  if (mode !== undefined && q !== undefined) fail(2, '参数 q 与 mode 互斥：q＝现找，mode＝速查表产物');
  if (mode !== undefined && mode !== 'lookup') fail(2, 'mode 非法（' + String(mode) + '）：本命令只认 lookup');
  if (q !== undefined) {
    const hits = buildHelpItems(buildHelpLookup(), q);
    return { data: { ...hits, mode: 'lookup', query: q } };
  }
  if (mode === 'lookup') {
    const hits = buildHelpItems(buildHelpLookup(), undefined);
    const stem = LOOKUP_FILE_STEM;
    return {
      data: { ...hits, mode: 'lookup' },
      deliver: {
        target: { dir: resolveHtmlDir(), stem },
        reuseMs: windowForHelpDelivery(stem, params),
      },
    };
  }
  const html = renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }));
  const stem = HELP_FILE_STEM;
  return {
    data: { ...buildHelpIndex(), mode: 'file', bytes: Buffer.byteLength(html, 'utf8') },
    deliver: {
      html,
      target: { dir: resolveHtmlDir(), stem },
      reuseMs: windowForHelpDelivery(stem, params),
    },
  };
}

/** 迁移过的命令入口（写入域两条 ＋ 查询域四条 ＋ 账户域两条）：查注册表命中即走**命令声明里的 `run`**。
 *  开库／关库与老路同一套；**写库开关已退役（#726）**：`BILL_FORCE_PROD` 那个 opt-in 随 #675 删除，
 *  落点改由配置文件唯一决定（口径「照写」，替代护栏＝家目录注入＋真实家目录守卫）。
 *  这些命令的整页（采集页／回执页／查询列表页／账户表单与汇总页）住各自能力目录，
 *  故 `dispatch` 的 switch 里**不再有**它们的 case（一个命令恰住一处）。
 *  #691 起**不再按域写死入口**（改前是 `spec.kind === 'write' ? runRecordWrite : runQueryRead` 两条）：
 *  声明里本来就带着 `run`，第三个域进来时这一支一行不动——入口跟着声明走，域不需要在外壳上挂号。 */
function runRegistered(key: string, params: Record<string, unknown>): WriteOut | ViewOut {
  const spec = REGISTRY[key];
  if (spec === undefined) fail(3, '未知 bill 命令：' + key);
  const dbPath = resolveDbPath();
  const handle = openBillDb(dbPath);
  try {
    if (handle.initialized) note('记账 DB 已初始化：' + dbPath);
    return spec.run(params, handle);
  } finally {
    try { closeBillDb(handle); } catch { /* ignore */ }
  }
}

// 十六条命令分发：读走 fetch 读，写走 fetch 写+各域门的校验；未知命令名上游已拦，此处再拦一道。
function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const goalsPath = resolveGoalsPath();
  const handle = openBillDb(dbPath);
  try {
    if (handle.initialized) note('记账 DB 已初始化：' + dbPath);
    switch (key) {
      // #729：分析域三条读命令（`bill.analysis.overview`／`compare`／`trend`）已搬进 `src/analysis/`，
      // 出口只查注册表（`runRegistered`）再调命令声明里的 `run`——本分派层不再认这三条 key。
      case 'bill.link.submit': {
        const scene = params.scene === undefined ? 'purchase' : params.scene;
        if (scene !== 'purchase' && scene !== 'meal') fail(2, 'scene 非法（期望 purchase/meal）');
        const amount = params.amount;
        if (amount !== undefined) {
          const n = typeof amount === 'string' ? Number((amount as string).trim()) : amount;
          if (typeof n !== 'number' || !Number.isFinite(n) || n >= 0) fail(2, '联动金额须为负数支出');
        }
        if (scene === 'purchase') {
          const item = typeof params.item === 'string' ? params.item : '';
          return buildRecordReceipt(`已采单买东西${item ? '：' + item : ''}（主操作请先走 bill.record.add 记支出；同时录入居家管家请复制 prompt：请加载「居家管家」技能，帮我录入刚买的物品${item ? '：' + item : ''}）`);
        }
        const ate = typeof params.ate === 'string' ? params.ate : '';
        return buildRecordReceipt(`已采单吃饭${ate ? '：' + ate : ''}（主操作请先走 bill.record.add 记支出；同时记卡路里请复制 prompt：请加载「卡路里」技能，帮我记一餐${ate ? '：' + ate : ''}）`);
      }
      case 'bill.help.lookup':
        // #144：本命令由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
        fail(1, '内部错误：bill.help.lookup 须走 dispatchHelp（开库之前）');
        return null;
      default: fail(3, '未知 bill 命令：' + key); return null;
    }
  } finally {
    try { closeBillDb(handle); } catch { /* ignore */ }
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
  if (!o.key) fail(2, '用法：bill-cmd-read <bill.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  const key = o.key;
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params) as Record<string, unknown>; } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  // #677：设置页的三个配置 key 在**预检与分派层之前**拦下——读写配置不该要求库目录已配，
  // 也不进形状表、不进 HELP 与唤醒词计数。用上唯一出口那条规矩：stdout 一行 envelope。
  if (isConfigKey(key)) {
    process.stdout.write(runConfigKey(key, params) + '\n');
    return;
  }
  // #706 · 配置体检（`bill.config.check`）：同样是设置页专用的只读命令，同样在预检之前拦下——
  // 它要报的正是「库在哪、通不通」，不能先要求库目录已配。只读：不建目录、不写文件、不落默认配置。
  if (isHealthCheckKey(key)) {
    process.stdout.write(runHealthCheckKey(key) + '\n');
    return;
  }
  preflight();
  let shape = null;
  try { shape = billShapeFor(key); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env = null;
  let delivery: HtmlDelivery | undefined;
  try {
    // #144：HELP 在开库之前分派（只读页不建库）；迁移过的命令（写入域两条＋查询域四条）先查注册表走能力目录；
    // 其余照旧走 dispatch。
    const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;
    const abilityOut: WriteOut | ViewOut | null = help === null && REGISTRY[key] !== undefined ? runRegistered(key, params) : null;
    const built = buildBillEnvelope(key, abilityOut ? abilityOut.data : (help ? help.data : dispatch(key, params)));
    env = built;
    // B4 既有语义：`--html` 套模板输出完整收据页（section 片段经 CONTENT 注入模板，非片段直写）。
    // 迁移过的命令另有整页（采集页／回执页住 `src/write/`、查询列表页住 `src/query/`），不再套老模板。
    const sectionHtml = (): string => {
      if (abilityOut) return abilityOut.html;
      return fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(built));
    };
    // B1 复核整改：体积门对准**实际交付的那串**——交给 `deliverHtml` 的字符串先过 `gatedHtml()`，
    // 判的就是写下去的那一串（`delivery.bytes` 也照它算）。四条交付路都从这里过：迁移过的命令
    // （回执页／采集页／查询列表页整页，由能力目录出）、未迁移的命令（section 片段经 CONTENT 注入模板）、
    // HELP 缺省整页、HELP 速查表分节页。
    const gatedHtml = (html: string): string => { assertHtmlSize(html); return html; };
    if (help?.deliver !== undefined) {
      // 本命令的产物：缺省＝HELP 整页（共享 help 模板自带 html）；`mode:"lookup"`＝速查表分节页（由 envelope 渲染）。
      const html = gatedHtml(help.deliver.html ?? sectionHtml());
      delivery = deliverHtml({ explicit: o.html, target: help.deliver.target, html, reuseMs: help.deliver.reuseMs });
    } else if (o.html) {
      delivery = deliverHtml({ explicit: o.html, html: gatedHtml(sectionHtml()) });
    }
  } catch (e) {
    if (e instanceof BillFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof BillPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof BillRenderError) fail(5, '渲染失败：' + e.message);
    if ((e as NodeJS.ErrnoException)?.code && /^E[A-Z]+$/.test(String((e as NodeJS.ErrnoException).code))) {
      fail(5, '落盘失败：' + ((e as Error).message || String(e)));
    }
    // #726：配置面报错（测试缺隔离基座、配置文件读不出来）走「预检」那一档，与老线缺库目录同一档；
    // 按 `base-link-core` 的 `ConfigError.code`（`CONFIG_*`）认，不拿报文文本去猜。
    if (String((e as { code?: unknown }).code ?? '').startsWith('CONFIG_')) fail(1, (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  // #83 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
}

await main();
