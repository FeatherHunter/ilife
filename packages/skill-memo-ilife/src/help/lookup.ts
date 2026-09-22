// HELP 速查（M6 · #858 换上游）：**各域路由声明**是唯一上游（生成物 `WAKE_ROUTES`）——
// 词随它服务的 HELP 场景住（`src/<域>/routes.ts`），一场景主名一行；**别名只住 HELP 资产的 `aliases`**，
// 不进速查表（#842 Q③）。构建期注入 SKILL.md（`scripts/build-help.mjs`），同一张表也是
// `memo.help.lookup --params '{"mode":"lookup"}'` 那份速查表的载荷。
import type { MemoKey } from '../cli/keys.js';
import { MEMO_KEY_SHAPES } from '../render/index.js';
import { WAKE_ROUTES } from '../triggers/routes.generated.js';
import { MEMO_HELP_GROUPS } from './sceneData.js';

export interface HelpHit { phrase: string; key: MemoKey; shape: string; cli: string; desc: string; }

// 键 → 一句话（HELP 速查表「说明」列）。**键的类型取自生成的 `MemoKey`**：写错一个字编译期就红，
// 不靠人记（#855 复核提的门洞：此处原是手写字符串表，写第二份 `'memo.search': 'list'` 也无人拦）。
// #858：`memo.stats`（聚合统计）整条退役，本表同步撤行。
const DESCS: Partial<Record<MemoKey, string>> = {
  'memo.search': '搜笔记（关键词/CJK 子串，可按分类过滤）',
  'memo.detail': '看单条详情（须 id）',
  'memo.create': '记一条（含记提醒须 remindAt）',
  'memo.update': '更新笔记（须 id；完成心愿走 done）',
  'memo.remove': '删除（须 confirm；废弃提醒走 abandon 留笔记）',
  'memo.remind': '查提醒（含已完成；已废弃走 status=dismissed）',
  'memo.wish': '心愿排期',
  'memo.sync': '飞书同步（须 lark 四门全绿）',
  'memo.batch': '批量改分类向导',
  // #850：两新键一句话（HELP 场景主名唯一上游，命令只做 HELP 承诺的事）。
  'memo.init': '初始化报告（首次使用，只渲染不建库）',
  'memo.reminder': '给已有笔记加提醒（note_id 可选，不给即独立提醒）',
};
// 注（#760）：「飞书授权」唤醒词随授权三支退役，故速查表不再有它这一行；诊断走
// `memo.auth --params '{"step":"status"}'`（只读）或面板「飞书 CLI」状态行。

/** 本件从场景资产只取两件事：场景 id 与它的主名（`wake_word`）。 */
interface SceneCard { readonly id: string; readonly wake_word: string; }

/** 场景 id → 主名（HELP 官方源的 `wake_word`）。 */
function sceneNameById(): Map<string, string> {
  const out = new Map<string, string>();
  for (const g of MEMO_HELP_GROUPS as readonly { readonly subgroups: readonly { readonly scenes: readonly SceneCard[] }[] }[]) {
    for (const sub of g.subgroups) for (const sc of sub.scenes) out.set(sc.id, sc.wake_word);
  }
  return out;
}

/** 速查行＝**一场景主名一行**（#858）。
 *
 *  两条判据，都与运行期路由同源同序（`src/triggers/routing.ts` 读的是同一份生成物）：
 *    ① **主名**：路由记录的词等于它服务场景的主名（`wake_word`）才进表；别名（如 `记一条`／`查提醒`）
 *       与无场景的词（如旧表里那条 `废弃提醒`）天然被这一条筛掉——撤的是**行**，不是词
 *       （别名仍住 HELP 资产的 `aliases`，也仍能被唤醒词路由命中）。
 *    ② **同词多行只留先到那条**：`备忘改分类` 单条与批量共用一词，按声明 `order` 先到先得——
 *       批量那条永远路由不到（与运行期同一个判据），故速查也不许出现两行同词让人猜（#858 用户故事 10）。
 */
export function buildHelpLookup(): HelpHit[] {
  const names = sceneNameById();
  const seen = new Set<string>();
  const rows: (typeof WAKE_ROUTES)[number][] = [];
  // `WAKE_ROUTES` 是生成物，盘上就是按声明 `order` 升序拼出的（生成期 `order` 连续无洞守着的），
  // 故「先到」＝「order 小」；本件不另存一份顺序知识。
  for (const r of WAKE_ROUTES) {
    if (names.get(r.scene) !== r.wakeWord) continue;
    if (seen.has(r.wakeWord)) continue;
    seen.add(r.wakeWord);
    rows.push(r);
  }
  return rows.map((r) => ({
    phrase: r.wakeWord,
    key: r.key,
    shape: MEMO_KEY_SHAPES[r.key] || '??',
    // 「例」列＝路由声明自己那行「照抄即能跑」（同一处事实，不在速查里再拼一遍参数）。
    cli: r.cli,
    desc: DESCS[r.key] || '',
  }));
}

export function lookupWake(hits: HelpHit[], word: string): HelpHit[] {
  return hits.filter((h) => word.includes(h.phrase));
}
