/** 备忘域 · **通用回执页的装配件**（票 #829）：`memo.create`／`memo.update`／`memo.remove`
 *  非心愿／非情绪那几支走的仍是本域这一条；页壳与版式一律交给族定义地 `src/render/receipt.ts`。
 *
 *  为什么从 `run.ts` 拆出来：`run.ts` 在 #829 补两块回执接线后涨到 367 LF（超 350 告警线），
 *  而行数门的医嘱正是「要加内容就加在它自己域的能力目录里」——分派与页装配本就是两件活。
 *  拆法照 `docs/skills/skill-memo-ilife/t855-实施规格-与开工前读数.md` §十七：**只搬不改口径**。
 *
 *  铁律二：`LOCAL_LABEL`／`REMOTE_LABEL` 两张取值→人话的表住族定义地 `render/receipt.ts`，
 *  本件只做「回执 → 槽位」的翻译，不重算那两张表。
 */
import type { ReceiptScene } from '../render/receipt.js';
import { buildReceiptPage } from '../render/receipt.js';
import { normalizeTop } from './category.js';
import type { WishReceipt } from '../wish/index.js';

/** #831 · 从写侧回执里取笔记 id：写侧两种说法都以「：id」结尾（`已记一条：7`／`已存在这条心愿（未新建）：7`）。
 *  取不到即 null（调用方按「未新建」出页，不猜一个号）。 */
export function noteIdOfMessage(message: string): number | null {
  const m = /(\d+)\D*$/.exec(message);
  const n = m === null ? NaN : Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** #831 · 回执页的槽位：对象行 ／ 分类徽章 ／ 事实条 —— **从 notes 表那一行取**（不照抄入参）。 */
export function receiptOptsOf(note: { id: number; category: string; sub_category: string | null; content: string }): {
  entityLabel: string;
  entityId: number;
  category: string;
  sub: string | null;
  summary: string[];
} {
  return {
    entityLabel: note.category,
    entityId: note.id,
    category: note.category,
    sub: note.sub_category,
    summary: [
      '笔记 ID ' + note.id,
      '正文：' + note.content,
      '分类 ' + note.category + (note.sub_category === null ? '' : '／' + note.sub_category),
    ],
  };
}

/** #831 · 「通用回执」族三格的整页交付（`memo.create`／`memo.update`／`memo.remove`）。
 *
 *  回执数据只有一处来源 —— policy 的顶层分类与写侧回执（`WishReceipt`）本身；本函数只做
 *  「回执 → 本的槽位」的翻译，页面形状一律交给族定义地 `buildReceiptPage`（不在此另立布局）。
 *  命令中文名与唤醒词取自 HELP 的场景主名（`sceneTitle`），与册子主体同名。 */
export function buildReceipt(
  scene: ReceiptScene,
  title: string,
  r: WishReceipt,
  opts: { entityLabel: string; entityId: string | number; category?: unknown; sub?: unknown; summary: string[] },
): { readonly html: string; readonly stem: string } {
  return buildReceiptPage({
    scene,
    title,
    message: r.message,
    badges: { category: normalizeTop(opts.category), sub: opts.sub === undefined || opts.sub === null ? null : String(opts.sub) },
    summary: opts.summary,
    sections: [],
    receipt: { entityLabel: opts.entityLabel, entityId: opts.entityId, local: r.local, remote: r.remote, remoteId: r.remoteId },
    copyLog: {
      thinking: title + ' · 写命令回执渲染为通用回执页（页族定义处 src/render/receipt.ts）',
      data_structure: 'notes／reminders 两表；回执字段 local／remote／remoteId 取自写侧',
      call_chain: 'cmd_read dispatch → ' + scene + ' → buildReceiptPage → fillMemoPage(receipt) → deliver 钩子落盘',
      exception: '无',
    },
    retryPrompt: '若这一页的内容不对，请把要改的那一条（笔记 ID 与要改成的样子）发我，我重跑一次：' + title,
  });
}
