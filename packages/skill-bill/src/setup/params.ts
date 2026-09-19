/** 开始使用域的参数面（**唯一定义地**）：六种 op、每种的槽位表、缺项判定、两个开关的读法。
 *
 * 老侧对应件：`scripts/setup/cli.py` 的六个子命令 ＋ `scenes/setup.yaml` 的六条场景
 *   （`scenario_id` ＝ `setup_init_wizard`／`setup_init_status`／`setup_backup_create`／
 *   `setup_backup_list`／`setup_restore`／`setup_import`）。
 *
 * 六种 op 由**一条命令**（`bill.setup.run`）承载（域声明 `./declaration.js` 的 `preset.op` 一条一支），
 *   页面按 op 分成三片页型（向导／结果回执／记录列表，见 `./scene.js`）。本件只吃参数，不碰库与文件：
 *   备份目录里有没有那一份、CSV 文件在不在这些事实由 `./backups.js`／`./importer.js` 查，本件收它们的结果。
 *
 * 两处**开关**（本域比别的域多出来的一层，写在这里免得后人以为写错了）：
 *   - `confirm`：恢复与导入这两个**会覆盖／会新增**的 op 分两步走——不给 `confirm` 只出向导页（预览＋警告＋
 *     那一条可复制的确认口令），给了才真动数据。老侧这两条都没有闸门（`cli.py:671-679` 导入直接写、
 *     恢复也只有页面上的一个按钮），缺陷逐条记在 `docs/skills/skill-bill/t731-差异表.md`；
 *   - `mapping`：导入的列映射（`日期=第1列,金额=第3列` 这种形态）。不给＝按表头自动猜，猜的结果进向导页给用户改。
 */
import { isGiven, numberOf, textOf } from '../shared/params.js';
import { BillPolicyError } from '../fetch/errors.js';

/** 六种 op（顺序＝域声明里那五条词的书写顺序，`备份` 一词两支）。 */
export type SetupOp = 'init' | 'init-status' | 'backup-create' | 'backup-list' | 'restore' | 'import';

/** 六种 op 的取值面（`parseSetupOp` 认的就是它；导出给测试与页面共用一处）。 */
export const SETUP_OPS: readonly SetupOp[] = ['init', 'init-status', 'backup-create', 'backup-list', 'restore', 'import'];

/** 三种页型（`t685-按域页型表.md` §2.7 那三行）。 */
export type SetupPage = 'wizard' | 'receipt' | 'list';

/** op → 页型（**唯一定义地**：三片页型盖住六个场景的那张对照表）。 */
export const PAGE_OF_OP: Readonly<Record<SetupOp, SetupPage>> = {
  init: 'wizard',
  'init-status': 'list',
  'backup-create': 'receipt',
  'backup-list': 'list',
  restore: 'wizard',
  import: 'wizard',
};

/** `op` 的读法：不给＝**初始化状态**（老侧出口 `cmd_read.ts` 的老分支同一缺省）；认不得即抛，不猜。 */
export function parseSetupOp(params: Record<string, unknown>): SetupOp {
  const op = params['op'];
  if (op === undefined || op === null || op === '') return 'init-status';
  if (typeof op === 'string' && (SETUP_OPS as readonly string[]).includes(op)) return op as SetupOp;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（只认 ' + SETUP_OPS.join('／') + '）：' + JSON.stringify(op));
}

/** 一个槽位：参数名／中文名／怎么给／是否必需。 */
export interface SetupSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 一处阻断：哪一格／中文名／为什么进不去（`没给` 与值不对共用一张表）。 */
export interface SetupBlocked {
  readonly name: string;
  readonly label: string;
  readonly why: string;
}

function slot(name: string, label: string, hint: string, required: boolean): SetupSlot {
  return { name, label, hint, required };
}

/** 六个 op 的槽位表（**唯一定义地**）：字段卡照它出，缺项探针照它算。
 *  四条 op（初始化／初始化状态／一键备份／查看备份）是**零决策**的：老侧这四张页都不收参数。 */
export const SETUP_SLOTS: Readonly<Record<SetupOp, readonly SetupSlot[]>> = {
  init: [],
  'init-status': [],
  'backup-create': [],
  'backup-list': [],
  restore: [
    slot('name', '要恢复的那一份', '选填，不写就用最新的一份；写就写「查看备份」里那个文件名', false),
  ],
  import: [
    slot('file', 'CSV 文件路径', '要导入的 CSV 文件，如 D:\\账单导出.csv', true),
    slot('mapping', '列映射', '选填，不写就按表头自动认；要写就写「日期=第1列,金额=第3列」这样', false),
  ],
};

/** 两个开关的读法（**只认 `true`**：写 `"true"` 字符串不算给——参数是机器给的，不替它猜）。 */
export function confirmOf(params: Record<string, unknown>): boolean {
  return params['confirm'] === true;
}

/** 列映射原文（空白串＝没给）。 */
export function mappingOf(params: Record<string, unknown>): string {
  return textOf(params['mapping']);
}

/** 要恢复的那一份的名字（空白串＝没给，用最新的一份）。 */
export function restoreNameOf(params: Record<string, unknown>): string {
  return textOf(params['name']);
}

/** 导入的 CSV 路径（空白串＝没给）。 */
export function importFileOf(params: Record<string, unknown>): string {
  return textOf(params['file']);
}

/** 本支 op 当下缺什么、哪一格的值进不去（**空数组＝可以往下走**）。
 *
 *  这里只判**参数面**：那一份备份在不在、那个 CSV 在不在，由调用方（`./run.js`）查完再并进来
 *  ——「文件在不在」是文件系统的事实，本件不碰文件。
 *  四条零决策 op 恒空表（老侧这四张页都不收参数，也就没有缺项可言）。 */
export function setupBlocked(op: SetupOp, params: Record<string, unknown>): readonly SetupBlocked[] {
  const out: SetupBlocked[] = [];
  for (const s of SETUP_SLOTS[op]) {
    if (!s.required) continue;
    const given = s.name === 'file' ? importFileOf(params) !== '' : isGiven(params[s.name]);
    if (!given) out.push({ name: s.name, label: s.label, why: '没给' });
  }
  return out;
}

/** 一个数写成文本（留给页面与测试同一处取：金额两位小数那一族口径住各页型件）。 */
export function countOf(v: unknown): number {
  const n = numberOf(v);
  return n === null ? 0 : n;
}
