# CI 门禁逐件清单与已知红灯归属（只认一手来源）

> 范围：`.github/workflows/ci.yml` 全文（141 行，2026-10-08 读取时点）、根 `package.json` 与 `packages/*/package.json` 的 `scripts`、CI 调用的门禁脚本（`tooling/*.mjs`、`docs/research/t*.mjs`）、`docs/adr/` 三份 ADR、GitHub 上与 CI 红灯相关的 issue 状态（`gh` 无认证不可用，改走公开 `api.github.com` 同等一手读数，见 §4 方法注记）。
> 约束遵守：只调研、不改业务代码；未跑重型测试矩阵；只执行只读命令（读文件、`grep/glob`、`web_fetch` 公开 API）。
> 文件名说明：沿用 `docs/research/` 内既有**非票号研究文件名**先例（如 `benchmark-visual-spec.md`），本次无票号，故用 `docs/research/ci-gates-inventory.md` 而不用 `t<票号>-<主题>.md` 形。

## 0. CI 骨架（来源：`.github/workflows/ci.yml`）

- `build-test`：3 OS × 2 node（22.13.0／24.x）＝ 6 条腿，`fail-fast: false`（来源：`ci.yml:8-15`）。顺序：`install → build → gen:check → doctor → test → boundaries → base:floor → snapshot:html:check → gate:selftest:html → 取master基线 → changeset:status → help:examples:check`，除首三步外人人带 `if: always()`（来源：`ci.yml:43-78`）。
- `publish-gates`：单腿 ubuntu-latest＋node 24.x：`install → build → publish:pre → publish:tarball → publish:fresh → 模板资产门 → 打包实证与清理守卫自证`，五道门各带 `if: always()`（来源：`ci.yml:89-123`）。
- `win-detail`：`needs: build-test`，windows-latest 上 `install → build → doctor → test`，中文路径／换行／CRLF／doctor 强提示的人工细验位（来源：`ci.yml:125-141`）。
- 防遮蔽设计：#295 返修 A8（build-test）与 #311（publish-gates）要求每道门 `if: always()` 且全作业零 `continue-on-error`，判据由 `test/ci-gates-295.test.mjs` 机器盯（来源：`ci.yml:35-42,84-88`、`test/ci-gates-295.test.mjs:1-30`）。注意残余遮蔽面：`install/build` 两步仍无 `if: always()`（有意为之，票面未写明，来源：`t308-312r-复核报告.md:496` S3-4）。

## 1. 门禁逐件清单

每道门四问：防什么真实事故（立项票/ADR）／变红判据／修绿动哪里／复杂度（小·中·大）。

### 1.1 install —— `pnpm install --frozen-lockfile`（来源：`ci.yml:28,99,138`）

- 防什么：锁文件漂移、engine 不足（`packageManager: pnpm@11.8.0`、`engines: node>=22.13`，来源：根 `package.json:6-9`；P2 ADR 口径“只跑 22.13+/24，不测 18/20”，来源：`ci.yml:12`）。
- 变红判据：`--frozen-lockfile` 下 lockfile 与 `package.json` 不一致即非 0；node/pnpm 版本不对即走不下去。
- 修绿动哪里：改依赖声明的一侧并重锁（`pnpm install` 更新 `pnpm-lock.yaml`），或对齐 CI 的 pnpm 11.8.0／node 版本。复杂度：**小**。

### 1.2 build —— `tsc -b && gen --stamp && build:client`（来源：根 `package.json:11`）

- 防什么：TS 类型破裂、生成器印记过期、client 工厂包未构建（ADR-0001 铁律①“client 产物必须是通过 loader 校验的工厂包”，来源：`docs/adr/0001-hexagonal-architecture.md`）。
- 变红判据：`tsc -b` 任一包错误；`gen-cli.mjs --stamp` 写印记失败；插件包 `build:client(t sdown)` 失败。
- 修绿动哪里：报错的包源码（`packages/<包>/src`）；印记问题先重跑全量 `pnpm build` 再判（来源：`packages/skill-calorie/scripts/gen-cli.mjs` 文件头“新鲜度”节）。复杂度：**中**（跨 17 个包，来源：`packages/` 目录枚举）。

### 1.3 gen:check —— 生成物 == 生成器输出（立项：#295；来源：`ci.yml:30-33`、根 `package.json:13`）

- 防什么：命令汇总位（keys／registry／combos 镜像／REPR／EXAMPLES／FLOW）被人手改、退化成“第四份手抄”（来源：`ci.yml:30-33` 引“设计正本《命令登记与分派-方案.html》成立要件：确定性＋哈希锁＋CI 校验”）。
- 变红判据（来源：`packages/skill-calorie/scripts/gen-cli.mjs` 文件头“新鲜度”节）：`GEN-CHECK FAIL`（生成物≠生成器输出）／`GEN-STALE FAIL`（源改了没重建，内容印记对不上）／`GEN-PAIR FAIL`（#325 假绿链：改源＋保 mtime 骗过 tsc＋重签印记，现场配对仍对不上）。另含两条连带门：`tooling/skill-call-form.mjs --check`（#742：六份 SKILL.md 的 CALL-FORM 块须与 `docs/agents/技能调用契约.md` 同源渲染，块外零旧写法）与 `tooling/check-data-absence.mjs --check`（#953：生成路由产物整件查＋HELP-AUTO 块区间查，`.data.` 键零泄漏，`chef.data.batch` 祖父条款除外）。
- 修绿动哪里：只改权威声明（`src/<能力>/commands.ts`），然后 `pnpm gen → pnpm build → pnpm help:build`（来源：`build-help.mjs` 文件头“重生成顺序”）；SKILL 侧改契约源而非六份复制处。复杂度：**中**（已知覆盖面缺口：印记缺条目的新能力源＋已有产物时守卫放行、靠下游 `GEN-CHECK` 兜，来源：`t295-复审2-单席.md:103` §七-1）。

### 1.4 doctor —— `node tooling/skilllink.mjs doctor`（来源：根 `package.json:16`、`ci.yml:45-46`）

- 防什么：运行环境与配置落点漂移（P9 #10 冻结：四步 skilllink＋唯一出口＋argv+JSON+exit＋doctor；来源：`tooling/skilllink.mjs:1-5`）。
- 变红判据：exit 1（来源同上注释“退出码冻结：0 ok；1 doctor fail；2 用法…”）。检查面：node≥22.13（来源：`skilllink.mjs:checkNode`）、配置目录唯一落点 `~/.ilife` 可写（来源：`configDirPath/checkConfigDir`，#726/#754 口径）、lark 只 warn 不判。
- 修绿动哪里：升级 node、建/修 `~/.ilife` 目录权限；lark 缺失不用修。复杂度：**小**。

### 1.5 test —— `node tooling/check-real-home-untouched.mjs --run` 全量套件（来源：根 `package.json:15`、`ci.yml:47-48`）

- 防什么两件事：① 各包功能回归（含 #294 棘轮：能力目录声明“一个键恰出现一次”＋定义集恰为注册表键集，来源：ADR-0002“后果”节；ADR-0001 回路 `test/client-bundle-48.test.mjs` 长期看门）；② 跑测试没写真实 `~/.ilife`（票 #763：快照→跑命令→再快照→比对，逐字相同且命令 exit 0 才 PASS，来源：`tooling/check-real-home-untouched.mjs` 文件头；`SUITE_GLOBS` 与 `test` 脚本同一份 glob，来源同文件）。
- 变红判据：任一 `*.test.mjs` fail，或真实家目录树（路径＋大小＋mtime）有 added/removed/changed（来源同上“读数/退出码”节）。
- 修绿动哪里：失败测试归属的包（常见面见 §2 S3-票外：`client-bundle-48` 一族等）；家目录被写则修测试隔离（家目录注入，不开覆盖口子，来源：`skilllink.mjs:checkConfigDir` 注释#754）。复杂度：**大**（全量套件约 1492 tests 量级，来源：`t308-312r-复核报告.md:339`；且多席并发易 flake，来源同报告 §5.1）。

### 1.6 boundaries —— `node tooling/check-boundaries.mjs`（P4 三包边界冻结；来源：`ci.yml:49-50`）

- 防什么：公共层装配权旁落（link-core 零依赖、装配原语只许住 render、present 只许字符串级引用）与 base-* 变更静默渗入未迁移技能（来源：文件头注释；#96 结构面在此卡死，行为面在 snapshot 门）。
- 变红判据：任一 `assert` FAIL 即 exit 非 0（如 link-core 源码引用 workspace 包、出现自装配原语）。实现细节：#694 后改走递归 walkSrc（扁平 readdir 会把子目录当文件读抛 EISDIR，来源：文件头 #694 注释）。
- 修绿动哪里：越界的源码/依赖声明；“善意越界”需地图裁决并把该技能移出“尚未迁移”名单（先例：bill #145、schedule #199、memo #220、chef #214，来源：文件头四段注释）。复杂度：**中**（名单语义需对照地图裁定正本，不可单改名单放行）。

### 1.7 base:floor —— `node tooling/check-base-floor.mjs`（立项：#861；来源：`ci.yml:51-55`）

- 防什么真实事故：#861 实测——六技能配置表删键改走“已退休键清单”，`package.json` 仍写 `^0.3.0`，装机沿用锁里不懂退休清单的 0.3.6，六个配置面板全部读不出配置；第二轮再收紧：caret 仍把“装到哪一版”交给解析器（干净机装到区间最高、旧存量机停在旧版），故声明必须是精确版本（来源：文件头两节注释）。
- 变红判据：消费方 `dependencies/peerDependencies` 里的 base-* 声明不是精确 `x.y.z` 或不逐字等于仓内该 base 包版本；扫不到边也红（来源：文件头“判据（一条）”）。
- 修绿动哪里：把消费方的 base-* 声明钉到仓内版本的精确号（devDependencies 不在判据内，来源同上）。复杂度：**小**。

### 1.8 snapshot:html:check —— `node tooling/skill-html-snapshot.mjs --check`（立项：#96；来源：`ci.yml:56-59`）

- 防什么：共享层地基（base-paint）变更导致其余 5 技能页面静默回归（来源：文件头 ①②：行为冻结＋影响面断言；calorie 被排除因 #108–#113/#83 在途改造它，冻结会跨票假红）。
- 变红判据：逐件 sha256（去 BOM＋CRLF→LF 跨 OS 同值）任一件不同；或任一产物出现 base-paint 命名空间标记（`ilife-／ilife-base／data-ilife`，白名单必须为空）；快照自洽破坏（text 与 sha 对不上）亦红；未构建显式失败不跳过（来源：文件头）。
- 修绿动哪里：先 `--show <id>` 定位差异；有意迁移才 `--write` 重建快照（先校验后落盘，标记命中一字节不写）；无意差异修回实现。复杂度：**中**。

### 1.9 gate:selftest:html —— 门禁工具自证（立项：#96 协议 §2.4.6；来源：`ci.yml:60-64`）

- 防什么：门禁工具本身（skill-html-snapshot 的测试面）失效而不自知——它不在 canonical `pnpm test` glob 内，须单独触发（来源：`ci.yml:60-61`）。
- 变红判据：`tooling/test/skill-html-snapshot.test.mjs` 任一失败；已知实例：#309（memo 键期望值 11≠10，来源：`t308-312r-复核报告.md` M1／§11 表）。
- 修绿动哪里：`tooling/skill-html-snapshot.mjs` 或其测试的期望值；调用必须经持锁包装器＋独立锁目录 `.scratch/locks-selftest`，调用方不得再套 run-locked（来源：`ci.yml:61-63` D-1 自锁修复注释）。复杂度：**小**。

### 1.10 取 master 基线 ＋ changeset:status（来源：`ci.yml:18-20,66-72`、根 `package.json:28`）

- 防什么：无基线的浅克隆导致 changeset 状态误判；发版缺 changeset 记录（来源：`ci.yml:19`“浅克隆无基线必挂”）。
- 变红判据：`git fetch origin master:master || git fetch origin master` 失败，或 `changeset status` 报告缺 changeset／版本 computation 非 0。
- 修绿动哪里：补 `.changeset/<名>.md`；基线失败看网络/远端分支名。复杂度：**小**。

### 1.11 help:examples:check —— SKILL.md“例”列逐行实跑（立项：#99；判据同源 #81；来源：`ci.yml:73-78`）

- 防什么：SKILL.md 速查表示例写死/过期却无人发现（来源：`packages/skill-calorie/scripts/check-examples.mjs` 文件头：AUTO 块新鲜度＋每键恰一行＋params 可 JSON.parse＋标准种子库下 spawn 真 CLI exit 0 且 envelope key 一致；种子与占位替换唯一定义 `docs/research/t81-seed.mjs`，#81 exec⟺exit 0 同源；白名单 NON_EXECUTABLE 当前为空，禁删示例放宽断言）。
- 变红判据：任一判据缺一即 exit 1，末行 `RESULT: n/m`（来源同上）。已知红：#308（`calorie.view.exercise-review`“本周”窗内无计划会话，种子第 1 周第 1 天落在窗外，修法只改种子一行 (1,1,1)→(2,1,1)，来源：`t308-312r-复核报告.md:261-289`）；Windows 两腿另一独立红：`STRUCT 产物不新鲜：AUTO 块 != 生成器输出／RESULT: 0/101`，票前票后同腿同因（来源同报告 §4.5）。
- 修绿动哪里：先在 LF 腿跑通；种子问题改 `t81-seed.mjs`（示例口径不动，#308 先例）；AUTO 块问题跑 `help:build` 重生成（需先 `build→gen→build`，来源：`build-help.mjs` 文件头）；Windows STRUCT 另案处置（§2）。复杂度：**中**（Windows 侧残余按“大”另立票，见 §2）。

### 1.12 publish:pre（G1）—— `check-publish.mjs --pre`（立项：#48 R2 A+B；来源：`ci.yml:81`、根 `package.json:24`，样板期 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`）

- 防什么：`workspace:` 协议外泄到发布物（来源：`tooling/check-publish.mjs` 文件头 G1）。
- 变红判据：全仓各包 `package.json` 整文件任一 `workspace:` 命中。
- 修绿动哪里：命中包的依赖声明改回已发布版本区间。复杂度：**小**。

### 1.13 publish:tarball（G2）—— `check-publish.mjs --tarball`（立项：#48＋#95；来源同上）

- 防什么：打出的包缺运行必需件（来源：文件头 G2：6 skill 必含 `dist/cli/cmd_read.js`；有运行时模板加载器的必含 `templates/` 并逐件点名（#95）；6 单品必含 `dist/index.js + cordis.patch.yml`）。
- 变红判据：`npm pack --dry-run` 清单逐件断言任一件缺失。
- 修绿动哪里：缺失包的 `files` 字段／构建产物（注意 tsc 不复制资源，只靠 files 随包发，来源：文件头 G3 注释）。复杂度：**中**（需懂 files×构建×tarball 三角）。

### 1.14 publish:fresh（G3）—— `check-publish.mjs --fresh-tmp`（立项：#48＋#95；来源同上）

- 防什么：包能打出但装不上、用不起来（来源：文件头 G3：打 13 实包 tarball→**仓外** fresh tmp 目录 npm install→断言单品 cliPath 落在 node_modules 下对应 skill 包内＋契约键打通；模板包逐件 loadTemplate 真读；没跑的断言显式记“未跑”不冒充全绿 #95 F4）。
- 变红判据：安装态断言任一 FAIL；已知票外红：`dsh-calorie 契约键 calorie.help.center exit 1`、`G3 安装态断言红`（来源：`t308-312r-复核报告.md:505` S3-票外）。
- 修绿动哪里：契约键实现／模板装载／files 清单；临时根必须在仓库外（F1，来源：文件头 TMP_ROOT 注释；违反即重现 2026-09-09 全仓事故机制）。复杂度：**大**（真实 npm install＋多包矩阵，最慢的一道）。

### 1.15 模板资产门（skill-calorie）—— 三脚本显式复跑（立项：#95；来源：`ci.yml:107-116`）

- 防什么：`--only` 全量口径漂移掩盖单包模板缺失（来源：`ci.yml:107-108`“单包显式复跑，不吃 --only 全量口径的漂移”；G2 逐件含 templates／G3 fresh 安装态 loadTemplate 真读 6 件）。
- 变红判据：`check-publish --tarball --only skill-calorie`／`--fresh-tmp --only skill-calorie`／`--tmp-hygiene`／`t95-g3-honesty.mjs` 任一非 0。honesty 四条（来源：`t95-g3-honesty.mjs` 文件头）：A 临时根仓外／B“安装态 templates/ 6 件经 loadTemplate 全部装载成功”逐件／C 无插件 scope 不得宣称“契约键打通”／D 公开出口记“未跑＋待 base-paint 发版后补”／E 仓内零 `ilife-fresh-*/ilife-pack-*` 残留。
- 修绿动哪里：`tooling/check-publish.mjs` 的模板清单与记账文案；残留先清仓内临时目录。复杂度：**中**。

### 1.16 打包实证与清理守卫自证 —— `t95-publish-evidence.mjs` ×3 模式 ＋ `t95-f1-attribution.mjs`（立项：#95 返修；来源：`ci.yml:117-123`）

- 防什么：门“看起来绿但没牙”（证据链）与清理误删仓库（守卫）。断言链（来源：`t95-publish-evidence.mjs` 文件头）：A files 含 templates／B tarball 逐件＋dist/render/templates.js／C 安装态 loadTemplate 6 件非空双标记／D `--mutate`（摘 files 即 B/C 双红）／`--guard-selftest`；F1 归因 2×2 实测“决定性变量是安装目录缺最小 package.json、与 cwd 编码无关”（来源：`t95-f1-attribution.mjs` 文件头）。
- 变红判据：任一模式 exit 非 0（`--mutate` 期望双红、没抓住即 exit 1）。
- 修绿动哪里：`docs/research/t95-*.mjs` 证据脚本或被它指出的 files/loader 实现。复杂度：**小**（纯复跑脚本，无业务面）。

### 1.17 win-detail 作业（来源：`ci.yml:125-141`）

- 防什么：Windows 特有（中文路径／换行 CRLF／doctor 强提示）在主矩阵里被稀释。
- 变红判据：`pnpm doctor/test` 在 windows-latest 上非 0（无 `if: always()`，`needs: build-test`，上游红则整作业跳过——有意取舍）。
- 修绿动哪里：对应 doctor/test 根因；中文路径问题看 F1 同源注释（决定性变量是 package.json 缺失而非编码，来源：`check-publish.mjs` F1 注释）。复杂度：**小**（定位快，修法同主门）。

## 2. 已知红灯的归属

### 2.1 点名票的状态（全部 closed；来源：api.github.com issues，一手读数 2026-10-08）

| 票 | 标题（摘） | 状态 | 与 CI 红灯关系 |
|---|---|---|---|
| #308 | 卡路里 SKILL.md 例列门恒红：`calorie.view.exercise-review`“本周”取数失败 | closed 2026-09-13T16:02:36Z | 例列门 LF 腿 100/101→101/101 已修（只改种子）；但票面判据“master 上 exit 0”**全局未达成**——Windows 两腿仍 STRUCT 红，复核判“关闭依据不成立”（来源：`t308-312r-复核报告.md:566,570-571`） |
| #309 | `gate:selftest:html` 期望值过期（memo 键 11≠10） | closed | 关闭依据成立（期望值 11 与活产物一致，变异即红 M1；来源同报告 §11 表） |
| #311 | publish-gates 一步红吞两步（缺 `if: always()`） | closed | 关闭依据成立（五道门逐行带上，真 CI 第 10/11 步 skipped→success；来源同上） |
| #312 | CI 静默跳过 4 条测试：schedule help-assets 依赖不入库 .scratch 事实源 | closed | 关闭依据成立（fixture 入库＋摘要锁；来源同上） |
| #295 | 命令登记与分派：生成物＋gen:check | closed | 门本身的立项票；返修 A8 即“一步红不许吞门”（来源：`ci.yml:35-42`） |
| #294 | 注册表＋薄分派＋棘轮 | closed | test 内棘轮面的立项票（来源：ADR-0002 后果节、复核 §5.1.1） |
| #95 | 打包与模板装载：files／loader／publish 门 | closed | 模板资产门＋打包实证的立项票 |
| #96 | 其余 5 技能不回归门 | closed | snapshot＋selftest 的立项票 |
| #99 | G1 SKILL.md 示例可执行门 | closed | 例列门的立项票 |
| #81 | 唤醒词全量复刻（exec⟺exit 0＋标准种子库） | closed | 例列门判据同源票（来源：`ci.yml:74`、`t81-seed.mjs` 文件头） |
| #48 | DSH 插件自带 skill 落地 | closed | 发布三门的立项票（R2 A+B；来源：`ci.yml:81`、ADR-0001 后果节） |
| #861 | 六插件配置面板“不认识的配置项”（base 下界） | closed | base:floor 的立项票（来源：`check-base-floor.mjs` 文件头） |

### 2.2 当前仍 open 的票（来源：`api…/issues?state=open&per_page=10&page=N`，page1 有 2 条、page2 空）

- #912（wayfinder:map 居家收尾）open、#889（居家照片落点）open——**均与 CI 红灯无关**。
- 推论：CI 红灯在 open 票里**无主**（搜 `state:open+ci/publish/help+examples/snapshot+html` 亦 0 命中，来源：search API 四查）。

### 2.3 其余红灯（有红、无主，一并标出；来源：`t308-312r-复核报告.md:505` S3-票外 ＋ `t295-复审2-单席.md:105` §七-3 ＋ Actions runs API）

1. Windows 两腿 `help:examples:check` STRUCT 红（`AUTO 块 != 生成器输出／RESULT: 0/101`）——票前既有、非 #308 引入，但 #308 按票面判据不应标 COMPLETED；必须整改第 1 项即为它另开票（来源：报告 §4.5／§8-1）。归属：**无主**。
2. `pnpm test` 6 条腿红：`dsh-*-ilife client（client-bundle-48 一族）`、`#237 ⑤ 文件名安全化`、`#91 ② mode 显式三态`、`#75 共享样式资产`、`#193 打包技能提供方（居家线）`、`#204 ⑤ 退出码矩阵`——与四票文件面零交集（来源：报告 §S3-票外）。归属：**无主（复审2 记“→ 待转票”）**。
3. `publish:fresh` 红（`dsh-calorie 契约键 calorie.help.center exit 1`、G3 安装态断言红；实测 run 34761515902 第 9 步红吞掉后两步即 #311 前身，来源：`ci.yml:85`）。归属：**无主**。
4. Linux 侧“客户端产物缺”与 memo 旧期望值（11/10，#309 已闭合）——前者待转票，后者已闭合（来源：`t295-复审2-单席.md:105`）。
5. 当前 CI 仍红：Actions API 抽查最近 9 个 run，前 5 个已结论为 `failure`、其余在途（来源：`api…/actions/workflows/ci.yml/runs?per_page=10`，2026-10-08；run 1190 `in_progress`）。“约 45 次 failure”出自蓝队实测注记（来源：`ci.yml:38`、`test/ci-gates-295.test.mjs:8`）。

## 3. Top 5 结论

1. **CI 的红是“多因叠加”，不是“一票可清”**：点名票（#308/#309/#311/#312 等）全部 closed 且关闭依据除 #308 外均成立，但 §2.3 的三族残余红（Windows STRUCT、test 六腿、publish:fresh）在 open 票里无主——修绿须为残余红逐族立票，而非重开已闭合票（来源：§2.1 表＋§2.2＋§2.3）。
2. **#308 关早了**：种子修复只闭合了 LF 四腿，票面判据“master 上 exit 0”在 Windows 两腿仍假（STRUCT 既有红），复核明确判“关闭依据不成立”（来源：`t308-312r-复核报告.md:566-571`）。下一步是为 Windows STRUCT 另开票，#308 重开或改判据（来源同报告 §8-1）。
3. **遮蔽已治、残余遮蔽须写明**：#295 A8／#311 的 `if: always()`＋零 `continue-on-error`＋`ci-gates-295` 机器门成立（来源：`test/ci-gates-295.test.mjs`）；但 `install/build` 仍是合法遮蔽点，须在票面写明以免误读成“任何情况下门都会跑”（来源：报告 S3-4）。
4. **最贵的门是 test 与 publish:fresh**：test 约 1492 tests 且多席并发易 flake（来源：报告 §5.1）；fresh 是真实 npm install 多包矩阵（来源：`check-publish.mjs` G3）。修绿先看这两族的逐腿日志，其余门多为小复杂度。
5. **ADR 映射**：gen:check/test 对应 ADR-0002（棘轮退役后由 cmd-registry 断言承担）与 ADR-0003（src 形状守卫在包测试面，#686）；build/test 的 client 面对应 ADR-0001（client-bundle-48 回路）。改门之前先对这三份 ADR（来源：`docs/adr/0001-0003`）。

## 4. 方法注记（一手来源清单）

- `gh issue list/view` 不可用：本机 `gh` 无认证（`To get started…gh auth login…` exit 4，只读执行已验证）。改走同等一手的公开读数：`api.github.com/repos/FeatherHunter/ilife/issues/<n>`（状态/标题/关闭时间）与 `…/issues?state=open…`（open 枚举）＋ `…/actions/workflows/ci.yml/runs`（最近 run 结论），均为 200实测。
- 仓内一手：`.github/workflows/ci.yml`（141 行）、根 `package.json` scripts、`packages/*/package.json` scripts（17 包已逐包读取）、`tooling/check-{boundaries,base-floor,publish}.mjs`、`tooling/skill-{html-snapshot,link}.mjs`、`tooling/{check-data-absence,check-real-home-untouched,run-locked,check-gate-audit,skill-call-form,baseline}.mjs` 文件头、`packages/skill-calorie/scripts/{gen-cli,check-examples,build-help}.mjs` 文件头、`docs/research/{t81-seed,t95-g3-honesty,t95-publish-evidence,t95-f1-attribution}.mjs`、`test/ci-gates-295.test.mjs`、`docs/adr/0001-0003`、`docs/skills/skill-calorie/{t295-复审-红队,t295-复审2-单席,t295-返修证据,t308-312r-复核报告}.md`。
- 每个结论旁的来源标注即上两条；无猜测项：凡 API/文件未给出的（如具体哪条 test 在最新 run 上红）均标“无主/待转票”，未编造归属。
