/** #251 · 目标域的**预检确认页**装配：11 条写入词共用这一张可配置页面。
 *
 * 谁在吃：`src/cli/cmd_read.ts` 的 `calorie.view.goal-wizard`（只读页面命令，服务三条自动算词
 * 与八条手填/改类词）。草稿模型住同目录 `set.ts`（`buildGoalDraft`）。
 *
 * 照老技能实物重写（#251 取证：`docs/skills/skill-calorie/t251-老技能写前页.md`）：
 *   营养配置页 7 块／饮水配置页 5 块／推荐页 6 块。三张老页共有的骨架是「现状 → 要填的项 → 改前 vs 改后
 *   → 复制给 AI 的指令」；推荐页另有「推荐方案 ＋ 推荐依据 ＋ 只读预览框」。
 *   一条老实物经验照抄：**写前与写后的分界不是「有没有 diff」，是「页面上有没有值的来源」**——
 *   本页只摆**改前基准与推荐值**，不替 AI 算最终对比（老技能同样不算，`diff.items[].new` 恒空）。
 *
 * 一条老实物坑**不照抄**：老配置页的字段上下限散在模板的 `FIELD_META` 里，本页把上限写进 `hint`
 *   （页面上看得见），真正的拦截仍在写命令的参数校验里。
 *
 * 一页一事：字段面（营养五项 ＋ 体重四项）就是本子功能的题目，故这一页住本文件；
 *   写后回执页不住这里（它吃 `CrudReceipt`，归「写后回执页」那张票）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderDisclosure, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { nowStamp } from '../render/receipt.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import type { GoalDraft } from './set.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·目标预检';
/** 本页由哪条命令产出（写进「复制日志」第 4 段，可照抄重跑）。 */
const WIZARD_KEY = 'calorie.view.goal-wizard';
/** 数据来源一句话（页面上给用户看的「这份数是哪来的」）。 */
const GOAL_SOURCE = 'daily_goal ＋ user_profile ＋ weight_log';

/** 营养五项：字段名与中文标签（老配置页的 label 逐字），上限写进 hint 供页面显示。 */
const NUTRI_FIELDS = [
  { name: 'calorie', label: '热量(卡)', hint: '上限 4550，步进 5' },
  { name: 'protein', label: '蛋白(g)', hint: '上限 300' },
  { name: 'carbs', label: '碳水(g)', hint: '上限 500' },
  { name: 'fat', label: '脂肪(g)', hint: '上限 150' },
  { name: 'water', label: '饮水(ml)', hint: '上限 6000，步进 100' },
] as const;

/** 预检确认页的入参（≤5 字段）。 */
export interface GoalPrecheckView {
  /** 展开本页的是哪条写入词；`null` ＝ 不针对某一条（把要填的都列出来）。 */
  readonly wakeWord: string | null;
  readonly draft: GoalDraft;
  /** 该唤醒词的逐字 prompt（复制指令那一路）。 */
  readonly prompt: string;
  /** 该唤醒词真要跑的命令原文（进「复制日志」第 4 段）。 */
  readonly command: string;
}

/** 一格草稿值 → 表格里的展示串；没值就写同一个词「未设置」（不在页面上编 0）。 */
function cellOf(v: number | null | undefined, unit: string): string {
  return v === null || v === undefined ? '未设置' : String(v) + unit;
}

/** 现值的五项表（改前基准）。老技能把它摆在页首，本页同位置。 */
function currentTable(d: GoalDraft): string {
  const c = d.current;
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '库内现值' }],
    rows: [
      { k: '热量(卡)', v: cellOf(c?.calorie_goal, ' 卡') },
      { k: '蛋白(g)', v: cellOf(c?.protein_goal, ' g') },
      { k: '碳水(g)', v: cellOf(c?.carbs_goal, ' g') },
      { k: '脂肪(g)', v: cellOf(c?.fat_goal, ' g') },
      { k: '饮水(ml)', v: cellOf(c?.water_goal, ' ml') },
      { k: '体重目标(kg)', v: cellOf(c?.weight_goal, ' kg') },
      { k: '截止日期', v: c?.goal_deadline ?? '未设置' },
    ],
    caption: '改前基准：本页只摆现值，不替 AI 算最终对比',
  });
}

/** 要填的 5 项：预填「推荐值 → 现值 → 空」三级回落，页面上看得见每一项的取值来源。 */
function fillForm(d: GoalDraft): string {
  const r = d.recommend;
  const c = d.current;
  const valueOf = (rec?: number | null, cur?: number | null): string => {
    const v = rec ?? cur ?? null;
    return v === null ? '' : String(v);
  };
  const rec = (n: string): number | null => {
    if (r === null) return null;
    if (n === 'calorie') return r.calorieGoal;
    if (n === 'protein') return r.proteinGoal;
    if (n === 'carbs') return r.carbsGoal;
    if (n === 'fat') return r.fatGoal;
    return r.waterGoal;
  };
  const cur = (n: string): number | null => {
    if (c === null) return null;
    if (n === 'calorie') return c.calorie_goal;
    if (n === 'protein') return c.protein_goal;
    if (n === 'carbs') return c.carbs_goal;
    if (n === 'fat') return c.fat_goal;
    return c.water_goal;
  };
  return renderParamForm({
    description: r === null
      ? '档案不齐，本页不出推荐值；下面是我按库内现值预填的，请直接改成你要的值'
      : '下面是我按档案算的推荐值，请核对后改成你要的值',
    fields: NUTRI_FIELDS.map((f) => ({ name: f.name, label: f.label, hint: f.hint, value: valueOf(rec(f.name), cur(f.name)) })),
  });
}

/** 体重四项（目标／起始日／截止日／起点体重）＋ 由它们推出来的速率与越线提示。
 *  没有截止日就不算速率——老技能那条「没填就当 90 天」的回落不照抄。 */
function weightBlock(d: GoalDraft): string {
  const w = d.weight;
  const rows = [
    { k: '目标体重(kg)', v: cellOf(w.targetKg, ' kg') },
    { k: '起点体重(kg)', v: w.startKg === null ? '未设置（按最近体重）' : w.startKg + ' kg' },
    { k: '起始日', v: w.startDate ?? '未设置' },
    { k: '截止日期', v: w.deadline ?? '未设置' },
    { k: '最近体重(kg)', v: cellOf(w.latestKg, ' kg') },
    { k: '还差(kg)', v: w.gapKg === null ? '不算（缺目标或缺体重）' : String(w.gapKg) + ' kg' },
    { k: '剩余天数', v: w.daysLeft === null ? '不算（没有截止日）' : String(w.daysLeft) + ' 天' },
    {
      k: '需要的每日调整',
      v: w.requiredDailyKcal === null ? '不算（缺截止日或缺体重）' : (w.requiredDailyKcal >= 0 ? '-' : '+') + Math.abs(w.requiredDailyKcal) + ' 卡/天',
    },
  ];
  const tables = [renderDataTable({ columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }], rows })];
  if (w.rateWarning !== null) tables.push('<p>' + w.rateWarning + '</p>');
  return tables.join('');
}

/** 预检确认页整页：现值 → 要填的项 → 推荐方案 → 体重草稿 → 复制指令。 */
export function buildGoalPrecheckDoc(v: GoalPrecheckView): string {
  const d = v.draft;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: WIZARD_KEY,
    data: {
      metrics: metricsOf({
        hasGoal: d.current === null ? 0 : 1,
        recommendReady: d.recommend === null ? 0 : 1,
        missingCount: d.energy.missing.length,
        fillCount: NUTRI_FIELDS.length,
      }),
    },
  };
  const r = d.recommend;
  const cards: KpiCardInput[] = [
    { label: '写入词', value: v.wakeWord ?? '全部写词', detail: v.wakeWord ? '填好表再复制指令' : '定目标／改目标共 13 条写词' },
    {
      label: '改前值',
      value: d.current === null ? '未设置' : '有',
      detail: d.current === null ? '空库：本次是首次设目标' : '库里已有目标，下面「库内现值」就是改前基准',
    },
    {
      label: '推荐',
      value: d.profileLabel ?? '不推荐',
      detail: r === null
        ? (d.profile === null ? '本条词要你直接给值' : '档案缺' + (d.energy.missing.join('／') || '项') + '，不出推荐数字')
        : 'TDEE ' + r.tdee + ' 卡 × 系数 ' + r.factor,
    },
  ];
  const content = [
    renderKpiGrid(cards),
    renderDisclosure({ title: '库内现值（改前基准）', contentHtml: currentTable(d), open: true }),
    renderDisclosure({ title: '营养 5 项（要填的项）', contentHtml: fillForm(d), open: true }),
    r === null
      ? renderDisclosure({
        title: '推荐方案',
        contentHtml: '<p>' + (d.profile === null
          ? '本条写入词要你直接给值，不算推荐。'
          : '档案里缺 ' + d.energy.missing.join('／') + '，<b>不算推荐数字</b>——补上档案与体重记录再回来，或直接手填下面 5 项。') + '</p>',
        open: true,
      })
      : renderDisclosure({
        title: '推荐方案与依据（' + (d.profileLabel ?? '') + '）',
        contentHtml: renderDataTable({
          columns: [{ key: 'k', label: '项' }, { key: 'v', label: '推荐值' }],
          rows: [
            { k: '热量(卡)', v: r.calorieGoal + ' 卡' },
            { k: '蛋白(g)', v: r.proteinGoal + ' g' },
            { k: '碳水(g)', v: r.carbsGoal + ' g' },
            { k: '脂肪(g)', v: r.fatGoal + ' g' },
            { k: '饮水(ml)', v: r.waterGoal + ' ml' },
            { k: 'BMR(卡)', v: r.bmr + ' 卡' },
            { k: 'TDEE(卡)', v: r.tdee + ' 卡' },
            { k: '自洽性', v: r.selfCheck.consistent ? '通过（差 ' + r.selfCheck.diffKcal + ' 卡）' : '不通过（差 ' + r.selfCheck.diffKcal + ' 卡，>50 建议复核）' },
          ],
          caption: '推荐依据',
        }) + '<ul>' + r.planReasons.map((s) => '<li>' + s + '</li>').join('') + '</ul>',
        open: true,
      }),
    renderDisclosure({ title: '体重目标（目标／起始日／截止日／速率校验）', contentHtml: weightBlock(d), open: false }),
    copyArea({
      prompt: { text: v.prompt, label: null },
      data: { envelope, title: '【calorie · 目标预检】' },
      log: {
        envelope,
        copyLog: copyLog({
          command: v.command, source: GOAL_SOURCE,
          actionAt: nowStamp(), version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '目标预检',
    eyebrow: '目标管理 · 预检确认',
    subtitle: '这一页只做预检、不写目标；确认下面的值无误后，把指令复制给 AI 执行',
    content,
  });
}
