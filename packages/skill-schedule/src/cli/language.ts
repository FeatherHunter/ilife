/** #1198 · 出口的语言选择包装：未识别的语言走「预检」那一档（exit 1），不抛原始栈。
 *
 *  为什么单立一件：判定住 `base-link-core`（抛 `ConfigError` 是它对外的契约），而「这一档算哪个退出码」
 *  是出口自己的事。包装放这里，出口件只多一行调用——记账那件正被 #686 棘轮钉着（只许变短）。 */
import { ConfigError } from 'base-link-core';
import { resolveSkillLanguage } from 'base-link-core';
import type { ResolvedLanguage } from 'base-link-core';
import { SCHEDULE_CONFIG_STEM, SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_RETIRED } from '../config.js';

function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

/** 读配置 ＋ 解语言；未识别的值（argv 或配置文件）＝ exit 1 并原样带出报文（含可用语言）。 */
export function resolveLanguageOrFail(argv: readonly string[]): ResolvedLanguage {
  try {
    return resolveSkillLanguage({ stem: SCHEDULE_CONFIG_STEM, defaults: SCHEDULE_CONFIG_DEFAULTS, retired: SCHEDULE_CONFIG_RETIRED, argv });
  } catch (e) {
    if (e instanceof ConfigError) fail(1, e.message);
    throw e;
  }
}
