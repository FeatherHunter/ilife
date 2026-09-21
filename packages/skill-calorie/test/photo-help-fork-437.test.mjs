/** #437 · HELP 双生 prompt 合并口径（wake-assets 与 scene-09 分叉）。
 *
 *  票面判据：**两条 HELP 生成线合到同一口径——同一场景的 prompt 只有一处定义**。
 *  本件把这条判据钉成门：缺省 HELP 大文件（`buildHelpFileData` → `WAKE_GROUPS` 路线）里
 *  scene 09 那十条的 `prompt_template` 必须**逐字等于 SoT**（`SCENE_09_PHOTO`）。
 *
 *  改前实测（2026-09-16）：十条**逐条不同**（10/10），且 #345 写的流程句「动笔前请先出预检确认页」
 *  在缺省 HELP 里 0 命中 —— 即默认交付的 `卡路里_HELP_<时间戳>.html` 读不出「先出哪张过程型页」。
 *  本文件的断言在改前必红（负向证据即「把 `withScene09Prompts` 摘掉」）。
 *
 *  运行：先 `pnpm --filter skill-calorie build`，再
 *       `node --test packages/skill-calorie/test/photo-help-fork-437.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SCENE_09_PHOTO } from '../dist/triggers/scene-09-photo.js';
import { buildHelpFileData, renderHelpFileHtml } from '../dist/photo/helpFile.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

/** 缺省 HELP 数据里 scene 09（`body_photo` 组）的场景表：`id → prompt_template`。 */
function scene09PromptsOf(data) {
  const group = data.groups.find((g) => g.id === 'body_photo');
  assert.ok(group !== undefined, '缺省 HELP 数据缺 `body_photo` 组');
  const scenes = group.subgroups.flatMap((sg) => sg.scenes);
  return new Map(scenes.map((s) => [s.id, s.prompt_template]));
}

test('缺省 HELP 大文件：scene 09 十条 prompt 与 SoT 逐字一致（分叉已合，改前 10/10 不一致）', () => {
  const data = buildHelpFileData(new Date('2026-09-16T12:00:00'));
  const byId = scene09PromptsOf(data);
  assert.equal(SCENE_09_PHOTO.length, 10, 'SoT 应有 10 条');
  assert.equal(byId.size, 10, '缺省 HELP 的 body_photo 组应有 10 个场景，实得 ' + byId.size);
  for (const t of SCENE_09_PHOTO) {
    assert.ok(byId.has(t.key), '缺省 HELP 缺场景 ' + t.key);
    assert.equal(byId.get(t.key), t.prompt_template,
      '场景 ' + t.key + ' 的 prompt 与 SoT 不一致（分叉复发）');
  }
});

test('端到端：缺省 HELP 的整壳 HTML 里读得出「先出哪张过程型页」', () => {
  const html = renderHelpFileHtml(buildHelpFileData(new Date('2026-09-16T12:00:00')));
  assert.match(html, /动笔前请先出预检确认页/, '缺省 HELP 里读不出「先出哪张过程型页」（分叉复发）');
  assert.match(html, /calorie\.view\.photo-log-wizard/, '预检确认页的落点没进缺省 HELP');
  assert.match(html, /动手前请先出候选页/, '删照那条的候选页流程句也没进缺省 HELP');
});
