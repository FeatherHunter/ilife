/** radar-profile · **渲染**（纯函数产 HTML；三个形态各一支骨架：多边形雷达／极区扇图／展平成轴表）。
 *
 *  —— 三个形态 ——
 *   · `polygon` 一个对象在几根轴上的形状围成一圈（本期一条实线、上期一条虚线），旁边一叠读数表；
 *   · `wedge`   每根轴给自己那一片扇区，半径比例于得分，达标线画成虚线圆环；
 *   · `rail`    把轴摊平成一列，每行一条轨道：色带是基准区间、竖线是当前值、判定写在右边。
 *  它替掉的三种错法：
 *   · 把几根轴合成一个总分 —— 偏科被抹平；
 *   · 六条进度条各读各的 —— 看不出形状；
 *   · 拿其中一根轴的绝对值当结论 —— 轴与轴不是同一个单位。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **几何只有一处算**：这一支只拼标记，行内样式里那些百分比与 SVG 坐标都是 `forms.ts` 算好的；
 *     静态规则一律住 `style.ts`／`style-forms.ts`；
 *   · **图上的字一律是 HTML**：SVG 只画网格与数据（内联 SVG 里的文字会随画布缩放，窄容器里读数先糊）；
 *   · **缺测的轴整根不画**：辐条、顶点、扇区、竖线一起不画，读数写 `—`，**不当 0 分算**；
 *   · **色不是唯一信息**：轴名与读数都在图上、判定写成字、差带正负号与方向字形、图例写清达标分。
 */
import { esc } from '../shared/escape.js';
import {
  RADAR_PROFILE_AT_VAR,
  RADAR_PROFILE_B1_VAR,
  RADAR_PROFILE_B2_VAR,
  RADAR_PROFILE_CENTER,
  RADAR_PROFILE_CLASS,
  RADAR_PROFILE_VIEW,
  radarProfileSlot,
  type RadarProfileForm,
  type RadarProfileSlot,
} from './attrs.js';
import { normalizeRadarProfile } from './model.js';
import type { RadarProfileModel } from './model.js';

/** 槽类名（唯一拼法：别处不再写 `RADAR_PROFILE_CLASS + '-' + …`）。 */
const sc = (slot: RadarProfileSlot): string => radarProfileSlot(slot);

/** SVG 画布（正方形：极坐标的圆心在正中，量的尺子只有一把）。 */
const VIEW_BOX = '0 0 ' + String(RADAR_PROFILE_VIEW) + ' ' + String(RADAR_PROFILE_VIEW);

/* ── 卡头与脚注 ───────────────────────────────────────────────────── */

/** 卡头：标题 ＋ 时间窗 ＋ **从读数算出来**的那一句（平均分／达标几根轴／出带几根轴）。 */
function headHtml(m: RadarProfileModel): string {
  const parts: string[] = ['<div class="' + sc('hd') + '">'];
  parts.push('<h4 class="' + sc('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) parts.push('<span class="' + sc('stamp') + '">' + esc(m.stamp) + '</span>');
  parts.push('<span class="' + sc('tail') + '">' + esc(m.tail) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 脚注一句人话（不给就用本形态的口径句）。 */
function noteHtml(m: RadarProfileModel): string {
  return '<p class="' + sc('note') + '">' + esc(m.note) + '</p>';
}

/** 图例：每一项是「形 ＋ 字」——形由 `slot`／`kind` 给（线段／色块），字说清那是什么。 */
function legendHtml(m: RadarProfileModel): string {
  if (m.legend.length === 0) return '';
  const items = m.legend.map((one) => '<li class="' + sc('legend-item') + '">'
    + '<i class="' + sc(one.slot) + ' is-' + one.kind + '" aria-hidden="true"></i>'
    + esc(one.text)
    /* 达标那一项把**印出来的达标分**单独成元素：它是这一张图的刻度，读者与判据都从它读。 */
    + (one.goalNum === undefined ? '' : '（评分 <b class="' + sc('goal-num') + '">' + esc(one.goalNum) + '</b> 分及以上）')
    + '</li>');
  return '<ul class="' + sc('legend') + '">' + items.join('') + '</ul>';
}

/* ── 图：网格 ＋ 数据（SVG 只画形状，字在 HTML 那一层） ─────────────── */

/** 网格三圈（形态 `polygon`）：外圈最重、里两圈更轻——读者按刻度条上那三个数读格子。 */
function ringsHtml(m: RadarProfileModel): string {
  return m.rings.map((ring, i) => '<circle class="' + sc('ring') + (i === m.rings.length - 1 ? ' is-outer' : '')
    + '" cx="' + String(RADAR_PROFILE_CENTER) + '" cy="' + String(RADAR_PROFILE_CENTER)
    + '" r="' + String(ring.radius) + '"/>').join('');
}

/** 辐条：**只画有读数的轴**（缺测的轴整根不画，读图的人一眼看得出这里空了一根）。 */
function spokesHtml(m: RadarProfileModel): string {
  return m.spokes.map((s) => '<line class="' + sc('spoke') + '" x1="' + String(RADAR_PROFILE_CENTER)
    + '" y1="' + String(RADAR_PROFILE_CENTER) + '" x2="' + String(s.x2) + '" y2="' + String(s.y2) + '"/>').join('');
}

/** 顶点上的点（本期读数落在它那根轴上的位置）。 */
function dotsHtml(m: RadarProfileModel): string {
  return m.nowDots.map((p) => '<circle class="' + sc('dot') + '" cx="' + String(p.x) + '" cy="' + String(p.y)
    + '" r="2.6"/>').join('');
}

/** 轴名那一块：名字一行、读数一行；位置与图上的顶点来自**同一个映射**（`left`／`top` 是百分比）。 */
function labelsHtml(m: RadarProfileModel): string {
  return m.labels.map((one) => '<span class="' + sc('axlabel') + ' is-' + one.anchor
    + (one.present ? '' : ' is-missing') + '" style="left: ' + String(one.left) + '%; top: ' + String(one.top) + '%">'
    + '<b class="' + sc('axname') + '">' + esc(one.label) + '</b>'
    + '<em class="' + sc('axvalue') + '">' + esc(one.valueText) + '</em>'
    + '</span>').join('');
}

/** 图那一格：内联 SVG（网格 ＋ 数据）＋ 浮在四周的轴名。 */
function plotHtml(m: RadarProfileModel, inner: string): string {
  return '<div class="' + sc('stage') + '"><div class="' + sc('plot') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">'
    + '<svg class="' + sc('svg') + '" viewBox="' + VIEW_BOX + '" aria-hidden="true" focusable="false">' + inner + '</svg>'
    + labelsHtml(m)
    + (m.form === 'wedge' ? hubHtml(m) : '')
    + '</div></div>';
}

/** 印出来的刻度（形态 `polygon` 的三圈格子）：**网格半径与这三个数是同一份真值**。 */
function scaleHtml(m: RadarProfileModel): string {
  if (m.scaleItems.length === 0) return '';
  return '<p class="' + sc('scale') + '">'
    + m.scaleItems.map((one) => '<span class="' + sc('scale-item') + '">' + esc(one) + '</span>').join('')
    + '</p>';
}

/** 读数表（形态 `polygon`）：轴 ｜ 本期 ｜ 上期 ｜ 差——图上读形状，表里读数。 */
function tableHtml(m: RadarProfileModel): string {
  if (m.tableRows.length === 0) return '';
  const head = m.tableHead.map((one, i) => '<span class="' + sc(i === 0 ? 'tname' : 'tnum') + '">' + esc(one) + '</span>').join('');
  const rows = m.tableRows.map((row) => '<div class="' + sc('trow') + '">'
    + '<span class="' + sc('tname') + '">' + esc(row.name) + '</span>'
    + '<span class="' + sc('tnum') + '">' + esc(row.nowText) + '</span>'
    + (m.tableHead.length === 4
      ? '<span class="' + sc('tnum') + '">' + esc(row.pastText) + '</span>'
        + '<span class="' + sc('tdelta') + ' is-' + row.dir + '">' + esc(row.deltaText) + '</span>'
      : '')
    + '</div>').join('');
  return '<div class="' + sc('table') + '"><div class="' + sc('trow') + ' is-head">' + head + '</div>' + rows + '</div>';
}

/* ── 形态 `wedge` 的两块 ─────────────────────────────────────────── */

/** 圆心那块：平均分（**是平均，不是总分**——把几根轴加起来没有意义）。 */
function hubHtml(m: RadarProfileModel): string {
  return '<div class="' + sc('hub') + '"><b class="' + sc('hub-value') + '">' + esc(m.hubText) + '</b>'
    + '<em class="' + sc('hub-label') + '">平均分</em></div>';
}

/** 未达标那几根逐根点名（先给差得最多的那根）：**差多少分写成字**，不靠颜色。 */
function gapsHtml(m: RadarProfileModel): string {
  if (m.gaps.length === 0) return '';
  return '<ul class="' + sc('gaps') + '">' + m.gaps.map((g) => '<li class="' + sc('gap') + '">'
    + '<span class="' + sc('gap-name') + '">' + esc(g.label) + '</span>'
    + '<span class="' + sc('gap-num') + '">' + esc(g.scoreText) + '</span>'
    + '<span class="' + sc('gap-diff') + '">' + esc(g.diffText) + '</span>'
    + '</li>').join('') + '</ul>';
}

/* ── 形态 `rail` 的那一叠行 ──────────────────────────────────────── */

/** 一行：轴名（＋说明）｜ 轨道（基线 ＋ 基准带 ＋ 当前位置 ＋ 读数）｜ 判定（＋带是多少）。 */
function rowsHtml(m: RadarProfileModel): string {
  if (m.rows.length === 0) return '';
  const rows = m.rows.map((row) => {
    /* 位置与基准带都由 `forms.ts` 算成百分比串，这里只把它们交给样式（**算数一个字不写**）。 */
    const vars: string[] = [];
    if (row.at !== undefined) vars.push(RADAR_PROFILE_AT_VAR + ': ' + row.at);
    if (row.b1 !== undefined) vars.push(RADAR_PROFILE_B1_VAR + ': ' + row.b1, RADAR_PROFILE_B2_VAR + ': ' + row.b2);
    const parts: string[] = ['<div class="' + sc('row') + '">'];
    parts.push('<span class="' + sc('rname') + '">' + esc(row.label)
      + (row.note === undefined ? '' : '<em class="' + sc('rsub') + '">' + esc(row.note) + '</em>') + '</span>');
    parts.push('<span class="' + sc('track') + '"' + (vars.length === 0 ? '' : ' style="' + vars.join('; ') + '"') + '>');
    parts.push('<i class="' + sc('base') + '" aria-hidden="true"></i>');
    if (row.b1 !== undefined) parts.push('<i class="' + sc('band') + '" aria-hidden="true"></i>');
    /* 缺测的那根不画竖线：**画一根在 0 上的线就是拿缺测当 0 分算**（全仓同一根地板）。 */
    if (row.at !== undefined) parts.push('<i class="' + sc('mark') + '" aria-hidden="true"></i>');
    parts.push('<b class="' + sc('rval') + '">' + esc(row.valueText) + '</b>');
    parts.push('</span>');
    parts.push('<span class="' + sc('verdict') + ' is-' + row.verdictKind + '">' + esc(row.verdict)
      + (row.bandText === undefined ? '' : '<em class="' + sc('rband') + '">' + esc(row.bandText) + '</em>') + '</span>');
    parts.push('</div>');
    return parts.join('');
  });
  return '<div class="' + sc('rows') + '">' + rows.join('') + '</div>';
}

/* ── 三个骨架 ─────────────────────────────────────────────────────── */

/** 形态 `polygon`：图（网格三圈 ＋ 两条轮廓 ＋ 顶点）＋ 刻度条 ＋ 读数表 ＋ 图例。 */
function renderPolygon(m: RadarProfileModel): string {
  const inner = ringsHtml(m) + spokesHtml(m)
    + (m.pastPoints === '' ? '' : '<polygon class="' + sc('past') + '" points="' + esc(m.pastPoints) + '"/>')
    + '<polygon class="' + sc('now') + '" points="' + esc(m.nowPoints) + '"/>'
    + dotsHtml(m);
  return headHtml(m)
    + '<div class="' + sc('body') + '">' + plotHtml(m, inner) + tableHtml(m) + '</div>'
    + scaleHtml(m) + legendHtml(m) + noteHtml(m);
}

/** 形态 `wedge`：图（辐条 ＋ 逐根扇区 ＋ 外沿弧 ＋ 达标环 ＋ 顶点 ＋ 圆心平均分）＋ 图例 ＋ 未达标点名。 */
function renderWedge(m: RadarProfileModel): string {
  const inner = spokesHtml(m)
    + '<circle class="' + sc('goal') + '" cx="' + String(RADAR_PROFILE_CENTER) + '" cy="' + String(RADAR_PROFILE_CENTER)
    + '" r="' + String(m.goalRadius) + '"/>'
    + m.wedges.map((w) => '<path class="' + sc('wedge') + (w.ok ? ' is-ok' : ' is-warn') + '" d="' + esc(w.path) + '"/>'
      + '<path class="' + sc('warc') + (w.ok ? ' is-ok' : ' is-warn') + '" d="' + esc(w.arc) + '"/>').join('')
    + dotsHtml(m);
  return headHtml(m) + plotHtml(m, inner) + legendHtml(m) + gapsHtml(m) + noteHtml(m);
}

/** 形态 `rail`：几根轴摊平成一叠行 ＋ 脚注。 */
function renderRail(m: RadarProfileModel): string {
  return headHtml(m) + rowsHtml(m) + noteHtml(m);
}

/** 形态 → 骨架（分派写在这里，加第四形态就是加一支）。 */
const SKELETONS: Readonly<Record<RadarProfileForm, (m: RadarProfileModel) => string>> = {
  polygon: renderPolygon,
  wedge: renderWedge,
  rail: renderRail,
};

/** 渲染多维画像雷达（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderRadarProfile(input: unknown): string {
  const m = normalizeRadarProfile(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + RADAR_PROFILE_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
