/** 查找域 · **命令的运行件**（票 #855：域逻辑搬回本域，出口只查表调用）。
 *
 * 两条命令逐字从 `src/cli/cmd_read.ts` 的 `case 'memo.search'`／`case 'memo.detail'` 搬来：
 *   - `memo.search`：创建时间区间通道（`start`＋`end` 双必填、倒置报错、按 `created_at` 倒序）＋关键词／分类过滤，
 *     两路都可再叠排期过滤（`dueMatches`）；
 *   - `memo.detail`：单条详情。
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 *
 * 区间参数的三件校验（`needRangeDate`／`rangeLimitOf`／`categoryFilterOf`）只有本域在用，随命令一起搬——不留第二份。
 *
 * ── #827 · 本域的产物（册子 seq 7–13 的 6 格）────────────────────────────────────────────────
 * 一条 `memo.search` 服务 5 个 HELP 场景、`memo.detail` 服务 1 个，而册子给每个场景各冻一格文件；
 * 故本件多两件事：**判这一次是哪一格**（`params.scene` 显式给，缺省按参数推断）与**按格组装列表页**。
 * 页形状不在本件：走「列表查询」族唯一定义地 `src/render/listPage.ts`（#828 首建），本件只填槽位。
 * 文件名主体不在本件：由 `bookletFileStem(sceneId)` 查册子（`src/help/booklet.ts` 是唯一定义地）。
 *
 * `scene` 只收本域这 5 格；给别的格（如 `memo_search_wish`——那条命令属心愿域）即参数错，不静默改判。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { fail } from '../shared/exit.js';
import type { MemoDb } from '../db/readonly.js';
import { getNote, listNotes, searchNotes, searchNotesByCreatedRange } from '../db/readonly.js';
import { needId } from '../shared/validators.js';
import { normalizeTop } from '../memo/index.js';
import { dueMatches } from '../wish/index.js';
import { toRows } from '../shared/rows.js';
import { buildListPage, querySnapshot, type ListPageScene } from '../render/index.js';

// #850 · 创建时间区间参数（HELP `start`＋`end`，双 `YYYY-MM-DD`）。双必填：缺一边即缺槽位（exit 2，
// 人话）；起止倒置即报错；`timeRange` 月份形已退役（无权威出处），给了即指路到 `start`／`end`。
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function needRangeDate(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(2, '缺槽位 ' + name + '：按时间搜备忘须给开始／结束日期（YYYY-MM-DD）');
  const s = (value as string).trim();
  const m = DATE_RE.exec(s);
  if (!m) fail(2, name + ' 只认 YYYY-MM-DD：' + s);
  const dt = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== s) fail(2, name + ' 不是真日期：' + s);
  return s;
}

function rangeLimitOf(value: unknown): number {
  if (value === undefined) return 20;
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isInteger(n) || n <= 0) fail(2, 'limit 须为正整数');
  return n as number;
}

function categoryFilterOf(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return normalizeTop(value);
}

// ── #827 · 「这一次是哪一格」──────────────────────────────────────────────────────────────
//
// 5 格对应 5 个 HELP 场景（`src/help/scenes/search.ts` 的 3 个二级组），每条场景一个唤醒词：
//   搜备忘 → memo_search_keyword ／查备忘 → memo_search_alias ／按时间搜备忘 → memo_search_by_date
//   ／查打卡 → memo_search_checkin ／查情绪 → memo_search_mood。
// 「搜备忘／查备忘」是同一件查询的两个词（HELP 记 `查备忘` 为 `搜备忘` 的别名场景），页形相同、**格不同**；
// 故缺省落主名那一格，别名场景由调用方显式给 `scene`（照提醒域 `memo.remind` 的同一做法）。
const SEARCH_SCENES = [
  'memo_search_keyword',
  'memo_search_alias',
  'memo_search_by_date',
  'memo_search_checkin',
  'memo_search_mood',
] as const satisfies readonly ListPageScene[];
type SearchScene = (typeof SEARCH_SCENES)[number];

/** 本域第 6 格：`memo.detail` 服务的单条详情场景（`scene` 参数不参与——一条命令只此一格）。 */
type DetailScene = 'memo_get_detail';
/** 本域 6 格（5 格查询 ＋ 1 格详情）。 */
type DomainScene = SearchScene | DetailScene;

/** 格 → 页题（一律用 HELP 的场景词，不写内部标识符）。 */
const SCENE_TITLES: Record<DomainScene, string> = {
  memo_search_keyword: '搜备忘',
  memo_search_alias: '查备忘',
  memo_search_by_date: '按时间搜备忘',
  memo_search_checkin: '查打卡',
  memo_search_mood: '查情绪',
  memo_get_detail: '看备忘',
};

/** 显式 `scene` 优先；缺省用本支的老形状那一格。**只认本域 5 格**。 */
function sceneOf(params: Record<string, unknown>, fallback: SearchScene): SearchScene {
  const s = params.scene;
  if (s === undefined || s === '') return fallback;
  if (typeof s === 'string' && (SEARCH_SCENES as readonly string[]).includes(s)) return s as SearchScene;
  fail(2, 'scene 只认本域这 5 格：' + SEARCH_SCENES.join('／'));
}

/** 列表页交付：快照走列表族共用的 `querySnapshot`，页壳与文件名主体全在族定义地与册子。 */
function listDeliver(input: {
  scene: DomainScene;
  items: readonly object[];
  subtitle: string;
  copyLog: { thinking: string; data_structure: string; call_chain: string; exception: string };
}): { html: string; stem: string } {
  const snap = querySnapshot(toRows(input.items));
  return buildListPage({
    scene: input.scene,
    title: SCENE_TITLES[input.scene],
    subtitle: input.subtitle,
    summary: snap.summary,
    sections: snap.sections,
    copyLog: input.copyLog,
    items: input.items,
  });
}

/** 本次生效的过滤条件 → 人话（只写用户给的那个条件的名字与值）。 */
function filterWords(params: Record<string, unknown>): { text: string; scene: SearchScene } {
  const category = params.category === undefined ? '' : String(params.category);
  if (category === '打卡') return { text: '分类「打卡」', scene: 'memo_search_checkin' };
  if (category === '情绪日记') return { text: '分类「情绪日记」', scene: 'memo_search_mood' };
  const bits: string[] = [];
  if (params.q !== undefined && String(params.q) !== '') bits.push('关键词「' + String(params.q) + '」');
  if (category !== '') bits.push('分类「' + category + '」');
  if (params.sub !== undefined && String(params.sub) !== '') bits.push('子分类「' + String(params.sub) + '」');
  if (params.due !== undefined && String(params.due) !== '') bits.push('排期「' + String(params.due) + '」');
  return { text: bits.join('，'), scene: 'memo_search_keyword' };
}

/** `memo.search`：区间／关键词／分类／排期四种过滤（区间与排期正交可叠）＋ 列表页随行。 */
export function runSearch(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // #850：创建时间区间通道（HELP `start`＋`end` 双必填，按 `created_at` 倒序；与排期 `due` 正交可叠加）。
  // `timeRange` 月份形已退役：给了即指路，不再有两个说法。
  if (params.timeRange !== undefined) fail(2, 'timeRange 已退役：请给 start（YYYY-MM-DD）＋ end（YYYY-MM-DD），按创建时间过滤');
  const hasStart = params.start !== undefined;
  const hasEnd = params.end !== undefined;
  if (hasStart || hasEnd) {
    const start = needRangeDate(params.start, 'start');
    const end = needRangeDate(params.end, 'end');
    if (start > end) fail(2, '开始日期不能晚于结束日期：' + start + ' > ' + end);
    const category = categoryFilterOf(params.category);
    const limit = rangeLimitOf(params.limit);
    const rows = searchNotesByCreatedRange(db, { start, end, category, limit });
    const hit = rows.filter((n) => dueMatches(n, params));
    return {
      data: { items: hit, total: hit.length },
      exit: 0,
      deliver: listDeliver({
        scene: sceneOf(params, 'memo_search_by_date'),
        items: hit,
        subtitle: '创建时间 ' + start + ' 至 ' + end + '，共 ' + hit.length + ' 条'
          + (category === undefined ? '' : '（分类「' + category + '」）')
          + (limit === 20 ? '' : '，最多取前 ' + limit + ' 条'),
        copyLog: {
          thinking: '按创建时间区间查 · 按 created_at 过滤后倒序，排期条件可另叠',
          data_structure: 'notes 表 · id／content／category／sub_category／due／created_at（按 created_at 倒序）',
          call_chain: 'memo.search → searchNotesByCreatedRange → querySnapshot → buildListPage(memo_query) → deliver 钩子落盘',
          exception: '无',
        },
      }),
    };
  }
  const words = filterWords(params);
  const rows = params.q !== undefined
    ? searchNotes(db, String(params.q), { category: params.category as string | undefined, sub: params.sub as string | undefined })
    : listNotes(db).filter((n) => (params.category === undefined || n.category === params.category));
  const hit = rows.filter((n) => dueMatches(n, params));
  return {
    data: { items: hit, total: hit.length },
    exit: 0,
    deliver: listDeliver({
      scene: sceneOf(params, words.scene),
      items: hit,
      subtitle: '共 ' + hit.length + ' 条' + (words.text === '' ? '' : '，条件：' + words.text),
      copyLog: {
        thinking: '关键词／分类查 · 命中即列，页内可再筛选与复制',
        data_structure: 'notes 表 · id／content／category／sub_category／due／media_path／created_at',
        call_chain: 'memo.search → searchNotes／listNotes → querySnapshot → buildListPage(memo_query) → deliver 钩子落盘',
        exception: '无',
      },
    }),
  };
}

/** `memo.detail`：单条详情（缺 id 即槽位错，exit 2）＋ 「看备忘」那一格随行。 */
export function runDetail(params: Record<string, unknown>, db: MemoDb): CommandOut {
  const item = getNote(db, needId(params.id, '详情'));
  return {
    data: { item },
    exit: 0,
    deliver: listDeliver({
      scene: 'memo_get_detail',
      items: [item],
      subtitle: '笔记 #' + String(item.id) + ' 的全部内容',
      copyLog: {
        thinking: '单条详情 · 按 id 直取一行（老 detail 口径）',
        data_structure: 'notes 表 · id／content／category／sub_category／due／media_path／created_at／updated_at',
        call_chain: 'memo.detail → getNote → querySnapshot → buildListPage(memo_query) → deliver 钩子落盘',
        exception: '无',
      },
    }),
  };
}
