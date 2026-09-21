// 快递购物能力的命令声明（**权威源**，#800 新立）。加命令只改本文件加子功能文件。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runShoppingQuery, runShoppingWrite } from './shopping.js';

export const EXPRESS_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.shopping.query', shape: 'list', title: '查快递', wakeWord: '查快递', example: 'home-cmd-read home.shopping.query --params \'{"kind":"express"}\'', run: runShoppingQuery },
  { kind: 'write', key: 'home.shopping.write', title: '改购物清单', wakeWord: '改购物清单', example: 'home-cmd-read home.shopping.write --params \'{"op":"list-add","name":"鸡蛋","quantity":2}\'', run: runShoppingWrite },
];
