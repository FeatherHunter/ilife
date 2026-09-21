// 共用渲染·场景命名（#801 新立，票 2 契约「产物命名与交付回执」节的产出侧实施）。
//
// 契约：`<命令中文名>_<场景 id>`（戳与时间戳由共用件 `base-paint/save-html` 钉死，
// 本件只出文件名主体）。行表出处＝机器附录
// `docs/skills/skill-home/scene-pages-contract.appendix.json` 的 `scenarios`（70 行，
// 由 `test/html-delivery-801.test.mjs` 逐行对账，附录一改这里即红）。
// 本件不读附录 JSON（附录住 `docs/`，不随包发布；运行时事实源只能是代码——
// 照 `src/render/pageFamilies.ts` #800 先例）。
//
// 一处显式偏离（fail-closed，不静默）：附录 SM2-3 行 preset 是 `{mode:"storage"}`，
// 但运行时 `mode:"storage"` 走的是位置总览分支（`src/space/location.ts:33` 的
// manage/storage 共枝），行为与收纳建议不同；真收纳建议走 `mode:"suggest"`。
// 故本件**不收**附录那一行，`suggest → SM2-3` 与 `storage → SM2-1（宿主）` 各走各的
// 宿主行（见下 HOST_ROWS），已向票 2 登记补丁流提案（证据
// `docs/skills/skill-home/html-delivery-chain.md` §宿主回退表）。
//
// 宿主回退（HOST_ROWS）：运行时合法、但附录 70 行没有的组合，一律归宿到 70 行之一
// （不发明新名——票面禁令「本票不自行决定文件名」）。归宿点＝同页族内行为一致的
// 那一行（证据里逐条点名）；匹配不到任何行即抛（调用方走 exit 5，大声失败）。
import { HomeRenderError } from './errors.js';

/** 命名行：`(命令，场景预设） →（命令中文名，场景 id）`。 */
export interface SceneNameRow {
  readonly key: string;
  readonly preset: Readonly<Record<string, unknown>>;
  readonly commandCn: string;
  readonly id: string;
}

/* —— 70 行中的 69 行（附录逐字，唯 SM2-3 的 storage 行除外，见件头偏离说明） —— */
const EXACT_ROWS: readonly SceneNameRow[] = [
  { key: "home.item.add", preset: {}, commandCn: "录物品", id: "1-1" },
  { key: "home.item.add", preset: {"photo":"1"}, commandCn: "拍物品", id: "1-2" },
  { key: "home.item.add", preset: {"op":"batch"}, commandCn: "批量录入", id: "1-3" },
  { key: "home.item.add", preset: {"op":"backfill"}, commandCn: "补录", id: "1-4" },
  { key: "home.item.search", preset: {}, commandCn: "查物品", id: "2-1" },
  { key: "home.item.detail", preset: {}, commandCn: "看物品", id: "2-2" },
  { key: "home.item.search", preset: {"locate":true}, commandCn: "紧急定位", id: "2-3" },
  { key: "home.item.search", preset: {"browse":true}, commandCn: "筛选浏览", id: "2-4" },
  { key: "home.item.search", preset: {"photo":true}, commandCn: "拍照找物品", id: "2-5" },
  { key: "home.item.search", preset: {"dupes":true}, commandCn: "查重复", id: "2-6" },
  { key: "home.item.update", preset: {}, commandCn: "改物品", id: "3-1" },
  { key: "home.item.update", preset: {"op":"move"}, commandCn: "移物品", id: "3-2" },
  { key: "home.item.update", preset: {"op":"qty"}, commandCn: "数量变更", id: "3-3" },
  { key: "home.item.update", preset: {"op":"status"}, commandCn: "状态变更", id: "3-4" },
  { key: "home.item.update", preset: {"op":"merge"}, commandCn: "合并物品", id: "3-5" },
  { key: "home.item.update", preset: {"op":"undo"}, commandCn: "撤销操作", id: "3-6" },
  { key: "home.item.update", preset: {"op":"relate"}, commandCn: "物品关联", id: "3-7" },
  { key: "home.item.update", preset: {"op":"tags"}, commandCn: "标物品", id: "3-8" },
  { key: "home.tag.write", preset: {"op":"overview"}, commandCn: "管标签", id: "4-1" },
  { key: "home.tag.write", preset: {"op":"category"}, commandCn: "管分类", id: "4-2" },
  { key: "home.tag.write", preset: {"op":"tidy"}, commandCn: "整理建议", id: "4-3" },
  { key: "home.item.detail", preset: {"view":"photos"}, commandCn: "查看照片", id: "5-1" },
  { key: "home.item.update", preset: {"op":"photo"}, commandCn: "管照片", id: "5-2" },
  { key: "home.item.search", preset: {"wall":true}, commandCn: "照片墙", id: "5-3" },
  { key: "home.inventory.round", preset: {"op":"round"}, commandCn: "盘点", id: "6-1" },
  { key: "home.inventory.round", preset: {"op":"resolve"}, commandCn: "差异处理", id: "6-2" },
  { key: "home.inventory.records", preset: {}, commandCn: "盘点记录", id: "6-3" },
  { key: "home.inventory.round", preset: {"op":"move"}, commandCn: "搬家盘点", id: "6-4" },
  { key: "home.item.detail", preset: {"view":"history"}, commandCn: "历史", id: "7-1" },
  { key: "home.location.write", preset: {"op":"manage"}, commandCn: "管位置", id: "SM2-1" },
  { key: "home.location.write", preset: {"op":"fixed"}, commandCn: "固定位", id: "SM2-2" },
  { key: "home.location.query", preset: {"mode":"space"}, commandCn: "空间视图", id: "SM2-4" },
  { key: "home.outfit.pick", preset: {}, commandCn: "穿什么", id: "SM3-1" },
  { key: "home.outfit.pick", preset: {"kind":"wardrobe"}, commandCn: "衣橱分析", id: "SM3-2" },
  { key: "home.outfit.pick", preset: {"kind":"season"}, commandCn: "换季", id: "SM3-3" },
  { key: "home.trip.manage", preset: {"mode":"pack"}, commandCn: "出行清单", id: "SM3-4" },
  { key: "home.outfit.pick", preset: {"kind":"trip-plan"}, commandCn: "旅行穿搭", id: "SM3-5" },
  { key: "home.stats.overview", preset: {"kind":"summary"}, commandCn: "统物品", id: "SM4-1" },
  { key: "home.stats.alert", preset: {"kind":"idle"}, commandCn: "查闲置", id: "SM4-2" },
  { key: "home.stats.alert", preset: {"kind":"expiring"}, commandCn: "查过期", id: "SM4-3" },
  { key: "home.stats.overview", preset: {"kind":"inventory"}, commandCn: "盘点统计", id: "SM4-4" },
  { key: "home.shopping.query", preset: {"kind":"list"}, commandCn: "购物清单", id: "SM5-1" },
  { key: "home.shopping.query", preset: {"kind":"missing"}, commandCn: "缺货检测", id: "SM5-2" },
  { key: "home.shopping.query", preset: {"kind":"express"}, commandCn: "查快递", id: "SM5-3" },
  { key: "home.shopping.query", preset: {"kind":"stock"}, commandCn: "囤货盘点", id: "SM5-4" },
  { key: "home.ticket.query", preset: {"kind":"purchase"}, commandCn: "查购买记录", id: "SM6-1" },
  { key: "home.ticket.query", preset: {"kind":"purchase","range":"last-month"}, commandCn: "查上月购买", id: "SM6-2" },
  { key: "home.ticket.query", preset: {"kind":"purchase","range":"year"}, commandCn: "查今年花费", id: "SM6-3" },
  { key: "home.ticket.query", preset: {"kind":"purchase","range":"return"}, commandCn: "查退货窗口", id: "SM6-4" },
  { key: "home.ticket.write", preset: {"kind":"purchase","op":"add"}, commandCn: "登记购买记录", id: "SM6-5" },
  { key: "home.ticket.query", preset: {"kind":"warranty"}, commandCn: "查保修状态", id: "SM6-6" },
  { key: "home.ticket.write", preset: {"kind":"warranty","op":"register"}, commandCn: "登记保修", id: "SM6-7" },
  { key: "home.ticket.write", preset: {"kind":"warranty","op":"repair"}, commandCn: "记录维修", id: "SM6-8" },
  { key: "home.ticket.write", preset: {"kind":"warranty","op":"cycle"}, commandCn: "设置保养周期", id: "SM6-9" },
  { key: "home.ticket.write", preset: {"kind":"warranty","op":"maintain"}, commandCn: "执行保养", id: "SM6-10" },
  { key: "home.ticket.query", preset: {"kind":"cert"}, commandCn: "查证件到期", id: "SM6-11" },
  { key: "home.ticket.write", preset: {"kind":"cert","op":"add"}, commandCn: "登记证件", id: "SM6-12" },
  { key: "home.ticket.write", preset: {"kind":"cert","op":"archive"}, commandCn: "证件归档", id: "SM6-13" },
  { key: "home.ticket.write", preset: {"kind":"cert","op":"update"}, commandCn: "更新证件", id: "SM6-14" },
  { key: "home.ticket.query", preset: {"kind":"account"}, commandCn: "查账号", id: "SM6-15" },
  { key: "home.ticket.write", preset: {"kind":"account","op":"add"}, commandCn: "存账号", id: "SM6-16" },
  { key: "home.ticket.write", preset: {"kind":"account","op":"update"}, commandCn: "改账号", id: "SM6-17" },
  { key: "home.ticket.write", preset: {"kind":"account","op":"show"}, commandCn: "看密码", id: "SM6-18" },
  { key: "home.care.query", preset: {"kind":"borrow"}, commandCn: "借用", id: "SM7-1" },
  { key: "home.care.query", preset: {"kind":"member"}, commandCn: "家人档案", id: "SM7-2" },
  { key: "home.care.write", preset: {"kind":"init"}, commandCn: "首次使用", id: "SM8-1" },
  { key: "home.care.query", preset: {"kind":"lint"}, commandCn: "查异常", id: "SM8-2" },
  { key: "home.care.write", preset: {"kind":"backup"}, commandCn: "备份导出", id: "SM8-3" },
  { key: "home.care.write", preset: {"kind":"import"}, commandCn: "导入恢复", id: "SM8-4" },
];

/* —— 宿主回退行（运行时合法、附录无行的组合；归宿理由见证据 §宿主回退表） —— */
const HOST_ROWS: readonly SceneNameRow[] = [
  { key: "home.item.add", preset: {"photo":true}, commandCn: "拍物品", id: "1-2" },
  { key: "home.tag.query", preset: {"kind":"categories"}, commandCn: "管分类", id: "4-2" },
  { key: "home.tag.query", preset: {"kind":"category"}, commandCn: "管分类", id: "4-2" },
  { key: "home.tag.query", preset: {}, commandCn: "管标签", id: "4-1" },
  { key: "home.tag.write", preset: {"op":"merge"}, commandCn: "管标签", id: "4-1" },
  { key: "home.item.detail", preset: {"view":"wall"}, commandCn: "查看照片", id: "5-1" },
  { key: "home.location.query", preset: {"mode":"suggest"}, commandCn: "收纳建议", id: "SM2-3" },
  { key: "home.location.query", preset: {"mode":"find"}, commandCn: "空间视图", id: "SM2-4" },
  { key: "home.location.query", preset: {"mode":"storage"}, commandCn: "管位置", id: "SM2-1" },
  { key: "home.location.query", preset: {"mode":"manage"}, commandCn: "管位置", id: "SM2-1" },
  { key: "home.location.query", preset: {}, commandCn: "管位置", id: "SM2-1" },
  { key: "home.location.write", preset: {}, commandCn: "管位置", id: "SM2-1" },
  { key: "home.trip.manage", preset: {"mode":"return"}, commandCn: "出行清单", id: "SM3-4" },
  { key: "home.trip.manage", preset: {}, commandCn: "出行清单", id: "SM3-4" },
  { key: "home.stats.overview", preset: {}, commandCn: "统物品", id: "SM4-1" },
  { key: "home.stats.alert", preset: {}, commandCn: "查闲置", id: "SM4-2" },
  { key: "home.shopping.query", preset: {}, commandCn: "购物清单", id: "SM5-1" },
  { key: "home.shopping.write", preset: {"op":"list-add"}, commandCn: "购物清单", id: "SM5-1" },
  { key: "home.shopping.write", preset: {"op":"list-check"}, commandCn: "购物清单", id: "SM5-1" },
  { key: "home.shopping.write", preset: {"op":"check"}, commandCn: "购物清单", id: "SM5-1" },
  { key: "home.shopping.write", preset: {"op":"missing-to-list"}, commandCn: "缺货检测", id: "SM5-2" },
  { key: "home.shopping.write", preset: {"op":"stock-threshold"}, commandCn: "囤货盘点", id: "SM5-4" },
  { key: "home.shopping.write", preset: {"op":"stock-set-threshold"}, commandCn: "囤货盘点", id: "SM5-4" },
  { key: "home.shopping.write", preset: {"op":"stock-fix"}, commandCn: "囤货盘点", id: "SM5-4" },
  { key: "home.shopping.write", preset: {"op":"express-confirm"}, commandCn: "查快递", id: "SM5-3" },
  { key: "home.care.query", preset: {}, commandCn: "借用", id: "SM7-1" },
  { key: "home.care.query", preset: {"kind":"firstuse"}, commandCn: "首次使用", id: "SM8-1" },
  { key: "home.care.query", preset: {"kind":"first-use"}, commandCn: "首次使用", id: "SM8-1" },
  { key: "home.care.query", preset: {"kind":"backup-list"}, commandCn: "备份导出", id: "SM8-3" },
  { key: "home.care.write", preset: {"kind":"borrow"}, commandCn: "借用", id: "SM7-1" },
  { key: "home.care.write", preset: {"kind":"member"}, commandCn: "家人档案", id: "SM7-2" },
  { key: "home.care.write", preset: {"kind":"backup"}, commandCn: "备份导出", id: "SM8-3" },
  { key: "home.care.write", preset: {"kind":"export"}, commandCn: "备份导出", id: "SM8-3" },
  { key: "home.care.write", preset: {"kind":"import-preview"}, commandCn: "导入恢复", id: "SM8-4" },
  { key: "home.care.write", preset: {"kind":"import"}, commandCn: "导入恢复", id: "SM8-4" },
];

/** 布尔预设的宽容比对：调用方传 true／"true"／"1"／1 皆算真（CLI 走 JSON，两路同形）。 */
function toBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return null;
}

function entryMatches(rowVal: unknown, paramVal: unknown): boolean {
  if (typeof rowVal === 'boolean') return toBool(paramVal) === rowVal;
  return String(paramVal) === String(rowVal);
}

/** 行是否覆盖本次调用：行 preset 的每一项都在 params 里对上（子集语义；空 preset 恒覆盖）。 */
function covers(row: SceneNameRow, params: Record<string, unknown>): boolean {
  return Object.entries(row.preset).every(([k, v]) => k in params && entryMatches(v, params[k]));
}

/**
 * 命名解析：`(命令，场景预设） → 文件名主体`（`<命令中文名>_<场景 id>`）。
 * 先精确行（preset 越具体越优先），再宿主行；两表都定不了即抛（fail-closed，
 * 调用方走 exit 5，不猜一个名字把两份产物写到同一份上）。
 */
export function resolveSceneStem(key: string, params: Record<string, unknown> = {}): string {
  const bySize = (a: SceneNameRow, b: SceneNameRow): number =>
    Object.keys(b.preset).length - Object.keys(a.preset).length;
  for (const table of [EXACT_ROWS, HOST_ROWS]) {
    const hits = table.filter((r) => r.key === key && covers(r, params)).sort(bySize);
    if (hits.length > 0) {
      const hit = hits[0] as SceneNameRow;
      return hit.commandCn + '_' + hit.id;
    }
  }
  throw new HomeRenderError('HOME_UNKNOWN_SCENE',
    '[skill-home] 无命名归宿（缺失阻断，不猜）：' + key + ' ' + JSON.stringify(params));
}
