/** 桥工厂：把规格装成一只「取数桥」（策略可注入，机械动作只在这里实现一次）。
 *
 * 一次取数的流程固定：解析出口 → 断言存在 → 解析 node 二进制 → 异步 spawn →
 * 超时／起不来／非 0／回执解析／key 校验／缺数据，逐档映射成本家错误类的错误码。
 * 六家唯一不同的只有规格（技能包名、出口路径、错误类、魔键），故用工厂装配。
 */
import { MAX_STDOUT_BYTES, SPAWN_TIMEOUT_MS, type HostCallFace, type SkillCliBridge, type SkillCliSpec } from './contract.js';
import { createCliLocator } from './cli-locator.js';
import { resolveNodeBin, runSkillCli, type CliRunFailure } from './node-bin.js';

/** 回执信封里本件要用的两格。 */
interface SkillEnvelope {
  readonly key?: unknown;
  readonly data?: unknown;
}

/** 退出码非 0 时的人话：只取 stderr 最后一行（技能侧的报错就在那里）。 */
function lastLine(text: string): string {
  return String(text ?? '').trim().split('\n').pop() ?? '';
}

/** 取数失败 → 本家错误类的实例（错误码与改版前逐字同码）。 */
function failureError(spec: SkillCliSpec, failure: CliRunFailure, timeoutMs: number): Error {
  if (failure.kind === 'timeout') {
    return spec.makeError('fetch-failed', '出口超 ' + String(timeoutMs / 1000) + 's 未退，已杀掉（宿主非 node 时见 resolveNodeBin）');
  }
  if (failure.kind === 'output-too-large') {
    return spec.makeError('fetch-failed', '出口回执超过 ' + String(MAX_STDOUT_BYTES / (1024 * 1024)) + ' MiB 上限，已杀掉');
  }
  return spec.makeError('fetch-failed', '出口 spawn 失败：' + failure.message);
}

/** 造一只桥（spec 只读；返回对象的方法闭包同一份状态）。 */
export function createSkillCliBridge(spec: SkillCliSpec): SkillCliBridge {
  const locator = createCliLocator(spec);
  const spawnTimeoutMs = spec.spawnTimeoutMs ?? SPAWN_TIMEOUT_MS;

  async function readViaCli(key: string, params: Record<string, unknown> = {}): Promise<unknown> {
    // 魔键（版本行等）：不走子进程，直接同步读已装 package.json。
    const special = spec.specialReads;
    if (special && special.has(key)) {
      const read = special.get(key);
      if (read) return read();
    }
    const cli = locator.cliPath();
    locator.assertCliPresent(cli);
    const { bin, extraEnv } = resolveNodeBin();
    let outcome;
    try {
      outcome = await runSkillCli(bin, [cli, key, '--params', JSON.stringify(params)], { ...process.env, ...extraEnv }, spawnTimeoutMs);
    } catch (failure) {
      throw failureError(spec, failure as CliRunFailure, spawnTimeoutMs);
    }
    if (outcome.status !== 0) {
      throw spec.makeError('fetch-failed', '出口非 0（' + String(outcome.status) + '）：' + lastLine(outcome.stderr));
    }
    let envelope: SkillEnvelope;
    try {
      envelope = JSON.parse(outcome.stdout) as SkillEnvelope;
    } catch {
      throw spec.makeError('bad-json', '出口非 JSON');
    }
    if (!envelope || envelope.key !== key) throw spec.makeError('key-mismatch', '出口回执 key 不符');
    if (envelope.data === null || envelope.data === undefined) {
      throw spec.makeError('fetch-failed', '缺失阻断取数，不返空：' + key);
    }
    return envelope.data;
  }

  return {
    cliPath: locator.cliPath,
    assertCliPresent: locator.assertCliPresent,
    readViaCli,
    handleHostCall: readViaCli,
    requestViaHost(host: HostCallFace, key: string, params: Record<string, unknown> = {}): Promise<unknown> {
      return host.call(spec.hostCallMethod, { key, params });
    },
    hostCallMethod: spec.hostCallMethod,
    spawnTimeoutMs,
  };
}
