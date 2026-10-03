/** 开始使用域模板之三 · **向导页型**——票据纸版（#1080 落地）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  盖住的场景：初始化（`./scene-init.js`）、恢复备份（`./scene-restore.js`）、导入（`./scene-import.js`）。
 *
 * 判地（唯一）：
 *   · `docs/skills/skill-bill/proto/setup-help/s01-初始化-v2.4.html`（verdict seq18，sha `f64a6d11…`）
 *   · `docs/skills/skill-bill/proto/setup-help/s05-恢复备份-v2.4.html`（verdict seq22，sha `222d87a5…`）
 *   · `docs/skills/skill-bill/proto/setup-help/s06-导入-v2.4.html`（verdict seq23，sha `d9f9a26a…`）
 * 三页同形：店头 → 主数字 → 段（四步走到哪儿了 ＋ 各页自有段）→ 复制区（可选主按钮）→ 裁切线。
 *  四步的**状态**取自 `./steps.js`（编号与状态只在那里算一处），本件只把状态摊成原型那一行的字面。
 *
 * 载荷与口径一字不动：出口 `data = { ok, message, receipt }` 由各处理体装配，本件只出 HTML。
 */
import { basename } from 'node:path';
import { renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { BillKey } from '../triggers/routeSpec.js';
import {
  assembleSheetPage, sheetHead, ticketActions, ticketPrimaryButton, ticketFurnitureStyleTag, ticketRule, ticketSection, ticketSummary,
} from '../shared/docPage.js';
import { writeSection } from '../shared/writeParts.js';
import type { BackupEntry } from './backups.js';
import type { ColumnMap, CsvFile, ImportPlan } from './importer.js';
import {
  SOURCE_FILE, SOURCE_READ, SOURCE_WRITE, copyZoneOf, setupCheck, setupEntryCard, setupPromptBox, } from './pageParts.js';
import type { SetupRowInput } from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { SetupBlocked } from './params.js';
import { STEP_STATE_TEXT } from './steps.js';
import type { WizardStep } from './steps.js';

/** 三片向导共用的入参。 */
interface WizardCommon {
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  readonly steps: readonly WizardStep[];
  readonly envelope: SerializableEnvelope;
  readonly blocked: readonly SetupBlocked[];
  readonly prompt: string;
  readonly promptLabel: string;
}

export interface InitWizardInput extends WizardCommon {
  readonly op: 'init';
  readonly envChecks: readonly { readonly label: string; readonly ok: boolean; readonly detail: string }[];
  readonly ready: boolean;
  readonly dbPath: string;
  readonly records: number;
  readonly created: boolean;
}

export interface RestoreWizardInput extends WizardCommon {
  readonly op: 'restore';
  readonly entries: readonly BackupEntry[];
  readonly selected: BackupEntry | null;
  readonly confirmed: boolean;
  readonly safety: string;
  readonly verified: boolean;
  readonly result: string;
}

export interface ImportWizardInput extends WizardCommon {
  readonly op: 'import';
  readonly csv: CsvFile | null;
  readonly map: ColumnMap;
  readonly plan: ImportPlan | null;
  readonly confirmed: boolean;
  readonly backup: string;
  readonly inserted: number;
  readonly failed: readonly { readonly line: number; readonly why: string }[];
}

export type WizardInput = InitWizardInput | RestoreWizardInput | ImportWizardInput;

/** 这一页的唤醒词（**不写死**：按 key ＋ op 从域声明算，t721 的判据）。 */
function wakeOf(key: string, op: 'init' | 'init-status' | 'backup-create' | 'backup-list' | 'restore' | 'import'): string {
  return projectWakeWord({ key: key as BillKey, op });
}

/** 四步那一行：状态字照原型（done／current／todo／blocked），主行 `步骤名 · 状态字`。 */
function stepRows(steps: readonly WizardStep[], subs: readonly string[], words?: readonly string[]): readonly SetupRowInput[] {
  return steps.map((s, i) => {
    const tone: SetupRowInput['tone'] = s.state === 'done' ? 'done' : s.state === 'current' ? 'now' : s.state === 'blocked' ? 'bad' : 'todo';
    return {
      no: String(s.no),
      text: s.label + ' · ' + (words === undefined ? STEP_STATE_TEXT[s.state] : (words[i] as string)),
      sub: subs[i] as string,
      tone,
    };
  });
}

/** 四步段（三页同形，段号由调用方给）。 */
function stepsSection(steps: readonly WizardStep[], subs: readonly string[], tag: string, words?: readonly string[]): string {
  return ticketSection({ title: '四步走到哪儿了', tag, content: setupEntryCard(stepRows(steps, subs, words)) });
}

/** 初始化页：四步 ＋ 落点。 */
function initBody(input: InitWizardInput): string {
  const ok = input.ready;
  const subs = [
    input.envChecks.every((c) => c.ok) ? '两项都过了' : '有没过的项',
    input.envChecks[1]?.ok === true ? '记账库目录就绪' : '目录还不可写',
    '结构对上即沿用，不重建',
    '库能打开，记录能数清',
  ];
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · 初始化', ok ? '初始化完成，可以记账了' : '初始化还没走完', input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: ok ? '已完成 · INIT OK' : '没走完 · INIT FAIL',
      value: String(input.records),
      unit: '条',
      note: '库里现有记录，一条不少',
      layout: 'ticket',
    }), '')
    + ticketRule()
    + stepsSection(input.steps, subs, '01')
    + ticketRule()
    + ticketSection({
      title: '落点',
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: '库', value: basename(input.dbPath) },
          { label: '结构', value: String(input.envChecks.length) + ' 列齐' },
          { label: '唤醒词', value: wakeOf(input.key, 'init') },
        ],
        layout: 'ticket',
        extraClass: 'is-mono-first',
      }) + setupCheck(ok
        ? '不用选：全程自动检测，不用你动手选。'
          + (input.created ? '这次新建了库，' : '这次没有新建，沿用已有库。') + '下一步说「记支出」，直接开始记第一笔。'
        : '有一步没走通：照着上面那一行的说法再跟助手说一遍，把这一步补上。'),
    })
    + ticketActions(
      ticketPrimaryButton({
        label: '复制给助手：直接开始记第一笔', actionId: 'ilife-setup-next', text: input.prompt,
      }) + copyZoneOf({
        envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
        source: SOURCE_WRITE, detail: '环境检测通过，库已就绪', actionAt: input.actionAt,
      }),
    );
}

/** 恢复页：覆盖警告 ＋ 四步 ＋ 确认口令。 */
function restoreBody(input: RestoreWizardInput): string {
  const sel = input.selected;
  const name = sel === null ? '（备份目录里还没有备份）' : sel.file;
  const subs = [
    sel === null ? '备份目录里还没有备份' : '就是纸头这份',
    '把下面的确认口令说给助手',
    '自动做，不用你动手',
    '完了会数一遍记录',
  ];
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, '要恢复的是这份，确认之后才覆盖', input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: '等你确认 · 待确认',
      value: String(input.entries.length),
      unit: '份',
      note: '待恢复的备份：' + name,
      layout: 'ticket',
      extraClass: 'is-warn-head',
    }), '')
    + ticketRule()
    + ticketSection({
      title: '覆盖警告',
      tag: '01',
      tone: 'danger',
      content: setupCheck('恢复会覆盖当前库。覆盖之前会自动备份现状，所以现状不会丢——但这一步仍要你亲口确认。', 'danger'),
    })
    + ticketRule()
    + stepsSection(input.steps, subs, '02')
    + ticketRule()
    + ticketSection({
      title: '确认口令',
      tag: '03',
      content: renderLedgerRows({
        rows: [
          { label: '目标备份', value: '同纸头待恢复那一份' },
          { label: '唤醒词', value: wakeOf(input.key, 'restore') },
        ],
        layout: 'ticket',
      }) + setupPromptBox('复制给助手，照这句确认，恢复前会自动备份现状：', input.prompt)
        + setupCheck('本页只做预览：确认后才会真正覆盖。真要恢复，把口令说给助手，由助手完成。', 'warn'),
    })
    + ticketActions(
      ticketPrimaryButton({ label: '复制确认口令给助手', actionId: 'ilife-setup-restore', text: input.prompt })
      + copyZoneOf({
        envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
        source: SOURCE_READ, detail: '预览，等确认', actionAt: input.actionAt,
      }),
    );
}

/** 导入页：四步 ＋ 列映射与预览 ＋ 口令框 ＋ 两句小结。 */
function importBody(input: ImportWizardInput): string {
  const plan = input.plan;
  const csv = input.csv;
  const newRows = plan === null ? 0 : plan.newRows;
  const dup = plan === null ? 0 : plan.duplicates.length;
  const bad = plan === null ? 0 : plan.bad.length;
  const cols = Object.keys(input.map).length;
  const mapped = input.map.time !== undefined && input.map.amount !== undefined && input.map.category !== undefined;
  const subs = [
    csv === null ? '还没给 CSV 文件路径' : csv.name + '，' + String(csv.rows.length) + ' 行',
    '自动识别，对不上可以改',
    '新增 ' + String(newRows) + ' 行，重号 ' + String(dup) + ' 行不写',
    '先备份再记好，真正记好由助手完成',
  ];
  const words = [
    csv === null ? '还没读' : '已读',
    mapped ? '已认 ' + String(cols) + ' 列' : '还缺必填列',
    '等你点头',
    '待执行',
  ];
  const preview = (plan === null ? [] : [...plan.rows].slice(0, 3)).map((r, i) => ({
    no: String(i + 1),
    text: r.time.slice(5, 10) + ' ' + r.category + ' ' + r.amount.toFixed(2),
    sub: '时间 ' + r.time.slice(5, 16) + ' · 分类 ' + r.category + ' · 金额 ' + r.amount.toFixed(2)
      + ' · 账户 ' + r.account,
  }));
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, '先把文件的列认下来', input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: '已认列 · 等你确认',
      value: String(newRows),
      unit: '行',
      note: '本次将新增 ' + String(newRows) + ' 行，不覆盖已有记录',
      layout: 'ticket',
    }), '')
    + ticketRule()
    + stepsSection(input.steps, subs, '01', words)
    + ticketRule()
    + ticketSection({
      title: '列映射与预览',
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: 'CSV 文件', value: csv === null ? '—' : csv.name },
          { label: '认下的列', value: mapped ? '时间 · 分类 · 金额 · 备注 · 账户' : '还没认全' },
          { label: '读出来的行', value: String(csv === null ? 0 : csv.rows.length) + ' 行' },
          { label: '将新增', value: String(newRows) + ' 行' },
          { label: '重号不写', value: String(dup) + ' 行' },
          { label: '读不出的坏行', value: String(bad) + ' 行' },
        ],
        layout: 'ticket',
      }) + setupEntryCard(preview)
        + setupPromptBox('确认这 ' + String(newRows) + ' 行，照这句说一遍：', input.prompt)
        + setupCheck('先数后记：这 ' + String(newRows) + ' 行还没写库，你点头之后助手才动手。', 'warn')
        + setupCheck('导入前会自动备份一次现状，备份件写在这一步的结果里。'),
    })
    + ticketActions(
      ticketPrimaryButton({ label: '复制这句话去跟助手说', actionId: 'ilife-setup-import', text: input.prompt })
      + copyZoneOf({
        envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
        source: SOURCE_FILE, detail: '预览导入计划 ' + String(newRows) + ' 行，等确认', actionAt: input.actionAt,
      }),
    );
}

/** 向导页：一整页（票据纸）。 */
export function wizardDoc(input: WizardInput): string {
  const paper = input.op === 'init' ? initBody(input) : input.op === 'restore' ? restoreBody(input) : importBody(input);
  const content = writeSection({
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·' + input.scene.title, bodyHtml: content, paper: 'detail' });
}
