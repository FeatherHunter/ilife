/** #179 · 「改资料」：改档案的写后回执页（改前→改后对照）。
 *
 * 对外 1 件：`buildProfileUpdateReceiptDoc`。与 `setup.ts` 的两条回执页（设置档案／设活动量）
 * 逐字比对过：那一页出「摘要 ＋ 写入字段」，本页多一整块**逐字段 改前→改后 对照区**
 * （吃 `CrudReceipt.items`；回执没带对照时不编数据，只提示）。渲染分支不同，故不合并
 * （设计 §八 第 3 条的裁法；若日后两条写命令的回执也带逐字段对照，这两页应当合并）。
 *
 * 写前页不在这里：三条写入词共用的一页住同目录 `setup.ts`，改档案直接取用
 * （设计 §一：同一件事只留一处定义，铁律五不另起转手件）。
 */
import { renderDataTable, renderKpiGrid, renderPreBlock } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·档案预检';

/** items 里逐字段对照：`status`＝字段名，`reason`＝「改前 → 改后」（回执带不出对照时为空表）。 */
function diffRows(receipt: CrudReceipt): { field: string; change: string }[] {
  return receipt.items
    .filter((it) => it.status !== '')
    .map((it) => ({ field: it.status, change: it.reason === '' ? (it.detail ?? '—') : it.reason }));
}

/** 改档案写后回执整页：摘要 ＋ 逐字段 改前→改后 ＋ 写入字段 ＋ M5 整行。
 *  `command` ＝ AI 真跑那条写命令的原文（`cli/write.ts` 从分派处传进来），进「复制日志」第 4 段。 */
export function buildProfileUpdateReceiptDoc(receipt: CrudReceipt, command: string): string {
  const rows = diffRows(receipt);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      { label: '动作', value: receipt.scene, detail: 'op=' + receipt.op },
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: receipt.affectedRowsSource },
      { label: '改动字段', value: rows.length + ' 项', detail: receipt.writtenFields.join('、') || '—' },
      { label: '无变化', value: receipt.noChange ? '是' : '否', detail: receipt.noChange ? '值与改前一致' : '' },
    ]),
    renderDataTable({
      columns: [{ key: 'field', label: '字段' }, { key: 'change', label: '改前 → 改后' }],
      rows,
      caption: '改档案 5 项：改前 → 改后对照',
      emptyText: '本次回执未带逐字段对照（写入字段：' + (receipt.writtenFields.join('、') || '—') + '）',
    }),
    renderPreBlock({ label: 'M5 整行（旧版等价物）', command: receipt.m5Line }),
    copyArea({
      title: '复制数据',
      data: { envelope },
      // #247：改档案回执页先开三格式菜单（场景 07 五张页之一）。
      dataFormats: true,
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
    eyebrow: '基础信息 · 写后回执（M5 契约 v' + receipt.m5Contract + '，改前→改后对照）',
    subtitle: receipt.summary,
    content,
  });
}
