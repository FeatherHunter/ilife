// 共用渲染·页族两层解析（#800 新立，票 2 契约 L1 实施）。
//
// 签名照契约：`(命令，场景预设） → 页族`。今天的 1:1（`templates.ts` 一个 key 一个模板）
// 表达不了多场景（`home.item.update` 一键挂 9 条场景），故加这一层；`templateFor`
// 原样保留（旧 21 模板装载，域票新模板落盘前运行期仍走它）。
// 族表出处＝机器附录 `docs/skills/skill-home/scene-pages-contract.appendix.json` 的
// `families`（46 族）；映射出处＝附录 `scenarios`（70 条）＋实现 op 分流＋册子表一。
// 防走散：`test/wake-family-gates.test.mjs` 逐条对账（附录 70 条自匹配＋125 行对照）。
// 附录外补齐（8 处，票 2 补丁流已登记提案，见 structure-landing.md）：shopping.write
// 的 op 分流、care 双键的 kind 分流、tag.query 的 kind 分流、推位置／找位置待重裁。

/** 未知页族（ fail-closed：解析不到不猜，调用方显式降级）。 */
export const UNKNOWN_FAMILY = 'UNKNOWN';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * 两层解析：命令 key ＋ 场景预设（路由带的 kind／op／mode／view 等）→ 46 页族名。
 * 同一页族可由多个（key，预设）到达（多对一），但一个（key，预设）只到一个页族。
 */
export function resolvePageFamily(key: string, preset: Record<string, unknown> = {}): string {
  const kind = str(preset.kind);
  const op = str(preset.op);
  const mode = str(preset.mode);
  const view = str(preset.view);
  switch (key) {
    case 'home.item.search': {
      if (preset.dupes === true) return 'duplicates';
      if (preset.wall === true) return 'photo_wall';
      if (preset.locate === true) return 'locate';
      if (preset.browse === true) return 'browse';
      return 'search_list';
    }
    case 'home.item.detail': {
      if (view === 'history') return 'history';
      if (view === 'photos' || view === 'wall') return 'photos';
      return 'detail';
    }
    case 'home.item.add': return 'add_form';
    case 'home.item.update': {
      if (op === 'merge') return 'confirm';
      if (op === 'undo') return 'undo_select';
      if (op === 'relate') return 'relations';
      if (op === 'photo') return 'photos';
      if (op === 'qty' || op === 'status' || op === 'move' || op === 'tags') return 'receipt';
      return 'add_form';
    }
    case 'home.tag.query': {
      if (kind === 'categories' || kind === 'category') return 'category_manage';
      return 'tag_manage';
    }
    case 'home.tag.write': {
      if (op === 'category') return 'category_manage';
      return 'tag_manage';
    }
    case 'home.inventory.round': {
      if (op === 'resolve') return 'inventory_diff';
      if (op === 'move') return 'move_checklist';
      return 'inventory_round';
    }
    case 'home.inventory.records': return 'inventory_records';
    case 'home.location.query': {
      if (mode === 'space') return 'space_view';
      if (mode === 'suggest' || mode === 'storage') return 'suggest_storage';
      if (mode === 'find') return 'space_view';
      return 'location_manage';
    }
    case 'home.location.write': {
      if (op === 'fixed') return 'fixed_spot';
      return 'location_manage';
    }
    case 'home.outfit.pick': {
      if (kind === 'wardrobe') return 'wardrobe_analyze';
      if (kind === 'season') return 'wardrobe_season';
      if (kind === 'trip-plan') return 'trip_outfit_plan';
      return 'outfit_picker';
    }
    case 'home.trip.manage': return 'travel_trip';
    case 'home.stats.overview': {
      if (kind === 'inventory') return 'inventory_stat';
      return 'overview';
    }
    case 'home.stats.alert': {
      if (kind === 'expiring') return 'expiring';
      return 'idle';
    }
    case 'home.shopping.query': {
      if (kind === 'missing') return 'missing';
      if (kind === 'stock') return 'stock';
      if (kind === 'express') return 'express';
      return 'list';
    }
    case 'home.shopping.write': {
      if (op === 'missing-to-list') return 'missing';
      if (op === 'stock-threshold' || op === 'stock-set-threshold' || op === 'stock-fix') return 'stock';
      if (op === 'express-confirm') return 'express';
      return 'list';
    }
    case 'home.ticket.query': {
      if (kind === 'warranty') return 'warranty';
      if (kind === 'cert') return 'certificates';
      if (kind === 'account') return 'accounts';
      return 'purchase_records';
    }
    case 'home.ticket.write': {
      if (kind === 'warranty') return 'warranty';
      if (kind === 'cert') return 'certificates';
      if (kind === 'account') return 'accounts';
      return 'purchase_records';
    }
    case 'home.care.query': {
      if (kind === 'member') return 'family_members';
      if (kind === 'lint') return 'health_report';
      if (kind === 'firstuse' || kind === 'first-use') return 'first_use_wizard';
      if (kind === 'backup-list') return 'backup_receipt';
      return 'family_borrow';
    }
    case 'home.care.write': {
      if (kind === 'member') return 'family_members';
      if (kind === 'init') return 'first_use_wizard';
      if (kind === 'backup' || kind === 'export') return 'backup_receipt';
      if (kind === 'import-preview' || kind === 'import') return 'import_restore';
      return 'family_borrow';
    }
    default: return UNKNOWN_FAMILY;
  }
}
