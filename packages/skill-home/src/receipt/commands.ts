// 票据凭证能力的命令声明（**权威源**，#800 新立）。加命令只改本文件加子功能文件。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runTicketQuery, runTicketWrite } from './ticket.js';

export const RECEIPT_COMMANDS: readonly HomeCommandSpec[] = [
  { kind: 'read', key: 'home.ticket.query', shape: 'list', title: '查购买记录', wakeWord: '查购买记录', example: 'home-cmd-read home.ticket.query --params \'{"kind":"purchase"}\'', run: runTicketQuery },
  { kind: 'write', key: 'home.ticket.write', title: '登记购买记录', wakeWord: '登记购买记录', example: 'home-cmd-read home.ticket.write --params \'{"kind":"purchase","op":"add","item_id":1,"date":"2026-09-21"}\'', run: runTicketWrite },
];
