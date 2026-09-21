// 空间能力的命令声明（**权威源**，#800 新立）。加命令只改本文件加子功能文件。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runLocationQuery, runLocationWrite } from './location.js';

export const SPACE_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.location.query', shape: 'list', title: '管位置', wakeWord: '管位置', example: 'home-cmd-read home.location.query', run: runLocationQuery },
  { kind: 'write', key: 'home.location.write', title: '管位置', wakeWord: '管位置', example: 'home-cmd-read home.location.write --params \'{"op":"manage","action":"add","path":"客厅/电视柜"}\'', run: runLocationWrite },
];
