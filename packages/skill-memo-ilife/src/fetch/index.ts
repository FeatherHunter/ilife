/** 搬迁期**转发门**（#855）：本件在搬迁批次 B 里只做转发，收尾批与 `src/policy/index.ts` 一起撤。
 *
 * 一条事实都不住这儿——库连接住 `db/readonly.ts`、落点算式住 `shared/paths.ts`、
 * 提醒行存取住 `remind/store.ts`、批量改分类取数住 `memo/batch.ts`、
 * 飞书链与只读诊断与自检住 `sync/{feishu,auth,sentinel}.ts`、飞书任务域住 `wish/{tasks,taskWrite}.ts`。
 */
export { MemoFetchError, MemoPolicyError } from '../shared/errors.js';
export { DEFAULT_DB_FILENAME, DEFAULT_HTML_DIR_NAME, dbFilename, dbDirOf, resolveDbDir, dbFileOf, htmlDirOf, mediaDirOf, resolveMediaDirPath, resolveDbPath, resolvedMemoPaths } from '../shared/paths.js';
export type { MemoResolvedPaths } from '../shared/paths.js';
export {
  openMemoDb,
  closeMemoDb,
  memoDbFile,
  listNotes,
  getNote,
  searchNotes,
  searchNotesByCreatedRange,
  addNote,
  updateNote,
  removeNote,
  listReminderRows,
  getReminderRow,
  addReminderRow,
  setReminderRow,
  removeReminderRowsOfNote,
  countReminderRowsOfNote,
} from '../db/readonly.js';
export type { MemoNote, MemoReminder, MemoDb, AddNoteInput, AddReminderInput, NotePatch } from '../db/readonly.js';
export {
  abandonReminder,
  checkDueReminders,
  listCompletedReminders,
  REMIND_ADVANCE_MINUTES,
  REMIND_CRON_INTERVAL_MINUTES,
  REMIND_GRACE_MINUTES,
} from '../remind/store.js';
export type { DueReminder, CompletedReminder } from '../remind/store.js';
export { collectBatchItems, countNotesByCategory, applyBatchCategory } from '../memo/batch.js';
export type { BatchItem, BatchApplyResult } from '../memo/batch.js';
export { authStatus } from '../sync/auth.js';
export { findLarkCli, runLark, larkVersion, authOpenId, checkScope, larkReady, larkTierInfo, larkSetupInfo, LARK_DEFAULT_TIMEOUT_MS, LARK_WISH_SCOPE, LARK_WEBSITE_URL, LARK_WEBSITE_LINE, LARK_INSTALL_PROMPT } from '../sync/feishu.js';
export type { LarkRunOk, LarkRunDenied, LarkReady, LarkTier, LarkTierInfo, LarkSetupInfo } from '../sync/feishu.js';
// #661：飞书任务域（心愿的远端那一侧）——读三件＋写五件，argv 形状照老 `feishu_sync.py`。
export { listRelatedTasks, searchTasks, taskDueDate } from '../wish/tasks.js';
export type { RemoteTask } from '../wish/tasks.js';
export { createTask, updateTask, clearTaskDue, completeTask, deleteTask, taskTitle, TASK_TITLE_MAX } from '../wish/taskWrite.js';
export type { CreateTaskInput } from '../wish/taskWrite.js';
// #666：飞书任务域自检 sentinel（D-03 任务半场）——显式诊断才跑，本地零写。
export { runSentinel, SENTINEL_PREFIX } from '../sync/sentinel.js';
export type { SentinelReceipt, SentinelStep } from '../sync/sentinel.js';
