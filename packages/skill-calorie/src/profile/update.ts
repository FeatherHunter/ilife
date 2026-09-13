/** #179 · 「改资料」：改档案的写后回执页（改前→改后对照）。
 *
 * 对外 1 件：`buildProfileUpdateReceiptDoc`。与 `setup.ts` 的两条回执页（设置档案／设活动量）
 * 逐字比对过：那一页出「摘要 ＋ 写入字段」，本页多一整块**逐字段 改前→改后 对照区**
 * （吃 `CrudReceipt.items`；回执没带对照时不编数据，只提示）。渲染分支不同，故不合并
 * （设计 §八 第 3 条的裁法；若日后两条写命令的回执也带逐字段对照，这两页应当合并）。
 *
 * #238 返修：与另两张回执摆法统一——首卡承接原来那张「无变化／否」的双重否定卡，改成一句状态
 * （`setup.ts` 的 `statusCard`）；字段名与整句里的英文枚举走同目录 `labels.ts` 翻中文（`items` 本身
 * 是数据，逐字照旧）；页尾那个 `M5 整行（旧版等价物）` 代码块收进「对账信息」折叠区
 * （`setup.ts` 的 `reconcileDisclosure`），眉标与副标题里不再出现版本号与内部行文本。
 *
 * 写前页不在这里：三条写入词共用的一页住同目录 `setup.ts`，改档案直接取用
 * （设计 §一：同一件事只留一处定义，铁律五不另起转手件）。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { fieldLabel, localizeEnums } from './labels.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { PROFILE_WRITTEN_DETAIL } from './setup.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·档案预检';

/** 一格对照值：英文枚举翻中文；「改前没有值」也写成与页面其它地方同一个词。 */
function diffCell(raw: string): string {
  const text = localizeEnums(raw.trim());
  return text === '—' ? '未设置' : text;
}

/** items 里逐字段对照：`status`＝字段名，`reason`＝「改前 → 改后」（回执带不出对照时为空表）。
 *  字段名与两侧取值都只在这里翻中文，`receipt.items` 这份数据一字不动。 */
function diffRows(receipt: CrudReceipt): { field: string; change: string }[] {
  return receipt.items
    .filter((it) => it.status !== '')
    .map((it) => ({
      field: fieldLabel(it.status),
      change: (it.reason === '' ? (it.detail ?? '—') : it.reason).split('→').map(diffCell).join(' → '),
    }));
}

/** 改档案写后回执整页：状态 ＋ 逐字段 改前→改后 ＋ 写入字段 ＋ 对账信息。
 *  `command` ＝ AI 真跑那条写命令的原文（`cli/write.ts` 从分派处传进来），进「复制日志」第 4 段。 */
export function buildProfileUpdateReceiptDoc(receipt: CrudReceipt, command: string): string {
  const rows = diffRows(receipt);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, PROFILE_WRITTEN_DETAIL),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '改动字段',
        value: rows.length + ' 项',
        detail: receipt.writtenFields.map(fieldLabel).join('、') || '未设置',
      },
    ]),
    renderDataTable({
      columns: [{ key: 'field', label: '字段' }, { key: 'change', label: '改前 → 改后' }],
      rows,
      caption: '改档案 5 项：改前 → 改后对照',
      emptyText: '本次回执未带逐字段对照（写入字段：'
        + (receipt.writtenFields.map(fieldLabel).join('、') || '未设置') + '）',
    }),
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '基础信息 · 写后回执',
    subtitle: localizeEnums(receipt.summary),
    content,
  });
}
