/** T351 第二版 · 场次卡里的动作明细表（六列 → 一排四列的行内版式）。
 *
 * 为什么另立一件：装配件 `./workoutPlanDocs.ts` 已 348 行、告警线 350（`packages/skill-calorie/AGENTS.md`），
 * 本次要加「备注收窄 ＋ 类型中文化 ＋ 副行拼装」，放进去必超线；按结构标准把「动作明细表」整块搬到
 * 这里，那件只留页面装配。
 *
 * 版式（照老页 `workout_plan_view.html` 那套行内排版，规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` §二）：
 *   动作（加粗动作名 ＋ 块级副行小字「部位细化词 · 主要／孤立」）｜部位（彩色徽章）｜组数×次数｜重量
 * 副行第一段（部位细化词）里若混着类型裸词（生产库 24 个动作写成 `背 iso 主`／`背 iso 补充`，与该行
 * `type=iso` 同值），按 `detailWord()` 中文化并去掉与第二段同字的那个词——页面上不出现 `main`／`iso`。
 * 节奏不进表：生产库 96 个有动作的场次**场内节奏 96/96 恒定**，摆成列就是整列重复，故由 `tempoOf()`
 * 交给场次卡头行（休息日无表、无节奏）。
 *
 * 部位改成彩色徽章（T351-v5 补——上一轮降级成纯文本，负责人点名要老页那枚色块）：库中词 → 类名
 * `ilw-pb-<slug>`，色值以 `./workoutPlanCss.ts` 的色板为唯一出处（老页是逐格内联 `background:色20;color:色`，
 * 本页落类名，正文里零内联样式）；清单外的部位走灰徽章，空部位仍是短横线。
 *
 * 表格的表头与单元格标记仍由共用位 `base-paint/blocks` 的 `renderDataTable` 产出（本件不自造表格标记）；
 * 只有「动作格」「部位格」那两块 HTML 是它表达不了的（它只收纯文本、按五字符表转义），故逐行落一个占位串、
 * 表装好后再把占位换成两块 HTML——与 `./planCopyBlock.ts` 给共用按钮补冻结 id 是同一手法。副行小字
 * 用共用位现成的一件 `renderCaliberLine`（12px ＋ `--fg2`，达 AA 对比度；原型里的 `#86868b` 正文小字
 * 在本仓已因对比度 3.62:1 被否，见 `base-render/src/blocks.ts` 的 `block-kpi-card-detail` 注释）。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderDataTable } from 'base-paint/blocks';
import { PART_CLASS, PART_FALLBACK_CLASS } from './workoutPlanCss.js';
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

/** 部位细化词里的类型裸词：生产库确有备注写成 `背 iso 主`／`背 iso 补充`（24 个动作，24/24 与该行
 *  `type=iso` 同值）——那截里的裸词跟副行第二段的类型是**同一件事**，照原样印既出英文又重复。
 *  处置：先把裸词按同一张表中文化，再删掉那个与第二段**同字**的词；其余逐字保留、不吞。
 *  例：`背 iso 主` → `背 主`（副行读作「背 主 · 孤立」）；`背 iso 补充` → `背 补充`；`胸整体` 一字不动。 */
function detailWord(raw: string, typeZh: string): string {
  const words = raw.split(/\s+/).filter((w) => w !== '').map((w) => TYPE_ZH[w] ?? w);
  if (typeZh !== '') {
    const dup = words.indexOf(typeZh);
    if (dup >= 0) words.splice(dup, 1);
  }
  return words.join(' ');
}

/** 副行：部位细化词 · 类型中文化（两项都空就不出副行）；块级小字走共用位的口径说明行。 */
function subLine(m: PlanMovement): string {
  const type = cell(m.type);
  const zh = type === DASH ? '' : TYPE_ZH[type] ?? type;
  const bits = [detailWord(splitNote(m.note).detail, zh), zh].filter((t) => t !== '');
  return bits.length === 0 ? '' : renderCaliberLine(bits.join(' · '));
}

/** 动作格的占位串：只含 ASCII 与花括号，`renderDataTable` 的转义不动它，替换目标不会撞车。 */
const mark = (i: number): string => '{{mv' + i + '}}';

/** 部位格的占位串（同上手法，与动作格互不为子串）。 */
const partMark = (i: number): string => '{{pt' + i + '}}';

/** 部位徽章：库中词 → `ilw-pb-<slug>`（色板唯一出处 `./workoutPlanCss.ts`）；清单外的部位走灰徽章；
 *  库里没这个字段时仍出短横线，不出一颗空徽章。 */
function partBadge(part: string | undefined): string {
  const word = cell(part);
  if (word === DASH) return DASH;
  const slug = PART_CLASS[word] ?? PART_FALLBACK_CLASS;
  return '<span class="ilw-pb ilw-pb-' + slug + '">' + escapeHtml(word) + '</span>';
}

/** 占位换真块：占位在表里必须恰好出现一次，否则抛（防「表长了两格」这类静默错位）。 */
function fill(html: string, placeholder: string, block: string): string {
  const found = html.split(placeholder).length - 1;
  if (found !== 1) throw new Error('动作明细表：占位 ' + placeholder + ' 在表里出现 ' + found + ' 次（应为 1 次）');
  return html.replace(placeholder, block);
}

/** 四列动作明细表（动作｜部位｜组数×次数｜重量）。零动作走 `renderDataTable` 的空态，不印空表。 */
export function movementTableHtml(moves: readonly PlanMovement[]): string {
  const rows = moves.map((m, i) => ({
    move: mark(i), part: partMark(i), sets: setsText(m), weight: weightText(m),
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
    html = fill(html, mark(i), '<strong>' + escapeHtml(cell(moves[i].name)) + '</strong>' + subLine(moves[i]));
    html = fill(html, partMark(i), partBadge(moves[i].part));
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
