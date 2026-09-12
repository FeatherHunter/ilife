# 票 206 · 插件侧最小装机（技能提供方＋DSH profile）交付报告

本票序列 9，上游独立诊断已定位真断点：插件包无技能提供方、`inject` 为空、profile 未装本包。

## 一、交付物

| # | 文件 | 行数 | 一句话 |
| --- | --- | --- | --- |
| 1 | `packages/plugin-schedule-ilife/src/dsh-ctx.ts` | 56 | skills 面最小镜像（type-only，出处见 `docs/agents/dsh-client-contract.md` §12） |
| 2 | `packages/plugin-schedule-ilife/src/skill-provider.ts` | 125 | 按包名解析单份 `SKILL.md` 的打包技能提供方（`bundled`／rank 600／`modelInvocable`） |
| 3 | `packages/plugin-schedule-ilife/src/index.ts` | 45 | `inject: ['skills']` ＋ `apply` 里 `registerProvider`（重名退让） |
| 4 | `packages/plugin-schedule-ilife/package.json` | 46 | `files` 补 `SKILL.md` |
| 5 | `packages/plugin-schedule-ilife/test/skills-provider.test.mjs` | 146 | 八把锁：inject／注册／list／get／退让／用户原话／路由词覆盖／打包清单 |
| 6 | `packages/skill-schedule/SKILL.md` | 100 | 只改 frontmatter `description` 一行（补用户原话写法） |
| 7 | `~/.dsh/profiles/web/package.json` | 45 | 加 `dsh-schedule-ilife`（deps ＋ bundles 各一行） |

装机动作另改到 profile 的 `pnpm-lock.yaml` 与 `node_modules`（预期，非 commit 范畴）。

## 二、必报五步对账（偏差 0）

1. **影响清单**（动手前）：`packages/plugin-schedule-ilife/src/`、`packages/plugin-schedule-ilife/test/`、`packages/plugin-schedule-ilife/package.json`、`packages/skill-schedule/SKILL.md`（只 frontmatter）、DSH profile `package.json`。
2. **结构设计**：新增两个源文件（`dsh-ctx.ts` 56 行给 5 个类型；`skill-provider.ts` 125 行给 4 个常量＋3 个函数＋1 个 `provider`），`src/` 仍是能力名一层（`slot`／`settings`／`bridge`／`client` 同层），未建新目录层级，未碰三个以上能力。
3. **写代码**：跨能力引用只走技能包对外那份 `SKILL.md`（文本，不 import 技能实现）；常量 `SKILL_PACKAGE` 取自 `bridge.ts` 那一处，未抄第二份。
4. **超线报警**：无文件超线（本包告警线见包内既有约定，最长源文件 125 行）。
5. **交付对账**：实际落地与第一步逐行一致，**偏差 0**。装机动作额外改了 profile 的 `pnpm-lock.yaml`（安装必然）。

## 三、自证输出

### 1 类型检查

```
$ & node_modules/.bin/tsc.CMD -b packages/plugin-schedule-ilife
[exit=0]
```

### 2 包测试

```
$ node --test packages/plugin-schedule-ilife/test/*.test.mjs
✔ #206 打包技能提供方（作息线） 8/8
✔ dsh-schedule-ilife 烟囱 7/7
ℹ tests 15  ℹ pass 15  ℹ fail 0      [exit=0]
```

### 3 装机证据

profile `package.json` 的 diff（本票新增两行）：

```diff
     "dsh-prompt": "^0.1.7",
+    "dsh-schedule-ilife": "link:D:/ilife/packages/plugin-schedule-ilife",
     "dsh-usage-statistics-panel": "^0.1.10",
@@
         "dsh-chef",
+        "dsh-schedule-ilife"
       ]
```

安装命令与真实输出（走 DSH 自带 shim，非另起服务）：

```
$ <host-commands/web/generations/…/bin/dsh.cmd> plugin --profile web install
✓ Lockfile passes supply-chain policies (verified 28m ago)
+2       Progress: resolved 345, reused 2, downloaded 0, added 2, done
Done in 1.3s using pnpm v11.8.0      [exit=0]
```

落盘链接（Junction，回指仓库本体）：

```
dsh-schedule-ilife -> D:\ilife\packages\plugin-schedule-ilife
```

**技能被宿主识别的证据**（用宿主自带的真 `SkillRegistry` ＋ Electron 的 Node 运行时，
从 app.asar 只读解出 `@deepseek-ai/dsh-skill@0.1.5-rc.1`；不改宿主任何配置）：

```
skills service    = ctx.get("skills")
plugin name       = dsh-schedule-ilife
plugin inject     = ["skills"]
提供方原始 list   = 1 条；rank=600 locator={"path":"D:\\ilife\\packages\\skill-schedule\\SKILL.md"}
宿主技能表 size   = 1
  - skill-schedule  [provider=dsh-schedule-ilife source=bundled model=true user=true]
resourceBase      = directory D:\ilife\packages\skill-schedule
带用户原话？      = true
get() 命中         = true
正文首行          = # 作息管家（schedule）SKILL
正文含唯一出口     = true
RESULT: PASS —— 宿主技能表里可见 skill-schedule（名＋介绍＋全文）
```

（`list` 的摘要不含 `rank`／`locator`，是宿主 `toSummary` 的投影口径，见 `dsh-skill/lib/index.js:491`，
不是提供方缺字段；提供方原始 `list` 已给全。）

### 4 边界检查

```
$ node tooling/check-boundaries.mjs
OK ×9 条；FAIL: 未迁移技能源码／模板不 import base-*（命中：packages\skill-chef\src\help\sceneData.ts）
boundaries: 1 处破界      [exit=1]
```

**属他会话在途改动**（`git status` 里 `A packages/skill-chef/src/help/sceneData.ts`），
本票开工前的同一条命令输出逐字相同（基线红），非本票引入。

### 5 `skill-schedule` 构建与注入区

```
$ pnpm -C packages/skill-schedule build
HELP 已注入：D:\ilife\packages\skill-schedule\SKILL.md       [exit=0]
SKILL.md sha256  before = 5C8F52BB…ABB2CF
                 after  = 5C8F52BB…ABB2CF      → 幂等成立
```

### 6 `git status --short` 逐条归属

本票 6 处（`packages/plugin-schedule-ilife/package.json`、`src/index.ts`、新增 `src/dsh-ctx.ts`、
`src/skill-provider.ts`、`test/skills-provider.test.mjs`、`packages/skill-schedule/SKILL.md`）；
其余 160 余条属他会话在途（`docs/skills/skill-memo-ilife/**`、`packages/skill-chef/**`、`packages/base-render/**`、
`packages/skill-schedule/src/**` 与 `test/**` 等），**未动**。

### 7 端到端 HELP 交付（本票顺手复核，非本票写面）

```
$ node packages/skill-schedule/dist/cli/cmd_read.js schedule.help.lookup   （SKILLS_DB_PATH=临时目录）
exit=0  top keys: version,skill,shape,key,data,delivery
delivery = {"mode":"file","path":"…\\schedule_html\\help\\作息管家_HELP_20260912_141250.html","bytes":156217}
exists=true  size=156217  一致=true  绝对路径=true
```

## 四、照了 bill 的哪些形状、故意没照哪些

**照了（逐字同构）**：`dsh-ctx.ts` 全份；`skill-provider.ts` 的 `PROVIDER_NAME`／`SKILL_NAME`／
`BUNDLED_SKILL_RANK=600`／`SKILL_FILE`／`skillDir`／`parseSkillText`／`loadSkill`／`listSkills`／`getSkill`／`provider`
与文件头注释结构；`index.ts` 的 `name`／`inject`／`apply`＋`HostLogger`＋`already registered` 退让分支；
`test` 的桩 `ctx` 与八把锁的结构。

**故意没照（各给理由）**：

1. **未把 `./client.js` 的值导出从宿主搬走**。bill／chef 在 #150／#218 拆过这颗雷（`tsc -b` 会把 tsdown
   产出的 loader 工厂包覆写成裸 ESM）。本包 `build` 仍是 `tsc -b`、无 `tsdown.config.ts`／`tsconfig.client.json`，
   客户端产物本就是 tsc 直出的 ESM（本票开工前即如此）——搬走反而改了本票范围外的既有行为，
   故留原样，只在此处点名：**本包客户端产物仍是待拆的雷，不在本票范围**。
2. **`files` 只加 `SKILL.md`，不加 `tsdown`／`tsconfig.client.json`／`tsdown.config.ts`**：本包没有这些文件，
   补进去会打到不存在的路径。
3. **`skill-provider.ts` 未导出 `skillFile()`**（bill 有、chef 后来去掉）：本包 `bridge.ts` 另有
   `SKILL_CLI_REL`，多一个平级函数不增能力，照 chef 的最新形状。

## 五、装机失败／需提权的部分

无。安装一次通过（exit 0），无需提权、无需扫码、无需额外联网（走本地 `link:`）。

**唯一留给用户的动作**：当前在跑的 DSH Desktop 宿主进程起于 2026-09-12 00:39:56，早于本票装机；
web profile 未开 `patchReload`，新 bundles 行**不会热生效**。要「对 AI 说一句话」那条路真通，
需**重启 DSH Desktop**（或在该 profile 打开补丁热重载）——这一步不在本票写面内，未代做。

## 六、不确定项与风险

1. **`files` 里新增的 `SKILL.md` 是空转**（如实记）：`skillDir()` 解析的是**技能包**（`skill-schedule`）
   根目录，本插件包内并无 `SKILL.md`。真正保命的是 `skill-schedule/package.json` 的 `files`
   已含 `SKILL.md`（本仓由 test 逐字锁）。票面点名补这一项，已照补；作用是把插件包自己的打包清单
   与先例对齐，不改变提供方的读取路径。
2. **装机态解析落回仓库本体**（Junction），所以今天的验证是「仓库代码＝真机代码」的同一份；
   这与既有先例（bill／chef／memo／calorie）同形，不是本票新引入的风险。
3. **profile 的 `pnpm-lock.yaml` 已被改写**（安装必然）。回滚口径：删 profile `package.json` 里的两行
   ＋ `dsh plugin --profile web install`，或从 `pnpm-lock.yaml.bak-*` 恢复后再装。
4. **未做**：真实 GUI 会话里由模型亲眼列出 `skill-schedule` 的那一步，受第 5 节的重启约束，留给序 10。

## 七、一句话

**代码侧、打包侧、profile 装机侧三件都通了**（宿主真 `SkillRegistry` 里已能看见 `skill-schedule`，名＋介绍＋全文齐全）；
用户现在说「作息管家help」还差**最后一次 DSH Desktop 重启**——重启后本包注册的技能提供方随宿主启动生效，这条路才真正跑通。
