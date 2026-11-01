/** flow-ribbon · **入参归一化入口与口径句**（把 `any` 与说不出的 `unknown` 挡在门外；产出渲染直接可用的模型）。
 *
 *  **这一件只有一把尺子**（本件的头号口径，见 `attrs.ts` 的件头）：
 *   · 一个总额 `total` ＝ 所有流量之和（**来源那一列与用途那一列都是它的两种数法**，故「进 ＝ 出」在这里
 *     不是调用方要保证的事，是算出来的结构事实）；
 *   · 一个跨度 `spanPct` ＝ `100 − 缝 × (较多那一列的节点数 − 1)`（两列**共用**同一个跨度，
 *     缝只为分得开、不代表金额）；
 *   · 于是 `每 1% ＝ total ÷ spanPct 元`，三处几何全从它算：桑基的节点高与带子两端高、矩阵的条长、
 *     两条构成轨的格宽。**任何一处都不许自己归一**（历史缺陷：左右两列各自归一 ⇒「带宽＝金额」只在自己
 *     那一列成立；格宽按文字宽度排 ⇒ 占比根本没画出来）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"；
 *   2. **校验与算数分家**：形状与范围的校验住同目录 `fields.ts`（格式化小件与读数小件也住那里），
 *      三种骨架的几何住 `forms.ts`；本文件只做「读入参 → 选骨架 → 写口径句」；
 *   3. **能算的都算出来**：百分比、金额文字、带子两端、无障碍名都在 `forms.ts` 算好，`render.ts` 只拼标记。
 */
import { assertPlainObject, badInput } from '../shared/validate.js';
import {
  FLOW_RIBBON_DEFAULT_UNIT,
  FLOW_RIBBON_FORMS,
  FLOW_RIBBON_GAP_PCT,
  FLOW_RIBBON_MAX_LINKS,
  FLOW_RIBBON_MISSING,
  type FlowRibbonForm,
} from './attrs.js';
import {
  assertKeys, fmtAmount, optClass, optRealText, readoutsOf, reqLinks, reqRealText, reqSources, reqUses, sumBy,
} from './fields.js';
import { matrixModel, railsModel, sankeyModel, type FlowRibbonBase, type FlowRibbonModel } from './forms.js';
import { m } from '../../entries/index.js';

/* 模型类型住 `forms.ts`（三个骨架装配出来的形状），读数小件住 `fields.ts`（它与那两支格式化函数
   是同一件事的两半）；这里原样再报一次，方便 `render.ts` 从一个地方读全。 */
export type {
  FlowRibbonBase,
  FlowRibbonLane,
  FlowRibbonLegendItem,
  FlowRibbonMatrixCell,
  FlowRibbonMatrixModel,
  FlowRibbonMatrixRow,
  FlowRibbonModel,
  FlowRibbonRailsModel,
  FlowRibbonSankeyModel,
  FlowRibbonSankeyNode,
  FlowRibbonSeg,
} from './forms.js';
export type { FlowRibbonReadout } from './fields.js';

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `FlowRibbonModel`，不再自己碰 `any`。 */
export function normalizeFlowRibbon(input: unknown): FlowRibbonModel {
  assertPlainObject(input, 'renderFlowRibbon: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, ['title', 'sources', 'uses', 'links', 'stamp', 'form', 'unit', 'note', 'extraClass'],
    'flow-ribbon: input');
  const form = raw.form === undefined ? FLOW_RIBBON_FORMS[0] : raw.form;
  if (!(FLOW_RIBBON_FORMS as readonly unknown[]).includes(form)) {
    badInput('flow-ribbon: input.form 必须是 ' + FLOW_RIBBON_FORMS.join('／') + ' 之一（桑基带／交叉矩阵／两条构成轨）');
  }
  const sources = reqSources(raw.sources);
  const uses = reqUses(raw.uses);
  const links = reqLinks(raw.links, sources, uses, FLOW_RIBBON_MAX_LINKS);
  const total = links.reduce((acc, l) => acc + l.amount, 0);
  const unit = optRealText(raw.unit, 'flow-ribbon: input.unit') ?? FLOW_RIBBON_DEFAULT_UNIT();
  const srcReadouts = readoutsOf(sources, sumBy(sources, links, 'from'), total);
  const useReadouts = readoutsOf(uses, sumBy(uses, links, 'to'), total);
  const base: FlowRibbonBase = {
    form: form as FlowRibbonForm,
    title: reqRealText(raw.title, 'flow-ribbon: input.title'),
    stamp: optRealText(raw.stamp, 'flow-ribbon: input.stamp'),
    unit,
    note: '',
    extraClass: optClass(raw.extraClass),
    total,
    totalText: m('base-render.components-flow-ribbon-model.c001', { p0: String(fmtAmount(total)), p1: String(unit) }),
    ariaLabel: '',
    legend: [],
  };
  const model = form === 'matrix' ? matrixModel(base, srcReadouts, useReadouts, links)
    : form === 'rails' ? railsModel(base, srcReadouts, useReadouts)
      : sankeyModel(base, srcReadouts, useReadouts, links);
  /* 口径行：不给就按形态写一句自己的（**那句里带这把尺子的换算**——读者能不能横着比，全看这一句）。 */
  const note = optRealText(raw.note, 'flow-ribbon: input.note') ?? defaultNote(model);
  return { ...model, note };
}

/** 三种形态各自的口径句（**不是装饰**：本件的读数纪律就写在这几句里）。 */
function defaultNote(mdl: FlowRibbonModel): string {
  if (mdl.form === 'sankey') {
    return m('base-render.components-flow-ribbon-model.c002', {
      p0: String(mdl.perPctText),
      p1: String(fmtAmount(mdl.total)),
      p2: String(mdl.unit),
      p3: String(String(FLOW_RIBBON_GAP_PCT)),
    });
  }
  if (mdl.form === 'matrix') {
    return m('base-render.components-flow-ribbon-model.c003', {
      p0: String(mdl.maxText),
      p1: String(mdl.unit),
      p2: String(FLOW_RIBBON_MISSING),
      p3: String(fmtAmount(mdl.total)),
      p4: String(mdl.unit),
    });
  }
  return m('base-render.components-flow-ribbon-model.c004');
}
