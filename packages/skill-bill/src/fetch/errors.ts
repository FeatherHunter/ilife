// 取数/口径错误：坏输入与缺失一律 throw，永不返空数组冒充正常。
export class BillFetchError extends Error {
  readonly code:
    | 'BILL_DB_MISSING' | 'BILL_DB_UNREADABLE' | 'BILL_RECORD_CORRUPT'
    | 'BILL_RECORD_NOT_FOUND' | 'BILL_BAD_QUERY' | 'BILL_EMPTY_RANGE'
    | 'BILL_GOALS_CORRUPT' | 'BILL_ACCOUNT_CORRUPT';
  constructor(code: BillFetchError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BillFetchError';
    this.code = code;
  }
}

export class BillPolicyError extends Error {
  readonly code:
    | 'POLICY_NO_MATCH' | 'POLICY_MISSING_SLOT' | 'POLICY_BAD_CATEGORY'
    | 'POLICY_BAD_AMOUNT' | 'POLICY_BAD_TIME' | 'POLICY_BAD_INPUT' | 'POLICY_CONFLICT';
  constructor(code: BillPolicyError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BillPolicyError';
    this.code = code;
  }
}
