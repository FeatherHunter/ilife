/** #1198 · 出口的语言选择包装：未识别的语言走「预检」那一档（exit 1），不抛原始栈。
 *
 *  为什么单立一件：判定住 `base-link-core`（抛 `ConfigError` 是它对外的契约），而「这一档算哪个退出码」
 *  是出口自己的事。包装放这里，出口件只多一行调用——记账那件正被 #686 棘轮钉着（只许变短）。 */
import { ConfigError, resolveSkillLanguage } from 'base-link-core';
import type { ResolvedLanguage } from 'base-link-core';
import { CALORIE_CONFIG_STEM, CALORIE_CONFIG_DEFAULTS, CALORIE_CONFIG_RETIRED } from '../config.js';
import { fail } from '../shared/params.js';

/** 读配置 ＋ 解语言；未识别的值（argv 或配置文件）＝ exit 1 并原样带出报文（含可用语言）。 */
export function resolveLanguageOrFail(argv: readonly string[]): ResolvedLanguage {
  try {
    return resolveSkillLanguage({ stem: CALORIE_CONFIG_STEM, defaults: CALORIE_CONFIG_DEFAULTS, retired: CALORIE_CONFIG_RETIRED, argv });
  } catch (e) {
    if (e instanceof ConfigError) fail(1, e.message);
    throw e;
  }
}
