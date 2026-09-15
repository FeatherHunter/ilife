/** T351-v14 · **计划编辑器整页**（可写页）的装配。
 *
 * 与只读页的区别一句话：**只读页把结果摆给用户看，这一页让用户把计划搭出来**。
 * 所以它多了三件——设置条（总周数／起日）、周页签与「日 → 次训练 → 动作」三级编辑区、动作库选择层；
 * 少了「把数据渲染死」这件事（那部分交给运行时，见 `./planEditorRuntime.ts`）。
 *
 * 页面结构：口径行 → 编辑器挂载点 `#pe-root` → 产物区 `#pe-out-body`（AI 照的那张表）→ 复制区。
 * 复制仍然是共享 helpers 的 `bindCopyAction` 在管，本页只把当前状态写进 `data-t`。
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

/** 计划编辑器整页。 */
export function buildPlanEditorDoc(state: EditorState, opts: {
  readonly key: string; readonly command: string;
}): string {
  const parts: string[] = [
    // 口径行：把四条规矩一次说清，用户不必猜「为什么第 2 周加不了动作」。
    renderCaliberLine('先把第 1 周排好，它就是母版。后面每一周的动作都跟它一样，只改重量、次数、时长这类参数。'
      + '每天最多 ' + state.maxSessionsPerDay + ' 次训练，每次挑一个时段。'
      + '有氧只填时长，力量填组数、次数与负重。'),
    '<div id="pe-root"></div>',
    '<section class="pe-out">'
      + '<h2 class="pe-out-t">生成的计划，照这张表落库</h2>'
      + '<div id="pe-out-body"><p class="pe-hint">正在生成。这一块由页面按当前计划渲染。</p></div>'
      + '</section>',
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: opts.key,
        data: {
          metrics: metricsOf({
            weeks: state.weeks.length,
            maxSessionsPerDay: state.maxSessionsPerDay,
            libSize: state.lib.length,
          }),
        },
      } satisfies SerializableEnvelope,
      dataTitle: '【calorie · 定训练计划】',
      // 指令正文由运行时按当前状态整段重写进 `data-t`（状态在页上会变，TS 写死一份立刻过期）。
      // 但不能传空串：空串会让「复制指令」这颗主按钮整个不渲染（验收墙上抓到过）。
      prompt: '请你加载技能 卡路里，执行唤醒词「' + state.wakeWord + '」。明细见下面的计划表。',
      log: copyLog({
        command: opts.command, source: '计划编辑器，页内状态，尚未写库',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '定训练计划',
    eyebrow: '健身计划',
    subtitle: null,
    content: pageChromeCss(1080) + '<style>\n' + PLAN_EDITOR_CSS + '\n</style>' + parts.join('')
      + '<script type="application/json" id="pe-state">' + serializeState(state) + '</script>'
      + '<script>' + PLAN_EDITOR_JS + '</script>',
  });
}
