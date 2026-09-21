#!/usr/bin/env node
// memo 唯一出口 cmd_read（M5 #35）：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Envelope } from 'base-link-core';
import { saveHtmlFile, helpReuseWindowOf, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';
// #855：复制区载荷的装配与信封取形（`buildDataText`／`buildLogText`／`MemoCopyEnvelope` 位）随 `memo.init`
// 一起搬进 `src/init/run.ts`——只有那条命令在用，不留第二份。
import { openMemoDb, closeMemoDb } from '../db/readonly.js';
import { LARK_WEBSITE_LINE } from '../sync/feishu.js';
// #855：参数校验口径（`crud*`／`normalize*`／`needId`）随备忘域命令一起搬进 `src/memo/run.ts`；
// 本件只剩开库前分派与交付装配，不再直接做域校验。
// #855：跨域的写侧合成（`reconcileWishes`）随 `memo.sync` 一起搬进 `src/sync/run.ts`；
// 本件只剩开库前分派与交付装配，不再直调域实现。
// #855：**命令登记查表**——各域自己的声明（`src/<域>/commands.ts`）由生成器汇成本表；命中即走该域的运行件。
import { REGISTRY } from './registry.js';
// #855：行适配已无人用本件这份（`toRows` 随 `memo.batch` 搬进 `src/memo/run.ts`，出口侧交付件不拼行）。
import { fail } from '../shared/exit.js';
import { memoShapeFor, buildMemoEnvelope, renderEnvelopeHtml, assertHtmlSize, fillMemoPage, MemoRenderError } from '../render/index.js';
import { buildMemoHelpFileData, renderMemoHelpHtml } from '../help/helpFile.js';
import { buildHelpSceneIndex } from '../help/sceneData.js';
import { buildHelpLookup } from '../help/index.js';
import { helpHtmlDirName, helpFileStem, lookupFileStem } from '../help/manifest.js';
// #855：产物名主体（`bookletFileStem`）与诊断读取／两页装配（`INIT_SCENE_ID`／`readInitDiagnosis`／
// `InitInputError`／`renderInitPage`／`InitPageMode`）随 `memo.sync`／`memo.init` 搬进各自的域——
// 本件只剩开库前分派与交付装配。
import { resolveDbDir, dbFilename, resolveDbPath } from '../shared/paths.js';
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
import { MemoFetchError, MemoPolicyError } from '../shared/errors.js';
import type { MemoDb } from '../db/readonly.js';

const DEFAULT_TIMEOUT_MS = 30000;

// #855：失败约定（`fail`）提到共用位 `src/shared/exit.ts`——出口与各域运行件同一档退出码。
function toast(msg: string): void { console.error('TOAST: ' + msg); }

function preflight(): void {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
}

function needStr(params: Record<string, unknown>, name: string): string {
  const v = params[name];
  if (typeof v !== 'string' || v.length === 0) fail(2, '缺参数 ' + name);
  return v;
}

// ── #229 · 「备忘录 help」的交付装配（**在开库之前**走，照 skill-bill/src/cli/cmd_read.ts:493-495） ────
//
// 缺省（不给任何参数）＝ 全量 HELP 文件：`<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`
// （扁平、不加 `help/` 层：裁决 1），独占落盘 ＋ **绝对路径**回执（`delivery` 顶层追加，序在既有五字段之后）。
// 显式 `mode:"lookup"` ＝ 速查表分名文件（主体 `备忘录_速查表`，裁决 2：一个键两种产物就分两个名字）。
// 显式 `q` ＝ 现找：只回命中（stdout），给 `--html <路径>` 才落盘（检索式问答不刷目录）。
// 显式 `reuseHours`（小时）＝ 复用窗口：`0`＝每次都落新的；不给＝**一天**（#245）——24 小时内反复读
// 同一份 HELP 产物只留一份、不再新建（判据＝落盘名里的时间戳，不看 mtime）。两种 HELP 产物都吃窗口。
// 全程**不开库**：初始化判据＝「**memo 库目录存在**」（票 6 V4：新库是目录 `<SKILLS_DB_PATH>/memo`，
// 不是老家的 `memo.db` 文件——本机实测 0 字节空壳 `memo.db` 在、真目录不在，老家口径当场判错），
// 且**只 stat、绝不建库**：免得「看帮助」把库目录 `mkdir` 出来。
//
// #240（欠债清偿）：命名与落盘**不再自持**——时间戳、同秒 `_N` 递补、独占创建、写后回读字节数全在
// 共用件 `saveHtmlFile`（`base-paint/save-html`，唯一定义地 `packages/base-render/src/output/saveHtml.ts`）。
// 本文件只出**落点意图**（`{dir, stem}`，主体与目录名取自 `../help/manifest.js` 的三个值），
// 原先包内那份第 4 份同逻辑实现 `src/help/memoOutput.ts` 已删（裁决 3 挂的债，见 `#240`）。
const HELP_MODE_FILE = 'file' as const;

/** 交付意图：`html` 有值＝本键自带整页 HTML（缺省那支）；无值＝由 envelope 渲染（照 bill）。
 *  `landing` 是**落点意图**——共用件自己的形状 `{dir, stem}`，本包不另立定义。
 *  `window`（#245）＝复用窗口毫秒数：给了就「窗口内已有同一主体的一份 ⇒ 返回它、不新建」。 */
interface MemoDeliverIntent { readonly html?: string; readonly landing: HtmlLanding; readonly window?: number; }
interface MemoHelpDispatch { readonly data: unknown; readonly deliver?: MemoDeliverIntent; }

/** HELP 支的复用窗口（毫秒）。#245：缺省**一天**（共用件 `HELP_REUSE_DEFAULT_HOURS`）——24 小时内反复读
 *  同一份 HELP 产物只留一份、不再新建；`--params` 的 `reuseHours` 可改（`0`＝每次都落新的）。
 *  换算与校验都在共用件，坏参抛 `RangeError` ⇒ 用 `helpReuseWindowOf` 翻成出口的「参数错」那一档
 *  （exit 2），与其余四家同档：坏参绝不静默当 0。 */
const helpReuseWindow = helpReuseWindowOf((m) => fail(2, m));

/** 缺省交付的落点意图：`<库目录>/<memo_html>/〈主体〉`（目录名取自 `../help/manifest.js` 的
 *  `helpHtmlDirName()`，主体是那两个回常量的 `helpFileStem()`／`lookupFileStem()`）。 */
function landingOf(dbPath: string, stem: string): HtmlLanding {
  return { dir: join(resolve(dbPath), helpHtmlDirName()), stem };
}

/** 交付一次 HELP 产物（本包**唯一落盘点**）：
 *  - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**（共用件 `file` ＋ `onExists:'overwrite'`：逐字落点、
 *    不带时间戳、不递补），与该参数的既有口径一致；**不吃复用窗口**（逐字落点＝说哪落哪）；
 *  - `landing`（本次产物按通式算出的落点意图）→ **独占创建 ＋ 同秒递补**（共用件缺省 `succession` ＋ `stem`）；
 *    带 `window`（#245）时改为**窗口内复用**（共用件 `{reuse:{byAge}}`）：已有那份不超龄就返回它、不新建；
 *  - 两者都给时 `explicit` 优先（用户指定胜过默认落点）。
 *  命名、独占、回执全在共用件里；本函数只表态「这次落哪个」。写不进去**不静默降级**：共用件的
 *  `code`（`EEXIST`／`EINVAL`／`EIO`／`ENOTDIR`…）原样穿过，由 main 归到 exit 5（目的地是「明确拿到文件」）。
 *
 *  ⚠️ **缺省支那句不许传 `onExists`**：共用件的缺省是 `'succession'`（通式名 ＋ 同秒 `_N` 递补）。
 *  一旦显式传成 `'overwrite'`，产物就退化成固定名 `备忘录_HELP.html`、同秒连跑互相覆盖——
 *  `#230` 的 ①③④ 会当场红（本票已用这一步做过变异自证）。 */
function deliverMemoHtml(input: {
  explicit?: string;
  landing?: HtmlLanding;
  html: string;
  window?: number;
}): HtmlReceipt {
  if (input.explicit !== undefined && input.explicit.length > 0) {
    const abs = resolve(input.explicit);
    return saveHtmlFile({ dir: dirname(abs), file: basename(abs), html: input.html, onExists: 'overwrite' });
  }
  if (input.landing === undefined) {
    throw new Error('[skill-memo-ilife] deliverMemoHtml 缺落点（`explicit` 与 `landing` 至少给一个）');
  }
  return saveHtmlFile({
    dir: input.landing.dir,
    stem: input.landing.stem,
    html: input.html,
    ...(input.window === undefined ? {} : { onExists: { reuse: { byAge: input.window } } }),
  });
}

/** 初始化状态：memo 老库文件存在＝已初始化（老 `_help_initialized`，新仓直连老库）。只 `stat`、
 *  不建文件；判定本身异常 ⇒ `false`＝横幅照显（fail-open：误显只多一条提示，误藏会让新用户找不到入口）。 */
function helpInitialized(dbPath: string): boolean {
  try { return existsSync(join(dbPath, dbFilename())); } catch { return false; }
}

/** 速查支的 `list` 载荷：一行一唤醒词（短语／key／形状／调用形／一句话），全从 `WAKE_TABLE` 派生。 */
function buildLookupItems() {
  return buildHelpLookup().map((h) => ({
    id: h.phrase,
    title: h.cli,
    category: h.key,
    shape: h.shape,
    desc: h.desc,
  }));
}

function dispatchHelp(params: Record<string, unknown>, dbPath: string): MemoHelpDispatch {
  const now = new Date();
  const mode = params.mode === undefined ? undefined : String(params.mode);
  const q = params.q === undefined ? undefined : String(params.q);
  const initialized = helpInitialized(dbPath);
  if (mode !== undefined && q !== undefined) fail(2, '参数 q 与 mode 互斥：q＝现找，mode＝速查表产物');
  if (mode !== undefined && mode !== 'lookup') fail(2, 'mode 非法（' + mode + '）：本键只认 lookup');
  // #245：两种 HELP 产物（缺省 HELP 文件／`mode:"lookup"` 速查表）都吃复用窗口——缺省一天内只留一份。
  // `q`（现找）那支不落盘，自然不吃；`--html` 逐字落点那支由 `deliverMemoHtml` 另走覆盖写。
  const window = helpReuseWindow(params);

  if (q !== undefined) {
    const items = buildLookupItems().filter((it) => q.includes(String(it.id)));
    return { data: { items, total: items.length, mode: 'lookup', query: q } };
  }
  if (mode === 'lookup') {
    const items = buildLookupItems();
    return {
      data: { items, total: items.length, mode: 'lookup' },
      deliver: { landing: landingOf(dbPath, lookupFileStem()), window },
    };
  }

  const data = buildMemoHelpFileData(now, { initialized });
  if (String(data.version) !== buildHelpSceneIndex().version) {
    fail(5, 'HELP 世代不一致：载荷 ' + data.version + ' ≠ 资产 ' + buildHelpSceneIndex().version);
  }
  const html = renderMemoHelpHtml(data);
  assertHtmlSize(html);
  // 索引载荷（`list` 形）：一行一域，计数全派生；`memo.help.lookup`＝HELP 文件的交付索引。
  return {
    data: { ...buildHelpSceneIndex(), mode: HELP_MODE_FILE },
    deliver: { html, landing: landingOf(dbPath, helpFileStem()), window },
  };
}

// 本件只做**出口**：参数解析 → 预检 → 开库（或开库前分派）→ envelope → 交付 → 退出码。
// 命令的声明（键／形状／标题／示例）与域逻辑一律不住这里——#855 已把 13 条命令连声明带运行件搬回各自能力目录，
// 逐条搬迁记录见 `docs/skills/skill-memo-ilife/t855-实施规格-与开工前读数.md`；本件不再认键，
// 由 `test/cmd-registry-855.test.mjs` 守着（往本件加 `case`、加键字面量即红）。
// 交付契约：#661 写命令回执照打（分字段是回执的本分，退出码在 main 里落实）；#665 向导与同步报告随 `deliver` 出整页。
interface PageDeliver { readonly html: string; readonly stem: string }
interface DispatchOut { readonly data: unknown; readonly exit: number; readonly deliver?: PageDeliver }
function ok(data: unknown): DispatchOut { return { data, exit: 0 }; }

function dispatch(key: string, params: Record<string, unknown>, db: MemoDb): DispatchOut {
  // #855：**分派只认登记表**——一条命令的声明住它自己的能力目录（`src/<域>/commands.ts`），
  // 生成物 `registry.ts` 把各域声明汇成这张查表，命中即调该域的运行件。
  // 加／改命令改的是自己域里的声明；**本件不再认键**（不留 `case`——`test/cmd-registry-855.test.mjs` 守着这点）。
  const spec = REGISTRY[key];
  if (spec !== undefined) return spec.kind === 'pre-open' ? spec.run(params) : spec.run(params, db);
  // 下面两条是**内部断言**（不是功能）：走到这里说明 `main` 的开库前分派被改坏了。
  // 照 skill-bill/src/cli/cmd_read.ts:449-451 的同一道断言——防的是「改回无条件开库」这个静默回退。
  if (key === 'memo.help.lookup') { fail(1, '内部错误：memo.help.lookup 须走 dispatchHelp（开库之前）'); return ok(null); }
  if (key === 'memo.init') { fail(1, '内部错误：memo.init 须走开库前分派（库不存在时也要能跑）'); return ok(null); }
  fail(3, '未知 memo key：' + key);
  return ok(null);
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
  if (!o.key) fail(2, '用法：memo-cmd-read <memo.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  let params = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  // #695：三个配置 key（`memo.config.read/write/reset`）在库目录预检与形状表之前拦下——
  // 读写配置不该要求库已配，它们也不进 `MEMO_KEY_SHAPES`（不是唤醒词命令，见 `src/cli/config.ts`）。
  if (isConfigKey(o.key)) {
    process.stdout.write(runConfigKey(o.key, params) + '\n');
    return;
  }
  // #706 · 配置体检（`memo.config.check`）：同样是设置页专用的只读命令，同样在预检之前拦下——
  // 它要报的正是「库在哪、通不通」，不能先要求库目录已配。只读：不建目录、不写文件、不落默认配置。
  if (isHealthCheckKey(o.key)) {
    process.stdout.write(runHealthCheckKey(o.key) + '\n');
    return;
  }
  preflight();
  // 读配置算库目录：配置件的报错本身就是人话（带行号与文件名），归「预检」那一档原样交回
  // （不能让它裸抛——那会吐一整段 node 崩溃栈，用户看不到「该在哪配」）。
  let dbPath = '';
  try { dbPath = resolveDbDir(); }
  catch (e) { fail(1, e instanceof Error ? e.message : String(e)); }
  let shape = null;
  try { shape = memoShapeFor(o.key); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env: Envelope | null = null;
  let delivery: HtmlReceipt | undefined;
  // #661：合成写「最终没达成」时回执照打、退出码在写完回执之后落实（分字段是回执的本分，不能因为非 0 就吞掉）。
  let writeExit = 0;
  try {
    // #229：`memo.help.lookup` 在**开库之前**分派（只读页不建库）；其余键照旧走 dispatch。
    // #665：开的是老库文件（直连，不建库）；用完即关，失败也关。
    // #855：开库前分派统一走登记表——`pre-open` 类的命令（今天只有 `memo.init`，声明住 `src/init/commands.ts`）
    // 在开库之前调，库不存在时也能跑；`memo.help.lookup` 的交付装配仍走框架位 `dispatchHelp`（HELP 面，不进域门）。
    const help = o.key === 'memo.help.lookup' ? dispatchHelp(params, dbPath) : null;
    const pre = o.key === 'memo.help.lookup' ? undefined : REGISTRY[o.key];
    let db: MemoDb | null = null;
    let out: DispatchOut;
    try {
      if (help !== null) {
        out = { data: help.data, exit: 0 };
      } else if (pre !== undefined && pre.kind === 'pre-open') {
        out = pre.run(params);
      } else {
        db = openMemoDb(dbPath);
        out = dispatch(o.key, params, db);
      }
    } finally {
      if (db) {
        try {
          closeMemoDb(db);
        } catch {
          // 关库失败不掩盖主流程结果。
        }
      }
    }
    writeExit = out.exit;
    env = buildMemoEnvelope(o.key, out.data);
    const built = env;
    // B4 既有语义：`--html <路径>` 逐字写用户给的路径，内容仍是本包的 envelope 片段（`renderEnvelopeHtml`）。
    const sectionHtml = (): string => {
      const html = renderEnvelopeHtml(built);
      assertHtmlSize(html);
      return html;
    };
    if (help?.deliver !== undefined) {
      // 本键的产物：缺省＝HELP 全壳页（自带 html）；`mode:"lookup"`＝速查表分节页（由 envelope 渲染）。
      const html = help.deliver.html ?? sectionHtml();
      if (help.deliver.html !== undefined) assertHtmlSize(html);
      delivery = deliverMemoHtml({ explicit: o.html, landing: help.deliver.landing, html, window: help.deliver.window });
    } else if (out.deliver !== undefined) {
      // #665 整页交付：缺省落 `memo_html/<页名>.html`（独占递补），显式 `--html` 逐字覆盖写。
      delivery = deliverMemoHtml({ explicit: o.html, landing: landingOf(dbPath, out.deliver.stem), html: out.deliver.html });
    } else if (o.html) {
      delivery = deliverMemoHtml({ explicit: o.html, html: sectionHtml() });
    }
  } catch (e) {
    // #760：飞书相关命令缺 CLI／未登录的失败回执带上安装指引（与面板「复制安装指引」按钮同一内容）。
    if (e instanceof MemoFetchError && e.code.startsWith('LARK_')) {
      fail(4, '取数失败：' + e.message + '。' + LARK_WEBSITE_LINE + '完整安装指引（含复制给 AI 的 prompt）见 memo.config.read 回执的 lark.prompt。');
    }
    if (e instanceof MemoFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof MemoPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof MemoRenderError) fail(5, '渲染失败：' + e.message);
    // 落盘错误：`EACCES`／`ENOTDIR`／`ENOSPC`… 一律 exit 5（不静默当成功、不换形态降级）。
    if ((e as NodeJS.ErrnoException)?.code && /^E[A-Z]+$/.test(String((e as NodeJS.ErrnoException).code))) {
      fail(5, '落盘失败：' + ((e as Error).message || String(e)));
    }
    // 配置件（`base-link-core`）的报错本身就是人话（带行号与文件名）：归「预检」那一档原样交回。
    if (/(配置文件|配置项|测试缺隔离)/.test((e as Error).message ?? '')) fail(1, (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  // #83／#144 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，envelope 既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
  // #661：本地那一侧成了、远端那一侧没成 ⇒ 回执已分字段写明，退出码仍要如实反映「这一趟没达成」（契约 A3／A6）。
  if (writeExit !== 0) {
    console.error('ERR ' + writeExit + ': 合成写没达成（本地侧已落，远端侧见回执 remote 那一格）');
    process.exit(writeExit);
  }
}

await main();
