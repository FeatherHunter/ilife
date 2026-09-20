# awesome 插件市场投稿（awesome-dsh-plugin）

对象仓库：`awesome-dsh-plugin/awesome-dsh-plugin`——一份精选列表，两个 README（`README.md`／`README.zh.md`）由 `data/plugins/*.yml` 生成。本仓 `packages/plugin-*` 下的插件投稿都走这一套。规则原文在它仓的 `contributing.md`；本文只记**本仓要用到的那几条**与已投稿的现场读数。

## 一、投稿单位：一个插件一个文件

文件名由条目的 `url` 推出（`scripts/lib/entries.mjs` 的 `slugFor`）：`owner__repo.yml`，指到子目录再加 `--` ＋ 子目录路径（`/` 换成 `-`）。

| 条目 `url` | 文件名 | 条目 `name` |
| --- | --- | --- |
| `https://github.com/o/r` | `data/plugins/o__r.yml` | `o/r` |
| `https://github.com/o/r/tree/master/packages/x` | `data/plugins/o__r--packages-x.yml` | `o/r#x` |

一个 PR **只加这一个 YAML**，就这么多。两个 README 由它仓脚本生成、合并后在 `main` 上重生成——手工改 README 会被 CI 判成「与 `data/plugins/` 不一致」而失败。

## 二、条目字段

只认 `url`／`name`／`category`／`description`／`tarball`（`tarball` 可选）这五个键，写别的键会被校验拒掉。

- `description.en` 必填、单行；`description.zh` 可以不写（维护者会补）。
- 描述里含 `: `（冒号加空格）的那一行必须加引号，否则 YAML 会把它当成嵌套键。
- `category` 取值 22 个：`agi` `ui` `usage` `theme` `model` `identity` `session` `memory` `tools` `wsl` `browser` `vision` `voice` `docs` `skill` `workflow` `git` `notify` `dev` `security` `remote` `market` `fun`。挑贴合插件实际做法的那个；选得不够准由维护者改，不会因此打回。

## 三、收录门槛（CI 逐条跑）

| 检查 | 判据 |
| --- | --- |
| 一个 PR 最多 3 条 | 超了要求拆开；同一作者有多个插件时还要「挑」，不是全投 |
| `dsh.bundle` | 条目 `url` 指到的那层 `package.json` 要声明 `dsh.bundle`，`cordis.patch.yml` 就在它旁边。只声明 `dsh.client` 会被拒——这是最常见的被拒原因 |
| 仓库创建满 1 天 | 按仓库判，不按条目 |
| 文件形状 | 必须落在 `data/plugins/<owner>__<repo>.yml`，只一层深，且必须以 `.yml` 结尾；文件名不合法会被静默跳过（列表里什么都不出现，别的检查照样绿） |
| 仓库话题 | 要有 `dsh-plugin` topic |
| 别碰 `.github/` | PR guard 会把改 `.github/` 的 PR 判成旧分叉分支 |
| 描述属实 | 维护者会读目标仓，把描述里每条声明对着代码核；夸张是主要的打回原因 |
| 不是纯聚合包 | 只有一份依赖清单的聚合包**不单独收录**（收插件，不收聚合包）；自己带行为的——合配置、给设置面、运行时协调各部分——按普通插件审 |

## 四、本地自查

在 awesome 仓的副本里（先 `npm ci`，校验要 `js-yaml`）：把待投稿的 YAML 放进 `data/plugins/`，再跑

```sh
node --input-type=module -e "import {readEntries,validateEntries} from './scripts/lib/entries.mjs'; const p = validateEntries(readEntries()); console.log(p.length ? p.join('\n') : 'ok')"
```

输出 `ok` 即通过数据模型这一层（字段、分类取值、`description` 形状、文件名与 `url` 是否对得上——文件名错会以 `filename must match the url` 报出来）。仓库那一层（`dsh.bundle`、仓库年龄）由 CI 的 Submission gate 跑，本地无法复现。

## 五、本仓七个插件的投稿状态（读数 2026-09-20）

每条的 `url` 都是 `https://github.com/FeatherHunter/ilife/tree/master/<仓内目录>`——本仓默认分支是 `master`，不是 `main`。

| npm 包 | 仓内目录 | 条目 `name` | 分类 | 状态 |
| --- | --- | --- | --- | --- |
| `dsh-life-pack` | `packages/plugin-manager` | `FeatherHunter/ilife#dsh-life-pack` | `ui` | **已投稿**：[PR #5514](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/5514)（2026-09-20 提，两道检查已绿，等维护者合并） |
| `dsh-bill-ilife` | `packages/plugin-bill-ilife` | `FeatherHunter/ilife#dsh-bill-ilife` | 待定 | 未投稿 |
| `dsh-calorie` | `packages/plugin-calorie` | `FeatherHunter/ilife#dsh-calorie` | 待定 | 未投稿 |
| `dsh-chef` | `packages/plugin-chef` | `FeatherHunter/ilife#dsh-chef` | 待定 | 未投稿 |
| `dsh-home-ilife` | `packages/plugin-home-ilife` | `FeatherHunter/ilife#dsh-home-ilife` | 待定 | 未投稿 |
| `dsh-memo-ilife` | `packages/plugin-memo-ilife` | `FeatherHunter/ilife#dsh-memo-ilife` | 待定 | 未投稿 |
| `dsh-schedule-ilife` | `packages/plugin-schedule-ilife` | `FeatherHunter/ilife#dsh-schedule-ilife` | 待定 | 未投稿 |

- **为什么先投总管**：`dsh-life-pack` 自己带行为（爱生活卡 ＋ 页签条 ＋ 配置体检 ＋ 更新面板），不是只有依赖清单的聚合包，所以占得住一行。六个单品各自是可独立安装的插件，属于另外的投稿。
- **PR #5514 的现场读数**：`check`（PR check）与 `Submission gate` 两道都 pass；gate 的结论原文是 `All 1 submitted entry passes: dsh.bundle declared, repo old enough, enough commits.`——它按条目 `url` 指到的 `packages/plugin-manager/package.json` 读到了 `dsh.bundle`，并按仓库创建日期（2026-09-06）判年龄。合并由维护者做，两个 README 在合并后于 `main` 上重生成，投稿分支不用碰它们。
- **六个单品要几个 PR**：一个 PR 最多 3 条，所以六个至少两个 PR；合并后它们在列表里各占一行，不会被当成同一份工作重复计数。
- 分类待定不等于没想：六个单品按各自实际做法分（记账、饮食、菜谱、居物、笔记、作息各不同），投稿那一刻再定即可，选偏了维护者会改。

## 六、这次投稿顺带做的仓外改动

- `FeatherHunter/ilife` 加了 `dsh-plugin` topic（收录门槛之一；此前该仓库没有任何 topic）。
- 条目文件 `data/plugins/FeatherHunter__ilife--packages-plugin-manager.yml` 提交在分支 `add-ilife-dsh-life-pack`（分叉 `FeatherHunter/awesome-dsh-plugin`），基线是该仓当时的 `main`，只加这一个文件。

## 七、下载量：要满足的是什么（读数 2026-09-20，**未执行**）

市场显示下载量的前提是**条目与 npm 包被关联上**。关联判据在它仓 `scripts/probe-npm.mjs`：按条目 `url` 那层读 `package.json` 拿包名 → 取 registry 上 `dist-tags.latest` 那一版 manifest 的 `repository` → 其中**小写包含** `featherhunter/ilife` 才算关联。`dsh-life-pack` 现在 0.3.2 的 manifest 没有 `repository` 字段，所以关联不上。**改 `repository` 就必须发一个新版本**——同一个版本号 npm 不允许重发。

改动清单（一次做完，少一件就红）：

| 文件 | 改动 | 为什么 |
| --- | --- | --- |
| `packages/plugin-manager/package.json` | 加 `repository`：`{"type":"git","url":"git+https://github.com/FeatherHunter/ilife.git","directory":"packages/plugin-manager"}`；`version` `0.3.2` → `0.3.3` | 前者是关联判据，后者是发布前提 |
| 六个 `packages/plugin-{bill-ilife,calorie,chef,home-ilife,memo-ilife,schedule-ilife}/package.json` | `dsh-life-pack` 范围 `^0.3.2` → `^0.3.3` | `test/plugin-p10-boundaries.test.mjs:38` 与 `test/plugin-p10-install.test.mjs:46` 断言「单品声明的范围 ＝ `^` ＋ 总管工作区版本」，不跟就红 |
| `pnpm-lock.yaml` | 六个 importer 里 `dsh-life-pack` 的 `specifier: ^0.3.2` → `^0.3.3` | CI 三处 `pnpm install --frozen-lockfile`（`ci.yml:28`／`94`／`133`）逐字比 specifier |

发布窗口有两条硬约束：

1. **打包的是工作区，不是提交。** `tooling/wizard-publish.ps1` 走 `npm publish`，而包里 `files` 只含 `dist` 与 `cordis.patch.yml`——发出去的就是**盘上当前的 `dist/`**。`packages/plugin-manager` 正被另一席改着（#743／#744）时发版，等于把那一席没做完的产物发上 npm；本仓已有同类先例（#734 记过总管处在同一处境时本轮不发）。要发就等那一席的树落定。（2026-09-20 17:30 读数：`packages/plugin-manager/package.json` 与 `packages/plugin-chef/src/client.ts` 当时都有未提交改动。）
2. **要人批准 2FA**：在侧边栏终端跑 `pwsh -NoProfile -File tooling\wizard-publish.ps1 -Auto -Package dsh-life-pack`（AI 送回车、把授权链接原文转给人，人只在浏览器批准）；跑之前先过 `tooling/check-publish.mjs` 三道门（`--pre`／`--tarball`／`--fresh-tmp`，都要 `--only dsh-life-pack`）。
3. **由维护者的统一发版窗口带上**（2026-09-20 维护者口径：还有些问题要靠自家插件发新版解决，稍后统一发版）——本席不单独发 `dsh-life-pack`。同一窗口里还要顺带看 `publish:fresh` 那道红：`master` 上 `dfebf476` 的 CI 读数里，`pnpm install --frozen-lockfile`／`build`／`publish:pre`／`publish:tarball` 都过，红在 `publish:fresh`——`skill-calorie` 安装态装载器导入失败（`dist/render/templates.js` 不在 registry 上那一版的产物里，日志原文批注「版本偏斜，非本票红」）。registry 版本落后于工作区，正是发新版能解掉的那类问题。

顺带记一条：六个单品自己的 npm 包同样没有 `repository` 字段。它们各自投稿时同样要补字段并发一版，才有下载量。

## 八、截图（2026-09-20 已入仓并已推上 master）

`packages/plugin-manager/screenshots.json` 声明三张，**数组顺序就是展示顺序**：

| # | 文件 | 内容 |
| --- | --- | --- |
| 1 | `screenshots/爱生活-配置面板.png` | DSH 设置弹窗里的爱生活卡：总管版本行、配置体检、六家页签条、卡路里·配置页 |
| 2 | `screenshots/饼干记账-HELP.png` | 饼干记账 使用手册（74 场景） |
| 3 | `screenshots/卡路里-HELP.png` | 卡路里 唤醒词速查台（437 场景） |

- 声明方式照上游约定：**放在自家仓**、`package.json` 旁边，路径相对于该文件，且不许出插件目录（不许以 `/` 开头、不许含 `..`）。它仓 `scripts/probe-screenshots.mjs` 把相对路径按 `https://raw.githubusercontent.com/FeatherHunter/ilife/HEAD/packages/plugin-manager/` 逐段 `encodeURIComponent` 解析成绝对 URL 再做存活检查——**所以文件名用中文没问题**。
- 生效条件与现场读数：这份声明与三张图必须在**默认分支（`master`）**上。提交 `04822cef`，随 `dfebf476` 一起推上 `master`（2026-09-20 17:37）。按它仓 `probe-screenshots.mjs` 的同一套判据复核过：`screenshots.json` 读回 HTTP 200，三张图 `Range: bytes=0-0` 全 206（LIVE）——市场下一次构建就会读到。
- 不声明也能展示（市场会从 README 抽图）；声明只是拿回「顺序与取舍」的控制权。
