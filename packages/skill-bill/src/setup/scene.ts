/** 开始使用域场景件的公共契约与落点表（**唯一定义地**）。
 *
 * 本件回答两件事：
 *   ① 一件场景件长什么样——`SetupScene`（id／命令全名／认的 op／哪一片页型／页面名／徽章口径／
 *      副标题／给助手那句口令）；
 *   ② 一条 op 该落哪一件——`setupSceneFor`。
 *
 * 落点表有 **6 行**：六条场景（`scenes/setup.yaml` 的六个 `scenario_id`）一件一支，其中「备份」一词两支
 *   （一键备份 `scene-backup-create.ts` 出结果回执页、查看备份 `scene-backup-list.ts` 出记录列表页）——
 *   这正是 `t687-parity-审计清单.md` §2 第 66-70 行点名的那个形状。
 *
 * 六件按**三片页型**分（`packages/skill-bill/docs/t685-按域页型表.md` §2.7 那三行）：
 *   向导（`./template-wizard.js`）盖初始化／恢复备份／导入；结果回执（`./template-receipt.js`）盖一键备份；
 *   记录列表（`./template-list.js`）盖查看备份／初始化状态。
 *
 * 场景件**只声明差异值**（页面名、徽章口径、副标题、给助手那句口令），一行块序都不写、不 import 任何
 *   块位渲染函数——判据乙那道门（`scripts/check-scene-shape.mjs`）扫的就是这里。
 *
 * 谁在用（两个调用点，指名）：① `./run.js`——六种 op 的处理体按 op 取件；② 测试按既有取法直取本表。
 */
import { BillPolicyError } from '../fetch/errors.js';
import type { SetupOp, SetupPage } from './params.js';
import { SCENE as sceneBackupCreate } from './scene-backup-create.js';
import { SCENE as sceneBackupList } from './scene-backup-list.js';
import { SCENE as sceneImport } from './scene-import.js';
import { SCENE as sceneInitStatus } from './scene-init-status.js';
import { SCENE as sceneInit } from './scene-init.js';
import { SCENE as sceneRestore } from './scene-restore.js';

/** 一件场景件：一条场景（＝一种 op）的落点与差异值。 */
export interface SetupScene {
  /** 件的名字（与文件名 `scene-<id>.ts` 对得上）。 */
  readonly id: string;
  /** 域声明里的场景 id（`./declaration.js` 的 `scenes[].id`；`测试`按它逐条对账）。 */
  readonly sceneId: string;
  readonly key: 'bill.setup.run';
  readonly op: SetupOp;
  /** 这一件出哪一片页型。 */
  readonly page: SetupPage;
  /** 页面名（正文最大那一个字；老侧六张模板的 `<h1>` 逐字同句）。 */
  readonly title: string;
  /** 徽章第二枚那句口径（老侧 chips 里那一枚，如「4 步零决策」）。 */
  readonly caliber: string;
  /** 副标题（老侧六张模板的 `data.subtitle` 同句）。 */
  readonly subtitle: string;
  /** 给助手那句口令（复制按钮拷走的那一段；**纯文本**，不带任何渲染调用）。 */
  readonly promptOf: (params: Record<string, unknown>) => string;
}

/** 6 行的落点表（**唯一定义地**）：顺序＝域声明里那五条词的书写顺序（初始化／初始化状态／备份／恢复备份／导入）。 */
export const SETUP_SCENES: readonly SetupScene[] = [
  sceneInit, sceneInitStatus, sceneBackupCreate, sceneBackupList, sceneRestore, sceneImport,
];

const BY_OP = new Map<SetupOp, SetupScene>(SETUP_SCENES.map((s) => [s.op, s]));

/** 取件：按 `op` 认（六种 op 各一件）。认不得的 op 即抛——**不猜、不兜底**
 *  （`op` 已在 `./params.js` 的 `parseSetupOp` 拦过一道，走到这里还认不得即是代码缺陷）。 */
export function setupSceneFor(op: SetupOp): SetupScene {
  const hit = BY_OP.get(op);
  if (hit === undefined) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '开始使用域没有这一支操作：' + String(op));
  }
  return hit;
}
