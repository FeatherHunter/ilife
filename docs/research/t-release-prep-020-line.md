# 发版前置：0.2.0 线（7 包）——版本归位 ＋ 门禁 ＋ 人工发布脚本

- 时刻：2026-09-12 23:0x（本地）
- 触发（用户原话）：「**所有 0.1.0 的都提升至 0.2.0 并且发布**」
- 状态：**前置已全部做完并通过门禁；真发布卡在登录态**（本机 `npm whoami` 对官方源回 `E401`）⇒ 需要维护者跑登录 ＋ 逐包 2FA 扫码

## 一、发布面（7 包，顺序不可换）

| 序 | 包 | 仓内 | 发布前 registry | 发布后应为 |
|---|---|---|---|---|
| 1 | `base-paint` | 0.3.1 → **0.3.2** | 0.3.1 | 0.3.2 |
| 2 | `skill-chef` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 3 | `skill-bill` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 4 | `skill-home` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 5 | `dsh-chef` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 6 | `dsh-bill-ilife` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |
| 7 | `dsh-home-ilife` | 0.1.0 → **0.2.0** | 0.1.0 | 0.2.0 |

**没动的**（都不是 0.1.0）：`skill-calorie` 0.2.3／`dsh-calorie` 0.2.4／`skill-memo-ilife` 0.2.0／`dsh-memo-ilife` 0.2.0／`skill-schedule` 0.2.0／`dsh-schedule-ilife` 0.2.0／`dsh-life-pack` 0.2.0。
**没动的**（锚包，见 §五）：`ilife-skills` 0.1.0。

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

### 顺带修掉的一处「发版即红」（三条老断言）

三个插件的 `test/smoke.test.mjs` 里 `#50 安装布局` 用例还钉着**旧形态**：

```js
assert.match(dep['dsh-life-pack'] ?? '', /^\^0\.1\./);
assert.match(dep['skill-home'] ?? '', /^\^0\.1\./);     // ← 发版一改范围就红
```

这与 `tooling/check-publish.mjs:73-85` 已经废掉同一形态的判据（「发版一改 range，门禁即红，与发版这件事本身冲突」）是同一个毛病。已按 **memo／schedule 两家的现行形态**改成：总管＝工作区同版本线的 caret、技能＝**精确 pin**，且两个期望值都**现取自工作区 `package.json`**（发版不再红）。改后三个插件测试全绿。

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

## 五、待拍板（不在本次动作内）

1. **`ilife-skills` 抬不抬**：它是 0.1.0，但属「锚包」——sha 锚 = `它的 version ＋ combos.yaml ＋ present.ts`，一抬版本就必须**同批重写快照**（`pnpm snapshot`），且 CI 的 `snapshot-guard` 盯着这个文件。要不要在这批发版窗口里抬到 0.2.0，请一句话。
2. **`ilife-skills` 改造成「整包」**（用户问的那条）：方案与代价见对话正文，需要你点头才动。
3. **CI 的 `publish-gates` 仍绑卡路里 scope**（仓根三条 `publish:*` 脚本都是 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`）⇒ 这次居家／大厨／记账三道红 CI 看不见。要不要在本批发完后把 `--only` 扩到全量／去掉，另说。
4. **`.changeset/` 里那批待消费项**：`changeset status` 现在把几乎**所有**包都列在 minor 档；若谁跑了 `changeset version`，会把 `skill-calorie` 0.2.3 等也抬成 0.3.0。本次**刻意没走 changesets**，直接改 `package.json`（照发版窗口「版本已归位」的先例）。这批遗留 changeset 怎么清，待你定。

## 六、未做／未证实（照实）

- **真发布没做**：本机对官方源未登录（`E401`），且 2FA 必须本人。脚本已停在写 registry 之前。
- **`base-link-core` 没抬**：工作区 0.3.1／registry 0.3.0，但 `skill-home` 用到的符号（`createEnvelope`／`parseEnvelope`／`parseRegistryKey`）**已发布 0.3.0 就有**（解包核过导出面）⇒ 不在本次闭包。
- **G3 收口未做**：它依赖 `base-paint 0.3.2` 真的落到 registry（见 §三），发完必须重跑。
- 只跑了 scoped 门禁与涉及包的测试，**没跑根 `pnpm test` 全量**（其它线的既有红与本批无关，见别处留档）。
