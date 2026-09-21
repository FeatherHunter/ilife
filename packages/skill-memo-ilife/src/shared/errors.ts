// 取数/口径错误：坏输入与缺失一律 throw，永不返空数组冒充正常。
export class MemoFetchError extends Error {
  readonly code:
    | 'MEMO_DB_MISSING' | 'MEMO_DB_UNREADABLE' | 'MEMO_NOTE_CORRUPT'
    | 'MEMO_NOTE_NOT_FOUND' | 'MEMO_BAD_QUERY'
    | 'LARK_UNAVAILABLE' | 'LARK_NOT_LOGGED_IN' | 'LARK_DENIED' | 'LARK_TIMEOUT' | 'LARK_BAD_RESPONSE'
    /** #661：远端调用到了但那一趟没成（非 0 退出／回执缺标识）——与「连不上」分开记，回执里才分得出 unavailable 与 failed。 */
    | 'LARK_TASK_FAILED';
  constructor(code: MemoFetchError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MemoFetchError';
    this.code = code;
  }
}

export class MemoPolicyError extends Error {
  readonly code:
    | 'POLICY_NO_MATCH' | 'POLICY_MISSING_SLOT' | 'POLICY_BAD_CATEGORY'
    | 'POLICY_BAD_REMINDER' | 'POLICY_BAD_INPUT';
  constructor(code: MemoPolicyError['code'], message: string) {
    super(message);
    this.name = 'MemoPolicyError';
    this.code = code;
  }
}
