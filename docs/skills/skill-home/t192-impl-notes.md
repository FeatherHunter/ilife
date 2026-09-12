# 票 #192 实施记录：`SKILL.md` 说明面（HELP 交付 ＋ 运行时小节 ＋ 导出门扩居家）

## 一、逐件交付

1. **新增「HELP 交付」节**（`SKILL.md:19-35`）：缺省＝落 HELP 文件并回执绝对路径（`<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`，同秒尾缀递补 `_N`）；完成判据＝该文件存在且大小＝回执 `delivery.bytes`；`{"mode":"lookup"}`＝速查表产物（`居家管家_速查表_<时间戳>.html`，与 HELP **分名**）、`{"q":…}`＝现找只回命中**不落盘**，两支互斥（同给或非法 `mode` → exit 2，stderr 走 `ERR 2: …`）；边界写明不管其余 20 条 `home.*` 命令、不管 `--html` 支、不管面板／侧栏。另写「不开库」：开库之前分派，产物目录 0 个 `.db`（票 7 实测）。
2. **frontmatter `description` 改对**（`SKILL.md:3`）：旧文案「出一份居家管家速查列表」已过时且会骗到读技能目录的 AI，照账单写法改成「缺省落一份 HELP 文件并回执绝对路径（老骨架 9 域／30 组／73 场景）」；触发词清单等其余原样保留；`name`／`help_wake_word` 一字未动。
3. **补「公共安装器运行时（skills-cli 装完必读，#47）」节**（`SKILL.md:155-164`）：照卡路里那节的形状换成居家包名／命令——`dist/` 不进 git、运行时走 npm；取运行时二选一（`npm install -g skill-home` ／ `npx -p skill-home home-cmd-read …`）；端到端验证给 sh（`export SKILLS_DB_PATH="$(mktemp -d)"`）与 PowerShell（`$env:SKILLS_DB_PATH = "$env:TEMP\sk-test"`）两写法、node>=22.13（`engines` 钉死），命令＝`node packages/skill-home/dist/cli/cmd_read.js home.help.lookup`，跑通的样子＝`delivery.path` 存在且大小＝`delivery.bytes`。**不编版本号**：写明尚未发布到 npm（`package.json` 现 `0.1.0`，阻塞见 docs/public-installer-47.md「已发布包阻塞」），本节走「本仓构建产物」那条路，版本号留给发版票回填。
4. **`build-help.mjs` 保检出换行**（`:28` → `:28-31`）：照账单 `build-help.mjs:34-37` 改成 `eol = text.includes('\r\n') ? '\r\n' : '\n'` ＋ `buildHelpBlock().split('\n').join(eol)`。
5. **新增「装出来的那份怎么判新旧」节**（`SKILL.md:37-39`，票面第 12 行要求）：是链接（Junction）＝同一份、改仓内立即生效；若是拷贝才谈新旧，**只能比 `SKILL.md` 的哈希**。编排方四件清单没列它，按票面补上。
6. **导出用例扩到居家**（`test/skills-export-47.test.mjs`）：`PKGS` → `['skill-calorie','skill-home']`；末尾清单断言同步改 2 包；原 `@0.2.3` 断言改按包查 `NPM_PIN`——只对已发布的 calorie 钉版本号，居家改钉「本仓构建产物」那句（不编版本号）。

## 二、实跑（实际命令与实际输出）

| 命令 | 结果 |
|---|---|
| `node packages/skill-home/scripts/build-help.mjs` | exit 0；`HELP 已注入：D:\ilife\packages\skill-home\SKILL.md`；注入成功、标记块仍在 |
| `node --test test/skills-export-47.test.mjs` | **tests 5／pass 5／fail 0**（含居家两条） |
| `node tooling/check-boundaries.mjs` | exit 0、`boundaries: PASS` |

## 三、换行实测（探针在 `.scratch/home-t192/`，gitignore）

- 真件本来就是 **LF**：跑 `build-help.mjs` 前后 **sha256 一字不变**（`b836ac7f…`；16808 字节、lf=164、cr=0、lone_LF=164、无 BOM）⇒ 注入幂等，本票改的是「**不再引入 CR**」的保证，不是修一个已发生的损坏。
- CRLF 探针（同一份 `build-help.mjs` 拷进 `.scratch`、`SKILL.md` 转 CRLF、`dist` 用目录联接指回真件）实跑：前后 **sha256 也一字不变**（`e1c303a8…`；lf=164、cr=164、**lone_LF=0**）⇒ 检出是 CRLF 时注入仍写 CRLF，不再硬拼 `\n` 打乱检出换行。
- `SKILL.md` 改动只在三处（`git diff -U0` 只有 `@@ -3 +3 @@` 与两处纯新增 `@@ -18,0 +19,22 @@`、`@@ -131,0 +154,11 @@`），**注入块区一行未动**。

## 四、超线报警（第四步）

无新超线：`build-help.mjs` 40 行、导出用例 71 行（测试件本就不计）、`SKILL.md` 164 行（管辖外文档）；本票未碰管辖内源码件。

## 五、未做与不确定项

- 只碰允许的四件＋本文件；未碰 `packages/skill-home/test/**`、`src/**`、`base-*`、`base-combos`；未跑仓根 `pnpm build`／`pnpm test`；未重启 DSH；未 commit。探针 `.scratch/home-t192/`（含 `dist` 目录联接）保留未删。
- **不确定／留票**：① 复用窗口（`reuseHours`）真实存在（票 7 实测），但编排方四件未列、票面也没点名，未写进说明面；② `skill-home` 是否／何时发布到 npm 与版本号——留发版票；③ 本机 `~/.agents/skills/` 下**没有** skill-home（skill-calorie 是实目录＝拷贝，bill／chef／memo 是 Junction），故判新旧一节写成链接／拷贝两分的通用口径，未声称任何一台机器的实测状态；④ 速查表载荷条数（票 7 实测 `items=91`）未写：91 与「9 域／30 组／73 场景」不是同一粒度，没弄清它数的是什么，宁缺不编。
