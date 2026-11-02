/** #589 · 目标推荐整页装配（`calorie.view.goal-recommend`：按档案与目标方向算的推荐值 ＋ 依据）。
 *
 * 改前这条命令走 `src/render/html.ts::renderGoalRecommendHtml` 的旧片段——产物以
 * `<section class="ilife-page" …>` 起头、**没有文档骨架**（#256 锁票探针第 26 条；本票改前复测
 * 1968 B，读数与前后对照见 `docs/skills/skill-calorie/t589-推荐页-证据.md` §一／§二）。
 *
 * 本件照**目标域同族装配**（`docs/skills/skill-calorie/t290-后半-证据.md` 的 `./resultDocs.ts` 那套：
 * #561 之后的八样＝页框／页头（唤醒词一行 ＋ 类型徽章）／含本页读数的结论句／页内导航／读数卡与表／
 * 口径行／复制区双按钮）。**不另起第二套**：`cardOf`／`section`／`tailOf` 三个小件从 `./resultDocs.ts`
 * 引入（同目录内互相用，按 `docs/agents/structure.md` 铁律五「目录内互相用的不算对外面」，该件的对外
 * 五个名字不变）；本件只写这一页的版式。
 *
 * 取数一行不动：本件只吃 `read.ts` 现算的 `GoalRecommend` 与它现算的 `metrics`（票面「推荐数
 * （cut：TDEE／2064／141／57／246／2471）与当刻一致」）——`metrics` 只进复制载荷，本件不另算一个数。
 *
 * 命令名、路由、`WAKE_TABLE`、HELP 卡片归属一字不动（`src/goal/routes.ts:37` 的 exec 行、
 * `src/triggers/help-lookup.ts:69`、生成物 `src/triggers/routes.generated.ts` 都不碰）。
 * 旧片段 `renderGoalRecommendHtml` 按票面留在 `src/render/html.ts:262`——**只出台账不删**（台账见证据 §六）。
 *
 * 对外一个名字：`buildGoalRecommendDoc`（本件只给这一页；装配面不出目标目录）。
 */
import { renderCaliberLine, renderDataTable, renderDisclosure, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { humanText } from '../render/trendDocs.js';
import type { GoalRecommend } from './goalPlates.js';
import { cardOf, section, tailOf } from './resultDocs.js';
import { m } from '../entries/index.js';

/** head 的 `<title>`：与目标域各页同值（`DOC_TITLE` 口径冻结对齐 `cli/keys.ts` 的域标题）。 */

/** 本页命令键：与路由层那条 exec 行逐字同键（复制日志第 4 段要能照抄重跑）。 */
const CMD_KEY = 'calorie.view.goal-recommend';
/** 数据来源（复制日志第 3 段后半）：本页只读这三处；#561 起正文不再出页脚来源行，日志里仍留得住。 */
const copySource = (): string => m('skill-calorie.goal-goalRecommendDoc.c073');

/** 自洽差值带符号（`+3`／`-3` 一眼看得出方向；差 0 不写符号）。 */
function signed(v: number): string {
  return (v > 0 ? '+' : '') + v;
}

/** 结论句（§五 第 3 行）：句内只摆本页读得出来的数，不编新日期、不编比率。 */
function recommendSummary(g: GoalRecommend): string {
  const r = g.recommend;
  return m('skill-calorie.goal-goalRecommendDoc.c001', {
    p0: String(r.profileLabel),
    p1: String(r.basis.weightKg),
    p2: String(r.calorieGoal),
    p3: String(r.proteinGoal),
    p4: String(r.carbsGoal),
    p5: String(r.fatGoal),
    p6: String(r.waterGoal),
    p7: String(r.selfCheck.calculatedKcal),
    p8: String(signed(r.selfCheck.diffKcal)),
  });
}

/** 目标推荐整页：读数卡 ＋ 算法口径表 ＋ 计算依据（数据层原句归一后逐行）＋ 口径与复制尾。
 *
 *  `command`＝可照抄重跑的命令原文（由 `read.ts` 按本次 `profile` 现拼）；`metrics`＝同一份信封读数。 */
export function buildGoalRecommendDoc(g: GoalRecommend, metrics: Record<string, number>, command: string): string {
  const r = g.recommend;
  const sc = r.selfCheck;
  const consistent = Math.abs(sc.diffKcal) <= 50;
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: m('skill-calorie.goal-goalRecommendDoc.c002') },
      { id: 'sec-calc', text: m('skill-calorie.goal-goalRecommendDoc.c003') },
      { id: 'sec-basis', text: m('skill-calorie.goal-goalRecommendDoc.c004') },
    ] }),
    section('sec-readings', renderKpiGrid([
      { label: m('skill-calorie.goal-goalRecommendDoc.c005'), value: r.profileLabel, detail: m('skill-calorie.goal-goalRecommendDoc.c006') },
      cardOf(m('skill-calorie.goal-goalRecommendDoc.c007'), r.calorieGoal, m('skill-calorie.goal-goalRecommendDoc.c008'), m('skill-calorie.goal-goalRecommendDoc.c074', { p0: String(r.weeklyRateKg) })),
      cardOf(m('skill-calorie.goal-goalRecommendDoc.c009'), r.proteinGoal, 'g'),
      cardOf(m('skill-calorie.goal-goalRecommendDoc.c010'), r.carbsGoal, 'g'),
      cardOf(m('skill-calorie.goal-goalRecommendDoc.c011'), r.fatGoal, 'g'),
      cardOf(m('skill-calorie.goal-goalRecommendDoc.c012'), r.waterGoal, 'ml', g.water.basis),
    ])),
    section('sec-calc', renderDataTable({
      columns: [
        { key: 'item', label: m('skill-calorie.goal-goalRecommendDoc.c013') },
        { key: 'reading', label: m('skill-calorie.goal-goalRecommendDoc.c014'), align: 'right' },
        { key: 'note', label: m('skill-calorie.goal-goalRecommendDoc.c015') },
      ],
      rows: [
        { item: m('skill-calorie.goal-goalRecommendDoc.c016'), reading: m('skill-calorie.goal-goalRecommendDoc.c017', { p0: String(r.bmr) }), note: m('skill-calorie.goal-goalRecommendDoc.c018') },
        { item: m('skill-calorie.goal-goalRecommendDoc.c019'), reading: m('skill-calorie.goal-goalRecommendDoc.c020', { p0: String(r.tdee) }), note: m('skill-calorie.goal-goalRecommendDoc.c021') },
        { item: m('skill-calorie.goal-goalRecommendDoc.c022'), reading: r.basis.weightKg + ' kg', note: m('skill-calorie.goal-goalRecommendDoc.c023') },
        { item: m('skill-calorie.goal-goalRecommendDoc.c024'), reading: m('skill-calorie.goal-goalRecommendDoc.c025', { p0: String(sc.calculatedKcal) }), note: m('skill-calorie.goal-goalRecommendDoc.c026') },
        { item: m('skill-calorie.goal-goalRecommendDoc.c027'), reading: m('skill-calorie.goal-goalRecommendDoc.c028', { p0: String(signed(sc.diffKcal)) }), note: consistent ? m('skill-calorie.goal-goalRecommendDoc.c029') : m('skill-calorie.goal-goalRecommendDoc.c030') },
      ],
      caption: m('skill-calorie.goal-goalRecommendDoc.c031'),
      emptyText: m('skill-calorie.goal-goalRecommendDoc.c032'),
    })),
    /* 计算依据＝数据层 `planReasons` 原句，上屏归一（`humanText`：英文缩写换人话，见 #160）后逐行；
       同族先例＝`src/goal/receipt.ts:282`（`r.planReasons.map(renderCaliberLine)`）。 */
    section('sec-basis', renderDisclosure({
      title: m('skill-calorie.goal-goalRecommendDoc.c033'),
      contentHtml: r.planReasons.map((s) => renderCaliberLine(humanText(s))).join(''),
      open: true,
    })),
    tailOf(CMD_KEY, metrics, command, copySource(), [
      m('skill-calorie.goal-goalRecommendDoc.c034'),
      m('skill-calorie.goal-goalRecommendDoc.c035'),
      m('skill-calorie.goal-goalRecommendDoc.c036'),
    ]),
  ].join('');
  return assembleDocPage({
    docTitle: m('skill-calorie.goal-goalRecommendDoc.c072'),
    /* #566 口径：H1 只留页面名；方案名在下面「方案」那张卡上，不在标题里复读。 */
    title: m('skill-calorie.goal-goalRecommendDoc.c037'),
    eyebrow: '',
    subtitle: null,
    metaLeft: m('skill-calorie.goal-goalRecommendDoc.c038'),
    badge: m('skill-calorie.goal-goalRecommendDoc.c039'),
    summary: recommendSummary(g),
    content: body,
    charts: false,
    pageUi: true,
  });
}
