/** dsh-schedule-ilife 取数桥（P10 脚手架：纯 CLI 单轨）。
 *
 * 面板与跨技能只经 host.call 触发本桥，本桥只经 spawn 调技能包唯一出口
 * packages/skill-schedule/dist/cli/cmd_read.js（argv+JSON+exit，stdout 纯 envelope JSON 一行）。
 * 本文件不 import 任何技能实现（只读消费其 dist/CLI）；缺失阻断不返空：
 * CLI 缺席/非 0/非 JSON/回执 key 不符一律抛错，绝不返回空数组冒充正常。
 * 技能包不动（只读）；combos.yaml 不动。
 */
import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_PACKAGE = '@feather_wch/skill-schedule' as const;
export const SKILL_CLI = 'packages/skill-schedule/dist/cli/cmd_read.js' as const;
export const HOST_CALL_METHOD = 'ilife.schedule.read' as const;
export const MANAGER_PACKAGE = 'dsh-life-pack' as const;

export const MANAGER_MISSING_HINT =
  '总管缺席，请补装：dsh plugin add dsh-life-pack dsh-schedule-ilife（不许单卸总管）';

export class SkillBridgeError extends Error {
  readonly code: 'missing-cli' | 'fetch-failed' | 'bad-json' | 'key-mismatch';
  constructor(code: SkillBridgeError['code'], message: string) {
    super(message);
    this.name = 'SkillBridgeError';
    this.code = code;
  }
}

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

export function cliPath(): string {
  return join(repoRoot(), SKILL_CLI);
}

export function assertCliPresent(path?: string): void {
  const p = path ?? cliPath();
  try {
    accessSync(p, constants.R_OK);
  } catch {
    throw new SkillBridgeError('missing-cli', '技能出口缺失（先构建对应包）：' + p);
  }
}

/** host.call 侧处理函数：由 host 注册到 connection RPC，供面板调用。 */
export function handleHostCall(key: string, params: Record<string, unknown> = {}): unknown {
  return readViaCli(key, params);
}

/** 面板侧请求函数：只经 host.call，不直调技能实现。 */
export function requestViaHost(host: { call(method: string, args: unknown): Promise<unknown> }, key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return host.call(HOST_CALL_METHOD, { key, params });
}

/** 同步取数：spawn 技能 cmd_read，返回 envelope data（缺失阻断）。 */
export function readViaCli(key: string, params: Record<string, unknown> = {}): unknown {
  const bin = cliPath();
  assertCliPresent(bin);
  const node = process.execPath;
  const r = spawnSync(node, [bin, key, '--params', JSON.stringify(params)], { encoding: 'utf8' });
  if (r.error) throw new SkillBridgeError('fetch-failed', '出口 spawn 失败：' + (r.error as Error).message);
  if (r.status !== 0) {
    const tail = String(r.stderr ?? '').trim().split('\n').pop() ?? '';
    throw new SkillBridgeError('fetch-failed', '出口非 0（' + String(r.status) + '）：' + tail);
  }
  let env: { key?: unknown; data?: unknown };
  try {
    env = JSON.parse(String(r.stdout)) as { key?: unknown; data?: unknown };
  } catch {
    throw new SkillBridgeError('bad-json', '出口非 JSON');
  }
  if (!env || env.key !== key) throw new SkillBridgeError('key-mismatch', '出口回执 key 不符');
  if (env.data === null || env.data === undefined) throw new SkillBridgeError('fetch-failed', '缺失阻断取数，不返空：' + key);
  return env.data;
}
