/** 备忘域 · **命令的运行件**（票 #855：域逻辑搬回本域，出口只查表调用）。
 *
 * 五条命令逐字从 `src/cli/cmd_read.ts` 搬来：
 *   - `memo.create`：增删改参数校验 → 心愿合成写（本地 ＋ 飞书任务一次成）→ 通用回执页缺省落盘；
 *   - `memo.update`：批量排期／完成心愿原子转换／字段改三支（情绪日记那条走通用回执页）；
 *   - `memo.remove`：废弃提醒分支 ＋ 删除分层闸（单条无关联直删／有关联先清单／批量一律先清单）；
 *   - `memo.batch`：收集（出向导页）／执行（逐条改分类）两支；
 *   - `memo.stats`：全表计数（读，无唤醒词）。
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 *
 * 下面的辅助件（`asIds`／`delete*Of` 三件）只有本域的五条命令在用，随命令一起搬——不留第二份；
 * 页装配那三件（`noteIdOfMessage`／`receiptOptsOf`／`buildReceipt`）住同域 `./receiptPage.js`（#829 拆出，
 * 理由见该件件头：`run.ts` 触到 350 行告警线，而分派与页装配本就是两件活）。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { fail } from '../shared/exit.js';
import { toRows } from '../shared/rows.js';
import type { MemoDb, NotePatch } from '../db/readonly.js';
import { getNote, listNotes, listReminderRows } from '../db/readonly.js';
import { abandonReminder } from '../remind/index.js';
import { applyBatchCategory, collectBatchItems, countNotesByCategory } from './batch.js';
import { needId } from '../shared/validators.js';
import { normalizeSub, normalizeTop } from './category.js';
import { crudCreate, crudRemove, crudUpdate } from './crud.js';
import { normalizeMediaPath } from './media.js';
import { completeWish, dueForCategory, ensureWish, removeWish, setWishDue, updateWish, wishReceiptFor } from '../wish/index.js';
import { buildReceiptPage, changeCategorySnapshot, fillMemoPage, pageEnvelope } from '../render/index.js';
import type { ReceiptScene } from '../render/index.js';
import { buildReceipt, noteIdOfMessage, receiptOptsOf } from './receiptPage.js';
import { memoBatchResultPage, memoCreatePage, memoRemovePage, memoUpdatePage } from './receipt.js';
import { bookletFileStem } from '../help/booklet.js';
import type { WishReceipt } from '../wish/index.js';

function asIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) fail(2, 'ids 须为非空数组');
  return value.map((v) => needId(v, 'ids'));
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

/** `memo.create`：参数校验 → 心愿合成写 → 通用回执页缺省落盘。 */
export function runCreate(params: Record<string, unknown>, db: MemoDb): CommandOut {
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
  const created = createdId === null ? null : getNote(db, createdId);
  // #828：要求建提醒的那一趟（`记提醒`，路由断言 `needs: ['remindAt']`）落提醒域那一格；其余仍是「记备忘／记心愿」。
  // 两步合一（添笔记 ＋ 设提醒）不出第三条路，`#837` Q⑥ 已定：不开新键、也不给 create 补参数。
  if (created !== null && params.remindAt !== undefined && params.remindAt !== null && params.remindAt !== '') {
    const o = receiptOptsOf(created);
    return { data: r.receipt, exit: r.exit, deliver: buildReceipt('memo_remind_with_note', '记提醒', r.receipt, { ...o, summary: [...o.summary, '提醒时间：' + String(params.remindAt), '重复：' + (params.repeatType === undefined ? '一次性' : String(params.repeatType))] }) };
  }
  // #829：分类＝心愿 ⇒ 本域那一格（`记心愿`）；不是即别家那格（情绪日记）。
  if (created !== null && created.category === '心愿') {
    return { data: r.receipt, exit: r.exit, deliver: wishReceiptFor('memo_add_wish', '记心愿', r.receipt, created) };
  }
  // #826：分类＝备忘 ⇒ 本域那一格（`记备忘`，册子 seq 1）；打卡那支归 #830，本件不动它。
  const memo = memoCreatePage(r.receipt, created);
  if (memo !== undefined) {
    return { data: r.receipt, exit: r.exit, deliver: memo };
  }
  return {
    data: r.receipt,
    exit: r.exit,
    deliver: buildReceipt('memo_add_mood', '记情绪', r.receipt, createdId === null ? { entityLabel: '情绪日记', entityId: '未新建', summary: ['本次未新建笔记'] } : receiptOptsOf(getNote(db, createdId))),
  };
}

/** `memo.update`：批量排期／完成心愿原子转换／字段改三支（情绪日记走通用回执页）。 */
export function runUpdate(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // 批量排期（老 `set-due`）：一批 id ＋ 一个排期日期（空值＝清期），走心愿那条合成写。
  if (params.ids !== undefined) {
    const r = setWishDue(db, { ids: asIds(params.ids), due: params.due });
    // #829：批量排期是**心愿类场景**（`心愿排期`），回执页归本域（册子 seq 19）；不指向单条，
    // 故主对象那一格写批次数，记账进明细（错误逐条列出，不静默）。
    const errors = r.receipt.errors ?? [];
    return {
      data: r.receipt,
      exit: r.exit,
      deliver: wishReceiptFor('memo_wish_schedule', '心愿排期', r.receipt, null, {
        entityLabel: '心愿批次',
        entityId: r.receipt.updated,
        extraSummary: ['本地更新 ' + r.receipt.updated + ' 条', '远端同步 ' + r.receipt.feishuSynced + ' 条', '跳过 ' + r.receipt.skipped + ' 条'],
        extraSections: errors.length === 0 ? [] : [{ heading: '没做成的', rows: [...errors] }],
      }),
    };
  }
  const id = crudUpdate(params).id;
  // #829：这一次动的那一行（权威）——`done` 那支完成后心愿就没了，故必须**动手之前**取。
  const before = getNote(db, id);
  const isWish = before.category === '心愿';
  // 完成心愿走原子转换（老 `complete-wish`：删心愿 ＋ 生成打卡；`content` 即打卡内容，缺省拷贝心愿原文）。
  if (params.done === true) {
    const r = completeWish(db, { id, content: params.content });
    if (isWish) {
      return { data: r.receipt, exit: r.exit, deliver: wishReceiptFor('memo_complete_wish', '完成心愿', r.receipt, before) };
    }
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
  // #829：心愿那条走本域的页（`改心愿`，册子 seq 22）。
  if (after.category === '心愿') {
    return { data: r.receipt, exit: r.exit, deliver: wishReceiptFor('memo_update_wish', '改心愿', r.receipt, after) };
  }
  if (after.category === '情绪日记') {
    return { data: r.receipt, exit: r.exit, deliver: buildReceipt('memo_update_mood', '改情绪', r.receipt, receiptOptsOf(after)) };
  }
  // #826：纯分类补丁→单条改分类（seq 4）／纯子分类补丁→改子分类（seq 5）／备忘行字段改→改备忘（seq 2）。
  const memo = memoUpdatePage(r.receipt, after, Object.keys(patch));
  if (memo !== undefined) {
    return { data: r.receipt, exit: r.exit, deliver: memo };
  }
  return { data: r.receipt, exit: r.exit };
}

/** `memo.remove`：废弃提醒分支 ＋ 删除分层闸（单条无关联直删／有关联先清单／批量一律先清单）。 */
export function runRemove(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // 废弃提醒（老 `dismiss`）：按提醒 id 标 dismissed，笔记保留。
  if (params.mode === 'abandon') {
    const rid = needId(params.id, '废弃提醒');
    abandonReminder(db, rid);
    return { data: { ok: true, message: '提醒已废弃（笔记保留）：' + rid }, exit: 0 };
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
    // #829：心愿那条走本域的页（`删心愿`，册子 seq 21）——同样是删前那一行作权威。
    if (before.category === '心愿') {
      return { data: w.receipt, exit: w.exit, deliver: wishReceiptFor('memo_delete_wish', '删心愿', w.receipt, before) };
    }
    if (before.category === '情绪日记') {
      return { data: w.receipt, exit: w.exit, deliver: buildReceipt('memo_delete_mood', '删情绪', w.receipt, receiptOptsOf(before)) };
    }
    // #826：删前那一行分类＝备忘 ⇒ 本域那一格（`删备忘`，册子 seq 3）；打卡那支归 #830。
    const memo = memoRemovePage(w.receipt, before);
    if (memo !== undefined) {
      return { data: w.receipt, exit: w.exit, deliver: memo };
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

/** `memo.batch`：收集（出向导页）／执行（逐条改分类）两支。 */
export function runBatch(params: Record<string, unknown>, db: MemoDb): CommandOut {
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
      // #826：执行支的结果页（册子 seq 6，主体 `备忘改分类-批量`）；数据那一格仍是老形状（只多 `deliver`）。
      deliver: memoBatchResultPage({ updated: r.updated, skipped: r.skipped, errors: r.errors, from, to }),
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
    // #826：过程页主体按册子取（seq 31 `备忘改分类-批量-向导`）；模板仍是本域这张向导页（主体名由域票填，#848 证据 §没碰什么）。
    deliver: { html: fillMemoPage('change_category', payload), stem: bookletFileStem('memo_batch_change_category', '过程页') },
  };
}

/** `memo.stats`：全表计数（读，无唤醒词；处置归 #842 后仍保留此读口）。 */
export function runStats(params: Record<string, unknown>, db: MemoDb): CommandOut {
  void params;
  const all = listNotes(db);
  const metrics: Record<string, number> = { count: all.length };
  for (const n of all) metrics['cat.' + n.category] = (metrics['cat.' + n.category] || 0) + 1;
  return { data: { metrics }, exit: 0 };
}
