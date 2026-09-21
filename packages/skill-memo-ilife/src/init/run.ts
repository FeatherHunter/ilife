/** 初始化域 · **命令的运行件**（票 #855：`memo.init` 的开库前分派搬回本域）。
 *
 * `runInit` 逐字从 `src/cli/cmd_read.ts` 的 `dispatchInit` 搬来：只渲染、不建库不写配置；
 * 库不存在时也能跑（与 `memo.help.lookup` 同位置的开库前分派，由出口 `main` 在开库之前调）。
 * 本域出两格（册子 #848）：缺省＝结果页 `首次使用`（初始化报告）；`mode:"wizard"`＝过程页
 * `首次使用-向导`（逐步引导）。两页同吃一份诊断载荷；主体一律由 `bookletFileStem` 算，不手写名字。
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { fail } from '../shared/exit.js';
import { buildDataText, buildLogText } from 'base-paint';
import { buildMemoEnvelope, initSnapshot, pageEnvelope } from '../render/index.js';
import { bookletFileStem } from '../help/index.js';
import { INIT_SCENE_ID, InitInputError, readInitDiagnosis, renderInitPage } from './index.js';
import type { InitPageMode } from './index.js';

/** 复制日志载荷的 `envelope` 位（从公共层 `text` 两件的入参取形）。 */
type MemoCopyEnvelope = Parameters<typeof buildDataText>[0]['envelope'];

/** 复制日志载荷的 `copy_log` 位（同上）。 */
type MemoCopyLogFields = NonNullable<Parameters<typeof buildLogText>[0]['copyLog']>;

/** `memo.init`：首次使用两页装配（报告页缺省／向导页显式），只渲染。 */
export function runInit(params: Record<string, unknown>): CommandOut {
  const modeRaw = params.mode === undefined ? 'report' : String(params.mode);
  if (modeRaw !== 'report' && modeRaw !== 'wizard') fail(2, 'mode 只认 wizard（缺省出报告页 `首次使用`）');
  const mode: InitPageMode = modeRaw === 'wizard' ? 'guide' : 'report';
  let diag;
  try {
    diag = readInitDiagnosis(params);
  } catch (e) {
    if (e instanceof InitInputError) fail(2, e.message);
    throw e;
  }
  const snap = initSnapshot(diag);
  const message = mode === 'guide'
    ? '首次使用引导页已生成（只渲染，不建库不写配置）'
    : '初始化报告已生成（只渲染，不建库不写配置）';
  const payload = pageEnvelope({
    commandCn: '首次使用', wakeWord: '首次使用', sceneId: INIT_SCENE_ID,
    title: snap.title, summary: snap.summary, sections: snap.sections,
    copyLog: {
      thinking: mode === 'guide'
        ? '首次使用 · 引导过程页（先处理必装缺失，再做待办项）'
        : '首次使用 · AI 诊断结果渲染为报告页（检查清单＋待办＋验证清单）',
      data_structure: '--data JSON：{items:[{name,status,desc,action}], todos:[{title,steps}], verify:[]}',
      call_chain: 'memo.init --params → dispatchInit → src/init 两页装配 → base-paint 文档壳',
      exception: '无',
    },
    extra: { items: diag.items, todos: diag.todos, verify: diag.verify },
    message,
  });
  const envelopeData = payload.data as { readonly generated_at?: unknown; readonly copy_log?: unknown };
  const occurredAt = typeof envelopeData.generated_at === 'string' ? envelopeData.generated_at : '';
  const data = { ok: true, message, items: diag.items.length, todos: diag.todos.length, verify: diag.verify.length };
  // 复制区载荷：吃**回执信封**（公共层 `text` 两件只认可序列化信封形状），日志那件再补页面的 copy_log。
  const copyEnvelope = buildMemoEnvelope('memo.init', data) as unknown as MemoCopyEnvelope;
  const page = renderInitPage(mode, diag, {
    occurredAt,
    dataText: buildDataText({ envelope: copyEnvelope }),
    logText: buildLogText({
      envelope: copyEnvelope,
      copyLog: envelopeData.copy_log as MemoCopyLogFields,
    }),
  });
  return {
    data: { ok: true, message, items: diag.items.length, todos: diag.todos.length, verify: diag.verify.length },
    exit: 0,
    deliver: { html: page.html, stem: bookletFileStem(INIT_SCENE_ID, page.kind) },
  };
}
