// 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
// 命令键表（派生件）：一命令的事实住它自己的能力目录，本文件只是那处的派生，不手改。
// 键序＝键名升序（确定性排序，与写入次序无关）；写键在前读键在后是卡路里的序，
// 居家只取确定性（逐字节相同），不取它的写前读后。
export const HOME_KEYS = [
  'home.care.query',
  'home.care.write',
  'home.data.query',
  'home.data.schema',
  'home.inventory.records',
  'home.inventory.round',
  'home.item.add',
  'home.item.detail',
  'home.item.search',
  'home.item.update',
  'home.location.query',
  'home.location.write',
  'home.outfit.pick',
  'home.shopping.query',
  'home.shopping.write',
  'home.stats.alert',
  'home.stats.overview',
  'home.tag.query',
  'home.tag.write',
  'home.ticket.query',
  'home.ticket.write',
  'home.trip.manage',
] as const;
export type HomeKeyString = (typeof HOME_KEYS)[number];

// 出参形状分配（派生件）：读形状来自声明，写一律 receipt。
export const HOME_KEY_SHAPES: Record<string, string> = {
  'home.care.query': 'list',
  'home.care.write': 'receipt',
  'home.data.query': 'resultset',
  'home.data.schema': 'resultset',
  'home.inventory.records': 'list',
  'home.inventory.round': 'receipt',
  'home.item.add': 'receipt',
  'home.item.detail': 'detail',
  'home.item.search': 'list',
  'home.item.update': 'receipt',
  'home.location.query': 'list',
  'home.location.write': 'receipt',
  'home.outfit.pick': 'list',
  'home.shopping.query': 'list',
  'home.shopping.write': 'receipt',
  'home.stats.alert': 'list',
  'home.stats.overview': 'stat',
  'home.tag.query': 'list',
  'home.tag.write': 'receipt',
  'home.ticket.query': 'list',
  'home.ticket.write': 'receipt',
  'home.trip.manage': 'receipt',
  'home.help.lookup': 'list',
};
