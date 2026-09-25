/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 备忘录命令键表：write 6 条、read 7 条、pre-open 1 条，合计 14 条。
 * 一条命令的事实住它自己的能力目录（`src/<域>/commands.ts`）；本文件只是那几处的派生，不手改。
 * 键序：write → read → pre-open，各段内按键名升序（确定性排序，同一个声明层永远得同一份字节）。
 * `MemoKey` 是键的**编译期约束**：删一条声明而不改指向它的路由声明，`tsc` 当场红（TS2820）。
 * `MEMO_DECLARED_SHAPES` 是**声明面投影**（13 条命令自己声明的形状；写命令的 `receipt` 由生成器合成）；
 * envelope 认的全表是 `render/envelope.ts` 的 `MEMO_KEY_SHAPES`＝本表 ＋ 框架位那几行（`memo.help.lookup`），
 * 两张表逐键一致由测试守着（`test/cmd-registry-855.test.mjs`），不靠人记。
 */
import type { EnvelopeShape } from 'base-link-core';

export const MEMO_CLI_SOURCES: readonly string[] = [
  'checkin',
  'data',
  'init',
  'memo',
  'mood',
  'remind',
  'search',
  'sync',
  'wish',
];

export const MEMO_CLI_KEYS: readonly string[] = [
  'memo.batch',
  'memo.create',
  'memo.reminder',
  'memo.remove',
  'memo.sync',
  'memo.update',
  'memo.auth',
  'memo.data.query',
  'memo.data.schema',
  'memo.detail',
  'memo.remind',
  'memo.search',
  'memo.wish',
  'memo.init',
];

export type MemoKey = 'memo.batch'
  | 'memo.create'
  | 'memo.reminder'
  | 'memo.remove'
  | 'memo.sync'
  | 'memo.update'
  | 'memo.auth'
  | 'memo.data.query'
  | 'memo.data.schema'
  | 'memo.detail'
  | 'memo.remind'
  | 'memo.search'
  | 'memo.wish'
  | 'memo.init';

export const MEMO_KEY_TITLES: Record<string, string> = {
  'memo.batch': '批量改分类',
  'memo.create': '记备忘',
  'memo.reminder': '设提醒',
  'memo.remove': '删备忘',
  'memo.sync': '备忘录同步',
  'memo.update': '改备忘',
  'memo.auth': '授权诊断',
  'memo.data.query': '数据查询',
  'memo.data.schema': '数据目录',
  'memo.detail': '看备忘',
  'memo.remind': '看提醒',
  'memo.search': '搜备忘',
  'memo.wish': '心愿排期',
  'memo.init': '首次使用',
};


export const MEMO_DECLARED_SHAPES: Record<string, EnvelopeShape> = {
  'memo.batch': 'receipt',
  'memo.create': 'receipt',
  'memo.reminder': 'receipt',
  'memo.remove': 'receipt',
  'memo.sync': 'receipt',
  'memo.update': 'receipt',
  'memo.auth': 'receipt',
  'memo.data.query': 'resultset',
  'memo.data.schema': 'resultset',
  'memo.detail': 'detail',
  'memo.remind': 'list',
  'memo.search': 'list',
  'memo.wish': 'list',
  'memo.init': 'receipt',
};

export const MEMO_DOMAIN_KEYS: Record<string, readonly string[]> = {
  'data': ['memo.data.query', 'memo.data.schema'],
  'init': ['memo.init'],
  'memo': ['memo.batch', 'memo.create', 'memo.remove', 'memo.update'],
  'remind': ['memo.reminder', 'memo.remind'],
  'search': ['memo.detail', 'memo.search'],
  'sync': ['memo.sync', 'memo.auth'],
  'wish': ['memo.wish'],
};
