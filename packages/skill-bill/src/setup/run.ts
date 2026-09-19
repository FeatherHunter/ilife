/** `bill.setup.run`（开始使用）的处理体：**六种 op 一处分流** ＋ 四条「零决策」op 的活。
 *
 * 谁在用（一个调用点，指名）：`./commands.js` 那条命令声明引本件——出口分派 `src/cli/cmd_read.ts`
 *   只查注册表再调声明里的 `run`，不认这个命令名（#691 起「入口跟着声明走」）。
 *
 * **本件住哪四条 op**：初始化（`./init` 的做派：环境检测 → 数据目录 → 建库自愈 → 真跑一次读）、
 *   初始化状态（三重判定＋迁移块）、一键备份、查看备份。另外两条**各住自己的件**——
 *   恢复（`./restore.js`）与导入（`./import.js` 那一条：CSV）——因为它们各自带着一整套安全顺序
 *   （D1 三件套／D2 四件），与本件的四条只读／幂等 op 不是同一批改动。
 *
 * 六种 op 与三片页型的对应写在 `./params.js` 的 `PAGE_OF_OP`；每条 op 的差异值住它那一件场景件。
 * 本件只做三件事：**取数（库／备份目录）→ 按 op 的规矩动或不动数据 → 交给对应页型出整页**。
 *
 * **出口载荷的形状**（一处口径，六条 op 同形）：`data = { ok, message, receipt }`——
 *   `ok`／`message` 是 `base-link-core` 的 `receipt` 形必填的两格；`receipt` 是本域自己的事实
 *   （哪种 op、报了什么读数），页面内置 envelope 与出口载荷**同源**（同一个对象摊开两处用），
 *   与写入域／账户域「`receipt` 那一格的形状由各域自己定」同一条口径（`src/shared/commandSpec.ts`）。
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BillDb } from '../fetch/index.js';
import { resolveBackupDir, resolveGoalsPath } from '../fetch/paths.js';
import { actionStamp } from '../shared/copyArea.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { backupStampOf, createBackup, humanBytes, listBackups } from './backups.js';
import type { BackupEntry } from './backups.js';
import { blockedWizardDoc } from './blocked.js';
import { parseSetupOp, setupBlocked } from './params.js';
import type { SetupOp } from './params.js';
import { receiptEnvelopeOf } from './pageParts.js';
import { runImport } from './import.js';
import { runRestore } from './restore.js';
import { setupSceneFor } from './scene.js';
import { initSteps } from './steps.js';
import { readSetupStatus } from './status.js';
import { backupReceiptDoc } from './template-receipt.js';
import { listDoc } from './template-list.js';
import { wizardDoc } from './template-wizard.js';

/** 目录可写探测（老侧 `cli.py:111-125` 的 `.write_probe` 同法：真写一个再删，不凭猜）。 */
function dirWritable(dir: string): boolean {
  const probe = join(dir, '.write_probe');
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(probe, 'ok', 'utf8');
    return true;
  } catch { return false; } finally {
    try { rmSync(probe, { force: true }); } catch { /* 删不掉不影响「写得进」这个结论 */ }
  }
}

/** 运行环境那一项（与出口预检同一条线：node ≥ 22.13）。 */
function nodeOk(): boolean {
  const v = process.versions.node.split('.').map(Number);
  return (v[0] as number) > 22 || ((v[0] as number) === 22 && (v[1] as number) >= 13);
}

/** 真跑一次读（`SELECT 1` ＋ 数一遍 bills）——老侧把那句「SELECT 1 ✓ · bills 表 ✓」写死在文案里，
 *  实际只跑了 `PRAGMA table_info` 与 `SELECT COUNT(*)`（`cli.py:252-253/262`）；新侧真跑真报。 */
function verifyReadable(db: BillDb): boolean {
  try {
    db.db.prepare('SELECT 1 AS one').all();
    db.db.prepare('SELECT COUNT(*) AS n FROM bills').all();
    return true;
  } catch { return false; }
}

/** 记第一笔那句口令（老侧 `init_wizard.html:158` 逐字同句：初始化完成后顺势推进到下一步，`#688` §二 D3）。 */
const NEXT_RECORD_PROMPT = '请加载「饼干记账」技能,帮我记一笔支出(唤醒词:记支出):\n\n'
  + '  分类: ____(如:餐饮/外卖/午餐)\n  金额: ____(支出为负)\n  备注: ____(选填)';

/** 初始化（`op=init`）：环境检测 → 数据目录 → 建库自愈 → 真跑一次读。**幂等**，重复跑安全。 */
function runInit(db: BillDb, key: string, params: Record<string, unknown>): WriteOut {
  const scene = setupSceneFor('init');
  const dir = dirname(db.path);
  const status = readSetupStatus(db);
  const writable = dirWritable(dir);
  const envChecks = [
    { label: '运行环境', ok: nodeOk(), detail: 'node ' + process.versions.node + '（要 22.13 以上）' },
    { label: '数据目录', ok: writable, detail: dir + (writable ? '（可写）' : '（不可写）') },
  ];
  const verifyOk = status.tableExists && verifyReadable(db);
  const steps = initSteps({
    envCount: envChecks.length,
    envOk: envChecks.every((c) => c.ok),
    envSummary: envChecks.every((c) => c.ok) ? '两项都过了' : '有没过的项',
    dirPath: dir,
    dirWritable: writable,
    schemaOk: status.checks[1]?.ok === true,
    columns: status.columns.length,
    records: status.rows,
    verifyOk,
  });
  const ready = status.ready && verifyOk;
  const message = ready
    ? '已初始化：' + db.path + '（' + String(status.columns.length) + ' 列，现有记录 ' + String(status.rows) + ' 条）'
    : '初始化没走完：库结构还不齐（现有记录 ' + String(status.rows) + ' 条）';
  const receipt = {
    op: 'init', db_path: db.path, records: status.rows, schema_ok: ready, repaired: status.repaired,
    created: db.initialized,
  };
  const envelope = receiptEnvelopeOf(key, { ok: ready, message, ...receipt });
  const html = wizardDoc({
    op: 'init', scene, key, params, actionAt: actionStamp(), steps, envelope,
    blocked: [], prompt: ready ? NEXT_RECORD_PROMPT : scene.promptOf(params),
    promptLabel: ready ? '复制给助手：直接开始记第一笔' : '复制给助手：照这句先把初始化走完',
    envChecks, ready, dbPath: db.path, records: status.rows, created: db.initialized,
  });
  return { data: { ok: ready, message, receipt }, html };
}

/** 初始化状态（`op=init-status`）：只读三重判定 ＋ 独立的迁移块。 */
function runStatus(db: BillDb, key: string, params: Record<string, unknown>): WriteOut {
  const scene = setupSceneFor('init-status');
  const status = readSetupStatus(db);
  const message = status.ready
    ? '就绪：' + String(status.columns.length) + ' 列齐（含 deleted_at），库 ' + db.path
      + '，现有记录 ' + String(status.rows) + ' 条'
    : '未就绪：' + (status.needsMigration ? '结构还是老版本' : '这个位置还不是一个记账库') + '（' + db.path + '）';
  const receipt = {
    op: 'init-status', db_path: db.path, records: status.rows, version: status.version,
    repaired: status.repaired, ready: status.ready,
  };
  const envelope = receiptEnvelopeOf(key, { ok: status.ready, message, ...receipt });
  const html = listDoc({ op: 'init-status', scene, key, params, actionAt: actionStamp(), status, envelope });
  return { data: { ok: status.ready, message, receipt }, html };
}

/** 一键备份（`op=backup-create`）：无条件造一份，出结果回执。 */
function runBackupCreate(db: BillDb, key: string, params: Record<string, unknown>): WriteOut {
  const scene = setupSceneFor('backup-create');
  const dir = resolveBackupDir();
  const entry = createBackup({ db, dir, stamp: backupStampOf(new Date()), goalsPath: resolveGoalsPath() });
  const entries = listBackups(dir);
  const message = '已备份：' + entry.file + '（' + humanBytes(entry.bytes)
    + (entry.hasGoals ? ' ＋ 目标那一份' : '') + '）';
  const receipt = {
    op: 'backup-create', backup: entry.file, path: entry.path, time: entry.time, bytes: entry.bytes,
    has_goals: entry.hasGoals, count: entries.length,
  };
  const envelope = receiptEnvelopeOf(key, { ok: true, message, ...receipt });
  const html = backupReceiptDoc({ scene, key, params, actionAt: actionStamp(), entry, total: entries.length, envelope });
  return { data: { ok: true, message, receipt }, html };
}

/** 查看备份（`op=backup-list`）：只读列一遍目录，空目录出空态与引导。 */
function runBackupList(key: string, params: Record<string, unknown>): WriteOut {
  const scene = setupSceneFor('backup-list');
  const entries = listBackups(resolveBackupDir());
  const ok = entries.length > 0;
  const message = ok
    ? '备份 ' + String(entries.length) + ' 份，最新一份是 ' + (entries[0] as BackupEntry).time
    : '还没有备份（跟助手说一遍「备份」就会存一份）';
  const receipt = {
    op: 'backup-list', count: entries.length,
    backups: entries.map((e) => ({
      name: e.file, time: e.time, size: e.bytes, files: e.hasGoals ? '库 ＋ 目标' : '只有库',
    })),
  };
  const envelope = receiptEnvelopeOf(key, { ok, message, ...receipt });
  const html = listDoc({ op: 'backup-list', scene, key, params, actionAt: actionStamp(), entries, envelope });
  return { data: { ok, message, receipt }, html };
}

/** `bill.setup.run`：六种 op 一处分流（`op` 缺省＝初始化状态，照老出口那一支的缺省）。 */
export function setupRun(params: Record<string, unknown>, db: BillDb): WriteOut {
  const key = 'bill.setup.run';
  const op: SetupOp = parseSetupOp(params);
  // 缺必需槽位那一条只可能出在导入这一支（六种 op 里只有它有一个必填格）。
  const missing = setupBlocked(op, params);
  if (missing.length > 0) {
    const scene = setupSceneFor('import');
    const html = blockedWizardDoc({ op: 'import', scene, key, params, blocked: missing, actionAt: actionStamp() });
    const message = projectWakeWord({ key: 'bill.setup.run', op: 'import' }) + '还差 ' + String(missing.length)
      + ' 项：' + missing.map((b) => b.label).join('、') + '（已出向导页，补齐之后跟助手说一遍）';
    return { data: { ok: false, message, receipt: { op: 'import', blocked: missing } }, html };
  }
  if (op === 'init') return runInit(db, key, params);
  if (op === 'init-status') return runStatus(db, key, params);
  if (op === 'backup-create') return runBackupCreate(db, key, params);
  if (op === 'backup-list') return runBackupList(key, params);
  if (op === 'restore') return runRestore(db, key, params);
  return runImport(db, key, params);
}
