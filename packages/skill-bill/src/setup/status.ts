/** 开始使用域的**初始化状态**事实（`op=init-status`，`t685-按域页型表.md` §2.7 的「记录列表」页型里那一支状态页）。
 *
 * 老侧对应件：`开始使用/init_status.html:140-147`（英雄区 ＋ 检查清单 ＋ 迁移块 ＋ 引导块）与
 *   `scripts/setup/cli.py` 的 `cmd_init_status`。三重判定＝**数据存在／结构版本／就绪**；
 *   迁移提示**独立成块**（`#688` §二 C11：`schema` 迁移有专属样式块与「需要迁移」标题，不混进普通检查项）。
 *
 * 一处与老侧不同的口径（记在 `docs/skills/skill-bill/t731-差异表.md`）：老侧靠「读 schema 版本号再自己迁移」，
 *   本仓的库句柄在打开时就把 v1.0 的老库补成 v2.0（`src/fetch/db.ts` 的 DDL 自愈）——补了什么**当面报出来**
 *   （`BillDb.repaired`），所以迁移块报的是「本次补了什么」这一件真事实，而不是一句无人看见的提示。
 */
import type { BillDb } from '../fetch/index.js';

/** 一条检查项（三重判定里的一重）。 */
export interface StatusCheck {
  readonly label: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** 初始化状态的全部事实（状态页与出口载荷都读这一件）。 */
export interface SetupStatus {
  readonly dbPath: string;
  /** 库文件在不在（老侧第一重：数据存在）。 */
  readonly dbExists: boolean;
  /** `bills` 表在不在（表不在＝这个位置还不是一个记账库）。 */
  readonly tableExists: boolean;
  /** 表里的列名（结构版本的判据）。 */
  readonly columns: readonly string[];
  /** 库里有几条记录（含软删；0 是真实读数，照实写 0）。 */
  readonly rows: number;
  /** 结构版本：`v2.0`＝十列齐（含 `deleted_at`）、`v1.0`＝缺那一列、`—`＝表还没建。 */
  readonly version: string;
  /** 三重全过＝可以开始记账。 */
  readonly ready: boolean;
  readonly checks: readonly StatusCheck[];
  /** 本次打开库时自动补的东西（空数组＝结构本来就是齐的）。 */
  readonly repaired: readonly string[];
  /** 结构仍不是 v2.0（`deleted_at` 缺着）＝需要迁移。 */
  readonly needsMigration: boolean;
  /** 表在但一条记录都没有（空库两态里的「库里没数据」，与「窗口为空」不是一件事）。 */
  readonly emptyLibrary: boolean;
}

/** v2.0 的判据列（老侧 `bills` 十列里唯一区分两代结构的那一列）。 */
export const V2_MARKER_COLUMN = 'deleted_at';

/** `bills` 十列（v2.0 的全集；缺哪一列就在状态页上点名）。 */
export const BILLS_COLUMNS: readonly string[] = [
  'id', 'category', 'time', 'amount', 'account', 'ledger', 'currency', 'note', 'created_at', 'deleted_at',
];

function columnsOf(db: BillDb): readonly string[] {
  try {
    const rows = db.db.prepare('PRAGMA table_info(bills)').all() as { name: string }[];
    return rows.map((r) => r.name);
  } catch { return []; }
}

function countOf(db: BillDb): number {
  try {
    const rows = db.db.prepare('SELECT COUNT(*) AS n FROM bills').all() as { n: number | bigint }[];
    return rows.length === 0 ? 0 : Number(rows[0].n);
  } catch { return 0; }
}

/** 读一次初始化状态（只读：不建目录、不写文件、不改结构——结构自愈发生在开库那一步，本件只报）。 */
export function readSetupStatus(db: BillDb): SetupStatus {
  const columns = columnsOf(db);
  const tableExists = columns.length > 0;
  const rows = tableExists ? countOf(db) : 0;
  const missing = BILLS_COLUMNS.filter((c) => !columns.includes(c));
  const version = !tableExists ? '—' : missing.length === 0 ? 'v2.0' : 'v1.0';
  const ready = tableExists && missing.length === 0;
  const checks: readonly StatusCheck[] = [
    {
      label: '数据存在',
      ok: true,
      detail: '库文件在（' + db.path + '）；这个库里现有记录 ' + String(rows) + ' 条',
    },
    {
      label: '结构版本',
      ok: version === 'v2.0',
      detail: version === 'v2.0'
        ? '就是当前版本（十列齐）'
        : '还是老结构，缺' + (missing.length === 0 ? '版本标记' : '「' + missing.join('」「') + '」'),
    },
    {
      label: '就绪',
      ok: ready,
      detail: ready
        ? '能打开、能读、结构是当前版本——可以开始记账'
        : '还不能用：先把结构补成当前版本（跟助手说一遍「初始化」）',
    },
  ];
  return {
    dbPath: db.path,
    dbExists: true,
    tableExists,
    columns,
    rows,
    version,
    ready,
    checks,
    repaired: db.repaired,
    needsMigration: tableExists && missing.includes(V2_MARKER_COLUMN),
    emptyLibrary: tableExists && rows === 0,
  };
}
