/** 「列表查询」页族（#828 首建）—— 本族的**唯一定义地**。
 *
 * 族归属出处：`src/help/booklet.ts` 的 `BOOKLET_ROWS`（34 格里本族占 9 格：搜索 5 ＋ 提醒 2 ＋ 单条详情 1 ＋ 别名 1）。
 * `t822-册子冻结.md` §四对本族的约束：**只参数化标题与字段，不单独设计**。所以本件只给
 * 「一份页壳 ＋ 一份槽位契约」，各场景只填槽位、不各写布局。
 *
 * 与 `pages.ts`／`receipt.ts` 的分工：`pages.ts` 管各族的 snapshot（`querySnapshot` 等纯函数），
 * `receipt.ts` 管回执族整页组装，本件管列表查询族整页组装；三边都只调共用件
 * （`fillMemoPage`／`pageEnvelope`），不各立第二份填充机制。
 *
 * 落盘名只经 `bookletFileStem(sceneId)` 取，本件**不自己拼名字**。
 */
import { bookletFileStem } from '../help/booklet.js';
import { pageEnvelope, fillMemoPage, type PageSnapshot, type PageCopyLog } from './pages.js';
import { toRows, type PageRow } from '../shared/rows.js';

/** 本族的场景 id（`src/help/scenes/*.ts` 的 HELP 场景，须真在册子里）。
 *  9 格全列在此：册子 seq 7–13 与 16–17；各域拿 `satisfies readonly ListPageScene[]` 收自己的子集。 */
export type ListPageScene =
  | 'memo_search_keyword'
  | 'memo_search_alias'
  | 'memo_get_detail'
  | 'memo_search_by_date'
  | 'memo_search_wish'
  | 'memo_search_checkin'
  | 'memo_search_mood'
  | 'memo_reminders_active'
  | 'memo_completed_reminders';

export interface ListPageInput {
  readonly scene: ListPageScene;
  /** 页题（清单一处取：场景主名）。 */
  readonly title: string;
  /** 页内标题旁那句话（如「共 3 条有效期内的提醒」）。 */
  readonly subtitle: string;
  /** 事实条（≤4 条，只放这一次的读数）。 */
  readonly summary: readonly string[];
  readonly sections: PageSnapshot['sections'];
  readonly copyLog: PageCopyLog;
  /** 查询结果的行（原样交给页内筛选与复制区；`memo_query` 读 `payload.data.items`）。 */
  readonly items: readonly object[];
}

/** 整页组装：槽位 → 信封（`pageEnvelope`）→ 模板填充（`fillMemoPage`）＋ 文件名主体（册子唯一定义）。
 *
 *  `memo_query` 模板读的是 `payload.data` 下的 `items`／`meta`／`generated_at`（见模板 `dataRows()`／`snapshotText()`），
 *  故 `items` 由 `extra` 平铺进 `data`；`scene.snapshot` 同时留给页内文本摘要链（与 `wish_plan` 同形）。
 *  库侧落盘由出口的 `deliver` 钩子交给共用件 `base-paint/save-html`（时间戳与独占递补都在那儿）。 */
export function buildListPage(input: ListPageInput): { html: string; stem: string } {
  const payload = pageEnvelope({
    commandCn: input.title,
    wakeWord: input.title,
    sceneId: input.scene,
    title: input.title,
    summary: [...input.summary],
    sections: [...input.sections],
    copyLog: input.copyLog,
    extra: { items: toRows(input.items), subtitle: input.subtitle },
    message: input.subtitle,
  });
  return { html: fillMemoPage('memo_query', payload), stem: bookletFileStem(input.scene) };
}

/** 快照 → 槽位的直通：各族 snapshot 件已经把「读什么数」定死了，本件不再重算一遍。 */
export function listSectionsOf(snapshot: PageSnapshot): PageSnapshot['sections'] {
  return [...snapshot.sections];
}

export type { PageRow };
