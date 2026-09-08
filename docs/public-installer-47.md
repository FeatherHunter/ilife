# 公共安装器兼容（#47，卡路里单线样板）

一句话（合入 master 后在自己电脑上跑）：

```sh
npx skills@latest add FeatherHunter/ilife
```

- `skills` = vercel-labs/skills 的公共安装器（`npx skills`），从 git 仓库装 skill，
  按 agent 目录 symlink（或 `--copy` 拷贝）skill 目录，支持 OpenCode / Codex 等，不走 npm。
- 样板期只导出 `skill-calorie`；其余 5 包通后再复制（见末节）。

## 发现规则确认（skills@1.5.24 实测，非猜测）

- CLI 把仓库（本地路径或 clone）按子目录扫描找 `SKILL.md`，跳过
  `node_modules/.git/dist/build`；要求文件头 YAML frontmatter 含字符串
  `name` + `description`，缺任一即整包跳过（`No valid skills`）。
- 本仓之前 6 包 SKILL.md 全缺 frontmatter → 发现数为 0（`add -l` 复现过）。
- 样板：只给 `packages/skill-calorie/SKILL.md` 加了头（`name: skill-calorie`）+
  末尾「公共安装器运行时」小节；现有布局、base 三件套、依赖一律没动。
- 本仓库 `dist/` 不进 git：装完目录里只有 SKILL.md + 源码 + 模板，
  没有可执行文件；运行时走 npm（`skill-calorie@0.1.1` 已发布）。
  「不走 npm」的只是 skill 发现这一步。

## 常用变体

```sh
npx skills@latest add FeatherHunter/ilife -l                    # 只看清单不装
npx skills@latest add FeatherHunter/ilife -s skill-calorie -a opencode --copy -y   # 样板：只装卡路里到 OpenCode
npx skills@latest add FeatherHunter/ilife -s skill-calorie -a codex --copy -y      # 样板：只装卡路里到 Codex
npx skills@latest list -a opencode --json                     # 查已装
```

- `-a/--agent`：`opencode`、`codex`（CLI 内置 20+，`--agent '*'` 全装）。
- `-g/--global`：装到用户级；默认项目级，落到 `<项目>/.agents/skills/<name>/`
 （OpenCode 与 Codex 共用此目录，锁文件区分 agent）。
- `--copy`：拷贝代替 symlink（Windows 无开发者模式时 symlink 会失败，CLI 自动回退 copy）。
- 分支验证期：`npx skills@latest add https://github.com/FeatherHunter/ilife/tree/feat/47-public-installer -l`。

## 验证证据（本机隔离实测，用户真实配置零触碰）

1. 发现：`npx skills@latest add D:/ilife-wt47 -l` → `Found 1 skill`（skill-calorie），其余 5 包跳过为样板期预期。
2. OpenCode 安装：`add … -a opencode --copy -y`（项目目录 `$env:TEMP/sk47-oc2`）→
   `copy → OpenCode`，落点 `<项目>/.agents/skills/skill-calorie/`（含 SKILL.md，头 4 行即 frontmatter），
   `list -a opencode --json` 列出 `scope: project, agents: [OpenCode]`。
3. Codex 安装：同上 `-a codex`（目录 `$env:TEMP/sk47-cx2`）→ `agents: [Codex]`。
4. HELP 现找→cmd_read→envelope→HTML（`SKILLS_DB_PATH` 指向临时目录，真库零触碰，node 走本仓构建产物，见下节阻塞说明）：
   - `calorie.help.lookup {"q":"看今日主页"}` → exit 0，stdout 仅一行 envelope JSON（shape=list）。
   - `calorie.diet.add {"foodName":"鸡胸","calories":200,"protein":35}` → exit 0，shape=receipt。
   - `calorie.view.home {"date":"2026-09-07"}` → exit 0，shape=stat；空库时 exit 4 缺失阻断（设计如此，不返空）。
   - 同命令加 `--html <tmp>/home.html` → exit 0，落盘 2488 字节，头为 `<section class="ilife-page" data-skill="calorie" …>`。
5. 回归：`test/skills-export-47.test.mjs` 钉死导出头（frontmatter name=目录名、description 非空、HELP 标记块仍在、运行时小节存在；仅静态导出头，真跑/落点/端到端不在单测覆盖，见测试头注记）。

## 版本钉死登记（随 0.1.1 重发同步）

- 三处版本硬编码已随 `0.1.1` 同步改完（SKILL.md 运行时小节、本文档发现小节、测试版本断言）；阻塞小节保留 0.1.0 历史记录备查。

## 已发布包阻塞（发版流修，不在本票硬上）

- `skill-calorie@0.1.0`（及另 5 个 skill 包：`base-link-core@workspace:^0.1.0`；calorie 为
  `base-paint@workspace:^0.1.0`）的已发布 manifest 里残留 `workspace:` 协议，
  `npm install -g skill-calorie@0.1.0` / `npx -p skill-calorie@0.1.0 …` 直接
  `EUNSUPPORTEDPROTOCOL`。`base-paint@0.1.0` 本身在 npm 在册且无依赖，只差重发时把
  `workspace:` 改写为已解析版本号。
- 修法（#44 发版流）：重发 skill 6 包（建议 patch 0.1.1），publish 前确认 manifest 无
  `workspace:`（pnpm publish 默认改写，0.1.0 疑似绕过改写直接发布）。
- `base-combos@0.1.0` 同病（`base-link-core: workspace:^0.1.0` 未改写，registry 新装即 `EUNSUPPORTEDPROTOCOL`）；combos 暂无 registry 消费者，随 #50 收尾批量重发，不单独占 2FA 窗口。
- 在重发落地前，用户侧链路用本仓 `pnpm build` 产物验证（与发布内容同源同构）。

## 复制到其余 5 包（样板通过后）

- 给 `skill-bill/skill-chef/skill-home/skill-memo-ilife/skill-schedule` 的 SKILL.md
  加同构头（`name` = 目录名 + 一句话 description）与「公共安装器运行时」小节
  （bin 名各包不同：`bill-cmd-read/chef-cmd-read/home-cmd-read/memo-cmd-read/schedule-cmd-read`，npm 包名即目录名；
  仅 `skill-calorie` 多一个运维二进制 `skill-calorie-fetch`（import/validate/dedupe/export/history/audit/catalog-verify，不承载业务读写），其余 5 包复制时不带 fetch）。
- 配方 description 写一句话、避冒号（中英文冒号一律不用，全角逗号代替），与正文首段同义。
- 把 `test/skills-export-47.test.mjs` 的 `PKGS` 扩展为 6 包。
- `skill-memo/`（无 SKILL.md 的构建残留目录）不算在内。
- 与 #46（R2 真相）无冲突：本票只加发现头与说明，不动依赖声明、不动 base、不动布局。
