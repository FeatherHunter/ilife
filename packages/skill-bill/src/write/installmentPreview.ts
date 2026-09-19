/** 分摊预览表（缺口块之一，**唯一定义地**）：一笔总价摊成 N 期，逐期列「每期金额 ＋ 日期」，合计逐分等于总价。
 *
 * 谁在用（两个用法，指名）：
 *   ① **记分期**（`src/write/scene-installment.ts`）的采集页与回执页两处——同一组入参算两遍，算出来的表一致；
 *   ② 第二个用法：批量与修正族的「改记录」改总价那一支（改完重算同一张表），本件一行不动。
 *
 * 两半分明：**算**的是纯函数 `installmentShares`（无页面、无颜色、可单独核数）；
 *  **摆**的是 `installmentPreview`（只走 base 现成组件：`renderDataTable`／`renderDisclosure`／`renderCaliberLine`）。
 *
 * 口径（本件唯一，改一处就是改全部）：
 *   ① 每期＝总价 ÷ 期数，四舍五入到分；
 *   ② **尾差对齐到最后一期**（末期＝总价 − 每期 × (期数 − 1)），故合计**逐分等于总价**；
 *   ③ 日期＝首期日之后每月同日，该月没有这一天就回退到该月最后一天（如 1 月 31 日的下一个月＝2 月末）。
 *  第②条与老侧不同：老侧把差额补在**首期**（`scripts/render_write.py` 的 `compute_installments`），本仓按施工图
 *  `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记分期」那一行改到末期。
 *
 * **先校验再算**：总价解析不出、期数不是正整数、首期日不是有效日期，一律当场抛错——不静默当空、
 *  不拿 `NaN` 往下走（老侧那段裸转数字先崩，本件不照抄那一处）。
 */
import { renderCaliberLine, renderDataTable, renderDisclosure } from 'base-paint/blocks';

/** 一期：第几期 ＋ 这一期多少钱 ＋ 哪一天。 */
export interface InstallmentShare {
  /** 第几期（从 1 数起）。 */
  readonly no: number;
  /** 这一期的金额（元，两位小数以内）。 */
  readonly amount: number;
  /** 这一期的日期（`YYYY-MM-DD`）。 */
  readonly date: string;
}

/** 分摊的入参：总价 ＋ 期数 ＋ 首期日（三个都必给，格式从宽、解析从严）。 */
export interface InstallmentInput {
  /** 总价（元）：数字或数字串。 */
  readonly total: string | number;
  /** 期数：正整数（数字或数字串）。 */
  readonly periods: string | number;
  /** 首期日（`YYYY-MM-DD`）。 */
  readonly startDate: string;
}

/** 数字串的那个样子（只有整段都是数字才算，`'12abc'`／`''` 一律不算）。 */
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** 日期串的那个样子（`YYYY-MM-DD`，真不真有这一天另算）。 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** 期数上限：再多也不许一次摊（摊到 600 期之外没有对账的意义）。 */
const PERIODS_MAX = 600;

/** 总价 → 分。解析不出、不是正数一律抛错（**先校验再算**的第一处）。 */
function centsOf(raw: string | number): number {
  const s = typeof raw === 'number' ? String(raw) : (typeof raw === 'string' ? raw.trim() : '');
  if (s === '') throw new Error('installmentPreview：总额没给（这一格要一个数）');
  if (!NUMERIC.test(s)) throw new Error('installmentPreview：总额解析失败——「' + s + '」不是数字');
  const cents = Math.round(Number(s) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error('installmentPreview：总额要大于 0（摊的是总价，负数不摊）');
  }
  return cents;
}

/** 期数 → 正整数。非正整数／超上限一律抛错（**先校验再算**的第二处）。 */
function periodsOf(raw: string | number): number {
  const s = typeof raw === 'number' ? String(raw) : (typeof raw === 'string' ? raw.trim() : '');
  if (s === '') throw new Error('installmentPreview：期数没给（这一格要一个正整数）');
  if (!/^\d+$/.test(s)) throw new Error('installmentPreview：期数解析失败——「' + s + '」不是正整数');
  const n = Number(s);
  if (n < 1) throw new Error('installmentPreview：期数要大于 0');
  if (n > PERIODS_MAX) throw new Error('installmentPreview：期数最多 ' + PERIODS_MAX + ' 期，给的是 ' + n);
  return n;
}

/** 首期日 → 年月日。格式不对或日历上没有这一天一律抛错（**先校验再算**的第三处）。 */
function ymdOf(raw: string): { readonly y: number; readonly m: number; readonly d: number } {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const m = DATE.exec(s);
  if (m === null) throw new Error('installmentPreview：首期日解析失败——「' + s + '」不是 YYYY-MM-DD');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth) {
    throw new Error('installmentPreview：首期日「' + s + '」这一天不存在');
  }
  return { y, m: mo, d };
}

/** 两位补零。 */
function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** 首期日往后第 `k` 个月的同一天；该月没有这一天就回退到月末。 */
function shiftMonths(ymd: { readonly y: number; readonly m: number; readonly d: number }, k: number): string {
  const months = ymd.y * 12 + (ymd.m - 1) + k;
  const y = Math.floor(months / 12);
  const m = (months % 12) + 1;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return y + '-' + pad(m) + '-' + pad(Math.min(ymd.d, daysInMonth));
}

/** 分摊：逐期金额 ＋ 日期（纯函数）。**合计逐分等于总价**——算完当场核一遍，不等距就抛错。 */
export function installmentShares(input: InstallmentInput): readonly InstallmentShare[] {
  const cents = centsOf(input.total);
  const periods = periodsOf(input.periods);
  const ymd = ymdOf(input.startDate);
  const each = Math.floor(cents / periods);
  const shares: InstallmentShare[] = [];
  for (let i = 1; i <= periods; i += 1) {
    // 尾差对齐到最后一期：前几期各拿整数分，剩下的一分不差全压在末期。
    const amount = i === periods ? cents - each * (periods - 1) : each;
    shares.push({ no: i, amount: amount / 100, date: shiftMonths(ymd, i - 1) });
  }
  const sum = shares.reduce((acc, s) => acc + Math.round(s.amount * 100), 0);
  if (sum !== cents) {
    throw new Error('installmentPreview：分摊合计 ' + (sum / 100).toFixed(2) + ' 与总价 ' + (cents / 100).toFixed(2) + ' 对不上');
  }
  return shares;
}

/** 一行的钱：两位小数，不补正号（分摊表里全是正数）。 */
function yuan(amount: number): string {
  return amount.toFixed(2);
}

/** 表体格的一行。 */
function rowOf(s: InstallmentShare): { readonly no: string; readonly amount: string; readonly date: string } {
  return { no: '第 ' + s.no + ' 期', amount: yuan(s.amount), date: s.date };
}

/** 分摊表（一页表体，列与行都由本件定）。 */
function shareTable(shares: readonly InstallmentShare[], caption: string): string {
  return renderDataTable({
    columns: [
      { key: 'no', label: '期数' },
      { key: 'amount', label: '每期金额', align: 'right' },
      { key: 'date', label: '日期' },
    ],
    rows: shares.map(rowOf),
    caption,
  });
}

/** 超过这个期数就折起来：只显前 `HEAD_PERIODS` 期，其余进折叠区（老侧 `installment_confirm.html` 同一处）。 */
const FOLD_OVER = 24;
/** 折起来之后前面留几期。 */
const HEAD_PERIODS = 12;

/** 分摊预览整块：说明行 ＋ 表（>24 期只显前 12 期）＋ 其余期数的折叠区。 */
export function installmentPreview(input: InstallmentInput): string {
  const shares = installmentShares(input);
  const total = shares.reduce((acc, s) => acc + Math.round(s.amount * 100), 0) / 100;
  const periods = shares.length;
  const folded = periods > FOLD_OVER;
  const head = folded ? shares.slice(0, HEAD_PERIODS) : shares;
  const rest = folded ? shares.slice(HEAD_PERIODS) : [];
  const parts = [renderCaliberLine(
    '每期＝总价 ÷ 期数，四舍五入到分。尾差对齐到最后一期（末期＝总价 − 每期 × (期数 − 1)），'
    + '故合计逐分等于总价：' + yuan(total) + '（' + periods + ' 期）。',
  )];
  parts.push(shareTable(head, folded
    ? '分摊预览：共 ' + periods + ' 期，这里先显前 ' + HEAD_PERIODS + ' 期；合计 ' + yuan(total) + '（＝总价）'
    : '分摊预览：共 ' + periods + ' 期；合计 ' + yuan(total) + '（＝总价）'));
  if (rest.length > 0) {
    parts.push(renderDisclosure({
      title: '还有 ' + rest.length + ' 期（折叠在这里）',
      contentHtml: shareTable(rest, '第 ' + (HEAD_PERIODS + 1) + ' 期到第 ' + periods + ' 期'),
    }));
  }
  return parts.join('');
}
