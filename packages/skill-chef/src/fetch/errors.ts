// 取数/口径错误：坏输入与缺失一律 throw，永不返空数组冒充正常。
export class ChefFetchError extends Error {
  readonly code:
    | 'CHEF_DB_MISSING' | 'CHEF_DB_UNREADABLE' | 'CHEF_RECIPE_CORRUPT'
    | 'CHEF_RECIPE_NOT_FOUND' | 'CHEF_BAD_QUERY' | 'CHEF_EMPTY_RESULT'
    | 'CHEF_HISTORY_CORRUPT';
  constructor(code: ChefFetchError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ChefFetchError';
    this.code = code;
  }
}

export class ChefPolicyError extends Error {
  readonly code:
    | 'POLICY_NO_MATCH' | 'POLICY_MISSING_SLOT' | 'POLICY_BAD_CATEGORY'
    | 'POLICY_BAD_DIFFICULTY' | 'POLICY_BAD_STATUS' | 'POLICY_BAD_HEAT'
    | 'POLICY_BAD_RATING' | 'POLICY_BAD_TIME' | 'POLICY_BAD_INPUT' | 'POLICY_CONFLICT';
  constructor(code: ChefPolicyError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ChefPolicyError';
    this.code = code;
  }
}
