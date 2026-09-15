# t276 · 运行时终验（Lane B / `wf155-b`，HEAD `645aa37`）

时间 2026-09-15 19:2x。读数全部本席在 wf155-b 实跑；`D:\ilife` 一字未改。
脚本 `docs/skills/skill-calorie/t276-终验-run.mjs`；种子与日志 `.scratch/t276/`。

## 一 · 判定

| 判据 | 判定 |
|---|---|
| 6 条唤醒词实跑 exit 0（写类真写进库） | **PASS**（该段 28 条判据全绿） |
| 接对①`查高热量排行`出「高热量榜」 | **HEAD 上不成立**，重生成后 PASS |
| 接对②餐别 5 条 | **FAIL（未修）**：须动 `src/home/`，按口径停手报授权 |
| 接对③`看本周饮食` | 现象属实，成因＝窗口口径，**非路由接错**（归 #250） |
| 接对④`看食品来源统计`接错命令 | **不属实**（当刻已接对） |
| `pnpm build` exit 0 | **exit 2**，红在 `base-render/test-d`（范围外） |
| 命令册已重生成并一致 | **HEAD 上不成立**（`gen:check` exit 1），重生成后 PASS |
| 两条待补测试 | HEAD 上已做，本席复核为绿 |

**最要紧的一条**：①的修复在 HEAD 上是**死代码**。声明件 `src/diet/routes.ts:96` 已带 `category`，
派生件 `src/triggers/routes.generated.ts:462` 没重生成，**运行期仍走 `{"window":"7d"}`**
⇒ 实跑依旧落成「全部排行」。`pnpm build` 只调 `--stamp`，而 `--stamp`（`gen-cli.mjs:655`）
只写内容印记、不重生成，拦不住这种走散。

## 二 · 机器证据

```
pnpm build                        → EXIT=2
  packages/base-render/test-d/contract-signatures.ts(390,20): error TS2344
npx tsc -b packages/skill-calorie → EXIT=0
HEAD 上 pnpm gen:check            → EXIT=1
  盘上 routes.generated.ts:462 … {"window":"7d"}
  生成                          … {"category":"high_calorie","topN":10,"window":"7d"}
pnpm gen → EXIT=0；仅 routes.generated.ts 一件变（另四件 sha256 与 gen:check 读数逐字相同）
重生成后 pnpm gen:check → EXIT=0
终验脚本  判据 54：绿 47，红 7（红全在餐别那一族）
变异自证  变异 MUTANT_EXIT=1 绿22红6 RED ／ 还原 RESTORED_EXIT=0 绿28红0 GREEN
全仓测试  tests 1271 ／ pass 1170 ／ fail 99 ／ exit 1
路由族 A/B  HEAD 原版 exit=1 ／ 重生成版 exit=1 ⇒ 无差别
环境  node_modules 原是指向 D:\ilife\node_modules 的联接、各包 node_modules 全缺 ⇒ TS2307；
      先证「删联接不动目标」（两法试验、哨兵文件存活），再删联接 → pnpm install（exit 0，lockfile sha256 前后同值）
```

## 三 · 逐条路径（命令行取自运行期总表 `ALL_ROUTES`，不手打）

| 唤醒词 | 命令 | exit | 产物（`…` ＝ `.scratch\t276\db\calorie_html\`） | 字节 | 首 15 字节 |
|---|---|---|---|---|---|
| 看有备注的饮食记录 | `calorie.today` | 0 | `…\今日饮食_20260915_193257.html` | 78961 | `<!doctype html>` |
| 看「有备注」的饮食记录 | `calorie.today` | 0 | `…\今日饮食_20260915_193259.html` | 78961 | `<!doctype html>` |
| 校验批量导入 | `calorie.view.batch-import-preview` | 0 | `…\批量导入预览_…193300.html` | 68542 | `<!doctype html>` |
| 批量导入食品 | `calorie.product.import` | 0 | `…\批量导入食品_回执_…193302.html` | 70044 | `<!doctype html>` |
| 拍营养表记一餐 | `calorie.diet.add` | 0 | `…\记一餐_回执_鸡胸_…193303.html` | 70412 | `<!doctype html>` |
| 拍营养表补记一餐 | `calorie.diet.add` | 0 | `…\记一餐_回执_米饭_…193304.html` | 70485 | `<!doctype html>` |

写后回读（同一个库读真表）：`nutrition_products` 3→4；`food_log` 14→15、15→16。

接对四处读数：

- **①** 参数 `{"category":"high_calorie","topN":10,"window":"7d"}`；产物名 `食物排行_高热量_…`；
  页内含「高热量榜」、**不含**「全部排行」；对照面「看全部排行榜」含「全部排行」，两页 sha256 不同。
- **③** `{"window":"本周"}`，`metrics.days=2`（新仓＝本周一 09-14..今天 09-15；老实物整周恒 7 天）。
- **④** 落 `calorie.view.source-stats`，exit 0；`calorie.view.library` 只服务「查食品库」那一族。
- **②（红 7 条）** 5 条餐别词产出**逐字节相同**（各 90702 B，
  `h1="饮食总览 2026-09-09 ~ 2026-09-15"`，同为 `…\饮食总览_*.html`），**互异 1/5**。

待补测试复核：`cmd-write-40-persist.test.mjs:441` 已有 `calorie.product.import` 的写后回读用例（绿）；
`m5-receipt-97.test.mjs:35` 场景表已含该行，生成器自报「写 46」。

## 四 · 未做项与下一手缺什么

1. **【需编排者授权动 `src/home/`】** 餐别 5 条未修，只取证。必须同动两处：
   `src/home/routes.ts:28-32` 五条记录的 `cli` 各带餐别参数；`src/home/today.ts:58` 的
   `viewDietOverview` 按该参数分流。`src/diet/` 那半已就绪：`review.ts` 的
   `buildMealDistributionView(db, mealRaw, start, end)` 经 `reviewDocs.ts:229` 的 `mealParamOf`
   只认值、不猜值（缺参／未知值 exit 2），`todayDocs.ts:220` 的页已备，`diet/index.ts:7` 的门已留。
   还缺口径裁定：前 4 条各取一餐、第 5 条取 `all`；且不给该参数的调用
   （场景 01「看今日饮食概览」）行为须逐字不变。
2. **【范围外｜挡住宿主编译＋连带成片红】** `base-render/test-d/contract-signatures.ts:390` 的 `_V07`
   仍断言 `minHeightPx: 40`，而 `src/spec/controls.ts:308` 已 44；`ab645c8`（#525）漏改 test-d 这一件。
   连带 `pnpm -r build:client` 从未跑到，各插件 `dist/client.js` 全缺（实测 `False`），客户端那族成片红。
   改一行（40→44）即绿；本席无权动 `packages/base-render/`。
3. **【范围外】** `cmd-write-40-persist` 两条红同源：`product.deprecate` 上屏文案仍是旧措辞
   （`src/diet/products.ts:92`），测试要的是统一措辞。与本票无关（不经路由），归文案统一那一票。
4. **【范围外】** ③ 是窗口口径差异（`analysis/series.ts:83`），按诊断件归 #250。
5. **环境**：本检出已改为自己的 `pnpm install` 结果（删联接前已证安全），后续 Lane 直接 `pnpm build` 即可。
