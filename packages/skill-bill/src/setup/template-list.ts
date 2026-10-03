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
  SOURCE_READ, copyZoneOf, humanBytes, setupCheck, setupEntryCard, } from './pageParts.js';
import type { SetupRowInput } from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { SetupStatus } from './status.js';

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
      + (i === 0 ? ' · 最新的一份 · 就是它' : ' · 备份目录里这一份'),
    ...(i === 0 ? { pay: true, star: true } : {}),
  }));
  const head = latest === undefined
    ? { title: '还没有备份', sub: input.scene.subtitle, eyebrow: '还没有 · 空列表', value: '0', unit: '份', note: '备份目录里还没有东西', time: '' }
    : {
      title: '一共 ' + String(entries.length) + ' 份备份，最新的是它',
      sub: input.scene.subtitle,
      eyebrow: '查到了 · 列表正常',
      value: String(entries.length),
      unit: '份',
      note: '备份份数，每次备份新存一份',
      time: latest.time + ' 最新',
    };
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, head.title, head.sub)
    + ticketSummary(renderSummaryHead({
      eyebrow: head.eyebrow, value: head.value, unit: head.unit, note: head.note, layout: 'ticket',
    }), head.time === '' ? '' : '<p class="ilife-ticket-summary-time">' + head.time + '</p>')
    + ticketRule()
    + ticketSection({ title: '备份清单', tag: '01', content: setupEntryCard(rows) })
    + ticketRule()
    + ticketSection({
      title: '落点',
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: '合计', value: humanBytes(totalBytes(entries)) },
          { label: '唤醒词', value: wakeOf(input.key, 'backup-list') },
        ],
        layout: 'ticket',
      }) + setupCheck('要用哪份，说「恢复备份」时点它的名就行。'),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_READ, detail: '查到 ' + String(entries.length) + ' 份备份', actionAt: input.actionAt,
    }));
}

/** 初始化状态：三项判定逐条一行，落点报库／口径／唤醒词。 */
function statusBody(input: StatusDocInput): string {
  const s = input.status;
  const ready = s.ready;
  const rows: readonly SetupRowInput[] = [
    { no: '1', text: '数据在 · ' + (ready ? '已就绪' : '没就绪'), sub: '库文件在，不会丢', tone: ready ? 'done' : 'bad' },
    { no: '2', text: '结构 · ' + s.version, sub: '十列齐，是当前版本', tone: ready ? 'done' : 'bad' },
    { no: '3', text: '记录能数 · 已数过', sub: '共多少条，看本页大数字', tone: ready ? 'done' : 'bad' },
  ];
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, ready ? '已经就绪，可以记账了' : '还没就绪，先跑一遍初始化', input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: ready ? '已就绪 · READY' : '未就绪 · 待初始化',
      value: String(s.rows),
      unit: '条',
      note: ready ? '库里现有记录，一条不少' : '库里现有记录，先把它数清',
      layout: 'ticket',
    }), '')
    + ticketRule()
    + ticketSection({ title: '三项检查', tag: '01', content: setupEntryCard(rows) })
    + ticketRule()
    + ticketSection({
      title: '落点',
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: '库', value: ready ? '在' : '不在' },
          { label: '口径', value: String(s.columns.length) + ' 列（含 deleted_at）' },
          { label: '唤醒词', value: wakeOf(input.key, 'init-status') },
        ],
        layout: 'ticket',
      }) + setupCheck(ready
        ? '三项都通过：库在、表对、能数清。条数看本页大数字。'
        : '三项没全过：先跟助手说一遍「初始化」，把库补好再看这一页。'),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_READ, detail: '读了库结构与 ' + String(s.rows) + ' 条记录', actionAt: input.actionAt,
    }));
}

/** 记录列表／状态页：一整页（票据纸）。 */
export function listDoc(input: ListDocInput): string {
  const paper = input.op === 'backup-list' ? backupListBody(input) : statusBody(input);
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·' + input.scene.title, bodyHtml: content, paper: 'detail' });
}
