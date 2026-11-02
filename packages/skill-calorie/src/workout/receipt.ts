/** 健身计划（HELP 场景 05「健身计划」）· 写后回执整页装配（T351 视觉修复·实施兵B）。
 *
 * 10 条会改数据库的命令按命令名认领整页回执；其余命令一律返回 null（调用方原样放行）。
 * 形状照抄饮食 `src/diet/receipt.ts`（同一份 `assembleDocPage`、同一组 `copyLog`／
 * `statusCard`／`reconcileDisclosure`），只换内容：老实物 `crud_receipt.html` 的
 * 标识卡＋差异卡落点为状态卡＋改动对照表，M5 四要素（记录编号／写入时间／影响行数／
 * 写入字段）全部上页；操作名一律中文，不出现 `op=` 裸词与 `# 成功 ·` 前缀。
 * 底部复制区与场景 05 各页同形（共用件 `./planCopyBlock.js` 的冻结双按钮，
 * 不出三格式菜单）。必须在 `withM5` 之后调用（见 `src/cli/write.ts`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getPlan } from './planStore.js';
import { assembleDocPage } from '../shared/docPage.js';
import { pageChromeCss } from '../render/pageChromeCss.js';
import { planCopyBlock } from './planCopyBlock.js';
import { copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';
import { workoutFieldLabel } from './fieldLabels.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = (): string => m('skill-calorie.workout-receipt.c027');

/** 训练计划 10 条会改数据库的命令（具名键集；分派层只调本文件，不再写命令名字面量比较）。 */
const WORKOUT_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.workout.plan-set',
  'calorie.workout.plan-copy',
  'calorie.workout.plan-set-week',
  'calorie.workout.plan-add-movement',
  'calorie.workout.plan-set-rest',
  'calorie.workout.plan-update',
  'calorie.workout.plan-update-day',
  'calorie.workout.plan-delete-day',
  'calorie.workout.plan-update-movement',
  'calorie.workout.plan-delete',
]);

/** 「状态」卡副行（写入去向）的兜底措辞：10 条写命令里那 9 条增改类说「已写入训练计划」都贴切；
 *  唯独撤销整份计划（`plan-delete`）落库后这份计划已经不在库里——同一页别处写着「已撤销训练计划「…」／
 *  已删除（硬，不可恢复）」，兜底再说「已写入」就是同一页对同一动作自相矛盾（#435 第 1 条）。
 *  故按命令键派生：撤销类给一条自己的写法，其余 9 条取值一个字不动。 */
const WRITTEN_DETAIL_FALLBACK = (): string => m('skill-calorie.workout-receipt.c028');
const WRITTEN_DETAIL_BY_KEY = (): ReadonlyMap<string, string> => new Map([
  ['calorie.workout.plan-delete', m('skill-calorie.workout-receipt.c029')],
]);

/** 本命令「状态」卡副行的取值：具名键用表里的，其余一律走兜底。 */
function writtenDetailOf(key: string): string {
  return WRITTEN_DETAIL_BY_KEY().get(key) ?? WRITTEN_DETAIL_FALLBACK();
}

/** 写后计划现值（`getPlan` 正本；撤销后为空即明示已撤销，不编数）。 */
function currentPlanTable(db: DatabaseSync): string {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) {
    return renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-receipt.c001') }, { key: 'v', label: m('skill-calorie.workout-receipt.c002') }],
      rows: [{ k: m('skill-calorie.workout-receipt.c003'), v: m('skill-calorie.workout-receipt.c004') }],
      caption: m('skill-calorie.workout-receipt.c005'),
    });
  }
  return renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.workout-receipt.c006') }, { key: 'v', label: m('skill-calorie.workout-receipt.c007') }],
    rows: [
      { k: m('skill-calorie.workout-receipt.c008'), v: String(plan.config?.title ?? m('skill-calorie.workout-receipt.c009')) },
      { k: m('skill-calorie.workout-receipt.c010'), v: m('skill-calorie.workout-receipt.c011', { p0: String(plan.sessions.length) }) },
    ],
    // T351-v11：原来这条表标题写作「写后现值（`getPlan` 现值）」——反引号与内部函数名一起印在页上
    // （负责人 2026-09-15 第 ④ 条：文字不能出现不合理）。现值就是现值，页上不必交代它读的是哪个函数。
    caption: m('skill-calorie.workout-receipt.c012'),
  });
}

/** 老实物差异卡位：回执带对照即摆对照，否则只摆写入字段。
 *  T351-v10：原来「原因 · 结果」是拿 `·` 把两件事串进一格（第 ⑤ 条），现在拆成两列；
 *  一条原因都没有时不摆空的「原因」列（整列「—」是噪声）。 */
function itemsTable(receipt: CrudReceipt): string {
  const rows = receipt.items
    .filter((it) => (it.status ?? '') !== '')
    .map((it) => ({
      field: it.detail && it.detail !== '' ? it.detail : it.status,
      reason: it.reason ?? '',
      change: it.status ?? '',
    }));
  const hasReason = rows.some((r) => r.reason !== '');
  const columns = [
    { key: 'field', label: m('skill-calorie.workout-receipt.c013') },
    ...(hasReason ? [{ key: 'reason', label: m('skill-calorie.workout-receipt.c014') }] : []),
    { key: 'change', label: m('skill-calorie.workout-receipt.c015') },
  ];
  const fieldsText = listJoin(currentRenderLanguage(), receipt.writtenFields) || m('skill-calorie.workout-receipt.c016');
  return renderDataTable({
    columns,
    rows: hasReason ? rows : rows.map((r) => ({ ...r, reason: '—' })),
    caption: m('skill-calorie.workout-receipt.c017'),
    emptyText: m('skill-calorie.workout-receipt.c018', { p0: String(fieldsText) }),
  });
}

function buildWorkoutReceiptDoc(
  db: DatabaseSync, key: string, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf(key)),
      { label: m('skill-calorie.workout-receipt.c019'), value: m('skill-calorie.workout-receipt.c020', { p0: String(receipt.affectedRows) }), detail: m('skill-calorie.workout-receipt.c021') },
      {
        label: m('skill-calorie.workout-receipt.c022'),
        value: m('skill-calorie.workout-receipt.c023', { p0: String(receipt.writtenFields.length) }),
        // 原键名走域标签表（`./fieldLabels.ts`，本域表唯一定义地）：页上不出 `plan` 这类英文裸词。
        detail: listJoin(currentRenderLanguage(), receipt.writtenFields.map((f) => workoutFieldLabel(f))) || m('skill-calorie.workout-receipt.c024'),
      },
    ]),
    currentPlanTable(db),
    itemsTable(receipt),
    reconcileDisclosure(receipt),
    planCopyBlock({
      envelope,
      log: copyLog({
        command, source: receipt.meta.source, m5Line: receipt.m5Line,
        actionAt: receipt.meta.actionAt, version: DOC_VERSION,
      }),
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-receipt.c025'),
    eyebrow: m('skill-calorie.workout-receipt.c026'),
    // 副标题只留一件事：这一页是哪一条写命令的回执（「定训练计划」）。**这次写成了什么**由下面那张
    // 状态卡说（`receipt.summary`，例如「已定训练计划：1 周 1 场」）——原来两处都印同一句，读两遍。
    subtitle: receipt.scene,
    content: pageChromeCss(960) + content,
    pageUi: true,
  });
}

/** 训练计划 10 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function workoutReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!WORKOUT_RECEIPT_KEYS.has(key)) return null;
  return buildWorkoutReceiptDoc(db, key, params, receipt, commandLine(key, params));
}
