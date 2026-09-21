#!/usr/bin/env node
// memo 唯一出口 cmd_read（M5 #35）：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Envelope } from 'base-link-core';
import { saveHtmlFile, helpReuseWindowOf, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';
// #833（init 域）：本域两页的复制区载荷（数据／日志）走公共层的 text 两件，不在包内自写序列化。
import { buildDataText, buildLogText } from 'base-paint';

/** #833：复制区载荷吃的那份信封类型（公共层 `text` 两件的入参取出来，不在两处各写一份形状）。 */
type MemoCopyEnvelope = Parameters<typeof buildDataText>[0]['envelope'];
/** #833：复制日志载荷的 `copy_log` 位（同上，从公共层 `text` 两件的入参取形）。 */
type MemoCopyLogFields = NonNullable<Parameters<typeof buildLogText>[0]['copyLog']>;
import {
  openMemoDb,
  closeMemoDb,
  listNotes,
  getNote,
  addReminderRow,
  abandonReminder,
  checkDueReminders,
  listCompletedReminders,
  listReminderRows,
  countReminderRowsOfNote,
  collectBatchItems,
  countNotesByCategory,
  applyBatchCategory,
  authStatus,
  runSentinel,
  MemoFetchError,
} from '../fetch/index.js';
import { LARK_WEBSITE_LINE } from '../fetch/feishu.js';
import { normalizeTop, normalizeSub, needId, normalizeMediaPath, crudCreate, crudUpdate, crudRemove, normalizeRemindAt, normalizeRepeatType, normalizeRepeatRule } from '../policy/index.js';
// #661：心愿类的对外面——记／改／删／批量排期四条写命令与反向对账都经这一个门（`src/wish/index.ts`）。
// #665：完成心愿走原子转换（`completeWish`，老 `complete-wish`）；排期／完成向导收集走 `wizards`。
import { dueForCategory, ensureWish, updateWish, removeWish, setWishDue, reconcileWishes, completeWish } from '../wish/index.js';
// #855：**命令登记查表**——各域自己的声明（`src/<域>/commands.ts`）由生成器汇成本表；命中即走该域的运行件。
import { REGISTRY } from './registry.js';
import { toRows, type PageRow } from '../shared/rows.js';
import { fail } from '../shared/exit.js';
import { memoShapeFor, buildMemoEnvelope, renderEnvelopeHtml, assertHtmlSize, fillMemoPage, pageEnvelope, changeCategorySnapshot, syncSnapshot, initSnapshot, MemoRenderError, buildReceiptPage } from '../render/index.js';
import type { ReceiptScene } from '../render/index.js';
import type { WishReceipt } from '../wish/index.js';
import { buildMemoHelpFileData, renderMemoHelpHtml } from '../help/helpFile.js';
import { buildHelpSceneIndex } from '../help/sceneData.js';
import { buildHelpLookup } from '../help/index.js';
import { helpHtmlDirName, helpFileStem, lookupFileStem } from '../help/manifest.js';
// #832（sync 域）：产物名主体取自册子唯一定义地（`bookletFileStem`），不在本件手写第二份名字。
import { bookletFileStem } from '../help/index.js';
// #833（init 域）：诊断读取与两页装配住 `src/init/`（能力门）；本件只做分派与交付。
import { INIT_SCENE_ID, readInitDiagnosis, InitInputError, renderInitPage, type InitPageMode } from '../init/index.js';
import { resolveDbDir, dbFilename, resolveDbPath } from '../fetch/paths.js';
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
import { MemoPolicyError } from '../fetch/errors.js';
import type { MemoDb, NotePatch } from '../fetch/db.js';

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

// #850 · 初始化渲染（`memo.init`，照旧侧 `init-report --data <JSON>`）：只渲染，不建库不写配置；
// 库不存在时也能跑（与 `memo.help.lookup` 同位置的开库前分派）。输入为 AI 诊断后的 JSON
// （检查清单＋待办＋验证清单三段）。
// #833 · 本域出两格（册子 #848）：缺省＝结果页 `首次使用`（初始化报告）；`mode:"wizard"`＝过程页
// `首次使用-向导`（逐步引导）。两页同吃一份诊断载荷；主体一律由 `bookletFileStem` 算，本件不手写名字。
function dispatchInit(params: Record<string, unknown>): DispatchOut {
  const modeRaw = params.mode === undefined ? 'report' : String(params.mode);
  if (modeRaw !== 'report' && modeRaw !== 'wizard') fail(2, 'mode 只认 wizard（缺省出报告页 `首次使用`）');
  const mode: InitPageMode = modeRaw === 'wizard' ? 'guide' : 'report';
  let diag;
  try {
    diag = readInitDiagnosis(params);
  } catch (e) {
    if (e instanceof InitInputError) fail(2, e.message);
    throw e;
  }
  const snap = initSnapshot(diag);
  const message = mode === 'guide'
    ? '首次使用引导页已生成（只渲染，不建库不写配置）'
    : '初始化报告已生成（只渲染，不建库不写配置）';
  const payload = pageEnvelope({
    commandCn: '首次使用', wakeWord: '首次使用', sceneId: INIT_SCENE_ID,
    title: snap.title, summary: snap.summary, sections: snap.sections,
    copyLog: {
      thinking: mode === 'guide'
        ? '首次使用 · 引导过程页（先处理必装缺失，再做待办项）'
        : '首次使用 · AI 诊断结果渲染为报告页（检查清单＋待办＋验证清单）',
      data_structure: '--data JSON：{items:[{name,status,desc,action}], todos:[{title,steps}], verify:[]}',
      call_chain: 'memo.init --params → dispatchInit → src/init 两页装配 → base-paint 文档壳',
      exception: '无',
    },
    extra: { items: diag.items, todos: diag.todos, verify: diag.verify },
    message,
  });
  const envelopeData = payload.data as { readonly generated_at?: unknown; readonly copy_log?: unknown };
  const occurredAt = typeof envelopeData.generated_at === 'string' ? envelopeData.generated_at : '';
  const data = { ok: true, message, items: diag.items.length, todos: diag.todos.length, verify: diag.verify.length };
  // 复制区载荷：吃**回执信封**（公共层 `text` 两件只认可序列化信封形状），日志那件再补页面的 copy_log。
  const copyEnvelope = buildMemoEnvelope('memo.init', data) as unknown as MemoCopyEnvelope;
  const page = renderInitPage(mode, diag, {
    occurredAt,
    dataText: buildDataText({ envelope: copyEnvelope }),
    logText: buildLogText({
      envelope: copyEnvelope,
      copyLog: envelopeData.copy_log as MemoCopyLogFields,
    }),
  });
  return {
    data: { ok: true, message, items: diag.items.length, todos: diag.todos.length, verify: diag.verify.length },
    exit: 0,
    deliver: { html: page.html, stem: bookletFileStem(INIT_SCENE_ID, page.kind) },
  };
}

// 十四键分发（#665 起十二键，加 memo.auth；#850 加 memo.init／memo.reminder）：读走 fetch 读，写走 fetch 写+policy 校验，sync 走 lark 四门；未知键 upstream 已拦，此处再拦一道。
// #661：写命令分两支——心愿分类走「合成写」（本地 ＋ 飞书任务一次成；回执分字段；最终没达成时退出码非 0），
// 其它分类照旧只落本地（回执里 `remote` 那一格如实写「不适用」，不假装同步过）。
// #665：向导三条（排期／完成／批量改分类）与同步报告各出一张整页，随 `deliver` 出交付。
// 返回 `{data, exit, deliver?}`：`exit` 非 0 时回执照打（分字段是回执的本分），退出码在 main 里落实。
interface PageDeliver { readonly html: string; readonly stem: string }
interface DispatchOut { readonly data: unknown; readonly exit: number; readonly deliver?: PageDeliver }
function ok(data: unknown): DispatchOut { return { data, exit: 0 }; }

function asIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) fail(2, 'ids 须为非空数组');
  return value.map((v) => needId(v, 'ids'));
}

/** #831 · 从写侧回执里取笔记 id：写侧两种说法都以「：id」结尾（`已记一条：7`／`已存在这条心愿（未新建）：7`）。
 *  取不到即 null（调用方按「未新建」出页，不猜一个号）。 */
function noteIdOfMessage(message: string): number | null {
  const m = /(\d+)\D*$/.exec(message);
  const n = m === null ? NaN : Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** #831 · 回执页的槽位：对象行 ／ 分类徽章 ／ 事实条 —— **从 notes 表那一行取**（不照抄入参）。 */
function receiptOptsOf(note: { id: number; category: string; sub_category: string | null; content: string }): {
  entityLabel: string;
  entityId: number;
  category: string;
  sub: string | null;
  summary: string[];
} {
  return {
    entityLabel: note.category,
    entityId: note.id,
    category: note.category,
    sub: note.sub_category,
    summary: [
      '笔记 ID ' + note.id,
      '正文：' + note.content,
      '分类 ' + note.category + (note.sub_category === null ? '' : '／' + note.sub_category),
    ],
  };
}

/** #831 · 「通用回执」族三格的整页交付（`memo.create`／`memo.update`／`memo.remove`）。
 *
 *  回执数据只有一处来源 —— policy 的顶层分类与写侧回执（`WishReceipt`）本身；本函数只做
 *  「回执 → 本的槽位」的翻译，页面形状一律交给族定义地 `buildReceiptPage`（不在此另立布局）。
 *  命令中文名与唤醒词取自 HELP 的场景主名（`sceneTitle`），与册子主体同名。 */
function buildReceipt(
  scene: ReceiptScene,
  title: string,
  r: WishReceipt,
  opts: { entityLabel: string; entityId: string | number; category?: unknown; sub?: unknown; summary: string[] },
): PageDeliver {
  return buildReceiptPage({
    scene,
    title,
    message: r.message,
    badges: { category: normalizeTop(opts.category), sub: opts.sub === undefined || opts.sub === null ? null : String(opts.sub) },
    summary: opts.summary,
    sections: [],
    receipt: { entityLabel: opts.entityLabel, entityId: opts.entityId, local: r.local, remote: r.remote, remoteId: r.remoteId },
    copyLog: {
      thinking: title + ' · 写命令回执渲染为通用回执页（页族定义处 src/render/receipt.ts）',
      data_structure: 'notes／reminders 两表；回执字段 local／remote／remoteId 取自写侧',
      call_chain: 'cmd_read dispatch → ' + scene + ' → buildReceiptPage → fillMemoPage(receipt) → deliver 钩子落盘',
      exception: '无',
    },
    retryPrompt: '若这一页的内容不对，请把要改的那一条（笔记 ID 与要改成的样子）发我，我重跑一次：' + title,
  });
}

// #855：行适配（`toRows`／`PageRow`）已提到共用位 `src/shared/rows.ts`——出口与各域运行件共用一份。

// #855：区间参数的三件校验（`needRangeDate`／`rangeLimitOf`／`categoryFilterOf`）随 `memo.search`
// 一起搬进 `src/search/run.ts`——只有那一条命令在用，不留第二份。

// #850 · 提醒写参数（HELP 蛇形为主，驼峰兼容既有 `memo.create` 两步合一）：`note_id`／`noteId`／`id`
// 三名同义（给了校验存在，不给即独立提醒）；`content` 必填；`remind_at`／`remindAt`／`at` 三名同义；
// `repeat_type`／`repeatType` 默认一次性，一次性必须有时间（老 `add_reminder` 口径）。
function reminderNoteIdOf(params: Record<string, unknown>): number | null {
  const v = params.note_id !== undefined ? params.note_id : params.noteId !== undefined ? params.noteId : undefined;
  if (v === undefined || v === null || v === '') return null;
  return needId(v, '提醒关联笔记');
}
function reminderContentOf(params: Record<string, unknown>): string {
  const v = params.content !== undefined ? params.content : params.body !== undefined ? params.body : params.title;
  if (typeof v !== 'string' || v.trim().length === 0) fail(2, '请填入提醒内容');
  return (v as string).trim();
}
function reminderAtOf(params: Record<string, unknown>): string | null {
  const v = params.remind_at !== undefined ? params.remind_at : params.remindAt !== undefined ? params.remindAt : params.at;
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') fail(2, '提醒时间须为 YYYY-MM-DD HH:MM');
  return normalizeRemindAt(v);
}
function reminderTypeRuleOf(params: Record<string, unknown>, at: string | null): { type: string; rule: string | null } {
  const rawType = params.repeat_type !== undefined ? params.repeat_type : params.repeatType;
  const type = normalizeRepeatType(rawType);
  const rawRule = params.repeat_rule !== undefined ? params.repeat_rule : params.repeatRule !== undefined ? params.repeatRule : params.rule;
  const rule = normalizeRepeatRule(type, rawRule, at);
  if (type === '一次性' && !at) fail(2, '一次性提醒必须给提醒时间');
  return { type, rule };
}

// #850 · 删分层 ids 解析：`ids` 数组／`id` 单值／`id` 空格分隔串（三者同义，HELP 的“空格分隔多个”即第三种）。
// 返回去重后的正整数列（保序）。空即缺参数（exit 2）。
function deleteIdsOf(params: Record<string, unknown>): number[] {
  const rawIds = params.ids !== undefined ? params.ids : params.id;
  if (rawIds === undefined || rawIds === null || rawIds === '') fail(2, '删除须给笔记 id（可多个，空格分隔）');
  const list: unknown[] = Array.isArray(rawIds) ? rawIds : String(rawIds).trim().split(/\s+/);
  if (list.length === 0) fail(2, '删除须给笔记 id（可多个，空格分隔）');
  const ids = list.map((v) => needId(v, '删除'));
  return [...new Set(ids)];
}
function deleteConfirmOf(params: Record<string, unknown>): boolean {
  const v = params.confirm !== undefined ? params.confirm : (params as Record<string, unknown>).true;
  return v === true;
}
function deleteWithRemindersOf(params: Record<string, unknown>): boolean {
  const v = params.withReminders !== undefined ? params.withReminders : params.with_reminders;
  return v === true;
}

// #833：初始化渲染的入参读取（老 `init-report --data` 契约）已搬到本域能力目录
// —— `readInitDiagnosis`（`src/init/diagnosis.ts`，坏输入抛 `InitInputError`，`dispatchInit` 认它归 exit 2）。
// 放在本件的旧实现（`initDiagOf`）连同 `init_report` 那套自持页一起退役：一条命令的事实只住它自己的能力目录。

function dispatch(key: string, params: Record<string, unknown>, db: MemoDb): DispatchOut {
  // #855：**先查登记表**——已搬迁的域把自己的命令声明在 `src/<域>/commands.ts`，生成物 `registry.ts`
  // 汇成一张表，命中即调该域的运行件；没搬的键落下面的 switch（搬迁每落一域，switch 就少一段）。
  const spec = REGISTRY[key];
  if (spec !== undefined) return spec.kind === 'pre-open' ? spec.run(params) : spec.run(params, db);
  switch (key) {
    // #855：`memo.search`／`memo.detail` 已搬回 `src/search/`（声明住 `search/commands.ts`，运行件住 `search/run.ts`），
    // 上面那张登记查表先命中它们——这两条 case 已删。**别再长回来**：加命令改的是自己域里的声明。
    case 'memo.create': {
      const c = crudCreate(params);
      const top = normalizeTop(params.category);
      const sub = normalizeSub(params.sub);
      const media = params.media !== undefined ? normalizeMediaPath(params.media) : null;
      const r = ensureWish(db, {
        title: c.title,
        body: c.body,
        category: top,
        sub,
        media,
        remindAt: params.remindAt,
        repeatType: params.repeatType,
        repeatRule: params.repeatRule,
        due: params.due,
      });
      // #831：回执页缺省落盘（只有本族这三格出页；`memo.update` 的批量／完成心愿两支不出本族页）。
      // 页内的分类与子分类取自 notes 表那一行（权威），不照抄入参；`memo.create` 的回执不带 id 字段，
      // 故从回执末数取（写侧两种说法都以「：id」结尾）。
      const createdId = noteIdOfMessage(r.receipt.message);
      return {
        data: r.receipt,
        exit: r.exit,
        deliver: buildReceipt('memo_add_mood', '记情绪', r.receipt, createdId === null ? { entityLabel: '情绪日记', entityId: '未新建', summary: ['本次未新建笔记'] } : receiptOptsOf(getNote(db, createdId))),
      };
    }
    case 'memo.update': {
      // 批量排期（老 `set-due`）：一批 id ＋ 一个排期日期（空值＝清期），走心愿那条合成写。
      if (params.ids !== undefined) {
        const r = setWishDue(db, { ids: asIds(params.ids), due: params.due });
        return { data: r.receipt, exit: r.exit };
      }
      const id = crudUpdate(params).id;
      // 完成心愿走原子转换（老 `complete-wish`：删心愿 ＋ 生成打卡；`content` 即打卡内容，缺省拷贝心愿原文）。
      if (params.done === true) {
        const r = completeWish(db, { id, content: params.content });
        return { data: r.receipt, exit: r.exit };
      }
      if (params.done !== undefined) fail(2, 'done 只认 true（完成心愿）；改字段另给参数');
      const patch: NotePatch = {};
      if (params.title !== undefined || params.body !== undefined) {
        const t = typeof params.title === 'string' ? params.title.trim() : '';
        const b = typeof params.body === 'string' ? params.body.trim() : '';
        if (!t && !b) fail(2, '正文不可改成空');
        patch.content = b !== '' ? b : t !== '' ? t : getNote(db, id).content;
      }
      if (params.category !== undefined) patch.category = normalizeTop(params.category);
      if (params.sub !== undefined) patch.sub_category = normalizeSub(params.sub);
      if (params.media !== undefined) patch.media_path = normalizeMediaPath(params.media);
      if (params.reminderId !== undefined) patch.reminder_id = needId(params.reminderId, '关联提醒');
      // 老实现没有「改提醒时间」这一路：提醒时间定盘即不可改，错了废弃重建，大声失败不静默。
      if (params.remindAt !== undefined) fail(2, '提醒时间不可改（废弃旧提醒、重建一条）');
      if (params.due !== undefined) patch.due = dueForCategory(patch.category ?? getNote(db, id).category, params.due);
      if (Object.keys(patch).length === 0) fail(2, '至少需要提供一个更新字段：content/category/sub/media/reminderId/due');
      const r = updateWish(db, { id, patch });
      // #831：情绪日记那条走本族页（改后那一行是权威，回执页照它出）。
      const after = getNote(db, id);
      if (after.category === '情绪日记') {
        return { data: r.receipt, exit: r.exit, deliver: buildReceipt('memo_update_mood', '改情绪', r.receipt, receiptOptsOf(after)) };
      }
      return { data: r.receipt, exit: r.exit };
    }
    case 'memo.remove': {
      // 废弃提醒（老 `dismiss`）：按提醒 id 标 dismissed，笔记保留。
      if (params.mode === 'abandon') {
        const rid = needId(params.id, '废弃提醒');
        abandonReminder(db, rid);
        return ok({ ok: true, message: '提醒已废弃（笔记保留）：' + rid });
      }
      // #850 · 删除分层闸（用户说删即确认，AI 带 `confirm:true`；关联与批量另设清单闸）：
      // 单条无关联直删；有关联先出清单（含提醒数）再要 `withReminders:true`；批量（≥2）一律先出清单
      // （只回数据清单，不另出整页）；`confirm` 缺即缺参数（exit 2）。回执保持 receipt 形（`ok`／`message` 必有，
      // 清单放扩展位），退出码 2＝还没删（等第二趟带齐标记），0＝已删。
      const ids = deleteIdsOf(params);
      const confirm = deleteConfirmOf(params);
      const withReminders = deleteWithRemindersOf(params);
      // 先校验存在（老 `delete_note` 第一步）：缺哪个报哪个（exit 4，不静默）。
      for (const nid of ids) {
        try { getNote(db, nid); } catch { fail(4, '无此笔记：' + nid); }
      }
      const allReminders = listReminderRows(db, undefined).filter((r) => r.note_id !== null && ids.includes(r.note_id));
      const related = allReminders.length;
      const notes = ids.map((nid) => {
        const n = getNote(db, nid);
        return { id: n.id, content: n.content, category: n.category, created_at: n.created_at };
      });
      const isBatch = ids.length >= 2;
      if (isBatch && !confirm) {
        return {
          data: {
            ok: false,
            message: '批量删除须先看清单：' + ids.length + ' 条笔记' + (related ? '，关联 ' + related + ' 个提醒' : '（无关联提醒）') + '；确认后带 confirm:true 重调' + (related ? '（有关联时另带 withReminders:true 级联）' : ''),
            ids, total: ids.length, items: notes, related, reminders: allReminders,
          },
          exit: 2,
        };
      }
      if (related > 0 && !withReminders) {
        return {
          data: {
            ok: false,
            message: '笔记 ' + ids.join(' ') + ' 关联 ' + related + ' 个提醒，请加 withReminders:true 级联删除（提醒不会被自动删除）',
            ids, total: ids.length, items: notes, related, reminders: allReminders,
          },
          exit: 2,
        };
      }
      if (!confirm) fail(2, '删除须带 confirm:true（用户说删即确认，AI 显式带上；废弃提醒走 abandon）');
      // #661 · C 口径：默认照老「远端标完成」，显式 `purge:true` 才连飞书任务一起删（两种语义用参数讲清）。
      if (!isBatch) {
        // #831：情绪日记那条走本族页。**删前先取那一行**——删完 `getNote` 就取不到了。
        const before = getNote(db, ids[0]);
        const w = removeWish(db, ids[0], params.purge === true);
        if (before.category === '情绪日记') {
          return { data: w.receipt, exit: w.exit, deliver: buildReceipt('memo_delete_mood', '删情绪', w.receipt, receiptOptsOf(before)) };
        }
        return { data: w.receipt, exit: w.exit };
      }
      const errors: string[] = [];
      let removed = 0;
      for (const nid of ids) {
        try {
          const w = removeWish(db, nid, params.purge === true);
          if (w.exit === 0) removed += 1;
          else errors.push('id=' + nid + '：' + w.receipt.message);
        } catch (e) {
          errors.push('id=' + nid + '：' + (e instanceof Error ? e.message : String(e)));
        }
      }
      const doneAll = errors.length === 0;
      return {
        data: {
          ok: doneAll,
          message: doneAll ? '已删除 ' + removed + ' 条' : '批量删除部分完成：已删=' + removed + '，错误=' + errors.length,
          removed, errors, ids,
        },
        exit: doneAll ? 0 : 4,
      };
    }
    case 'memo.remind': {
      // 到期判定（老 `due`）：读＋写 notified，定时壳不搬。
      if (params.mode === 'due' || params.due === true) {
        const items = checkDueReminders(db);
        return ok({ items, total: items.length });
      }
      // 已完成视图（老 `completed`）；`done:true` 是它的兼容写法。
      if (params.mode === 'done' || params.done === true) {
        const items = listCompletedReminders(db);
        return ok({ items, total: items.length });
      }
      const status = params.status === undefined ? 'active' : String(params.status);
      if (status !== 'active' && status !== 'dismissed') fail(2, 'status 只认 active/dismissed');
      const items = listReminderRows(db, status);
      return ok({ items, total: items.length });
    }
    case 'memo.reminder': {
      // #850 · 给已有笔记加提醒（老 `remind [note_id]`）：只做 INSERT 提醒行，不建笔记；
      // `memo.create` 的两步合一（记提醒）不动；读提醒四视图仍走 `memo.remind`，不混入写分支。
      const noteId = reminderNoteIdOf(params);
      if (noteId !== null) {
        try { getNote(db, noteId); } catch { fail(4, '无此笔记：' + noteId); }
      }
      const content = reminderContentOf(params);
      const at = reminderAtOf(params);
      const { type, rule } = reminderTypeRuleOf(params, at);
      const row = addReminderRow(db, {
        note_id: noteId,
        remind_at: at,
        repeat_type: type,
        repeat_rule: rule,
        content,
      });
      return ok({
        ok: true,
        message: '提醒已设置' + (noteId !== null ? '（笔记 ' + noteId + '）' : '（独立提醒）') + '：' + row.id,
        id: row.id,
        note_id: row.note_id,
        remind_at: row.remind_at,
        repeat_type: row.repeat_type,
        repeat_rule: row.repeat_rule,
        content: row.content,
      });
    }
    // #855：`memo.wish` 已搬回 `src/wish/`（声明住 `wish/commands.ts`，运行件住 `wish/run.ts`）——
    // 上面那张登记查表先命中它，本 case 已删。**别再长回来**：加命令改的是自己域里的声明。
    case 'memo.sync': {
      // #661：反向对账三步（本地缺标识补建／远端完成→本地／远端改期→本地），回执带 11 项统计。
      // #665：同步报告页随行（#661 遗留 HELP 承诺，出页归这一支）。
      const r = reconcileWishes(db);
      const snap = syncSnapshot(r.receipt);
      const payload = pageEnvelope({
        commandCn: '备忘录同步', wakeWord: '备忘录同步', sceneId: 'sync-from-feishu',
        title: snap.title, summary: snap.summary, sections: snap.sections,
        copyLog: {
          thinking: '双向对账 · 飞书 done/due 反向同步到本机（只读扫描 ＋ 有变更才写）',
          data_structure: 'reconcile 11 项统计（backfilled/synced/due_*/skipped_*/errors）',
          call_chain: 'memo.sync → reconcileWishes → render_sync_report → 共享 filler',
          exception: r.receipt.errors.length ? r.receipt.errors.join('; ') : '无',
        },
        extra: { ...r.receipt },
        message: r.receipt.message,
      });
      return { data: r.receipt, exit: r.exit, deliver: { html: fillMemoPage('sync_report', payload), stem: bookletFileStem('memo_sync_feishu') } };
    }
    case 'memo.batch': {
      // #665 批量改分类：不带目标分类即收集（出向导页）；带目标分类＋ids 即执行。
      const from = params.fromCategory !== undefined ? normalizeTop(params.fromCategory) : null;
      const to = params.toCategory !== undefined ? normalizeTop(params.toCategory) : null;
      if (from !== null && to !== null && from === to) fail(2, '原分类与目标分类相同：' + from);
      // 执行（老 `update-category` 逐条）：目标分类＋一批 id；只给目标分类不给 id 即收集预览。
      if (params.ids !== undefined) {
        if (to === null) fail(2, '执行改分类须给 toCategory（只收集不执行时别给 ids）');
        const r = applyBatchCategory(db, asIds(params.ids), to);
        const doneAll = r.errors.length === 0;
        return {
          data: {
            ok: doneAll,
            message: '改分类完成：更新=' + r.updated + '，跳过=' + r.skipped,
            updated: r.updated,
            skipped: r.skipped,
            errors: r.errors,
          },
          exit: doneAll ? 0 : 4,
        };
      }
      const items = collectBatchItems(db, from);
      const snap = changeCategorySnapshot(toRows(items), from, to);
      const message = "原分类 '" + (from ?? '<全部>') + "' 下 " + items.length + ' 条笔记';
      const payload = pageEnvelope({
        commandCn: '批量改分类', wakeWord: '备忘改分类', sceneId: 'batch-update-category',
        title: snap.title, summary: snap.summary, sections: snap.sections,
        copyLog: {
          thinking: '过程型向导 · 勾选后复制改分类指令回 AI（只改顶层分类，sub_category 不动）',
          data_structure: 'notes 表 · id/content/category/sub_category/media_path/due',
          call_chain: 'memo.batch → render_change_category → 共享 filler',
          exception: '无',
        },
        extra: { items, from_category: from, to_category: to, target_conflict_count: to ? countNotesByCategory(db, to) : 0 },
        message,
      });
      return {
        data: { ok: true, message, items, total: items.length, fromCategory: from, toCategory: to },
        exit: 0,
        deliver: { html: fillMemoPage('change_category', payload), stem: '批量改分类' },
      };
    }
    case 'memo.auth': {
      // #760 起只剩只读诊断：`status`（授权状态）／`diag`（任务域自检 sentinel，显式才跑，零写）。
      // 授权三支（`init`／`qr`／`poll`）随 `lark.cliPath` 删键退役（定稿 #759：授权交由复制安装指引那段
      // prompt，内容见 `memo.config.read` 回执的 `lark.prompt`）；「飞书授权」唤醒词同步退役。
      const step = params.step === undefined ? 'status' : String(params.step);
      if (step === 'status') {
        return ok({ ok: true, message: '授权状态', step: 'status', ...authStatus() });
      }
      if (step === 'diag') {
        // #666 自检 sentinel（D-03 任务半场）：显式才跑；默认四步不碰它，零写。
        const r = runSentinel(params.dryRun === true ? { dryRun: true } : undefined);
        return { data: r.receipt, exit: r.exit };
      }
      fail(2, 'step 只认 status/diag（授权引导 init/qr/poll 已退役：完整安装指引见 memo.config.read 回执的 lark.prompt）');
      return ok(null);
    }
    case 'memo.stats': {
      const all = listNotes(db);
      const metrics: Record<string, number> = { count: all.length };
      for (const n of all) metrics['cat.' + n.category] = (metrics['cat.' + n.category] || 0) + 1;
      return ok({ metrics });
    }
    // #229：本键由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
    // 照 skill-bill/src/cli/cmd_read.ts:449-451 的同一道内部断言——防的是「改回无条件开库」这个静默回退。
    case 'memo.help.lookup':
      fail(1, '内部错误：memo.help.lookup 须走 dispatchHelp（开库之前）');
      return ok(null);
    // #850：本键由 `dispatchInit` 在**开库之前**处理（只渲染不建库；库不存在时也能跑）；走到这里同上。
    case 'memo.init':
      fail(1, '内部错误：memo.init 须走 dispatchInit（开库之前）');
      return ok(null);
    default: fail(3, '未知 memo key：' + key); return ok(null);
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
    // #850：`memo.init` 同在开库之前（只渲染，不建库不写配置；库不存在时也能跑）。
    const help = o.key === 'memo.help.lookup' ? dispatchHelp(params, dbPath) : null;
    const init = o.key === 'memo.init' ? dispatchInit(params) : null;
    let db: MemoDb | null = null;
    let out: DispatchOut;
    try {
      if (help !== null) {
        out = { data: help.data, exit: 0 };
      } else if (init !== null) {
        out = init;
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
