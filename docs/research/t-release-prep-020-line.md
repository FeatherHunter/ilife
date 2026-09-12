# 发版前置：0.2.0 线（7 包）——版本归位 ＋ 门禁 ＋ 人工发布脚本

- 时刻：2026-09-12 23:0x（本地）
- 触发（用户原话）：「**所有 0.1.0 的都提升至 0.2.0 并且发布**」
- 状态：**前置已全部做完并通过门禁；真发布卡在登录态**（本机 `npm whoami` 对官方源回 `E401`）⇒ 需要维护者跑登录 ＋ 逐包 2FA 扫码

## 一、发布面（7 包，顺序不可换）

| 序 | 包 | 仓内 | 发布前 registry | 发布后应为 |
|---|---|---|---|---|
| 1 | `base-paint` | 0.3.1 → **0.3.2** | 0.3.1 | 0.3.2 |
| — | `base-link-core` | 0.3.1 → **0.3.2**（随 lockstep 抬，**不发布**） | 0.3.0 | 0.3.0（不动） |
| — | `base-combos` | 0.3.1 → **0.3.2**（随 lockstep 抬，**不发布**） | 0.3.0 | 0.3.0（不动） |
| 2 | `skill-chef` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 3 | `skill-bill` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 4 | `skill-home` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 5 | `dsh-chef` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 6 | `dsh-bill-ilife` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 7 | `dsh-home-ilife` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |

**为什么 base-* 三包里只发 base-paint**：`packages/base-render/test/base-version-lockstep.test.mjs` 立规「base-* 三包 version **逐字相等**」（版本偏斜即红）⇒ 抬 base-paint 必须把 `base-link-core`／`base-combos` 一起抬到 0.3.2，否则仓内当场红。但**只有 base-paint 需要真的发**：技能们的 `base-link-core: ^0.3.0` 解析到 registry 的 0.3.0（`skill-home` 用到的 `createEnvelope`／`parseEnvelope`／`parseRegistryKey` 它都有），`base-combos` 不是技能运行时依赖。这与上一批发版窗口的做法一致（那次仓内三包同为 0.3.1、registry 只落了 base-paint 0.3.1）。

**没动的**（都不是 0.1.0）：`skill-calorie` 0.2.3／`dsh-calorie` 0.2.4／`skill-memo-ilife` 0.2.0／`dsh-memo-ilife` 0.2.0／`skill-schedule` 0.2.0／`dsh-schedule-ilife` 0.2.0／`dsh-life-pack` 0.2.0。
**已删**：`packages/ilife-skills`（维护者 2026-09-12 裁定「整包删除」；连同只为它存在的快照机制一起清干净——清单见 §五）。

## 二、为什么 `base-paint` 必须一起发（0.3.2）

三个技能（chef／bill／home）的出口都 `import { helpReuseWindowOf } from 'base-paint/save-html'`，而 **registry 上的 0.3.1 没有这个导出**。安装态实测逐字（打真包 → 仓外临时目录 `npm install` → 跑契约键）：

```
SyntaxError: The requested module 'base-paint/save-html' does not provide an export named 'helpReuseWindowOf'
```

⇒ 若不先发 base-paint 0.3.2，三个技能发出去**装上就崩**。

**正向复现（证明「先发 base-paint 就通」）**：把本地 7 个 tarball（`base-paint-0.3.2` ＋ 三个技能 0.2.0 ＋ 三个插件 0.2.0）一起装进仓外空目录 → 装到的 `base-paint` 版本 **0.3.2** → 三个契约键逐条真跑 **全 exit 0**：

| 技能 | 契约键 | exit |
|---|---|---|
| `skill-chef` | `chef.help.lookup` | 0 |
| `skill-bill` | `bill.help.lookup` | 0 |
| `skill-home` | `home.help.lookup` | 0（并落出 HELP HTML 文件） |

## 三、门禁与测试（本会话实测）

- **G1 `--pre`**：**PASS**。15 条 OK，含三条新规矩：`dsh-chef 精确 pin skill-chef 0.2.0`、`dsh-bill-ilife 精确 pin skill-bill 0.2.0`、`dsh-home-ilife 精确 pin skill-home 0.2.0`（#129），以及三个插件的 `dsh-life-pack ^0.2.0` 同版本线。
- **G2 `--tarball`**：**PASS**。三个技能各含 `dist/cli/cmd_read.js` ＋ `templates/`；三个插件各含 `dist/index.js` ＋ `cordis.patch.yml`。
- **G3 `--fresh-tmp`**：**仍红**，且**唯一原因是 registry 上的 base-paint 还是 0.3.1**——门禁的 fresh-tmp 只装 `ALL13`（`COMBOS ＋ 6 技能 ＋ 6 插件`），**不含** `PINNED` 里的 `base-paint`，故它只能从 registry 解析。§二 的正向复现已经证明「base-paint 0.3.2 一落 registry，这条就通」。**发完后必须重跑 G3 收口**。
- 包级测试：`skill-chef` 52/52、`skill-bill` 57/57、`skill-home` 26/26；`dsh-chef` 7/7、`dsh-bill-ilife` 7/7、`dsh-home-ilife` 16/16。
- 仓门：`check-boundaries` PASS、`write-snapshot --check` OK（`0.1.0@ba40de0c10101986`，与本次无关且未被触碰）、根 `scaffold.test.mjs` 0 fail。

### 顺带修掉的「发版即红」与潜伏 bug（本会话实测触发、逐条修好）

1. **三个插件包内烟囱测试**（`packages/plugin-{chef,bill-ilife,home-ilife}/test/smoke.test.mjs`）里 `#50 安装布局` 用例还钉着旧形态 `assert.match(..., /^\^0\.1\./)`——发版一改范围就红。已按 **memo／schedule 两家现行形态**改成：总管＝工作区同版本线 caret、技能＝**精确 pin**，且两个期望值**现取自工作区 `package.json`**。
2. **`test/plugin-p10-boundaries.test.mjs` 与 `test/plugin-p10-install.test.mjs`**（根级，不在包内，所以先前只跑包测试没照到）同样硬编码 `^0.1.0` 与一张按窗口手写的例外表（`FORMAL48`／`WINDOW123`／`LIFEPACK123`）。已统一成「现取工作区版本」的版本无关口径（#123）——那张例外表随之删掉。
3. **`packages/base-render/test/base-version-lockstep.test.mjs`**：抬 base-paint 触发「三包版本必须逐字相等」⇒ 按规矩把 `base-link-core`／`base-combos` 一起抬到 0.3.2（见 §一）。
4. **`tooling/check-publish.mjs` 全量分支（不带 `--only`）此前根本跑不起来**——两处潜伏毛病（#48 起没人走过）：①把 `readdirSync(..., {withFileTypes:true})` 的 `Dirent` 当路径传给 `join` ⇒ `ERR_INVALID_ARG_TYPE`；②`packages/` 下有**改名后留下的构建残留目录**（`plugin-bill`／`plugin-home`／`plugin-memo`／`plugin-schedule`／`skill-memo`：无 `package.json`、git 未跟踪）⇒ 读不到 `package.json`。已修成「跳过没有 `package.json` 的目录 ＋ 取 `d.name`」。修后**全量 G1 首次通过**（六技能六插件逐条 OK），`publish:tarball` 全量也通过。
   - 附带观察（未处置，供后续）：那 5 个残留目录是历史改名的产物，`git` 不跟踪；要不要删由维护者定（删了不影响任何门——门现在会跳过它们）。


## 四、怎么发布（人手扫码，我停在发布之前）

```powershell
pwsh -NoProfile -File docs/research/publish-020-line.ps1
```

脚本自己会：①逐包复核「版本＝期望、无 `workspace:`、`dist` 在位」②核登录态（未登录就停下并给 `npm login` 命令，**不写 registry**）③按上表顺序逐包 `npm publish --registry=https://registry.npmjs.org --access public`（每包一次 2FA；`E409 版本已存在` 当跳过，`EOTP` 提示重跑）④回读 registry 版本。

> 本机 `npm config get registry` 是 `https://registry.npmmirror.com`（镜像），**发布必须显式指向官方源**（脚本里的 `$REG`），与备忘录那份向导（`wizard-publish-6pk-020.sh` 的 `REG="https://registry.npmjs.org"`）同一口径。

发后复核（七组断言：registry 版本／插件精确 pin／base-paint 两个子路径真 import／tarball 清单／插件从 registry 真装并带出 pin 的那版技能／`npx` 第三方真跑三个 HELP 出件／临时根清理）：

```powershell
pwsh -NoProfile -File docs/research/verify-after-publish-020-line.ps1
```

## 五、`ilife-skills`：已整包删除（维护者 2026-09-12 裁定）

**裁定**：把 `packages/ilife-skills` 这个目录**完全删除**。它是**锚包**不是技能——包内只有一个 `skill.snapshot.json`（分发版本 ＋ combos/present 的 sha 锚），**全仓没有任何运行时消费方**（唯一四处引用是 `check-boundaries.mjs` 的禁引正则、`check-publish.mjs`／`publish-chain.mjs` 的包表、`write-snapshot.mjs` 的读写、CI 的 `snapshot-guard`）。

**为什么「装它就自动装 6 个技能」的整包方案不值得做**（第一性原理三条）：①**技能发现不走 npm**——公共安装器（`npx skills@latest add`）扫的是仓库／agent 技能目录里的 `SKILL.md`，DSH 侧靠 profile 的 `dsh.profile.bundles` 登记，装一个 npm 包**两条路都不触发**；②因此整包只是把 6 个**运行时二进制**再装一遍，而这两条路今天都已能用；③代价是**长期的**：整包一旦挂上 6 个技能的精确 pin，**每次任一技能发版都要连它一起发**（否则 pin 过期），还要给它新定门禁判据、在发布链里插到最末——把一个被动锚点变成跟着每个发版窗口走的活跃节点。

**连带清掉的（只服务于它，留着就是死链）**：

| 件 | 处置 |
|---|---|
| `packages/ilife-skills/`（`package.json` ＋ `skill.snapshot.json`） | 删 |
| `tooling/write-snapshot.mjs` | 删（它唯一的活就是写那个快照） |
| 仓根 `package.json` 的 `snapshot`／`snapshot:check` 两条脚本 | 删 |
| `test/scaffold.test.mjs` 的「快照 == 实际拉取版」用例（Q92-①） | 删（同文件「boundaries」那条保留） |
| `.github/workflows/ci.yml`：build-test 里的 `pnpm snapshot:check` 步骤 ＋ 整个 `snapshot-guard` job（Q92-②） | 删 |
| `tooling/check-publish.mjs` 的 `PINNED`／`DIRM` 两处条目 | 删 |
| `tooling/publish-chain.mjs` 的 `DIRM` 条目（`ORDER` 本来就没有它） | 删 |
| `tooling/check-boundaries.mjs:23` 禁引正则里的 `ilife-skills` | 删（包没了，留着是过期名单） |
| `.changeset/p5-scaffold.md` 的 `"ilife-skills": minor` | 删（changesets 遇到不存在的包会报错；正文留一句备注） |
| `pnpm-lock.yaml` | `pnpm install` 重生成 |

**丢掉的是什么（照实）**：①「构建忘写快照」与「手改快照」这两道**只围着这个文件转**的 CI 校验（Q92-①②）随之作废；②`resolvedVersion` 这个分发版本锚没了（无消费方，无实际损失）；③**combos.yaml ↔ present.ts 的内容一致性不受影响**——那条锁在 `test/combos-p8.test.mjs`（它 import `gen-present.mjs` 的 `renderPresent` 逐条对账），本次删除后实测仍绿。

**registry 侧**：已发布的 `ilife-skills@0.1.0`（2026-09-07）**留在 npm 上**——删目录不等于下架，且超过 72 小时的版本一般已不可 unpublish。要收尾可选 `npm deprecate ilife-skills@0.1.0 "锚包已废弃（2026-09-12 整包删除）"`，要不要做由维护者定。

## 六、其余待拍板（不在本次动作内）

1. **CI 的 `publish-gates` 仍绑卡路里 scope**（仓根三条 `publish:*` 脚本都是 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`）⇒ 这次居家／大厨／记账三道红 CI 看不见。要不要在本批发完后把 `--only` 扩到全量／去掉，另说。
2. **`.changeset/` 里那批待消费项**：`changeset status` 现在把几乎**所有**包都列在 minor 档；若谁跑了 `changeset version`，会把 `skill-calorie` 0.2.3 等也抬成 0.3.0。本次**刻意没走 changesets**，直接改 `package.json`（照发版窗口「版本已归位」的先例）。这批遗留 changeset 怎么清，待你定。

## 七、未做／未证实（照实）

- **真发布没做**：本机对官方源未登录（`E401`），且 2FA 必须本人。脚本已停在写 registry 之前。
- **`base-link-core` 没抬**：工作区 0.3.1／registry 0.3.0，但 `skill-home` 用到的符号（`createEnvelope`／`parseEnvelope`／`parseRegistryKey`）**已发布 0.3.0 就有**（解包核过导出面）⇒ 不在本次闭包。
- **G3 收口未做**：它依赖 `base-paint 0.3.2` 真的落到 registry（见 §三），发完必须重跑。
- 只跑了 scoped 门禁与涉及包的测试，**没跑根 `pnpm test` 全量**（其它线的既有红与本批无关，见别处留档）。
