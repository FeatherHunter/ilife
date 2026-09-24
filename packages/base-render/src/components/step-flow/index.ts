/** step-flow · **组件出口**（本件对外的唯一名字面）。
 *
 *  —— 步骤条 ——
 *
 *  一句话：**做到第几步了**——竖排逐步，节点给三态（✓／双环内点／虚线空圈 ＋ 序号），
 *  状态字给说法（已完成／正在做／未开始），每一步带估时与实耗，当前那一步带说明。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 一步一步走、要看出"现在该做哪一步" ⇒ 用本件；
 *   · 一行一条、可勾选（买菜清单／盘点）⇒ 用 `task-list`；
 *   · 一笔在途的事走到哪个阶段（分期／保修）⇒ 用 `status-row`；
 *   · 还有几天到期、每行一个动作 ⇒ 用 `due-row`。
 *
 *  两件出口：`renderStepFlow(input)`（产标记，零 DOM）／`stepFlowCss()`（样式段）。
 *  本件**零 DOM、零动效、零可点元素**（静态件；"可回看行程"那类折叠形态不在本件落地范围）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  STEP_FLOW_CLASS,
  STEP_FLOW_FORMS,
  STEP_FLOW_MARK_DONE,
  STEP_FLOW_MISSING,
  STEP_FLOW_SLOTS,
  STEP_STATES,
  STEP_STATE_WORDS,
  stepFlowClass,
  stepFlowSlot,
} from './attrs.js';
export type {
  StepFlowForm,
  StepFlowInput,
  StepFlowSlot,
  StepFlowStep,
  StepState,
} from './attrs.js';
export { renderStepFlow } from './render.js';
export {
  STEP_FLOW_CONTAINER,
  STEP_FLOW_NARROW_MAX_PX,
  STEP_FLOW_NODE_COLUMN_PX,
  STEP_FLOW_NODE_SIZE_PX,
  stepFlowCss,
} from './style.js';
