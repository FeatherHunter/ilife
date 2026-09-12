# 票 #188 实施记录（内容资产入库：老骨架 → 仓内 typed const）

一句话：老骨架 yaml 原样入库 → 机器生成 `helpAssets.ts`（9 域／30 二级组／73 场景）→ 生成器带 `--check` → 摘要锁与双向对账锁**已接进包内门**。资产与生成物一律不读进上下文，全部 grep 定点读＋脚本断言（只印计数与布尔）。

## 1 事实源入库
- `Copy-Item 'D:\2Study\StudyNotes\SKILLS\居家管家\references\scenarios.yaml' 'packages/skill-home/src/help/scenarios.yaml'`（原样复制，未读进上下文）。
- 实测 **46267 字节／1283 行／sha256 `F80184CE…665A`**；源与副本同哈希=True；CRLF 照原样保留。
- 生成器只读仓内这份：`SRC_YAML` 写死包内路径＋`startsWith(PKG_DIR)` 断言；**无** `--src`／`--out`；仓外路径零残留（实测 0 命中）。

## 2 生成器（拆分后三件，都远在 350 行内）
- `scripts/gen-help-assets.mjs` **51 行**（薄 CLI：参数／`--check`／退出码／人话输出）。
- `scripts/lib/help-assets.mjs` **192 行**（读 yaml → 建形状 → 断言 → 渲染）。
- `scripts/lib/yaml-subset.mjs` **172 行**（极简 YAML 子集读取器；仓内无 yaml 依赖，实测 `js-yaml`／`yaml` resolve 均 NO）。
- 解码正确性：PyYAML 6.0.2 一次性 oracle 逐字段比对 **73 场景×8 字段＋9 域×4 字段 → 0 处不一致**（prompt 字符 6305/6305、JSON 12629/12629 字节）；探针跑完即删。
- 断言写法照 `packages/skill-bill/scripts/gen-wake-assets.mjs:99-118`：域 9／组 30／场景 73／三层 id 各自唯一／types 非空且全在词表内／status 全场同值／登记位只 link 且正好 3 条。

## 3 资产
- `packages/skill-home/src/help/helpAssets.ts`：**1164 行／43798 字节／sha256 `F61F49E7…E732`**；LF、无 BOM、末尾真换行（CR 计数 0）。
- 导出：`HELP_GROUPS`／`HELP_ASSETS`／`HELP_SCENE_BY_ID`／`HELP_ASSET_TOTAL`／`HELP_GROUP_COMMAND_PREFIXES` ＋ `HelpSceneAsset`／`HelpSubgroupAsset`／`HelpGroupAsset`／`HelpGroupCommands`／`HelpSceneType`。
- `node ../../node_modules/typescript/bin/tsc -b .`（typescript 5.9.2）**exit 0**，产出 `dist/help/helpAssets.js`＋`.d.ts`（38 行）——生成物能被包自己的 tsconfig 编译。
- **未接线到 `src/help/index.ts`**：汇总导出与 `src/render/` 的重名判定属票 6（#195 硬约束 6），本票不抢先占名；资产可直接从 `src/help/helpAssets.ts` 导入。

## 4 字段口径与出处
- 场景 `id`＝`scenario_id`；`title`＝`scenario_title`；`types`＝单值 `type` 按 `+` 切（顺序照原文、去重保留首次出现，实测 0 条含重复词）；二级组 `id`＝`<域id>_<序数>`、`label`＝`sub`；域顺序照 `domains` 列表、组内照出现序（注意：事实源里 `scenarios` 的域块次序与 `domains` 列表**不一致**，测试按此口径断言）。
- **icon 来源**：老 yaml 每个域**自带** `icon`（9 个齐全：🏠 🗺️ 👕 📊 📦 🧾 👨‍👩‍👧 🚀 🔗），逐字取用，**没有**另立图标表；`sm` 是老编号，资产不收。
- **types 词表（逐字，10 词）**：`采集` `查看` `结果` `向导` `批量` `校验` `选择` `过程` `回执` `录入`；出处 `packages/base-render/assets/help-template.html:1698-1709` 的 `var TYPE_DEFAULT = {…}`（实测该块 10 个键）。账单生成器只认 5 词＝模板表的子集，**以模板原文为准**；本骨架实际用到 5 个（采集／回执／查看／选择／向导）。

## 5 link 域登记位（本票定的落点，请复核）
- 组上写 `deprecated: true`（唯一一个）；该域 3 条场景 `prompt_template` 留**空串**（＝prompt 不迁）；域／3 个二级组／3 条场景仍在资产里，故 9／30／73 可自证。
- `status` 仍逐字取老 yaml（**73/73 空串**），**没**改写成 `"deprecated"`——票面要求「status 全场同值」，登记位改由组上字段承载。若要求写进 `status`：改生成器一处，同时放弃「全场同值」断言。

## 6 `--check` 实测（每次都有人话＋退出码）
- 一致态：`OK：…与生成结果字节一致（9 域／30 二级组／73 场景）`，**exit=0**（连跑两次均 exit 0）。
- 漂移态：改一个字后 `DRIFT：…（禁止手改；重跑不带 --check 即覆盖）`＋差异摘要（总行数＋首个不一致行截断样张），**exit=1**。
- 复原：重跑生成器 → sha 回到 `F61F49E7…E732`（True）。**拆分成三件后再重跑，sha 不变（True），`--check` 再 exit=0。**

## 7 锁与门
- 新用例 `packages/skill-home/test/help-assets.test.mjs`（10 用例全绿）：①事实源＋生成物 sha256 双摘要锁 ②`generate()` 重跑与盘上字节相等（＝「资产与事实源一致」不靠自觉）③形状 9/30/73＋三层 id 唯一＋types 在模板表内＋status 全场同值 ④逐字段回对事实源（域顺序／组内出现序／`scenario_id`／types 切分／prompt 逐字）⑤types 词表与模板 `TYPE_DEFAULT` 实测相等 ⑥link 登记位 ⑦与 `WAKE_TABLE` 双向对账 ⑧分组↔命令前缀对照 ⑨门接线自检 ⑩仓外路径零残留。
- **摘要重算方法**：资产头注释里落了一条 `node -e "…createHash('sha256')…readFileSync('src/help/helpAssets.ts')…"`；事实源用 `Get-FileHash`（同值见 §1）。
- **接进门**：`package.json` 的 `test` 由 `node --test ../../test/scaffold.test.mjs` 改成 `node --test test/help-assets.test.mjs ../../test/scaffold.test.mjs`（当时的洞＝**包级 `test` 串**不跑包内用例；CI 经仓根 `package.json` 的 test glob 仍会跑到本目录，更正见 §10 尾注）。按 test 串逐字实测：**tests 12／pass 12／fail 0，exit 0**。
- 另加 `gen:help-assets`／`gen:help-assets:check` 两条；**没接进 build**（改 build 链超本票范围）。包内其它用例（cli／policy／render／fetch／skill）仍要 `dist`，不进这把门，留给票 7／门禁票。

## 8 双向对账的差异（如实点名，断言是**等值**）
- 方向 A：资产 73 条唤醒词里 70 条在速查命中 ≥1；**3 条不命中＝link 登记位**（`联动总览`／`记到卡路里`／`记到记账`，只在口径层 `DEPRECATED_PHRASES` 里）。
- 方向 B：速查 91 条里 **75 条有落点、16 条无**；16 条写死在用例常量 `UNLANDED` 并分类：3 条 HELP 自指词（不进场景目录）＋5 条「改物品」卡附属词（补／减／废／借／修物品）＋4 条（盘物品／盘全部／查高频／查低频）＋2 条（看标签／合标签，票 13 裁定不独立成卡）＋2 条（推位置／找位置，票 13 裁定留在位置管理卡）。这 16 条之外任何漂移即红。

## 9 已超线（当场报）与未做
- **已超线，需要根据规则进行重构。** 原因：`scripts/gen-help-assets.mjs` 实测 **409 行 > 本包告警线 350**。拆法＝薄 CLI（51）＋实体（192）＋YAML 读取器（172）；**拆三件而非两件**：YAML 子集读取器接口只有一个函数（`parseScenarioYaml`）、实现厚（172 行），单列更贴铁律五「接口小、里面厚」，且两件方案会让实体件顶到 ~370 行再超线。拆完已重跑自证（§6／§7）。
- 告警线数字与数法、生成物单列、`cmd_read.ts` 741 行的归属，已落 `packages/skill-home/AGENTS.md`。
- 未做：不改 `SKILL.md`、不碰 `build-help.mjs`（与生成器的注入块冲突风险已知，责任方归票 9）；不 `git add`／不 commit。**目录**：新建了 `scripts/lib/` 这一层脚本助手目录（原因：拆分避免单件超线，见 §10 偏差 ①）；**未新建任何能力目录或域目录**。（原写「不新建目录」与实到不符，此处按审查 §七·1 更正。）

## 10 第五步·交付对账（计划 → 实到）

口径：**计划**＝票 12 件清单里归票 5 的那三件（`t195-structure-design.md:26`、`:61`、`:95`、`:98`）＋票 5 票面（`t188-body.md:5-7`）＋票 12 的前置项（本包告警线数字与数法落 `AGENTS.md`，`:66`）；**实到**＝盘上实测，行数用 `[System.IO.File]::ReadAllLines($p,[Text.Encoding]::UTF8).Count`（与审查同一把尺）。

| # | 计划（票 12／票 5 票面列的件） | 实到 | 判定 |
|---|---|---|---|
| 1 | 内容资产生成物 `src/help/helpAssets.ts` | 在盘 **1164 行**／43798 字节／sha `f61f49e7…e732`，件头标「禁手改」 | ✓ 对齐（生成物单列，见 `AGENTS.md`） |
| 2 | 生成器 `scripts/gen-help-assets.mjs`（含 `--check`） | 在盘 **51 行**；`--check` 一致态 exit 0／漂移态 exit 1 | ✓ 对齐（**另有 2 件偏差，见 ①**） |
| 3 | 资产锁 `test/help-assets.test.mjs`（摘要锁＋与 `WAKE_TABLE` 双向对账） | 在盘 **366 行／13 用例**（原 10 ＋整改 3：解析器 fail-closed ×2、唤醒词→命令 key 全表对账 ×1），实跑 13 pass／0 fail；测试件**不在行数管辖**（`structure.md:9` 的「不管」清单），故 366 不算超线 | ✓ 对齐 |
| 4 | 事实源 `src/help/scenarios.yaml`（票 12 记「既有·已入库·不动」） | 在盘 **1283 行**／46267 字节／sha `f80184ce…665a`，本票**未改** | ✓ 对齐 |
| 5 | 本包告警线数字与数法落 `packages/skill-home/AGENTS.md`（票 12 前置项） | 在盘 **25 行**：350＋数法／生成物单列／**数据事实源单列**／超线件台账（`cmd_read.ts`、`db.ts`） | ✓ 对齐 |
| 6 | 票 12 §1.2「`scripts.test` 改到能跑包内用例」 | 改成 `node --test test/help-assets.test.mjs ../../test/scaffold.test.mjs`，实跑 **15 pass／0 fail**；包内其余 5 件仍未进串 | △ 部分达成（见 ②） |
| 7 | 本票**不做**的件：`src/help/manifest.ts`／`helpFile.ts`／`output.ts`（票 6／7）、`test/help-delivery-*`／`help-exit-*`（票 7）、`SKILL.md`／`build-help.mjs`／`templates/help.html`／`src/index.ts`／`src/help/index.ts`／`cmd_read.ts` | 盘上均不在／未改（审查 §六已核实；本席整改亦未碰） | ✓ 对齐（未越界） |

**偏差逐条**

① **多出 2 件 ＋ 新建一个目录层级 `scripts/lib/`**：票 12 只列生成器一件（`:32`、`:95`），实到 3 件＝`scripts/gen-help-assets.mjs`（51）＋`scripts/lib/help-assets.mjs`（197）＋`scripts/lib/yaml-subset.mjs`（219）。原因：**原生成器单件 409 行 > 本包告警线 350**，按**编排方的指派**拆三件（两件方案会让实体件顶到 ~370 行再超线）。因此：**新建了 `scripts/lib/` 这一层脚本助手目录（原因：拆分避免超线）；未新建任何能力目录或域目录**——它是既有 `scripts/` 之下的一层脚本助手目录，与 `build-help.mjs` 同一层使用，对外形状、`files` 发包面（`package.json:16-20`）都没变。
② **`scripts.test` 只进了 2 件**：票 12 §1.2／`:62` 建议「显式列包内五件」。实到只加本票一件 ＋ 保留 `../../test/scaffold.test.mjs`——包内其余 5 件用例 import `dist/**`，跑前得先 `build`，把 `build` 绑进 `test` 超本票范围；这一格票 12 自己记的是留给门禁票。
③ **票 13 的字面偏离已追认、不计偏差**：`status: "deprecated"` 实落成组级 `deprecated: true`，编排方已转为票 6 验收项（`t187-decision.md:86`）。
④ **测试件不计超线**（留痕用，非偏差）：整改后锁用例 366 行，一度按口径被要求拆两份；经查 `docs/agents/structure.md:9`「不管：测试文件、页面模板、构建产物、生成的资产、文档」——测试件不在管辖，第 70／99 行的告警线（含「任何文件超过本包定的告警线」那句）在同一节限定之下**不适用于测试文件**，该要求已由编排方撤回，锁用例保持单件 366 行／13 用例。

**结论**：偏差 ① 由**编排方指派**、属「拆件避超线」的可接受偏差，唯一要跟的是这一层目录在关门前的结构复核里点一次名；偏差 ② 留给门禁票；**没有需要另立票的部分**。另按审查 §三 更正了 §7 的一句：真正的洞是「包级 `test` 串不跑包内用例」，不是「包内用例从不执行」（CI 经仓根 glob 会跑到本目录）。

