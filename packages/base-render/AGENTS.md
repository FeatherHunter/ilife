# base-render 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts`。生成物（`dist/`、`.tsbuildinfo`）与页面模板不算——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：兄弟件 `packages/skill-calorie/AGENTS.md` 与 `packages/skill-chef/AGENTS.md` 同数、同落点（350 行／LF 口径）。`structure.md` 要求这条数字写在各包自己的地方。

详见 `docs/base/base-render/行数告警线评估.md`（#430 当刻实测＋拆件评估）。

## 发布（npm 官方源，交互式 wizard）

**发版脚本住本包**：`scripts/wizard-publish.sh`（发谁的包，脚本住谁的家）。**版本号从本包 `package.json` 读**，脚本不写死——改完版本直接跑，别在脚本里改数字。

跑法（**必须 Git Bash**；脚本是 LF 行尾；**禁止重定向输出**——stdout 非 TTY 时 npm 不发授权链接、直接报 `EOTP`）：

```bash
"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/base-render/scripts/wizard-publish.sh
```

四段：预检（自动）→ 登录（**人扫码**）→ 发布（**人扫码**，浏览器 2FA 审批）→ 验证（自动）。令牌只写 `~/.npmrc`；**OTP 绝不进聊天**（30 秒轮换，隔空传必过期）。

发版前自己确认三件事：

1. **三包版本锁步**：`base-link-core`／`base-render`／`base-combos` 的 `version` 逐字相等（CI 有 `base-version-lockstep` 断言）。
2. **内容范围**：这一版相对**线上那一版**带走了哪些提交——
   `git log <线上版本发布点>..HEAD --oneline -- packages/base-render`。
   本仓 changeset 记账长期欠账（清淤见 #713）：版本号只标水位、不代表内容范围；内容里有非补丁级改动，就在 `CHANGELOG.md` 里逐条列名。
3. **本包门禁**：`node --test "packages/base-render/test/*.test.mjs"` 全绿；`node scripts/gen-help-shell.cjs --check` 不漂移。

发完必须做**安装态验证**（仓库外独占目录 ＋ 先写最小工程文件再装，协议 §2.1.2）：

```bash
npm install skill-memo-ilife --registry=https://registry.npmjs.org --prefer-online   # 在隔离目录里
```

判据：解析到的 `base-paint` 版本＝刚发的版本。**本机默认源是镜像 `registry.npmmirror.com`**（查新版本滞后），务必显式 `--registry=`，必要时 `--prefer-online`（否则可能装到旧版本）。

本机两个坑（实测）：① 镜像源滞后；② `pnpm store` 曾被外部工具清空（`@changesets/*` 只剩空壳）→ 报 `ERR_PNPM_MODIFIED_DEPENDENCY` 时**不要自行安装**，按协议 §2.1.1／§2.1.5 停手上报。
