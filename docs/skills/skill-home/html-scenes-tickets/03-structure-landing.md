## Question

v2 稿把「11 张域票按域根隔离」当前提，被两席对抗式审查实测推翻（`review-graph-A.md` P0-1）：今天每张域票都必须改五处全包共用件——`src/render/templates.ts`（白名单 `:7-29` ＋ `templateFor` `:33-58`）、`src/render/views.ts`（逐域装配 `:9-77`）、`src/render/html.ts`（唯一 `SHARED_CSS` `:63`）、`src/policy/wakewords.ts`（91 条表 `:20-112`）、`src/cli/cmd_read.ts`（21 个 case）。卡路里那套的真身不是「按域分目录」，而是**通用分派口 ＋ 目录扫描生成器 ＋ 派生件入仓**：`skill-calorie/src/cli/cmd_read.ts:60-71` 是全键查表分派，件内逐字写着「新增能力／新增命令都不必碰这个文件」；`scripts/gen-cli.mjs`／`gen-routes.mjs` 扫目录产出三件生成物。**这台机器不造出来，「按域不相交」就是空话。**

## 目标

按票 2 的契约把机器造出来：

① 能力目录 ＋ 每能力 `index.ts`／`commands.ts`／`routes.ts`：21 条命令按域搬完，**键名与出参形状不变**；
② **通用分派口**：`cmd_read.ts` 的 21 个 `case` 换成 `REGISTRY[key]` 式查表分派（照卡路里 `:60-71`），新增能力不必再碰这个文件；
③ **生成器**：扫 `src/<能力>/{commands,routes}.ts` 产出派生件（keys／registry／routes.generated），派生件**入仓**（`docs/agents/命令登记纪律.md:19` 的哈希锁要求就是「产物入仓」，`.github/workflows/ci.yml:43` 每轮真跑 `gen:check`），并把 `pnpm gen`／`gen:check` 接进居家（仓根 `package.json:12` 的 `gen` 今天逐字只跑 calorie／bill）；
④ **测试 glob 加宽**：`packages/skill-home/test/*.test.mjs` 只到一级，域票的 `test/<域>-*.test.mjs` 今天永不执行；
⑤ 顺带登记 `借用` 写侧唤醒词（`借出／借入／归还／催还` 今天无词可达：`wakewords.ts:58` 只通读侧、`cmd_read.ts:757-771` 是孤立写侧）；
⑥ 门禁全绿并**尽早推**（触 CI 面，按编排纪律「触 CI 尽早推」）；
⑦ **页族解析落地（覆盖审计补进来的头号洞）**：把 `src/render/templates.ts:33-58` 的「key → 模板」1:1 映射改成「**`(key, preset/场景) → 页族**」两层解析（46 个页族名照票 2 契约），并按契约的**兼容词并入表**把 20 条无场景唤醒词接到对应页族上；改完必须给出**逐条对照读数**：91 条唤醒词 → 命令 key → 页族，**一条不落**（这张对照表要能在本票验收命令里跑出来）。

## 验收命令

`node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node node_modules/typescript/bin/tsc -b packages/skill-home`、`… -- pnpm test`、`… -- pnpm gen:check` —— **三条 exit 0**；且搬前／搬后 21 条命令的键名与出参用例读数逐条一致；再跑本票新增的**唤醒词→页族对照**（91 条逐行、缺一条即红）。

## 不许动的东西

不改命令键名与出参形状；不动页面模板内容与 `src/<域>/pages/**`（那是域票的地盘）；不碰其它包与公共层。

## 交付物路径

`packages/skill-home/src/**`（除 `src/<域>/pages/**`）、`packages/skill-home/templates/**`（除 `templates/<域>/**`）、生成物、`packages/skill-home/package.json`、`SKILL.md`、`AGENTS.md`；迁移对账 `docs/skills/skill-home/structure-landing.md`。

## 遗留出口

搬不动或按契约留待处置的件（含超告警线件）逐条登记去处；报第五步「交付对账」，偏差为零才算完。
