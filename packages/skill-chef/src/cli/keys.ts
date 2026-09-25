/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 私家大厨命令键表：会改数据库 5 条、查询 8 条，共 13 条。
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
  'chef.data.batch',
  'chef.history.record',
  'chef.recipe.write',
  'chef.relation.write',
  'chef.setup.init',
  'chef.cooking.run',
  'chef.data.query',
  'chef.data.schema',
  'chef.history.query',
  'chef.recipe.search',
  'chef.recipe.view',
  'chef.relation.query',
  'chef.shopping.query',
];

export const CHEF_KEY_TITLES: Record<string, string> = {
  'chef.data.batch': '批量改',
  'chef.history.record': '记录做菜',
  'chef.recipe.write': '录入食谱',
  'chef.relation.write': '添加派生关系',
  'chef.setup.init': '首次使用',
  'chef.cooking.run': '做菜模式',
  'chef.data.query': '数据查询',
  'chef.data.schema': '数据目录',
  'chef.history.query': '查看历史',
  'chef.recipe.search': '搜索食谱',
  'chef.recipe.view': '查看食谱',
  'chef.relation.query': '查看派生关系',
  'chef.shopping.query': '生成清单',
};

export const CHEF_KEY_SHAPES: Record<string, string> = {
  'chef.data.batch': 'receipt',
  'chef.history.record': 'receipt',
  'chef.recipe.write': 'receipt',
  'chef.relation.write': 'receipt',
  'chef.setup.init': 'receipt',
  'chef.cooking.run': 'list',
  'chef.data.query': 'resultset',
  'chef.data.schema': 'resultset',
  'chef.history.query': 'list',
  'chef.recipe.search': 'list',
  'chef.recipe.view': 'detail',
  'chef.relation.query': 'list',
  'chef.shopping.query': 'list',
};

export const CHEF_DOMAIN_KEYS: Record<string, readonly string[]> = {
  'add': ['chef.recipe.write'],
  'cook': ['chef.cooking.run'],
  'data': ['chef.data.batch', 'chef.data.query', 'chef.data.schema'],
  'history': ['chef.history.record', 'chef.history.query'],
  'relation': ['chef.relation.write', 'chef.relation.query'],
  'search': ['chef.recipe.search'],
  'setup': ['chef.setup.init'],
  'shopping': ['chef.shopping.query'],
  'update': [],
  'view': ['chef.recipe.view'],
};

