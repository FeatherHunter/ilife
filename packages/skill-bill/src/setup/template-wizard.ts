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
  copyZoneOf, setupCheck, setupEntryCard, setupPromptBox, sourceFile, sourceRead, sourceWrite, } from './pageParts.js';
import { buildSetupCopy } from './copyTextSetup.js';
import type { SetupCopy } from './copyTextSetup.js';
import type { SetupRowInput } from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { SetupBlocked } from './params.js';
import { stepStateText } from './steps.js';
import type { WizardStep } from './steps.js';
import { m } from '../entries/index.js';

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

/** 四步那一行：人话行（第N步+标题+状态+现状数，显示与复制同源，只读 steps.detail）。 */
function stepRows(steps: readonly WizardStep[]): readonly SetupRowInput[] {
  return steps.map((s) => {
    const tone: SetupRowInput['tone'] = s.state === 'done' ? 'done' : s.state === 'current' ? 'now' : s.state === 'blocked' ? 'bad' : 'todo';
    return {
      no: String(s.no),
      text: s.label + ' · ' + stepStateText(s.state),
      sub: s.detail,
      tone,
    };
  });
}

/** 四步段（三页同形，段号由调用方给；空steps出空态不断言假绿）。 */
function stepsSection(steps: readonly WizardStep[], tag: string): string {
  if (steps.length === 0) {
    return ticketSection({ title: m('skill-bill.setup-template-wizard.c001'), tag, content: setupCheck(m('skill-bill.setup-template-wizard.c002'), 'warn') });
  }
  return ticketSection({ title: m('skill-bill.setup-template-wizard.c003'), tag, content: setupEntryCard(stepRows(steps)) });
}

/** 向导复制三份＋提示（人话门覆写，复制恒等于已显示行；hints与回执同组；经 `copy` 单对象透传）。 */
function wizardCopyOf(op: 'init' | 'restore' | 'import', title: string, steps: readonly WizardStep[]): SetupCopy {
  const facts = { op, title, steps } as const;
  const triple = buildSetupCopy(facts);
  return { ...triple, hints: wizardCopyHints() };
}

/** 向导复制提示（三份用途，与回执同字）。 */
function wizardCopyHints(): readonly string[] {
  return [m('skill-bill.setup-template-wizard.c004'), m('skill-bill.setup-template-wizard.c005'), m('skill-bill.setup-template-wizard.c006')];
}

/** 初始化页：四步 ＋ 落点（四步现状数只读 steps.detail，不另写一套）。 */
function initBody(input: InitWizardInput): string {
  const ok = input.ready;
  const createdText = input.created ? m('skill-bill.setup-template-wizard.c007') : m('skill-bill.setup-template-wizard.c008');
  const copy = wizardCopyOf('init', input.scene.title, input.steps);
  return ticketFurnitureStyleTag()
    + sheetHead(m('skill-bill.setup-template-wizard.c009', { p0: String(DOC_TITLE) }), ok ? m('skill-bill.setup-template-wizard.c010') : m('skill-bill.setup-template-wizard.c011'), input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: ok ? m('skill-bill.setup-template-wizard.c012') : m('skill-bill.setup-template-wizard.c013'),
      value: String(input.records),
      unit: m('skill-bill.setup-template-wizard.c014'),
      note: m('skill-bill.setup-template-wizard.c015'),
      layout: 'ticket',
    }), '')
    + ticketRule()
    + stepsSection(input.steps, '01')
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.setup-template-wizard.c016'),
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: m('skill-bill.setup-template-wizard.c017'), value: basename(input.dbPath) },
          { label: m('skill-bill.setup-template-wizard.c018'), value: m('skill-bill.setup-template-wizard.c019', { p0: String(String(input.envChecks.length)) }) },
          { label: m('skill-bill.setup-template-wizard.c020'), value: wakeOf(input.key, 'init') },
        ],
        layout: 'ticket',
        extraClass: 'is-mono-first',
      }) + setupCheck(ok
        ? m('skill-bill.setup-template-wizard.c021', { p0: String(createdText) })
        : m('skill-bill.setup-template-wizard.c022')),
    })
    + ticketActions(
      ticketPrimaryButton({
        label: m('skill-bill.setup-template-wizard.c023'), actionId: 'ilife-setup-next', text: input.prompt,
      }) + copyZoneOf({
        envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
        source: sourceWrite(), detail: m('skill-bill.setup-template-wizard.c024'), actionAt: input.actionAt,
        copy,
      }),
    );
}

/** 恢复页：覆盖警告 ＋ 四步 ＋ 确认口令。 */
function restoreBody(input: RestoreWizardInput): string {
  const sel = input.selected;
  const name = sel === null ? m('skill-bill.setup-template-wizard.c025') : sel.file;
  const copy = wizardCopyOf('restore', input.scene.title, input.steps);
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, m('skill-bill.setup-template-wizard.c026'), input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: m('skill-bill.setup-template-wizard.c027'),
      value: String(input.entries.length),
      unit: m('skill-bill.setup-template-wizard.c028'),
      note: m('skill-bill.setup-template-wizard.c029', { p0: String(name) }),
      layout: 'ticket',
      extraClass: 'is-warn-head',
    }), '')
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.setup-template-wizard.c030'),
      tag: '01',
      tone: 'danger',
      content: setupCheck(m('skill-bill.setup-template-wizard.c031'), 'danger'),
    })
    + ticketRule()
    + stepsSection(input.steps, '02')
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.setup-template-wizard.c032'),
      tag: '03',
      content: renderLedgerRows({
        rows: [
          { label: m('skill-bill.setup-template-wizard.c033'), value: m('skill-bill.setup-template-wizard.c034') },
          { label: m('skill-bill.setup-template-wizard.c035'), value: wakeOf(input.key, 'restore') },
        ],
        layout: 'ticket',
      }) + setupPromptBox(m('skill-bill.setup-template-wizard.c036'), input.prompt)
        + setupCheck(m('skill-bill.setup-template-wizard.c037'), 'warn'),
    })
    + ticketActions(
      ticketPrimaryButton({ label: m('skill-bill.setup-template-wizard.c038'), actionId: 'ilife-setup-restore', text: input.prompt })
      + copyZoneOf({
        envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
        source: sourceRead(), detail: m('skill-bill.setup-template-wizard.c039'), actionAt: input.actionAt,
        copy,
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
  const mapped = input.map.time !== undefined && input.map.amount !== undefined && input.map.category !== undefined;
  const copy = wizardCopyOf('import', input.scene.title, input.steps);
  const preview = (plan === null ? [] : [...plan.rows].slice(0, 3)).map((r, i) => ({
    no: String(i + 1),
    text: r.time.slice(5, 10) + ' ' + r.category + ' ' + r.amount.toFixed(2),
    sub: m('skill-bill.setup-template-wizard.c040', {
      p0: String(r.time.slice(5, 16)),
      p1: String(r.category),
      p2: String(r.amount.toFixed(2)),
      p3: String(r.account),
    }),
  }));
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, m('skill-bill.setup-template-wizard.c041'), input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: m('skill-bill.setup-template-wizard.c042'),
      value: String(newRows),
      unit: m('skill-bill.setup-template-wizard.c043'),
      note: m('skill-bill.setup-template-wizard.c044', { p0: String(String(newRows)) }),
      layout: 'ticket',
    }), '')
    + ticketRule()
    + stepsSection(input.steps, '01')
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.setup-template-wizard.c045'),
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: m('skill-bill.setup-template-wizard.c046'), value: csv === null ? '—' : csv.name },
          { label: m('skill-bill.setup-template-wizard.c047'), value: mapped ? m('skill-bill.setup-template-wizard.c048') : m('skill-bill.setup-template-wizard.c049') },
          { label: m('skill-bill.setup-template-wizard.c050'), value: m('skill-bill.setup-template-wizard.c051', {
            p0: String(String(csv === null ? 0 : csv.rows.length)),
          }) },
          { label: m('skill-bill.setup-template-wizard.c052'), value: m('skill-bill.setup-template-wizard.c053', { p0: String(String(newRows)) }) },
          { label: m('skill-bill.setup-template-wizard.c054'), value: m('skill-bill.setup-template-wizard.c055', { p0: String(String(dup)) }) },
          { label: m('skill-bill.setup-template-wizard.c056'), value: m('skill-bill.setup-template-wizard.c057', { p0: String(String(bad)) }) },
        ],
        layout: 'ticket',
      }) + setupEntryCard(preview)
        + setupPromptBox(m('skill-bill.setup-template-wizard.c058', { p0: String(String(newRows)) }), input.prompt)
        + setupCheck(m('skill-bill.setup-template-wizard.c059', { p0: String(String(newRows)) }), 'warn')
        + setupCheck(m('skill-bill.setup-template-wizard.c060')),
    })
    + ticketActions(
      ticketPrimaryButton({ label: m('skill-bill.setup-template-wizard.c061'), actionId: 'ilife-setup-import', text: input.prompt })
      + copyZoneOf({
        envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
        source: sourceFile(), detail: m('skill-bill.setup-template-wizard.c062', { p0: String(String(newRows)) }), actionAt: input.actionAt,
        copy,
      }),
    );
}

/** 向导页：一整页（票据纸）。 */
export function wizardDoc(input: WizardInput): string {
  const paper = input.op === 'init' ? initBody(input) : input.op === 'restore' ? restoreBody(input) : importBody(input);
  const content = writeSection({
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.setup-template-wizard.c063'), content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·' + input.scene.title, bodyHtml: content, paper: 'detail' });
}
