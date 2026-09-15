判定：**FAIL** —— 判据 3 未达成（`pnpm build` exit 2；全包测试 79 红、基线本身不绿）；判据 1／2／4 达成。四处红全部定位在「本检出 `645aa37` 落后 master 10 个提交」这一环境事实里，`#269` 的源码零改动（本席只改动并逐字还原了 `src/diet/receipt.ts`）。

# t269 终验（lane wf155-a）

检出：`D:\ilife-wt\wf155-a`，`HEAD=645aa37`（detached）。`git merge-base --is-ancestor HEAD master` 为真，`git rev-list --count HEAD..master` ＝ 10。

## 机器证据

| 判据 | 命令 | 机器读数 |
|---|---|---|
| 1 · 13 条写操作逐条实跑 | `node docs/skills/skill-calorie/t269-终验-run.mjs` | exit **0**；`读数：**13/13 绿**`；产物均 `<!doctype html>` 起首、含 `charset` 与 `<style>`、`</html>` 收尾 |
| 2 · 其余写操作产物未变 | `node .scratch/t269/nondiet-ab.mjs --state=a／--state=b／--compare` | `A 条数=33 B 条数=33`；`相同 32 ／ 不同 1`；`未逐字节相同的命令名：calorie.water.log`（A 69814 字节整页／B 272 字节片段） |
| 3 · `pnpm build` | `pnpm build` | exit **2**；唯一一条 TS 错：`packages/base-render/test-d/contract-signatures.ts(390,20): error TS2344: Type 'false' does not satisfy the constraint 'true'.` |
| 3 · 全包测试 | `pnpm test` | `tests 2381 / pass 2300 / fail 79 / skipped 2`，exit 1；首次（未补跑 `--stamp` 与 `build:client` 时）为 `fail 102` |
| 4 · 变异自证 | `node --test packages/skill-calorie/test/t496-文案统一.test.mjs` | 改坏整页装配 → `tests 39 / pass 14 / fail 25`（exit 1）；还原后 → `tests 39 / pass 39 / fail 0`（exit 0） |

13 条逐条（脚本判，非肉眼；库 `…\.scratch\t269\calorie_data.db`，页落 `…\.scratch\t269\calorie_html\`）：

| # | 命令 | exit | 落盘绝对路径（前缀 `D:\ilife-wt\wf155-a\.scratch\t269\calorie_html\`） | 字节 | 完整文档 |
|---|---|---|---|---|---|
| 1 | `calorie.diet.add` | 0 | `记一餐_回执_鸡胸_20260915_193419.html` | 70046 | 是 |
| 2 | `calorie.diet.batch` | 0 | `批量记饮食_回执_燕麦粥等3项_20260915_193419.html` | 71371 | 是 |
| 3 | `calorie.diet.copy` | 0 | `复制饮食_回执_20260914_20260915_193419.html` | 69785 | 是 |
| 4 | `calorie.diet.update` | 0 | `改饮食_回执_20260915_193419.html` | 69734 | 是 |
| 5 | `calorie.diet.update-by-date` | 0 | `按日改饮食_回执_20260915_20260915_193420.html` | 69501 | 是 |
| 6 | `calorie.diet.remove` | 0 | `删饮食_回执_20260915_193420.html` | 69881 | 是 |
| 7 | `calorie.diet.remove-by-type` | 0 | `按餐别删饮食_回执_20260915早餐_20260915_193420.html` | 69566 | 是 |
| 8 | `calorie.diet.remove-by-range` | 0 | `按范围删饮食_回执_20260914至20260914_20260915_193420.html` | 69633 | 是 |
| 9 | `calorie.diet.remove-by-date` | 0 | `按日删饮食_回执_20260915_20260915_193421.html` | 69547 | 是 |
| 10 | `calorie.product.add` | 0 | `存食品_回执_鸡胸肉_20260915_193421.html` | 70035 | 是 |
| 11 | `calorie.product.update` | 0 | `改食品_回执_20260915_193421.html` | 69674 | 是 |
| 12 | `calorie.product.import` | 0 | `批量导入食品_回执_20260915_193421.html` | 70036 | 是 |
| 13 | `calorie.product.deprecate` | 0 | `下架食品_回执_20260915_193422.html` | 69920 | 是 |

条数清点：源码里 `kind: 'write'` 共 **48** 条（9 个 `commands.ts`；票面 46 的算术来自单行正则漏掉 `skill-bill\src\record\commands.ts` 两条多行写法）。其中 46 条自带可解析的 `--params` 示例 ⇒ 扣票面 13 条 ＝ **33 条**（与票面 46−13 一致），即判据 2 的比对集；另 2 条（`calorie.goal.pause`／`resume`）无示例参数未纳入。

红因归位（都不是 `#269` 引入）：

1. `pnpm build` 那条错源自 `ab645c8`（#525）把 `ACTION_BAR_DEFAULTS.minHeightPx` 由 40 改成 44、同步了运行期测试与 `spec/index.ts`，**漏改**类型期孪生件 `test-d\contract-signatures.ts:390`（仍写 40）。master 上已有修复提交 `a185119 fix(525): test-d 契约签名补 44`，本检出不含它。
2. `node packages/skill-calorie/scripts/gen-cli.mjs --check` exit 1：`src\triggers\routes.generated.ts` 第 462 行与生成器输出走散（盘上 `calorie.view.ranking` 缺 `category`）。master 上已有 `8c1d94b` 重生成，本检出不含它。
3. 点名 3 件逐条独立读数：`test\profile-doc-179.test.mjs` **红**（`tests 10 / pass 5 / fail 5`），五条断言原文＝`预检确认页按钮不对`／`预检确认页 菜单缺用途提示：粘贴给 AI / 自己看`／`calorie.water.log 缺老实物那一块的标题：✅ 操作回执`／`weight.log 缺：体重 · 写后回执`／`记体脂 缺场景 08 眉标`；`test\calorie-c43.test.mjs` **绿** `7/7`；`test\delivery-83.test.mjs` **绿** `13/13`。三条在祖先提交 `a347201` 里确实已收窄。
4. 其余 79 红分布在 20 多个测试件（skill-calorie 为主），我未逐条归因。

判据 2 我**实际验的是**：同检出内的一次 A／B 对比（A＝当刻；B＝把 `dietReceiptDoc` 改成恒返 `null`，即 `#269` 之前 `profileReceiptDoc(...) ?? res.html` 的等价行为）。两侧同参数、同空库、同冻结时钟（`--import freeze.mjs`），逐条比 `exit ＋ stdout sha256 ＋ stderr sha256 ＋ 产物 sha256 ＋ 字节数`。`#269` 的改动面就是 `write.ts` 里那处 `?? dietReceiptDoc(...)` 续接（`git show 1f88525 -- src/cli/write.ts` 可核），故 B 侧即改动前。唯一不同项 `calorie.water.log` 属**有意变更**：它在 `DIET_RECEIPT_KEYS`（`receipt.ts:52`）内，仓库自身口径把这 13 条数成「9 条饮食 ＋ 3 条食品库 ＋ 1 条饮水」（`profile-doc-179.test.mjs` 注释），与票面 13 条（含 `product.import`、不含 `water.log`）不是同一组。

## 逐条路径

- 已还原的源码（本席只碰过这一件）：`packages/skill-calorie/src/diet/receipt.ts` —— 还原后 `git hash-object` ＝ `452f2a8fa43f1b26910e18aab70f23e3b0263e69` ＝ `HEAD` 那一版；`git status` 除本席新增件外干净。
- 新增交付：`docs/skills/skill-calorie/t269-终验-run.mjs`（一条命令重跑判据 1 那张表）、`docs/skills/skill-calorie/t269-终验-lane.md`（本件）。
- 证据脚本（草稿区）：`.scratch/t269\nondiet-ab.mjs`（判据 2 的 A／B）、`.scratch/t269\freeze.mjs`（时钟冻结）、`.scratch/t269\which2.mjs`（条数清点）。
- 日志：`.scratch/t269\` 下 `build.log`、`gen-check.log`、`test.log`（首轮 102 红）、`test2.log`（79 红）、`chain-exits.txt`（`STAMP_EXIT=0／CLIENT_EXIT=0／TEST2_EXIT=1`）、`run13-final.log`、`run13.md`、`mut-t496.log`、`restore-t496.log`、`debt-profile-doc-179.log`、`debt-calorie-c43.log`、`debt-delivery-83.log`、`ab-a.json`、`ab-b.json`。

## 未做项与下一手缺什么

1. **判据 3 未达成**，但两处修法都在 master 的 10 个提交里：把检出前进到含 `a185119`（build 红）与 `8c1d94b`（派生路由红）的 master 再重跑本件；若不能前进检出，最小改动是 `test-d\contract-signatures.ts:390` 的 `minHeightPx: 40` → `44`（范围外，本席未改）。
2. **79 红的基线没归因**：本检出只逐条确认点名 3 件；master 另有 10 个提交（含测试件改名 `t274-` 前缀、示例参数换成占位符），未在 master 上取基线 ⇒ 要以「不新增红」判定前，得先在 master 上跑一轮 `pnpm test` 作基线。
3. **判据 2 的验法如上声明**：验的是本检出内 A／B，不是另建改动前检出；33 条里有 6 条因示例参数指向不存在的记录而 `exit 4`（两态一致，无产物可比）。
4. **口径差待对齐**：票面 13 条与仓库自身的「饮食这一族 13 条」差一项（`product.import` ↔ `water.log`），`DIET_RECEIPT_KEYS` 实为 14 条；本件按票面 13 条报数，但判据 2 的「其余」按票面算术会把 `water.log` 卷进来 —— 下一手要么统一口径，要么把票面改成 14 条。
5. 环境告示：`D:\ilife-wt\wf155-a\node_modules` 是指向 `D:\ilife\node_modules` 的 junction，`pnpm build`／`pnpm test` 起手会做一次依赖校验安装（日志 `Recreating D:\ilife\node_modules` 后 `Already up to date`，再按同一锁文件重链）——本席不能排除对主工作区 `node_modules` 的触碰，如实记在此处。
