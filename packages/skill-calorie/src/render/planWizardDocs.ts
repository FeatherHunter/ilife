/** T351-v11 · 「构建向导」（`calorie.view.plan-wizard`，order186）整页装配。
 *
 * 为什么重做（负责人 2026-09-14 第 3 条原话）：`v4-186-构建向导.html` **功能完全缺失**——
 * 「看不到如何帮助用户构建出健身计划」。旧版只把校验结论印出来（结论卡 ＋ 错/警清单），
 * **看不到计划本身长什么样**，也就无从「构建」。老技能那版是 1060 行、26 颗按钮、0 个输入框，
 * 做法是把计划摊成**层级**给人看，人点哪一层就在那一层改。
 *
 * 本版照那个通路重做，但**守本仓契约**：`docs/base-paint-contract.md` 写死「禁内联脚本（AC-7 零注入面）」，
 * 故「就地改」不用脚本实现，改用**原生控件 ＋ CSS**：
 *   - 每一层（计划／周／日／时段／动作）挂一颗「改这一层」勾选；
 *   - 勾上就在该层**就地展开**它的写动作与指令（`input:checked ~ .ilw-how`，纯选择器）；
 *   - 右上角「你已改的内容 N」由 **CSS 计数器**现算（`input:checked{counter-increment}`），
 *     勾一颗加一，零脚本、零刷新。
 * 这是零脚本能做到的上限：**勾选与计数是真交互，展开的是那一层该用哪条指令**；但把用户勾的选项
 * 拼成一条可执行命令需要脚本，本页不做（要做得先改契约，见证据件「遗留」）。
 *
 * 页内样式住 `./planWizardCss.ts`（唯一产出者），页面级那套住 `./pageChromeCss.ts`（三族共用）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDisclosure, renderEmptyBlock, renderListRows } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
import { pageChromeCss } from './pageChromeCss.js';
import { planCopyBlock } from '../workout/planCopyBlock.js';
import { planWizardCss } from './planWizardCss.js';
import { nowStamp } from './receipt.js';
import type {
  PlanWizardView, WizardDay, WizardMovement, WizardSession, WizardTree, WizardWeek,
} from './planPlate.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';
const DASH = '—';

/** 星期名（`day_of_week` 1–7）。 */
const DOW = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 每一层「改它要说哪句话」。**一句一条**（原来写成 `编排某一周：说「定一周计划」；把整周复制…` 那种
 *  `；` 串，正是负责人 2026-09-15 第 ⑤ 条点名的「拿符号顶替设计」）——现在逐条排成胶囊。 */
const LEVEL_GUIDE: readonly { readonly acts: readonly string[] }[] = [
  { acts: ['改训练计划'] },
  { acts: ['定一周计划', '复制训练计划'] },
  { acts: ['改某天训练', '删某天训练', '定休息日'] },
  { acts: ['加训练动作'] },
  { acts: ['改动作'] },
];

/** 一层一条：勾上它在原地展开这一层的改法。`id` 要唯一（勾选与展开都挂在它上面）。 */
function tick(id: string, text: string): string {
  return '<label class="ilw-tick"><input type="checkbox" class="ilw-mark" id="' + id + '">'
    + '<span>' + text + '</span></label>';
}

/** 某一层的「说哪句话能改它」小块（默认收起，勾上才展开）：逐条一颗胶囊，不串成一句。 */
function how(id: string, level: number): string {
  const acts = LEVEL_GUIDE[level].acts
    .map((a) => '<span class="ilw-act">' + a + '</span>').join('');
  return '<p class="ilw-how" data-for="' + id + '">' + acts + '</p>';
}

/** 动作行（第 6 级「组」的内容挤在这行的右半边，因为它就是「几组几次多重」）。
 *  部位与类型各一颗小标签（原来 `胸 · 力量` 用 `·` 串，第 ⑤ 条）。 */
function moveRow(m: WizardMovement): string {
  const meta = [m.part, m.type].filter((t) => t !== '')
    .map((t) => '<span class="ilw-tag">' + t + '</span>').join('');
  return '<li class="ilw-move"><span class="ilw-move-name">' + m.name + '</span>'
    + (meta === '' ? '' : '<span class="ilw-move-meta">' + meta + '</span>')
    + '<span class="ilw-move-sets">' + m.sets + '</span></li>';
}

/** 时段块（时间线里最深的一层带内容的）。 */
function sessionBlock(s: WizardSession, id: string): string {
  const head = '<div class="ilw-sess-head"><span class="ilw-sess-name">' + s.label + '</span>'
    + (s.time === '' ? '' : '<span class="ilw-sess-time">' + s.time + '</span>')
    + '<span class="ilw-sess-count">' + s.moves.length + ' 个动作</span></div>';
  if (s.rest) return '<div class="ilw-sess ilw-sess-rest">' + head + '</div>';
  const body = s.moves.length === 0
    ? '<p class="ilw-gap">这个时段还没有动作——想加就说「加训练动作」</p>'
    : '<ul class="ilw-moves">' + s.moves.map(moveRow).join('') + '</ul>';
  return '<div class="ilw-sess">' + head + body + tick(id, '改这个时段的动作') + '</div>'
    + how(id, 3);
}

/** 一天块。 */
function dayBlock(d: WizardDay, weekId: string, dayIdx: number): string {
  const dow = DOW[d.dow] ?? '周' + d.dow;
  const id = weekId + '-d' + dayIdx;
  const body = d.sessions.length === 0
    ? '<p class="ilw-gap">这天还没有安排——要排就说「定一周计划」，要标休息就说「定休息日」</p>'
    : d.sessions.map((s, i) => sessionBlock(s, id + '-s' + i)).join('');
  return '<div class="ilw-day"><div class="ilw-day-head"><span class="ilw-day-name">' + dow + '</span>'
    + '<span class="ilw-day-count">' + d.sessions.length + ' 个时段</span></div>'
    + body + tick(id, '改这一天') + '</div>' + how(id, 2);
}

/** 一周块。 */
function weekBlock(w: WizardWeek, idx: number): string {
  const id = 'w' + idx;
  const body = w.days.length === 0
    ? '<p class="ilw-gap">这一周还没排——想排就说「定一周计划」</p>'
    : w.days.map((d, i) => dayBlock(d, id, i)).join('');
  return '<section class="ilw-week"><div class="ilw-week-head">'
    + '<span class="ilw-week-name">第 ' + w.week + ' 周</span>'
    + '<span class="ilw-week-count">' + w.days.length + ' 天</span>'
    + tick(id, '改这一周') + '</div>' + body + how(id, 1) + '</section>';
}

/** 计划级（时间线的根）：名字、说明、起日、等级、器械 ＋ 改法。 */
function planHead(t: WizardTree): string {
  const facts: string[] = [
    t.startDate === '' ? '' : '<span class="ilw-fact"><b>起日</b>' + t.startDate + '</span>',
    t.level === '' ? '' : '<span class="ilw-fact"><b>等级</b>' + t.level + '</span>',
    t.equipment.length === 0 ? '' : '<span class="ilw-fact"><b>器械</b>' + t.equipment.join('、') + '</span>',
  ].filter((x) => x !== '');
  return '<div class="ilw-plan"><div class="ilw-plan-head">'
    + '<span class="ilw-plan-name">' + t.title + '</span>'
    + '<span class="ilw-plan-count">'
    + '<span class="ilw-stat">' + t.totals.weeks + ' 周</span>'
    + '<span class="ilw-stat">' + t.totals.sessions + ' 个时段</span>'
    + '<span class="ilw-stat">' + t.totals.movements + ' 个动作</span></span></div>'
    + (t.description === '' ? '' : '<p class="ilw-plan-desc">' + t.description + '</p>')
    + (facts.length === 0 ? '' : '<div class="ilw-facts">' + facts.join('') + '</div>')
    + tick('plan', '改计划本身') + how('plan', 0) + '</div>';
}

/** 构建向导整页。 */
export function buildPlanWizardDoc(v: PlanWizardView, opts: {
  readonly key: string; readonly command: string; readonly prompt?: string;
}): string {
  const t = v.tree;
  const ok = v.errorCount === 0;
  // 校验结论排在最前：它是「现在能不能落地」的正据；下面才是计划本身的结构。
  const parts: string[] = [
    '<div class="ilw-verdict' + (ok ? ' is-ok' : ' is-warn') + '">'
      + '<span class="ilw-verdict-word">' + (ok ? '这份计划可以落地' : '先改掉硬止再确认') + '</span>'
      + '<span class="ilw-verdict-num">错误 ' + v.errorCount + ' 项</span>'
      + '<span class="ilw-verdict-num">警告 ' + v.warningCount + ' 项</span>'
      + '<span class="ilw-verdict-num">已检查 ' + v.checkedSessions + ' 个训练场次</span>'
      + '</div>',
    // 「时间线怎么读」一句话（口径行），别让它变成一段说明书。
    renderCaliberLine('这份计划按 计划 → 周 → 日 → 时段 → 动作 五层摊开。想改哪一层，就勾哪一层的「改」，'
      + '右上角数得出来你打算改几处。'),
    planHead(t),
    t.weeks.length === 0
      ? renderEmptyBlock({ title: '计划结构', text: '这份计划一个周都还没有——先说「定一周计划」把第一周排出来' })
      : '<div class="ilw-timeline">' + t.weeks.map(weekBlock).join('') + '</div>',
    ...(v.errors.length === 0 ? [] : [renderDisclosure({
      title: '硬止错误（' + v.errors.length + ' 条）', open: true,
      contentHtml: renderListRows({ items: v.errors.map((e, i) => ({ left: '错误' + (i + 1), main: e, right: '' })) }),
    })]),
    ...(v.warnings.length === 0 ? [] : [renderDisclosure({
      title: '警告（' + v.warningCount + ' 条）',
      contentHtml: renderListRows({ items: v.warnings.map((w, i) => ({ left: '警告' + (i + 1), main: w, right: '' })) }),
    })]),
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: opts.key,
        data: {
          metrics: metricsOf({
            weeks: t.totals.weeks, sessions: t.totals.sessions, movements: t.totals.movements,
            errorCount: v.errorCount, warningCount: v.warningCount,
          }),
        },
      } satisfies SerializableEnvelope,
      dataTitle: '【calorie · 构建向导】',
      prompt: opts.prompt ?? '',
      log: copyLog({
        command: opts.command, source: 'planStore 校验（构建向导，纯校验）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '构建向导',
    eyebrow: '健身计划',
    subtitle: null,
    // 「你已改的内容 N」：CSS 计数器现算，元素排在全部勾选之后、用绝对定位钉到区块右上角
    // （计数器取的是**文档顺序上它之前**的累计值，排最后才数得全）。
    content: pageChromeCss(960) + planWizardCss() + '<div class="ilw-wiz">' + parts.join('')
      + '<span class="ilw-count">你已改的内容 <b></b></span></div>',
    pageUi: true,
  });
}
