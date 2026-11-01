/** `bill.account.write`（账户管理）的处理体：三支操作（新增／修改／转账）。
 *
 * 谁在用（一个调用点，指名）：`src/account/commands.ts` 那条命令声明引本件——
 *  出口分派 `src/cli/cmd_read.ts` 只查注册表再调域门，不再认这个命令名。
 *
 * 两支的分岔口径（照写入域两条写命令的同一套规矩）：
 *   **有阻断项不再报参数错退出**，改出过程型页（新增／转账出采集页、改账户出确认页），退出码 0、
 *   `ok:false`、不写库；阻断项＝缺必需槽位、值进不去（金额非正数／两个账户相同／时间形态不认／名字过长／
 *   「改成什么」没给），**或**账户表那一层的冲突（新增撞重名、改账户找不到那个账户）。
 *   阻断项清空即写库：新增与改名动 `goals.json` 的账户表（改名连带 `bills.account`），
 *   转账往 `bills` 落两笔；三支都出结果型回执整页。
 *
 * 老侧对应件：`scripts/account/cli.py` 的 `cmd_add`／`cmd_update`／`cmd_transfer`。
 *  三处行为差异逐条记在 `docs/skills/skill-bill/t691-差异表.md`（其中两处最要紧）：
 *   ① 老侧「找不到账户／重名」是一句 `ValueError` 直接退出（exit 2／4），新侧出**阻断页**（exit 0、不写库）；
 *   ② 老侧转账备注写 `#转账 转出至X`／`#转账 转入自Y`，新侧逐字同形（搬迁前那份过渡实现写成
 *      `#转账（转出）`／`#转账（转入）`，随本票改回老侧原样）。
 */
import { currentRenderLanguage } from 'base-entries';
import { loadGoals, resolveGoalsPath, saveGoals } from '../fetch/index.js';
import type { BillDb } from '../fetch/index.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { totalChanges } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { BillKey } from '../triggers/routeSpec.js';
import { accountsOf, appendAccount, applyAccountUpdate, findAccount, writeTransfer } from './accounts.js';
import type { AccountRow } from './accounts.js';
import { promptOf, sourceCollect, sourceWrite } from './pageParts.js';
import {
  accountBlocked, accountSlots, hasChange, needAccountName, parseAccountOp, textOf, validateTransfer,
} from './params.js';
import type { AccountBlocked, AccountOp } from './params.js';
import { writeSceneFor } from './scene.js';
import type { AccountReceipt, AccountWriteScene } from './scene.js';
import { m } from '../entries/index.js';

/** 本次执行时刻（本地时钟；页面与回执都读它）。 */
function nowStamp(): string {
  return actionStamp();
}

/** 账户表那一层的阻断：新增撞重名（老侧 `cli.py:97-99` 的冲突）、改账户找不到那一个（老侧 `cli.py:148-150`）。 */
function tableBlockedOf(op: AccountOp, params: Record<string, unknown>, accounts: readonly AccountRow[]): readonly AccountBlocked[] {
  const name = textOf(params['name']);
  if (name === '') return [];
  const hit = findAccount(accounts, name) !== null;
  if (op === 'add' && hit) return [{ name: 'name', label: m('skill-bill.account-write.c001'), why: m('skill-bill.account-write.c002') }];
  if (op === 'update' && !hit) return [{ name: 'name', label: m('skill-bill.account-write.c003'), why: m('skill-bill.account-write.c004') }];
  return [];
}

/** 有阻断项时的载荷说明（envelope 的 `message`；也是 stdout 上那句 `data.message`）。 */
function blockedMessageOf(op: AccountOp, blocked: readonly AccountBlocked[]): string {
  const word = projectWakeWord({ key: 'bill.account.write', op });
  // #1212 手工处置：链内条件抽局部变量（确认页／采集页），整句才交给迁移器。
  const pageText = op === 'update' ? m('skill-bill.account-write.c005') : m('skill-bill.account-write.c006');
  return m('skill-bill.account-write.c007', {
    p0: String(word),
    p1: String(String(blocked.length)),
    p2: String(blocked.map((b) => b.label).join('、')),
    p3: String(pageText),
  });
}

/** 三支操作共用的收口：回执事实 ＋ 回执整页。 */
function finish(input: {
  readonly key: string;
  readonly op: AccountOp;
  readonly params: Record<string, unknown>;
  readonly scene: AccountWriteScene;
  readonly db: BillDb;
  readonly before: number;
  readonly goalsAccounts: readonly AccountRow[];
  readonly summary: string;
  readonly detail: readonly { readonly k: string; readonly v: string }[];
  readonly noChange: boolean;
  readonly renamedRows: number;
  readonly beforeRow: AccountRow | null;
  readonly afterRow: AccountRow | null;
}): WriteOut {
  const receipt: AccountReceipt = {
    op: input.op,
    summary: input.summary,
    affectedRows: affectedRowsOf(input.op, input.db, input.before, input.renamedRows),
    actionAt: nowStamp(),
    source: sourceWrite(),
    noChange: input.noChange,
    accountCount: input.goalsAccounts.length,
    renamedRows: input.renamedRows,
    before: input.beforeRow,
    after: input.afterRow,
  };
  return {
    data: { ok: true, message: input.summary, receipt },
    page: { wakeWord: projectWakeWord({ key: input.key as BillKey, op: input.op }), kind: 'receipt' },
    html: input.scene.receipt({
      key: input.key, params: input.params, receipt, detail: input.detail, accounts: input.goalsAccounts,
    }),
  };
}

/** 这一次改动落在几处（回执页「改了账本里几处」那一格与复制日志都读它）。
 *
 *  **两种口径，按事实源分**（本域的一处特殊情况，写在这里免得后人以为写错了）：
 *    - 转账：走 SQLite 的 `total_changes()` 前后差（**非自报**，与写入域两条写命令同一口径）——恒 2；
 *    - 新增／改账户：**自报** 1 ＋ 级联改名的历史流水笔数。理由是**账户表不住 SQLite**：
 *      它是 `goals.json` 顶层 `accounts` 键（老侧 `db.py:find_db_path` 同款载体），没有计数器可读，
 *      而把「账户表那一处」漏掉只报流水的话，用户会以为这次没改到账户本身。 */
function affectedRowsOf(op: AccountOp, db: BillDb, before: number, renamedRows: number): number {
  if (op === 'transfer') return totalChanges(db.db) - before;
  return 1 + renamedRows;
}

/** 账户那一行写成明细表的行（新增与改账户共用；状态按改后的事实写）。 */
function accountDetail(row: AccountRow): readonly { readonly k: string; readonly v: string }[] {
  return [
    { k: m('skill-bill.account-write.c008'), v: row.name },
    { k: m('skill-bill.account-write.c009'), v: row.type.trim() === '' ? '—' : row.type },
    { k: m('skill-bill.account-write.c010'), v: row.disabled ? m('skill-bill.account-write.c011') : m('skill-bill.account-write.c012') },
  ];
}

/** `bill.account.write`：账户管理的三支操作，一处分流。 */
export function writeAccount(params: Record<string, unknown>, db: BillDb): WriteOut {
  const key = 'bill.account.write';
  const op = parseAccountOp(params);
  const scene = writeSceneFor(op, currentRenderLanguage());
  const goalsPath = resolveGoalsPath();
  const goals = loadGoals(goalsPath);
  const accounts = accountsOf(goals);
  const blocked = [...accountBlocked(op, params), ...tableBlockedOf(op, params, accounts)];
  if (blocked.length > 0) {
    return {
      data: { ok: false, message: blockedMessageOf(op, blocked) },
      page: { wakeWord: projectWakeWord({ key: key as BillKey, op }), kind: 'collect' },
      html: scene.collect({
        key, op, params, blocked, accounts, source: sourceCollect(), actionAt: nowStamp(),
      }),
    };
  }
  const before = totalChanges(db.db);
  if (op === 'add') {
    const name = needAccountName(params);
    const type = textOf(params['type']);
    const row = appendAccount(goals, { name, type, createdAt: nowStamp() });
    saveGoals(goalsPath, goals);
    return finish({
      key, op, params, scene, db, before, goalsAccounts: accountsOf(goals),
      summary: m('skill-bill.account-write.c013', { p0: String(row.name), p1: String(String(goals.accounts.length)) }),
      detail: accountDetail(row), noChange: false, renamedRows: 0, beforeRow: null, afterRow: row,
    });
  }
  if (op === 'update') {
    const name = needAccountName(params);
    const next = textOf(params['new-name']);
    const applied = applyAccountUpdate(db, goals, {
      name, newName: next, disable: params['disable'] === true, enable: params['enable'] === true,
    });
    saveGoals(goalsPath, goals);
    const changes: string[] = [];
    if (applied.before.name !== applied.after.name) {
      changes.push(m('skill-bill.account-write.c014', {
        p0: String(applied.before.name),
        p1: String(applied.after.name),
        p2: String(String(applied.renamedRows)),
      }));
    }
    if (applied.before.disabled !== applied.after.disabled) {
      changes.push(applied.after.disabled ? m('skill-bill.account-write.c015') : m('skill-bill.account-write.c016'));
    }
    if (changes.length === 0) changes.push(m('skill-bill.account-write.c017'));
    return finish({
      key, op, params, scene, db, before, goalsAccounts: accountsOf(goals),
      /* #1131：判地店头那一行只写改名这一件（「已改名「旧」→「新」」）；
         连带笔数在核对段「编号」行、停用／启用的说法在明细与复制日志里，都不丢。 */
      summary: applied.before.name !== applied.after.name
        ? m('skill-bill.account-write.c018', {
          p0: String(applied.before.name),
          p1: String(applied.after.name),
        })
        : m('skill-bill.account-write.c019', { p0: String(applied.after.name), p1: String(changes.join('；')) }),
      detail: accountDetail(applied.after),
      noChange: applied.before.name === applied.after.name && applied.before.type === applied.after.type
        && applied.before.disabled === applied.after.disabled,
      renamedRows: applied.renamedRows, beforeRow: applied.before, afterRow: applied.after,
    });
  }
  const { amount, from, to, time } = validateTransfer(params);
  const at = time ?? nowStamp();
  const ids = writeTransfer(db, { amount, from, to, time: at });
  return finish({
    key, op, params, scene, db, before, goalsAccounts: accounts,
    summary: m('skill-bill.account-write.c020', { p0: String(from), p1: String(to), p2: String(amount.toFixed(2)) }),
    detail: [
      { k: m('skill-bill.account-write.c021', { p0: String(from) }), v: m('skill-bill.account-write.c022', {
        p0: String(String(ids.outId)),
        p1: String(amount.toFixed(2)),
        p2: String(at),
      }) },
      { k: m('skill-bill.account-write.c023', { p0: String(to) }), v: m('skill-bill.account-write.c024', {
        p0: String(String(ids.inId)),
        p1: String(amount.toFixed(2)),
        p2: String(at),
      }) },
    ],
    noChange: false, renamedRows: 0, beforeRow: null, afterRow: null,
  });
}

/** 采集口令那一段的取值为外部测试留的一个口（缺项时页上那条口令照这个形状给）。
 *  **本件不自己拼文案**：口径住 `./pageParts.js`，这里只是转出去给测试按同一处取。 */
export { promptOf as accountPromptOf } from './pageParts.js';

/** 有改动才叫改动（`hasChange` 由 `./params.js` 一处定义；本件不重判一遍）。
 *  转出去是给测试用的：三支操作「改成什么给了没有」的判据只有一处。 */
export { hasChange as accountHasChange } from './params.js';

/** 一条命令要哪些槽位（三支操作各一份；转出给测试与页面同取一处）。 */
export { accountSlots };
