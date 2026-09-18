/** link-core 错误基类：坏输入一律 throw，永不返空数组冒充正常。 */
export class LinkCoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LinkCoreError';
    this.code = code;
  }
}

export class EnvelopeError extends LinkCoreError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('ENVELOPE_INVALID', message, options);
    this.name = 'EnvelopeError';
  }
}

export class RegistryError extends LinkCoreError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('REGISTRY_UNKNOWN_KEY', message, options);
    this.name = 'RegistryError';
  }
}

export class RunnerError extends LinkCoreError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('RUNNER_FAILED', message, options);
    this.name = 'RunnerError';
  }
}

/**
 * 配置文件出错：解析不了、键不认识、类型不对、读写失败、测试缺隔离。
 * `line` 是配置件里的行号（1 起，对不上行号时为 null）；人话报错里已经带上它，
 * 另给这个字段是为了让设置页能直接高亮那一行。
 */
export class ConfigError extends LinkCoreError {
  readonly line: number | null;
  constructor(code: string, message: string, options?: { cause?: unknown; line?: number | null }) {
    super(code, message, options);
    this.name = 'ConfigError';
    this.line = options?.line ?? null;
  }
}
