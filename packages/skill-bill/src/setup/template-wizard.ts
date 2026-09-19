/** 开始使用域模板之三 · **向导页型**（`t685-按域页型表.md` §2.7 第 1 行／`#688` §五 5.1 的 ③ 过程型向导页）。
 *
 * **本件是这一片页型的块位序列唯一住所**。盖住的三条场景（老侧三张模板）：
 *   · 初始化（`./scene-init.js`；老 `开始使用/init_wizard.html`，173 行／16 个块）；
 *   · 从备份恢复（`./scene-restore.js`；老 `开始使用/restore.html`，184 行／13 个块）；
 *   · 导入 CSV 账单（`./scene-import.js`；老 `开始使用/import.html`，186 行／12 个块）。
 *  **改一次这一片页型的版式只动本件一处。**
 *
 * **块位序列**（照 `#688` §五 5.2 的 ③ 向导 列；● 恒出、○ 有内容才出）：
 *   类型徽章 ●（表序第 6 行）→ 结论句 ○（第 3 行）→ 步骤条（徽章列 ●，第 6 行／`t685` §2.7 的
 *   「徽章列 ●（步骤进度）」）→ 步骤说明小表 ●（第 12 行）→ 该步主体（第 7 行字段卡 ● ／第 12 行小表 ○）
 *     → 缺项阻断 ○（第 16 行）→ 复制指令块 ●（第 22 行）→ 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *   本页**不出**的四块：第 4 行页内导航（`#688` §五 5.2 明写：过程型 ①②③ 恒**不**出导航，这是全表唯一
 *   按页类的例外）、第 13/14 行（占比条／图表）、第 27 行退出口（向导还没写库，没有可撤销的那一件事）。
 *
 * **「表单区 ●」那一格在本域怎么承担**（写下来免得后人以为漏了）：本仓的产物是**静态整页**，
 *   页面本地零脚本（`#688` 裁定 7），故「该步」的可选可填那一面由两处承担——① **候选表**（备份清单／列映射表，
 *   选中的那一行带标记）；② **复制口令**（用户要改哪一格，就照那一句跟助手说一遍）。
 *   与账户域「候选由字段卡的下拉承担」同一条口径（`../account/scene-add.js` 第 ⑤ 条）。
 *
 * **D6／D7 在这里兑现**：步骤条的两件（`./steps.js` 算好的 `WizardStep[]`）由 `stepChipsOf`／`stepTableOf` 摊开，
 *   编号与总数都由那一份数组算；空步骤不走「全部通过」那条路（`stepTableOf` 出空态句，`envChecksOf` 出「没测到就是没测到」）。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable } from 'base-paint/blocks';
import type { DataTableColumn, DataTableRow } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import type { SerializableEnvelope } from 'base-paint';
import type { BackupEntry } from './backups.js';
import { humanBytes } from './backups.js';
import type { BadRow, ColumnMap, CsvFile, ImportField, ImportPlan } from './importer.js';
import { FIELD_LABEL, IMPORT_FIELDS, PREVIEW_ROWS, REQUIRED_FIELDS } from './importer.js';
import {
  SOURCE_FILE, SOURCE_FILE_TEXT, SOURCE_READ, SOURCE_READ_TEXT, SOURCE_WRITE, SOURCE_WRITE_TEXT,
  badgeOf, blockedOf, copyZoneOf, emptyOf, envChecksOf, promptBlockOf,
  setupPageShell, sourceNoteOf, stepChipsOf, stepTableOf, textOrDash,
} from './pageParts.js';
import type { SetupBlocked } from './params.js';
import type { SetupScene } from './scene.js';
import type { WizardStep } from './steps.js';

/** 公共入参：三支向导都读这几件。 */
interface WizardCommon {
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  /** 步骤条（`./steps.js` 按状态算好的那一份）。 */
  readonly steps: readonly WizardStep[];
  readonly envelope: SerializableEnvelope;
  /** 缺项（空数组＝这一趟不缺东西）。 */
  readonly blocked: readonly SetupBlocked[];
  /** 给助手那句口令。 */
  readonly prompt: string;
  /** 口令那一块的标题（三支各不相同）。 */
  readonly promptLabel: string;
}

/** 初始化向导那一路的入参。 */
export interface InitWizardInput extends WizardCommon {
  readonly op: 'init';
  readonly envChecks: readonly { readonly label: string; readonly ok: boolean; readonly detail: string }[];
  readonly ready: boolean;
  readonly dbPath: string;
  readonly records: number;
  /** 这一次是新建的库（老侧 `init_wizard.html:151-153` 的完成卡那一支）。 */
  readonly created: boolean;
}

/** 恢复向导那一路的入参（**选中项只有一处**：`selected`——详情卡、步骤说明、口令三处都从它派生）。 */
export interface RestoreWizardInput extends WizardCommon {
  readonly op: 'restore';
  readonly entries: readonly BackupEntry[];
  readonly selected: BackupEntry | null;
  readonly confirmed: boolean;
  /** 恢复前给现状造的那一份备份（空串＝还没执行）。 */
  readonly safety: string;
  readonly verified: boolean;
  readonly result: string;
}

/** 导入向导那一路的入参。 */
export interface ImportWizardInput extends WizardCommon {
  readonly op: 'import';
  readonly csv: CsvFile | null;
  readonly map: ColumnMap;
  readonly plan: ImportPlan | null;
  readonly confirmed: boolean;
  /** 导入前自动备份出来的那一份（空串＝还没执行）。 */
  readonly backup: string;
  readonly inserted: number;
  readonly failed: readonly BadRow[];
}

export type WizardInput = InitWizardInput | RestoreWizardInput | ImportWizardInput;

/** 初始化那一支的正文：环境检测格 ＋ 完成卡／未就绪说明。 */
function initBody(input: InitWizardInput): string {
  const head = input.ready
    ? renderConclusionBar('初始化完成，可以开始记账了')
    : renderConclusionBar('还没初始化好：先把上面那几件补齐');
  return head
    + renderCaliberLine('数据目录：' + input.dbPath + ' · 现有记录 ' + String(input.records) + ' 条'
      + (input.created ? ' · 这一次新建了库' : ' · 这次没有新建，用的是已有的库'))
    + envChecksOf(input.envChecks);
}

/** 恢复那一支的正文：**覆盖警告（含「怎么回去」）＋ 备份清单（选中那行带标记）＋ 详情卡**。
 *  **选中项只有一处**：`input.selected`——老侧最高危缺陷（`restore.html:141-145` 详情卡冻结在初值、
 *  而复制文案用新选的那一个）就是从这里长出来的；新侧的详情卡与口令都由本件的同一个 `selected` 派生。 */
function restoreBody(input: RestoreWizardInput): string {
  const s = input.selected;
  if (s === null) {
    return emptyOf({
      title: '还没有备份可恢复',
      text: '备份目录里一份都没有，没有可拿来恢复的东西。',
      next: '先跟助手说一遍「备份」，把现在的数据存一份，之后就能从这里挑一份恢复。',
    });
  }
  const warn = renderConclusionBar('⚠️ 恢复将覆盖当前数据')
    + renderCaliberLine('恢复前会自动备份现状——不用你记着；若恢复后不满意，再用「恢复备份」'
      + '挑刚刚那一份「' + (input.safety === '' ? '（这次还没造）' : input.safety) + '」就能回到现在的样子。');
  const columns: readonly DataTableColumn[] = [
    { key: 'file', label: '备份文件' },
    { key: 'time', label: '备份时间' },
    { key: 'size', label: '大小', align: 'right' },
  ];
  const rows: readonly DataTableRow[] = input.entries.map((e) => ({
    ...(e.file === s.file ? { marker: '选中的' } : {}),
    file: e.file,
    time: e.time,
    size: humanBytes(e.bytes),
  }));
  const detail = renderDataTable({
    columns: [
      { key: 'k', label: '哪一项' },
      { key: 'v', label: '是什么' },
    ],
    rows: [
      { k: '备份名称', v: s.file },
      { k: '备份时间', v: s.time },
      { k: '大小', v: humanBytes(s.bytes) },
      { k: '内容', v: s.hasGoals ? '库 ＋ 目标' : '只有库' },
    ],
    caption: '要恢复的就是这一份（详情与下面那句口令说的是同一份）',
  });
  const outcome = input.confirmed
    ? renderConclusionBar(input.verified ? '恢复完成：' + input.result : '恢复没走完：' + input.result)
      + renderCaliberLine('恢复前现状已备份：' + (input.safety === '' ? '没造出来' : input.safety))
    : '';
  return warn
    + renderDataTable({ columns, rows, caption: input.entries.length > 1 ? '备份目录里的这些份（默认用最新的一份）' : '备份目录里只有这一份' })
    + detail
    + outcome;
}

/** 导入那一支的正文：文件卡 ＋ 列映射表 ＋ 预览表 ＋ **D2 的四件**（明示新增行数／自动备份／重复检测／结果卡）。 */
function importBody(input: ImportWizardInput): string {
  const csv = input.csv;
  if (csv === null) {
    return emptyOf({
      title: '还没给文件',
      text: '导入要先有那个 CSV 文件。',
      next: '把文件路径填在上面那格，跟助手说一遍「导入」。',
    });
  }
  const mapColumns: readonly DataTableColumn[] = [
    { key: 'field', label: '字段' },
    { key: 'col', label: '认到第几列' },
    { key: 'sample', label: '第一行长这样' },
  ];
  const first = csv.rows[0] ?? [];
  const mapRows: readonly DataTableRow[] = IMPORT_FIELDS.map((f: ImportField) => {
    const col = input.map[f];
    return {
      field: FIELD_LABEL[f] + (REQUIRED_FIELDS.includes(f) ? '（必填）' : ''),
      col: col === undefined ? '没认到' : '第 ' + String(col + 1) + ' 列（' + textOrDash(csv.header[col]) + '）',
      sample: col === undefined ? '—' : textOrDash(first[col]),
    };
  });
  const previewRows: readonly DataTableRow[] = csv.rows.slice(0, PREVIEW_ROWS).map((cells, i) => {
    const row: Record<string, unknown> = { no: '第 ' + String(i + (csv.hasHeader ? 2 : 1)) + ' 行' };
    csv.header.forEach((h, c) => { row['c' + String(c)] = textOrDash(cells[c]); });
    return row;
  });
  const previewColumns: readonly DataTableColumn[] = [{ key: 'no', label: '哪一行' }].concat(
    csv.header.map((h, c) => ({ key: 'c' + String(c), label: textOrDash(h) })),
  );
  // ① 明示「将新增几行、不覆盖已有记录」；③ 重复导入检测的读数也在这句里。
  const countLine = input.plan === null
    ? renderCaliberLine('还没排导入计划（先认下列映射）。')
    : renderCaliberLine('本次将新增 ' + String(input.plan.newRows) + ' 行，不覆盖已有记录'
      + (input.plan.duplicates.length > 0 ? '；另有 ' + String(input.plan.duplicates.length) + ' 行库里已经有了，跳过' : '')
      + (input.plan.bad.length > 0 ? '；' + String(input.plan.bad.length) + ' 行读不出来，跳过' : '') + '。');
  // ② 导入前提示或自动备份一次（本仓取「自动备份」这一支）。
  const backupLine = renderCaliberLine(input.confirmed
    ? (input.backup === '' ? '导入前本该自动备份一次，这次没落下来——请注意。' : '导入前已经自动备份了现状：' + input.backup)
    : '确认之后才写库；写之前会自动备份一次现状，导错了可以拿它回去。');
  // ④ 页面级结果卡（成功／失败行数 ＋ 失败原因）。
  const resultBlock = input.confirmed
    ? renderConclusionBar('导入完成：成功 ' + String(input.inserted) + ' 行'
      + (input.failed.length > 0 ? '，失败 ' + String(input.failed.length) + ' 行' : '，没有失败行'))
      + (input.failed.length === 0
        ? renderCaliberLine('每一行都写进去了。')
        : renderDataTable({
          columns: [{ key: 'line', label: '哪一行' }, { key: 'why', label: '为什么没进去' }],
          rows: input.failed.map((f) => ({ line: '第 ' + String(f.line) + ' 行', why: f.why })),
          caption: '没写进去的行逐条列在这里',
        }))
    : '';
  return renderCaliberLine('文件：' + csv.name + ' · 数据 ' + String(csv.rows.length) + ' 行 · 编码 ' + csv.encoding)
    + renderDataTable({ columns: mapColumns, rows: mapRows, caption: '列映射（自动认的，改就照下面那句重说一遍）' })
    + renderDataTable({ columns: previewColumns, rows: previewRows, caption: '前 ' + String(Math.min(PREVIEW_ROWS, csv.rows.length)) + ' 行', emptyText: '这个文件没有数据行' })
    + countLine + backupLine + resultBlock;
}

/** 向导页：一整页（三支共用同一套块序，各自只换「该步主体」那一块）。 */
export function wizardDoc(input: WizardInput): string {
  const body = input.op === 'init' ? initBody(input)
    : input.op === 'restore' ? restoreBody(input) : importBody(input);
  const stepTable = stepTableOf(input.steps);
  const reason = input.op === 'init'
    ? (input.ready ? '初始化完成，可以记账了。' : '还差几步没走完。')
    : input.op === 'restore'
      ? (input.selected === null ? '还没有可恢复的备份。'
        : (input.confirmed ? (input.verified ? '恢复完成。' : '恢复没走完。') : '要恢复的是 ' + input.selected.file + '，确认之后才动数据。'))
      : (input.plan === null ? '先把文件的列认下来。'
        : (input.confirmed ? '导入完成。' : '本次将新增 ' + String(input.plan.newRows) + ' 行，不覆盖已有记录。'));
  const status = input.op === 'init'
    ? (input.ready ? { kind: 'ok' as const, text: '已完成' } : { kind: 'warn' as const, text: '还没就绪' })
    : input.op === 'restore'
      ? (input.confirmed ? { kind: input.verified ? 'ok' as const : 'warn' as const, text: input.verified ? '已恢复' : '没走完' }
        : { kind: 'warn' as const, text: '等你确认' })
      : (input.confirmed ? { kind: input.failed.length === 0 ? 'ok' as const : 'warn' as const, text: '已导入' }
        : { kind: 'warn' as const, text: '等你确认' });
  const parts = [
    badgeOf({ word: input.scene.title, caliber: input.scene.caliber, status: status.kind, statusText: status.text, next: '' }),
    renderConclusionBar(reason),
    stepChipsOf(input.steps),
    stepTable,
    body,
    blockedOf({ blocked: input.blocked, command: blockedCommandText(input) }),
    promptBlockOf(input.prompt, input.promptLabel),
    copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: sourceOf(input), detail: logDetailOf(input), actionAt: input.actionAt,
    }),
  ];
  const content = parts.filter((p) => p !== '').join('')
    + sourceNoteOf({
      sourceText: sourceTextOf(input),
      start: '不限',
      end: '不限',
      count: countOf(input),
    });
  return setupPageShell({
    docTitle: DOC_TITLE + '·' + input.scene.title,
    title: input.scene.title,
    subtitle: input.scene.subtitle,
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, content,
  });
}

/** 补齐口令（缺项时给看不给复制的那一句）。 */
function blockedCommandText(input: WizardInput): string {
  const filled: Record<string, unknown> = { op: input.op, ...input.params };
  for (const b of input.blocked) filled[b.name] = '<' + b.label + '>';
  return 'bill.setup.run ' + JSON.stringify(filled);
}

/** 复制日志第 3 段（给机器看的那句来源）。 */
function sourceOf(input: WizardInput): string {
  if (input.op === 'import') return SOURCE_FILE;
  if (input.op === 'restore') return SOURCE_WRITE;
  return SOURCE_READ;
}

/** 来源脚注那一句（只写人话）。 */
function sourceTextOf(input: WizardInput): string {
  if (input.op === 'import') return SOURCE_FILE_TEXT;
  if (input.op === 'restore') return SOURCE_WRITE_TEXT;
  return SOURCE_READ_TEXT;
}

/** 复制日志第 4 段后半那一句（这一趟干了什么）。 */
function logDetailOf(input: WizardInput): string {
  if (input.op === 'init') return input.ready ? '环境检测通过，库已就绪' : '环境检测未过，库还没就绪';
  if (input.op === 'restore') return input.confirmed
    ? '恢复 ' + String(input.selected?.file ?? '—') + '（现状已备份 ' + input.safety + '）'
    : '预览 ' + String(input.selected?.file ?? '—') + '，等确认';
  return input.confirmed
    ? '导入 ' + String(input.inserted) + ' 行（失败 ' + String(input.failed.length) + ' 行）'
    : '预览导入计划 ' + String(input.plan?.newRows ?? 0) + ' 行，等确认';
}

/** 来源脚注的条数那一格（这一页看了几件东西）。 */
function countOf(input: WizardInput): number {
  if (input.op === 'init') return input.records;
  if (input.op === 'restore') return input.entries.length;
  return input.plan?.newRows ?? 0;
}
