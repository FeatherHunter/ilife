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
import { pageChromeCss } from '../render/pageChromeCss.js';
import { planCopyBlock } from './planCopyBlock.js';
import { PLAN_EDITOR_CSS } from './planEditorCss.js';
import { serializeState, type EditorState } from './planEditor.js';
import { PLAN_EDITOR_PAGE_JS, planEditorSetCommand } from './planEditorRuntime.js';
import { nowStamp } from '../render/receipt.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';

/** 计划编辑器整页。 */
export function buildPlanEditorDoc(state: EditorState, opts: {
  readonly key: string; readonly command: string;
}): string {
  const parts: string[] = [
    // 口径行：把四条规矩一次说清，用户不必猜「为什么第 2 周加不了动作」。
    renderCaliberLine('这份计划是按我们刚才讨论的结果填好的，你看着改。'
      + '动作结构只在第 1 周改，后面每一周的动作都跟它一样，各周自己填时间、重量、次数与时长。'
      + '每天最多 ' + state.maxSessionsPerDay + ' 个时间段，新建时挑一个时段（同一时段可建多段，靠起止时间分），建好后定时间；有氧只填时长。'),
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
      // #948 · 故障 9②：这一段**就是本页要交付的那条命令**（`calorie.workout.plan-set` ＋ 本次状态），
      // 出处与页内运行时同一份（`planEditorRuntime.ts` 的模板 ＋ 同一个状态转写）。
      // 页内运行时按当刻状态整段重写进 `data-t` 与预览块（状态在页上会变）；这里先给一份**开页那份状态**
      // 的实串——交付出的 HTML 里就带着一条能跑的命令，页内那份是它的当刻版本。
      // 原来这里是一句占位串（「…明细见下面的计划表。」）：既不是命令、也与页内那份走散。
      prompt: planEditorSetCommand(state),
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
      + '<script>' + PLAN_EDITOR_PAGE_JS + '</script>',
    pageUi: true,
  });
}
