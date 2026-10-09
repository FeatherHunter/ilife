/**
 * 词条层错误：坏输入一律 throw，绝不返空串／undefined 冒充正常（ADR-0004 §2）。
 *
 * 判据面是 `code` 与结构化字段：诊断文本是开发者面向的串，**不进词条表**
 * （词条表装的是显示文本）；调用方与门禁读 code／字段，不读 message 的字面。
 */

/** 词条层错误基类。 */
export class EntriesError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EntriesError';
    this.code = code;
  }
}

/** 缺词条：回退链走完仍没有这条 key（ADR-0004 §2：不许静默出 undefined）。 */
export class MissingMessageError extends EntriesError {
  /** 缺的是哪条 key。 */
  readonly id: string;
  /** 走过的回退链（按顺序，已去重）。 */
  readonly languages: readonly string[];
  constructor(id: string, languages: readonly string[]) {
    super(
      'ENTRIES_MISSING_MESSAGE',
      '缺词条「' + id + '」：回退链走完（' + languages.join(' → ') + '）都没有这条 key，'
      + '不回退成空串——请补词条，或换用词条表里有的 key。',
    );
    this.name = 'MissingMessageError';
    this.id = id;
    this.languages = languages;
  }
}

/** 插值缺参：模板里有 `{name}`，params 里没有这个 name（缺参抛错，不静默留空）。 */
export class MissingParamError extends EntriesError {
  /** 缺的是哪个参数名。 */
  readonly param: string;
  /** 出这条消息的模板（诊断用）。 */
  readonly template: string;
  constructor(param: string, template: string) {
    super(
      'ENTRIES_MISSING_PARAM',
      '消息插值缺参数「' + param + '」（模板：' + template + '）——缺参不静默留空。',
    );
    this.name = 'MissingParamError';
    this.param = param;
    this.template = template;
  }
}
