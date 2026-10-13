/** #1280 第 5 步 · `bill.category.merge`（合并分类）的处理体：把写错／写重的两个分类**并成一条**。
 *
 *  是什么：`from` 那一串分类名下的**所有账单行**（含已撤销的软删行——照账户改名的先例
 *  `src/account/accounts.ts` 的 `UPDATE bills SET account = ? WHERE account = ?`，恢复后名称一致），
 *  `category` 列逐行改成 `to`；返回「改了几笔」。
 *
 *  三条口径（一手资料 `docs/research/1269-可扩展词表-设计与治理-一手资料.md` 的共识：带条数计数／可撤销／不追溯）：
 *    · **带条数计数**：`renamedRows` 取 SQLite `changes()`（与账户改名同一口径，非自报），
 *      另报其中已撤销的行数 `deletedRows`（合并**前**数一次——合并后这个分类串就没了）。
 *    · **可撤销**：退回不走新机制——两个参数对调、再跑一次同一条命令（旧名下的行整体搬回来）。
 *      回执里写明这条出口。**不另立变更日志表**：本仓的「撤销」就是 `bills.deleted_at` 软删打标
 *      （`src/fetch/db.ts` 的 `undoBill`／`restoreBill`），为合并再立一张日志表＝同一件事两处记（铁律二）。
 *      已知偏差（与账户改名同一处，行为一致）：退回按**值**搬、不按行——若 `to` 名下本来就有别的行，
 *      对调那一次会把它们一并带走，故回执把笔数报出来，让用户对得上。
 *    · **不追溯**：只改**整串精确相等**的那一串，不改它的下级（`餐饮/夜宵` 并进 `餐饮` 不动
 *      `餐饮/夜宵/炒面`），也不动 `goals.json` 里的预算／目标键。
 *
 *  `nameKey` 相等（只差大小写／空白／全角半角）＝**本来就是同一个值**：不写库、报 0 笔改动——
 *  写下去只会给同一个值造出第二个拼写（与 #1280 第 3 步的收口口径同一句话：库里已有那个拼写胜出，
 *  见 `src/write/record.ts` 的 `canonicalizeExistingNames` 与 `src/shared/nameKey.ts` 的件头）。
 *
 *  为什么不出整页（本命令 `html: ''`、`page` 缺席）：一次合并没有单一的金额主数字，硬套回执纸
 *  只能把某一笔的金额印成主数字——那是假事实。落地事实（改了几笔、能不能退回）全在回执载荷里；
 *  整页样式留给 #993 票据纸族的后续票。
 *
 *  谁在用（指名）：`./commands.ts` 的第三条声明引 `mergeCategory`；出口分派 `src/cli/cmd_read.ts`
 *  只查注册表再调命令声明里的 `run`，不认这条命令名。取数写库照账户改名先例走**本域 SQL**（不动 `src/fetch/`）。
 */
import { BillPolicyError } from '../fetch/errors.js';
import type { BillDb } from '../fetch/db.js';
import { DB_FILENAME } from '../fetch/index.js';
import { validateCategory } from '../shared/category.js';
import { nameKey } from '../shared/nameKey.js';
import { actionStamp } from '../shared/copyArea.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** 一次合并的回执事实（形状由本域自己定：`WriteOut` 的 `receipt` 那一格，见 `../shared/commandSpec.js`）。 */
export interface MergeReceipt {
  readonly op: 'merge';
  readonly from: string;
  readonly to: string;
  /** 改了几笔（SQLite `changes()`，含已撤销的行）。 */
  readonly renamedRows: number;
  /** 其中已撤销（`deleted_at` 非空）的行数。 */
  readonly deletedRows: number;
  /** 两个写法按 `nameKey` 就是同一个值：走了「不写库」那一支。 */
  readonly noChange: boolean;
  readonly source: string;
  readonly actionAt: string;
}

/** 取一个必填文本槽位（空／非字符串＝缺槽位；与 `../shared/params.js` 的 `needId` 同一档错）。 */
function slotText(params: Record<string, unknown>, name: string, label: string): string {
  const v = params[name];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '合并分类缺「' + label + '」：' + name);
  }
  return v.trim();
}

/** 某个分类串名下有几行（**软删行也算**；`deleted_at` 只用来分身数，不做过滤）。 */
function rowsOf(db: BillDb, category: string): { readonly total: number; readonly deleted: number } {
  try {
    const row = db.db.prepare(
      'SELECT COUNT(*) AS n, SUM(CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END) AS d FROM bills WHERE category = ?',
    ).get(category) as { n?: number; d?: number } | undefined;
    return { total: Number(row?.n ?? 0), deleted: Number(row?.d ?? 0) };
  } catch (e) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '分类计数失败：' + String((e as Error).message));
  }
}

/** 合并分类（`bill.category.merge`）：`from` 那一串全部改写成 `to`，回执报改了第几笔。 */
export function mergeCategory(params: Record<string, unknown>, db: BillDb): WriteOut {
  const from = slotText(params, 'from', '原分类');
  const to = validateCategory(slotText(params, 'to', '新分类'));
  const source = DB_FILENAME + '（写库回执）';
  if (nameKey(from) === nameKey(to)) {
    const same = rowsOf(db, from);
    const receipt: MergeReceipt = {
      op: 'merge', from, to, renamedRows: 0, deletedRows: 0, noChange: true,
      source, actionAt: actionStamp(),
    };
    return {
      data: {
        ok: true,
        message: '「' + from + '」与「' + to + '」是同一个分类（只差大小写／空白／全角半角）：'
          + '库里「' + from + '」名下现有 ' + String(same.total) + ' 笔，一笔不改，也不给这个值造第二个拼写。',
        receipt,
      },
      html: '',
    };
  }
  const before = rowsOf(db, from);
  if (before.total === 0) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '库里没有「' + from + '」这个分类（一笔都没有，含已撤销的）');
  }
  let renamedRows = 0;
  try {
    db.db.prepare('UPDATE bills SET category = ? WHERE category = ?').run(to, from);
    renamedRows = Number((db.db.prepare('SELECT changes() AS n').get() as { n?: number } | undefined)?.n ?? 0);
  } catch (e) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '分类改名失败：' + String((e as Error).message));
  }
  const receipt: MergeReceipt = {
    op: 'merge', from, to, renamedRows, deletedRows: before.deleted, noChange: false,
    source, actionAt: actionStamp(),
  };
  return {
    data: {
      ok: true,
      message: '已合并：把「' + from + '」的 ' + String(renamedRows) + ' 笔并进「' + to + '」'
        + (before.deleted > 0 ? '（其中已撤销的 ' + String(before.deleted) + ' 笔）' : '')
        + '。要退回就说「合并分类」把「' + to + '」并回「' + from + '」。',
      receipt,
    },
    html: '',
  };
}
