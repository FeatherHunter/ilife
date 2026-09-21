/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 私家大厨命令键表：会改数据库 2 条、查询 5 条，共 7 条。
 * 一条命令的事实住它自己的能力目录（`src/<能力>/commands.ts`）；本文件只是那几处的派生，不手改。
 * 键序：会改数据库的命令（命令名升序）在前、查询命令（命令名升序）在后（确定性排序）。
 */
export const CHEF_CLI_SOURCES: readonly string[] = [
  'add',
  'cook',
  'data',
  'history',
  'relation',
  'search',
  'setup',
  'shopping',
  'update',
  'view',
];

export const CHEF_CLI_KEYS: readonly string[] = [
  'chef.history.record',
  'chef.recipe.write',
  'chef.cooking.run',
  'chef.history.query',
  'chef.recipe.search',
  'chef.recipe.view',
  'chef.shopping.query',
];

export const CHEF_KEY_TITLES: Record<string, string> = {
  'chef.history.record': '记录做菜',
  'chef.recipe.write': '录入食谱',
  'chef.cooking.run': '做菜模式',
  'chef.history.query': '查看历史',
  'chef.recipe.search': '搜索食谱',
  'chef.recipe.view': '查看食谱',
  'chef.shopping.query': '生成清单',
};

export const CHEF_KEY_SHAPES: Record<string, string> = {
  'chef.history.record': 'receipt',
  'chef.recipe.write': 'receipt',
  'chef.cooking.run': 'list',
  'chef.history.query': 'list',
  'chef.recipe.search': 'list',
  'chef.recipe.view': 'detail',
  'chef.shopping.query': 'list',
};

export const CHEF_DOMAIN_KEYS: Record<string, readonly string[]> = {
  'add': ['chef.recipe.write'],
  'cook': ['chef.cooking.run'],
  'data': [],
  'history': ['chef.history.record', 'chef.history.query'],
  'relation': [],
  'search': ['chef.recipe.search'],
  'setup': [],
  'shopping': ['chef.shopping.query'],
  'update': [],
  'view': ['chef.recipe.view'],
};

