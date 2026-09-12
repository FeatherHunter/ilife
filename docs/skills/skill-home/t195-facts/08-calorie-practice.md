# 卡路里技能 HELP 内容资产实况（t195 取证）

只读 `packages/skill-calorie/`。每条给 `文件:行号`；第 6 节「居家现状」取自 `packages/skill-home/` 文件清单（仅列名，未深读）。

## 1 内容资产形态

- **机器生成的 typed TS module**（不是 JSON、不是包内 `.html`）：`packages/skill-calorie/src/triggers/wake-assets.ts`，**4733 行 / 255362 字节**。
- 自述口径：「本文件由实物 JSON 机器生成（逐字 `JSON.stringify`），禁止手工改词；改词即改 SoT」（`wake-assets.ts:17`）；规模 **10 组 / 54 子组 / 436 场景**（`:3`）。
- 具名导出 `WAKE_GROUPS`（`:45`）／`WAKE_ASSETS`／`SCENE_BY_ID`（`:9`）；结构 `WakeGroupAsset{id,icon,label,subgroups}` → `WakeSubgroupAsset{id,label,scenes}` → `WakeSceneAsset{id,title,wake_word,status,prompt_template,types?}`（`:22-43`）。
- HTML 壳**不在本包**：真壳已搬到共享层 `base-paint/help-shell`（`src/render/helpShell.ts:1-17` 明写「模板唯一真相源已搬家」），模板源 `packages/base-render/assets/help-template.html`（`src/render/helpFile.ts:17`）。包内 `templates/help.html`（40 行）只是六个小模板之一。

## 2 生成器与摘要锁

- **有生成器**：`scripts/build-help.mjs`（237 行）。挂法 `package.json:35` → `"build": "tsc -b && node scripts/build-help.mjs"`。
- 它**只重写 SKILL.md 的标记块**，不碰 wake-assets.ts：标记 `<!-- HELP-AUTO-START -->` / `<!-- HELP-AUTO-END -->`（`:8-9`），缺标记即抛（`:224-228`）；输入 `CALORIE_COMBOS`（`:6` → `dist/cli/keys.js`）；产出「唤醒词 | key | shape | 例」四列表（`:209-221`）。
- 生成期硬断言：新键必须自带可执行示例，落 `default` 即抛（`:203-206`）。防「自己写自己比」：仅 `argv[1] === 自身` 才写盘（`:238-245`）。
- **本包无 `--check`、无 sha256 锁**（`scripts/*.mjs` grep `--check` 零命中；`package.json` 只有 `build`／`test` 两支脚本）。真锁在根目录：`test/calorie-triggers.test.mjs:41-48` 逐条 16 位 sha256 对冻结 `test/calorie-sot.snapshot.json`（`:17-26`）。
- **wake-assets.ts 的生成器不在本包**（`scripts/` 仅有 build-help / check-examples / migrate-calorie 三支）。

## 3 分组命名（10 组 id 原词）

- 组级 `"id"`：`home`(`:47`)、`diet`(`:162`)、`weight`(`:920`)、`exercise`(`:1555`)、`workout`(`:1982`)、`goal`(`:2345`)、`body_detail`(`:2620`)、`body_photo`(`:2781`)、`profile`(`:2912`)、`analysis`(`:2977`)。
- `label`（同址 +2 行）：主页／饮食／体重／运动／健身计划／目标管理／身体细节／身材照片／基础信息／分析。
- **与命令命名空间 `calorie.xxx.*` 不是同一套词**。对上的 5 个：`diet`(`src/cli/keys.ts:21`)、`weight`(`:31`)、`exercise`(`:35`)、`goal`(`:47`)、`profile`(`:44`)。
- 对不上的 5 个（给对照）：
  - `body_detail` → 空间词是 `body`：`calorie.body.measure-add`（`keys.ts:54`）；
  - `body_photo` → 空间词是 `photo`：`calorie.photo.add`（`keys.ts:38`）；
  - `workout` → 无 `calorie.workout.*`：落在 `calorie.view.exercise-review`（`keys.ts:113`）；
  - `analysis` → 无 `calorie.analysis.*`：落在 `calorie.view.*`（如 `calorie.view.health` `keys.ts:79`）；
  - `home` → 半对：`calorie.view.home`（`keys.ts:67`）＋ `calorie.today`（`keys.ts:66`）。
- 另有第三套词：SoT `CATEGORIES` **13 条**（`src/triggers/index.ts:19-33`）——多了 `food_lib`／`general`／`review`，且 diet 展示名是「饮食记录」，与本表 10 组不一致。

## 4 速查与 HELP 的关系：**各一份**（三件产物 / 两套内容源）

- ① SKILL.md「速查表」＝`CALORIE_COMBOS`（`src/cli/keys.ts:64-141`，100 键 `{shape,title}`）＋**手写**桥表 `REPR`（唤醒词，`scripts/build-help.mjs:12-95`）＋`exampleFor`（`--params` 例，`:97-207`）。**手写，不从资产派生**。
- ② HELP 页面（`calorie.help.center` 缺省）＝**资产直转**：`src/cli/cmd_read.ts:820-832` → `renderHelpFileHtml(buildHelpFileData(now))` → `base-paint/help-shell`（`src/render/helpFile.ts:53-73`，`HelpFileData` 5 键 `{skill_name,title,subtitle,contact,groups}` `:34-40`）。落点名 `卡路里_HELP`（`helpFile.ts:26`）。
- ③ 全量速查台（`mode=file|inline|text`）＝**运行期投影** `TRIGGERS`(436) → `buildHelpSceneData()`（`src/render/helpCenter.ts:1-11`；调用 `cmd_read.ts:839-851`），落点名 `卡路里_速查台`。同一键出两种产物，靠 `mode` 分流（`cmd_read.ts:797-804`）。
- 于是：HELP 内容资产（`WAKE_GROUPS`）与 SoT `TRIGGERS`（`src/triggers/index.ts:48-59`，手写 10 个 `scene-*.ts`）是**同一个 436 的两份物理载体**，靠 `test/wake-assets-133.test.mjs:90-94`「wake 多重集相等」对齐。
- 字段形状差：combo ＝ `{shape,title}`（无唤醒词、无分组）；asset scene ＝ `{id,title,wake_word,status,prompt_template,types?}`（无 key、无 shape）。两处之间没有派生关系，只有手写映射：`REPR` 与 `HELP_EXEC_OVERRIDES`（`src/triggers/help-lookup.ts:84-90`）。

## 5 门里锁了什么

- `package.json:36` 的 `test` ＝ `node --test ../../test/scaffold.test.mjs ../../test/calorie-triggers.test.mjs test/fetch-t6.test.mjs`（**只这 3 个文件**，包内 40+ 个 test 文件大多不在其中）。
- **锁「内容资产 ↔ HELP 页面一致」的用例存在**：`test/calorie-triggers.test.mjs`
  1. `HELP 速查覆盖全部唤醒词与别名`（`:52-58`）：断言每条 `TRIGGERS` 的 `wake_word` 与每个 `alias` 在 `HELP_LOOKUP` 命中 ≥1，且 `记身材照` 恰 3 条；
  2. `总数 436 条无增删`（`:30-32`）：`TRIGGERS.length === snapshot.total`；
  3. `逐条 sha 一致`（`:41-48`）：逐条 16 位 sha256 对齐 `calorie-sot.snapshot.json`。
- `test/scaffold.test.mjs:10-13` 只是转发 `tooling/write-snapshot.mjs --check`（仓级快照门，非 HELP 资产）；`test/fetch-t6.test.mjs:37+` 全是取数／导入／校验，与 HELP 无关。
- **AUTO 块新鲜度门不在 `test` 里**：`scripts/check-examples.mjs:92` 断言 `renderSkillMd(text) === text` 并逐行真跑 CLI（exit 0），由根 `package.json:20` 的 `help:examples:check` 调用；`test/skill-t11.test.mjs:51` 是同类断言。两者都不在包 `test` 脚本内。

## 6 照抄到居家会缺什么（逐条）

1. **场景 SoT 容器**：卡路里是 `src/triggers/` ＋ 10 个手写 `scene-*.ts` ＋ `TRIGGERS`（`index.ts:48-59`）。居家包**无 `src/triggers/` 目录**，只有 `src/policy/wakewords.ts`——派生件没有上游。
2. **机器生成的资产副本 ＋ 其生成器**：卡路里有 `wake-assets.ts`（生成器不在包内），居家无对位文件；居家 `scripts/build-help.mjs` 只做标记块注入（13-28 行）。
3. **冻结快照与摘要锁**：居家无 `*sot*.snapshot.json` 对位件；其 `test/skill.test.mjs:35` 只比 AUTO 块自身，不锁资产。
4. **共享 HELP 壳消费层**：卡路里走 `base-paint/help-shell` ＋ 5 键 JSON（`helpFile.ts:22-40`、`helpShell.ts:22-30`，空分组抛 `missing-data`→exit 5）；居家无 `src/render/helpFile.ts` 对位件，须确认共享壳可直接接。
5. **交付管线落点与命名**：卡路里 `cmd_read.ts:820-832` 给定 `target:{dir:…/HELP_HTML_DIR_NAME, stem:'卡路里_HELP'}` 交 `deliverHtml`（`wx` 独占＋`EEXIST` 递补＋绝对路径回执，`helpFile.ts:1-6`）；居家需对位一套。
6. **三张手写桥表**：`REPR`（唤醒词）、`exampleFor`（可跑例）、`HELP_EXEC_OVERRIDES`（legacy→可执行）。**且卡路里也没有门保证 `REPR` 的词属于资产**——照抄会继承同一缺口。
7. **两条口径要先裁定**：元词豁免（HELP／帮助／速查台不入资产，`test/wake-assets-133.test.mjs:96-99`）与 legacy 22 条「无 `types`／无 `key`」（`:75-87`，不补空数组）。
8. **id 口径先选一套**：卡路里同时存在 4 套词——组 id(10)、`CATEGORIES`(13)、命令命名空间(100 键)、场景号(10)；居家照抄前须先定「HELP 组 id 是否等于命令命名空间词」，否则会重新踩 `body_detail`／`body_photo` 这类对不上。
