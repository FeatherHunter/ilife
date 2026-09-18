/** T351 · 健身计划页面底部复制区：prompt 段（预检确认页才有）＋ 冻结双按钮段。
 *
 * 谁在用（写得出哪两个在用）：**看训练计划**（`src/render/workoutPlanDocs.ts` 的结果页与过程页）
 * 与**写后回执**（`src/workout/receipt.ts` 的十条会改数据库的命令）——四条调用点产物逐字同形，
 * 故收成一份，免得各自漂移。只有过程型两页（预检确认页）传 `prompt`。
 *
 * 与 `src/shared/copyArea.ts` 的 `copyArea` 分家：`copyArea` 的数据位恒出三格式菜单
 * （纯文本／JSON／CSV，场景 07 等页在用，本次不动它）；本件按视觉审查口径**不出菜单**——
 * `renderCopyBlock` 不传 `dataFormats`，并把两颗按钮的 `id` 补成冻结表那两颗
 * （`ilife-copy-data`／`ilife-copy-log`，见 `COPY_ACTION_IDS.actionBar`），供页面运行时的
 * 双通道复制认领。故本件只服务健身计划这一路，不替换 `copyArea` 的既有行为。
 *
 * 复制文本仍走唯一出处：数据位 `base-paint` 的 `buildDataText`（#77 数据投影），
 * 日志位 `buildLogText` ＋ 共用件 `copyLog`（#77 六段日志）。本件不取数、不取时钟。
 */
import type { CopyLogFields, SerializableEnvelope } from 'base-paint';
import { buildDataText, buildLogText, renderActionBar } from 'base-paint';
import { renderCopyBlock, renderPreBlock } from 'base-paint/blocks';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { sceneEnvelope } from '../shared/sceneEnvelope.js';

/** prompt 段：预览块 ＋ 一颗「复制指令」（预检确认页「复制 prompt 回给 AI」那一环，老侧 `promptCopyArea` 的语序）。
 *
 *  **这颗只能走 `renderActionBar` 的日志位**：`renderActionBar`（`base-render/src/controls.ts:1367`）
 *  在「数据位在场而日志位缺席」时会按 #336 自动补一颗**禁用**「复制日志」，其 id 正是
 *  `COPY_ACTION_IDS.actionBar.copyLog`——与底部冻结那颗撞 id，页上就成了两颗同名按钮（其中一颗灰的）。
 *  日志位单独给一颗复制按钮不触发 #336，且 actionId／文案由调用方定。「一排三颗」用冻结 API 表达不出来：
 *  `buttons` 位的场景按钮不写 `data-t`，运行时认领不到，做成第三颗就是个点不动的死按钮。 */
function promptArea(prompt: string): string {
  return renderPreBlock({ command: prompt })
    + renderActionBar({
      copyLog: { actionId: CALORIE_COPY_ACTION.actionId, label: CALORIE_COPY_ACTION.label, text: prompt },
    });
}

/** 复制区入参：信封（八键载荷）＋ 日志六段（由调用方 `copyLog({…})` 派生）。 */
interface PlanCopyInput {
  /** 页面载荷信封（`version`／`skill`／`shape`／`key`／`data`）。 */
  readonly envelope: SerializableEnvelope;
  /** 日志六段（调用方给 `command`／`source`／`m5Line`／`actionAt`／`version` 后由 `copyLog` 派生）。 */
  readonly log: CopyLogFields;
  /** 复制数据文本的输出头；不给即按信封模板派生（`DataTextInput.title` 口径）。 */
  readonly dataTitle?: string;
  /** 本写词的逐字 prompt（只在预检确认页给；空串／不给即不出 prompt 段）。 */
  readonly prompt?: string;
}

/** 复制区：数据位单格式、日志位直挂，按钮 `id` 补成冻结表那两颗；无三格式菜单、无英文菜单项。
 *  日志位的信封先过 #550 归一（`key` 带 `calorie.` 前缀时剥一层），**数据位一字不动**。 */
export function planCopyBlock(input: PlanCopyInput): string {
  const title = input.dataTitle;
  const prompt = input.prompt;
  return (prompt === undefined || prompt === '' ? '' : promptArea(prompt))
    + renderCopyBlock({
      dataText: buildDataText({
        envelope: input.envelope,
        ...(title === undefined ? {} : { title }),
      }),
      logText: buildLogText({ envelope: sceneEnvelope(input.envelope), copyLog: input.log }),
    })
      .replace('data-action-id="ilife-copy-data"', 'id="ilife-copy-data" data-action-id="ilife-copy-data"')
      .replace('data-action-id="ilife-copy-log"', 'id="ilife-copy-log" data-action-id="ilife-copy-log"');
}
