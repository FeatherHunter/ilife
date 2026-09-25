/** radar-profile · **几何与数字**（本件第三份源码件：`forms.ts` 的三个骨架都用它，它谁都不用）。
 *
 *  为什么有这一件：一次落三个形态，校验 ＋ 装配 ＋ 算数挤在一件里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`）。切口按「算数面／装配面／入参面」分：
 *   · 本件：纯算数与格式化（角度、极坐标、半径映射、多边形与扇区路径、锚点方向、差值文字）；
 *   · `forms.ts`：已校验的入参 → 三个骨架的模型（调本件）；
 *   · `model.ts`：入参校验与归一化入口。
 *
 *  **坐标只有一处算**（本件唯一的映射）：`percentOfScore()` 把 0…100 的得分映射成 0…100 的占比，
 *  `radiusOfScore()` 再把占比乘上半径。网格环的半径、多边形的顶点、扇区的半径与外沿、轨道上那根
 *  竖线的位置、以及轴名的锚点百分比——**全部从这两支出**。两处各写一套必然走散：读者按印出来的
 *  刻度读点，读出来的就不是那个读数（`scatter-fit` 曾被审出「轴域与刻度不是同一份真值」的正是这一步）。
 */

import {
  RADAR_PROFILE_CENTER,
  RADAR_PROFILE_LABEL_RADIUS,
  RADAR_PROFILE_MAX_SCORE,
  RADAR_PROFILE_MISSING,
  RADAR_PROFILE_VIEW,
} from './attrs.js';

/** 两位小数（所有出出去的坐标与百分比都过它：行内样式里不许出现 0.30000000000000004）。 */
export const round2 = (v: number): number => Number(v.toFixed(2));

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : (v > hi ? hi : v));

/* ── 数字 → 字 ─────────────────────────────────────────────────────── */

/** 读数与刻度上的数字（**整数不带小数点**；最多两位小数）。 */
export function plainNum(v: number): string {
  return String(round2(v));
}

/** 差值的符号写法（负号用 U+2212 减号，与数字同宽：`+14`／`−7`）。 */
export function signedDelta(v: number): string {
  const abs = plainNum(Math.abs(v));
  return v > 0 ? '+' + abs : (v < 0 ? '−' + abs : '0');
}

/** 「差」那一格：进／退给方向字形，持平与大缺写清字面（**色不是唯一信息**）。 */
export function deltaText(delta: number | null): string {
  if (delta === null) return RADAR_PROFILE_MISSING;
  if (delta === 0) return '持平';
  return (delta > 0 ? '▲ ' : '▼ ') + signedDelta(delta);
}

/** 平均值（0…100）：**四舍五入到整数**——它是给人读的一句，不是中间量。 */
export function meanOk(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return Math.round(sum / values.length);
}

/* ── 唯一的映射：得分 → 占比 → 半径/位置 ─────────────────────────── */

/** **唯一的映射（第一段）**：0…100 的得分 → 0…100 的占比。轨道位置与半径都从它出。 */
export function percentOfScore(score: number): number {
  return round2((clamp(score, 0, RADAR_PROFILE_MAX_SCORE) / RADAR_PROFILE_MAX_SCORE) * 100);
}

/** **唯一的映射（第二段）**：得分 → 画布上的半径（`radius` ＝ 占比 100 对应的半径）。 */
export function radiusOfScore(score: number, radius: number): number {
  return round2((percentOfScore(score) / 100) * radius);
}

/* ── 极坐标 ───────────────────────────────────────────────────────── */

/** 一根轴的角度（度）：0 号轴在**正上方**，序号递增即顺时针（读法：从正中开始往下读一圈）。 */
export function angleOf(index: number, count: number): number {
  return -90 + (index * 360) / count;
}

/** 画布上的一个点（user unit，两位小数）：角度由 `angleOf()` 给，半径由调用方给（通常是 `radiusOfScore()`）。 */
export function polarOf(index: number, count: number, radius: number): { readonly x: number; readonly y: number } {
  const rad = (angleOf(index, count) * Math.PI) / 180;
  return {
    x: round2(RADAR_PROFILE_CENTER + radius * Math.cos(rad)),
    y: round2(RADAR_PROFILE_CENTER + radius * Math.sin(rad)),
  };
}

/** 一个点 → 定位框里的百分比（轴名的 `left`／`top`）。同一个 `polarOf()`，不另写一套三角函数。 */
export function percentOfPoint(p: { readonly x: number; readonly y: number }): { readonly left: number; readonly top: number } {
  return {
    left: round2((p.x / RADAR_PROFILE_VIEW) * 100),
    top: round2((p.y / RADAR_PROFILE_VIEW) * 100),
  };
}

/** 轴名的锚点方向：|cos| 太小（正上／正下那两根）时走上下居中，其余走左右对齐。 */
export function anchorOf(index: number, count: number): 'top' | 'right' | 'bottom' | 'left' {
  const rad = (angleOf(index, count) * Math.PI) / 180;
  const cos = Math.cos(rad);
  if (Math.abs(cos) < 0.25) return Math.sin(rad) <= 0 ? 'top' : 'bottom';
  return cos > 0 ? 'right' : 'left';
}

/** 轴名锚点在定位框里的百分比（半径取 `RADAR_PROFILE_LABEL_RADIUS`：名字一律浮在外圈之外）。 */
export function labelPercentOf(index: number, count: number): { readonly left: number; readonly top: number } {
  return percentOfPoint(polarOf(index, count, RADAR_PROFILE_LABEL_RADIUS));
}

/* ── 形状：多边形 ／ 扇区 ／ 外沿弧 ─────────────────────────────────
 *  三个形态画的是同一条映射的三种用法：多边形取**顶点**、扇区取**半径与两张边**、
 *  外沿弧取**半径上那一段弧**。全都从 `polarOf()` 出。 */

/** 一条轮廓的点串（`x,y x,y …`）：**只连有读数的轴**（缺测的轴整根不画，不当 0 分算）。 */
export function polygonPoints(values: readonly (number | null)[], radius: number): string {
  const out: string[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    const p = polarOf(index, values.length, radiusOfScore(value, radius));
    out.push(String(p.x) + ',' + String(p.y));
  });
  return out.join(' ');
}

/** 一根扇区的角度半宽（度）：一根扇区占 `360 / count` 度，以自己那根轴为中心往两边各张开一半。 */
export function halfSpanOf(count: number): number {
  return 180 / count;
}

/** 一根扇区：圆心 → 左端点 → 外沿弧 → 右端点 → 收回圆心。`sweep=1` 即顺时针（与角度递增同向）。 */
export function sectorPath(index: number, count: number, radius: number): string {
  const half = halfSpanOf(count);
  const a = polarOfRaw(angleOf(index, count) - half, radius);
  const b = polarOfRaw(angleOf(index, count) + half, radius);
  return 'M' + String(RADAR_PROFILE_CENTER) + ',' + String(RADAR_PROFILE_CENTER)
    + ' L' + String(a.x) + ',' + String(a.y)
    + ' A' + String(radius) + ',' + String(radius) + ' 0 0 1 ' + String(b.x) + ',' + String(b.y) + ' Z';
}

/** 一根扇区的外沿那道弧（只有弧：`M 左端点 A … 右端点`，不闭合）。 */
export function sectorArcPath(index: number, count: number, radius: number): string {
  const half = halfSpanOf(count);
  const a = polarOfRaw(angleOf(index, count) - half, radius);
  const b = polarOfRaw(angleOf(index, count) + half, radius);
  return 'M' + String(a.x) + ',' + String(a.y)
    + ' A' + String(radius) + ',' + String(radius) + ' 0 0 1 ' + String(b.x) + ',' + String(b.y);
}

/** 任意角度上的一个点（`sectorPath()`／`sectorArcPath()` 的边端点用它：角度是"轴 ± 半宽"，不是轴序号）。 */
export function polarOfRaw(angleDeg: number, radius: number): { readonly x: number; readonly y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: round2(RADAR_PROFILE_CENTER + radius * Math.cos(rad)),
    y: round2(RADAR_PROFILE_CENTER + radius * Math.sin(rad)),
  };
}
