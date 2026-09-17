#!/usr/bin/env node
// memo 唯一出口 cmd_read（M5 #35）：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Envelope } from 'base-link-core';
import { saveHtmlFile, helpReuseWindowOf, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';
import {
  openMemoDb,
  closeMemoDb,
  listNotes,
  getNote,
  searchNotes,
  abandonReminder,
  checkDueReminders,
  listCompletedReminders,
  listReminderRows,
  countReminderRowsOfNote,
  collectBatchItems,
  countNotesByCategory,
  applyBatchCategory,
  authInit,
  authQr,
  authPoll,
  authStatus,
  runSentinel,
  MemoFetchError,
} from '../fetch/index.js';
import { normalizeTop, normalizeSub, needId, normalizeMediaPath, crudCreate, crudUpdate, crudRemove } from '../policy/index.js';
// #661：心愿类的对外面——记／改／删／批量排期四条写命令与反向对账都经这一个门（`src/wish/index.ts`）。
// #665：完成心愿走原子转换（`completeWish`，老 `complete-wish`）；排期／完成向导收集走 `wizards`。
import { dueForCategory, dueMatches, ensureWish, updateWish, removeWish, setWishDue, reconcileWishes, completeWish, planWizard, completeWizard } from '../wish/index.js';
import { memoShapeFor, buildMemoEnvelope, renderEnvelopeHtml, assertHtmlSize, fillMemoPage, pageEnvelope, wishPlanSnapshot, wishCompleteSnapshot, changeCategorySnapshot, syncSnapshot, MemoRenderError } from '../render/index.js';
import { buildMemoHelpFileData, renderMemoHelpHtml } from '../help/helpFile.js';
import { buildHelpSceneIndex } from '../help/sceneData.js';
import { buildHelpLookup } from '../help/index.js';
import { HELP_HTML_DIR_NAME, HELP_FILE_STEM, LOOKUP_FILE_STEM } from '../help/manifest.js';
import { MemoPolicyError } from '../fetch/errors.js';
import type { MemoDb, NotePatch } from '../fetch/db.js';

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

/** 初始化状态：memo 老库文件存在＝已初始化（老 `_help_initialized`，新仓直连老库）。只 `stat`、
 *  不建文件；判定本身异常 ⇒ `false`＝横幅照显（fail-open：误显只多一条提示，误藏会让新用户找不到入口）。 */
function helpInitialized(dbPath: string): boolean {
  try { return existsSync(join(dbPath, 'memo.db')); } catch { return false; }
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

// 十一键分发（#665 起十二键，加 memo.auth）：读走 fetch 读，写走 fetch 写+policy 校验，sync 走 lark 四门；未知键 upstream 已拦，此处再拦一道。
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

// 快照函数吃纯记录（跨 JSON 边界）：各域条目在此处一次转成记录形。
type PageRow = Record<string, unknown>;
const toRows = (xs: readonly object[]): PageRow[] => xs.map((x) => ({ ...(x as PageRow) }));

function dispatch(key: string, params: Record<string, unknown>, db: MemoDb): DispatchOut {
  switch (key) {
    case 'memo.search': {
      const items = params.q !== undefined
        ? searchNotes(db, String(params.q), { category: params.category as string | undefined, sub: params.sub as string | undefined })
        : listNotes(db).filter((n) => (params.category === undefined || n.category === params.category));
      const hit = items.filter((n) => dueMatches(n, params));
      return ok({ items: hit, total: hit.length });
    }
    case 'memo.detail': return ok({ item: getNote(db, needId(params.id, '详情')) });
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
      return { data: r.receipt, exit: r.exit };
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
      return { data: r.receipt, exit: r.exit };
    }
    case 'memo.remove': {
      // 废弃提醒（老 `dismiss`）：按提醒 id 标 dismissed，笔记保留。
      if (params.mode === 'abandon') {
        const rid = needId(params.id, '废弃提醒');
        abandonReminder(db, rid);
        return ok({ ok: true, message: '提醒已废弃（笔记保留）：' + rid });
      }
      const r = crudRemove(params);
      // 老 `delete`：有关联提醒必须显式级联（`--with-reminders`），否则大声失败；
      // 有未触发提醒时的二次确认是交互动作，出口非交互，改显式参数一次讲清。
      const related = countReminderRowsOfNote(db, r.id);
      if (related > 0 && params.withReminders !== true) {
        fail(2, '笔记 ' + r.id + ' 关联 ' + related + ' 个提醒，请加 withReminders:true 级联删除（提醒不会被自动删除）');
      }
      // #661 · C 口径：默认照老「远端标完成」，显式 `purge:true` 才连飞书任务一起删（两种语义用参数讲清）。
      const w = removeWish(db, r.id, params.purge === true);
      return { data: w.receipt, exit: w.exit };
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
    case 'memo.wish': {
      // #665 向导：`wizard: plan` 出排期向导页（默认全勾选），`wizard: complete` 出完成向导页（默认不勾选）；
      // 不带即老形状（只回列表，#661 行为）。
      if (params.wizard === 'plan' || params.wizard === 'complete') {
        if (params.wizard === 'plan') {
          const w = planWizard(db, { ids: params.ids, all: params.all, suggestDue: params.suggestDue });
          const snap = wishPlanSnapshot(toRows(w.items), w.suggestDue, w.includeAll);
          const message = '找到 ' + w.items.length + ' 个心愿' + (w.includeAll ? '（含已排期）' : '（仅未排期）');
          const payload = pageEnvelope({
            commandCn: '心愿排期', wakeWord: '心愿排期', sceneId: 'wish-batch-plan',
            title: snap.title, summary: snap.summary, sections: snap.sections,
            copyLog: {
              thinking: '过程型向导 · 只读收集心愿列表，勾选＋填排期后复制指令回 AI（HTML 不写库）',
              data_structure: "notes 表（category='心愿'）· id/content/category/sub_category/due/feishu_task_guid",
              call_chain: 'memo.wish wizard:plan → render_wish_plan → 共享 filler',
              exception: '无',
            },
            extra: { items: w.items, suggest_due: w.suggestDue, all: w.includeAll },
            message,
          });
          return {
            data: { items: w.items, total: w.items.length, suggestDue: w.suggestDue, all: w.includeAll },
            exit: 0,
            deliver: { html: fillMemoPage('wish_plan', payload), stem: '心愿排期向导' },
          };
        }
        const w = completeWizard(db, { ids: params.ids, onlyOverdue: params.onlyOverdue, all: params.all, content: params.content });
        const snap = wishCompleteSnapshot(toRows(w.items));
        const message = '找到 ' + w.items.length + ' 个心愿' + (w.onlyOverdue ? '（仅未排期＋已过期）' : '');
        const payload = pageEnvelope({
          commandCn: '心愿完成', wakeWord: '完成心愿', sceneId: 'wish-complete',
          title: snap.title, summary: snap.summary, sections: snap.sections,
          copyLog: {
            thinking: '过程型向导 · 勾选＋填打卡内容后复制指令回 AI（completeWish 原子转换）',
            data_structure: "notes 表（category='心愿'）· id/content/due/feishu_task_guid",
            call_chain: 'memo.wish wizard:complete → render_wish_complete → 共享 filler',
            exception: '无',
          },
          extra: { items: w.items, default_content: w.defaultContent, only_overdue: w.onlyOverdue },
          message,
        });
        return {
          data: { items: w.items, total: w.items.length, defaultContent: w.defaultContent, onlyOverdue: w.onlyOverdue },
          exit: 0,
          deliver: { html: fillMemoPage('wish_complete', payload), stem: '心愿完成向导' },
        };
      }
      const items = listNotes(db).filter((n) => n.category === '心愿').filter((n) => dueMatches(n, params));
      return ok({ items, total: items.length });
    }
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
      return { data: r.receipt, exit: r.exit, deliver: { html: fillMemoPage('sync_report', payload), stem: '同步报告' } };
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
      // #665 飞书授权引导（三步非阻塞，Q4 批新增 key）：init／qr／poll＋status 诊断。
      // #666 自检 sentinel：step:'diag'（显式诊断，D-03 任务半场）。
      const step = params.step === undefined ? 'status' : String(params.step);
      if (step === 'init') {
        const brand = params.brand === undefined ? 'feishu' : String(params.brand);
        return ok({
          ok: true,
          message: '授权已发起：在浏览器打开链接或扫码，完成后调 step poll 续轮询',
          step: 'init',
          ...authInit(brand),
        });
      }
      if (step === 'qr') {
        if (typeof params.url !== 'string' || params.url.length === 0) fail(2, 'qr 须给 url（init 回的 verification_url）');
        const qrPath = authQr(params.url as string, params.outDir === undefined ? undefined : String(params.outDir));
        return ok({ ok: true, message: '二维码已生成', step: 'qr', qrPath });
      }
      if (step === 'poll') {
        if (typeof params.deviceCode !== 'string' || (params.deviceCode as string).length === 0) {
          fail(2, 'poll 须给 deviceCode（init 回的 device_code，过期请重走 init）');
        }
        const domain = params.domain === undefined ? 'task' : String(params.domain);
        return ok({ ok: true, message: '授权续轮询完成', step: 'poll', ...authPoll(params.deviceCode as string, domain) });
      }
      if (step === 'status') {
        return ok({ ok: true, message: '授权状态', step: 'status', ...authStatus() });
      }
      if (step === 'diag') {
        // #666 自检 sentinel（D-03 任务半场）：显式才跑；默认四步不碰它，零写。
        const r = runSentinel(params.dryRun === true ? { dryRun: true } : undefined);
        return { data: r.receipt, exit: r.exit };
      }
      fail(2, 'step 只认 init/qr/poll/status/diag');
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
  // #661：合成写「最终没达成」时回执照打、退出码在写完回执之后落实（分字段是回执的本分，不能因为非 0 就吞掉）。
  let writeExit = 0;
  try {
    // #229：`memo.help.lookup` 在**开库之前**分派（只读页不建库）；其余键照旧走 dispatch。
    // #665：开的是老库文件（直连，不建库）；用完即关，失败也关。
    const help = o.key === 'memo.help.lookup' ? dispatchHelp(params, dbPath) : null;
    let db: MemoDb | null = null;
    let out: DispatchOut;
    try {
      if (help === null) {
        db = openMemoDb(dbPath);
        out = dispatch(o.key, params, db);
      } else {
        out = { data: help.data, exit: 0 };
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
  // #661：本地那一侧成了、远端那一侧没成 ⇒ 回执已分字段写明，退出码仍要如实反映「这一趟没达成」（契约 A3／A6）。
  if (writeExit !== 0) {
    console.error('ERR ' + writeExit + ': 合成写没达成（本地侧已落，远端侧见回执 remote 那一格）');
    process.exit(writeExit);
  }
}

await main();
