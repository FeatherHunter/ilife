/** 开始使用域的**缺项页**：出了一页（向导页型），但**不动任何数据**。
 *
 * 谁在用（三个调用点，指名）：`./run.js`（导入缺文件路径那一条）、`./restore.js`（要恢复的那一份不在）、
 *   `./import.js`（文件不存在／列映射缺必填三列）。三处都走同一支——「缺什么就不往下走」只有一份形状。
 *
 * 三支向导各按自己那一支的**最小事实**出页（初始化＝四步都走不通；恢复＝还没有备份；导入＝还没给文件），
 *   故这一页只报「还差哪几项」与补齐口令，不报任何当刻读数——它是「缺项阻断」（`#688` §四 裁定 9）
 *   在本域向导页上的落点：**缺项时给看不给复制**（补齐口令走 `./pageParts.js` 的 `blockedOf`，
 *   那一条自己不带复制按钮）。
 *
 * 为什么另立一件（不塞进 `./template-wizard.js`）：那件是**页型**的块序唯一定义地，本件是**缺项这一路
 *   入参的装配**；两件事的改动频率不同（改版式 vs 改缺项读法），塞一起会让那件越过包内 350 行告警线。
 */
import { resolveDbDir } from '../fetch/paths.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { receiptEnvelopeOf } from './pageParts.js';
import type { SetupBlocked } from './params.js';
import type { SetupScene } from './scene.js';
import { importSteps, initSteps, restoreSteps } from './steps.js';
import { wizardDoc } from './template-wizard.js';
import type { ImportWizardInput, InitWizardInput, RestoreWizardInput } from './template-wizard.js';

/** 缺项那一路的向导页（整页 HTML）。 */
export function blockedWizardDoc(input: {
  readonly op: 'init' | 'restore' | 'import';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly blocked: readonly SetupBlocked[];
  readonly actionAt: string;
}): string {
  const word = projectWakeWord({ key: 'bill.setup.run', op: input.op });
  const message = word + '还差 ' + String(input.blocked.length) + ' 项：'
    + input.blocked.map((b) => b.label).join('、') + '（已出向导页，补齐之后跟助手说一遍）';
  const envelope = receiptEnvelopeOf(input.key, { ok: false, message, op: input.op, blocked: input.blocked });
  const common = {
    scene: input.scene,
    key: input.key,
    params: input.params,
    actionAt: input.actionAt,
    envelope,
    blocked: input.blocked,
    prompt: input.scene.promptOf(input.params),
    promptLabel: '复制给助手：补齐之后照这句说一遍',
  };
  let wi: InitWizardInput | RestoreWizardInput | ImportWizardInput;
  if (input.op === 'init') {
    wi = {
      ...common, op: 'init',
      steps: initSteps({
        envCount: 0, envOk: false, envSummary: '', dirPath: resolveDbDir(),
        dirWritable: false, schemaOk: false, columns: 0, records: 0, verifyOk: false,
      }),
      envChecks: [], ready: false, dbPath: resolveDbDir(), records: 0, created: false,
    };
  } else if (input.op === 'restore') {
    wi = {
      ...common, op: 'restore',
      steps: restoreSteps({ selected: '', count: 0, confirmed: false, safety: '', verified: false }),
      entries: [], selected: null, confirmed: false, safety: '', verified: false, result: '',
    };
  } else {
    wi = {
      ...common, op: 'import',
      steps: importSteps({
        fileName: '', totalRows: 0, mapped: false, newRows: 0, duplicateRows: 0, badRows: 0,
        confirmed: false, inserted: 0, failed: 0,
      }),
      csv: null, map: {}, plan: null, confirmed: false, backup: '', inserted: 0, failed: [],
    };
  }
  return wizardDoc(wi);
}
