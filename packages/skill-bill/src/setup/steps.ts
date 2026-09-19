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
export interface WizardStep {
  readonly no: number;
  readonly label: string;
  readonly state: 'done' | 'current' | 'todo' | 'blocked';
  readonly detail: string;
}

/** 状态 → 徽章文本（**唯一定义地**：页面与测试都读它）。 */
export const STEP_STATE_TEXT: Readonly<Record<WizardStep['state'], string>> = {
  done: '已完成',
  current: '正在这一步',
  todo: '待执行',
  blocked: '走不通',
};

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
    ? '一项也没检测到（这一页没有可报的环境事实）'
    : f.envSummary;
  return numbered([
    { label: '环境检测', state: envState, detail: envDetail },
    {
      label: '数据目录确认',
      state: f.dirWritable ? 'done' : 'blocked',
      detail: f.dirPath + (f.dirWritable ? '（可写）' : '（不可写）'),
    },
    {
      label: '建库(幂等自愈)',
      state: f.schemaOk ? 'done' : 'blocked',
      detail: f.schemaOk
        ? '数据库已就绪（' + String(f.columns) + ' 列）· 现有记录 ' + String(f.records) + ' 条'
        : '表结构还不齐，跟助手说一遍「初始化」让它补齐',
    },
    {
      label: '只读验证',
      state: f.verifyOk ? 'done' : 'blocked',
      detail: f.verifyOk
        ? '读得动：bills 表在、试查一条成功 · 现有记录 ' + String(f.records) + ' 条'
        : '读不动：这个库还打不开或读不出内容',
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
      label: '选一份备份',
      state: picked ? 'done' : 'blocked',
      detail: picked
        ? '选中：' + f.selected + '（备份目录里共 ' + String(f.count) + ' 份）'
        : '备份目录里还没有备份，先跟助手说一遍「备份」',
    },
    {
      label: '确认要覆盖',
      state: f.confirmed ? 'done' : picked ? 'current' : 'todo',
      detail: f.confirmed
        ? '这一次已经确认过，接着往下走'
        : '确认之前不动数据；要往下走就加上确认，恢复前会自动备份现状',
    },
    {
      label: '覆盖前先备份现状',
      state: f.safety !== '' ? 'done' : f.confirmed ? 'current' : 'todo',
      detail: f.safety !== ''
        ? '现状已备份：' + f.safety
        : '恢复前无条件先给现状造一份备份（不依赖你记不记得）',
    },
    {
      label: '恢复 + 验证',
      state: f.verified ? 'done' : f.confirmed ? 'current' : 'todo',
      detail: f.verified ? '恢复回来的库读得动，已经验过' : '把备份拷回数据目录，然后读一次验库',
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
  const steps: Omit<WizardStep, 'no'>[] = [
    {
      label: '读文件',
      state: named ? 'done' : 'blocked',
      detail: named
        ? f.fileName + '（' + String(f.totalRows) + ' 行数据）'
        : '还没给 CSV 文件路径',
    },
    {
      label: '列映射',
      state: f.mapped ? 'done' : named ? 'current' : 'todo',
      detail: f.mapped
        ? '日期／金额／分类这几列都认到了；改映射就照下面那句重说一遍'
        : '映射还缺必填的列（日期／金额／分类）',
    },
    {
      label: '确认将新增几行',
      state: f.confirmed ? 'done' : f.mapped ? 'current' : 'todo',
      detail: f.mapped
        ? '本次将新增 ' + String(f.newRows) + ' 行，不覆盖已有记录'
          + (f.duplicateRows > 0 ? '；另有 ' + String(f.duplicateRows) + ' 行库里已经有了，跳过' : '')
          + (f.badRows > 0 ? '；' + String(f.badRows) + ' 行读不出来，也会跳过' : '')
        : '先认下列映射再确认',
    },
    {
      label: '导入并出结果',
      state: f.confirmed && f.failed === 0 ? 'done' : f.confirmed ? 'blocked' : 'todo',
      detail: f.confirmed
        ? '成功 ' + String(f.inserted) + ' 行' + (f.failed > 0 ? '，失败 ' + String(f.failed) + ' 行' : '')
        : '确认之后才写库；写之前会自动备份一次',
    },
  ];
  return numbered(steps);
}
