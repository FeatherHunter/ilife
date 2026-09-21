/** 心愿域 · **命令的运行件**（票 #855：域逻辑搬回本域，出口只查表调用）。
 *
 * 本件是 `memo.wish` 一条命令的处理函数，逐字从 `src/cli/cmd_read.ts` 的 `case 'memo.wish'` 搬来
 * （#665 起的三支：`wizard:plan` 出排期向导页／`wizard:complete` 出完成向导页／不带即老形状只回列表）。
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 *
 * #829 起三支各自的**产物**补齐（册子 `BOOKLET_ROWS` seq 19／32／33 三格）：
 *   - 不带 `wizard` 那支是 HELP 场景 `memo_wish_schedule` 的**结果页**（主体 `心愿排期`，键＝`memo.wish`）；
 *   - 两条向导是同一批场景的**过程页**（主体 `心愿排期-向导`／`完成心愿-向导`）——册子里同场景两格，
 *     故取名一律经 `buildWishReceipt` 带 `kind`，本件不自己拼名字。
 * 代价：`memo.wish` 的 envelope 仍是 `list` 形，`data` 那半边一字不改（只多 `deliver`）。
 *
 * 层内依赖：直接 import 本域的实现件（`./wizards.js`／`./due.js`／`./receipt.js`）——**域内不走门**。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { toRows } from '../shared/rows.js';
import type { MemoDb } from '../db/readonly.js';
import { listNotes } from '../db/readonly.js';
import { pageEnvelope, wishPlanSnapshot, wishCompleteSnapshot } from '../render/index.js';
import { dueMatches, normalizeDue } from './due.js';
import { planWizard, completeWizard } from './wizards.js';
import { buildWishReceipt } from './receipt.js';

/** `memo.wish`：排期结果页（缺省）／排期向导（`wizard:plan`）／完成向导（`wizard:complete`）。 */
export function runWish(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // #665 向导：`wizard: plan` 出排期向导页（默认全勾选），`wizard: complete` 出完成向导页（默认不勾选）；
  // 不带即老形状（只回列表，#661 行为）。
  if (params.wizard === 'plan' || params.wizard === 'complete') {
    if (params.wizard === 'plan') {
      const w = planWizard(db, { ids: params.ids, all: params.all, suggestDue: params.suggestDue });
      const snap = wishPlanSnapshot(toRows(w.items), w.suggestDue, w.includeAll);
      const message = '找到 ' + w.items.length + ' 个心愿' + (w.includeAll ? '（含已排期）' : '（仅未排期）');
      const payload = pageEnvelope({
        commandCn: '心愿排期', wakeWord: '心愿排期', sceneId: 'wish-batch-plan',
        title: snap.title, summary: snap.summary, sections: snap.sections,
        copyLog: {
          thinking: '过程型向导 · 只读收集心愿列表，勾选＋填排期后复制指令回 AI（HTML 不写库）',
          data_structure: "notes 表（category='心愿'）· id/content/category/sub_category/due/feishu_task_guid",
          call_chain: 'memo.wish wizard:plan → render_wish_plan → 共享 filler',
          exception: '无',
        },
        extra: { items: w.items, suggest_due: w.suggestDue, all: w.includeAll },
        message,
      });
      return {
        data: { items: w.items, total: w.items.length, suggestDue: w.suggestDue, all: w.includeAll },
        exit: 0,
        deliver: buildWishReceipt({
          scene: 'memo_wish_schedule', title: '心愿排期',
          receipt: { ok: true, message, local: 'checked', remote: 'not-applicable', remoteId: null },
          page: { kind: '过程页', template: 'wish_plan', values: payload },
        }),
      };
    }
    const w = completeWizard(db, { ids: params.ids, onlyOverdue: params.onlyOverdue, all: params.all, content: params.content });
    const snap = wishCompleteSnapshot(toRows(w.items));
    const message = '找到 ' + w.items.length + ' 个心愿' + (w.onlyOverdue ? '（仅未排期＋已过期）' : '');
    const payload = pageEnvelope({
      commandCn: '心愿完成', wakeWord: '完成心愿', sceneId: 'wish-complete',
      title: snap.title, summary: snap.summary, sections: snap.sections,
      copyLog: {
        thinking: '过程型向导 · 勾选＋填打卡内容后复制指令回 AI（completeWish 原子转换）',
        data_structure: "notes 表（category='心愿'）· id/content/due/feishu_task_guid",
        call_chain: 'memo.wish wizard:complete → render_wish_complete → 共享 filler',
        exception: '无',
      },
      extra: { items: w.items, default_content: w.defaultContent, only_overdue: w.onlyOverdue },
      message,
    });
    return {
      data: { items: w.items, total: w.items.length, defaultContent: w.defaultContent, onlyOverdue: w.onlyOverdue },
      exit: 0,
      deliver: buildWishReceipt({
        scene: 'memo_complete_wish', title: '完成心愿',
        receipt: { ok: true, message, local: 'checked', remote: 'not-applicable', remoteId: null },
        page: { kind: '过程页', template: 'wish_complete', values: payload },
      }),
    };
  }
  // #829 结果页：HELP 场景 `memo_wish_schedule` 的交付物（主体 `心愿排期`，册子 seq 19）。
  // 数据那一格仍是老形状（心愿清单列表，`memo.wish` 的 envelope 是 `list`）；页里把「这批心愿的排期现状」
  // 铺成事实条＋逐条明细，让「心愿排期」这一格点得开。
  const items = listNotes(db).filter((n) => n.category === '心愿').filter((n) => dueMatches(n, params));
  const due = normalizeDue(params.due);
  const scheduled = items.filter((n) => n.due !== null).length;
  const message = '找到 ' + items.length + ' 个心愿，其中 ' + scheduled + ' 个已排期';
  return {
    data: { items, total: items.length },
    exit: 0,
    deliver: buildWishReceipt({
      scene: 'memo_wish_schedule',
      title: '心愿排期',
      receipt: { ok: true, message, local: 'checked', remote: 'not-applicable', remoteId: null },
      entityLabel: '心愿清单',
      entityId: items.length,
      extraSummary: [
        '心愿 ' + items.length + ' 个',
        '已排期 ' + scheduled + ' 个',
        '未排期 ' + (items.length - scheduled) + ' 个',
        ...(due === null ? [] : ['这一趟排期至 ' + due]),
      ],
      extraSections: [{
        heading: '心愿清单',
        rows: items.map((n) => '#' + n.id + ' ' + n.content + '：' + (n.due === null ? '未排期' : n.due)),
      }],
    }),
  };
}
