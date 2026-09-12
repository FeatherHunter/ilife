# 调查：`skill-home` 与 `dsh-home-ilife` 需不需要发布

- 时刻：2026-09-12 22:2x（本地）
- 执行者：编排方（本会话亲手跑；子代理中途耗尽上下文未产出，证据全部为本会话一手实测）
- 问题（用户原话）：「调查下 dsh-居家管家和 skill-居家管家 是否需要发布」

## 一句话结论

**需要，而且不是「要不要」而是「必须重发」**——npm 上两份 0.1.0 **装不上**（`workspace:` 协议残留），内容也早于本图全部工作（无 HELP 交付、客户端产物是坏的那份 837 B）。但**不能只发这两件**：共用件 `base-paint` 必须先抬版本重发，否则装上都崩（安装态实测逐字见 §三）。

## 一、判据一：仓库自己的发布面把这两件算在内（不是可选项）

- `tooling/check-publish.mjs:53-58`：`SKILLS` 六件含 `skill-home`；`PLUGINS` 六件含 `dsh-home-ilife`；`WITH_TEMPLATES` 含 `skill-home`。
- `tooling/check-publish.mjs:63-64`：`CONTRACT_KEY['dsh-home-ilife'] = 'home.help.lookup'`（正是本图刚做的那个键）、`PLUGIN_OF['dsh-home-ilife'] = 'skill-home'`。
- `tooling/publish-chain.mjs:24-26`：`DIRM` 与 `ORDER` 逐字包含 `skill-home` 与 `dsh-home-ilife`（顺序：…`skill-home`… → `dsh-life-pack` → …`dsh-home-ilife`…）。
- 兄弟家先例：`docs/skills/skill-memo-ilife/wizard-publish-6pk-020.sh` 头注逐字列「`skill-memo-ilife 0.2.0 → dsh-memo-ilife 0.2.0`／`skill-calorie 0.2.3 → dsh-calorie 0.2.4`／`skill-schedule 0.2.0 → dsh-schedule-ilife 0.2.0`」——**技能与它的 dsh 插件成对发**。

## 二、判据二：已发布的两份 0.1.0 现在是坏的（实测，非推断）

取证命令（只读，可复跑）：

```powershell
npm view skill-home version dependencies
npm view dsh-home-ilife version dependencies
npm pack skill-home@0.1.0 --pack-destination $env:TEMP\t198-pkgs
npm pack dsh-home-ilife@0.1.0 --pack-destination $env:TEMP\t198-pkgs
tar -tzf $env:TEMP\t198-pkgs\skill-home-0.1.0.tgz
```

| 检查 | `skill-home@0.1.0`（npm，2026-09-07） | `dsh-home-ilife@0.1.0`（npm，2026-09-07） |
|---|---|---|
| 已发布 manifest 依赖 | `{"base-link-core":"workspace:^0.1.0"}` | `{"dsh-life-pack":"workspace:*"}` |
| 安装后果 | `EUNSUPPORTEDPROTOCOL`（新装即失败） | 同上 |
| 是否含本图能力 | **无**（`dist/cli/cmd_read.js` 无 `home_manager_html`、无任何 `base-paint` 引用） | **无** |
| 客户端产物 | — | `dist/client.js` = **837 B**、无 `__ModuleLoader__` ⇒ 就是票 10 修好的那个坏形态（首次修复未发版） |
| `SKILL.md` 是否随包 | **tarball 里没有**（当时 `files` 未含它） | — |
| 是否依赖技能 | — | **已发布版根本不依赖 `skill-home`** |

> 结论：即使有人现在 `npm install -g skill-home` 或装插件，拿到的既不是能跑的东西，也不是本图交付的东西。

## 三、判据三：现在也不能「直接发」——门禁与安装态实测都红（本会话亲手跑）

**G1（发布前门禁，只居家线 scope）**

```powershell
node tooling/check-publish.mjs --pre --only base-paint,base-link-core,base-combos,skill-home,dsh-home-ilife,dsh-life-pack
```

`exit=1`，逐字两条红：

- `FAIL: dsh-home-ilife 的 dsh-life-pack 范围「^0.1.0」与工作区版本 0.2.0 的 major.minor 不一致`
- `FAIL: dsh-home-ilife 的 skill-home 必须精确 pin 工作区版本（#129），现为「^0.1.0」`

（`skill-home` 自身「无 `workspace:` 外泄」是 OK——仓内依赖已写成 `base-link-core ^0.3.0`／`base-paint ^0.3.0`。）

**G2（打包清单门）**：`node tooling/check-publish.mjs --tarball --only skill-home,dsh-home-ilife` → **PASS**，四行 OK：`skill-home` 含 `dist/cli/cmd_read.js`／含 `templates/`；`dsh-home-ilife` 含 `dist/index.js`／含 `cordis.patch.yml`。

**G3（模拟用户安装态）**：`node tooling/check-publish.mjs --fresh-tmp --only skill-home,dsh-home-ilife` → **红**：

```
FAIL: dsh-home-ilife 契约键 home.help.lookup exit1
FAIL: G3 安装态断言红
```

手工复现拿到真因（打真包 → 仓外临时目录 `npm install` → 跑契约键）：

```
$ npm install --no-audit --no-fund <skill-home-0.1.0.tgz> <dsh-home-ilife-0.1.0.tgz>   # added 5 packages，exit 0
$ $env:SKILLS_DB_PATH = <空目录>
$ node node_modules\skill-home\dist\cli\cmd_read.js home.help.lookup --params '{}'      # exit=1
SyntaxError: The requested module 'base-paint/save-html' does not provide an export named 'helpReuseWindowOf'
```

> 真因＝**共享层版本偏斜**：安装态装的是 registry 的 `base-paint@0.3.1`，它的 `saveHtml.js` **只有 `saveHtmlFile` 一个导出**（`npm pack base-paint@0.3.1` 解包实测：`helpReuseWindowOf`／`reuseWindowOfHours` 均不存在）；而工作区共享层在 `6bc21a9`（`fix(help): #245 …窗口换算工厂…`）加了 `helpReuseWindowOf`，**六个技能全在 import 它**（`skill-calorie`／`skill-bill`／`skill-chef`／`skill-home`／`skill-memo-ilife`／`skill-schedule`）。

## 四、所以要发的是一条**链**，不是两个包

- 仓内发布链顺序（`tooling/publish-chain.mjs:8` 逐字）：`base-link-core → base-paint → base-combos/6 skill → dsh-life-pack → 6 单品`。
- 本次最小闭包 = **`base-paint`（先发）→ `skill-home` → `dsh-home-ilife`**。
  - `base-paint`：工作区 0.3.1 与已发布 0.3.1 **同号不同内容**（工作区多了窗口换算那两个导出）⇒ 必须**抬版本**重发（0.3.1 已被占用，同号发不上去）。
  - `base-link-core`：工作区 0.3.1／npm 0.3.0；但 `skill-home` 只用到 `createEnvelope`／`parseEnvelope`／`parseRegistryKey`（＋两个 type），**已发布 0.3.0 就有**（解包核过导出面）⇒ **不是本次阻塞**。
  - `base-combos`：工作区 0.3.1／npm 0.3.0，与居家 HELP 交付无直接依赖 ⇒ 不在本次闭包内。
- 兄弟家踩的是**同一道坎的早一轮**：wizard 头注逐字「`base-paint 0.3.1` **必须最先发**：三个技能都 import 它的 `./help-shell`，而线内 0.3.0 没这个导出」。

## 五、版本落点与发布口径（先例 ＋ 仓内规则）

- **维护者裁定**（`wizard-publish-6pk-020.sh` 头注逐字）：「维护者裁定：版本一律在 0.2.x 基础上加，**不升 0.3.x**；且『dsh 的插件必须保证都装得到最新的技能』——靠**精确 pin** 实现（仓见 `tooling/check-publish.mjs:86-103` ＋ `plugin-calorie/test/skill-pin.test.mjs`；caret ＋ 存量 lockfile 会让旧 skill 残留，exact 才强制重解）」。
- `pnpm changeset:status` 当前输出：待消费 changeset 把 **`skill-home` 与 `dsh-home-ilife` 都列在 minor 档** ⇒ 走 `changeset version` 两件都是 `0.1.0 → 0.2.0`；与「备忘录／作息首次 HELP 发布落 0.2.0」的先例一致。
- **发布动作是人扫码**（`wizard-publish-6pk-020.sh` 逐字）：每包一条 `npm publish --registry="$REG" --access public`，各弹一次 2FA 审批（六个包 ＋ 一次登录 ＝ 7 次）；编排方先把版本／依赖范围／`dist` 全部归位、`publish:pre` 跑绿、工作树提交。
- **发后复核**（`verify-after-publish-6pk.ps1` 同形）：`npm view <name> version` 对期望表、插件的技能依赖必须等于期望版本、再来一发 `npx -y -p skill-home@<新版> home-cmd-read home.help.lookup` 冒烟。
- registry：本机 `npm config get registry` = `https://registry.npmmirror.com`（发布与复核都走这个源）。

## 六、CI 为什么没拦住

`.github/workflows/ci.yml` 的 `publish-gates` 跑的是**卡路里样板 scope**（仓根 `package.json` 逐字）：

```
publish:pre     = node tooling/check-publish.mjs --pre     --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint
publish:tarball = node tooling/check-publish.mjs --tarball --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint
publish:fresh   = node tooling/check-publish.mjs --fresh-tmp --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint
```

⇒ 居家线的 G1／G3 两道红**不在 CI 视野里**（要等复制到全量、或手动按 scope 跑才会现形）。这也是本报告 §三两条红至今没被发现的机制原因。

## 七、待维护者拍板（我不替你定）

1. **版本落点**：居家两件是否就按先例与 changeset 走 **0.2.0**（`dsh-home-ilife` 同步精确 pin `skill-home: "0.2.0"`）？
2. **`base-paint` 抬到哪**：它是 0.3.x 线（工作区 0.3.1 未发的新导出），抬 **0.3.2** 还是 0.4.0？「不升 0.3.x」那条裁定说的是技能线（0.2.x），共享层这边需你确认边界。
3. **谁执行扫码 ＋ 要不要我先做前置**：我可以照 `wizard-publish-6pk-020.sh` 同形写一份居家线 wizard（含前置：版本归位、插件依赖改精确 pin、`dsh-life-pack` 区间改 `^0.2.0`、`dist` 强制重建、`publish:pre` 跑绿），你只用扫码。

## 八、我没做／没证实的（如实）

- **没跑真发布**（没有 2FA，也不该由我做）。
- 只跑了 home scope 的 G1／G2／G3，**没跑全量**；`base-combos`／`ilife-skills`／`base-link-core` 与本次发布闭包的关系只核到「`skill-home` 用到的符号在已发布 0.3.0 里都有」这一层。
- `.changeset/` 里还有历史遗留 changeset（如 `skill-landing-50-home.md` 写的是 patch），**实际落点以 `changeset version` 实跑为准**；本报告只报 `changeset status` 的当前输出。
- 未核实 npmmirror 与官方 registry 之间的可见性差异（只报本机 registry 配置与 `npm view` 结果）。
- 未逐条核「其余五家的插件是否也需要同批重发」（超出本问题范围；`dsh-life-pack ^0.1.0` 不一致那条在 bill／chef／home 三家都在）。
