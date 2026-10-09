// config 能力门：一个技能（或设置页）要读写自己的配置文件，只用这四件 ＋ 一个错误类。
// 里面怎么实现（受限子集解析器、备份、目录建立）不出这个目录。
export { configPaths } from './dirs.js';
export { loadConfig, saveConfig, resetConfig } from './store.js';
export { ConfigError } from '../errors.js';
export type { ConfigPaths } from './dirs.js';
export type { LoadedConfig } from './store.js';
export type { ConfigRecord, ConfigGroup, ConfigValue } from './yaml.js';
