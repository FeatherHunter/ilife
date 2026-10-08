// config 能力门：一个技能（或设置页）要读写自己的配置文件，只用这五件 ＋ 一个错误类。
// 里面怎么实现（受限子集解析器、备份、目录建立、语言选择）不出这个目录。
export { configPaths } from './dirs.js';
export { loadConfig, saveConfig, resetConfig } from './store.js';
export { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, isLanguageArg, parseLanguageArgs, resolveLanguage, resolveSkillLanguage } from './language.js';
export { ConfigError } from '../errors.js';
export type { ConfigPaths } from './dirs.js';
export type { LoadedConfig } from './store.js';
export type { LanguageArgs, LanguageTag, ResolvedLanguage, ResolveLanguageOptions, SkillLanguageOptions } from './language.js';
export type { ConfigRecord, ConfigGroup, ConfigValue } from './yaml.js';
