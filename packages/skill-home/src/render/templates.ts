// 渲染层·模板装载：21 模板随包发布；未知/缺失大声失败。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HomeRenderError } from './errors.js';

export const HOME_TEMPLATES = [
  'item_search',
  'item_detail',
  'item_receipt',
  'tag_query',
  'tag_receipt',
  'inventory_round',
  'inventory_records',
  'location_query',
  'location_receipt',
  'outfit_pick',
  'trip_receipt',
  'stats_overview',
  'stats_alert',
  'shopping_query',
  'shopping_receipt',
  'ticket_query',
  'ticket_receipt',
  'care_query',
  'care_receipt',
  'help',
  'item_update_receipt',
] as const;
export type HomeTemplate = (typeof HOME_TEMPLATES)[number];

// key → 模板（add/update 共用 receipt 系；write 家族用 receipt 模板）。
export function templateFor(key: string): HomeTemplate {
  switch (key) {
    case 'home.item.search': return 'item_search';
    case 'home.item.detail': return 'item_detail';
    case 'home.item.add': return 'item_receipt';
    case 'home.item.update': return 'item_update_receipt';
    case 'home.tag.query': return 'tag_query';
    case 'home.tag.write': return 'tag_receipt';
    case 'home.inventory.round': return 'inventory_round';
    case 'home.inventory.records': return 'inventory_records';
    case 'home.location.query': return 'location_query';
    case 'home.location.write': return 'location_receipt';
    case 'home.outfit.pick': return 'outfit_pick';
    case 'home.trip.manage': return 'trip_receipt';
    case 'home.stats.overview': return 'stats_overview';
    case 'home.stats.alert': return 'stats_alert';
    case 'home.shopping.query': return 'shopping_query';
    case 'home.shopping.write': return 'shopping_receipt';
    case 'home.ticket.query': return 'ticket_query';
    case 'home.ticket.write': return 'ticket_receipt';
    case 'home.care.query': return 'care_query';
    case 'home.care.write': return 'care_receipt';
    case 'home.help.lookup': return 'help';
    default: throw new HomeRenderError('HOME_UNKNOWN_KEY', '无模板映射：' + key);
  }
}

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export function loadTemplate(name: string): string {
  if (!HOME_TEMPLATES.includes(name as HomeTemplate)) {
    throw new HomeRenderError('HOME_TEMPLATE_MISSING', '未知模板：' + name);
  }
  try { return readFileSync(join(templatesDir, name + '.html'), 'utf8'); }
  catch (e) { throw new HomeRenderError('HOME_TEMPLATE_MISSING', '模板缺失：' + name); }
}
