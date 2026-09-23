/** 时钟的**唯一定义地**（#717 批③）：「今天是哪一天」「现在是几点」只从这里取。
 *
 * 谁在用（写得出哪两个能力在用）：
 *   ① 分析能力 `analysis/`（`analysis/utils.ts` 的 `todayISO` 正本在这里，原处按原名转出）；
 *   ② 饮食能力 `diet/`（`fetch/diet.ts` 记一餐时的落库日期与时刻）；
 *   ③ 运动能力 `exercise/`（`exercise/exerciseStore.ts` 记一条时的时刻）；
 *   ④ 体重能力 `weight/`（`weight/records.ts` 记体重时的日期与时刻）。
 *
 * 本件**零依赖**：不 import 任何件，也不出现任何一个能力目录的名字。
 *
 * 收在这里之前的样子（#701 普查、#717 批③）：`todayISO` 的正本住 `analysis/utils.ts`，而
 * `fetch/diet.ts`／`exercise/exerciseStore.ts`／`weight/records.ts` **各写一份私有的本地时钟**
 * （`new Date().toISOString().slice(0,10)` 与 `new Date().toTimeString().slice(0,8)`）——
 * 抓取层被要求「不反向依赖 analysis」，于是绕路自己读系统钟，三份副本各自走散。
 *
 * 口径：**读系统钟**（进程级钉钟由测试的 `--require freeze-clock.cjs` 预载件盖住整个 `Date`，
 * 故钉钟时本件三个读数同时跟走——写入日、回执日、累计读日不会再分家）。
 */

/** 当刻的日（`YYYY-MM-DD`，UTC 日口径，与全包既有口径一致）。 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 当刻的时刻（`HH:MM:SS`，本地时刻口径）。 */
export function timeOfDayISO(): string {
  return new Date().toTimeString().slice(0, 8);
}

/** 日期加减（按整天，`shiftISODate('2026-09-07', -6) === '2026-09-01'`）。
 *
 *  锚到 UTC 正午再加减，避开夏令时把某一天算成 23／25 小时那种边界。
 *  非法日期当场抛（消息形状与全包既有写法一致）。 */
export function shiftISODate(iso: string, deltaDays: number): string {
  const t = Date.parse(iso + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new Error('[calorie] 日期非法: ' + iso);
  return new Date(t + deltaDays * 86400000).toISOString().slice(0, 10);
}

/** ISO 日期是不是**真实日历日**（`2026-09-07` 是，`2026-13-40`／`2026-02-30` 不是）。
 *
 *  `params.ts#assertISO` 只管形状，这类「形状对、日历上没这一天」的值会一路算下去，在计划链上
 *  让周次算式出 `NaN`、被误判成「这天是休息日」——所以定计划相关的那几条命令要在用法层先拦。
 *  判据与 `landBatch.ts#assertRealDate`（批量天数表那一路）一字同源。 */
export function isRealISODate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
