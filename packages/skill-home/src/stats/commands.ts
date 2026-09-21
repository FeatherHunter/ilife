// 统计能力的命令声明（**权威源**，#800 新立）。加命令只改本文件加子功能文件。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runStatsOverview, runStatsAlert } from './stats.js';

export const STATS_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.stats.overview', shape: 'stat', title: '统物品', wakeWord: '统物品', example: 'home-cmd-read home.stats.overview', run: runStatsOverview },
  { kind: 'read', key: 'home.stats.alert', shape: 'list', title: '查闲置', wakeWord: '查闲置', example: 'home-cmd-read home.stats.alert --params \'{"kind":"idle"}\'', run: runStatsAlert },
];
