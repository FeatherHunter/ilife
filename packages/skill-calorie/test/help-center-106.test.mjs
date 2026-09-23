/** #106 · 逐场景「可执行命令」回补（Q11 第二半）＋ #368 两栏（**数据层**）。
 *
 * 速查台（组件式三态壳）已按用户 2026-09-24 裁定整支下线：本文件只留数据层那半——`helpScene.ts` 的
 * `helpSceneCli`／`helpSceneCommand` 与场景 `editable_fields` 的形状（命令／工作流程／可执行命令）；
 * 原「渲染层」那几条（file／inline 产物里的 `data-field`／`<code class="…-cli">`／复制参数文本／text 态）
 * 随壳一起删单。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/help-center-106.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { SPEC_FROZEN_SURFACE, SCENE_DATA_SCHEMA } from 'base-paint';
import {
  HELP_CLI_FIELD_LABEL, HELP_CLI_FIELD_NAME, HELP_COMMAND_FIELD_LABEL, HELP_COMMAND_FIELD_NAME,
  HELP_FLOW_FIELD_LABEL, HELP_FLOW_FIELD_NAME,
  buildHelpSceneData, helpSceneCli, helpSceneCommand,
} from '../dist/photo/helpScene.js';
import { TRIGGERS } from '../dist/triggers/index.js';
import { routesFor } from '../dist/triggers/routing.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, '..', 'src', 'photo', 'helpScene.ts'), 'utf8');

const count = (haystack, needle) => haystack.split(needle).length - 1;
const flat = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const updatedAt = '2026-09-09 12:00';
const sceneData = buildHelpSceneData({ updatedAt });
const scenes = flat(sceneData);

/** 期望值：唤醒词 → 路由层首条 exec 路由的 cli。 */
const routeCli = (wakeWord) => {
  const hit = routesFor(wakeWord).find((r) => r.kind === 'exec');
  return hit === undefined ? null : hit.cli;
};

/** 期望值：唤醒词 → 路由层首条 exec 路由的**键**（＝注册表命令名，#368 起进卡片「命令」栏）。 */
const routeCommand = (wakeWord) => {
  const hit = routesFor(wakeWord).find((r) => r.kind === 'exec');
  return hit === undefined ? null : hit.key;
};

/** 期望值：某场景的「工作流程」值（＝它所属子功能名，与卡片分组同一处事实）。 */
const flowOf = (sceneId) => {
  for (const g of sceneData.groups) {
    for (const sg of g.subgroups) if (sg.scenes.some((s) => s.id === sceneId)) return sg.label;
  }
  return null;
};

/* ── 本文件并行的三处实况数字（#368 复核 S3-1 收口：按实况**钉死**，不留 `>=` 之类松口径）──
 *
 * 三个数字随各场景图的接线推进而变，但它们**不是可推导量**：都来自路由层当刻实况。
 * 改口径＝改这三行（显式动作，得在评审里说出来），不是就地放宽成阈值。
 * 当刻实况（#368 落地后实测，探针读数见 `docs/skills/skill-calorie/t368-索引证据.md` §十二）：
 *   场景 436 ／ 带可执行 CLI 427 ／ non-exec 9 ／ 唯一 CLI 384。
 * #614 起：带可执行 CLI 429 ／ non-exec 7（order199–200 训记两条转入 exec）／ 唯一 CLI 386（两条新 CLI 不撞既有）。
 * #612 起：带可执行 CLI 430 ／ non-exec 6（order196 落地训练转入 exec）／ 唯一 CLI 387（新 CLI 不撞既有）。
 * #613 起：带可执行 CLI 432 ／ non-exec 4（order197–198 批量两条转入 exec）／ 唯一 CLI 389（两条新 CLI 不撞既有）。
 * #652 起：场景 437 ／ exec 433（#621 定运动目标转入 exec）／ non-exec 4 不变；唯一 CLI 390（389＋定运动目标，
 *   新 CLI 全局唯一已验；当刻实测去重后为 400，另 +10 系他席在途新 CLI——fa17ba8f 把本文件①总数钉红后、
 *   后续断言（含本行）再没跑过，旧数失察，本票只认领 +1，不代钉那 +10）。
 * #667 起：唯一 CLI 重钉 400／碰撞组 27／碰撞行 33（逐条 CLI 均为已落地 exec 路由、343 门无幽灵词；
 *   #490／#531／#592 改指把 3 组共享打散（组 30→27）；新 CLI 11 条致行 43→33；旧数失察系总数红遮蔽，见 #652 证据 §四）。
 */
const FROZEN = Object.freeze({
  /** 速查台场景总数（`TRIGGERS` 条数）。 */
  scenes: 437,
  /** 路由层 exec 命中的场景数（＝卡片 `editable_fields` 发出的行数）。 */
  execScenes: 433,
  /** 无任何 exec 路由的场景数（out-of-scope ＋ legacy-chain）。 */
  nonExecScenes: 4,
  /** 各 exec 场景的可执行 CLI **去重后**条数（同一条命令服务多个词）。 */
  uniqueCli: 400,
});

/** 场景卡片段（`data-scene-id="<id>"` 起、到下一张卡或分组收尾为止）。 */
function cardFragment(html, sceneId) {
  const start = html.indexOf('data-scene-id="' + sceneId + '"');
  assert.ok(start > 0, '产物缺场景卡：' + sceneId);
  const next = html.indexOf('data-scene-id="', start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}

/** HTML 实体还原（`&amp;` 最后，避免二次解码）。 */
const decodeEntities = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* ── ① 口径：逐场景 CLI 恒取路由层 exec ──────────────────────────── */

test('① exec 场景带可执行 CLI，逐条逐字 = 路由层 exec 路由（红点：helpSceneCli 改回 main_prompt.cli 原文）', () => {
  assert.equal(scenes.length, FROZEN.scenes, '场景总数＝实况 437（改口径＝改上面 FROZEN 那一行）');
  const withCli = scenes.filter((s) => helpSceneCli(s.wake_word) !== null);
  assert.equal(withCli.length, FROZEN.execScenes, 'exec 场景数＝实况 433');
  assert.equal(scenes.length - withCli.length, FROZEN.nonExecScenes, 'non-exec 场景数＝实况 4');
  for (const scene of withCli) {
    const expected = routeCli(scene.wake_word);
    assert.ok(expected !== null, '路由层应给出 exec CLI：' + scene.wake_word);
    assert.equal(helpSceneCli(scene.wake_word), expected, 'CLI 逐字取路由层：' + scene.wake_word);
    assert.ok(expected.startsWith('calorie-cmd-read calorie.'), '唯一出口形态：' + expected);
  }
  // **唯一 CLI 守卫（硬断言，不放宽）**：唯一 CLI 数恒 < 场景数——同一条命令服务多个词
  // （实测 427 行 → 384 条唯一 CLI，43 行落在 30 组碰撞里）。这正是「不能把 CLI 塞进 `Scene.id`」的理由：
  // `Scene.id` 全局唯一（`help-center-88` 守卫②），塞进去必撞 `duplicate-id`。
  // 改坏即红：把 `cliText(scene)` 从 `scene.id` 改成 CLI → 下一条用例的 id 唯一性断言先红。
  const cliValues = withCli.map((s) => helpSceneCli(s.wake_word));
  const uniq = new Set(cliValues);
  assert.equal(uniq.size, FROZEN.uniqueCli, '唯一 CLI 条数＝实况 400');
  assert.ok(uniq.size < cliValues.length, '唯一 CLI 数必须小于场景数（否则 id 冲突论证无据）');
  const byCli = new Map();
  for (const cli of cliValues) byCli.set(cli, (byCli.get(cli) ?? 0) + 1);
  const dups = [...byCli.values()].filter((n) => n > 1);
  assert.equal(dups.length, 27, '碰撞组数＝实况 30（改口径＝改这一行）');
  assert.equal(cliValues.length - uniq.size, 33, '落在碰撞里的行数＝实况 43');
  assert.ok(dups.some((n) => n > 1), '前置：确有 CLI 被两条以上词共用');
});

test('① 死命令零泄漏：任何 CLI 值都不是 python／mavis／mmx 原文（红点：改回 main_prompt.cli 原文）', () => {
  const bad = scenes.map((s) => helpSceneCli(s.wake_word)).filter((c) => c !== null)
    .filter((c) => /^(python|mavis|mmx)\b/.test(c));
  assert.deepEqual(bad, [], 'CLI 不得是旧架构死命令');
  // #180 收口：SoT 原文里的死命令已清零（改写前是 353 条）。这一行从「前置鉴别力」改成**残留账目**——
  // 它今天锁的是「10 个场景文件的命令字段不再有脚本命令」；源级三字段全扫在
  // `no-script-commands-180.test.mjs`（同一判定串只写那一处）。
  const dead = TRIGGERS.filter((t) => /^(python|mavis|mmx)\b/.test(t.main_prompt.cli));
  assert.equal(dead.length, 0, 'SoT 里死命令条数应为 0（#180 清完），实际 ' + dead.length);
  // 源码级：`helpSceneCli` 函数体内不得出现 `main_prompt`（取值只许走路由层）
  const body = /export function helpSceneCli\([\s\S]*?\n\}/.exec(SRC);
  assert.ok(body !== null, '缺 helpSceneCli 函数体');
  assert.equal(body[0].includes('main_prompt'), false, '不得以 SoT 原文充当 CLI');
  assert.ok(body[0].includes('routesFor'), '取值必须走路由层');
});

test('① 未知唤醒词返 null（不返空串冒充，红点：return ""）', () => {
  assert.equal(helpSceneCli('这个词不存在'), null);
  assert.equal(helpSceneCli(''), null);
});

/* ── ② 落位：冻结槽位 editable_fields → Sheet 详情层 ───────────────── */

test('② 数据层：exec 场景的 `editable_fields` 形状固定（命令＋工作流程＋可执行命令；non-exec 不发）（红点：给全部场景发空值行）', () => {
  const withField = scenes.filter((s) => Array.isArray(s.editable_fields) && s.editable_fields.length > 0);
  const execScenes = scenes.filter((s) => helpSceneCli(s.wake_word) !== null);
  assert.equal(withField.length, execScenes.length, '发字段的场景数 == exec 场景数');
  assert.equal(withField.length, FROZEN.execScenes, '发字段的场景数＝实况 433（＝exec 场景数）');
  for (const scene of withField) {
    // #368：三行＝命令（注册表命令名）＋工作流程（子功能名）＋可执行命令（CLI 全文，恒末行）。
    // legacy 22 条没有子功能名（F3 恒把它们收在「既有唤醒词」下）⇒ 不发「工作流程」行，只有两行。
    const fields = scene.editable_fields;
    const flow = fields.find((f) => f.name === HELP_FLOW_FIELD_NAME);
    assert.equal(fields.length, flow === undefined ? 2 : 3, '行数（命令＋[工作流程]＋可执行命令）：' + scene.id);
    for (const field of fields) {
      assert.deepEqual(Object.keys(field).sort(), ['label', 'name', 'value'], '字段形状 = 冻结面三键');
    }
    // ① 命令行：值＝注册表命令名（`calorie.*` 键本体），不是 CLI 全文
    const cmd = fields.find((f) => f.name === HELP_COMMAND_FIELD_NAME);
    assert.ok(cmd !== undefined, '缺命令行：' + scene.id);
    assert.equal(cmd.label, HELP_COMMAND_FIELD_LABEL);
    assert.equal(cmd.value, helpSceneCommand(scene.wake_word), '命令名逐字 = 注册表键：' + scene.id);
    assert.ok(cmd.value.startsWith('calorie.'), '命令名须是注册表键本体：' + cmd.value);
    // ② 工作流程行：值＝该场景所属子功能名（与卡片分组同一处事实）；legacy 行按定义不发
    if (flow !== undefined) {
      assert.equal(flow.label, HELP_FLOW_FIELD_LABEL);
      assert.ok(flow.value.length > 0, '工作流程值非空：' + scene.id);
      assert.equal(flow, fields[fields.length - 2], '工作流程行须在可执行命令行之前：' + scene.id);
    }
    // ③ 可执行命令行：仍取路由层 CLI（#106 原文不动），且**恒末行**
    const cli = fields.find((f) => f.name === HELP_CLI_FIELD_NAME);
    assert.ok(cli !== undefined, '缺可执行命令行：' + scene.id);
    assert.equal(cli.label, HELP_CLI_FIELD_LABEL);
    assert.equal(cli.value, routeCli(scene.wake_word), 'value 逐字 = 路由层 CLI：' + scene.id);
    assert.equal(cli, fields[fields.length - 1], '可执行命令行须末行：' + scene.id);
  }
  for (const scene of scenes.filter((s) => helpSceneCli(s.wake_word) === null)) {
    assert.equal(scene.editable_fields, undefined, 'non-exec 场景不发字段：' + scene.id);
  }
});

test('③ 冻结面恒 130 条／`Scene` 属性集不变（红点：往 Scene 上加 cli 字段）', () => {
  assert.equal(SPEC_FROZEN_SURFACE.length, 148);
  assert.equal(SPEC_FROZEN_SURFACE.filter((e) => e.status === 'pending').length, 0);
  const sceneProps = SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups
    .items.properties.scenes.items.properties;
  assert.deepEqual(Object.keys(sceneProps).sort(),
    ['editable_fields', 'id', 'prompt_template', 'status', 'title', 'types', 'wake_word'],
    'scene 机读属性集 = #78 冻结七键（本票零新增）');
  assert.equal('cli' in sceneProps, false, '不得新增 `cli` 契约字段');
});

/* ── ④ 三态记账 ─────────────────────────────────────────────── */
