// 取数/口径错误：坏输入与缺失一律 throw，永不返空数组冒充正常。
export class HomeFetchError extends Error {
  readonly code:
    | 'HOME_DB_MISSING' | 'HOME_DB_UNREADABLE' | 'HOME_ITEM_NOT_FOUND' | 'HOME_BAD_QUERY'
    | 'HOME_EMPTY_RANGE' | 'HOME_ACCOUNT_MISSING' | 'HOME_ACCOUNT_BAD_KEY';
  constructor(code: HomeFetchError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HomeFetchError';
    this.code = code;
  }
}

export class HomePolicyError extends Error {
  readonly code:
    | 'POLICY_NO_MATCH' | 'POLICY_MISSING_SLOT' | 'POLICY_BAD_CATEGORY'
    | 'POLICY_BAD_LOCATION' | 'POLICY_BAD_STATUS' | 'POLICY_BAD_DATE' | 'POLICY_BAD_INPUT';
  constructor(code: HomePolicyError['code'], message: string) {
    super(message);
    this.name = 'HomePolicyError';
    this.code = code;
  }
}
