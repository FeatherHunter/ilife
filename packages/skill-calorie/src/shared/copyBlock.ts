/** T351 训练计划族的复制区装配：页面载荷信封 ＋ 六段复制日志 → `planCopyBlock` 的复制块。
 *
 * 谁在用（写得出哪两个能力在用）：**计划落地方案**（`src/workout/landPages.ts` 的落地训练过程页／结果页、
 * `src/workout/landBatchPages.ts` 的批量落地过程页／结果页）与**训记同步**（`src/workout/xunjiPush.ts`
 * 的同步到训记过程页／结果页、`src/workout/xunjiBackfill.ts` 的拉训记实绩过程页／结果页）。
 *
 * 为什么收在这里：上面四处调用方原先各抄了一份**逐字相同**的 `copyBlock`（连同各一份逐字相同的
 * `envelopeOf`）——四份实现只差 `source` 那一行（两处是函数体内的中文字面串、两处是入参），
 * 任何一处单独改动都会与另外三份漂移。故按 `docs/agents/structure.md` 铁律二（概念唯一）收成一份：
 * 信封与日志的构造只写一次，`source`（数据来源那一句）提升为调用方必传的第四个位。
 *
 * 四份原实现的位置：`src/workout/landPages.ts:61`、`src/workout/landBatchPages.ts:32`、
 * `src/workout/xunjiPush.ts:100`、`src/workout/xunjiBackfill.ts:86`（合并后八张页产物逐字节相同）。
 *
 * 对外只有一个名字：`copyBlock`。本件不取数、不取时钟——时间戳与 M5 行都由调用方给的 `CrudReceipt` 出。
 */
import type { SerializableEnvelope } from 'base-paint';
import { planCopyBlock } from './planCopyBlock.js';
import type { CrudReceipt } from '../render/receipt.js';
import { copyLog } from './copyArea.js';
import { commandLine } from './writeParts.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页面载荷信封：`receipt` 形态的八键（四份原实现里逐字相同的那一段）。 */
function envelopeOf(key: string, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key,
    data: { ok: true, message },
  };
}

/** 复制块：信封（`key` ＋ 回执摘要）＋ 日志六段（命令原文、数据来源、M5 行、时间戳、版本）。 */
export function copyBlock(key: string, params: Record<string, unknown>, receipt: CrudReceipt, source: string): string {
  return planCopyBlock({
    envelope: envelopeOf(key, receipt.summary),
    log: copyLog({
      command: commandLine(key, params),
      source,
      m5Line: receipt.m5Line,
      actionAt: receipt.meta.actionAt,
      version: DOC_VERSION,
    }),
  });
}
