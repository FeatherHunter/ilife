/** #254 · 目标类三键的整页装配（`calorie.view.goal` · `calorie.view.goal-vs-actual` · `calorie.view.goal-expiring`）。
 *
 * 改前这 3 条命令（4 件实跑产物：`view.goal` 的 7 天／30 天两窗）走的是 `render/html.ts` 的旧片段
 * 渲染件——产物以 `<section class="ilife-page" …>` 起头，没有文档骨架。复核报告
 * `docs/skills/skill-calorie/t254-复核.md` §二 实测：4 件全部 doctype／charset／style 三条为假
 * （字节 1779／1779／1357／1203）。
 *
 * 本件照 #390 的姊妹件 `goal/goalWeightDoc.ts` 与 `shared/docPage.ts::assembleDocPage` 的形状，
 * 按 `t425-融合基准.md` §五 的骨架补齐八样：页框／页头（唤醒词 ＋ 类型徽章）／含本页读数的结论句／
 * 页内导航／读数卡与表／口径行／来源脚注／复制区双按钮（裁定 7：日志第 4 段＝可照抄重跑的命令原文）。
 * **#561（2026-09-15 用户裁决）**：八样里的**来源脚注**整条撤——「所有 HTML 页面底部的「数据来源：xxx」
 * 都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）」；来源名仍住复制日志第 3 段（`copyBlockOf`
 * 的 `source`），给 AI 照抄的技术原件一字不动。
 *
 * **#566（2026-09-15 用户肉眼验收）**：窗口区间**不进 H1**——「日期不写在标题，写在其他 UI 控件内」。
 * H1 只留页面名（「目标分析」／「目标对比实际」），区间改由页头 `meta-bar` 左边那一行承载
 * （`windowLineOf()`；`shared/docPage.ts:33` 定死这一行就是「参数一行小字（窗口／区间等）」）。
 * 本票只搬这一处：读数卡副说明与表题里的区间一字未动，页面上照样看得出这是哪一段时间。
 *
 * **取数一行不动**：本件只吃两条入参——`read.ts` 现算的视图对象与它现算的 `metrics`；同一份
 * `metrics` 对象既进信封 `data.metrics` 又进复制载荷，两处不会走散（票面「取数口径一个字不许变」）。
 * 旧片段渲染件按票面留在 `src/render/html.ts`，本票不删。
 *
 * 对外 5 个名字（票面「对外不超过 5 个名字」；#290 两页整页化与 #254 同一套装配件，取数与 metrics 原样透传）。
 */
import type { DataTextInput } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import type { GoalExpiringView, GoalVsActualView } from './goalExtraPlate.js';
import type { GoalConfig, GoalStatus } from './goalPlates.js';
import type { GoalView } from './goalPlate.js';

/** 信封头（值冻结对齐 `cli/keys.ts`，与各 `*Docs.ts` 同值；标题取目标管理域）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·目标管理';

/** 缺值一律 `—`（`t425` 裁定 4）：本件只做这一处格式化，不拿 0 顶缺、不写空串。 */
function num(v: number | null | undefined, unit: string): string {
  return v === null || v === undefined ? '—' : v + ' ' + unit;
}

/** 一张读数卡：值缺则只出「—」（单位槽跟着一起不出，免得出现「— 卡」）。 */
function cardOf(label: string, value: number | null | undefined, unit: string, detail?: string):
{ label: string; value: string; unit?: string; detail?: string } {
  if (value === null || value === undefined) return { label, value: '—' };
  const valueText = String(value);
  return detail === undefined
    ? { label, value: valueText, unit }
    : { label, value: valueText, unit, detail };
}

/** 区块外壳：锚点 `id` 与页内导航同源（导航项按同一份清单生成，不留指向不存在锚点的项）。 */
function section(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 缺口方向与摄入走向的读者话（数据层给的是 `loss`／`up` 这类内部取值，不上屏）。 */
const DEFICIT_TREND_ZH: Record<string, string> = { loss: '缺口在变大', gain: '缺口在变小', flat: '基本持平' };
const INTAKE_TREND_ZH: Record<string, string> = { up: '后半段比前半段多', down: '后半段比前半段少', flat: '前后半段基本持平' };

/** 页头第 1 行左的参数小字（`shared/docPage.ts:33` 定死这一行的用途＝窗口／区间）。
 *
 *  **#566**：窗口区间原来写在 H1 里（`'🎯 目标分析 ' + v.start + ' 至 ' + v.end`），负责人肉眼验收裁定
 *  「日期不写在标题，写在其他 UI 控件内」⇒ 区间搬到这里，H1 只留页面名。拼法与页内那两处同口径
 *  （读数卡副说明／表题都写「起 至 止」），读者一眼看得出这一页看的是哪一段。
 *  区间只在这一行新出现一次，卡与表的区间一个字没动（本票只搬 H1 那一处）。 */
function windowLineOf(metaLeft: string, start: string, end: string): string {
  return metaLeft + ' · 窗口 ' + start + ' 至 ' + end;
}

/** 复制区（双按钮：复制数据 ＋ 复制日志；裁定 7）。载荷与 `data.metrics` 是同一份对象。 */
function copyBlockOf(key: string, metrics: Record<string, number>, command: string, source: string): string {
  const envelope: DataTextInput['envelope'] = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key,
    data: { metrics },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command, source: DB_FILENAME + ' ｜ ' + source, actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  });
}

/** 页面装配的三条共用尾巴：口径行 ＋ 复制区（#561：来源脚注那条尾巴已按用户裁决整条撤）。 */
function tailOf(key: string, metrics: Record<string, number>, command: string, source: string, calibers: readonly string[]): string {
  return calibers.map((line) => renderCaliberLine(line)).join('')
    + copyBlockOf(key, metrics, command, source);
}

/* ── ① 目标分析（`calorie.view.goal`：目标值 ＋ 完成度 ＋ 缺口与摄入趋势） ───────────────────── */

/** 结论句（§五 第 3 行）：句内只摆本页读得出来的数，不编新日期、不编比率。 */
function goalSummaryOf(v: GoalView): string {
  const s = v.deficit.summary;
  const pct = v.completionPct === null ? '—' : v.completionPct + '%';
  return '结论：热量目标 ' + v.nutrition.calorie_goal + ' 卡，本窗日均摄入 ' + s.avgIntake
    + ' 卡，周缺口 ' + s.weeklyDeficit + ' 卡（按每 7700 卡折算约 ' + s.predictedLossKg + ' 公斤），'
    + '近 30 天完成率 ' + pct + '。';
}

export function buildGoalDoc(v: GoalView, metrics: Record<string, number>, command: string): string {
  const n = v.nutrition;
  const s = v.deficit.summary;
  const t = v.trend.summary;
  const recorded = v.history.completedCount + v.history.incompleteCount;
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: '读数' },
      { id: 'sec-goal', text: '目标值' },
      { id: 'sec-gap', text: '缺口与摄入' },
    ] }),
    section('sec-readings', renderKpiGrid([
      cardOf('热量目标', n.calorie_goal, '卡'),
      cardOf('蛋白目标', n.protein_goal, 'g'),
      cardOf('饮水目标', n.water_goal, 'ml'),
      { label: '达标天数', value: String(v.history.completedCount), unit: '天', detail: '近 30 天里有记录 ' + recorded + ' 天' },
      cardOf('周缺口', s.weeklyDeficit, '卡', '日均缺口 ' + s.avgDeficit + ' 卡'),
      cardOf('日均摄入', t.avg, '卡', v.start + ' 至 ' + v.end),
    ])),
    section('sec-goal', renderDataTable({
      columns: [{ key: 'item', label: '项目' }, { key: 'goal', label: '目标值', align: 'right' }],
      rows: [
        { item: '热量', goal: num(n.calorie_goal, '卡') },
        { item: '蛋白质', goal: num(n.protein_goal, 'g') },
        { item: '碳水化合物', goal: num(n.carbs_goal, 'g') },
        { item: '脂肪', goal: num(n.fat_goal, 'g') },
        { item: '饮水', goal: num(n.water_goal, 'ml') },
      ],
      caption: '现在每天要达成的目标值',
      emptyText: '还没设过营养目标',
    })),
    section('sec-gap', renderDataTable({
      columns: [
        { key: 'item', label: '项目' },
        { key: 'reading', label: '读数', align: 'right' },
        { key: 'note', label: '说明' },
      ],
      rows: [
        { item: '日均摄入', reading: num(s.avgIntake, '卡'), note: '窗口里每天平均吃进去的' },
        { item: '日均消耗', reading: num(s.avgBurn, '卡'), note: '日常消耗加当天运动 ' + s.avgExerciseBurn + ' 卡' },
        { item: '日均缺口', reading: num(s.avgDeficit, '卡'), note: DEFICIT_TREND_ZH[s.trend] },
        { item: '周缺口', reading: num(s.weeklyDeficit, '卡'), note: '按整周合计' },
        { item: '预计减重', reading: num(s.predictedLossKg, 'kg'), note: '按每 7700 卡折算一公斤' },
        { item: '摄入走向', reading: INTAKE_TREND_ZH[t.trend], note: '窗口前后半段比一比' },
      ],
      caption: '这一段时间的缺口与摄入（' + v.start + ' 至 ' + v.end + '）',
      emptyText: '窗口里没有饮食记录',
    })),
    tailOf('calorie.view.goal', metrics, command, '目标表与饮食记录',
      ['缺口是当天消耗减掉当天摄入的差，正数代表有缺口。', '消耗算日常消耗加当天运动，摄入只算吃进去的，喝水不算。']),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    // #566：H1 只留页面名；窗口区间住页头 meta-bar 左行（windowLineOf）。
    title: '🎯 目标分析',
    eyebrow: '',
    subtitle: null,
    metaLeft: windowLineOf('看目标完成度 · 目标管理', v.start, v.end),
    badge: '目标分析',
    summary: goalSummaryOf(v),
    content: body,
    charts: false,
  });
}

/* ── ② 目标对比实际（`calorie.view.goal-vs-actual`：逐日达成 ＋ 摄入走向） ───────────────────── */

export function buildGoalVsActualDoc(v: GoalVsActualView, metrics: Record<string, number>, command: string): string {
  const recorded = v.completedCount + v.incompleteCount;
  const devs = v.history.goalHistory.filter((d) => d.status !== '无记录' && typeof d.pct === 'number');
  const meanDev = devs.length === 0 ? null : Math.round((devs.reduce((a, d) => a + (d.pct as number), 0) / devs.length - 100) * 100) / 100;
  const pct = v.completionPct === null ? '—' : v.completionPct + '%';
  const t = v.trend.summary;
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: '读数' },
      { id: 'sec-days', text: '逐日达成' },
      { id: 'sec-trend', text: '摄入走向' },
    ] }),
    section('sec-readings', renderKpiGrid([
      cardOf('热量目标', v.calorieGoal, '卡'),
      { label: '达标天数', value: String(v.completedCount), unit: '天', detail: '近 30 天里有记录 ' + recorded + ' 天' },
      cardOf('完成率', v.completionPct, '%'),
      cardOf('本窗日均摄入', v.trendAvg, '卡', v.start + ' 至 ' + v.end),
    ])),
    section('sec-days', renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'intake', label: '摄入', align: 'right' },
        { key: 'goal', label: '目标', align: 'right' },
        { key: 'pct', label: '达成', align: 'right' },
        { key: 'status', label: '状态' },
      ],
      /* 没记录的日期照裁定 4 写 `—`（不拿 0 顶）——「这三天没记」与「记了但吃 0 卡」是两回事。 */
      rows: v.history.goalHistory.map((d) => ({
        date: d.date,
        intake: d.status === '无记录' ? '—' : num(d.calorieActual, '卡'),
        goal: num(d.calorieGoal, '卡'),
        pct: d.status === '无记录' ? '—' : num(d.pct, '%'),
        status: d.status,
      })),
      caption: '最近 30 天逐日达成（达标线是当天摄入落在目标热量的 80% 到 120% 之间）',
      emptyText: '这 30 天里一条饮食记录都没有',
    })),
    section('sec-trend', renderDataTable({
      columns: [{ key: 'item', label: '项目' }, { key: 'reading', label: '读数', align: 'right' }],
      rows: [
        { item: '窗口日均', reading: num(t.avg, '卡') },
        { item: '工作日平均', reading: num(t.weekdayAvg, '卡') },
        { item: '周末平均', reading: num(t.weekendAvg, '卡') },
        { item: '窗口前半段', reading: num(t.startAvg, '卡') },
        { item: '窗口后半段', reading: num(t.endAvg, '卡') },
        { item: '平均偏差', reading: meanDev === null ? '—' : meanDev + ' %' },
      ],
      caption: '摄入走向（本窗 ' + v.start + ' 至 ' + v.end + '）',
      emptyText: '窗口里没有饮食记录',
    })),
    tailOf('calorie.view.goal-vs-actual', metrics, command, '目标表与饮食记录',
      ['达标线是当天摄入落在热量目标的 80% 到 120% 之间，没记录的日期不计入达标也不计入未达标。',
        '平均偏差是有记录那几天达成率偏离 100% 的均值，正数代表平均超目标；老技能同式，缺项时不算。']),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    // #566：同 `buildGoalDoc`——H1 只留页面名，窗口区间住页头 meta-bar 左行。
    title: '🎯 目标对比实际',
    eyebrow: '',
    subtitle: null,
    metaLeft: windowLineOf('看目标对比实际 · 目标管理', v.start, v.end),
    badge: '目标对比实际',
    summary: '结论：热量目标 ' + (v.calorieGoal === null ? '—' : v.calorieGoal + ' 卡') + '，最近 30 天里有记录 '
      + recorded + ' 天、达标 ' + v.completedCount + ' 天（完成率 ' + pct + '），本窗日均摄入 ' + v.trendAvg + ' 卡。',
    content: body,
    charts: false,
  });
}

/** 紧迫度（呈现层派生，不动取数：已过期／3 天内高／落提醒窗中／窗外低；老技能另按需算速率分档，需当前体重，口径差见本页口径行）。 */
function urgencyOf(v: GoalExpiringView): string {
  if (v.daysLeft < 0) return '已过期';
  if (v.daysLeft <= 3) return '高';
  if (v.daysLeft <= v.withinDays) return '中';
  return '低';
}

/* ── ③ 即将到期目标（`calorie.view.goal-expiring`：截止日 ＋ 剩余天数两态） ─────────────────── */

export function buildGoalExpiringDoc(v: GoalExpiringView, metrics: Record<string, number>, command: string): string {
  const state = v.expiring ? '即将到期' : '还没进提醒窗口';
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: '读数' },
      { id: 'sec-detail', text: '到期明细' },
    ] }),
    section('sec-readings', renderKpiGrid([
      { label: '目标截止日', value: v.deadline, detail: state },
      { label: '紧迫度', value: urgencyOf(v), detail: '剩余 ' + v.daysLeft + ' 天／窗口 ' + v.withinDays + ' 天' },
      cardOf('剩余天数', v.daysLeft, '天', '提醒窗口 ' + v.withinDays + ' 天'),
      cardOf('体重目标', v.weightGoal, 'kg'),
      cardOf('热量目标', v.calorieGoal, '卡'),
    ])),
    section('sec-detail', renderDataTable({
      columns: [
        { key: 'item', label: '项目' },
        { key: 'reading', label: '读数', align: 'right' },
        { key: 'note', label: '说明' },
      ],
      rows: [
        { item: '目标截止日', reading: v.deadline, note: state },
        { item: '剩余天数', reading: num(v.daysLeft, '天'), note: '从今天算起' },
        { item: '提醒窗口', reading: num(v.withinDays, '天'), note: '剩余天数落进窗口才算即将到期' },
        { item: '体重目标', reading: num(v.weightGoal, 'kg'), note: '取自体重目标' },
        { item: '热量目标', reading: num(v.calorieGoal, '卡'), note: '取自营养目标' },
      ],
      caption: '这条目标离到期还有多远',
      emptyText: '没有设过带截止日的目标',
    })),
    tailOf('calorie.view.goal-expiring', metrics, command, '目标表与体重目标',
      ['即将到期是指剩余天数落进你设的提醒窗口内，窗口默认 14 天。', '截止日与体重目标都要先设过才有这一页，缺一样就先补齐再来看。',
        '紧迫度只按剩余天数分档（3 天内高／落窗中／窗外低）；老技能另按需算速率分档，需当前体重，取数口径另开票裁。']),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '⏳ 目标到期提醒',
    eyebrow: '',
    subtitle: null,
    metaLeft: '看即将到期的目标 · 目标管理',
    badge: '即将到期目标',
    summary: '结论：目标截止 ' + v.deadline + '，还剩 ' + v.daysLeft + ' 天，提醒窗口 ' + v.withinDays
      + ' 天，' + (v.expiring ? '已经落进窗口，该安排收尾了。' : '还没进窗口，暂时不用处理。'),
    content: body,
    charts: false,
  });
}

/* ── ④ 目标配置／⑤ 目标状态（#290：两条悬空视图整页化） ── */
/** 两页共用装配：读数卡＋明细表＋口径复制尾（与 #254 三页同一套 `tailOf`／`section`／`cardOf`／`num`）。 */
function simpleGoalDoc(key: string, title: string, badge: string, metaLeft: string, summary: string, cards: { label: string; value: string; unit?: string; detail?: string }[], caption: string, rows: { item: string; reading: string; note: string }[], metrics: Record<string, number>, command: string, calibers: readonly string[]): string {
  const body = [
    renderTocBlock({ items: [{ id: 'sec-readings', text: '读数' }, { id: 'sec-detail', text: '明细' }] }),
    section('sec-readings', renderKpiGrid(cards)),
    section('sec-detail', renderDataTable({ columns: [{ key: 'item', label: '项目' }, { key: 'reading', label: '读数', align: 'right' }, { key: 'note', label: '说明' }], rows, caption, emptyText: '暂无明细' })),
    tailOf(key, metrics, command, '目标表', calibers),
  ].join('');
  return assembleDocPage({ docTitle: DOC_TITLE, title, eyebrow: '', subtitle: null, metaLeft, badge, summary, content: body, charts: false });
}

export function buildGoalConfigDoc(g: GoalConfig, metrics: Record<string, number>, command: string): string {
  const n = g.nutrition;
  return simpleGoalDoc('calorie.view.goal-config', '⚙️ 目标配置', '目标配置', '看目标配置 · 目标管理',
    '结论：热量目标 ' + n.calorie_goal + ' 卡（蛋白 ' + num(n.protein_goal, 'g') + '／碳水 ' + num(n.carbs_goal, 'g') + '／脂肪 ' + num(n.fat_goal, 'g') + '，饮水 ' + num(n.water_goal, 'ml') + '），宏量' + (g.consistent ? '自洽（差 ' + g.diffKcal + ' 卡）。' : '偏差 ' + g.diffKcal + ' 卡，建议复核。') + '目标' + (g.paused ? '已暂停。' : '进行中。'),
    [cardOf('热量目标', n.calorie_goal, '卡'), cardOf('蛋白目标', n.protein_goal, 'g'), cardOf('碳水目标', n.carbs_goal, 'g'), cardOf('脂肪目标', n.fat_goal, 'g'), cardOf('饮水目标', n.water_goal, 'ml'), { label: '状态', value: g.paused ? '已暂停' : '进行中', detail: g.paused ? '暂停于 ' + (g.pausedAt ?? '—') : '目标进行中' }],
    '宏量与热量目标对得上对不上',
    [{ item: '宏量折算热量', reading: num(n.calorie_goal + g.diffKcal, '卡'), note: '蛋白×4＋碳水×4＋脂肪×9' }, { item: '与热量目标差', reading: (g.diffKcal >= 0 ? '+' : '') + g.diffKcal + ' 卡', note: g.consistent ? '50 卡以内算自洽' : '超出 50 卡，建议复核' }, { item: '暂停态', reading: g.paused ? '已暂停' : '进行中', note: g.paused ? '暂停于 ' + (g.pausedAt ?? '—') : '记录与目标照常' }],
    metrics, command, ['宏量折算按蛋白 4 卡／碳水 4 卡／脂肪 9 卡，差值在 50 卡以内算自洽。', '暂停只停目标判定，记录照常。']);
}

export function buildGoalStatusDoc(g: GoalStatus, metrics: Record<string, number>, command: string): string {
  const n = g.nutrition;
  return simpleGoalDoc('calorie.view.goal-status', '⏸️ 目标状态', '目标状态', '看目标状态 · 目标管理',
    '结论：目标' + (g.paused ? '已暂停' + (g.pausedAt === null ? '。' : '（' + g.pausedAt + '起）。') : '进行中。') + '热量目标 ' + n.calorie_goal + ' 卡，饮水目标 ' + num(n.water_goal, 'ml') + '。',
    [{ label: '状态', value: g.paused ? '已暂停' : '进行中', detail: g.paused ? '暂停于 ' + (g.pausedAt ?? '—') : '目标进行中' }, cardOf('热量目标', n.calorie_goal, '卡'), cardOf('饮水目标', n.water_goal, 'ml'), { label: '暂停时间', value: g.pausedAt ?? '—', detail: g.paused ? '恢复后清零' : '未暂停过' }],
    '目标当前是什么状态',
    [{ item: '暂停态', reading: g.paused ? '已暂停' : '进行中', note: g.paused ? '暂停于 ' + (g.pausedAt ?? '—') : '记录与目标照常' }, { item: '热量目标', reading: num(n.calorie_goal, '卡'), note: '取自营养目标' }, { item: '饮水目标', reading: num(n.water_goal, 'ml'), note: '取自营养目标' }, { item: '恢复入口', reading: '说「重启所有目标」', note: '恢复后目标继续判定，记录不断' }],
    metrics, command, ['暂停只停目标判定，记录照常。', '说「重启所有目标」即恢复进行中。']);
}
