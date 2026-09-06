// 取数/口径错误：坏输入与缺失一律 throw，永不返空数组冒充正常。
export class ScheduleFetchError extends Error {
  readonly code:
    | 'SCHEDULE_DB_MISSING' | 'SCHEDULE_DB_UNREADABLE' | 'SCHEDULE_RECORD_CORRUPT'
    | 'SCHEDULE_RECORD_NOT_FOUND' | 'SCHEDULE_PLAN_NOT_FOUND' | 'SCHEDULE_BAD_QUERY'
    | 'SCHEDULE_EMPTY_RANGE'
    | 'LARK_UNAVAILABLE' | 'LARK_NOT_LOGGED_IN' | 'LARK_DENIED' | 'LARK_TIMEOUT' | 'LARK_BAD_RESPONSE';
  constructor(code: ScheduleFetchError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ScheduleFetchError';
    this.code = code;
  }
}

export class SchedulePolicyError extends Error {
  readonly code:
    | 'POLICY_NO_MATCH' | 'POLICY_MISSING_SLOT' | 'POLICY_BAD_CATEGORY'
    | 'POLICY_BAD_DATE' | 'POLICY_BAD_TIME' | 'POLICY_BAD_COVERAGE' | 'POLICY_BAD_INPUT';
  constructor(code: SchedulePolicyError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SchedulePolicyError';
    this.code = code;
  }
}
