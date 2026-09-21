// 穿搭出行能力的命令声明（**权威源**，#800 新立）。加命令只改本文件加子功能文件。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runOutfitPick } from './outfit.js';
import { runTripManage } from './trip.js';

export const OUTFIT_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.outfit.pick', shape: 'list', title: '穿什么', wakeWord: '穿什么', example: 'home-cmd-read home.outfit.pick', run: runOutfitPick },
  { kind: 'write', key: 'home.trip.manage', title: '带物品', wakeWord: '带物品', example: 'home-cmd-read home.trip.manage --params \'{"mode":"pack","ids":[1]}\'', run: runTripManage },
];
