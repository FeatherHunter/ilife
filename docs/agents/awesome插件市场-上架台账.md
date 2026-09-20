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

## 三、下载量：未执行

关联判据在上游 `scripts/probe-npm.mjs`：按条目 `url` 那层读 `package.json` 拿包名 → 取 registry 上 `dist-tags.latest` 那一版 manifest 的 `repository` → 小写包含 `featherhunter/ilife` 才算关联。`dsh-life-pack` 现在 0.3.2 的 manifest 没有 `repository`，所以关联不上；**改 `repository` 就必须发一个新版本**。

改动清单（一次做完，少一件就红）：

| 文件 | 改动 |
| --- | --- |
| `packages/plugin-manager/package.json` | 加 `repository`：`{"type":"git","url":"git+https://github.com/FeatherHunter/ilife.git","directory":"packages/plugin-manager"}`；`version` `0.3.2` → `0.3.3` |
| 六个 `packages/plugin-{bill-ilife,calorie,chef,home-ilife,memo-ilife,schedule-ilife}/package.json` | `dsh-life-pack` 范围 `^0.3.2` → `^0.3.3`（`test/plugin-p10-boundaries.test.mjs:38` 与 `test/plugin-p10-install.test.mjs:46` 断言「范围 ＝ `^` ＋ 总管工作区版本」） |
| `pnpm-lock.yaml` | 六个 importer 里 `dsh-life-pack` 的 `specifier: ^0.3.2` → `^0.3.3`（CI 三处 `pnpm install --frozen-lockfile`，`ci.yml:28`／`94`／`133` 逐字比） |

发布窗口的两条硬约束：

1. **打包的是工作区，不是提交。** `tooling/wizard-publish.ps1` 走 `npm publish`，包里 `files` 只含 `dist` 与 `cordis.patch.yml`——发出去的是**盘上当前的 `dist/`**。`packages/plugin-manager` 被另一席改着（#743／#744）时发版，等于把那一席没做完的产物发上 npm；#734 记过总管处在同一处境时本轮不发。（2026-09-20 17:30 读数：`packages/plugin-manager/package.json` 与 `packages/plugin-chef/src/client.ts` 当时都有未提交改动。）
2. **要人批准 2FA**：侧边栏终端跑 `pwsh -NoProfile -File tooling\wizard-publish.ps1 -Auto -Package dsh-life-pack`；跑之前先过 `tooling/check-publish.mjs` 三道门（`--pre`／`--tarball`／`--fresh-tmp`，都带 `--only dsh-life-pack`）。
3. **本席不单独发**：维护者口径是「有些问题要靠自家插件发新版解决，稍后统一发版」，这一版由统一窗口带上。同窗口顺带看 `publish:fresh` 那道红——`master` 上 `dfebf476` 的 CI 里 `install`／`build`／`publish:pre`／`publish:tarball` 都过，红在 `publish:fresh`：`skill-calorie` 安装态装载器导入失败（`dist/render/templates.js` 不在 registry 那一版产物里，日志自注「版本偏斜，非本票红」）。

六个单品自己的 npm 包同样没有 `repository` 字段；它们各自投稿时同样要补字段并发一版，才有下载量。

## 四、缺口与未决

1. **`FeatherHunter/ilife` 仓里没有任何 README** → 条目详情页正文会空。要补的话：`packages/plugin-manager/README.md` 讲总管面板，仓根 `README.md` 讲整套。
2. 六个单品分批投稿（每 PR ≤3 条）。
3. 本席提交与推送的锁留痕是 `ticket=unknown`（这活没有票号）；要补票号得先开票。
4. 本机遗留的临时副本与自制脚本（`.gitignore` 忽略、随时可能被清掉）：`D:\ilife\.tmp-awesome\`（上游仓副本 ＋ `node_modules`）里有 `validate-entry.mjs`（校验条目）、`check-screenshots.mjs`（复核截图声明）、`verify-live.mjs`（复核线上存活）、`diagnose-lock.mjs`（对账 lockfile 与 package.json）；会话交接件写在系统临时目录的 `handoff-awesome-plugin-marketplace.md`。
