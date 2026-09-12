# 票 #188 整改记录（子代理 F10 · 审查 B 四条 ＋ A 席追加两条）

只碰点名件：`packages/skill-home/AGENTS.md`、`packages/skill-home/scripts/lib/*.mjs`、`packages/skill-home/test/help-assets.test.mjs`、`docs/skills/skill-home/t188-impl-notes.md`。

## ① 第五步交付对账（责任在编排方）
- 改了什么：`t188-impl-notes.md` 末尾新增 `## 10 第五步·交付对账`（计划 7 行 vs 实到 7 行逐行对齐 ＋ 偏差 ①②③ ＋ 结论）；§9 那句「不新建目录」改成准确说法：「新建了 `scripts/lib/` 这一层脚本助手目录（原因：拆分避免超线）；未新建任何能力目录或域目录」；按审查 §三 顺手更正 §7 的「包内用例从不执行」。
- 实测：`[System.IO.File]::ReadAllLines($p,[Text.Encoding]::UTF8).Count` → helpAssets.ts 1164、scenarios.yaml 1283（46267 字节／sha `f80184ce…665a`）、AGENTS.md 25、test 366、gen 51、help-assets.mjs 197、yaml-subset.mjs 219。`node --test test/help-assets.test.mjs ../../test/scaffold.test.mjs` → tests 15／pass 15／fail 0。
- 未做与理由：偏差 ①（多出 `scripts/lib/` ＋2 件）本就是**编排方指派**的拆件（原生成器 409 行 > 350），故不再回问用户点头；偏差 ②（`scripts.test` 只进 2 件）包内其余件要先 `build`，留门禁票。

## ② `AGENTS.md` 两份超线／数法盲区（含 A-③ 裁定）
- 改了什么：超线件台账补 `src/fetch/db.ts`（434 行，超 84）＝**归属另立票（不在本图 #183）**；数法节补「**数据事实源单列**：`src/help/scenarios.yaml`（1283 行）是老骨架原样副本，长度由内容决定、人无法靠重构缩短，与生成物同样**不计入手写代码告警线**；但改动它必须重跑生成器并更新摘要锁」；补一行「`yaml-subset.mjs` 是 fail-closed 解析器，事实源要改写法必须先扩解析器」；按 A 席裁定补「改事实源后**必须**跑 `pnpm gen:help-assets`；忘了会被 CI 的锁拦下」＋「`--check` **不进** `build` 链」的理由（与重跑对账用例同一个断言＋`build` 链已被 `build-help.mjs` 占用）。
- 实测：`AGENTS.md` 21 行 → **25 行**；`test` 里「生成器不进 build」那条断言保留（用例 13 全过）。
- 未做与理由：不把 `--check` 接进 `build`（编排方裁定＝不进）。

## ③ 收窄 `scripts/lib/help-assets.mjs` 导出面（铁律五）
- 改了什么：12 个导出 → **4 个**，逐个「谁在用」：`generate`（薄 CLI 落盘／`--check` 的唯一入口）／`PKG_DIR`（测试算包内路径、断言输入源在包内）／`SRC_YAML`（测试读事实源＋摘要锁）／`OUT_TS`（测试读生成物＋摘要锁）。`yaml-subset.mjs` 仍 1 个：`parseScenarioYaml`（它的独立模块，测试直接 import）。
- 收回内部的：`EXPECT`／`TYPE_WORDS`／`GROUP_COMMAND_PREFIXES`／`buildGroups`／`sceneTypes`／`assertShape`／`renderAsset`（全是内部生产件，无外部用者）；期望值搬进测试**自持**（`EXPECT_SHAPE`／`TYPE_WORDS`／`GROUP_COMMAND_PREFIXES`），**不从被测代码读**——改由「生成物里的字面量」（`HELP_GROUP_COMMAND_PREFIXES` ＋ `HelpSceneType` 联合类型）与「模板原文 `TYPE_DEFAULT`」两侧交叉锁定。
- 实测：`Select-String '^export'` → help-assets.mjs 4 条（:23／:25／:27／:189）、yaml-subset.mjs 1 条（:139）。
- 未做与理由：没把 `EXPECT` 之类留成导出（保住「逐字段对事实源」那条对账并不需要它们外放）；测试文件 366 行（91 条 key 全表占大头）——测试件不在行数管辖（`structure.md:9`）。

## ④ 解析器 fail-closed（B 席最重）＋ A-② 对账锁 key
- 改了什么（④）：`yaml-subset.mjs` 原 `:162` 的静默跳过改成**结构性禁止**——只有 `html:`／`variants:` 两棵不收子树内部允许缩进 >2；其余一律带行号抛错：块标量「|」「>」、锚点／别名／tag、多文档 `---`／`...`、非空流程集合（只认空集合字面量 `{}`／`[]`）、tab 缩进、缩进 ≥3 的行、子树之外的嵌套块、记录内重复键、裸键（无值）。
- 实测报错样例：`THROW: 第 8 行：块标量（「|」）本子集不支持，请改写成流程标量或单行标量`（样本第 8 行是 `  prompt: |`）。
- 改了什么（A-②）：新增用例把口径层 91 条「唤醒词 → 命令 key」**全表**钉住（`WAKE_KEY_TABLE`，照文件出现序），不再只比 phrase。
- 反例自证：把 `src/policy/wakewords.ts:29` 的「录物品」key 改指 `home.item.search` → 用例 `与速查表 WAKE_TABLE 对账「唤醒词 → 命令 key」全表：词还在但 key 被改指，也必须红` 变红，报 `「录物品」的命令 key 变了（改口径层请同步本表）`，tests 13／pass 12／fail 1；随后按字节复原，`wakewords.ts` sha256 回到 **`4defaf7521e987d9a05758f42b55860fe5fffd63b8ac79fd5384625b147f15e3`**（＝整改前原值，`git status` 对该件无改动）。
- 复跑：`node --test test/help-assets.test.mjs` → **tests 13／pass 13／fail 0**（原 10 条全在）；`node scripts/gen-help-assets.mjs --check` → `OK：…与生成结果字节一致（9 域／30 二级组／73 场景）`，**exit 0**（生成物 sha `f61f49e7…e732` 未变）。
- 未做与理由：没把 PyYAML oracle 留成仓内可复跑用例（审查 §五·4 的另一半，属另一棒）；没碰生成物 `helpAssets.ts`、事实源 `scenarios.yaml`、`base-render`／`skill-chef`／`skill-schedule`／`tooling`。

## ⑤ 编排方来回留痕：拆测试件的要求已撤回（**测试件不适用告警线**）
- **编排方曾要求拆分测试件并报超线；经查 `docs/agents/structure.md:9`「不管测试文件」，该要求无据，已撤回；测试件不适用本包告警线**（锁用例保持单件 **366 行／13 用例**；曾按该要求拆出的 `test/help-assets-parser.test.mjs` 与 `package.json` 的两文件 `test` 串均已回退，回退后 `test/help-assets.test.mjs` 实测 **366 行／22017 字节**＝拆分前逐字节同值，`git diff` 对 `package.json` 无新增改动）。
- 结论（供后人）：`structure.md:9` 的「不管」清单＝**测试文件／页面模板／构建产物／生成的资产／文档**；本包 `AGENTS.md` 的「生成物单列」「数据事实源单列」正是这条清单在本包的落地表述；**台账只登记管辖内的源码件**——现只有 `src/cli/cmd_read.ts`（741 行）与 `src/fetch/db.ts`（434 行）两件。已把这句写进 `packages/skill-home/AGENTS.md`（数法节末行）。
- 回退后复跑：`node --test test/help-assets.test.mjs` → tests 13／pass 13／fail 0；`node --test test/help-assets.test.mjs ../../test/scaffold.test.mjs` → tests 15／pass 15／fail 0；`node scripts/gen-help-assets.mjs --check` → exit 0。
