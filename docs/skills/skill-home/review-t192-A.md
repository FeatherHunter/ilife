# 审票 #192（A 线）对抗式审查：skill-home 说明面

**裁决：整改后通过　总分 80／100**（A 24／40　B 31／35　C 25／25）。证据＝我自跑探针（`.scratch/home-t192/probe-branches.mjs`、`probe-reuse.mjs`、`crlf/`、`install/`）；未改任何受审文件。

## 一、文档与真实行为（A＝24／40）

**实测为真的承诺**（`SKILLS_DB_PATH`＝临时目录，跑 `dist/cli/cmd_read.js home.help.lookup`）：exit 0；产物 `home_manager_html/居家管家_HELP_20260912_210155.html` 与 `src/help/manifest.ts:18,21` 逐字一致；stdout 顶层 `delivery{mode:"file",path,bytes}`，`path` 绝对、`bytes=132318`＝实际文件字节（`SKILL.md:23,28` 成立）；`{"mode":"lookup"}` → `居家管家_速查表_<戳>.html`（`manifest.ts:25`，与 HELP 分名）；`{"q":"查物品"}` 只回命中、**不落盘**、无 `delivery`；`q`＋`mode` 同给／`mode:"center"`／`q:123` 三例均 exit 2、stderr `ERR 2: …`、**stdout 全空**（`:26` 成立）；跑完全树 `.db` ＝ **0**（`:32` 成立；不设 `SKILLS_DB_PATH` 是 exit **1**，不在本节承诺内）；`HOME_KEY_SHAPES` 恰 21 键 ⇒「其余 20 条」（`:35`）成立；`src/help/helpFile.ts:51,272` 确实调 `base-paint/help-shell` 的 `renderHelpShellHtml`（`:33` 成立）；`9 域／30 组／73 场景` 由 `test/help-assets.test.mjs:24-25` 自锁（`:3` 成立）。

**缺陷（写了但代码不支持）**：

1. **`SKILL.md:158`「`skill-home` 尚未发布到 npm」是假的。** `registry.npmjs.org` 与 npmmirror 均有 `skill-home@0.1.0`（2026-09-07 发布，`bin=home-cmd-read`、`engines node>=22.13`、deps `base-link-core@workspace:^0.1.0`）；我在 `.scratch/home-t192/install/` 实装 `npm install skill-home@0.1.0` 真报 `EUNSUPPORTEDPROTOCOL`（`workspace:` 未改写）——真阻塞与它自己引的 `docs/public-installer-47.md:58-68`「已发布包阻塞／待重发」一致。把「已发布但新装必失败」写成「未发布」，读者会等**首发**而非**重发**。同句结论仍要落在 `.db` 上，一句「尚未发布」撑不起「发布前走本仓构建产物」这条分支的理由。
2. **`SKILL.md:23`「（同秒已有同名件时尾缀递补 `_N`）」在缺省支不成立。** 缺省吃 `HELP_REUSE_DEFAULT_HOURS`＝一天（`base-render/src/output/saveHtml.ts:294-301`；`src/cli/cmd_read.ts:64`）。实测同目录连跑两次 → 第二次回**同一路径**、不落 `_2`；`_2` 只在 `{"reuseHours":0}` 时出现（`probe-reuse.mjs`：缺省 2 次共 1 份；`reuseHours:0` 两次 → `…_2.html`）。
3. **`SKILL.md:19-35` 通篇不提复用窗口**（全文「复用／reuseHours」命中 0 次），而兄弟五家都写了 #245 那行（`skill-calorie/SKILL.md:191`、`skill-bill:117`、`skill-memo-ilife:65`、`skill-schedule:93`、`skill-chef:30`）。后果：AI 以为每次调用都产新件；「窗口内已有一份、刚改过 HELP 内容也不自动刷新」这个坑没写（`t192-impl-notes.md:33①` 自认未写）。
4. `SKILL.md:39` 把判新旧的对象写死成 `~/.agents/skills/skill-home`，本机 `~/.agents/skills/` 只有 bill／chef／memo-ilife（Junction）与 calorie（实目录），**没有 skill-home** ⇒ 照抄 `Get-Item` 只报「找不到路径」。判法本身有效（我用 skill-chef 实测 `LinkType = Junction`）。

## 二、npm 那节判定

结构同形（`skill-calorie/SKILL.md:202-205`），但**事实层不同形且更危险**：卡路里写「若 npm 报 EUNSUPPORTEDPROTOCOL（workspace:），说明已发布包待重发…」，居家写成「尚未发布」。它先把 `npm install -g skill-home`／`npx -p skill-home` 列成「二选一」，再在同节否定——照第一条做必失败（我实测），且失败原因与文档所述不符 ⇒ 是死路，且理由错。应改成「已发 0.1.0、`workspace:` 未改写 ⇒ 新装必 EUNSUPPORTEDPROTOCOL，发布前一律走本仓构建产物」，或给这两条加显式「当前不可用」标。

## 三、换行修法（真做、真有效）

`scripts/build-help.mjs:28-31` 确按**检出换行**写回：`eol = text.includes('\r\n') ? '\r\n' : '\n'` ＋ `buildHelpBlock().split('\n').join(eol)`，不是另一种硬拼。独立 CRLF 探针（真件同字节脚本 ＋ SKILL.md 转 CRLF ＋ `dist` Junction 指回真件）：注入前后 **sha256 不变**（`2A9E6ED153E3`；lf=164／crlf=164／lone_LF=0）；真件 LF（无 BOM，`B836AC7FB9F1`）注入前后亦不变 ⇒ 幂等、不引入 CR、BOM 保持。

## 四、导出用例（真跑）

`PKGS` 已加 `skill-home`、清单断言同步 2 包；`NPM_PIN` **只钉已发布的 `skill-calorie@0.2.3`**（registry 实有 0.2.3），居家走 else 支断「本仓构建产物」。实跑 `node --test test/skills-export-47.test.mjs` → **tests 5／pass 5／fail 0**。扣分项：`test/skills-export-47.test.mjs:23-25` 注释把前提写成「未发布的包（skill-home 现为 0.1.0）」，与一·1 同源（断言结果倒对：0.1.0 新装必失败，确实不该钉）。

## 五、纪律与越界

`git status --short` ＋ mtime 对账：本票笔迹只有 `SKILL.md`(20:56)、`scripts/build-help.mjs`(20:55)、`test/skills-export-47.test.mjs`(20:56)、`t192-impl-notes.md`(20:57)；`git diff -U0 SKILL.md` 恰三块（`@@ -3 +3 @@`、`@@ -18,0 +19,22 @@`、`@@ -131,0 +154,11 @@`），**注入块区一行未动**。`packages/skill-home/test/**`（`help-delivery-190.test.mjs`）、`src/help/manifest.ts`、`packages/skill-home/package.json` 的同窗改动均可归 **#245／#237 复用窗口那票**（内容全是 `reuseHours`／`saveHtmlFile`）⇒ **无可归本票的越界**；未碰 `src/**`、`packages/base-*`；未 `git add`／`commit`；未跑仓根 `pnpm build`／`pnpm test`；探针 `.scratch/home-t192/{check.mjs,probe/}` 与我的并存，不影响仓库。

## 六、打分

| 轴 | 分 | 依据 |
|---|---|---|
| A 文档与行为一致 | **24／40** | 核心 15 条承诺实测为真；缺陷 1（假「未发布」）−7、缺陷 2（假 `_N` 递补、缺复用窗口）−7、缺陷 4 −2 |
| B 换行修法与导出用例 | **31／35** | 修法真有效（CRLF 实测 sha 不变）、用例 5/5 真跑；注释前提假 −4 |
| C 纪律与越界 | **25／25** | 无越界、无越权命令、改动面与实施记录一致 |
