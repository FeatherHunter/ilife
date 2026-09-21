## Question

v2 稿把「11 张域票按域根隔离」当前提，被两席对抗式审查实测推翻（`review-graph-A.md` P0-1）：今天每张域票都必须改五处全包共用件——`src/render/templates.ts`（白名单 `:7-29` ＋ `templateFor` `:33-58`）、`src/render/views.ts`（逐域装配 `:9-77`）、`src/render/html.ts`（唯一 `SHARED_CSS` `:63`）、`src/policy/wakewords.ts`（91 条表 `:20-112`）、`src/cli/cmd_read.ts`（21 个 case）。卡路里那套的真身不是「按域分目录」，而是**通用分派口 ＋ 目录扫描生成器 ＋ 派生件入仓**：`skill-calorie/src/cli/cmd_read.ts:60-71` 是全键查表分派，件内逐字写着「新增能力／新增命令都不必碰这个文件」；`scripts/gen-cli.mjs`／`gen-routes.mjs` 扫目录产出三件生成物。**这台机器不造出来，「按域不相交」就是空话。**

## 目标

按票 2 的契约把机器造出来：

① 能力目录 ＋ 每能力 `index.ts`／`commands.ts`／`routes.ts`：21 条命令按域搬完，**键名与出参形状不变**；
② **通用分派口**：`cmd_read.ts` 的 21 个 `case` 换成 `REGISTRY[key]` 式查表分派（照卡路里 `:60-71`），新增能力不必再碰这个文件；
③ **生成器**：扫 `src/<能力>/{commands,routes}.ts` 产出派生件（keys／registry／routes.generated），派生件**入仓**（`docs/agents/命令登记纪律.md:19` 的哈希锁要求就是「产物入仓」，`.github/workflows/ci.yml:43` 每轮真跑 `gen:check`），并把 `pnpm gen`／`gen:check` 接进居家（仓根 `package.json:12` 的 `gen` 今天逐字只跑 calorie／bill）；
④ **测试 glob 加宽**：`packages/skill-home/test/*.test.mjs` 只到一级，域票的 `test/<域>-*.test.mjs` 今天永不执行。**注意撞车**：仓根 `package.json` 的 `test` 入口此刻正被 **#763（测试隔离／家目录注入）**改造（现场实测：已从 15 条 glob 列表改成 `node tooling/check-real-home-untouched.mjs --run` 包装器）——本票开工前先看 #763 落地后的形状，按新形状接进去，**别照旧 glob 硬改**；`packages/skill-home/test/` 下也可能有它扫荡留下的改动，先认地盘再动。
⑤ 顺带登记 `借用` 写侧唤醒词（`借出／借入／归还／催还` 今天无词可达：`wakewords.ts:58` 只通读侧、`cmd_read.ts:757-771` 是孤立写侧）；
⑥ 门禁全绿并**尽早推**（触 CI 面，按编排纪律「触 CI 尽早推」）；
⑦ **页族解析落地**：把 `src/render/templates.ts:33-58` 的「key → 模板」1:1 映射改成「**`(key, preset/场景) → 页族**」两层解析（46 个页族名照票 2 契约），并按**票 22「唤醒词层规格」**的裁定落地唤醒词侧：20 条无场景词逐条归宿、42 条变体的识别口径、必要时改 `scenarios.yaml` 的 `variants`／`DEPRECATED_PHRASES`；改完必须给出**逐行对照读数**：每条唤醒词 → 场景 → 命令 key → 页族，**一条不落**；
⑧ **唤醒词层的机器门**（防回潮）：四分类检查（主词／变体／技能级入口／废弃，出现「三不管」即红）＋ `scenarios.yaml`／`WAKE_TABLE`／`DEPRECATED_PHRASES` **三向对账** ＋ 上面那张逐行对照表，全部接进包内 test 门；改内容资产后同批重跑 `pnpm gen:help-assets`、更新摘要锁（`packages/skill-home/AGENTS.md` 的规矩），并给「改坏一句即红」的负向证据；
⑨ **技能说明面（`SKILL.md`）**：本图的链路是「唤醒词 → 命令 → **落盘 HTML 绝对路径**」，但读技能的是 AI——**SKILL.md 不写，AI 就不会把路径交给用户**。本票要在 `SKILL.md` 写明：缺省即落 HTML（不再是「只回 JSON」）、回执里带 `delivery.path` 绝对路径、产物落在哪、用户怎么点开；并把「完成判据＝文件存在且大小＝`delivery.bytes`」照 #183 票 9 的写法补上。验收：`SKILL.md` 有对应的「输出位置」一节，且**逐字写清链路**。

## 验收命令

`node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node node_modules/typescript/bin/tsc -b packages/skill-home`、`… -- pnpm test`、`… -- pnpm gen:check` —— **三条 exit 0**；且搬前／搬后 21 条命令的键名与出参用例读数逐条一致；再跑本票新增的**唤醒词→页族对照**（91 条逐行、缺一条即红）。

## 不许动的东西

不改命令键名与出参形状；不动页面模板内容与 `src/<域>/pages/**`（那是域票的地盘）；不碰其它包与公共层。

## 交付物路径

`packages/skill-home/src/**`（除 `src/<域>/pages/**`）、`packages/skill-home/templates/**`（除 `templates/<域>/**`）、生成物、`packages/skill-home/package.json`、`SKILL.md`、`AGENTS.md`；迁移对账 `docs/skills/skill-home/structure-landing.md`。

## 遗留出口

搬不动或按契约留待处置的件（含超告警线件）逐条登记去处；报第五步「交付对账」，偏差为零才算完。
