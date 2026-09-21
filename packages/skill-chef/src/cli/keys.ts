/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 私家大厨命令键表：会改数据库 1 条、查询 1 条，共 2 条。
 * 一条命令的事实住它自己的能力目录（`src/<能力>/commands.ts`）；本文件只是那几处的派生，不手改。
 * 键序：会改数据库的命令（命令名升序）在前、查询命令（命令名升序）在后（确定性排序）。
 */
export const CHEF_CLI_SOURCES: readonly string[] = [
  'history',
];

export const CHEF_CLI_KEYS: readonly string[] = [
  'chef.history.record',
  'chef.history.query',
];

export const CHEF_KEY_TITLES: Record<string, string> = {
  'chef.history.record': '记录做菜',
  'chef.history.query': '查看历史',
};

export const CHEF_KEY_SHAPES: Record<string, string> = {
  'chef.history.record': 'receipt',
  'chef.history.query': 'list',
};

