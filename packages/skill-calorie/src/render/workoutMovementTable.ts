/** T351 第二版 · 会话卡里的动作明细表（六列 → 一排四列的行内版式）。
 *
 * 为什么另立一件：装配件 `./workoutPlanDocs.ts` 已 348 行、告警线 350（`packages/skill-calorie/AGENTS.md`），
 * 本次要加「备注收窄 ＋ 类型中文化 ＋ 副行拼装」，放进去必超线；按结构标准把「动作明细表」整块搬到
 * 这里，那件只留页面装配。
 *
 * 版式（照老页 `workout_plan_view.html` 那套行内排版，规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` §二）：
 *   动作（加粗动作名 ＋ 块级副行小字「部位细化词 · 主要／孤立」）｜部位｜组数×次数｜重量
 * 节奏不进表：生产库 96 个有动作的场次**场内节奏 96/96 恒定**，摆成列就是整列重复，故由 `tempoOf()`
 * 交给会话标题行（休息日无表、无节奏）。
 *
 * 表格的表头与单元格标记仍由共用位 `base-paint/blocks` 的 `renderDataTable` 产出（本件不自造表格标记）；
 * 只有「动作格」那两块 HTML 是它表达不了的（它只收纯文本、按五字符表转义），故逐行落一个占位串、
 * 表装好后再把占位换成两块 HTML——与 `./planCopyBlock.ts` 给共用按钮补冻结 id 是同一手法。副行小字
 * 用共用位现成的一件 `renderCaliberLine`（12px ＋ `--fg2`，达 AA 对比度；原型里的 `#86868b` 正文小字
 * 在本仓已因对比度 3.62:1 被否，见 `base-render/src/blocks.ts` 的 `block-kpi-card-detail` 注释）。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderDataTable } from 'base-paint/blocks';
import type { PlanMovement } from '../workout/planStore.js';

/** 库里缺的字段一律写短横线，不印空白格（老页同口径）；页面的缺值记号以本件为唯一出处，
 *  装配件 `./workoutPlanDocs.ts` 从这里取（别的族各写各的，不去碰）。 */
export const DASH = '—';

/** 类型中文化：库里取值域只有两种（生产库 264 个动作实测：`iso`×204、`main`×60），
 *  页面上不出现英文原值；清单外的值原样输出，不吞。 */
const TYPE_ZH: Readonly<Record<string, string>> = { main: '主要', iso: '孤立' };

/** 单元格文本：库里缺字段或空串写短横线。 */
function cell(value: string | undefined): string {
  return value === undefined || value === '' ? DASH : value;
}

/** 组数×次数（组数＝`sets.length`，次数＝`sets[].reps`）：同重复数写「3组×12次」，
 *  逐组不同写「3组×10／12次」；库里没有 `sets` 写短横线。（口径随迁，未改。） */
function setsText(m: PlanMovement): string {
  const sets = m.sets ?? [];
  if (sets.length === 0) return DASH;
  const reps = [...new Set(sets.map((s) => s.reps))];
  return sets.length + '组×' + reps.join('／') + '次';
}

/** 重量（重量＝`sets[].weight` ＋ `unit`）：逐组同一写「35kg」，逐组不同写「30／35kg」；
 *  逐组都没有正数重量时，单位是 `kg`／`自重` 写「自重」、其余写短横线。（口径随迁，未改。） */
function weightText(m: PlanMovement): string {
  const sets = m.sets ?? [];
  if (sets.length === 0) return DASH;
  const unit = sets[0].unit;
  const weights = [...new Set(sets.map((s) => s.weight))];
  if (!weights.some((w) => w > 0)) return unit === 'kg' || unit === '自重' ? '自重' : DASH;
  return weights.join('／') + unit;
}

/** 备注 → { 部位细化词, 节奏 }。库里的备注形如 `胸整体 [W1 10reps×35.0kg, 20-30 RPM(2-2.5秒/次)]`：
 *  - 方括号**前**那截（`胸整体`）＝部位细化词，进动作格的副行；
 *  - 方括号**内**逗号**之后**那截＝节奏，进会话标题行（不进表）；
 *  - 方括号**内**逗号**之前**那截与「组数×次数／重量」两列逐字重复（生产库 264/264），**丢掉**；
 *  - 没有方括号的备注 → 整条作部位细化词；备注为空或短横线 → 两项都空。 */
function splitNote(note: string | undefined): { detail: string; tempo: string } {
  const raw = (note ?? '').trim();
  if (raw === '' || raw === DASH) return { detail: '', tempo: '' };
  const bracket = /^(.*?)\s*\[(.*)\]\s*$/.exec(raw);
  if (bracket === null) return { detail: raw, tempo: '' };
  const comma = bracket[2].indexOf(',');
  return { detail: bracket[1].trim(), tempo: comma === -1 ? '' : bracket[2].slice(comma + 1).trim() };
}

/** 副行：部位细化词 · 类型中文化（两项都空就不出副行）；块级小字走共用位的口径说明行。 */
function subLine(m: PlanMovement): string {
  const type = cell(m.type);
  const zh = type === DASH ? '' : TYPE_ZH[type] ?? type;
  const bits = [splitNote(m.note).detail, zh].filter((t) => t !== '');
  return bits.length === 0 ? '' : renderCaliberLine(bits.join(' · '));
}

/** 动作格的占位串：只含 ASCII 与花括号，`renderDataTable` 的转义不动它，替换目标不会撞车。 */
const mark = (i: number): string => '{{mv' + i + '}}';

/** 四列动作明细表（动作｜部位｜组数×次数｜重量）。零动作走 `renderDataTable` 的空态，不印空表。 */
export function movementTableHtml(moves: readonly PlanMovement[]): string {
  const rows = moves.map((m, i) => ({
    move: mark(i), part: cell(m.part), sets: setsText(m), weight: weightText(m),
  }));
  let html = renderDataTable({
    columns: [
      { key: 'move', label: '动作' },
      { key: 'part', label: '部位' },
      { key: 'sets', label: '组数×次数', align: 'right' },
      { key: 'weight', label: '重量', align: 'right' },
    ],
    rows,
    emptyText: '本场无动作明细',
  });
  for (let i = 0; i < moves.length; i += 1) {
    const found = html.split(mark(i)).length - 1;
    if (found !== 1) throw new Error('动作明细表：占位 ' + mark(i) + ' 在表里出现 ' + found + ' 次（应为 1 次）');
    html = html.replace(mark(i), '<strong>' + escapeHtml(cell(moves[i].name)) + '</strong>' + subLine(moves[i]));
  }
  return html;
}

/** 本场节奏（动作备注方括号内逗号之后那段）：取场内第一条非空；没有就空串，会话标题不加。
 *  休息日没有动作表，调用方不必喂它。 */
export function tempoOf(moves: readonly PlanMovement[]): string {
  for (const m of moves) {
    const tempo = splitNote(m.note).tempo;
    if (tempo !== '') return tempo;
  }
  return '';
}
