// 物品能力的命令声明（**权威源**，#800 新立）。
//
// 加一条命令只改本文件加它那个子功能文件；`src/cli/` 里的索引与分派层一行不动。
// 键名与出参形状冻结（render 的 `HOME_KEY_SHAPES` 由生成器从本声明合成，不手写第二份）。
// 写声明不写 `shape`（写命令一律 receipt，唯一定义地在生成器合成的 `cli/keys.ts`）。

import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runItemSearch } from './search.js';
import { runItemDetail } from './detail.js';
import { runItemAdd } from './add.js';
import { runItemUpdate } from './update.js';
import { runTagQuery, runTagWrite } from './tag.js';
import { runInventoryRound, runInventoryRecords } from './inventory.js';

export const ITEM_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.item.search', shape: 'list', title: '查物品', wakeWord: '查物品', example: 'home-cmd-read home.item.search --params \'{"name":"牛奶"}\'', run: runItemSearch },
  { kind: 'read', key: 'home.item.detail', shape: 'detail', title: '看物品', wakeWord: '看物品', example: 'home-cmd-read home.item.detail --params \'{"id":1}\'', run: runItemDetail },
  { kind: 'write', key: 'home.item.add', title: '录物品', wakeWord: '录物品', example: 'home-cmd-read home.item.add --params \'{"name":"牛奶","category_id":1,"location":"客厅/冰箱"}\'', run: runItemAdd },
  { kind: 'write', key: 'home.item.update', title: '改物品', wakeWord: '改物品', example: 'home-cmd-read home.item.update --params \'{"id":1,"op":"move","new_location":"卧室/衣柜"}\'', run: runItemUpdate },
  { kind: 'read', key: 'home.tag.query', shape: 'list', title: '看标签', wakeWord: '看标签', example: 'home-cmd-read home.tag.query', run: runTagQuery },
  { kind: 'write', key: 'home.tag.write', title: '合标签', wakeWord: '合标签', example: 'home-cmd-read home.tag.write --params \'{"op":"merge","from":"旧","to":"新"}\'', run: runTagWrite },
  { kind: 'write', key: 'home.inventory.round', title: '盘点', wakeWord: '盘点', example: 'home-cmd-read home.inventory.round --params \'{"op":"round"}\'', run: runInventoryRound },
  { kind: 'read', key: 'home.inventory.records', shape: 'list', title: '盘点记录', wakeWord: '盘点记录', example: 'home-cmd-read home.inventory.records', run: runInventoryRecords },
];
