# t10 对抗式审查（B：运行时安全与后续风险）

- **审查对象**：`docs/skills/skill-chef/t10-install.md`（409 行），对应地图 #208 票 **#218「插件侧最小装机」**——本图唯一动了真机（用户 profile）的票。
- **审查角色**：B（运行时安全与后续风险）。**不核**报告里的路径、行数、门结果本身对不对（那是角色 A）。
- **本次审查动作**：全部只读。未跑 `dsh plugin install/remove`、未改 `~/.dsh/profiles/web/**`、未动任何 Junction、未启停任何 DSH 服务、未碰端口 43120。原始输出留在 `.scratch/chef-help/t10-review-B/evidence.md`。
- **判定基准**：说「私家大厨help」→ 明确拿到 help HTML 文件（落 `D:\2Study\StudyNotes\.db\cook_html\help\私家大厨_HELP_<TS>[_N].html`，回执绝对路径），由通用 help 模板渲染，内容用老骨架 10 域／33 组／48 场景；技能侧与插件侧都要跑通 ＋ 维护者肉眼终审「过」。本票只负责插件侧装机。

## 判定

- **总分：7.6/10**（不重演事故 35% 得 8.0／回滚安全 20% 得 7.5／目的地推进 25% 得 7.5／后续风险揭示 20% 得 7.0）
- **一句话结论**：`#150` 那条事故链路这次是真的堵上了，四条证据逐条经得起复核，装机当天也没把 GUI 弄坏；但报告在**三件「以后会咬人」的事**上留了空——`tsc -b` 会把 `dist/client.js` 重新写成裸 ESM（双写同一个文件）、插件半其实要等下次启动 DSH 才在这个 GUI 里生效而报告没说、回滚命令漏删一条 Junction。
- **硬伤条数：3**
  1. `packages/plugin-chef/tsconfig.json:12-14` 的 `include: ["src"]` 含 `src/client.ts`，`tsc -b`（＝`build:host`）会把 `dist/client.js` 写成裸 ESM，覆盖 tsdown 的 loader 工厂包。安全的先后顺序只活在 `package.json:41` 那一行 npm 脚本里；任何一次裸 `tsc -b`（本报告的门 4 自己就跑了一次）之后若重启 DSH，就是 `#150` 原样重演。报告点到了「改 `client.ts` 要跑 `build:client`」，但**触发条件写窄了、故障描述写偏了**，且没有把结构上的双写拆开。
  2. **报告从未说明：插件半要等下一次启动 DSH 才在用户这个 GUI 里生效。** 用户正在用的 host 进程（pid 31252，占 43120）起于 `2026/9/12 00:39:56`，而 `dsh-chef` 进 profile 是 `11:27:39`。报告第 279 行把「本会话技能目录当场多出 `skill-chef`」当作插件侧真机证据，但那条来自**另一条发现路**（`~/.agents/skills/` 这条 Junction，创建于 `11:28:01`，DSH 按目录热读），**不是** `ctx.skills.registerProvider` 的功劳。这直接影响票 11 的验收可信度。
  3. **回滚命令漏删一条 Junction**：`~/.dsh/profiles/web/node_modules/dsh-chef`（插件本身那条，创建于 `11:27:39`）不在那三条 `rmdir` 里；且恢复 profile 两个文件后没有任何一步把 `node_modules` 拉回与锁文件一致。照报告能回到「profile 不再装配 `dsh-chef`」，但不是逐字回到装前。

---

## 一、逐条审查（对应上面 10 问）

| # | 审查问题 | 结论 | 依据（路径:行号／命令输出） | 严重度 |
|---|---|---|---|---|
| 1 | 「不会重演 `#150`」站得住吗 | **站得住**（四条全过，见第二节）。遗留隐患见硬伤 1 | `dist/client.js` L1-L3 注册头、行首 ESM 0 处、`node:` 0 处；`src/index.ts:47` 只剩 type-only；`package.json:36/41/43/48`；`src/client.ts:21/29` | 低（现状）／高（后续） |
| 2 | 还有别的「装进去就炸」的口子吗 | **cordis.patch 对、host 半可 import、dist 不比 src 旧**；新发现一处结构隐患（硬伤 1） | `cordis.patch.yml:3-6` 与 `plugin-bill-ilife/cordis.patch.yml:3-6` 逐字同形（只差 id／name）；`dist/index.js` 顶层 await 0、只 import `./skill-provider.js`→Node 内置 6 个、零第三方；`tsconfig.json:12-14` 是隐患源头 | 低／高（分项） |
| 3 | 三个 Junction 形态对吗，会不会两份／旧副本 | **三个锚点解析到同一份仓库件，无旧副本**；但机器上**确有第四份**（普通目录、无 `SKILL.md`），报告未提 | 三处 `SKILL.md` sha256 均 = `1BE06C70…` 、7756 B，与仓库件逐字节相同；`.dsh-module-fallback` 的一跳中转与 `skill-bill`／`skill-calorie`／`skill-memo-ilife` 同形；`C:\Users\辰辰洋洋\node_modules\skill-chef` 是 9/7 的旧拷贝 | 低（今天）／中（换成 PATH 方案时） |
| 4 | 技能侧是否真的「纯粹普通技能」 | **成立** | `git diff --stat HEAD -- packages/skill-chef/src` 为空；`package.json` 的 diff 只有 `files` 加 `"SKILL.md"`；`dependencies` 只有既有的 `base-link-core`，无任何 DSH 包 | 无 |
| 5 | `chef-cmd-read` 不在 PATH 影响目的地吗 | **插件侧不受影响**（已核源码）；**若端到端那条路要 AI 敲这条命令，就是真缺口**；归属见第四节 | `src/bridge.ts:43-50`（`createRequire` 解析包名 → 取绝对路径）、`:76-80`（`spawnSync(process.execPath, [bin,…])`，不读 PATH）；`Get-Command chef-cmd-read` → NOT FOUND | 中（待票 11 定路） |
| 6 | `snapshot:check` 红会不会让票 6／7／11 失去可信度 | **归因是对的，我独立复算过**；但报告没把分辨办法交给票 6／7／11，也没意识到同时有别的会话在写同一个工作树 | 我复算：快照文件 `932e7b250d278d50` = HEAD 复算值；工作树复算 `ef9b16473d03cf19` = 门报的「实际」；算法 `tooling/write-snapshot.mjs:15-18` | 中 |
| 7 | 回滚安全网逐条审 | **能回到功能上的装前，不是逐字回到装前**；漏一条 Junction ＋ 缺 `node_modules` 步骤。见第五节 | 结构化比对 bak-218 与 live：依赖与 bundles 两边差异**只有 `dsh-chef` 一项**，备份忠实；三条 `rmdir` 目标都在且都是 Junction | 中 |
| 8 | 对票 6／7／9／11 的连累与前置 | `#57` 提醒**确实在**，但触发条件写窄；**票 9 的 frontmatter 写法禁忌完全没有提醒** | 活评论 id `5643215760`（#57，state=open，comments=1）含 `build:client`；`src/skill-provider.ts:48/54/64` 是票 9 的雷 | 中 |
| 9 | 「技能目录多出 skill-chef」证据强度 | **不足以当插件侧「真机可见」的证据**，票 11 必须重启后复验 | host pid 31252 起于 `00:39:56`，`dsh-chef` 进 profile 于 `11:27:39`；`~/.agents/skills/skill-chef` 建于 `11:28:01`；host 日志对**所有**插件都 0 命中（对照组），不能用作证据 | **高** |
| 10 | 与目的地第 1 条的距离，自我认知准不准 | **没有夸大目标达成，也没有明显贬低**；但 `#57` 那条评论的措辞比证据跑快了一步 | 报告第 6 行明说「不实现 HELP 渲染与落盘」；第 381 行如实记 PATH 缺口；`#57` 评论把「本会话技能表当场出现」放进了「DSH 真机可见」那一格 | 中 |

---

## 二、「不会重演 `#150`」专项判定

**总判：站得住。** 四条逐条复核如下（均为只读实测）。

**(1) `packages/plugin-chef/dist/client.js` 现在真是 loader 工厂包吗 —— 是。**

```
Len=3511   LastWriteTime=2026/9/12 11:39:35
L1  window.__ModuleLoader__.load({
L2  	id: "dsh-chef",
L3  	factory: (require) => {
...
L78 exports.CLIENT_COMPONENT = CLIENT_COMPONENT;
L80 exports.apply = apply;      L81 exports.inject = inject;
L85 return module.exports;
L89 //# sourceMappingURL=client.js.map
```

- 行首 ESM（`^\s*(import|export)\s`）= **0 处**；`node:` 出现 = **0 处**；BOM=False、CRLF=0。
- `tsdown.config.ts:40-42` 的 banner／intro／footer 与产物逐字对上。

**一处数字要摆平（不是报告的错，是容易读岔）**：报告第 318 行的「字节数 = 3557」是**探针实例实际返回的那一份**（它自己写明了），在盘文件的字节数是 **3511**。我把两份逐行对过，差异只有两处：

```
=> ;                                                                    （服务端多补一行分号）
=> //# sourceMappingURL=/plugins/??dsh-chef/client.js.map&rev=5694c703b4eeb23e-54
<= //# sourceMappingURL=client.js.map
```

即 DSH 把 `sourceMappingURL` 改写成绝对地址。**内容同一份**，报告的说法没有错；只是要求复核报告的人别把 3557 当成在盘大小。

**(2) `src/index.ts` 真的不再值导出 `./client.js` 了吗 —— 真的。**

- `src/index.ts:47` 只剩 `export type { HostCaller } from './client.js';`（type-only，编译期擦除）。
- `src/index.ts:42-46` 写了原因注释。
- 编译产物 `dist/index.js`（2006 B，32 行）全文**没有**任何 `./client.js` 再导出 —— 这一步在构建产物上也验过，不只看源码。
- 与样板对照：`plugin-bill-ilife/src/index.ts:47` 同形。

**(3) `dsh.client.platform` 仍是 `web`，`build` 真会跑客户端打包吗 —— 是。**

- `package.json:36` `"platform": "web"`；`:37` `"inject": []`（与 `client.ts:21` 的空数组一致）。
- `package.json:41` `"build": "npm run build:host && npm run build:client"`；`:42` `build:host` = `tsc -b`；`:43` `build:client` = `tsdown`；`:48` `devDependencies.tsdown = 0.22.14`。
- 顺序是对的：`dist/index.js` mtime `11:25:06`（tsc），`dist/client.js` mtime `11:39:35`（tsdown）——**后写的是 tsdown**。
- 门 `test/client-bundle-48.test.mjs:24-30` 按 `dsh.client.platform === 'web'` **自动发现**所有相关包，`dsh-chef` 零追加即被看门；该门在 classic-script 语义下用 `vm` 真执行产物（ESM 在那里直接 SyntaxError），并另有一例断言「产物无 ESM 语法、无 `node:` 导入」。chef 三例转绿这件事，由这条门自己保证，不靠人眼。

**(4) `client.ts` 满足 loader 契约吗 —— 满足。**

- `src/client.ts:21` `export const inject: readonly string[] = [];`；`:29` `export function apply(): void {}`。
- 产物 `dist/client.js:80-81` 确实把 `apply`／`inject` 挂在 `module.exports` 上。
- 门要求「导出 `apply` 函数 ＋ `inject` 数组」，两件都在。

**这一节唯一的保留意见（硬伤 1）**：`tsconfig.json:12-14` 的 `include: ["src"]` **含 `src/client.ts`**，所以 `tsc -b` 也会往 `dist/client.js` 写件。报告基线自己写了「修前 `dist/client.js` = 831 B 裸 ESM」——那 831 B 就是 `tsc -b` 的产物（`dist/client.d.ts` mtime 同样落在 `11:25:06`，证明 tsc 确实处理了 `client.ts`）。于是 `dist/client.js` 成了**两个工具共写的同一个文件，两种互不兼容的格式**，而「谁最后写」只由 `package.json:41` 一行的先后顺序保证。任何一次裸 `tsc -b`（只改 `src/` 里任何一个文件就会触发重写，**不限于 `client.ts`**）之后重启 DSH，就是 `#150` 原样再来一遍：所有插件注册不上、`Failed to load plugins`。门 4 在报告里跑的就是裸 `npx tsc -b`——它这次没出事，只因为 `tsc -b` 判定工程已是最新而没有重写。

---

## 三、其它装载风险

**cordis.patch —— 对。**

```
plugin-chef/cordis.patch.yml:3-6          plugin-bill-ilife/cordis.patch.yml:3-6
- insert:                                 - insert:
    - id: dsh-chef                            - id: dsh-bill-ilife
      name: 'dsh-chef'                          name: 'dsh-bill-ilife'
      config: {}                                config: {}
```

逐字同形，只差 id／name。与 `dsh --profile web --dump-config` 出的那一行对得上。

**host 半 `dist/index.js` 能被 import 吗 —— 静态看可以。**

- 2006 B，`dist/*.js` 顶层 await 扫描 = **0**。
- 依赖链：`dist/index.js` → `./skill-provider.js` → `./bridge.js` → 全部是 Node 内置（`node:child_process`／`node:fs`／`node:fs/promises`／`node:module`／`node:path`／`node:url`）。**零第三方依赖**——`package.json:28` 声明的 `dsh-life-pack` 实际没被 import。
- 按任务要求**未执行**，只做静态读取。（真正执行过的证据是报告 8d 的探针实例，那条我认可。）

**dist 新鲜度 —— 不比 src 旧，不是硬伤。**

```
newest src = 2026/9/12 11:25:06
dist/index.js  11:25:06  len=2006   older=False
dist/client.js 11:39:35  len=3511   older=False
```
并且不只比时间，也比了内容：`dist/index.js:12` `export const inject = ['skills'];` 与 `src/index.ts:14` 一致。技能包侧同样新鲜：`packages/skill-chef` 最新源码 `9/9 21:59:09`，`dist/cli/cmd_read.js` 为 `9/10 10:34:12`。

**Junction 形态 —— 无「两份 skill-chef」，无「解析到旧副本」；但机器上确实另有一份旧的普通目录。**

三个链接位（`profiles/web/node_modules/skill-chef`、`.dsh-module-fallback/node_modules/skill-chef`、`.agents/skills/skill-chef`）都已验证为 `LinkType=Junction`，且**三个锚点读到的 `SKILL.md` 与仓库那份 sha256 逐字节相同**（`1BE06C70…`，7756 B）。`.dsh-module-fallback` 那条「一跳中转」其实**就是既有形状**：`skill-bill`→`plugin-bill-ilife/node_modules/skill-bill`、`skill-calorie`→`plugin-calorie/node_modules/skill-calorie`、`skill-memo-ilife`→`plugin-memo-ilife/node_modules/skill-memo-ilife`。报告把它写成「被 pnpm 改指」的意外（第 100／397 行），事实层面没错，但**低估了这是标准形状**——这其实是好消息：将来重跑装机，这条会被 pnpm 自己接对。

残留隐患（低，但值得记一笔）：这条中转的目标由 `packages/plugin-chef/package.json:29` 的 `"skill-chef": "^0.1.0"` 决定。今天 workspace 链接解析到仓库件；若哪天 `packages/skill-chef` 的版本越过 `^0.1.0`，这一跳就可能落到 registry 上的另一份，那时「主链接位指着仓库、回退位指着别处」才会成立。今天不成立。

**报告完全没提的那一份**：`C:\Users\辰辰洋洋\node_modules\skill-chef` 是一个**普通目录，不是链接**，创建于 `2026/9/7 16:40:20`：

```
无 SKILL.md
package.json: files = ["dist","templates/*.html"]     ← 少了 SKILL.md（正是本票修掉的那处断链）
              dependencies = { "base-link-core": "^0.1.0" }   ← 比仓库的 ^0.3.0 旧
dist/cli/cmd_read.js  len=24169  sha=0DDE9C9EEBA8333F  ← 与仓库那份同 sha
C:\Users\辰辰洋洋\node_modules\.bin\chef-cmd-read.cmd
    → "%dp0%\..\skill-chef\dist\cli\cmd_read.js"       ← 指的就是这份旧拷贝
```

它今天不在任何发现路上（`~/node_modules\.bin` 不在 PATH 上），所以**不是现行地雷**。但它是一个现成的陷阱：谁要解决 PATH 缺口，最省事的动作就是把 `~/node_modules\.bin` 加进 PATH——那会立刻启用一条指向「无 `SKILL.md` 的旧拷贝」的 shim，提供方 `list` 会静默返空。报告没提这份拷贝的存在。

**技能包纯度 —— 成立。** 见第一节第 4 问。

---

## 四、`chef-cmd-read` 不在 PATH：影响判定与应归哪张票

**(a) 插件侧不受影响 —— 已核源码，成立。**

`packages/plugin-chef/src/bridge.ts`：

- `:43-50` `resolveSkillCli()`：`createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json')` 拿到包位置，再 `join(dirname(pkgJson), 'dist/cli/cmd_read.js')`；解析失败才回退单仓相对路径。
- `:76-80` `readViaCli()`：`spawnSync(process.execPath, [bin, key, '--params', …])` —— **调的是绝对路径，全程不读 PATH**。
- `:56-63` `assertCliPresent()` 缺失即抛 `missing-cli`，不返空。

顺带一个有用的推论：因为 profile 里的 `dsh-chef` 是 Junction 指向仓库，`import.meta.url` 落在 `D:\ilife\packages\plugin-chef\dist\`，所以这条解析走的是**仓库的** `plugin-chef/node_modules/skill-chef`，也就是 `D:\ilife\packages\skill-chef`。这解释了为什么 `.dsh-module-fallback` 那条被改指也不影响功能。

**(b) 用户／AI 说「私家大厨help」时走哪条路？**

现状是**两条路同时在**，性质不同：

1. **插件提供方那条**：`dsh-chef` 的 host 半注册提供方，把 `skill-chef` 的名称、介绍（37 条触发词）交给 DSH，AI 按需读全文，再经 host 桥调 CLI。这条**不碰 PATH**（见 a）。
2. **技能目录那条**：`~/.agents/skills/skill-chef` 这条 Junction 让 DSH 的目录发现层直接看见整包（含 `SKILL.md`）。`SKILL.md` 正文自己写着「唯一出口 `chef-cmd-read <chef.key>`」——这句话在**邀请 AI 去敲一条命令行**。

所以答案取决于票 11 把端到端定在哪条路上：

- 若走**提供方／桥**（`ctx.skills` → host 桥 → CLI）：**PATH 缺口不影响目的地**，它只是一条多余的手工通路。
- 若走**AI 敲命令**：**这是真缺口**，目的地达不成——`Get-Command chef-cmd-read` 返回 NOT FOUND，本机 PATH 上只有 `calorie-cmd-read`。

**一条支持「不影响」的旁证**：`bill-cmd-read` 的状态与 chef 完全一样（只在 `.bin` 里、没进 PATH），而饼干记账那条线已经走过同样的装机（`dsh-bill-ilife` 在 profile 里、`~/.agents/skills/skill-bill` 是 Junction），并且它的 HELP 已经交货。若那条线的端到端靠的是 PATH 命令，早就报同样的问题了。**倾向判断：不阻塞目的地，但必须由票 11 明说它走的是哪条路。**

**顺带把报告没写清的那半截补上**——`calorie-cmd-read` 之所以在 PATH 上，机制是**两步**：

```
D:\2Study\nodejs\calorie-cmd-read.cmd
    → "%dp0%\node_modules\skill-calorie\dist\cli\cmd_read.js"
D:\2Study\nodejs\node_modules\skill-calorie
    Junction -> D:\ilife\packages\skill-calorie
```

即「**PATH 目录里放一份 shim ＋ 该目录下的 `node_modules` 里放一条指向仓库包的 Junction**」。报告第 381 行只说「照 `calorie-cmd-read` 的样子放一份 shim 进 `D:\2Study\nodejs\`」，漏了后半截；照字面做而不建 Junction，就得复制一份，那就又造出第三节说的那种旧拷贝。

**(c) 该由哪张票关 —— 判断与理由（不替它做决定）。**

**应由票 11（真机端到端）关，不建议本票回修。** 理由三条：

1. 本票的范围是「插件侧装机」，而 PATH 缺口**在插件侧不存在**（a 条已证）；本票没有能力决定端到端走哪条路，回修也只能照抄一个 shim。
2. 这个缺口的**性质由票 11 的选路决定**：走桥就不是缺口，走命令才是。在选路之前修，可能修一个不需要的东西。
3. 票 11 的验收若用「说一句话拿到 HTML」做判据，它会**天然撞上**这条；把分辨责任放在它手上最省事。

**但有一个前提条件**：票 11 必须在验收记录里**写明它走的是哪条路**。只报「拿到了 HTML」而不写路径，等于把这条缺口重新藏回去。

---

## 五、回滚安全网审查（逐条命令）

报告的 `t10-install.md:108-117` 那段，我逐条只读核过（**未执行**）。

**第 1 步（两个 `Copy-Item`）—— 成立，且备份忠实。** 我没用文本比对，用的是结构化比对：

```
bak-218 vs live：  依赖 live 独有 = dsh-chef      bak 独有 = 空
                   bundles live 独有 = dsh-chef   bak 独有 = 空
                   bak bundles 15 项 → live 16 项
```

也就是说，备份与当前状态的差异**恰好只有本票加的那一项**，没有夹带别人的改动。`package.json.bak-218`（1148 B）、`pnpm-lock.yaml.bak-218`（102012 B）都在；备份锁文件里有 `dshmarket`、没有 `dsh-chef`，与预期一致。

**第 2 步（三条 `rmdir`）—— 路径都对，`rmdir` 用法也对。** 三个位置都在、都是 Junction；`rmdir` 删的是链接本身，不动仓库。

**第 3 步（重启 DSH 实例）—— 对，且不伤正在用的 GUI。**

**漏项（硬伤 3）**：

1. **`C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-chef` 没删**（Junction，创建于 `11:27:39`，指向 `D:\ilife\packages\plugin-chef`）。它是插件自己那条链接位。删掉 packs／deps 之后它没人引用，**留着不会炸**，但「回到装前」这句话就不成立。补一行 `cmd /c rmdir "…\profiles\web\node_modules\dsh-chef"` 即可。
2. **恢复两个 profile 文件后，没有任何一步把 `node_modules` 拉回与锁文件一致。**（`.dsh-module-fallback/node_modules/dsh-chef` 经查**不存在**，这一条不用管。）低影响——恢复后的 `bundles` 不含 `dsh-chef`，DSH 不会去装它——但严格说装机件与锁文件此时处于不一致状态。
3. **第 1 步是整文件覆盖，报告没说「先比差异」。** profile 的 `package.json` 是会被别的动作改写的活文件（这份文件里就有 13 个第三方插件）。若在备份与回滚之间又装了别的东西，照字面覆盖会把它一起抹掉。建议改成「先 diff 一遍，只回退 `dsh-chef` 那两行」。
4. **`D:\ilife\pnpm-lock.yaml.bak-218` 留了却没在回滚里用**（第 102 行列为备份，回滚段没提）。这一条其实**不算错**：`tsdown` 的 devDependency 是源码侧改动，本来就该留下。但报告把它列进「备份」容易让人以为回滚会用它。

**结论：照报告能干净卸掉吗 —— 能卸到「profile 不再装配 `dsh-chef`」，不是逐字回到装前。** 缺的是上面第 1、2 条。没有「卸不干净、留个半死不活的东西」的硬伤。

---

## 六、对票 6／7／9／11 的连累与前置

**（a）票 6／7 改了 `src/client.ts` 而忘了跑 `build:client`，会怎样 —— 报告问错了问题。**

实测三种情形：

| 情形 | `dist/client.js` 变成什么 | 下次启动 DSH 的后果 |
|---|---|---|
| 改了 `src/client.ts`，**只跑 `tsc -b`** | 裸 ESM（约 831 B，即报告记录的修前形态） | **全部插件注册不上，`Failed to load plugins`——`#150` 原样重演** |
| 改了 `src/client.ts`，**什么都不跑** | 仍是上一次 tsdown 的合法工厂包（旧内容） | GUI 正常；只是面板改动没生效（本票范围内无所谓，面板是占位的） |
| 改了**任何** `src/` 下的文件，只跑 `tsc -b` | 同样被重写成裸 ESM | 同上，**第一条** |

所以真正的雷是「**跑了 `tsc -b`**」，不是「忘了跑 `build:client`」。触发条件也不限于 `client.ts`——`tsconfig.json:12-14` 收的是整个 `src`。

**报告给 `#57` 的那条提醒确实在。** 我读了 GitHub 上的活评论（id `5643215760`，`#57` state=open、comments=1），原文：

> **本票做面板接线时，`dist/client.js` 已由 tsdown 产出，改 `src/client.ts` 后记得跑 `npm run build:client`（不是只跑 `tsc -b`）。**

方向对，但把故障说成「忘了跑」，而实际故障是「跑了 `tsc -b`」；触发面也写窄了。建议回评论补一句更强的：**「`tsc -b` 会把 `dist/client.js` 重新写成裸 ESM——只跑它等于把 `#150` 装回去。改完 `src/` 后一律跑 `npm run build`，不要单跑 `tsc -b`。」** 兜底的门是 `test/client-bundle-48.test.mjs`（它读的就是仓库里的在盘文件，正好是会被告警的那一份），但它得有人跑。

**（b）票 9（`#217`）改 `SKILL.md` 要注意什么 —— 报告一个字都没提醒。** 这是本节最实在的缺口。

`packages/plugin-chef/src/skill-provider.ts` 里的 frontmatter 解析是**自写的最小解析器**（`:46-67`），不是通用 YAML：

- `:48` `if (!normalized.startsWith('---\n')) return null;` —— frontmatter 必须是文件的**头三个字节之内**，前面不许有 BOM、空行、注释。
- `:50-51` `const end = lines.indexOf('---', 1); if (end < 2) return null;`
- `:54` `const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(ln); if (!m) return null;` —— **frontmatter 里每一行都得是 `键: 值`**。
- `:64` `if (!name || !description) return null;`

后果链：解析返 `null` → `loadSkill()`（`:69-85`）返 `null` → `listSkills()`（`:87-89`）**返回空数组**、`getSkill()` 返 `undefined`——**不抛错、不打日志，技能从目录里静默消失**。票 9 要往 `SKILL.md` 里补「HELP 交付」一节，最自然的动作有两种正好会踩雷：

- 把 287 字符的 `description` **折行**写（YAML 多行标量）；
- 在 frontmatter 里加**嵌套键**（比如 `metadata:` 下一层）。

两条都会让 `list` 静默返空。

**有兜底，但不是报告给的**：`packages/plugin-chef/test/skills-provider.test.mjs:97-104` 断言 `description` 覆盖 `WAKE_TABLE` 全部 37 条；`:111-116` 断言 `parseSkillText` 能解析出 `name` 且等于 `SKILL_NAME`。所以改了 frontmatter 而没同步，**门 2 会红**（而且是响亮的红——`const [c] = await list` 拿到 `undefined`，`String(c.description)` 直接抛）。也就是说风险被门兜住了，但**票 9 的人得知道要去跑门 2**。报告没有把这条交出去。

另外一条票 9 要注意的：`WAKE_TABLE` 一句话改了，`description` 就必须重生成（报告用 `packages/skill-chef/scripts/add-frontmatter-218.mjs` 从 `WAKE_TABLE` 机械抽取拼的）。这个脚本是一次性的、住在技能包 `scripts/` 下（`git status` 显示未跟踪），票 9 还能不能用，报告没说。

**（c）票 11 的前置**：见第一节第 9 问与第七节。

---

## 七、与目的地的距离（自我认知是否准确）

**总判：准确，没有夸大目标达成；`#57` 那条评论的措辞比证据跑快了一步。**

**没夸大的地方**：

- 报告第 6 行开门见山：「**本票只负责插件侧**……**不实现 HELP 渲染与落盘**（那是票 6／7）」。第 4 行的目的地口径也照抄了地图原文。这句话是对的——本票没有 help 模板、没有渲染、没有落盘、没有 `<TS>` 文件名。**「说私家大厨help → 拿到 HTML」现在确实还不成立**，报告自己说了。
- 第 381 行把 PATH 缺口如实写成「未做到」，并且**没有**在 `D:\2Study\nodejs\` 里造 shim（超出票面边界，不越界是对的）。

**没有贬低的地方**：本票实际多做到的都报了——客户端产物合法化（`#150` 那条链堵上）、`files` 补 `SKILL.md`、`SKILL.md` 补 frontmatter（实测的两处断链点，且正是「装上也读不到说明面」和「整包被跳过」两种静默失败）、提供方 `list`／`get` 回路、CLI 解析出绝对路径并跑通（`exit=0`、`envelope.key = chef.help.lookup`、`total=37`）。这些都是通往目的地的实打实的台阶。

**跑快了一步的地方（两处）**：

1. `#57` 评论里那一格写「DSH 真机可见 skill-chef（名＋介绍，可按需读全文调 CLI）—— 已实测」，把三样混在一格里：`--dump-config` 出现（真）、探针进程里的 `list`／`get`（真，但是在**另一个进程**里）、本会话技能表出现（真，但是**另一条发现路**）。三项都真，凑成一句「真机可见」就有点松。
2. **报告没有一句话告诉用户：这个 GUI 现在还没加载 `dsh-chef`，要下次启动 DSH 才生效。** 见硬伤 2。这条不写，用户今天说「私家大厨help」和明天说，行为可能不一样，而没人知道为什么。

---

## 八、最小整改清单（按性价比，≤6 条）

1. **把 `dist/client.js` 的双写拆开（最值钱的一条）。** 二选一：`packages/plugin-chef/tsconfig.json:12-14` 的 `include` 从 `["src"]` 改成显式排除 `src/client.ts`（host 半本就不需要它的值），或把 host 半 emit 到别的目录。做完再验一次：改一下 `src/slot.ts` → `npx tsc -b` → `dist/client.js` 的 sha 不许变。**理由**：这是本票唯一一条「一次误操作 = 全体插件起不来」的路径，而它现在就挂在 `package.json:41` 一行的先后顺序上。
2. **在报告里补一句「插件半要等下次启动 DSH 才在这个 GUI 里生效」**，并把第 279 行那条证据改标成「`~/.agents/skills/` 目录发现路热读成功」，与插件提供方注册分开写；`#57` 评论那一格同步改口径。**理由**：票 11 的「真机可见」不能签在这条证据上。
3. **回滚段补两条**：加 `cmd /c rmdir "…\profiles\web\node_modules\dsh-chef"`；加一句「先 diff 一遍 live 与 bak，只回退 `dsh-chef` 那两行」。**理由**：现在的写法会留下一条 Junction，且整文件覆盖有误伤别人改动的余地。
4. **给票 9（`#217`）留一条前置**：`SKILL.md` 的 frontmatter 只能是单行 `键: 值`，不许折行 `description`、不许加嵌套键，前面不许有 BOM／空行；改完跑 `node --test packages/plugin-chef/test/*.test.mjs` 与 `node --test packages/skill-chef/test/*.test.mjs`。**理由**：`skill-provider.ts:46-67` 的解析器会让违规 frontmatter **静默**把技能从目录里抹掉。
5. **把「本来红 vs 我弄红」的分辨办法写成一句可复制的操作交给票 6／7／11**（例如：`git show HEAD:packages/base-combos/combos.yaml` 等三源重算 sha，等于快照文件里那份就是预存红）。另加一句提醒：**同一工作树上还有别的会话在写**（`git status` 里有约 30 个 `skill-calorie`／`base-render` 相关改动），任何门都可能因他人改动转红。**理由**：报告现有的归因是对的（我独立复算过），但它只解决了这一条门，没交出一把通用的尺子。
6. **在报告的不确定项里补一笔**：`C:\Users\辰辰洋洋\node_modules\skill-chef` 是 9/7 留下的旧拷贝（无 `SKILL.md`、`base-link-core@^0.1.0`），`~/node_modules\.bin\chef-cmd-read.cmd` 指着它；**解决 PATH 缺口时不要走「把 `~/node_modules\.bin` 加进 PATH」这条捷径**，照 `calorie-cmd-read` 的完整机制做（PATH 目录放 shim ＋ 该目录 `node_modules` 下放指向仓库包的 Junction）。**理由**：这是现成的陷阱，且报告第 381 行只说了一半机制。
