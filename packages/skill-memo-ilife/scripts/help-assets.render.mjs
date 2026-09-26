#!/usr/bin/env node
/** 备忘录 HELP 内容资产 · **渲染件**（票 #855 从 `gen-help-assets.mjs` 抽出来）。
 *
 * 只管「把域／场景数据渲成文件文本」：文件头注释（`header`）／域文件（`renderDomain`）／
 * 组装件（`renderSceneData`）。**不含任何规则**——规则住 `help-assets.data.mjs` 与
 * `help-assets.rewrite.mjs`，读事实源与断言住生成器；渲染需要的一切（事实源文件名、版本、两枚摘要、
 * 两个落点）由 `ctx` 传进来。这样切只为「一个件一件事」：产物逐字节不变由生成器 `--check` 判。
 */
import { join } from 'node:path';

const q = (s) => JSON.stringify(s);

/** 渲染上下文（`ctx`）：srcBase／version／legacyDigest／assetDigest／scenesDir／sceneDataPath。 */
function header(ctx, what, extra) {
  return ['/** #227 · 备忘录 HELP 内容资产 · ' + what,
    ' *',
    ' * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。',
    ' *    改内容＝改 `scripts/help-assets.rewrite.mjs`（30 场景重写表），再跑',
    ' *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。',
    ' *',
    ' * 事实源（仓外，全程只读）：老实物契约载荷 `' + ctx.srcBase + '`（老 `script/memo_render.py:527-599` 的产出）',
    ' *   与老 `references/scenarios.yaml` 顶层 `version`（＝' + ctx.version + '）。老侧**只出身份与路由**',
    ' *   （`id`／`wake_word`／`types`／`status`／域序／组序／别名挂载），两地逐条交叉复核 30/30。',
    ' * 摘要锁：老 30 条 sha256＝' + ctx.legacyDigest,
    ' *           资产 30 条 sha256＝' + ctx.assetDigest,
    ' *',
    ' * **#974 起三件内容**（`title`／`prompt_template`／`editable_fields`）**逐句重写**，规范＝卡路里标杆',
    ' * `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`（口径取其关闭后终态）：',
    ' *   1. 首行＝`请你加载技能 备忘录,执行唤醒词「<唤醒词>」。`——唤醒词本体逐字取自冻结词表，路由一行不动；',
    ' *   2. 正文只留「唤醒词与参数行没说到的信息」那一句人话；老骨架的 `请按以下格式填写你的参数:`／',
    ' *      `期望效果:` 标签／`无需参数,直接发送。` 一律不写（页面用控件有无表达「没有要填的」）；',
    ' *   3. 参数行＝`<标签>:{{<name>}}`，一行一参，标签＝字段 `label`（`required:false` 的带 `(选填)`）；',
    ' *      `editable_fields` 按 kind 闭集标注：本家 60 条落在 `text`／`select`／`date`，',
    ' *      `number`／`week` 零实例（缺省 kind＝`text`）；',
    ' *   4. `aliases` 12 条随场景挂载、渲染时剥离（裁决 5）；`status` 全空串（U1／U2／U3：HELP 是完整体）。',
    ' * 与老骨架的逐条对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`（#227 那一代）与',
    ' * `docs/skills/skill-memo-ilife/t974-实施-证据.md`（#974 这一代）。',
    ...(extra || []),
    ' */'].join('\n');
}

function renderDomain(ctx, g) {
  const scenes = g.subgroups.flatMap((s) => s.scenes);
  const head = header(ctx, '`' + g.id + '` 域（' + g.label + '）：' + g.subgroups.length + ' 个二级组／' + scenes.length + ' 个场景',
    [' *', ' * 本文件只给 1 个导出：`' + 'MEMO_HELP_' + g.id.toUpperCase() + '`＝该域**一个** `groups[]` 条目。']);
  const L = [head, 'export const MEMO_HELP_' + g.id.toUpperCase() + ' = {',
    '  id: ' + q(g.id) + ',', '  icon: ' + q(g.icon) + ',', '  label: ' + q(g.label) + ',', '  subgroups: ['];
  for (const sub of g.subgroups) {
    L.push('    {', '      id: ' + q(sub.id) + ',', '      label: ' + q(sub.label) + ',', '      scenes: [');
    for (const sc of sub.scenes) {
      L.push('        {', '          id: ' + q(sc.id) + ',', '          title: ' + q(sc.title) + ',',
        '          wake_word: ' + q(sc.wake_word) + ',', '          status: ' + q(sc.status) + ',',
        '          prompt_template: ' + q(sc.prompt_template) + ',',
        '          types: [' + sc.types.map(q).join(', ') + '],');
      if (sc.editable_fields) {
        L.push('          editable_fields: [');
        for (const f of sc.editable_fields) {
          L.push('            { name: ' + q(f.name) + ', label: ' + q(f.label) + ', value: ' + q(f.value) +
            ', hint: ' + q(f.hint) + ', required: ' + f.required + ', kind: ' + q(f.kind) +
            (f.options ? ', options: [' + f.options.map(q).join(', ') + ']' : '') + ' },');
        }
        L.push('          ],');
      }
      if (sc.aliases) L.push('          aliases: [' + sc.aliases.map(q).join(', ') + '],');
      L.push('        },');
    }
    L.push('      ],', '    },');
  }
  L.push('  ],', '};');
  return { path: join(ctx.scenesDir, g.id + '.ts'), text: L.join('\n') + '\n' };
}

function renderSceneData(ctx, groups) {
  const head = header(ctx, '组装件：8 个域文件 → 全量 `groups` ＋ 域级索引',
    [' *', ' * 本文件给 **2 个导出**：`MEMO_HELP_GROUPS`（全量 `groups`，给渲染件 `helpFile.ts` 直接吃）与',
      ' * `buildHelpSceneIndex()`（域级索引载荷，计数全派生、不写死）。`version` **随索引载荷出去**',
      ' * （`buildHelpSceneIndex().version`）：盘上 `src/help/helpFile.ts:181` 逐字就是',
      ' * `const version = String(buildHelpSceneIndex().version);` ⇒ 版本有单一来源、不必另开一个独立导出',
      ' * （复审 M2：独立 `MEMO_HELP_VERSION` 导出零消费者，已撤）。与票 5 §2.2 的「2 个导出」一致。',
      ' * 新件**不进** `src/help/index.ts` 转发（裁决 16）。']);
  const L = [head];
  for (const g of groups) L.push("import { MEMO_HELP_" + g.id.toUpperCase() + " } from './scenes/" + g.id + ".js';");
  L.push('', '/** 技能数据世代：**取自老 `references/scenarios.yaml` 顶层**（生成器读入，不是手写的第四份副本）。',
    ' *  不导出：只经 `buildHelpSceneIndex()` 的载荷对外（复审 M2）。 */',
    'const MEMO_HELP_VERSION = ' + q(ctx.version) + ';', '',
    '/** 8 域／13 二级组／30 场景（域顺序＝老 `categories` 顺序，**不是**场景出现顺序；组内序＝书写序）。 */',
    'export const MEMO_HELP_GROUPS = [');
  for (const g of groups) L.push('  MEMO_HELP_' + g.id.toUpperCase() + ',');
  L.push('];', '',
    '/** 域级索引载荷（`memo.help.lookup` envelope 的 `data`，`list` 形）：一行一域，计数全部派生。 */',
    'export function buildHelpSceneIndex() {',
    '  const items = MEMO_HELP_GROUPS.map((g) => {',
    '    let sceneCount = 0;',
    '    for (const sub of g.subgroups) sceneCount += sub.scenes.length;',
    '    return { id: g.id, icon: g.icon, label: g.label, subgroupCount: g.subgroups.length, sceneCount };',
    '  });',
    '  let subgroupTotal = 0;',
    '  let sceneTotal = 0;',
    '  for (const it of items) { subgroupTotal += it.subgroupCount; sceneTotal += it.sceneCount; }',
    '  return { items, total: items.length, subgroupTotal, sceneTotal, version: MEMO_HELP_VERSION };',
    '}');
  return { path: ctx.sceneDataPath, text: L.join('\n') + '\n' };
}
export { renderDomain, renderSceneData };
