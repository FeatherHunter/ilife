// 口径层·唤醒词路由：自然语言 → 21 联动 key；最长匹配；联动 3 词废弃不路由。
// HELP 速查唯一上游；改这里，HELP 构建期跟进。
import { HomePolicyError } from '../fetch/errors.js';

export type HomeKey =
  | 'home.item.search' | 'home.item.detail' | 'home.item.add' | 'home.item.update'
  | 'home.tag.query' | 'home.tag.write'
  | 'home.inventory.round' | 'home.inventory.records'
  | 'home.location.query' | 'home.location.write'
  | 'home.outfit.pick' | 'home.trip.manage'
  | 'home.stats.overview' | 'home.stats.alert'
  | 'home.shopping.query' | 'home.shopping.write'
  | 'home.ticket.query' | 'home.ticket.write'
  | 'home.care.query' | 'home.care.write'
  | 'home.help.lookup';

export interface WakeRoute { key: HomeKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: HomeKey; needs?: string[]; preset?: Record<string, unknown>; }

export const WAKE_TABLE: WakeEntry[] = [
  { phrase: '居家管家 帮助', key: 'home.help.lookup' },
  { phrase: '居家管家帮助', key: 'home.help.lookup' },
  { phrase: '居家管家能做什么', key: 'home.help.lookup' },
  { phrase: '查物品(HTML)', key: 'home.item.search' },
  { phrase: '看物品(HTML)', key: 'home.item.detail', needs: ['id'] },
  { phrase: '统物品(HTML)', key: 'home.stats.overview' },
  { phrase: '查物品', key: 'home.item.search' },
  { phrase: '看物品', key: 'home.item.detail', needs: ['id'] },
  { phrase: '录物品', key: 'home.item.add' },
  { phrase: '拍物品', key: 'home.item.add', preset: { photo: '1' } },
  { phrase: '改物品', key: 'home.item.update', needs: ['id'] },
  { phrase: '移物品', key: 'home.item.update', needs: ['id'], preset: { op: 'move' } },
  { phrase: '补物品', key: 'home.item.update', needs: ['id'], preset: { op: 'qty' } },
  { phrase: '减物品', key: 'home.item.update', needs: ['id'], preset: { op: 'qty' } },
  { phrase: '标物品', key: 'home.item.update', needs: ['id'], preset: { op: 'tags' } },
  { phrase: '废物品', key: 'home.item.update', needs: ['id'], preset: { op: 'status' } },
  { phrase: '借物品', key: 'home.item.update', needs: ['id'], preset: { op: 'status' } },
  { phrase: '修物品', key: 'home.item.update', needs: ['id'], preset: { op: 'status' } },
  { phrase: '盘物品', key: 'home.inventory.round', preset: { op: 'round' } },
  { phrase: '盘全部', key: 'home.inventory.round', preset: { op: 'round', scope: 'all' } },
  { phrase: '穿什么', key: 'home.outfit.pick' },
  { phrase: '带物品', key: 'home.trip.manage', preset: { mode: 'pack' } },
  { phrase: '归物品', key: 'home.trip.manage', preset: { mode: 'return' } },
  { phrase: '统物品', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '查高频', key: 'home.stats.overview', preset: { kind: 'summary' } },
  { phrase: '查低频', key: 'home.stats.alert', preset: { kind: 'idle' } },
  { phrase: '查过期', key: 'home.stats.alert', preset: { kind: 'expiring' } },
  { phrase: '看标签', key: 'home.tag.query' },
  { phrase: '合标签', key: 'home.tag.write', preset: { op: 'merge' } },
  { phrase: '查快递', key: 'home.shopping.query', preset: { kind: 'express' } },
  { phrase: '推位置', key: 'home.location.query', preset: { mode: 'suggest' } },
  { phrase: '找位置', key: 'home.location.query', preset: { mode: 'find' } },
  { phrase: '查账号', key: 'home.ticket.query', preset: { kind: 'account' } },
  { phrase: '存账号', key: 'home.ticket.write', preset: { kind: 'account', op: 'add' } },
  { phrase: '改账号', key: 'home.ticket.write', preset: { kind: 'account', op: 'update' } },
  { phrase: '看密码', key: 'home.ticket.write', preset: { kind: 'account', op: 'show' } },
  { phrase: '查异常', key: 'home.care.query', preset: { kind: 'lint' } },
  { phrase: '借用', key: 'home.care.query', preset: { kind: 'borrow' } },
  { phrase: '家人档案', key: 'home.care.query', preset: { kind: 'member' } },
  { phrase: '管位置', key: 'home.location.write', preset: { op: 'manage' } },
  { phrase: '固定位', key: 'home.location.write', preset: { op: 'fixed' } },
  { phrase: '收纳建议', key: 'home.location.query', preset: { mode: 'storage' } },
  { phrase: '空间视图', key: 'home.location.query', preset: { mode: 'space' } },
  { phrase: '查闲置', key: 'home.stats.alert', preset: { kind: 'idle' } },
  { phrase: '盘点统计', key: 'home.stats.overview', preset: { kind: 'inventory' } },
  { phrase: '首次使用', key: 'home.care.write', preset: { kind: 'init' } },
  { phrase: '备份导出', key: 'home.care.write', preset: { kind: 'backup' } },
  { phrase: '导入恢复', key: 'home.care.write', preset: { kind: 'import' } },
  { phrase: '批量录入', key: 'home.item.add', preset: { op: 'batch' } },
  { phrase: '补录', key: 'home.item.add', preset: { op: 'backfill' } },
  { phrase: '紧急定位', key: 'home.item.search', preset: { locate: true } },
  { phrase: '筛选浏览', key: 'home.item.search', preset: { browse: true } },
  { phrase: '拍照找物品', key: 'home.item.search', preset: { photo: true } },
  { phrase: '查重复', key: 'home.item.search', preset: { dupes: true } },
  { phrase: '合并物品', key: 'home.item.update', needs: ['id'], preset: { op: 'merge' } },
  { phrase: '撤销操作', key: 'home.item.update', preset: { op: 'undo' } },
  { phrase: '物品关联', key: 'home.item.update', needs: ['id'], preset: { op: 'relate' } },
  { phrase: '管标签', key: 'home.tag.write', preset: { op: 'overview' } },
  { phrase: '管分类', key: 'home.tag.write', preset: { op: 'category' } },
  { phrase: '整理建议', key: 'home.tag.write', preset: { op: 'tidy' } },
  { phrase: '查看照片', key: 'home.item.detail', needs: ['id'], preset: { view: 'photos' } },
  { phrase: '管照片', key: 'home.item.update', needs: ['id'], preset: { op: 'photo' } },
  { phrase: '照片墙', key: 'home.item.search', preset: { wall: true } },
  { phrase: '盘点记录', key: 'home.inventory.records' },
  { phrase: '差异处理', key: 'home.inventory.round', preset: { op: 'resolve' } },
  { phrase: '搬家盘点', key: 'home.inventory.round', preset: { op: 'move' } },
  { phrase: '历史', key: 'home.item.detail', needs: ['id'], preset: { view: 'history' } },
  { phrase: '数量变更', key: 'home.item.update', needs: ['id'], preset: { op: 'qty' } },
  { phrase: '状态变更', key: 'home.item.update', needs: ['id'], preset: { op: 'status' } },
  { phrase: '盘点', key: 'home.inventory.round', preset: { op: 'round' } },
  { phrase: '购物清单', key: 'home.shopping.query', preset: { kind: 'list' } },
  { phrase: '缺货检测', key: 'home.shopping.query', preset: { kind: 'missing' } },
  { phrase: '囤货盘点', key: 'home.shopping.query', preset: { kind: 'stock' } },
  { phrase: '查购买记录', key: 'home.ticket.query', preset: { kind: 'purchase' } },
  { phrase: '查上月购买', key: 'home.ticket.query', preset: { kind: 'purchase', range: 'last-month' } },
  { phrase: '查今年花费', key: 'home.ticket.query', preset: { kind: 'purchase', range: 'year' } },
  { phrase: '查退货窗口', key: 'home.ticket.query', preset: { kind: 'purchase', range: 'return' } },
  { phrase: '登记购买记录', key: 'home.ticket.write', preset: { kind: 'purchase', op: 'add' } },
  { phrase: '查保修状态', key: 'home.ticket.query', preset: { kind: 'warranty' } },
  { phrase: '登记保修', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'register' } },
  { phrase: '记录维修', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'repair' } },
  { phrase: '设置保养周期', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'cycle' } },
  { phrase: '执行保养', key: 'home.ticket.write', preset: { kind: 'warranty', op: 'maintain' } },
  { phrase: '查证件到期', key: 'home.ticket.query', preset: { kind: 'cert' } },
  { phrase: '登记证件', key: 'home.ticket.write', preset: { kind: 'cert', op: 'add' } },
  { phrase: '证件归档', key: 'home.ticket.write', preset: { kind: 'cert', op: 'archive' } },
  { phrase: '更新证件', key: 'home.ticket.write', preset: { kind: 'cert', op: 'update' } },
  { phrase: '衣橱分析', key: 'home.outfit.pick', preset: { kind: 'wardrobe' } },
  { phrase: '换季', key: 'home.outfit.pick', preset: { kind: 'season' } },
  { phrase: '旅行穿搭', key: 'home.outfit.pick', preset: { kind: 'trip-plan' } },
  { phrase: '改购物清单', key: 'home.shopping.write', preset: { op: 'check' } },
];

// 废弃词（SM9 外联动 3 词，本技能不路由；combos 登记走后续票）。
export const DEPRECATED_PHRASES = ['联动总览', '记到卡路里', '记到记账'];

const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) throw new HomePolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) {
    throw new HomePolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text + '（联动 3 词走后续票）');
  }
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new HomePolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, hit.needs || []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
