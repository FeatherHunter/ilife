/** 账户域·命令参数与槽位表（**唯一定义地**）：`bill.account.write` 的三支操作、每支要哪些槽位、
 *  缺项与「值不对」怎么报。
 *
 * 谁在用（三个调用点，指名）：
 *   ① `src/account/write.ts`——写命令处理体：拿 `accountBlocked` 当闸门（非空即出采集页、不写库），
 *      闸门放行之后才调 `validateTransfer` 做真值校验；
 *   ② `src/account/scene-{add,update,transfer}.ts`——场景件按 `ACCOUNT_SLOTS[op]` 出字段卡、
 *      按 `accountBlocked` 出缺项标签；
 *   ③ `src/account/template-form.ts`——采集页的缺项标签与口令原文读同一份阻断表。
 *
 * 老侧对应件：`scripts/account/cli.py`（add／update／transfer 三支的真值校验）与
 *  `scripts/account/render.py`（三张页的字段与文案）。三处口径按本文重摆：
 *   - **缺失与「值不对」分开**：老侧两种情况都是 `raise ValueError` 一句话（`cli.py:94-99`／`:205-212`），
 *     页上看不出缺哪一格；新侧按 #688 裁定 9 出**缺项阻断条**，逐项点名（`why` 说清为什么进不去）。
 *   - **转账金额要正数、两个账户要不同、时间要写全**：老侧这三条只在 CLI 报错
 *     （`账户/transfer_confirm.html` 一点校验都没有，空值／同账户／负数都能复制出去）；新侧提到页上，
 *     与「缺项」走同一条阻断路径。时间那条照老 `validators.py:validate_time` 的严格形态
 *     （`YYYY-MM-DD HH:MM:SS`，含真实日期校验），不悄悄收下日期串再当 0 点。「昨天」这类相对说法
 *     老侧渲染页的 placeholder 里写过、CLI 却拒收——**不照抄这个自相矛盾**，页上写的就是能过的形态。
 *   - **账户名的长度与重名**：老侧 `cli.py:95-96` 长度 ≤30、重名拒绝（文案写「重复新增需用户确认」，
 *     但并没有那条确认路径）；新侧长度上限照旧进阻断表、重名也进阻断表（页上直接告诉用户「要改它就说改账户」）。
 *
 * 中文名的落点：本表自己写（账户域的参数名 `name`／`new-name`／`disable`／`from`／`to` **不是库列名**，
 *  与写入域 `../write/userWording.js` 那张「库列名 → 中文列名」的对照表不是同一件事，故不跨域引它的件；
 *  域与域之间只经对方的 `index.ts` 门）。
 */
import { BillPolicyError } from '../fetch/errors.js';
// #731：三件值读法住共用位，本件既转出（对外面不变）又本地用（域内四处校验）。
import { isGiven, numberOf, textOf } from '../shared/params.js';

/** 一道写命令的三支操作（老侧 `account/cli.py` 的 add／update／transfer 三个子命令）。
 *  `summary` 不在这里：它是 `bill.account.query`（读命令），不在写命令的判别式里。 */
export type AccountOp = 'add' | 'update' | 'transfer';

/** 转账两笔的分类与账本（跨技能契约，冻结不动）：转出支出 ＋ 转入收入，账本＝转账。 */
export const TRANSFER_OUT_CATEGORY = '转账/转出';
export const TRANSFER_IN_CATEGORY = '转账/转入';
export const TRANSFER_LEDGER = '转账';

/** 账户名的长度上限（老侧 `cli.py:95-96`／`:157-158` 同数）。 */
export const ACCOUNT_NAME_MAX = 30;

/** 时间那一格的形态（照老 `validators.py:validate_time`：`YYYY-MM-DD HH:MM:SS` 且是真实日期）。 */
const FULL_TIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/** 一个时间串过不过（真实日期校验：月份 13、2 月 30 这类都要挡住）。 */
export function isFullTime(s: string): boolean {
  const m = FULL_TIME.exec(s);
  if (m === null) return false;
  const [, y, mo, d, h, mi, sec] = m;
  const t = Date.parse(y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':' + sec + 'Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 19).replace('T', ' ') === s;
}

/** `params.op` 归一。缺省／非法一律抛：op 是这一条命令自己的判别式，不猜（老侧缺省落到 `summary`
 *  再被拒——同一条命令两种产物，`summary` 已随 #691 搬去 `bill.account.query`）。 */
export function parseAccountOp(params: Record<string, unknown>): AccountOp {
  const op = params['op'];
  if (op === 'add' || op === 'update' || op === 'transfer') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（只认 add／update／transfer）：' + JSON.stringify(op));
}

/** 一个槽位：参数名／中文名／怎么给／是否必需。 */
export interface AccountSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 一处阻断：哪一格／中文名／为什么进不去（`没给` 与值不对共用一张表）。 */
export interface AccountBlocked {
  readonly name: string;
  readonly label: string;
  readonly why: string;
}

function slot(name: string, label: string, hint: string, required: boolean): AccountSlot {
  return { name, label, hint, required };
}

/** 「改成什么」那一格：老侧改账户要求 `--new-name`／`--disable`／`--enable` 至少给一个
 *  （`cli.py:186-187` 的「没有可执行的变更」）。它不是一个参数名，故单立一格。 */
export const CHANGE_SLOT: AccountSlot = slot('change', '改成什么', '如 改名「招行工资卡」／停用／启用', true);

/** 三支操作的槽位表（**唯一定义地**）：字段卡照它出，缺项探针照它算。 */
export const ACCOUNT_SLOTS: Readonly<Record<AccountOp, readonly AccountSlot[]>> = {
  add: [
    slot('name', '账户名', '如 招行卡 / 花呗', true),
    slot('type', '类型', '选填，如 银行卡 / 支付 / 信用', false),
  ],
  update: [
    slot('name', '账户', '要改的那个账户，如 招行卡', true),
    slot('new-name', '改成什么名字', '改名后的新账户名，如 招行工资卡', false),
    slot('disable', '停用', '停用后不再算进总余额，历史记录保留', false),
    slot('enable', '启用', '把停用的账户恢复使用', false),
  ],
  transfer: [
    slot('amount', '金额', '转多少，写正数，如 500', true),
    slot('from', '从账户', '钱从哪个账户转出，如 支付宝', true),
    slot('to', '到账户', '钱转到哪个账户，如 招行卡', true),
    slot('time', '时间', '选填，不填就是现在；要写就写 2026-09-14 12:00:00 这样', false),
  ],
};

/** 三件值读法**改从共用位转出**（#731）：账户域是第一处用法、开始使用域是第二处，
 *  按「共用件是从第二个用法里长出来的」上浮到 `../shared/params.js`；本域调用点写法一字不改。 */
export { isGiven, numberOf, textOf };

/** 改账户那一支「改成什么」给了没有（三个口子任给其一即算给了）。 */
export function hasChange(params: Record<string, unknown>): boolean {
  return isGiven(params['new-name']) || params['disable'] === true || params['enable'] === true;
}

/** 本支操作当下缺什么、哪一格的值进不去（**空数组＝可以往下走写库那一步**）。
 *  账户表那一层的冲突（重名／找不到账户）住 `./write.js` 的 `tableBlockedOf`——本件只吃参数，不碰库与文件。 */
export function accountBlocked(op: AccountOp, params: Record<string, unknown>): readonly AccountBlocked[] {
  const out: AccountBlocked[] = [];
  for (const s of ACCOUNT_SLOTS[op]) {
    if (s.required && !isGiven(params[s.name])) out.push({ name: s.name, label: s.label, why: '没给' });
  }
  if (op === 'update' && !hasChange(params)) out.push({ name: CHANGE_SLOT.name, label: CHANGE_SLOT.label, why: '没给' });
  if (op === 'add' || op === 'update') {
    const name = textOf(params['name']);
    if (name.length > ACCOUNT_NAME_MAX) {
      out.push({ name: 'name', label: '账户名', why: '太长（最多 ' + String(ACCOUNT_NAME_MAX) + ' 个字）' });
    }
  }
  if (op === 'update' && isGiven(params['new-name'])) {
    const next = textOf(params['new-name']);
    if (next === textOf(params['name'])) out.push({ name: 'new-name', label: '改成什么名字', why: '和现在的名字一样' });
    if (next.length > ACCOUNT_NAME_MAX) {
      out.push({ name: 'new-name', label: '改成什么名字', why: '太长（最多 ' + String(ACCOUNT_NAME_MAX) + ' 个字）' });
    }
  }
  if (op === 'transfer') {
    const amount = numberOf(params['amount']);
    if (isGiven(params['amount']) && amount !== null && amount <= 0) {
      out.push({ name: 'amount', label: '金额', why: '要写正数（账户之间移动，不分收支方向）' });
    }
    const from = textOf(params['from']);
    const to = textOf(params['to']);
    if (from !== '' && to !== '' && from === to) {
      out.push({ name: 'to', label: '到账户', why: '要和转出账户不同（自己转给自己不算一笔）' });
    }
    const time = textOf(params['time']);
    if (time !== '' && !isFullTime(time)) {
      out.push({ name: 'time', label: '时间', why: '要写成 2026-09-14 12:00:00 这样（含年月日与时分秒）' });
    }
  }
  return out;
}

/** 账户名：必需槽位，空白即抛（阻断闸门放行之后才会走到这里）。 */
export function needAccountName(params: Record<string, unknown>, field = 'name'): string {
  const v = params[field];
  if (typeof v !== 'string' || !v.trim()) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + field);
  }
  return v.trim();
}

/** 转账的真值校验（阻断闸门放行之后才会走到这里）：金额为正数、两个账户都给且不同、时间形态可认。
 *  时间不给＝取当下（缺省由 `./write.js` 给）。 */
export function validateTransfer(params: Record<string, unknown>): { amount: number; from: string; to: string; time: string | null } {
  const n = numberOf(params['amount']);
  if (n === null || n <= 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '转账金额须为正数：' + JSON.stringify(params['amount']));
  }
  const from = needAccountName(params, 'from');
  const to = needAccountName(params, 'to');
  if (from === to) throw new BillPolicyError('POLICY_BAD_INPUT', '转出与转入账户不得相同');
  const time = textOf(params['time']);
  if (time !== '' && !isFullTime(time)) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '转账时间的形态不认（要用 YYYY-MM-DD HH:MM:SS）：' + time);
  }
  return { amount: Math.round(n * 100) / 100, from, to, time: time === '' ? null : time };
}
