# awesome 上架台账（本仓）

规则与用法在 [`awesome插件市场投稿.md`](awesome插件市场投稿.md)（那一份可以直接拷给别的项目）；本文只记**本仓的现场读数**，不重复规则。

## 一、七个插件的上架状态（读数 2026-09-20）

每条的 `url` 都是 `https://github.com/FeatherHunter/ilife/tree/master/<仓内目录>`——本仓默认分支是 `master`，不是 `main`。

| npm 包 | 仓内目录 | 条目 `name` | 分类 | 状态 |
| --- | --- | --- | --- | --- |
| `dsh-life-pack` | `packages/plugin-manager` | `FeatherHunter/ilife#dsh-life-pack` | `ui` | **已投稿**：[PR #5514](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/5514)，两道检查已绿，等维护者合并 |
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

## 三、下载量：字段已补齐，等下一版

关联判据在上游 `scripts/probe-npm.mjs`：按条目 `url` 那层读 `package.json` 拿包名 → 取 registry 上 `dist-tags.latest` 那一版 manifest 的 `repository` → 小写包含 `featherhunter/ilife` 才算关联。

**云端读数（2026-09-20 晚）**：`dsh-life-pack@0.3.3` 与六家单品 `@0.3.4` 都已是各自的 `latest`，**两批 manifest 里都没有 `repository`**，所以现在一条都关联不上。npm 不允许重发同一版本号——**要出下载量就得再发一版**。

**字段已经补齐**（提交 `e32e8a72`）：七个包的 `package.json` 各加一段，指向 `git+https://github.com/FeatherHunter/ilife.git` 与各自的 `directory`。下一次发版无论版本号是多少都会带上它，关联与下载量随之成立。版本号不由本席定。

| 项 | 读数 |
| --- | --- |
| 七个包的 `repository` | ✅ 已加（`e32e8a72`）。本地复核：`check-publish --pre` PASS（七个包全 OK）＋ `test/plugin-p10-boundaries.test.mjs`／`plugin-p10-install.test.mjs` 22 pass / 0 fail |
| 六家的 `dsh-life-pack` 范围 | ✅ 已是 `^0.3.3`（来自 #744 的定版提交 `7534adb4`，不是本席改的；`plugin-p10-boundaries.test.mjs:38` 与 `plugin-p10-install.test.mjs:46` 咬这条） |
| `pnpm-lock.yaml` 的 specifier | ✅ 六处已跟到 `^0.3.3`（#744） |
| 出下载量 | ⏳ 等下一次发版；本席没有升版本号，字段发出去之前一直休眠 |


发布窗口的两条硬约束：

1. **打包的是工作区，不是提交。** `tooling/wizard-publish.ps1` 走 `npm publish`，包里 `files` 只含 `dist` 与 `cordis.patch.yml`——发出去的是**盘上当前的 `dist/`**。发版前确认没有别席正在改 `packages/plugin-*/src`（有未提交改动时发版，等于把那一席没做完的产物发上 npm；#734 记过总管处在同一处境时本轮不发）。
2. **要人批准 2FA**：侧边栏终端跑 `pwsh -NoProfile -File tooling\wizard-publish.ps1 -Auto -Package dsh-life-pack`；跑之前先过 `tooling/check-publish.mjs` 三道门（`--pre`／`--tarball`／`--fresh-tmp`，都带 `--only dsh-life-pack`）。
3. **发版分两次看**：`wizard-publish.ps1` 按「云端已有该版本就跳过」工作，所以本地版本号不动就不会重发——字段补了但版本没升＝它一直休眠，这是预期的。
4. **同窗口顺带看 `publish:fresh` 那道红**：`master` 上 CI 的 `install`／`build`／`publish:pre`／`publish:tarball` 都过，红在 `publish:fresh`——`skill-calorie` 安装态装载器导入失败（`dist/render/templates.js` 不在 registry 那一版产物里，日志自注「版本偏斜，非本票红」）。

六个单品的 `repository` 已在 `e32e8a72` 一并补上，但**云端最新版（0.3.4）里没有**——它们各自投稿后要出下载量，同样要等它们下一次发版。

## 四、缺口与未决

1. **README 已补**（原先整仓一份都没有，条目详情页正文会空）：`packages/plugin-manager/README.md` 讲这张卡（详情页优先取子目录那份），仓根 `README.md` 讲整套七个插件（子目录那份缺失时回落）。六个单品将来投稿时各自补一份子目录 README——否则它们的详情页会渲染仓根那份「整套」说明。
2. 六个单品分批投稿（每 PR ≤3 条）。
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
