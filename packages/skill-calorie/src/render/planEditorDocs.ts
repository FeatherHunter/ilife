/** T351-v13 · **计划编辑器整页**（可写页）的装配。
 *
 * 与本技能前 37 份「只读页」的区别，一句话：**只读页把结果摆给用户看，这一页让用户自己把计划搭出来**。
 * 所以它多了三件东西——设置条（总周数／起日）、周×日×动作的可编辑区、动作库选择层；
 * 少了「把数据渲染死」这件事（那部分交给运行时，见 `./planEditor.ts`）。
 *
 * ## 页面结构（自上而下）
 *
 *   1. **口径行**：先说清这台编辑器的三条规矩（母版周／每天上限／参数怎么填），别让用户猜；
 *   2. **编辑器挂载点** `#pe-root`：空态是「还没有训练计划 ＋ 定一份计划」，有内容时是设置条 ＋ 周卡；
 *   3. **产物区** `#pe-out-body`：把当前状态渲染成一张规范表——**AI 照的就是这张表**；
 *   4. **复制区**：复制指令／数据／日志（指令那句由运行时按当前状态生成，落进 `data-t`）。
 *
 * ## 两份脚本为什么这么放
 *
 * - `#pe-state`（`type="application/json"`）**不执行**，只是把状态交给页面；`<` 已转义，断不了标签；
 * - 编辑器运行时来自 `./planEditor.ts` 的**唯一一份**；复制仍然由共享 helpers 的 `bindCopyAction`
 *   委派处理（本页只更新 `data-t`），不重写它的任何职责。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
import { pageChromeCss } from './pageChromeCss.js';
import { planCopyBlock } from './planCopyBlock.js';
import { PLAN_EDITOR_CSS } from './planEditorCss.js';
import { serializeState, type EditorState } from './planEditor.js';
import { PLAN_EDITOR_JS } from './planEditorRuntime.js';
import { nowStamp } from './receipt.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';

/** 页内样式块（编辑器样式 ＋ 页壳样式各一份，都在这一页的 `<head>` 之后注入）。 */
function editorStyle(): string {
  return '<style>\n' + PLAN_EDITOR_CSS + '\n</style>';
}

/** 计划编辑器整页。 */
export function buildPlanEditorDoc(state: EditorState, opts: {
  readonly key: string; readonly command: string;
}): string {
  const parts: string[] = [
    // 口径行：三条规矩上页，用户不用去猜「为什么第 2 周改不动」。
    renderCaliberLine('第 1 周是母版——先把它排好，后面的周默认照它走（想不一样，点那一周的「改为不同」）。'
      + '每天最多 ' + state.maxPerDay + ' 个动作，动作从动作库里挑；负重可以填 kg，也可以填 RM。'),
    '<div id="pe-root"></div>',
    '<section class="pe-out">'
      + '<h2 class="pe-out-t">生成的计划（照这张表落库）</h2>'
      + '<div id="pe-out-body"><p class="pe-limit">正在生成…（这一块由页面运行时按当前计划渲染）</p></div>'
      + '</section>',
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: opts.key,
        // `stat` 形状的 `data` 只吃 `metrics`（多塞字段连类型都过不去，实测）。
        // 「这是一页可写页」这件事写进日志第 2 段（来源行），不进 data。
        data: {
          metrics: metricsOf({
            weeks: state.weeks.length, maxPerDay: state.maxPerDay, libSize: state.lib.length,
          }),
        },
      } satisfies SerializableEnvelope,
      dataTitle: '【calorie · 定训练计划】',
      // 指令正文由运行时按当前状态整段重写进 `data-t`（状态在页上会变，TS 写死一份立刻过期）。
      // **但不能传空串**：空串会让「复制指令」这颗主按钮整个不渲染（验收墙上抓到）——
      // 这里给一句**当下就成立**的种子（命令头），运行时一加载就换成完整正文。
      prompt: '请你加载技能 卡路里,执行唤醒词「' + state.wakeWord + '」。（明细见下面的计划表）',
      log: copyLog({
        command: opts.command, source: '计划编辑器（页内状态，未写库）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '定训练计划',
    eyebrow: '健身计划',
    subtitle: null,
    content: pageChromeCss(960) + editorStyle() + parts.join('')
      + '<script type="application/json" id="pe-state">' + serializeState(state) + '</script>'
      + '<script>' + PLAN_EDITOR_JS + '</script>',
  });
}
