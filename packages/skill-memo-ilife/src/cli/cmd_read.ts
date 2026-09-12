#!/usr/bin/env node
// memo 唯一出口 cmd_read（M5 #35）：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Envelope } from 'base-link-core';
import { saveHtmlFile, helpReuseWindowOf, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';
import { openMemoDb, listNotes, getNote, searchNotes, addNote, updateNote, removeNote, larkReady, MemoFetchError } from '../fetch/index.js';
import { normalizeTop, normalizeSub, normalizeRemindAt, crudCreate, crudUpdate, crudRemove } from '../policy/index.js';
import { memoShapeFor, buildMemoEnvelope, renderEnvelopeHtml, assertHtmlSize, MemoRenderError } from '../render/index.js';
import { buildMemoHelpFileData, renderMemoHelpHtml } from '../help/helpFile.js';
import { buildHelpSceneIndex } from '../help/sceneData.js';
import { buildHelpLookup } from '../help/index.js';
import { HELP_HTML_DIR_NAME, HELP_FILE_STEM, LOOKUP_FILE_STEM } from '../help/manifest.js';
import { MemoPolicyError } from '../fetch/errors.js';
import type { MemoDb, MemoNote } from '../fetch/db.js';

const DEFAULT_TIMEOUT_MS = 30000;

function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function toast(msg: string): void { console.error('TOAST: ' + msg); }

function preflight() {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p;
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

/** 缺省交付的落点意图：`<SKILLS_DB_PATH>/<memo_html>/〈主体〉`（目录名与主体是备忘录自己的三个值）。 */
function landingOf(dbPath: string, stem: string): HtmlLanding {
  return { dir: join(resolve(dbPath), HELP_HTML_DIR_NAME), stem };
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

/** 初始化状态：memo 库**目录**存在＝已初始化（票 6 V4）。只 `stat`、不建目录；
 *  判定本身异常 ⇒ `false`＝横幅照显（fail-open：误显只多一条提示，误藏会让新用户找不到入口）。 */
function helpInitialized(dbPath: string): boolean {
  try { return existsSync(join(dbPath, 'memo')); } catch { return false; }
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
      deliver: { landing: landingOf(dbPath, LOOKUP_FILE_STEM), window },
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
    deliver: { html, landing: landingOf(dbPath, HELP_FILE_STEM), window },
  };
}

// 十一键分发：读走 fetch 读，写走 fetch 写+policy 校验，sync 走 lark 四门；未知键 upstream 已拦，此处再拦一道。
function dispatch(key: string, params: Record<string, unknown>, db: MemoDb): unknown {
  switch (key) {
    case 'memo.search': {
      const items = params.q !== undefined
        ? searchNotes(db, String(params.q), { category: params.category as string | undefined, sub: params.sub as string | undefined })
        : listNotes(db).filter((n) => (params.category === undefined || n.category === params.category));
      return { items, total: items.length };
    }
    case 'memo.detail': return { item: getNote(db, needStr(params, 'id')) };
    case 'memo.create': {
      const c = crudCreate(params);
      const top = normalizeTop(params.category);
      const sub = normalizeSub(params.sub);
      const remindAt = params.remindAt !== undefined ? normalizeRemindAt(params.remindAt) : null;
      const n = addNote(db, { title: c.title, body: c.body, category: top, sub, remindAt });
      return { ok: true, message: '已记一条：' + n.id };
    }
    case 'memo.update': {
      const id = crudUpdate(params).id;
      const patch: Partial<MemoNote> = {};
      if (params.title !== undefined || params.body !== undefined) {
        const c = crudCreate({ title: params.title || getNote(db, id).title, body: params.body || '' });
        patch.title = c.title; if (params.body !== undefined) patch.body = c.body;
      }
      if (params.category !== undefined) patch.category = normalizeTop(params.category);
      if (params.sub !== undefined) patch.sub = normalizeSub(params.sub);
      if (params.remindAt !== undefined) patch.remindAt = normalizeRemindAt(params.remindAt);
      if (params.done !== undefined) patch.done = params.done === true;
      const n = updateNote(db, id, patch);
      return { ok: true, message: '已更新：' + n.id };
    }
    case 'memo.remove': {
      if (params.mode === 'abandon') {
        const id = needStr(params, 'id');
        updateNote(db, id, { remindAt: null });
        return { ok: true, message: '已废弃提醒（笔记保留）：' + id };
      }
      const r = crudRemove(params);
      removeNote(db, r.id, true);
      return { ok: true, message: '已删除：' + r.id };
    }
    case 'memo.remind': {
      const items = listNotes(db).filter((n) => n.remindAt);
      const done = params.done === true;
      const out = items.filter((n) => (n.done === true) === done);
      return { items: out, total: out.length };
    }
    case 'memo.wish': {
      const items = listNotes(db).filter((n) => n.category === '心愿');
      return { items, total: items.length };
    }
    case 'memo.sync': {
      const gate = larkReady();
      return { ok: true, message: '飞书就绪：' + gate.openId + '（同步执行归 M7 端到端）' };
    }
    case 'memo.batch': return { ok: true, message: '批量改分类向导须交互确认（M5 只登记意图）' };
    case 'memo.stats': {
      const all = listNotes(db);
      const metrics: Record<string, number> = { count: all.length };
      for (const n of all) metrics['cat.' + n.category] = (metrics['cat.' + n.category] || 0) + 1;
      return { metrics };
    }
    // #229：本键由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
    // 照 skill-bill/src/cli/cmd_read.ts:449-451 的同一道内部断言——防的是「改回无条件开库」这个静默回退。
    case 'memo.help.lookup':
      fail(1, '内部错误：memo.help.lookup 须走 dispatchHelp（开库之前）');
      return null;
    default: fail(3, '未知 memo key：' + key); return null;
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
  if (!o.key) fail(2, '用法：memo-cmd-read <memo.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  const dbPath = preflight();
  let params = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape = null;
  try { shape = memoShapeFor(o.key); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env: Envelope | null = null;
  let delivery: HtmlReceipt | undefined;
  try {
    // #229：`memo.help.lookup` 在**开库之前**分派（只读页不建库）；其余 10 键照旧走 dispatch（内部开库）。
    const help = o.key === 'memo.help.lookup' ? dispatchHelp(params, dbPath) : null;
    env = buildMemoEnvelope(o.key, help ? help.data : dispatch(o.key, params, openMemoDb(join(dbPath, 'memo'))));
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
    } else if (o.html) {
      delivery = deliverMemoHtml({ explicit: o.html, html: sectionHtml() });
    }
  } catch (e) {
    if (e instanceof MemoFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof MemoPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof MemoRenderError) fail(5, '渲染失败：' + e.message);
    // 落盘错误：`EACCES`／`ENOTDIR`／`ENOSPC`… 一律 exit 5（不静默当成功、不换形态降级）。
    if ((e as NodeJS.ErrnoException)?.code && /^E[A-Z]+$/.test(String((e as NodeJS.ErrnoException).code))) {
      fail(5, '落盘失败：' + ((e as Error).message || String(e)));
    }
    if ((e as Error).message?.includes('SKILLS_DB_PATH')) fail(1, (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  // #83／#144 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，envelope 既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
}

await main();
