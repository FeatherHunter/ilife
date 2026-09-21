// 家庭协作能力的命令声明（**权威源**，#800 新立）。加命令只改本文件加子功能文件。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runCareQuery, runCareWrite } from './care.js';

export const FAMILY_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.care.query', shape: 'list', title: '借用', wakeWord: '借用', example: 'home-cmd-read home.care.query --params \'{"kind":"borrow"}\'', run: runCareQuery },
  { kind: 'write', key: 'home.care.write', title: '首次使用', wakeWord: '首次使用', example: 'home-cmd-read home.care.write --params \'{"kind":"member","name":"妈妈"}\'', run: runCareWrite },
];
