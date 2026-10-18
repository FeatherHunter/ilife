# awesome 上架台账（本仓）

规则与用法在 [`awesome插件市场投稿.md`](awesome插件市场投稿.md)（那一份可以直接拷给别的项目）；本文只记**本仓的现场读数**，不重复规则。

## 一、七个插件的上架状态（读数 2026-09-20）

每条的 `url` 都是 `https://github.com/FeatherHunter/ilife/tree/master/<仓内目录>`——本仓默认分支是 `master`，不是 `main`。

| npm 包 | 仓内目录 | 条目 `name` | 分类 | 状态 |
| --- | --- | --- | --- | --- |
| `dsh-life-pack` | `packages/plugin-manager` | `FeatherHunter/ilife#dsh-life-pack` | `ui` | **已收录**（PR #5514 已合并）；预构建包行已交 [PR #7452](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7452)（只加 `tarball:`，等合并） |
| `dsh-bill-ilife` | `packages/plugin-bill-ilife` | `FeatherHunter/ilife#dsh-bill-ilife` | 待定 | 未投稿 |
| `dsh-calorie` | `packages/plugin-calorie` | `FeatherHunter/ilife#dsh-calorie` | 待定 | 未投稿 |
| `dsh-chef` | `packages/plugin-chef` | `FeatherHunter/ilife#dsh-chef` | 待定 | 未投稿 |
| `dsh-home-ilife` | `packages/plugin-home-ilife` | `FeatherHunter/ilife#dsh-home-ilife` | 待定 | 未投稿 |
| `dsh-memo-ilife` | `packages/plugin-memo-ilife` | `FeatherHunter/ilife#dsh-memo-ilife` | 待定 | 未投稿 |
| `dsh-schedule-ilife` | `packages/plugin-schedule-ilife` | `FeatherHunter/ilife#dsh-schedule-ilife` | 待定 | 未投稿 |

- **为什么先投总管**：`dsh-life-pack` 自己带行为（爱生活卡 ＋ 页签条 ＋ 配置体检 ＋ 更新面板），不是只有依赖清单的聚合包，所以占得住一行。六个单品各自是可独立安装的插件，属于另外的投稿。
- **六个单品要几个 PR**：一个 PR 最多 3 条，所以至少两个 PR；合并后各占一行，不会被当成同一份工作重复计数。
- 分类待定不等于没想：六个单品按各自实际做法分（记账、饮食、菜谱、居物、笔记、作息各不同），投稿那一刻再定即可，选偏了维护者会改。

## 二、已完成的仓外改动与读数

- `FeatherHunter/ilife` 加了 `dsh-plugin` topic（收录门槛之一；此前该仓库没有任何 topic）。
- 条目文件 `data/plugins/FeatherHunter__ilife--packages-plugin-manager.yml` 提交在分叉 `FeatherHunter/awesome-dsh-plugin` 的分支 `add-ilife-dsh-life-pack`，基线是该仓当时的 `main`，只加这一个文件。
- **PR #5514 的检查读数**：`check`（PR check）与 `Submission gate` 两道都 pass；gate 结论原文 `All 1 submitted entry passes: dsh.bundle declared, repo old enough, enough commits.`——它按条目 `url` 指到的 `packages/plugin-manager/package.json` 读到 `dsh.bundle`，并按仓库创建日期（2026-09-06）判年龄。合并由维护者做，两个 README 在合并后于 `main` 上重生成。

### 截图（已生效）

`packages/plugin-manager/screenshots.json` 声明三张，**数组顺序就是展示顺序**：

| # | 文件 | 内容 |
| --- | --- | --- |
| 1 | `screenshots/爱生活-配置面板.png` | DSH 设置弹窗里的爱生活卡：总管版本行、配置体检、六家页签条、卡路里·配置页 |
| 2 | `screenshots/饼干记账-HELP.png` | 饼干记账 使用手册（74 场景） |
| 3 | `screenshots/卡路里-HELP.png` | 卡路里 唤醒词速查台（437 场景） |

- 提交 `04822cef`，随 `dfebf476` 推上 `master`（2026-09-20 17:37）。
- 按上游 `probe-screenshots.mjs` 的同一套判据复核过：`screenshots.json` 读回 HTTP 200，三张图 `Range: bytes=0-0` 全 206（LIVE）——市场下一次构建就会读到。

## 三、下载量：0.3.55 起关联成立，等上游探针采样

关联判据在上游 `scripts/probe-npm.mjs`：按条目 `url` 那层读 `package.json` 拿包名 → 取 registry 上 `dist-tags.latest` 那一版 manifest 的 `repository` → 小写包含 `featherhunter/ilife` 才算关联。

**云端读数（2026-10-15）**：七个包 `0.3.55` 已是各自的 `latest`，且 manifest 均带 `repository`（`npm view dsh-life-pack repository --json` 打出 `git+https://github.com/FeatherHunter/ilife.git` ＋ `directory: packages/plugin-manager`）。⇒ 关联条件已满足，剩下的是等上游探针（每天跑）采到 `downloads.json` 里出现我方键。

**字段已经补齐**（提交 `e32e8a72`）：七个包的 `package.json` 各加一段，指向 `git+https://github.com/FeatherHunter/ilife.git` 与各自的 `directory`。下一次发版无论版本号是多少都会带上它，关联与下载量随之成立。版本号不由本席定。

| 项 | 读数 |
| --- | --- |
| 七个包的 `repository` | ✅ 已加（`e32e8a72`）。本地复核：`check-publish --pre` PASS（七个包全 OK）＋ `test/plugin-p10-boundaries.test.mjs`／`plugin-p10-install.test.mjs` 22 pass / 0 fail |
| 六家的 `dsh-life-pack` 范围 | ✅ 已是 `^0.3.3`（来自 #744 的定版提交 `7534adb4`，不是本席改的；`plugin-p10-boundaries.test.mjs:38` 与 `plugin-p10-install.test.mjs:46` 咬这条） |
| `pnpm-lock.yaml` 的 specifier | ✅ 六处已跟到 `^0.3.3`（#744） |
| 出下载量 | ⏳ 字段已随 0.3.55 发出，等上游探针采样（每天跑） |


发布窗口的两条硬约束：

1. **打包的是工作区，不是提交。** `tooling/wizard-publish.ps1` 走 `npm publish`，包里 `files` 只含 `dist` 与 `cordis.patch.yml`——发出去的是**盘上当前的 `dist/`**。发版前确认没有别席正在改 `packages/plugin-*/src`（有未提交改动时发版，等于把那一席没做完的产物发上 npm；#734 记过总管处在同一处境时本轮不发）。
2. **要人批准 2FA**：侧边栏终端跑 `pwsh -NoProfile -File tooling\wizard-publish.ps1 -Auto -Package dsh-life-pack`；跑之前先过 `tooling/check-publish.mjs` 三道门（`--pre`／`--tarball`／`--fresh-tmp`，都带 `--only dsh-life-pack`）。
3. **发版分两次看**：`wizard-publish.ps1` 按「云端已有该版本就跳过」工作，所以本地版本号不动就不会重发——字段补了但版本没升＝它一直休眠，这是预期的。
4. **同窗口顺带看 `publish:fresh` 那道红**：`master` 上 CI 的 `install`／`build`／`publish:pre`／`publish:tarball` 都过，红在 `publish:fresh`——`skill-calorie` 安装态装载器导入失败（`dist/render/templates.js` 不在 registry 那一版产物里，日志自注「版本偏斜，非本票红」）。

六个单品的 `repository` 已在 `e32e8a72` 一并补上，**0.3.55 起七个包的云端 latest 全带字段**——它们各自投稿后要出下载量，只剩等上游探针采样。

## 六、v0.3.55（2026-10-15）：release 已立＋预构建包条目已交

- GitHub Release：`v0.3.55`（`更新系统跟到 dsh-plugin-update 0.17.0`），8 个资产——`dsh-life-pack.tgz`（无版本号，供条目 `tarball:` 走 `latest/download` 长链接）＋ 七个 `*-0.3.55.tgz`。稳定链接存活（`latest/download/dsh-life-pack.tgz` → 302）。
- 上游条目更新：[PR #7452](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7452)，**只加一行 `tarball:`，介绍文本与分类逐字不动**；分支基线取上游 `main` 最新提交，Files changed 只有那一个 `.yml`。等两道检查＋维护者合并。
- npm 侧：七个 `0.3.55` 均为 `latest`（token 向导 `PKG-OK × 7`，`--post` PASS）。

## 七、v0.3.56（2026-10-15）：release 已立，条目无需改动

- GitHub Release：`v0.3.56`（`更新系统跟到 dsh-plugin-update 0.17.1`），8 个资产——`dsh-life-pack.tgz`（别名已刷新，`latest/download` 即刻起给 0.3.56 包）＋ 七个 `*-0.3.56.tgz`。
- 上游条目**零改动**：`tarball:` 走 `releases/latest/download` 长链接（不含版本号）；版本号由上游探针按条目 `url` 实时读 master 的 `package.json`（PR #1286 合并后即 0.3.56）；介绍文本与分类逐字不动。PR #7452（加 `tarball:` 那行）仍 OPEN 等维护者合并。
- npm 侧：七个 `0.3.56` 均为 `latest`（token 发布 `PKG-OK × 7`，`--post` PASS），manifest 照旧带 `repository`，关联条件继续成立。

## 八、v0.3.65（2026-10-16）：已发版 ✅

- 内容：总管依赖 `dsh-plugin-update ^0.18.5`（0.18.4 失败原因行前置＋0.18.5 安装失败翻译官；三版 `install-button` 逐字节一致，我方样式覆盖不受影响）＋ 缺席面板去空行（#1282，步骤容器与挂载位改 div）＋ 六单品 `dsh-life-pack` pin 补到 `0.3.65`（0.3.64 那轮漏了交叉引用，已发出的六个 0.3.64 单品钉的还是 0.3.63）。
- npm 侧：七个 `0.3.65` 均为 `latest`（token 直发 `PKG-OK × 7`，`--post` PASS，`--fresh-tmp` 由红转绿），manifest 照旧带 `repository`，关联条件继续成立。
- GitHub Release：`v0.3.65` 已立，8 个资产——`dsh-life-pack.tgz`（别名已刷新，`latest/download` 即刻起给 0.3.65 包）＋ 七个 `*-0.3.65.tgz`。
- 上游条目**零改动**：`tarball:` 走 `releases/latest/download` 长链接（不含版本号）；版本号由上游探针按条目 `url` 实时读 master 的 `package.json`；介绍文本与分类逐字不动。PR #7452（加 `tarball:` 那行）仍 OPEN 等维护者合并；`downloads.json` 仍无我方键（等探针采样）。
- 本轮发布方式变更记录：`wizard-publish.ps1` 要求真 TTY（非 TTY 下 exit 2），0.3.65 起改走同语义 token 直发脚本 `.scratch/do-publish-0365.ps1`（云端有则跳过、总管先行、里程碑写 `.scratch/publish-log.txt` 同一套关键字），判据只认 registry 读回。

## 九、v0.3.66（2026-10-17）：已发版 ✅

- 内容：总管依赖 `dsh-plugin-update ^0.18.6`（合规版降级：年龄门拦住时给"满门限的最新版"选择＋两条新电话；`install-button` 两版逐字节一致，我方挂载与样式覆盖不受影响）。六单品 `dsh-life-pack` pin 同步到 `0.3.66`。
- npm 侧：七个 `0.3.66` 均为 `latest`（直发 `PKG-OK × 7`，`--post` PASS，`--fresh-tmp` PASS），manifest 照旧带 `repository`，关联条件继续成立。
- GitHub Release：`v0.3.66` 已立，8 个资产——`dsh-life-pack.tgz`（别名已刷新，`latest/download` 即刻起给 0.3.66 包）＋ 七个 `*-0.3.66.tgz`。
- 上游条目**零改动**：介绍文本与分类逐字不动。PR #7452 仍 OPEN；`downloads.json` 仍无我方键（等探针采样）。
- 致谢复核：PR 34＋issue 1258，全是 FeatherHunter，🌹×1292 继续有效。

## 十、v0.3.67（2026-10-17）：已发版 ✅

- 内容：总管依赖 `dsh-plugin-update ^0.18.7`（批量面接上合规版降级：行级与批量级共用同一套兜底、确认后才装、永不静默降级；异步安装失败归因改走宿主新增的机读 `diag`；四个接线子路径类型契约不变或纯追加，本仓源码零改动）＋ 面板宽度不再跟着宿主滚动条变（最近可滚动祖先钉 `scrollbar-gutter: stable`，新增 206 行用例 `panel-width-stable.test.mjs`）。六单品 `dsh-life-pack` pin 同步到 `0.3.67`；`skill-*`／`base-*` pin 保持 `0.3.54`。
- npm 侧：七个 `0.3.67` 均为 `latest`（token 直发 `PKG-OK × 7`，`--post` PASS；`--pre`／`--tarball` PASS）。
- `--fresh-tmp` 那一红＝**既有版本偏斜**，非本版引入：本地工作区的 `skill-calorie`（0.3.54 号）已 import `base-paint/help-key`（提交 `301e30c4`，2026-10-15 #1281），而 registry 上 `base-paint@0.3.54` 的 `exports` 没有 `./help-key`；实测 registry 装的组合（skill-calorie 0.3.54 ＋ base-paint 0.3.54 都来自云端）跑 `calorie.help.center` **exit 0**，本地打包的组合才红 ⇒ 用户侧不受影响，等 base-paint 进位发版后该门自动转绿。
- GitHub Release：`v0.3.67` 已立，8 个资产——`dsh-life-pack.tgz`（别名已刷新，`latest/download` 即刻起给 0.3.67 包）＋ 七个 `*-0.3.67.tgz`。
- 上游条目**零改动、且已合并**：[PR #7452](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7452) **MERGED**（2026-10-17T08:12:34Z，`check`＋`Submission gate` 双 SUCCESS，Files changed 只有那一个 yml）；条目介绍文本逐字未动。
- 市场现值（`npm pack dsh-plugin-catalog` 2026.1017.6255 解包 `plugins.json`）：我方条目 `version 0.3.66`（版本号由上游探针读 master `package.json` 自动跟，不用提 PR）、`downloads 10937`、`stars 14`、`added 2026-09-20`、3 张截图已生效。
- **台账更正**：上游仓库 `data/downloads.json` 只是**子集快照**（624 键；catalog 里有下载量的条目 2589 条）——不能拿「该文件无我方键」当「未被采样」判据；下载量已在 catalog 里出数。
- 六个单品：catalog 内**全未收录**；门槛件齐（`dsh.bundle`＋`cordis.patch.yml`＋topic＋npm `repository`），缺口＝各自没有子目录 README 与 `screenshots.json`。投稿提案落 `.scratch/release0367/awesome/报告.md`（分 2 PR／3+3，分类主选 `ui`，先投 calorie／memo／schedule，缓 bill／chef／home）——**等用户点头，本轮未投**。
- 致谢复核：FeatherHunter `PR 34＋issue 1258＝🌹×1292` 不变；当时按规则补了 commit-only 身份两行（`muse-spark`／`ilife-agent`，各 🌹×1）。提交数只用于识别身份、随提交增长（发版当时读数 305／3，独立复核时 API 已读 307／3），**不是致谢判据**。**2026-10-18 更正**：这两个身份是用户本机的提交身份、不是独立贡献者，那两行已从 README 删除（读数与裁决见 §十二）。

## 十一、v0.3.68（2026-10-18）：已发版 ✅

- 内容：**全面进位**——公共层 `base-*` 4 件与技能 `skill-*` 6 件 `0.3.54 → 0.3.55`、七个插件 `0.3.67 → 0.3.68`；全部精确 pin（技能→公共层、单品→总管与技能）与 `pnpm-lock.yaml` 同步（提交 `b033cc2a`，18 文件 73 增 73 删）。总管声明 `dsh-plugin-update ^0.18.11`（0.18.7→0.18.11 一跳四号，0.18.8–0.18.10 从未发到 npm）。
- **本轮修掉一处出厂件漏洞**：`packages/plugin-manager/dist/client.js` 把上游整包内嵌进客户端 bundle，而 `dist` 不入库、只按 `files: ["dist", "cordis.patch.yml"]` 被 `npm publish` 打包——此前只改声明＋刷锁到不了出厂件。本轮重建后 bundle 内嵌读数 `@0.18.11` 命中 14、`@0.18.7` 命中 0（`dist/client.js` 1,129,780 B）。
- npm 侧：**17 包全部 `PKG-OK`**（token 直发；`-Probe` 因「云端没有任何已有版本可重发」跳过，改用真实首发验证写权限，`TOKEN-OK whoami=feather_wch`）；`npm view <包> version`／`dist-tags.latest --registry=https://registry.npmjs.org/` 17 条读回全中；`check-publish --post` PASS（含 `OK: dsh-life-pack@0.3.68 registry 带 dsh-plugin-update ^0.18.11`）；`--pre`／`--tarball` PASS；`--fresh-tmp` PASS（本轮按 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint` 跑，故只装 **2 实包／断言 1 键**：`OK: fresh-tmp npm install 2 实包成功`＋`契约断言 1 键全绿`；不带 `--only` 的全量口径是 13 包／6 键）。
- **`--fresh-tmp` 的口径坑（本轮现场）**：第一次跑该门红在 `npm error code ETARGET / No matching version found for dsh-life-pack@0.3.68`——不是包没发，而是本机 ambient registry 是 `registry.npmmirror.com` 且镜像落后（当时镜像 `dsh-life-pack` latest 仍 `0.3.67`、`@0.3.68` 404），而 `tooling/check-publish.mjs:215` 的 fresh 安装步骤没带 `--registry`（其余 `npm view` 都带了）。用 `npm_config_registry=https://registry.npmjs.org/` 覆盖后同一命令 exit 0。**下一轮发版请照此覆盖**，或等镜像同步。0.3.67 那一轮该门红是另一回事（`base-paint` 版本偏斜），本轮 `base-paint@0.3.55` 已发版，偏斜消除。
- GitHub Release：[v0.3.68](https://github.com/FeatherHunter/ilife/releases/tag/v0.3.68) 已立，8 个资产——`dsh-life-pack.tgz`（无版本别名，`latest/download` 即刻起给 0.3.68 包）＋ 七个 `*-0.3.68.tgz`。
- 上游条目：**本轮无需任何 PR，零仓库改动**。条目 `data/plugins/FeatherHunter__ilife--packages-plugin-manager.yml` 只有 `url`／`name`／`category`／`description`／`tarball`（上游校验器 `scripts/lib/entries.mjs:145` 的 `ENTRY_KEYS` 无 `version`，塞进去会被 `PR check` 判非法键）；市场显示的版本由 `scripts/probe-npm.mjs:9–16` 读 registry `dist-tags.latest` 自动跟，目录包发 npm、不提交仓库（`build-site.yml:242–271` 注释明写 "no repository write"；三处上游文件行号按 **live 仓**读，本机 `.tmp-awesome` 是旧快照、别拿它的行号对）。上一轮 [PR #7452](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7452) 已于 2026-10-17T08:12:34Z 合并，介绍文本逐字未动。
- 六个单品：catalog 内**仍未收录**（`FeatherHunter` 名下 5 条目，只有总管那 1 条是我们的）；提案见 `.scratch/release0368/awesome/报告.md`（分 2 PR／3+3，分类主选 `ui`，先投 calorie／memo／schedule；前置＝先补六份子目录 README）——**用户 2026-10-18 裁决：不投稿**（逐字「不提交到awesome」），提案仅留档，本仓不再跟进。
- 致谢复核：FeatherHunter `PR 34＋真 ISSUE 1259（`issues?state=all` 1293 条减去 34 条 PR）＝🌹×1293`（README 提交 `6a318688`）；`muse-spark`／`ilife-agent` 两行系误加，**2026-10-18 用户裁决后已从 README 删除**（见 §十二）；README 里无规则文本（`排名|贡献数|规则|PR|ISSUE` 大小写敏感零命中；不敏感会撞 L56 的 `<.../issues>` 链接）。

## 十二、提交身份读数与致谢口径更正（2026-10-18）

用户裁决（逐字）：「不提交到awesome 这两个身份都是我，你需要检查下当前项目的提交身份，应该都是我 不存在 muse-spark和ilife-agent」。独立读数（Lead 现场）：

| 身份 | 条数 | 时间跨度 | GitHub 侧 | git config 归属 |
| --- | --- | --- | --- | --- |
| `王辰浩 <975559549@qq.com>` | 3340 | 2026-09-06 14:05 → 2026-10-16 12:37 | `FeatherHunter`（User） | **全局** `user.name`／`user.email` |
| `muse-spark <muse-spark@local>` | 316（本席取数时点）／317（复核时点，含 `26bb6c91`）——随提交增长 | 2026-10-06 01:59 → 2026-10-18 00:54 | 匿名（Anonymous，邮箱未关联账号） | **本仓 repo-local** `user.name`／`user.email` 现值 |
| `ilife-agent <agent@local>` | 3 | 2026-09-06 16:11 → 17:23 | 匿名（Anonymous） | 早先的 repo-local 身份 |

- 命令：`git log --format='%an|%ae' | Group-Object | Sort-Object Count -Descending`；`git config user.name`／`user.email`（repo-local 与 `--global` 对照）；`gh api 'repos/FeatherHunter/ilife/contributors?anon=1&per_page=100'`。无 `.mailmap`。
- 结论：全仓提交只出自**一个人**（用户本人）与两个本机提交身份；GitHub 把后两者列成匿名 contributor 只是因为 `@local` 邮箱没关联账号。⇒ 致谢表只认 `FeatherHunter`（🌹×1293），`muse-spark`／`ilife-agent` 两行删除，今后不再把本机提交身份当贡献者。
- 附注（2026-10-18 当天已办）：上表「现值」是当日快照。用户同日再裁定（逐字）：「本项目所有提交代码提交者都需要是我本人。」据此本仓 repo-local `user.name`／`user.email` 已由 `muse-spark`／`muse-spark@local` 改成用户本人（当时全局 `user.name` ＝ `王辰浩`，值逐字节照抄 `--global`；**改名后不再照抄** `--global`——现在照抄恰好会把守卫要拦的旧显示名写回来），并加了随仓的两道身份守卫 `tooling/git-hooks/commit-msg`（提交时）与 `tooling/git-hooks/pre-push`（推送时，按「目的端还没有的提交」逐个查），外加 `.mailmap` 归并；挂在本仓 `core.hooksPath`，对本仓全部 worktree 生效。**历史 SHA 一字未改**（全仓仍 367 条作者／391 条提交者非本人，`master` 上 328／352，as-of `fa6498cd`）。口径、读数、绕过矩阵与复查命令见 `docs/agents/提交身份.md`。同日再裁定（逐字）：「不要写王辰浩 写 FeatherHunter」——本仓提交的**显示名**改为 `FeatherHunter <975559549@qq.com>`（邮箱不变），`.git/config`、两道守卫与 `.mailmap` 已同步（`王辰浩 <975559549@qq.com>` 也进 `.mailmap` 归并）；历史 SHA 仍未改。**注意由此新增的一档口径**：守卫比「名 + 邮箱」，历史里旧显示名 `王辰浩` 的提交在严格口径下判不合规，推给「目的端还没有它们」的远端（空库／新 fork）时会被整条点名——推 `origin` 不受影响（as-of `4cbf7e0c`：`master` 3683 条，邮箱口径非本人作者 328／提交者 352；全 `ref` 367／391）。

## 十三、v0.3.69（2026-10-18）：已发版 ✅

- 内容：**只动总管**——`packages/plugin-manager/package.json:55` 的 `dsh-plugin-update` 由 `^0.18.11` 抬到 `^0.18.24`（提交 `ba0856a5`，随锁 `pnpm-lock.yaml` 三处）；七个插件 `0.3.68 → 0.3.69`、六个单品 `dsh-life-pack` pin 同步 `0.3.69`（提交 `fa9062af`，8 文件 19 增 19 删）；`base-*`／`skill-*` 内容未变，仍 `0.3.55`。
- 重建读数：`dist/client.js` 1,142,497 B，内嵌 `@0.18.24` 命中 14、`@0.18.11` 命中 0；从 `npm pack` 的出厂件解包复核同读数（`@0.18.24=14`／`@0.18.11=0`，deps `^0.18.24`）——`dist` 不入库但随包发布，升版必须重建。
- npm 侧：token 直发；`-Probe` → `PROBE-OK 写权限成立`（重发 `base-link-core@0.3.55` 得 E409）、`TOKEN-OK whoami=feather_wch`；整表 **7 个 `PKG-OK`**（`dsh-life-pack@0.3.69` ＋ 六个单品），`base-*`／`skill-*` 全 `SKIP 云端已有`，发布瞬间 `STAGED-PENDING 7`（可见 0/7，复制延迟），末行 `DONE 已发 7 个`、exit 0；`check-publish --post` PASS（含 `OK: dsh-life-pack@0.3.69 registry 带 dsh-plugin-update ^0.18.24`）；`npm view <包> version`／`dist-tags.latest --registry=https://registry.npmjs.org/` 七条读回全中。
- GitHub Release：[v0.3.69](https://github.com/FeatherHunter/ilife/releases/tag/v0.3.69) 已立，8 个资产（`dsh-life-pack.tgz` 无版本别名 ＋ 七个 `*-0.3.69.tgz`），`isDraft=false`。
- 上游条目：**无需任何 PR**（同 §十一——条目 `ENTRY_KEYS` 无 `version` 字段，市场版本由 `scripts/probe-npm.mjs` 读 registry `dist-tags.latest` 自动跟）。本轮用户未要求 awesome 处理，未做任何仓外动作。
- 致谢复核（readme-writer 独立重算）：`pulls?state=all` **34**（最新 #1292，2026-10-16T04:36:51Z）＋ `issues?state=all` **1293** 减 34 条 PR ＝ 真 ISSUE **1259**（最新 #1293，2026-10-17T15:34:37Z）＋ discussions `totalCount=0` ⇒ FeatherHunter 仍 **🌹×1293**，**表格无需改动**（README 本轮只改版本行与更新系统行两行）。
- 门禁读数：`--pre`／`--post`／`--tarball` 全 PASS；`pnpm install --frozen-lockfile` exit 0；单测 `407／405／2`（两例 pixel seam 属既有基线红，与本次无关）。

## 十四、v0.3.70（2026-10-18）：已发版 ✅（版本号进位，供升级测试）

- 内容：**只进位版本号，代码与 v0.3.69 相同**——`0806a218`（0.3.69 发版提交）之后 `packages/` 零改动；七个插件 `0.3.69 → 0.3.70`、六个单品 `dsh-life-pack` pin 同步（提交 `2224ea8c`，8 文件 19 增 19 删）；`base-*`／`skill-*` 不动，仍 `0.3.55`；总管依赖仍 `dsh-plugin-update ^0.18.24`。用途：用户在插件市场做一次「旧版本 → 新版本」的升级测试。
- 重建读数：`dist/client.js` 1,142,497 B，内嵌 `@0.18.24` 命中 14、`@0.18.11` 命中 0、现版本号 `0.3.70` 注入 1 处；从 `npm pack` 的出厂件解包复核同读数（deps `^0.18.24`）。
- npm 侧：token 直发；`-Probe` → `PROBE-OK 写权限成立`（重发 `base-link-core@0.3.55` 得 E409）、`TOKEN-OK whoami=feather_wch`；整表 **7 个 `PKG-OK`**（`dsh-life-pack@0.3.70` ＋ 六个单品），`base-*`／`skill-*` 全 `SKIP 云端已有`，发布瞬间 `STAGED-PENDING 7`，末行 `DONE 已发 7 个`、exit 0；`check-publish --post` PASS（含 `OK: dsh-life-pack@0.3.70 registry 带 dsh-plugin-update ^0.18.24`）；`npm view <包> version`／`dist-tags.latest --registry=https://registry.npmjs.org/` 七条读回全中。
- GitHub Release：[v0.3.70](https://github.com/FeatherHunter/ilife/releases/tag/v0.3.70) 已立，8 个资产（`dsh-life-pack.tgz` 无版本别名 ＋ 七个 `*-0.3.70.tgz`），`isDraft=false`；`releases/latest/download/dsh-life-pack.tgz` → 302 `…/releases/download/v0.3.70/dsh-life-pack.tgz`。
- 上游条目：**无需任何 PR**（同 §十一／§十三——条目 `ENTRY_KEYS` 无 `version` 字段，市场版本由 `scripts/probe-npm.mjs` 读 registry `dist-tags.latest` 自动跟）。本轮用户未要求 awesome 处理，未做任何仓外动作。
- 致谢复核（readme-writer 独立重算）：`pulls?state=all` **34**（最新 #1292，2026-10-16T04:36:51Z）＋ 真 ISSUE **1259**（最新 #1293，2026-10-17T15:34:37Z）＋ discussions `totalCount=0` ⇒ FeatherHunter 仍 **🌹×1293**，**表格无需改动**；README 本轮只改版本行（L33 `0.3.69 → 0.3.70`），L34 更新系统行复核后未动。
- 门禁读数：`--pre`／`--post`／`--tarball` 全 PASS；`--fresh-tmp` 在 `npm_config_registry=https://registry.npmjs.org/` 覆盖下 PASS（不带覆盖会因本机默认镜像 npmmirror 落后而 `ETARGET`）；`pnpm install --frozen-lockfile` exit 0；单测 `407／405／2`（两例 pixel seam 属既有基线红，与本次无关）。

## 十五、v0.3.71（2026-10-18）：已发版 ✅（总管跟到 dsh-plugin-update 0.18.25）

- 内容：总管 `dsh-life-pack` 的更新系统依赖 `dsh-plugin-update` `^0.18.24 → ^0.18.25`（`packages/plugin-manager/package.json:55`；刷锁 10 行 3 处 hunk 全属更新包，另六个单品的 pin 6 行）；七个插件 `0.3.70 → 0.3.71`；`base-*`／`skill-*` 不动，仍 `0.3.55`。上游 0.18.25 是**修复集中版**（`#92` 手工命令为空按原因说清、`#174` 最后手段判定与高亮、`#177` 命令可信度、`#204` 宿主内 profile 解析改用 `profileContext`／`desktopProfiles`／`env`），被消费 4 子路径的**导出声明零变化**（3 个值 ＋ 7 个类型逐个 SHA256 相同），实现体更新属预期。
- 重建读数：`dist/client.js` 1,142,497 → **1,164,745 B**，内嵌 `@0.18.25` 命中 **17**（旧 `@0.18.24` 命中 0）、现版本号 `0.3.71` 注入 1 处、`0.3.70` 命中 0；内嵌模块 14 → **17** 件（新出现 `commands.js`／`last-resort.js`／`manual-absent.js`）。对照读数：`npm pack dsh-life-pack@0.3.70` 出厂件 1,142,497 B、`@0.18.24` 命中 14、14 件——「升版必须重建产物」这条在 0.18.25 上成立。
- npm 侧：token 直发；`-Probe` → `PROBE-OK`（重发 `base-link-core@0.3.55` 得 E409＝写权限成立）、`TOKEN-OK whoami=feather_wch`；整表 **7 个 `PKG-OK`**，`base-*`／`skill-*` 全 `SKIP 云端已有`，末行 `DONE 已发 7 个`、exit 0。本轮 **可见性延迟明显长于往轮**：发布瞬间 7 个全 `STAGED-PENDING`，约 12 分钟后才逐个可见（`dsh-life-pack` 最后，registry `time.0.3.71` = 2026-10-18T11:34:47Z；期间 `npm view <包>@0.3.71` 一直 E404，属受理后待可见，**不是**发布失败）；复跑 `check-publish --post --only <七包>` → PASS（8 条 `OK:`，含 `OK: dsh-life-pack@0.3.71 registry 带 dsh-plugin-update ^0.18.25`）。
- GitHub Release：[v0.3.71](https://github.com/FeatherHunter/ilife/releases/tag/v0.3.71) 已立，8 个资产（`dsh-life-pack.tgz` 无版本别名 ＋ 七个 `*-0.3.71.tgz`，资产从 registry 现取：`npm pack <包>@0.3.71`），总管 **1,739,950 B**（比 0.3.70 的 1,723,225 B 多 16,725 B），`isDraft=false`；`releases/latest/download/dsh-life-pack.tgz` → 302 `…/releases/download/v0.3.71/dsh-life-pack.tgz`。
- 上游条目：**无需任何 PR**（同 §十一／§十三——条目 `ENTRY_KEYS` 无 `version` 字段，市场版本由 `scripts/probe-npm.mjs` 读 registry `dist-tags.latest` 自动跟）。本轮用户未要求 awesome 处理，未做任何仓外动作。
- 致谢复核：**本轮未重算**（读表停在 §十四 的 `pulls 34 ＋ 真 ISSUE 1259 ⇒ 🌹×1293`），README 致谢数未动，表格无需改动；README 只改版本行（L33 `0.3.70 → 0.3.71`）与更新系统行（L34 `dsh-plugin-update 0.18.24 → 0.18.25`）。
- 门禁读数：`--pre --only <16 个登记包>` exit 0 PASS ＋ `OK: 更新包：声明 ^0.18.25 且锁已解析 0.18.25（与线上最新一致）`；`--tarball` PASS（`OK: dsh-life-pack dist/client.js 含现版本号 0.3.71（注入新鲜）`）；`--post` PASS；`pnpm install --frozen-lockfile` exit 0；`node node_modules/typescript/bin/tsc -b packages/plugin-manager` exit 0；单测 `407／405／2`（两例 pixel seam 属既有基线红，与本次无关）。不带 `--only` 的全量 `--pre` 有一处**既有红**（`FAIL: 作用域含未知包：base-entries`，见调查 §13 末条），与本次无关。
- 提交署名：发版提交 `4cbf7e0c`（10 文件 45 增 27 删）的作者／提交者是 `王辰浩 <975559549@qq.com>`——这是当日 19:28「显示名改 `FeatherHunter`」裁定之前落的一笔；按 `.mailmap` 归并显示、不改写历史 SHA（口径见 §十二 与 `docs/agents/提交身份.md`）。本节回填提交署名 `FeatherHunter <975559549@qq.com>`。

## 四、缺口与未决

1. **README 已补**（原先整仓一份都没有，条目详情页正文会空）：`packages/plugin-manager/README.md` 讲这张卡（详情页优先取子目录那份），仓根 `README.md` 讲整套七个插件（子目录那份缺失时回落）。六个单品将来投稿时各自补一份子目录 README——否则它们的详情页会渲染仓根那份「整套」说明。
2. ~~六个单品分批投稿（每 PR ≤3 条）~~ —— **2026-10-18 用户裁决不投稿，本条关闭**（提案留档于 `.scratch/release0368/awesome/报告.md`）。
3. 本席提交与推送的锁留痕是 `ticket=unknown`（这活没有票号）；要补票号得先开票。
4. 本机遗留的临时副本与自制脚本（`.gitignore` 忽略、随时可能被清掉）：`D:\ilife\.tmp-awesome\`（上游仓副本 ＋ `node_modules`）里有 `validate-entry.mjs`（校验条目）、`check-screenshots.mjs`（复核截图声明）、`verify-live.mjs`（复核线上存活）、`diagnose-lock.mjs`（对账 lockfile 与 package.json）；会话交接件写在系统临时目录的 `handoff-awesome-plugin-marketplace.md`。

## 五、合并后 / 发版后怎么核（照抄命令）

顺序是**先合并条目、再发版**：上游 `probe-npm.mjs` 是拿条目 `url` 去读 `package.json` 的，条目没进列表就什么都采不到。

| 要核什么 | 命令 | 期望读数 |
| --- | --- | --- |
| 条目合并了吗 | `gh api repos/awesome-dsh-plugin/awesome-dsh-plugin/contents/data/plugins/FeatherHunter__ilife--packages-plugin-manager.yml --jq .name` | 打出文件名；404 ＝ 还没合并 |
| npm 关联成立吗 | `npm view dsh-life-pack repository --json` | 含 `github.com/FeatherHunter/ilife`。不含 ＝ latest 那一版还没带字段，等下一次发版 |
| 上游采到下载量了吗 | `gh api repos/awesome-dsh-plugin/awesome-dsh-plugin/contents/data/downloads.json -H 'Accept: application/vnd.github.raw'`，在返回的 JSON 里找 `https://github.com/FeatherHunter/ilife/tree/master/packages/plugin-manager` 这个键 | 键下是 `{"downloads":N,"checkedAt":"…"}`；键不在 ＝ 上游探针还没跑到（它每天跑） |
| 详情页正文在不在 | `gh api repos/FeatherHunter/ilife/contents/packages/plugin-manager/README.md -H 'Accept: application/vnd.github.raw'` | 有正文；没有就是回落仓根 README |
| 截图活着吗 | `node .tmp-awesome/verify-live.mjs`（本机脚本） | 三张全 206 |
