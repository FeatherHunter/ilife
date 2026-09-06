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
