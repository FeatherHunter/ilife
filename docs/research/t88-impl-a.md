# #88 实施 A 段证据（S1 数据模型 ＋ S2 壳落地 ＋ S3 三守卫）

> 票：wayfinder 地图 #63 / 票 **#88《HELP 速查台重建：取 F3 并回补 F1／F2 独有能力》** · 本段＝**实施 A**（方案 v2 的 S1／S2／S3，**不含 S4**）。
> 依据：`docs/research/t88-plan.md`（v2 正本）／`.scratch/orchestrator/t88-acceptance.md`（A1–A8 冻结）／`.scratch/orchestrator/t88-rework-order-1.md`（R1-1…R1-14）／`docs/research/t88-review-red.md`（PASS 85 临界）／`docs/research/t88-review-blue.md`（PASS 89）／`docs/research/t88-baseline/BASELINE.md`（门禁唯一基准，HEAD `90128d8`）。
> 纪律：`.scratch/` 被 gitignore（`.gitignore:5`）→ 本文件 ＋ `t88-probe-impl-a.mjs` 是**入仓正本**，现场日志在 `.scratch/t88/run-*.log`（复跑命令见 §10）。

## 0. 提交与文件清单

| # | commit | 内容 |
|---|---|---|
| 1 | `8bb13a9` | `feat(88): S1 数据模型＋S2 壳落地（三态同源）＋ 实施 A 段探针 44/44` |
| 2 | `d7a0492` | `test(88): S3 三守卫 ＋ S1／S2 冻结断言（23/23 绿）＋ R-cond-7 id 轴子集` |
| 3 | `92b9cfd` | `docs(88): R-cond-3/4/5/6 落实（方案状态口径／探针判据／六标记口径／指针改入仓）` |
| 4 | 本文件所在提交 | `docs(88): 实施 A 段证据（A1–A8／R-cond-1…8／门禁／变异／台账 L-01…L-19）＋ changeset` |

| 路径 | 归属 | 说明 |
|---|---|---|
| `packages/skill-calorie/src/render/helpCenter.ts`（新，339 行） | 本段声明 | S1 数据模型 ＋ S2 三态壳 |
| `packages/skill-calorie/src/render/index.ts`（+7 行，**仅加导出**） | 本段声明 | 出口面（无其它改动） |
| `packages/skill-calorie/test/help-center-88.test.mjs`（新，267 行） | 本段声明 | S3 三守卫 ＋ S1／S2 冻结断言（23 用例） |
| `docs/research/t88-probe-impl-a.mjs`（新，144 行） | 本段声明 | 断言式实施探针（44/44）＋ F3 逐条对账 ＋ 样本生成 |
| `docs/research/t88-plan.md`／`t88-probe-rework1.mjs`／`t88-probe-shell3.mjs` | 本段声明 | R-cond-3／4／5／6 修正 |
| `.changeset/t88-help-center.md`（新） | 本段声明 | 变更集 |
| `.scratch/t88/**` | 本段声明 | 现场日志／变异备份／渲染样本（gitignore） |

**未改**（按派单禁区自检，`git show --stat` 逐提交核对）：`src/cli/cmd_read.ts`／`src/cli/keys.ts`／`templates/*.html`／`packages/plugin-*`／其余 5 技能／`packages/base-render/**`（**零改动**）／`packages/skill-calorie/SKILL.md`。

## 1. A1–A8 逐条对表

| # | 怎么满足（本段内） | 证据（`file:line`／实测） |
|---|---|---|
| **A1** 数据模型 10／54／436、id 唯一 | `buildHelpSceneData()` 运行期派生自 `TRIGGERS`（436 条）；`HELP_GROUPS` 十组（F3 序／label／图标）＋`HELP_SUBFUNC_ORDER` 七分类＋`HELP_LEGACY_CATEGORY`；子功能 id `{group}_{n}` 索引派生 | `helpCenter.ts:47`（HELP_GROUPS）／`:63`（SUBFUNC_ORDER）／`:142`（buildHelpSceneData）；实测 10／54／436、id 436/436、子功能 id 54/54、types 329·79·6·22、分组子功能数 `[3,9,8,5,6,3,4,4,3,9]`；测试 `help-center-88.test.mjs:44,51,62,70`；探针 `t88-probe-impl-a.mjs:32`（`RESULT: 44/44 fails=0`） |
| **A2** 复用冻结壳、不新增契约面 | 恒走 `renderHelpShell`（`base-render/src/help.ts:675` 冻结签名），只提供 `sceneData`＋`assets`；**base-render 零改动**；冻结面 130 条 implemented／0 pending 由测试钉死 | `helpCenter.ts:326`（renderHelpCenterHtml）／`:237`（helpCenterAssets 恒取 `COPY_RUNTIME_JS`＋`buildStyleSheet().css`）；测试 `:142`（130／0）；file 态实测 436 卡／54 子功能／1308 复制按钮；`git show --stat 8bb13a9` 无 base-render 路径 |
| **A3** 三守卫 | ① 六标记逐个 0＋泛化 0＋`report.markers` 六键；② 数据层＋HTML 层唯一＋人为重复抛 `duplicate-id`；③ `COPY_RUNTIME_JS === buildSharedHelpersJs()`＋剥 helpers 后三串 0＋源码级零复制通道 | 测试 `:182,192,198`（①）／`:213,221,231`（②）／`:244,250,261`（③）；探针 `:72,79,91` |
| **A4** 门禁 | 四门逐条 exit 0；`pnpm test` 判据＝**具名失败集新增 0**（canonical 三轮） | §2（`GATE_BUILD=0`／`GATE_BOUNDARIES=0`／`GATE_SNAPSHOT=0`／`GATE_PUBLISH_PRE=0`；三轮 `新增=0`） |
| **A5** 变异自证 ≥3 处 src | **4 处 src 级**（S1 数据层／S2 壳层 ×2／S3 守卫）×红→还原→绿＋sha256；另 1 处探针级 | §3 |
| **A6** 证据入仓＋可复跑 | `docs/research/t88-impl-a.md`（本文件）＋`t88-probe-impl-a.mjs`（断言式、末行 `RESULT: n/m`）＋修正后的 2 个探针；全部受 git 跟踪 | `git ls-files docs/research/t88-*`；`RESULT: 44/44`／`17/17`／`26/26`／`6/6` |
| **A7** 路径所有权 | 只写 §0 声明的路径；`git add` 逐条具名（无 `-A`／`.`）；逐提交 `git status --short` 自检 | 4 个 commit 的 `git show --stat` 全在声明路径内 |
| **A8** 并发禁区 | 本段**未触** `buildSharedHelpersJs`／`style.ts`（S4 才动，与 #91／#121 严格串行）；`helpCenter.ts` 只**消费**产出 | `git show --stat` 无 `packages/base-render/**`；`t88-acceptance.md:26` 的 S4 面未开工 |

## 2. 门禁实测（全部持锁 `D:\ilife\.scratch\locks\gate.lock`）

| 门 | 命令 | exit | 关键行 |
|---|---|---|---|
| ① | `pnpm build` | **0** | `GATE_BUILD=0`（无 `error TS`） |
| ② | `pnpm boundaries` | **0** | `GATE_BOUNDARIES=0`（`boundaries: PASS`） |
| ③ | `pnpm snapshot:check` | **0** | `GATE_SNAPSHOT=0` |
| ④ | `pnpm publish:pre` | **0** | `GATE_PUBLISH_PRE=0`（`check-publish --pre：PASS`） |
| 靶向 | `node --test packages/skill-calorie/test/help-center-88.test.mjs` | **0** | `tests 23 / pass 23 / fail 0`（`GATE_TARGETED=0`） |
| 探针 | `node docs/research/t88-probe-impl-a.mjs` | **0** | `RESULT: 44/44 fails=0` |
| 探针 | `node docs/research/t88-probe-contract.mjs` | **0** | `RESULT: 17/17 fails=0` |
| 探针 | `node docs/research/t88-probe-rework1.mjs` | **0** | `RESULT: 26/26 fails=0`（R-cond-4 修后由 21/21→26/26） |
| 探针 | `node docs/research/t88-probe-rework2.mjs` | **0** | `RESULT: 6/6 fails=0` |
| 测试门 | canonical `pnpm test` ×3 | **1（既有红）** | 三轮逐轮 `tests 1040 / pass 1015 / fail 25`（基线 1017／991／26：+23＝本票新测全绿，fail 差 1 属**抖动组成**差异——判据以具名集合新增 0 为准，不以计数为准） |
| delta | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t88/after-<n>.log` | **0** | 三轮均 `base=34 after=29 新增=0 消失=5` |
| delta（并集） | `node .scratch/t88/union-compare.mjs after-{1,2,3}.log` | **0** | `rounds=3 base=34 union=29 新增=0 消失=5`（R-cond-8） |
| 白名单未改 | `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` | — | **0 行**（机械证据，R-cond-8） |
| 事故自检 | 每轮后 `git status --short -- packages/skill-calorie/SKILL.md` | — | 三轮均空（无 `Bin … -> …`，事故票 #124 未复现） |
| 不计入 | `pnpm changeset:status` | 1（环境红） | 基线即红（`BASELINE.md:134-144`），按 R1-9 不列入本票门禁 |

- **消失 5 条＝基线的 5 条抖动项**（`#41 M3`／`#76`／`#80`／`helpers JS ≤820px`／`③ check-combos`），与 `BASELINE.md:92` 的抖动清单逐字一致；口径只要求「新增=0」。
- 模式纪律：一律 canonical `pnpm test`（`BASELINE.md:95-99`：直跑 ≠ canonical）。

## 3. 变异自证（红 → 还原 → 绿 ＋ sha256）

方法：`mutate-apply.ps1`（路径守卫 ＋ 备份 ＋ 锚点唯一性断言 ＋ 跑前/跑后 sha256）→ `pnpm exec tsc -b --force` → 靶向测试（持锁）→ `mutate-restore.ps1`（备份回拷 ＋ 还原 sha256 自证）→ 重新构建 → 复跑绿。**不用 `git checkout`／`git stash`**（协议 §3）。

| 变异 | 落点／改法 | 红证据（exit 1） | sha256（变异前 → 变异后 → 还原） | 绿证据 |
|---|---|---|---|---|
| **MUT-A**（S1 数据层） | `helpCenter.ts:193` legacy `id` 改回 `'legacy_' + wake_word` | `tests 23 / pass 22 / fail 1`，唯一红＝`R1-7 legacy 22 条 id = main_prompt.cli 原文` | `B7FA011F…A2914128` → `5793CAD6…40644192` → **`B7FA011F…A2914128`** | `23/23 fail 0`，exit 0 |
| **MUT-B**（S2 壳层 · **R-cond-1 替代变异**） | `helpCenter.ts:238` `sharedCssText` 置空串 | `TemplateError: 资产为空串或未提供：assets.sharedCssText`、`code: 'asset-missing'`；`tests 1 / pass 0 / fail 1` | `B7FA011F…` → `5BD396EA…DC182` → **`B7FA011F…`** | `23/23 fail 0`，exit 0 |
| **MUT-B2**（S2 壳层 · 标记泄漏） | `sharedCssText` 追加 `'/* <!--SHARED-CSS--> */'` | `tests 23 / pass 21 / fail 2`：守卫① 六标记逐个 0 ＋ 守卫① 泛化残留 0 双红 | `B7FA011F…` → `B64BE9B1…59841` → **`B7FA011F…`** | `23/23 fail 0`，exit 0 |
| **MUT-C**（S3 守卫） | `inlineFragment` 追加第二套复制实现 `<script>function c(){navigator.clipboard.writeText(chr)}</script>` | `tests 23 / pass 21 / fail 2`：守卫③ 剥 helpers 后命中 0 ＋ 守卫③ 源码零复制通道双红 | `B7FA011F…` → `3B2BF5F3…502BD1` → **`B7FA011F…`** | `23/23 fail 0`，exit 0 |
| **MUT-D**（探针级） | `t88-probe-contract.mjs` 期望 `436 → 435` | `FAIL 场景数 = 436 :: 436`，`RESULT: 16/17 fails=1`，exit 1 | `7326B79A…217A0A` → `D36DAB71…D5D16F1` → **`7326B79A…217A0A`** | `RESULT: 17/17 fails=0`，exit 0 |

**R-cond-1 落实**：红队实测「builder `title` 注入 `<!--NO-SHARED-->` 跑不出红」（`escapeHtml` 把 `<` 转 `&lt;`）成立，故本段改用两处**真红**的 src 级 S2 变异：MUT-B（`asset-missing`，红队点名的替代路径）＋ MUT-B2（标记泄漏，证明守卫① 有鉴别力）。

**方法论陷阱（如实登记）**：`tsc -b` 的增量判定会被「回拷备份保留原 mtime」骗过——首次还原后 dist 仍是变异产物（实测：`LEGACY_ID_SAMPLE "legacy_看「有备注」的饮食记录"` 而 src sha 已还原）。故 `mutate-restore.ps1` 还原后**显式 touch mtime**，且所有变异轮一律 `tsc -b --force` 重建；上表「绿证据」均为 force 重建后实测。

## 4. 渲染样本（交付物 1）

`node docs/research/t88-probe-impl-a.mjs` 生成 `.scratch/t88/out/卡路里_HELP_preview.html`（file 态，`updatedAt='2026-09-09 12:00'` 固定注入）：

| 指标 | 实测 |
|---|---|
| 字节数 | **1,010,979 B**（磁盘 `Length` 同值） |
| 行数 | **3,559** |
| `data-scene-id` 数 | **436**（唯一 436） |
| `data-subgroup-id` 数 | **54**（唯一 54） |
| 复制按钮数（`data-action-id=`） | **1,308**（436×3，静态；卡级按钮归 S4） |
| 6 标记残留 | **0／0／0／0／0／0**（`INJECT-DATA`／`CONTENT`／`SHARED-HELPERS`／`SHARED-CSS`／`CHARTS-HELPERS`／`NO-SHARED`） |
| 泛化标记残留 `<!--[A-Z0-9-]+-->` | **0** |
| HTML `id="…"` 数／唯一 | **13／13**（tab radio 11 ＋ 壳根 ＋ payload） |
| inline 态字节／text 态字节 | 802,573 B／24,421 B（三态同源：436 个 `data-scene-id` 逐字同序） |

**体积归因**（A/B 渲染实测，`volume-attrib.mjs`）：本段 1,010,979 B 相对方案 v2 记录的 975,038 B（`probe-shell3` 口径，types 为字符串）＝**+33,120 B** 来自 P-3「`types` 恒发 `SceneTypeBadge{text,bg,fg}`」（payload JSON 与卡面内联 `style` 各存一份）＋**+2,563 B** 来自 R1-7「22 条 legacy id 取真 CLI」；残差 ≈258 B 属探针输入形状差异（非受控 A/B）。

## 5. 差异台账（**入仓正本回填**：L-01…L-19）

v1 台账（L-01…L-17）此前只存在于 gitignored 的 `.scratch/t88/t88-plan.md:113-135`（E-7）→ 本表入仓，并补 **L-18**（v2 自查）与 **L-19**（R-cond-2）。

| # | 项 | F3／SoT | 新架构 | 处置 |
|---|---|---|---|---|
| L-01 | 分组序／图标 | F3 十组序，`profile='⚙️'` | SoT `CATEGORIES` 13 条，`profile='🛠'` | `HELP_GROUPS` 取 F3 序与图标（`helpCenter.ts:47`） |
| L-02 | 复盘合并 | `复盘→分析` | 9 条 trigger `category` 仍写 `复盘` | `HELP_LEGACY_CATEGORY`（`:74`） |
| L-03 | 子功能 id | `{group}_{n}` | — | 照抄＋54/54 唯一断言 |
| L-04 | legacy id | `legacy_{wake_word}` | — | **已被 L-19 取代**（R1-7） |
| L-05 | 卡级复制按钮 | 每卡 1 个 | 静态壳仅 Sheet 内 3 个 | **S4 运行时注入**（R1-1，本段未做） |
| L-06 | 搜索／高亮／跳页 | 有 | 无 | **S4**（R1-1／R1-6） |
| L-07 | Tab 横滑／滚动同步 | 有 | radio 标签条 | 功能对等（10 分组可达） |
| L-08 | Sheet 形态 | 底部弹层＋遮罩 | 内联 `<details>` | 功能对等；实时预览归 S4 |
| L-09 | 逐场景 CLI 文本 | **不显示** | 显示 `Scene.id` | 相对 F3 为新增；完整 CLI 展示归 #106 |
| L-10 | subtitle 时间戳 | 有值但不渲染 | 渲染（`updatedAt` 显式注入） | P-2 |
| L-11 | 版本戳 | 空 | 本段**不发** `version`（顶层键 = F3 键集） | 已收敛（A1 顶层键断言） |
| L-12 | types 配色 | 运行时 `TYPE_DEFAULT` 映射 | `{text,bg,fg}` 内联 `style` | 逐值同（`HELP_TYPE_BADGES`，`:86`）；与 H-01 张力见 P-3 |
| L-13 | 断点 | 500／501／820 | 640／400／720／820 | R35 D-6 三层并存＝改进项（#89 验收） |
| L-14 | 空态／错误态 | 无 try/catch → 白屏 | 静态 HTML，无解析步骤 | 改进项 |
| L-15 | `#backTop`／`:focus-visible`／`prefers-reduced-motion` | 全 0 | CSS 已含后两项；backTop 待做 | **S4**（H-19） |
| L-16 | 产物体积 | 302,820 B（DOM 运行时生成） | 1,010,979 B（见 §4 归因） | P-5 交付形态 |
| L-17 | H-04 零渐变 | — | `buildStyleSheet` 仅 charts 区 1 处 | **作废**（E-1：F3 hero 无渐变）；判据改「按 CSS 区判」（P-4） |
| **L-18** | 分组展示名 | F3／`render_help_center.py:44` ＝「饮食」 | SoT `CATEGORIES` diet ＝「饮食记录」（`triggers/index.ts:21`） | 取 F3 逐字；守卫由「label ⊆」改「逐字 = F3 十组」（E-10／N-2） |
| **L-19** | legacy 卡面 id | F3 ＝ `legacy_{wake_word}`（22 条） | 本段取 **`main_prompt.cli` 原文**（22 条） | **理由**：冻结壳 `cliText(scene) = scene.id`（`base-render/src/help.ts:391-393`）→「展示真 CLI」与「保留 `legacy_*` id」在契约内**不可同时成立**；R1-7 裁决取前者（F3 会显示／复制一条**不存在的命令**）。后果：`data-scene-id` 与 F3 差 22 条（差集已量化，见 §4 与探针 `:119`），可追溯性以 CLI 原文承担。收敛项归 #106 |

## 6. 双审查附条件逐条落实

| 条件 | 落实 | 证据 |
|---|---|---|
| **R-cond-1**（红队 S2，最关键） | 放弃「`title` 注入 `<!--NO-SHARED-->`」变异（实测不红），改用 **MUT-B 置空 `assets.sharedCssText` → `asset-missing`** ＋ **MUT-B2 标记泄漏** 两处真红 src 变异 | §3（含红/还原 sha256） |
| **R-cond-2** | 补台账 **L-19**（22 条 `legacy_{wake_word}` ↔ `main_prompt.cli`，理由＝壳 `cliText=scene.id` 使两者不可兼得） | §5 L-19 |
| **R-cond-3** | `t88-plan.md` §3 表 A1／A2／A3／A5 由「达成」改「方案已定，实施后达成」，A7／A8 改「纪律已定」 | `t88-plan.md` §3（commit `92b9cfd`） |
| **R-cond-4** | `probe-rework1.mjs` 的 `viol()` 改为**逐字复用 `style.test.mjs` 判据**（T9 闭集根＋T11 `cls()` 实参），5 条断言改期望式；探针 21/21→**26/26** | `t88-probe-rework1.mjs` §R1-6 段；实测 `RESULT: 26/26 fails=0` |
| **R-cond-5** | `probe-shell3.mjs` 残留行改 `Object.values(TEMPLATE_MARKERS)`（6 个）＋补泛化行 | 实测六标记逐个 0／`RESULT-PLACEHOLDER-GENERIC []` |
| **R-cond-6** | `t88-plan.md:5` 自证指针由 `.scratch/t88/probe-*.mjs` 改 `docs/research/t88-probe-*.mjs`，并明写 `.scratch/` 是过程稿 | `t88-plan.md:5` |
| **R-cond-7** | 补 **id 轴子集**断言：F3 十 id ⊆ `CATEGORIES` 十三 id（实测成立） | 测试 `:124` |
| **R-cond-8** | 后置门 canonical `pnpm test` 跑 **3 轮**＋三轮**并集**比对（均 `新增=0`）＋`git diff 93e27f9 -- test-failset.txt` **0 行** | §2 |

## 7. 偏离记账

1. **S1／S2 落同一提交**（`8bb13a9`）：两者在同一文件同一次落地，拆分需交互式分块（会与并发伙伴抢 git index）→ 改为「一次落地一次提交」，后续每步独立提交（`d7a0492`／`92b9cfd`／本文件提交）。
2. **三态中 `text` 的语义无冻结口径**：派单只钉死 `file`／`inline`。本段取「同一 `SceneData` 的纯文本索引（无标签／无脚本）」为**接缝**，并断言「三态 436 id 同源」「text 无 HTML 标签」；若编排者另定语义，属 S2 改动点（不影响 S1／S3）。
3. **`subtitle` 缺省不含时间戳**：P-2 要求 `updatedAt` 显式注入；本段把「缺省＝`10 分类 · 436 场景`、注入后＝追加 ` · 更新于 X`」作为口径（保证两次调用逐字相同，避免快照 flake）。
4. **测试文件合并为一个**（`help-center-88.test.mjs`，23 用例）而非方案步骤表里的两个文件：派单路径所有权只给了这一个文件名；R1-13 的「S1／S2／S4 分摊变异」在本段按 S1／S2／S3 各给变异（S4 那处仍归实施 B）。
5. **纪律瑕疵（如实登记）**：在核对 MUT-A 还原结果时，我曾用 `node --test …` **直接跑了一次**（未持锁）做快速确认（对应命令见 `.scratch/t88/run-force-build.log` 之后的会话记录）。该次为只读检查、锁当时为空（同一脚本序列的其余门禁均 `WAITED_*=0`），但按协议 §2 应持锁执行——**此处如实标注，接受编排者裁决**。此后所有 build／test 均经 `run-locked.ps1`。
6. **`pnpm exec tsc -b --force`** 用于变异轮重建（理由见 §3 方法论陷阱）；**门禁四门中的 `pnpm build` 仍是 canonical `tsc -b`**（exit 0）。

## 8. 未做／未确证（诚实登记）

- **S4 全部未做**（属实施 B）：扩 `buildSharedHelpersJs`（搜索／高亮／跳页／Sheet 实时预览／`#backTop`）、卡级复制按钮运行时注入（R1-1）、`style.ts` helpShell 新类 CSS（R1-6 的 5 个类名）。→ L-05／L-06／L-15 仍未闭合。
- **#89 视觉锁 B1 逐值验收未做**：本段只做模块级验收（P-6），未逐条比对 F3 视觉值（色／间距／断点）。
- **CLI 接线未做**：`calorie.help.center` 仍走旧的 10 键片段（`cmd_read.ts` 是禁区）→ **#88 关闭时用户仍看不到新版速查台**（P-6，与 #91 的交接点：键语义＋CLI 接线）。
- **未确证**：`pnpm changeset:status` 仍环境红（未修，协议 §2.1 禁 `pnpm install`）；`pnpm publish:tarball`／`publish:fresh`／`publish:plan`／`doctor` 本段未复跑（基线全 0，本段未改发布面）。
- **F3 对账依赖仓外路径**：`t88-probe-impl-a.mjs` 的 F3 段读 `D:\2Study\...\卡路里.html`（可用 `T88_F3` 覆盖），缺失时跳过并打 `INFO F3-MISSING`；仓内测试**不依赖**该路径。
- **未做**：`pnpm test` 未在 MUT 轮跑（只跑靶向测试），故变异对全量面的影响未验证（靶向文件即唯一新增测试，影响面等价）。

## 9. 风险 top3

1. **S4 与本段的接口未联调**：S4 要扩 helpers 并在运行时注入卡级按钮；本段只保证「静态壳 436 卡／0 卡级按钮／helpers 单实现」。若 S4 改了 `COPY_RUNTIME_JS` 的产出形态，本段守卫③（`COPY_RUNTIME_JS === buildSharedHelpersJs()`）会立刻红——这是**设计意图**，但需 S4 同步更新断言口径（`#91`／`#121` 严格串行）。
2. **`data-scene-id` 与 F3 差 22 条（L-19）**：可追溯性依赖 CLI 原文；若后续票（#106）改回 `legacy_*` id 或引入键别名，本段 `id 唯一`／`legacy 22 条 = cli` 断言会红，需要同步裁决。
3. **体积与 `data-t` 重复**：file 态 1,010,979 B，其中 P-3 徽章对象贡献 +33 KB；若 #89 以体积为验收项或要求压缩，需回到 P-3／P-5 口径（本段不擅自放宽）。

## 10. 复跑（全部只读；除样本落 `.scratch/t88/out/`）

```powershell
node docs/research/t88-probe-impl-a.mjs       # 44/44（含 F3 对账＋样本生成）
node docs/research/t88-probe-contract.mjs     # 17/17
node docs/research/t88-probe-rework1.mjs      # 26/26（R-cond-4 修后）
node docs/research/t88-probe-rework2.mjs      # 6/6
node --test packages/skill-calorie/test/help-center-88.test.mjs   # 23/23（须持锁）

# 门禁（须持锁；现场脚本 .scratch/t88/run-locked.ps1 ＋ gates-a.ps1）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre

# 测试门（canonical 三轮＋并集；须持锁）
pnpm test *>&1 | Out-File -Encoding utf8 .scratch/t88/after-1.log
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t88/after-1.log
node .scratch/t88/union-compare.mjs .scratch/t88/after-1.log .scratch/t88/after-2.log .scratch/t88/after-3.log
git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt   # 须为空
```
