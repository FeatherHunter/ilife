/** 配置体检这个只读命令的**技能入口装配**：把 `src/health.ts` 的报告包成唯一出口那行 envelope。
 *
 * 为什么这个 key 与三个配置命令同住 `cli/config.ts` 的旁边、而不进 `src/<能力>/commands.ts`：那套登记管的是
 * **唤醒词命令**（域表里的 key／形状／标题／示例），要算进 HELP 与唤醒词计数。体检是**设置页专用**的只读出口
 * （面板点一下才跑），没有唤醒词、不进 HELP，故按「一条命令的事实只住一处」与三个配置命令并列；
 * `cmd_read.ts` 在**进预检与分派层之前**拦下它（体检不该要求库目录已配——它要报的正是「库在哪、通不通」）。
 *
 * 判据与文案住在 `src/health.ts`；本件只做包封，不重写一个字。
 */
import { ENVELOPE_VERSION } from 'base-link-core';
import type { EnvelopeShape } from 'base-link-core';
import { buildBillHealthReport } from '../health.js';

/** 体检命令名（插件侧镜像同值，见 `packages/plugin-bill-ilife/src/bridge.ts`）。 */
export const HEALTH_CHECK_KEY = 'bill.config.check' as const;

/** 本技能的 envelope skill 名（与 `src/render/envelope.ts` 的 `createEnvelope({skill:'bill'})` 同值）。 */
const BILL_SKILL = 'bill' as const;

/** 是不是体检命令（分派层拦截用）。 */
export function isHealthCheckKey(key: string): boolean {
  return key === HEALTH_CHECK_KEY;
}

/** 跑一次体检，返回整行 envelope JSON（`data` 即那份报告）。 */
export function runHealthCheckKey(key: string): string {
  const report = buildBillHealthReport();
  const envelope = {
    version: ENVELOPE_VERSION,
    skill: BILL_SKILL,
    shape: 'detail' as EnvelopeShape,
    key,
    data: report,
  };
  return JSON.stringify(envelope);
}
