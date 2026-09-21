/** #651 · 「卡路里HELP」路由回本命令（#343 门唯一登记例外的消除）。
 *
 * 票面（`gh issue view 651`）：`calorie.help.center` 的代表唤醒词「卡路里HELP」在机器路由上
 * 没有对应有命令可执行路由（幽灵词），该命令自己的有命令可执行词集里只有「看身材照HELP」；
 * #343 把它登记进 `WAKE_GATE_REGISTERED` 例外位未改词。维护者裁定方向 A：补路由＋同步冻结计数＋删登记行。
 *
 * 五条判据（读 `dist/` 现场，不写任何文件）：
 *  ① 精确路由：`routesFor('卡路里HELP')` 恰一条 exec，且键为 `calorie.help.center`；
 *  ② 首条稳定：该命令的首条可执行路由仍是「看身材照HELP」（order 17 在前，本票只末尾追加，
 *     `EXEC_ROUTE_BY_KEY` 与依赖首条的门不受影响）；
 *  ③ 新拟表在册：`NEW_KEY_ROUTES` 含本票记录（词／键／场景 09／exec／CLI 逐字）；
 *  ④ 门无需例外：该词对纯判据 0 违规（空登记表即过，不再需要 `WAKE_GATE_REGISTERED` 挂名）；
 *  ⑤ 查找面：派生别名表含该词，指回自己的键与 CLI（`calorie.help.lookup` 问得到）。
 *
 * 负向对照：本票实施前 ①③④⑤ 全红（精确路由空／新拟表无此词／纯判据报幽灵词／别名表无此词），
 * 实施后全绿；把本票记录删掉即回红（改坏必红的机械证明见门测试 ⑤，此处不重复跑 `--check`）。
 *
 * 运行（持锁，票 651）：先 `tsc -b packages/skill-calorie`，再
 * `node tooling/run-locked.mjs --ticket 651 -- node --test packages/skill-calorie/test/t651-代表词路由.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { checkWakeWords } from '../scripts/gen-cli.mjs';
import { loadDecls } from '../scripts/gen-routes.mjs';
import { NEW_WORD_TABLE } from '../dist/triggers/help-lookup.js';
import {
  EXEC_ROUTE_BY_KEY,
  NEW_KEY_ROUTES,
  routesFor,
} from '../dist/triggers/routing.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const WORD = '卡路里HELP';
const KEY = 'calorie.help.center';
const CLI = 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'';

test('#651 ① 精确路由：「卡路里HELP」到得了身材照 HELP 命令', () => {
  const hits = routesFor(WORD).filter((r) => r.kind === 'exec');
  assert.equal(hits.length, 1, '精确路由应恰一条 exec，实得 ' + hits.length + ' 条');
  assert.equal(hits[0].key, KEY, '该词没路由回本命令，实际到：' + hits.map((h) => h.key).join('|'));
});

test('#651 ② 首条稳定：该命令的首条可执行路由仍是「看身材照HELP」', () => {
  const first = EXEC_ROUTE_BY_KEY[KEY];
  assert.ok(first, KEY + ' 在可执行索引里没有入口');
  assert.equal(first.wakeWord, '看身材照HELP', '首条变了（依赖首条的门会被牵连）：' + first.wakeWord);
  assert.equal(first.cli, CLI, '首条 CLI 变了：' + first.cli);
});

test('#651 ③ 新拟表在册：本票记录逐字在 `NEW_KEY_ROUTES` 里', () => {
  const rec = NEW_KEY_ROUTES.find((r) => r.wakeWord === WORD);
  assert.ok(rec, '新拟表里没有「' + WORD + '」（改了声明要重跑 pnpm gen）');
  assert.equal(rec.key, KEY, '键走散：' + rec.key);
  assert.equal(rec.scene, '09', '场景走散：' + rec.scene);
  assert.equal(rec.kind, 'exec', '不是 exec 记录');
  assert.equal(rec.cli, CLI, 'CLI 走散：' + rec.cli);
});

test('#651 ④ 门无需例外：空登记表下该词 0 违规', async () => {
  const decls = await loadDecls();
  const r = checkWakeWords({
    entries: [{ from: 'photo', key: KEY, wakeWord: WORD }],
    decls,
    registered: [],
  });
  assert.deepEqual(r.violations.map((v) => v.entry.wakeWord), [], '仍是幽灵词（路由没补上？）');
  assert.deepEqual(r.stale, [], '空登记表不应有陈化');
});

test('#651 ⑤ 查找面：别名表含该词且指回自己的键与 CLI', () => {
  const hit = NEW_WORD_TABLE.find((e) => e.phrase === WORD);
  assert.ok(hit, '派生别名表里没有「' + WORD + '」（新拟记录没进表？）');
  assert.equal(hit.key, KEY, '别名指错键：' + hit.key);
  assert.equal(hit.cli, CLI, '别名 CLI 走散：' + hit.cli);
});
