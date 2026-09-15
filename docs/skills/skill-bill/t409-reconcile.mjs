#!/usr/bin/env node
/** 409 · 写入 16 词接线对账（正例 exit 0＋`RESULT 16/16`；反例 exit 非 0＋点名）。
 *
 * 用法：
 *   node docs/skills/skill-bill/t409-reconcile.mjs                      # 正例：16 行五段全对即 0
 *   node docs/skills/skill-bill/t409-reconcile.mjs --check-phrase <词>  # 反例探针：无接线词即非 0 并点名
 *
 * 只读 `packages/skill-bill/dist`（须先构建），不跑命令、不落盘、不碰库。
 */
import { buildWriteWire, routeWakeword } from '../../../packages/skill-bill/dist/index.js';

const argv = process.argv.slice(2);

if (argv[0] === '--check-phrase') {
  const word = argv[1] ?? '';
  let hit = false;
  try {
    routeWakeword(word, { id: 1 });
    hit = buildWriteWire().some((r) => r.phrase === word && r.reason === '');
  } catch {
    hit = false;
  }
  if (hit) {
    console.log('PHRASE-OK：' + word);
    process.exit(0);
  }
  console.log('PHRASE-NO-WIRE：' + word);
  process.exit(2);
}

const rows = buildWriteWire();
for (const r of rows) {
  console.log(
    (r.reason === '' ? 'OK ' : 'NG ')
    + r.phrase + ' → ' + r.key + ' ' + JSON.stringify(r.params)
    + ' ｜ SKILL[' + r.shape + '] ' + r.cli
    + ' ｜ HELP[' + (r.helpSceneId === '' ? '缺卡' : r.helpSceneId) + ']'
    + (r.reason === '' ? '' : ' ｜ REASON：' + r.reason),
  );
}
const ok = rows.filter((r) => r.reason === '').length;
console.log('RESULT ' + ok + '/' + rows.length);
if (ok !== rows.length || rows.length !== 16) process.exit(1);
