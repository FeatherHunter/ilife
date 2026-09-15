#!/usr/bin/env node
/** 409 独立复核自设探针（只读 dist，不跑命令、不落盘、不碰库）。
 *
 * 盲区（被审脚本覆盖不到）：
 *  P1 · 最长匹配第二组：t409-wire.test.mjs 只回归“报销到账不落入记报销”，
 *       同构的“恢复备份不落入恢复”“初始化状态不落入初始化”无人断言。
 *  P2 · SKILL 侧 1:1：被审测试只断言 HELP 写卡 1:1；buildWriteWire 用 hits.find，
 *       SKILL 速查重行会被静默取首行而不断言变红。
 *  P3 · HELP 全局 census：findWriteScene 只在 write 域内找；16 词在全资产里是否
 *       恰各一张（决定“去 write 守卫”变异是红是绿）无人给出读数。
 * 自证牙齿（P4）：内存里造一例重复行，同一计数逻辑必须点名（不碰源码）。
 *
 * 入仓件：由 `.scratch/t409/review/t409-review-probe.mjs` 原样入仓（可复跑脚本，随复核证据入仓）。
 * 用法：node docs/skills/skill-bill/t409-复核-探针.mjs   # 全过 exit 0＋PROBE-RESULT
 */
import { buildHelpLookup, routeWakeword } from '../../../packages/skill-bill/dist/index.js';
import { WAKE_TABLE } from '../../../packages/skill-bill/dist/policy/index.js';
import { WAKE_ASSETS } from '../../../packages/skill-bill/dist/triggers/wake-assets.js';

const CANON = [
  '记支出', '记收入', '拍账单', '批量录入', '记退款', '记报销', '报销到账',
  '记借出', '记借入', '记收回', '记偿还', '记分期', '记一笔',
  '改记录', '撤销', '恢复',
];

let pass = 0;
let total = 0;
function check(name, cond, detail = '') {
  total += 1;
  if (cond) { pass += 1; console.log('OK ' + name); }
  else console.log('NG ' + name + (detail ? ' ｜ ' + detail : ''));
}

// P1 · 最长匹配第二组（恢复组＋初始化组）
try {
  const r1 = routeWakeword('恢复', { id: 1 });
  check('P1a 恢复→record.update/restore', r1.key === 'bill.record.update' && r1.params.op === 'restore', JSON.stringify(r1));
} catch (e) { check('P1a 恢复→record.update/restore', false, String(e)); }
try {
  const r2 = routeWakeword('恢复备份', { id: 1 });
  check('P1b 恢复备份→setup.run/restore', r2.key === 'bill.setup.run' && r2.params.op === 'restore', JSON.stringify(r2));
} catch (e) { check('P1b 恢复备份→setup.run/restore', false, String(e)); }
try {
  const r3 = routeWakeword('恢复恢复备份', { id: 1 });
  check('P1c 恢复恢复备份→setup.run（最长赢）', r3.key === 'bill.setup.run', JSON.stringify(r3));
} catch (e) { check('P1c 恢复恢复备份→setup.run（最长赢）', false, String(e)); }
try {
  const r4 = routeWakeword('初始化状态', { id: 1 });
  const r5 = routeWakeword('初始化初始化状态', { id: 1 });
  check('P1d 初始化状态组最长赢', r4.key === 'bill.setup.run' && r4.params.op === 'init-status' && r5.params.op === 'init-status', JSON.stringify(r4) + ' / ' + JSON.stringify(r5));
} catch (e) { check('P1d 初始化状态组最长赢', false, String(e)); }

// P2 · SKILL 侧 1:1（速查表＋口径层）
{
  const hits = buildHelpLookup();
  const dupSkill = CANON.filter((w) => hits.filter((h) => h.phrase === w).length !== 1);
  check('P2a SKILL速查16词各恰一行', dupSkill.length === 0, 'dup=' + JSON.stringify(dupSkill));
  const dupTable = CANON.filter((w) => WAKE_TABLE.filter((e) => e.phrase === w).length !== 1);
  check('P2b WAKE_TABLE16词各恰一条', dupTable.length === 0, 'dup=' + JSON.stringify(dupTable));
}

// P3 · HELP 全局 census（精确匹配，全资产口径）
{
  const off = CANON.filter((w) => WAKE_ASSETS.filter((s) => s.wake_word === w).length !== 1);
  check('P3 全资产16词各恰一张卡', off.length === 0, 'off=' + JSON.stringify(off));
}

// P4 · 牙齿自证（内存重复行必须被同一逻辑点名）
{
  const fake = [{ phrase: '记支出' }, { phrase: '记支出' }, { phrase: '恢复' }];
  const flagged = ['记支出', '恢复'].filter((w) => fake.filter((h) => h.phrase === w).length !== 1);
  check('P4 计数逻辑能点名重复行', flagged.length === 1 && flagged[0] === '记支出', JSON.stringify(flagged));
}

console.log('PROBE-RESULT ' + pass + '/' + total);
if (pass !== total) process.exit(1);
