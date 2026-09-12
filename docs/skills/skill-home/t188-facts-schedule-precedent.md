# 作息管家 HELP 交付先例（事实＋行号）

范围：`packages/skill-schedule/` 的 `src/help/**` 与 `scripts/**`；行数为 LF 实测。

## 一 · 文件清单（件＋行数＋职责）

| 件 | 行数 | 职责 |
|---|---|---|
| `src/help/scenes/help-assets.ts` | 2198 | 机器生成的内容资产（73873 B，唯一内容副本） |
| `src/help/helpFile.ts` | 182 | 资产＋派生 → HELP JSON → 全页 HTML（零 IO） |
| `src/help/output.ts` | 89 | 唯一落盘点 `deliverHtml`（独占＋递补／逐字覆盖） |
| `src/help/lookup.ts` | 43 | 速查表：`WAKE_TABLE` → phrase／key／cli |
| `src/help/helpPaths.ts` | 30 | 落点目录通式 `schedule_html/help/`（零 IO） |
| `src/help/index.ts` | 2 | 速查 barrel（只转发 lookup） |
| `scripts/gen-help-assets.mjs` | 423 | 内容资产生成器（`--check`／sha256 打印） |
| `scripts/build-help.mjs` | 28 | 构建期把速查表写进 `SKILL.md` 标记块 |
| `test/help-assets.test.mjs` | 186 | 对账＋摘要锁＋`--check` 可重跑 |

## 二 · 内容资产的形态与落点

- 路径 `packages/skill-schedule/src/help/scenes/help-assets.ts`；2198 LF／73873 B／无 BOM。
- 导出 10 个：类型 5（`HelpSceneField`:42／`HelpSceneStatus`:57／`HelpSceneAsset`:60／`HelpSubgroupAsset`:71／`HelpGroupAsset`:78）＋常量 5（`HELP_GROUPS`:86／`HELP_ASSETS`:2087／`HELP_SCENE_RESULTS`:2094／`HELP_GROUP_NOTES`:2184／`HELP_TOTALS`:2193）。
- 头注释：`:1`「机器生成，禁手改词」；`:3` 唯一内容源；`:5` 写明生成器名与规模「5 个一级分组／34 条唤醒词／85 条场景」；`:38` 改词命令行原文。
- 一级分组 id 5 个：`write`／`query`／`plan`／`analyze`／`admin`（:88 起）；34 条二级组 id 是「一级 id＋序号」（`write_1`:93 … `admin_3`:2069）。

## 三 · 生成器怎么跑

- 命令行原文（生成器头 :11-13）：`node packages/skill-schedule/scripts/gen-help-assets.mjs`（落盘）／`… --check`（只比对，不一致 exit 1）／`… --src <源.json> --out <目标.ts>`；参数解析 :379-385。
- **输入源＝仓内路径、不入库**：`:36` `DEFAULT_SRC = join(REPO_DIR, '.scratch', 't198', 'old-scenarios.json')`，实盘 `D:\ilife\.scratch\t198\old-scenarios.json`（存在）；`.gitignore:5` ＝ `.scratch/`；:15-16 自陈「事实源在 `.scratch/`（工作副本，不入库），故 `--check` 只在源在盘的机器上可跑」。测试侧同路径 `test/help-assets.test.mjs:17`。
- 源不在盘即抛错，不拿空内容当一致：`:64` `throw new Error('事实源不在盘上：' + src)`（另 :66 BOM、:68 非法 UTF-8 也抛）。
- 输出：不带 `--check` → `mkdirSync` ＋ `:413` `writeFileSync(out, text, 'utf8')`；落点 `:37` `DEFAULT_OUT = <pkg>/src/help/scenes/help-assets.ts`。
- `--check`：`:405-406` 读 `out` 现状逐字比；不同 → stderr `不一致：<out> 与生成结果不同（禁止手改；重跑不带 --check 即覆盖）` ＋ `:408` `process.exit(1)`；相同 → `一致：…字节相同`（:410）。文件缺失按空串比 → 必不一致。
- 每次都打印 3 行摘要 :400-402（场景规范形／prompt 拼接／产物文件 sha256＋字节数）；被 import 静默（`isMain` 守卫 :419-423）。

## 四 · 摘要锁

- 锁在**测试里**，生成器只打印不锁：`test/help-assets.test.mjs:32` `DIGEST_SCENES='5b8556ad…'`、`:34` `DIGEST_PROMPTS='38fc4b4f…'`。
- 覆盖：`:154` 场景规范形（id／标题／唤醒词／状态／prompt 全文／各字段）；`:155` 85 条 prompt 用 `\n` 拼接 → **只锁这两段，不锁产物整文件字节**。规范形测试自写一份（:37-42），生成器另有一份（:233-238），互为复核。
- 同台另钉编码：`:157` 不许 U+FFFD、`:158` 不许 CR。
- 整文件字节相等只在生成器 `--check`：`:181-182` 真跑 `execFileSync(node, [GEN,'--check'])`，但该用例带 skip（:21，源不在盘即跳过）。

## 五 · 门（谁在跑）

- `packages/skill-schedule/package.json:31-34` 原文两条：`"build": "tsc -b && node scripts/build-help.mjs"`；`"test": "node --test ../../test/scaffold.test.mjs test/*.test.mjs"`。
- 生成器**不在** `build`／`test` 脚本里；但包内 `test` 收 `test/*.test.mjs`（居家只收 scaffold），故资产锁与 `--check` 用例会被跑。
- 仓根 `package.json:11` `"build": "tsc -b"`；`:13` 的 `test` glob 含 `"packages/skill-schedule/test/*.test.mjs"`。
- CI `.github/workflows/ci.yml:29` `pnpm build`、`:34` `pnpm test`（windows 支 :115／:117）；对 `gen-help-assets` 零直接引用，且 `.scratch/` 不入库 → CI 上 `--check` 用例 skip，只剩摘要锁。

## 六 · 渲染接线怎么消费资产（只记形状）

- `helpFile.ts:161` `buildHelpFileData(now = new Date(), opts = {}): HelpFileData` → `assertGroupsUsable()`（:116）后 `groups: HELP_GROUPS`（:169）直转（不 clone）＋五键头＋`version`（:35 `'2.0'`）＋`init_banner`。
- `helpFile.ts:179` `renderHelpFileHtml(data: HelpFileData): string` → 只转发 `base-paint/help-shell` 的 `renderHelpShellHtml`（:181），不自持模板；页头摘要 `deriveSummaryLine`（:105），首用横幅取 `HELP_INIT_SCENE_ID='first_use'`（:37）。

## 七 · 照抄清单（10 件）

1. `src/help/scenes/help-assets.ts` —— 机器生成的资产，禁手改。
2. `scripts/gen-help-assets.mjs` —— 生成器：读源 → 断言 → 序列化，带 `isMain` 守卫。
3. `test/help-assets.test.mjs` —— 逐条对账＋两把摘要锁＋`--check` 可重跑。
4. `src/help/helpFile.ts` —— 资产 → HELP JSON → HTML（照 bill 同构）。
5. `src/help/helpPaths.ts` —— 落点目录（:19、:28）。
6. `src/help/output.ts` —— 唯一落盘点 `deliverHtml`（:58）。
7. `src/help/index.ts` —— 速查 barrel；居家要保住自己的转发面。
8. `scripts/build-help.mjs` —— 注入块不归生成器；居家只补换行探测。
9. `package.json` 的 `scripts.test` 扩成收包内 `test/*.test.mjs`（:33）。
10. 同形事实源说明文档（照 `docs/skills/skill-schedule/t198-old-help-truth.md`）。

## 八 · 作息自己留的洞

- 输入源在 `.scratch/`＝仓内路径但**不入库**（`.gitignore:5`）：换机器／CI 跑不了生成器，资产成唯一副本，`--check` 门自动失效（`test:20-21` skip）。
- 生成器 423 LF 超结构告警线 350，且没有任何门挂它（`package.json:32-33` 无引用）。
- 摘要锁不覆盖产物整文件字节：只锁场景规范形＋prompt 两段；生成器 stdout 的三个 sha256 无人对账（:400-402）。
- 规范形两份手写实现（生成器 :233-238／测试 :37-42），改一处容易漏另一处。
- 同包 `scripts/build-help.mjs` 无主入口守卫（:21-28 顶层直接写 `SKILL.md`），被 `test/skill.test.mjs:7` import 即写盘；生成器注释 :8 自己点名「别照抄」。两者**不抢**同一块：生成器只写资产（:37／:413），不碰 `SKILL.md`。
- 二级组 id 由位置派生（生成器 :205-206），重排分组／唤醒词次序即错位。
- 文档计数已过期：`docs/skills/skill-schedule/t199-evidence.md:41,253,294` 记 2185／395 行，实测 2198／423。
