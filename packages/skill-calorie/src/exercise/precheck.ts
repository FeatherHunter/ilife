/** #622 · 两条 vs 目标词的预检确认页装配（`calorie.view.exercise-goal` 无目标分支）。
 *
 * 款照抄 `src/goal/precheck.ts`（现状 → 要填的项 → 确认后复制指令）与
 * `src/diet/precheck.ts`（确认后操作块 ＋ 复制区数据／日志两通道 ＋ 口径行）再改：
 * 现值只摆运动目标那一项（未设置，不编 0）；要填的项只摆目标值一项
 * （正整数卡，示例 300）；确认后操作只摆 `calorie.goal.exercise` 这一条会改数据库的命令。
 *
 * 位置纪律：本件是 #622 的装配件，落 `src/exercise/`（派单点名）。
 * 取数不重写目标 SQL 与算式：目标现值经目标能力的公开接口
 * `src/goal/nutritionGoal.ts::getNutritionGoal` 读（本件只收调用方传进来的缺席结论，
 * 不直查 `daily_goal`）；确认后写入走 #621 的 `calorie.goal.exercise`，本页只印指令。
 * 窗内运动记录的存在性经本能力自己的 `exerciseStore.ts::listWindow` 判（调用方判，本件不判）。
 *
 * 本页是过程型 HTML（只预检、不写库、不画终页的环与判决胶囊）。
 * 对外 2 件（铁律五）：`ExerciseGoalPrecheckView` 与 `buildExerciseGoalPrecheckDoc`。
 */
import { renderActionBar } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderDisclosure, renderKpiGrid, renderPreBlock, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { nowStamp } from '../render/receipt.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { commandLine } from '../shared/writeParts.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里 运动';
const PRECHECK_TITLE = '运动目标预检';
const EYEBROW = '运动对照目标';
const GOAL_SOURCE = '每日目标 ＋ 运动记录';
const WRITE_EXAMPLE_GOAL = 300;

/** 预检确认页的入参（7 字段，不多于 8 个）。 */
export interface ExerciseGoalPrecheckView {
  /** 展开本页的是哪条唤醒词（两条中的一条）。 */
  readonly wakeWord: string;
  /** 窗口的读者说法（今日／本周，取调用方传的窗口名）。 */
  readonly windowLabel: string;
  readonly start: string;
  readonly end: string;
  readonly days: number;
  /** 本次看的那条查询命令原文（进复制日志，可照抄重跑）。 */
  readonly command: string;
  /** 确认后要跑的那条会改数据库的命令原文（示例值，本页不写库）。 */
  readonly writeCommand: string;
}

/** 现值表：运动目标那一项缺席（未设置，不编 0）＋ 窗口三行。 */
function currentTable(v: ExerciseGoalPrecheckView): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '每日运动消耗目标', v: '未设置' },
      { k: '窗口', v: v.start === v.end ? v.start : v.start + ' ~ ' + v.end },
      { k: '窗口天数', v: String(v.days) + ' 天' },
      { k: '唤醒词', v: v.wakeWord },
    ],
    caption: '改前基准：库内还没有每日运动消耗目标',
  });
}

/** 要填的一项：目标值（正整数卡，示例 300）。 */
function fillTable(): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '怎么填' }],
    rows: [
      { k: '目标值(卡)', v: '正整数，例如 300（每天要消耗的运动热量）' },
      { k: '怎么答', v: '直接说一句「定运动目标 300 卡」（把 300 换成你要的值）' },
    ],
    caption: '要填的项：只填这一项',
  });
}

/** 确认后操作：本页不写库，确认后跑下面这条会改数据库的命令，再重跑上面的查询命令看终页。 */
function writeBlock(v: ExerciseGoalPrecheckView): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '确认后跑', v: v.writeCommand },
      { k: '再看终页', v: v.command },
    ],
    caption: '确认后操作（这一步不写库）',
  });
}

/** 本页唯一的复制区：指令（确认后那条会改数据库的命令原文）＋ 数据 ＋ 日志三通道。 */
function copyZone(v: ExerciseGoalPrecheckView, envelope: SerializableEnvelope): string {
  const instruction = renderPreBlock({ command: v.writeCommand })
    + renderActionBar({
      copyLog: { actionId: CALORIE_COPY_ACTION.actionId, label: CALORIE_COPY_ACTION.label, text: v.writeCommand },
    });
  return instruction + copyArea({
    data: { envelope, title: '【calorie · 运动目标预检】' },
    log: {
      envelope,
      copyLog: copyLog({
        command: v.command,
        source: GOAL_SOURCE,
        m5Line: '确认后执行 ' + v.writeCommand,
        actionAt: nowStamp(),
        version: DOC_VERSION,
      }),
    },
  });
}

/** 两条 vs 目标词的预检确认页整页：现值缺席说明 → 目标值输入指引 → 确认后复制指令。 */
export function buildExerciseGoalPrecheckDoc(v: ExerciseGoalPrecheckView): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: PRECHECK_TITLE,
    data: {
      metrics: metricsOf({ hasGoal: 0, precheck: 1, days: v.days }),
    },
  };
  const cards: KpiCardInput[] = [
    { label: '唤醒词', value: v.wakeWord, detail: '先问目标值，确认后再看终页' },
    { label: '现值', value: '未设置', detail: '还没设每日运动消耗目标' },
    { label: '窗口', value: v.windowLabel, detail: v.start === v.end ? v.start : v.start + ' ~ ' + v.end },
  ];
  const sections = [
    { id: 'sec-current', label: '现值缺席说明' },
    { id: 'sec-fill', label: '目标值输入指引' },
    { id: 'sec-write', label: '确认后操作' },
  ];
  const content = [
    renderKpiGrid(cards),
    renderTocBlock({ items: sections.map((s) => ({ id: s.id, text: s.label })) }),
    '<section id="sec-current">' + renderDisclosure({ title: '现值缺席说明', contentHtml: '<p>还没设每日运动消耗目标，所以这张对照页还出不来终页。下面先把目标值定下来。</p>' + currentTable(v), open: true }) + '</section>',
    '<section id="sec-fill">' + renderDisclosure({ title: '目标值输入指引', contentHtml: '<p>目标值是每天要消耗的运动热量，须为正整数（卡）。下面确认后复制指令里的 300 只是示例，换成你要的值再跑。</p>' + fillTable(), open: true }) + '</section>',
    '<section id="sec-write">' + renderDisclosure({ title: '确认后操作', contentHtml: '<p>确认后执行下面这条会改数据库的命令写入目标值，再重跑上面的查询命令看终页。本页只预检，不写库。</p>' + writeBlock(v), open: true }) + '</section>',
    renderCaliberLine('完成度＝实际 ÷ 目标（本页还没有目标，不算完成度）'),
    renderCaliberLine('这一页只预检，不写库'),
    copyZone(v, envelope),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: PRECHECK_TITLE,
    eyebrow: EYEBROW,
    subtitle: '还没设每日运动消耗目标，先定目标值再看对照',
    content,
    printable: true,
  });
}

/** 确认后示例指令（调用方不传时取这一句；与 #621 阻断句同值）。 */
export function exerciseGoalWriteExample(): string {
  return commandLine('calorie.goal.exercise', { goal: WRITE_EXAMPLE_GOAL });
}
