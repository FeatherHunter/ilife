// 口径层·唤醒词路由（M3）：查询类 + 写入类 ＋ #850 两新键（`memo.init`／`memo.reminder`）；最长匹配；批量改分类向导与改子分类按“批量”消歧；无命中/缺槽位 throw。
// #855：本件原来手写的 `MemoKey` 键联合与 `WakeRoute` 路由形状**两份副本已删**（铁律二：同一件事两处定义）——
// 键的唯一一份是生成物 `src/cli/keys.js` 的 `MemoKey`（`routing.ts` 也取那一份），路由形状的唯一一份是 `./routeSpec.js`。
import type { MemoKey } from '../cli/keys.js';
import { WAKE_TOPS } from '../memo/index.js';

export type { MemoKey };

export interface WakeEntry { phrase: string; key: MemoKey; needs?: string[]; preset?: Record<string, unknown>; }

// 全量唤醒词表（HELP 速查唯一上游；改这里，HELP 构建期跟进）。
// #850（命令面四问实施）：`按时间搜备忘` 改认 HELP 的 `start`＋`end`（`timeRange` 退役，无权威出处）；
// `设提醒` 改指新写命令 `memo.reminder`（`memo.create` 的两步合一不动）；新增 `首次使用`→`memo.init`、
// `删备忘`→`memo.remove`（`删心愿／删打卡／删情绪日记` 三族同步改指真删，修危险缺陷）。
// #832（sync 域）：新增 `备忘录同步`→`memo.sync`（`memo.sync` 的键与实现自 #665 就在，缺的只是词）。
export const WAKE_TABLE: WakeEntry[] = [
  { phrase: '首次使用', key: 'memo.init' },
  { phrase: '删备忘', key: 'memo.remove', needs: ['id'] },
  { phrase: '按时间搜备忘', key: 'memo.search', needs: ['start', 'end'] },
  { phrase: '查已提醒备忘', key: 'memo.remind', preset: { done: false } },
  { phrase: '批量改分类', key: 'memo.batch' },
  { phrase: '改子分类', key: 'memo.update', needs: ['id'] },
  { phrase: '搜备忘', key: 'memo.search' },
  { phrase: '查备忘', key: 'memo.search' },
  { phrase: '看备忘', key: 'memo.detail', needs: ['id'] },
  { phrase: '看提醒', key: 'memo.remind' },
  { phrase: '查提醒', key: 'memo.remind' },
  { phrase: '设提醒', key: 'memo.reminder', needs: ['remind_at'] },
  { phrase: '记提醒', key: 'memo.create', needs: ['remindAt'] },
  { phrase: '废弃提醒', key: 'memo.remove', preset: { mode: 'abandon' } },
  { phrase: '完成心愿', key: 'memo.update', preset: { done: true } },
  { phrase: '心愿排期', key: 'memo.wish' },
  { phrase: '记一条', key: 'memo.create' },
  { phrase: '添加笔记', key: 'memo.create' },
  // #832（sync 域）：HELP 官方源 `memo_sync_feishu` 的唯一唤醒词 `备忘录同步` → `memo.sync`。
  // 本行此前缺失，本域在路由表里等于空（命令在、词不在）——这是本域 1 场景走通的第一块。
  { phrase: '备忘录同步', key: 'memo.sync' },
];
// 注（#760）：「飞书授权」唤醒词随授权三支退役（定稿 #759：授权交由复制安装指引那段 prompt）。
// `memo.auth` 键保留给只读诊断（`status`／`diag`），故 `MemoKey` 与分派里的分支不动，只是不再有唤醒短语。

for (const [p, top] of Object.entries(WAKE_TOPS)) {
  const verb = p[0];
  if (verb === '记') WAKE_TABLE.push({ phrase: p, key: 'memo.create', preset: { category: top } });
  else if (verb === '查') WAKE_TABLE.push({ phrase: p, key: p === '查心愿' ? 'memo.wish' : 'memo.search', preset: { category: top } });
  // #850：`删心愿／删打卡／删情绪日记` 改指真删 `memo.remove`（此前误指 `memo.update` 只改分类不删，
  // 票面危险缺陷；`改心愿／改打卡／改情绪日记` 仍走 `memo.update`）。
  else if (verb === '删') WAKE_TABLE.push({ phrase: p, key: 'memo.remove', needs: ['id'], preset: { category: top } });
  else WAKE_TABLE.push({ phrase: p, key: 'memo.update', needs: ['id'], preset: { category: top } });
}

// #855 · 运行期路由已搬到 `src/triggers/routing.ts`（读生成物 `WAKE_ROUTES`）。
// 本件保留 `WAKE_TABLE` 手写表——它是 HELP 速查（`src/help/lookup.ts` → SKILL.md）的上游，
// 其清理（别名退总表、`废弃提醒` 撤行、`memo.stats` 相关）归 #858；本票不动它，只加一道防漂移断言
// （`test/route-table-parity-855.test.mjs`：旧表每行 ⊆ 生成表，语义逐字一致）。
// 最长匹配优先，保证“批量改分类”不落入“改子分类”。
export { routeWakeword } from '../triggers/routing.js';
export type { ResolvedRoute } from '../triggers/routing.js';
