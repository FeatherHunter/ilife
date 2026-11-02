/** 开始使用域模板之二 · **记录列表／状态页型**——票据纸版（#1080 落地）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  盖住的场景：查看备份（`./scene-backup-list.js`）与初始化状态（`./scene-init-status.js`）。
 *
 * 判地（唯一）：
 *   · `docs/skills/skill-bill/proto/setup-help/s04-备份-查看备份-v2.4.html`（verdict seq21，sha `fb4ae5d2…`）
 *   · `docs/skills/skill-bill/proto/setup-help/s02-初始化状态-v2.4.html`（verdict seq19，sha `156bc79c…`）
 * 两页同形：店头 → 主数字（眉标／大数字／注／可选时刻）→ 段 01（明细卡）→ 段 02（落点 ＋ 对账小结）
 *  → 复制区（只数据／日志两钮）→ 裁切线。
 *
 * 载荷与口径一字不动：出口 `data = { ok, message, receipt }` 由 `./run.js` 装配，本件只出 HTML。
 */
import { renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { BillKey } from '../triggers/routeSpec.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketFurnitureStyleTag, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { writeSection } from '../shared/writeParts.js';
import type { BackupEntry } from './backups.js';
import {
  copyZoneOf, humanBytes, setupCheck, setupEntryCard, sourceRead, } from './pageParts.js';
import type { SetupRowInput } from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { SetupStatus } from './status.js';
import { m } from '../entries/index.js';

/** 查看备份那一页的入参。 */
export interface BackupListDocInput {
  readonly op: 'backup-list';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  readonly entries: readonly BackupEntry[];
  readonly envelope: SerializableEnvelope;
}

/** 初始化状态那一页的入参。 */
export interface StatusDocInput {
  readonly op: 'init-status';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  readonly status: SetupStatus;
  readonly envelope: SerializableEnvelope;
}

/** 联合入参（`./run.js` 一个调用点按 op 给）。 */
export type ListDocInput = BackupListDocInput | StatusDocInput;

/** 这一页的唤醒词（**不写死**：按 key ＋ op 从域声明算，t721 的判据）。 */
function wakeOf(key: string, op: 'init' | 'init-status' | 'backup-create' | 'backup-list' | 'restore' | 'import'): string {
  return projectWakeWord({ key: key as BillKey, op });
}

/** 备份总字节（落点那一行「合计」；原型 = 库 ＋ 目标两份之和）。 */
function totalBytes(entries: readonly BackupEntry[]): number {
  return entries.reduce((sum, e) => sum + e.bytes + (e.hasGoals ? e.goalsBytes : 0), 0);
}

/** 查看备份：清单一行一份，最新那份走实付高亮档 ＋ 星胶囊。 */
function backupListBody(input: BackupListDocInput): string {
  const entries = input.entries;
  const latest = entries[0] as BackupEntry | undefined;
  const rows: readonly SetupRowInput[] = entries.map((e, i) => ({
    no: '★',
    text: e.file,
    sub: e.time + ' · ' + humanBytes(e.bytes)
      + (i === 0 ? m('skill-bill.setup-template-list.c001') : m('skill-bill.setup-template-list.c002')),
    ...(i === 0 ? { pay: true, star: true } : {}),
  }));
  const head = latest === undefined
    ? { title: m('skill-bill.setup-template-list.c003'), sub: input.scene.subtitle, eyebrow: m('skill-bill.setup-template-list.c004'), value: '0', unit: m('skill-bill.setup-template-list.c005'), note: m('skill-bill.setup-template-list.c006'), time: '' }
    : {
      title: m('skill-bill.setup-template-list.c007', { p0: String(String(entries.length)) }),
      sub: input.scene.subtitle,
      eyebrow: m('skill-bill.setup-template-list.c008'),
      value: String(entries.length),
      unit: m('skill-bill.setup-template-list.c009'),
      note: m('skill-bill.setup-template-list.c010'),
      time: m('skill-bill.setup-template-list.c011', { p0: String(latest.time) }),
    };
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, head.title, head.sub)
    + ticketSummary(renderSummaryHead({
      eyebrow: head.eyebrow, value: head.value, unit: head.unit, note: head.note, layout: 'ticket',
    }), head.time === '' ? '' : '<p class="ilife-ticket-summary-time">' + head.time + '</p>')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.setup-template-list.c012'), tag: '01', content: setupEntryCard(rows) })
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.setup-template-list.c013'),
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: m('skill-bill.setup-template-list.c014'), value: humanBytes(totalBytes(entries)) },
          { label: m('skill-bill.setup-template-list.c015'), value: wakeOf(input.key, 'backup-list') },
        ],
        layout: 'ticket',
      }) + setupCheck(m('skill-bill.setup-template-list.c016')),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: sourceRead(), detail: m('skill-bill.setup-template-list.c017', { p0: String(String(entries.length)) }), actionAt: input.actionAt,
    }));
}

/** 初始化状态：三项判定逐条一行，落点报库／口径／唤醒词。 */
function statusBody(input: StatusDocInput): string {
  const s = input.status;
  const ready = s.ready;
  const readyText = ready ? m('skill-bill.setup-template-list.c018') : m('skill-bill.setup-template-list.c019');
  const rows: readonly SetupRowInput[] = [
    { no: '1', text: m('skill-bill.setup-template-list.c020', { p0: String(readyText) }), sub: m('skill-bill.setup-template-list.c021'), tone: ready ? 'done' : 'bad' },
    { no: '2', text: m('skill-bill.setup-template-list.c022', { p0: String(s.version) }), sub: m('skill-bill.setup-template-list.c023'), tone: ready ? 'done' : 'bad' },
    { no: '3', text: m('skill-bill.setup-template-list.c024'), sub: m('skill-bill.setup-template-list.c025'), tone: ready ? 'done' : 'bad' },
  ];
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, ready ? m('skill-bill.setup-template-list.c026') : m('skill-bill.setup-template-list.c027'), input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: ready ? m('skill-bill.setup-template-list.c028') : m('skill-bill.setup-template-list.c029'),
      value: String(s.rows),
      unit: m('skill-bill.setup-template-list.c030'),
      note: ready ? m('skill-bill.setup-template-list.c031') : m('skill-bill.setup-template-list.c032'),
      layout: 'ticket',
    }), '')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.setup-template-list.c033'), tag: '01', content: setupEntryCard(rows) })
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.setup-template-list.c034'),
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: m('skill-bill.setup-template-list.c035'), value: ready ? m('skill-bill.setup-template-list.c036') : m('skill-bill.setup-template-list.c037') },
          { label: m('skill-bill.setup-template-list.c038'), value: m('skill-bill.setup-template-list.c039', { p0: String(String(s.columns.length)) }) },
          { label: m('skill-bill.setup-template-list.c040'), value: wakeOf(input.key, 'init-status') },
        ],
        layout: 'ticket',
      }) + setupCheck(ready
        ? m('skill-bill.setup-template-list.c041')
        : m('skill-bill.setup-template-list.c042')),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: sourceRead(), detail: m('skill-bill.setup-template-list.c043', { p0: String(String(s.rows)) }), actionAt: input.actionAt,
    }));
}

/** 记录列表／状态页：一整页（票据纸）。 */
export function listDoc(input: ListDocInput): string {
  const paper = input.op === 'backup-list' ? backupListBody(input) : statusBody(input);
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.setup-template-list.c044'), content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·' + input.scene.title, bodyHtml: content, paper: 'detail' });
}
