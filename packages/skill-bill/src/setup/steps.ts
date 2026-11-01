/** 三个向导（初始化／恢复／导入）的**步骤条**：每一步的编号、状态与现状说明**按状态算**，不写死。
 *
 * 出处：`docs/skills/skill-bill/688-融合基准.md` §二 D6（老侧三段文字与步骤号全是字面，永不随状态变——
 *   **老侧缺陷不照抄**：新侧步骤条按状态算）与 §二 D7（老侧 `init_wizard.html:155` 空 `env.checks` 时
 *   回落渲染绿色「✓ 全部通过」＝假绿，`:163` 同条件渲染空块——**同一模板两种相反表现**，新侧「没数据」
 *   只能有一个说法）。老侧取证：`docs/skills/skill-bill/t731-差异表.md` 引 `.scratch/t731/old-setup.md` §7(b)(c)。
 *
 * 三条不变的形状：
 *   ① **编号由数组下标算**（`no = i + 1`），**总数由 `steps.length` 算**——两处都不许写成字面
 *      （老侧 restore 步骤号 `2`／`3` 写死在 `restore.html:136/138`，且第一步画的是 `✓` 不是 `1`）；
 *   ② **状态四档**：`done`／`current`／`todo`／`blocked`——`blocked` 专给「这一条走不通」用，
 *      **不许拿 done 顶替**（D7 假绿就是这一条的反面）；
 *   ③ **每一步都带一句现状说明**，说明里的数一律来自当刻事实（记录数／列数／行数），不写「全部通过」这类
 *      与事实无关的断语。
 */

/** 一步：编号／步骤名／状态／现状说明。 */
import { m } from '../entries/index.js';
export interface WizardStep {
  readonly no: number;
  readonly label: string;
  readonly state: 'done' | 'current' | 'todo' | 'blocked';
  readonly detail: string;
}

/** 状态 → 徽章文本（**唯一定义地**：页面与测试都读它）。
 *  `#1214`：改成**函数**按语言取词——模块级常量表会在模块加载期取词，语言一旦出口即被固化成 zh。 */
export function stepStateText(state: WizardStep['state']): string {
  if (state === 'done') return '已完成';
  if (state === 'current') return m('skill-bill.setup-steps.c001');
  if (state === 'todo') return m('skill-bill.setup-steps.c002');
  return m('skill-bill.setup-steps.c003');
}

/** 编号：下标 → `no`（**唯一算式**：页面不许另算一遍，老侧那种写死就是从这里漏出去的）。 */
function numbered(steps: readonly Omit<WizardStep, 'no'>[]): readonly WizardStep[] {
  return steps.map((s, i) => ({ no: i + 1, ...s }));
}

/** 初始化向导的四步（步骤名照老侧 `cli.py:232/234/259/261` 与 `render.py:154/156` 的四处同名写法）。 */
export interface InitStepFacts {
  /** 环境检测项：「运行环境」「数据目录」两项的事实（0 项＝一项都没检测到，**不许报绿**）。 */
  readonly envCount: number;
  readonly envOk: boolean;
  readonly envSummary: string;
  readonly dirPath: string;
  readonly dirWritable: boolean;
  readonly schemaOk: boolean;
  readonly columns: number;
  readonly records: number;
  readonly verifyOk: boolean;
}

export function initSteps(f: InitStepFacts): readonly WizardStep[] {
  const envState: WizardStep['state'] = f.envCount === 0 ? 'blocked' : f.envOk ? 'done' : 'blocked';
  const envDetail = f.envCount === 0
    ? m('skill-bill.setup-steps.c004')
    : f.envSummary;
  return numbered([
    { label: m('skill-bill.setup-steps.c005'), state: envState, detail: envDetail },
    {
      label: m('skill-bill.setup-steps.c006'),
      state: f.dirWritable ? 'done' : 'blocked',
      detail: f.dirPath + (f.dirWritable ? m('skill-bill.setup-steps.c007') : m('skill-bill.setup-steps.c008')),
    },
    {
      label: m('skill-bill.setup-steps.c009'),
      state: f.schemaOk ? 'done' : 'blocked',
      detail: f.schemaOk
        ? m('skill-bill.setup-steps.c010', { p0: String(String(f.columns)), p1: String(String(f.records)) })
        : m('skill-bill.setup-steps.c011'),
    },
    {
      label: m('skill-bill.setup-steps.c012'),
      state: f.verifyOk ? 'done' : 'blocked',
      detail: f.verifyOk
        ? m('skill-bill.setup-steps.c013', { p0: String(String(f.records)) })
        : m('skill-bill.setup-steps.c014'),
    },
  ]);
}

/** 恢复向导的四步（步骤名照老侧 `restore.html:134-138` 的三条 ＋ D1 的三件套）。 */
export interface RestoreStepFacts {
  /** 选中的那一份的名字（空串＝一份备份都没有）。 */
  readonly selected: string;
  /** 备份目录里一共几个。 */
  readonly count: number;
  /** 确认口令给了没有（不给＝停在第 2 步）。 */
  readonly confirmed: boolean;
  /** 恢复前给现状造的那一份（空串＝还没执行）。 */
  readonly safety: string;
  readonly verified: boolean;
}

export function restoreSteps(f: RestoreStepFacts): readonly WizardStep[] {
  const picked = f.selected !== '';
  const steps: Omit<WizardStep, 'no'>[] = [
    {
      label: m('skill-bill.setup-steps.c015'),
      state: picked ? 'done' : 'blocked',
      detail: picked
        ? m('skill-bill.setup-steps.c016', { p0: String(f.selected), p1: String(String(f.count)) })
        : m('skill-bill.setup-steps.c017'),
    },
    {
      label: m('skill-bill.setup-steps.c018'),
      state: f.confirmed ? 'done' : picked ? 'current' : 'todo',
      detail: f.confirmed
        ? m('skill-bill.setup-steps.c019')
        : m('skill-bill.setup-steps.c020'),
    },
    {
      label: m('skill-bill.setup-steps.c021'),
      state: f.safety !== '' ? 'done' : f.confirmed ? 'current' : 'todo',
      detail: f.safety !== ''
        ? m('skill-bill.setup-steps.c022', { p0: String(f.safety) })
        : m('skill-bill.setup-steps.c023'),
    },
    {
      label: m('skill-bill.setup-steps.c024'),
      state: f.verified ? 'done' : f.confirmed ? 'current' : 'todo',
      detail: f.verified ? m('skill-bill.setup-steps.c025') : m('skill-bill.setup-steps.c026'),
    },
  ];
  return numbered(steps);
}

/** 导入向导的四步（D2 的四件：明示新增行数／先备份／查重复／页面出结果卡）。 */
export interface ImportStepFacts {
  readonly fileName: string;
  readonly totalRows: number;
  readonly mapped: boolean;
  /** 本次将新增几行（去重与坏行都剔掉之后）。 */
  readonly newRows: number;
  readonly duplicateRows: number;
  readonly badRows: number;
  readonly confirmed: boolean;
  readonly inserted: number;
  readonly failed: number;
}

export function importSteps(f: ImportStepFacts): readonly WizardStep[] {
  const named = f.fileName !== '';
  // 计划那一句与结果那一句里的可选片段先抽成变量（`#1214`：链里不再嵌条件表达式，外层只拼「字面量 + 变量」）。
  const dupPart = f.duplicateRows > 0 ? m('skill-bill.setup-steps.c027', { p0: String(String(f.duplicateRows)) }) : '';
  const badPart = f.badRows > 0 ? m('skill-bill.setup-steps.c028', { p0: String(String(f.badRows)) }) : '';
  const planned = m('skill-bill.setup-steps.c029', {
    p0: String(String(f.newRows)),
    p1: String(dupPart),
    p2: String(badPart),
  });
  const failedPart = f.failed > 0 ? m('skill-bill.setup-steps.c030', { p0: String(String(f.failed)) }) : '';
  const written = m('skill-bill.setup-steps.c031', { p0: String(String(f.inserted)), p1: String(failedPart) });
  const steps: Omit<WizardStep, 'no'>[] = [
    {
      label: m('skill-bill.setup-steps.c032'),
      state: named ? 'done' : 'blocked',
      detail: named
        ? m('skill-bill.setup-steps.c033', { p0: String(f.fileName), p1: String(String(f.totalRows)) })
        : m('skill-bill.setup-steps.c034'),
    },
    {
      label: m('skill-bill.setup-steps.c035'),
      state: f.mapped ? 'done' : named ? 'current' : 'todo',
      detail: f.mapped
        ? m('skill-bill.setup-steps.c036')
        : m('skill-bill.setup-steps.c037'),
    },
    {
      label: m('skill-bill.setup-steps.c038'),
      state: f.confirmed ? 'done' : f.mapped ? 'current' : 'todo',
      detail: f.mapped ? planned : m('skill-bill.setup-steps.c039'),
    },
    {
      label: m('skill-bill.setup-steps.c040'),
      state: f.confirmed && f.failed === 0 ? 'done' : f.confirmed ? 'blocked' : 'todo',
      detail: f.confirmed ? written : m('skill-bill.setup-steps.c041'),
    },
  ];
  return numbered(steps);
}
