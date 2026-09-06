/** T6 #25 · 跨技能只读：调技能互联读外部技能数据（B 真相源：只取数不合并）。
 * 缺失一律 { ok:false, data:[] } 阻断，永不以空数组冒充正常。
 */
import { spawnSync } from 'node:child_process';
import { FetchError } from './errors.js';

export interface SkillEnvelope {
  ok: boolean;
  skill?: string;
  domain?: string;
  data: unknown[];
  error?: string;
  meta?: unknown;
}

export interface ReadSkillOptions {
  /** 技能互联命令（argv 数组，默认未配置 → 直接阻断） */
  command?: string[];
  skill: string;
  domain: string;
  from: string;
  to: string;
  timeoutMs?: number;
  spawn?: (cmd: string[], timeoutMs: number) => { stdout: string; stderr: string; error?: string };
}

function defaultSpawn(cmd: string[], timeoutMs: number): { stdout: string; stderr: string; error?: string } {
  try {
    const r = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8', timeout: timeoutMs });
    return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error ? String(r.error) : undefined };
  } catch (e) {
    return { stdout: '', stderr: '', error: e instanceof Error ? e.message : String(e) };
  }
}

/** 读外部技能域数据；命令缺失/超时/非 JSON 一律阻断包（ok:false）。 */
export function readSkill(opts: ReadSkillOptions): SkillEnvelope {
  const { skill, domain, from, to, timeoutMs = 30000 } = opts;
  if (!opts.command || opts.command.length === 0) {
    return { ok: false, skill, domain, data: [], error: '技能互联命令未配置，跨读阻断' };
  }
  const cmd = [...opts.command, '--skill', skill, '--domain', domain, '--from', from, '--to', to];
  const run = opts.spawn ?? defaultSpawn;
  const r = run(cmd, timeoutMs);
  if (r.error) {
    return { ok: false, skill, domain, data: [], error: `技能互联读取 ${skill}.${domain} 失败: ${r.error}` };
  }
  try {
    const env = JSON.parse(r.stdout || r.stderr);
    if (typeof env.ok !== 'boolean') throw new Error('无 ok 字段');
    return { ...env, data: Array.isArray(env.data) ? env.data : [] };
  } catch {
    return { ok: false, skill, domain, data: [], error: `技能互联输出解析失败: ${(r.stdout || r.stderr).slice(0, 200)}` };
  }
}

/** 跨读断言：ok 为 false 即抛 FetchError（T4 取数层统一错误），杜绝空数组静默当正常。 */
export function requireOk(env: SkillEnvelope): asserts env is SkillEnvelope & { ok: true } {
  if (!env.ok) throw new FetchError(`跨技能读取被阻断: ${env.error ?? '未知错误'}`);
}
