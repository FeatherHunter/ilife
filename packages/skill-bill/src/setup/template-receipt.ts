/** 开始使用域模板之一 · **结果回执页型**（一键备份）——票据纸版（#1080 落地）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  盖住的场景：一键备份（`./scene-backup-create.js`）。
 *
 * 判地（唯一）：`docs/skills/skill-bill/proto/setup-help/s03-备份-一键备份-v2.4.html`
 *  （#1078 verdict seq20 satisfied，sha256 `ee9fcd94…`）。版式＝票据纸八件套：
 *   店头（`饼干记账 · 一键备份` ＋ 结论句 ＋ 副题）→ 主数字（印章 `已存好` ＋ 眉标 `备份完成 · BACKUP OK`
 *   ＋ 大数字 ＋ 注 ＋ 时刻）→ 落点 LEDGER 三行 → 对账小结行 → 复制区（只数据／日志两钮，无主按钮）
 *   → 裁切线。
 *
 * 与老页（`#688` 那版读数格＋明细表）的关系：**版式换掉，载荷与口径一字不动**——出口
 *  `data = { ok, message, receipt }` 由 `./run.js` 装配，本件只出 HTML；`env.data.*` 的键、值、条数不动。
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
  SOURCE_WRITE, copyZoneOf, humanBytes, setupCheck, } from './pageParts.js';
import type { SetupScene } from './scene.js';

/** 回执页的入参：这一页是谁 ＋ 造出来的那一份备份 ＋ 取数。 */
export interface ReceiptDocInput {
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  /** 这一份备份的事实（`./backups.js` 造完读回来的那一件）。 */
  readonly entry: BackupEntry;
  /** 备份目录里一共几份（造完这一份之后）。 */
  readonly total: number;
  readonly envelope: SerializableEnvelope;
}

/** 这一页的唤醒词（**不写死**：按 key ＋ op 从域声明算，t721 的判据）。 */
function wakeOf(key: string, op: 'init' | 'init-status' | 'backup-create' | 'backup-list' | 'restore' | 'import'): string {
  return projectWakeWord({ key: key as BillKey, op });
}

/** 主数字那一格：字节数拆成「数 ＋ 单位」（原型 `20.0` ＋ `KB` 两槽）。 */
function sizeParts(bytes: number): { readonly value: string; readonly unit: string } {
  const text = humanBytes(bytes);
  const m = /^([0-9.]+)\s*(.*)$/.exec(text);
  return m === null ? { value: text, unit: '' } : { value: m[1] as string, unit: (m[2] as string) };
}

/** 目标那一份的两种写法（原型逐字：`约 0.5 KB，484 B`）。 */
function goalsText(entry: BackupEntry): string {
  if (!entry.hasGoals) return '这次没有目标那一份可存';
  return '约 ' + (entry.goalsBytes / 1024).toFixed(1) + ' KB，' + humanBytes(entry.goalsBytes);
}

/** 结果回执页：一整页（票据纸）。 */
export function backupReceiptDoc(input: ReceiptDocInput): string {
  const e = input.entry;
  const size = sizeParts(e.bytes);
  const paper = ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, '备份成功，已存好', input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: '备份完成 · BACKUP OK',
      value: size.value,
      unit: size.unit,
      note: '库大小 ' + humanBytes(e.bytes) + '（目标那一份另计' + goalsText(e) + '；合计见查看备份）',
      stamp: { text: '已存好', tone: 'ok' },
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-time">' + e.time + '</p>')
    + ticketRule()
    + ticketSection({
      title: '备份详情',
      tag: '01',
      content: renderLedgerRows({
        rows: [
          { label: '备份文件', value: e.file },
          { label: '目标', value: e.hasGoals ? 'goals.json 已存好' : '这次没有' },
          { label: '唤醒词', value: wakeOf(input.key, 'backup-create') },
        ],
        layout: 'ticket',
        extraClass: 'is-mono-first',
      }) + setupCheck('想要回到今天这一步，拿这份备份说一遍「恢复备份」。文件名里的时间就是备份时间。'),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: '备份 ' + e.file + '（' + String(e.bytes) + ' 字节）', actionAt: input.actionAt,
    }));
  const content = writeSection({
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·' + input.scene.title, bodyHtml: content, paper: 'receipt' });
}
