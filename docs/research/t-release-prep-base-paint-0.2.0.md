# 发版准备证据：base-paint@0.2.0 联动 skill-calorie（备菜，不点火）

> 取证时间 2026-09-09；工作区 `D:\ilife`（Windows pwsh）；sidebar 终端 `release-prep`。
> 红线遵守：未跑 `changeset version/publish`、未碰 npm 身份、未跑任何 install、未手改 version、未写禁区路径。

## 1. 本票改动（仅 1 处生效，另 1 处按红线拦截）

- ✅ `packages/skill-calorie/package.json:22`：`base-paint` 范围 `^0.1.0` → `^0.2.0`
 （全仓唯一直接依赖方已核实——grep `base-paint.*\^0.1.0` 全仓仅此一处 package.json 命中，其余为文档/证据引用）。
- 🛑 `packages/skill-calorie/SKILL.md`（172/173/179 行，3 处 `@0.1.1`）**未改**：
  全仓 skill-calorie changesets 共 21 个，其中 **16 minor**（见 §2），"全部 patch" 前提不成立；
  按派单红线停下该改动。若强行改成 `@0.1.2` 将是错号——发版后应为 **0.2.0**，SKILL.md 须在发布窗口同批改为 `@0.2.0`（t98 changeset:12 已登记此依赖）。

## 2. 全仓 changesets 清单与发版后版本号推导

### base-paint：9 个文件声明 minor（派单称 7 个，实测 9 个——7 个 `base-paint-*` ＋ p5/p7），全 minor、无 major/patch

| # | 文件 | 等级 |
|---|---|---|
| 1 | `.changeset/base-paint-contract-freeze.md:2`（#92 契约冻结） | minor |
| 2 | `.changeset/base-paint-content-slot.md:2`（#118 CONTENT 槽） | minor |
| 3 | `.changeset/base-paint-fill-template.md:2`（#74 fillTemplate） | minor |
| 4 | `.changeset/base-paint-controls.md:2`（#76 控件层） | minor |
| 5 | `.changeset/base-paint-text-serialization.md:2`（#77 序列化） | minor |
| 6 | `.changeset/base-paint-charts-help.md:2`（#78 图表+HELP 壳） | minor |
| 7 | `.changeset/base-paint-style-sheet.md:2`（#75 样式资产） | minor |
| 8 | `.changeset/p5-scaffold.md:3`（三包骨架，兼声明 base-link-core/base-combos/ilife-skills minor） | minor |
| 9 | `.changeset/p7-render.md:2`（render 装配归一） | minor |

### skill-calorie：21 个（16 minor＋5 patch，无 major）→ 最高等级 minor

- minor（16）：`calorie-triggers.md:2`、`calorie-copy-90.md:2`、`calorie-write-chain.md:2`、
  `calorie-fetch-import.md:2`、`calorie-output-naming-87.md:2`、`t20-calorie-schema.md:2`、
  `t22-calorie-fetch.md:2`、`t23-calorie-fetch-t4.md:2`、`t24-calorie-analysis-t5.md:2`、
  `t26-calorie-review.md:2`、`t27-calorie-render-t8.md:2`、`t28-calorie-render-t9.md:2`、
  `t29-calorie-render-t10.md:2`、`t30-calorie-exit-t11.md:2`、`t38-calorie-migrate-t12.md:2`、
  `t81-wake-routing.md:2`
- patch（5）：`calorie-readonly-93.md:2`、`t98-wizard-verify-rule.md:2`、
  `skill-provider-56-calorie.md:2`（兼声明 `dsh-calorie: patch`）、
  `t95-calorie-templates.md:2`、`t101-delete-wording-persist.md:2`

### 发版后版本号推导表（changesets 最高等级胜出，多 minor 合并为一次 bump）

| 包（目录） | 当前 | 最高等级 | 发版后 |
|---|---|---|---|
| `base-paint`（`packages/base-render`） | 0.1.0 | minor×9 | **0.2.0** |
| `skill-calorie`（`packages/skill-calorie`） | 0.1.1 | minor（16 minor压过5 patch） | **0.2.0**（非 0.1.2） |
| `base-link-core`／`base-combos`／`ilife-skills` | 见各包 package.json | minor（经 p5-scaffold） | 各升 minor（连带，须纳入发布窗口） |
| `dsh-calorie` | 见包 package.json | patch（经 skill-provider-56） | 升 patch（连带） |

## 3. `changeset status` 实测：不可跑（与此前一致，如实记录，未修）

- 命令：`pnpm changeset:status`，exit **1**。
- 头错：`Error: Cannot find module '@changesets/errors'`，
  Require stack 为 `node_modules/.pnpm/@changesets+cli@2.31.1_@types+node@26.4.1/.../changesets-cli.cjs.js:4`。
- 处置：未修（协议 §2.1＋派单禁 install；补 CLI 依赖需编排者持锁显式授权）。
  后果：`changeset version` 同样跑不起来，发版窗口第一步即阻塞，见 §6。

## 4. tarball 内容核对（持锁，`npm pack --dry-run`，exit 均为 0）

- `packages/base-render`（包名 base-paint）：exit 0，共 69 files；含
  `dist/index.js`、`dist/template.js`（`fillTemplate` 落点，经 `src/index.ts:14` 导出）、
  `dist/style.js`、`dist/controls.js`、`dist/charts.js`、`dist/help.js`、`dist/text.js`、
  `dist/spec/*`——7 票全部新出口在包内。
- `packages/skill-calorie`：exit 0，共 400 files；含 `dist/`（`index.js`、`render/index.js`、
  `render/templates.js`、`cli/cmd_read.js`）、`SKILL.md`、6 件 `templates/*.html`
 （diet/exercise/goal/home/photo-gallery/help，与仓内 6 模板一致）。

## 5. 门禁实测（持锁，一次跑完；工作区当时含 chartfix 票未提交改动，见 §7）

| 门 | 命令 | exit |
|---|---|---|
| build | `pnpm build`（`tsc -b`） | 0 |
| boundaries | `pnpm boundaries` | 0 |
| snapshot | `pnpm snapshot:check` | 0 |
| publish 预检 | `pnpm publish:pre`（`check-publish.mjs --pre --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`） | 0 |

## 6. 给老板的发版命令清单（按序逐条可复制；本票止于备菜，以下均未执行）

```sh
# ① 确认 npm 身份（谁：老板亲手；可逆）
npm whoami
npm ping
# ② 门禁复绿（谁：agent 可代；可逆，持锁跑）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre
# ③ 修好 changesets CLI（谁：编排者授权后 agent 执行；缺的 `@changesets/errors` 属安装动作，无授权不动）
#    在修好之前 ④ 跑不起来——先卡住，不要跳步
# ④ 消费 changesets 生成版本号（谁：老板确认后 agent 可代；git 可逆，未 publish 前都可回滚）
pnpm changeset version
git diff --stat   # 核对 §2 推导表：base-paint→0.2.0、skill-calorie→0.2.0＋连带包
# ⑤ 发布窗口同批改 SKILL.md 3 处 @0.1.1→@0.2.0（谁：agent；与 ④ 同一 commit 前完成）
# ⑥ 🔴 发布（谁：老板亲手；不可逆点——publish 落子无悔，先发 base-paint 再发 skill-calorie）
pnpm changeset publish
# 或等价：cd packages/base-render && npm publish && cd ../skill-calorie && npm publish
# ⑦ 发版后验证：仓外安装态 import 公开出口＋契约键抽查（谁：agent 可代；安装目标必须在仓外＋先写最小 package.json，协议 §2.1）
mkdir $env:TEMP\ilife-verify-$((Get-Random)); Set-Content $env:TEMP\ilife-verify-dir\package.json '{"name":"verify","version":"0.0.0"}'
npm install base-paint@0.2.0 skill-calorie@0.2.0
node -e "import('base-paint').then(m=>console.log(Object.keys(m).sort().join(',')))"
node -e "import('skill-calorie/render').then(m=>console.log(typeof m.loadTemplate))"
$env:SKILLS_DB_PATH = "$env:TEMP\sk-verify"; calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'
```

## 7. 未做／阻塞项

1. SKILL.md 3 处版本号未改（§1 🛑，等发布窗口改 `@0.2.0`）。
2. `changeset status` 不可跑（§3），`changeset version` 同因阻塞中。
3. `.scratch/t-release-prep/*.log` 过程日志已清理，未入仓。
4. 取证时工作区含 chartfix 票未提交改动（`docs/base-paint-contract.md`、
   `docs/research/t-chartfix-evidence.md`、`packages/base-render/src/charts.ts`、
   `packages/base-render/test/charts.test.mjs`＋未跟踪 `t123-release-window-diagnosis.md`）——§5 门禁值为"含他人改动"的树上实测，发版前须确认树干净。

## 8. 风险 top3

1. **发版第一步即卡死**：`@changesets/errors` 缺失使 `changeset version` 跑不起来；在禁 install 下只能等授权，窗口排期须先解此结。
2. **版本号预期差**：派单按 skill-calorie@0.1.2 备菜，实际应为 0.2.0；SKILL.md、外部文档、验证命令里任何写死的 0.1.2 都会错位。
3. **连带包超预期**：p5-scaffold 把 base-link-core/base-combos/ilife-skills、skill-provider-56 把 dsh-calorie
   一并带入 bump；若只想发两个包，须先处理这些 changesets，否则 `changeset version` 会多改多发。
