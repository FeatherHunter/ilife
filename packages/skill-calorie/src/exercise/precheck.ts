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
import { m } from '../entries/index.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const WRITE_EXAMPLE_GOAL = 300;

/** 预检确认页的入参（7 字段，不多于 8 个）。 */
export interface ExerciseGoalPrecheckView {
  /** 展开本页的是哪条唤醒词（两条中的一条）；`null` ＝ 自定义窗（start/end 直调、无 window），隐去唤醒词行。 */
  readonly wakeWord: string | null;
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
    columns: [{ key: 'k', label: m('skill-calorie.exercise-precheck.c001') }, { key: 'v', label: m('skill-calorie.exercise-precheck.c002') }],
    rows: [
      { k: m('skill-calorie.exercise-precheck.c003'), v: m('skill-calorie.exercise-precheck.c004') },
      { k: '窗口', v: v.start === v.end ? v.start : v.start + ' ~ ' + v.end },
      { k: '窗口天数', v: m('skill-calorie.exercise-precheck.c005', { p0: String(String(v.days)) }) },
      ...(v.wakeWord === null ? [] : [{ k: m('skill-calorie.exercise-precheck.c006'), v: v.wakeWord }]),
    ],
    caption: m('skill-calorie.exercise-precheck.c007'),
  });
}

/** 要填的一项：目标值（正整数卡，示例 300）。 */
function fillTable(): string {
  return renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.exercise-precheck.c008') }, { key: 'v', label: m('skill-calorie.exercise-precheck.c009') }],
    rows: [
      { k: m('skill-calorie.exercise-precheck.c010'), v: m('skill-calorie.exercise-precheck.c011') },
      { k: m('skill-calorie.exercise-precheck.c012'), v: m('skill-calorie.exercise-precheck.c013') },
    ],
    caption: m('skill-calorie.exercise-precheck.c014'),
  });
}

/** 确认后操作：本页不写库，确认后跑下面这条会改数据库的命令，再重跑上面的查询命令看终页。 */
function writeBlock(v: ExerciseGoalPrecheckView): string {
  return renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.exercise-precheck.c015') }, { key: 'v', label: m('skill-calorie.exercise-precheck.c016') }],
    rows: [
      { k: m('skill-calorie.exercise-precheck.c017'), v: v.writeCommand },
      { k: m('skill-calorie.exercise-precheck.c018'), v: v.command },
    ],
    caption: m('skill-calorie.exercise-precheck.c019'),
  });
}

/** 本页唯一的复制区：指令（确认后那条会改数据库的命令原文）＋ 数据 ＋ 日志三通道。 */
function copyZone(v: ExerciseGoalPrecheckView, envelope: SerializableEnvelope): string {
  const instruction = renderPreBlock({ command: v.writeCommand })
    + renderActionBar({
      copyLog: { actionId: CALORIE_COPY_ACTION.actionId, label: CALORIE_COPY_ACTION.label, text: v.writeCommand },
    });
  return instruction + copyArea({
    data: { envelope, title: m('skill-calorie.exercise-precheck.c020') },
    log: {
      envelope,
      copyLog: copyLog({
        command: v.command,
        source: m('skill-calorie.exercise-precheck.c036'),
        m5Line: m('skill-calorie.exercise-precheck.c021', { p0: String(v.writeCommand) }),
        actionAt: nowStamp(),
        version: DOC_VERSION,
      }),
    },
  });
}

/** 两条 vs 目标词的预检确认页整页：现值缺席说明 → 目标值输入指引 → 确认后复制指令。 */
export function buildExerciseGoalPrecheckDoc(v: ExerciseGoalPrecheckView): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: m('skill-calorie.exercise-precheck.c037'),
    data: {
      metrics: metricsOf({ hasGoal: 0, precheck: 1, days: v.days }),
    },
  };
  const cards: KpiCardInput[] = [
    ...(v.wakeWord === null ? [] : [{ label: m('skill-calorie.exercise-precheck.c022'), value: v.wakeWord, detail: m('skill-calorie.exercise-precheck.c023') } as KpiCardInput]),
    { label: m('skill-calorie.exercise-precheck.c024'), value: m('skill-calorie.exercise-precheck.c025'), detail: m('skill-calorie.exercise-precheck.c026') },
    { label: m('skill-calorie.exercise-precheck.c040'), value: v.windowLabel, detail: v.start === v.end ? v.start : v.start + ' ~ ' + v.end },
  ];
  const sections = [
    { id: 'sec-current', label: m('skill-calorie.exercise-precheck.c027') },
    { id: 'sec-fill', label: m('skill-calorie.exercise-precheck.c028') },
    { id: 'sec-write', label: m('skill-calorie.exercise-precheck.c029') },
  ];
  const content = [
    renderKpiGrid(cards),
    renderTocBlock({ items: sections.map((s) => ({ id: s.id, text: s.label })) }),
    '<section id="sec-current">' + renderDisclosure({ title: m('skill-calorie.exercise-precheck.c030'), contentHtml: '<p>' + m('skill-calorie.exercise-precheck.c041') + '</p>' + currentTable(v), open: true }) + '</section>',
    '<section id="sec-fill">' + renderDisclosure({ title: m('skill-calorie.exercise-precheck.c031'), contentHtml: '<p>' + m('skill-calorie.exercise-precheck.c042') + '</p>' + fillTable(), open: true }) + '</section>',
    '<section id="sec-write">' + renderDisclosure({ title: m('skill-calorie.exercise-precheck.c032'), contentHtml: '<p>' + m('skill-calorie.exercise-precheck.c043') + '</p>' + writeBlock(v), open: true }) + '</section>',
    renderCaliberLine(m('skill-calorie.exercise-precheck.c033')),
    renderCaliberLine(m('skill-calorie.exercise-precheck.c034')),
    copyZone(v, envelope),
  ].join('');
  return assembleDocPage({
    docTitle: m('skill-calorie.exercise-precheck.c038'),
    title: m('skill-calorie.exercise-precheck.c037'),
    eyebrow: m('skill-calorie.exercise-precheck.c039'),
    subtitle: m('skill-calorie.exercise-precheck.c035'),
    content,
    printable: true,
    pageUi: true,
  });
}

/** 确认后示例指令（调用方不传时取这一句；与 #621 阻断句同值）。 */
export function exerciseGoalWriteExample(): string {
  return commandLine('calorie.goal.exercise', { goal: WRITE_EXAMPLE_GOAL });
}
