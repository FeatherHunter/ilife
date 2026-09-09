# #121 复制按钮 `copied` 态：运行时加类（H-16 JS 侧）——实施与证据

> 票面：<https://github.com/FeatherHunter/ilife/issues/121>（地图 #63 子票）
> 基线口径：`.scratch/t88/baseline/BASELINE.md`（编排者冻结）＋ `docs/research/t88-baseline/test-failset.txt`
> 证据可复跑脚本：`docs/research/t121-browser-evidence.mjs`（CDP）／`packages/base-render/test/copy-copied-121.test.mjs`（无浏览器）
> 对账源（受 git 跟踪）：`docs/research/t121-gate-runs.log`

## 0. 结论

复制**成功**后，被点击的复制按钮获得规格逐字类名 `copied`（computed 背景 = 成功色 `--ok` = `rgb(52, 199, 89)`），**435ms 后回落**；复制**失败**时按钮**不变绿**且出 danger toast（显式失败）。JS 侧落点仍是 `buildSharedHelpersJs()`，**冻结签名不变**、挂**既有 `boot()`／既有委派**、**零新增 marker**、**零新契约面**。

## 1. 改法（落点 file:line）

| 面 | 落点 | 做了什么 |
|---|---|---|
| JS 常量 | `packages/base-render/src/controls.ts:528,532` | `HELP_COPY_COPIED_CLASS = 'copied'`（规格逐字、无 `ilife-` 前缀）／`HELP_COPY_COPIED_MS = 450`（H-16 逐字 450ms，与 `style.ts` 的 `.45s` 同源数值）——模块内部常量，**不导出**＝零新契约面 |
| JS 注入 | `controls.ts:656,657` | 产出文本新增 `var COPIED_CLASS = "copied";`／`var COPIED_MS = 450;` |
| JS 传参 | `controls.ts:694,697` | `onClick` 把命中的按钮一并交给 `copy(text, btn)`（**既有委派内**，零新增监听） |
| JS 成功出口 ×3 | `controls.ts:703,706,729` | clipboard promise 回调／clipboard 同步返回／`execCommand` 兜底 `if (done)` 各调 `markCopied(btn)` |
| JS 加类 | `controls.ts:736-740` | `markCopied(btn)`：`addClass(btn, COPIED_CLASS)` ＋ `setTimeout(removeClass, COPIED_MS)`；复用既有 `addClass`／`removeClass`（`className` 字符串口径），**失败分支零调用** |
| CSS 命中面 | `style.ts:795,796` | `.ilife-help-shell-btn.copied`／`.ilife-help-shell-card-copy.copied` → `border-color`／`background: var(--ok)`、`color: var(--card)` |
| CSS 弹簧 | `style.ts:779,782,937,940` | 两个 helpShell 复制按钮基座补 `transition: transform .45s cubic-bezier(.34,1.56,.64,1), background-color .2s ease` ＋ `:active { transform: scale(.96) }`（口径**逐字复用** #75 的 `.ilife-copy-btn`） |
| CSS 无障碍 | `style.ts:1040,1041` | `prefers-reduced-motion: reduce` 下两条过渡与 `:active` 变换归零 |

**为什么必须动 `style.ts`（范围外新增，已获编排者认可）**：HELP 速查台的复制按钮是 `.ilife-help-shell-btn-*`（静态三目标）与 `.ilife-help-shell-card-copy`（helpers 运行时注入），**都不含** `.ilife-copy-btn` → #75 的 `.ilife-copy-btn.copied` **命中不到 HELP 页**，只加类不会变绿。故按票面许可（「新类名若需 CSS 追加，只落 `src/style.ts` 的 helpShell 区」）在 helpShell 区补 `copied` 态；类名仍是既有规格值 `copied`，零新类名、零新 token、不走 skill 侧 `extraCss`。

## 2. 复现（改前：按钮不变绿）

脚本：`node docs/research/t121-browser-evidence.mjs --label before`（**改前 dist**；headless Chrome ＋ CDP `Input.dispatchMouseEvent` 真手势，页面零探针）。

```
A 现场：before={"cls":"ilife-help-shell-card-copy","bg":"rgb(255, 255, 255)","transformTransition":"all / 0s"}
A 现场：@140ms={"cls":"ilife-help-shell-card-copy","bg":"rgb(255, 255, 255)","transformTransition":"all / 0s"}
B 现场：@140ms={"cls":"ilife-help-shell-btn ilife-help-shell-btn-prompt","bg":"rgb(0, 122, 255)"}
C 现场：@140ms={"cls":"ilife-copy-btn ilife-copy-btn-ghost","bg":"rgb(255, 255, 255)"}
RESULT: 12/21 PASS, 9 FAIL label=before
FAILED: A2 点击后按钮获得 `copied` 类 | A3 copied 态 computed 背景 | A6 copied 类存活 | A7 弹簧过渡 | B2 | B3 | C2 | C3（A8 为 CRLF 夹具瑕疵，已修）
```

改前结论：**三个面的按钮点击后类名都不含 `copied`、背景都不是成功色、也无 450ms 弹簧**（A7 实测 `all / 0s`），与票面「运行时不给按钮加 `copied` 类 → 端到端点击后按钮不变绿」逐字一致。

## 3. 改后（CDP 真手势实测）

脚本：`node docs/research/t121-browser-evidence.mjs --label after-restore` → **`RESULT: 21/21 PASS, 0 FAIL`**（exit 0）。
时间线为**驱动侧**采样（CDP `Runtime.evaluate` 每 ~30ms 读一次，页面零探针），`C` = 类名含 `copied`：

```
A 卡级复制按钮（.ilife-help-shell-card-copy，helpers 注入 8 个）
A 时间线：4:-/rgb(255,255,255) 31:C/rgb(255,255,255) 93:C/rgb(172,232,187) 154:C/rgb(78,206,110)
          217:C/rgb(53,199,90) 248:C/rgb(52,199,89) … 466:C/rgb(52,199,89) 497:-/rgb(66,203,101) …
          932:-/rgb(255,255,255)
A 摘要：firstOn=31 lastOn=466 copiedMs=435 settledBg=rgb(52, 199, 89) spring=transform, background-color / 0.45s, 0.2s
A 剪贴板回读="请你执行第 0 项：帮我复盘今天的饮食。\r\n\r\n天数:7"  toasts=1

B Sheet prompt 按钮：firstOn=47 lastOn=480 copiedMs=433 settledBg=rgb(52, 199, 89) → 回落 rgb(0, 122, 255)
C 通用 .ilife-copy-btn：firstOn=31 lastOn=433 copiedMs=402 settledBg=rgb(52, 199, 89) → 回落 rgb(255, 255, 255)
D 失败路径（通道 1 拒 ＋ execCommand 假）：firstOn=null（**从未**出现 copied）
  toast={"title":"复制失败","danger":true,"count":1}
```

逐条对应票面验收：

| 票面验收 | 实测 |
|---|---|
| 点击后按钮**获得 `copied` 类** | A2／B2／C2 PASS（三个面） |
| computed 背景 = `--ok` = `rgb(52, 199, 89)` | A3／B3／C3 PASS（过渡结束后采样，避免采到 `.2s` 过渡中间值） |
| **450ms 后回落** | A6 `copiedMs=435`（450ms ± 采样粒度）、A4／B4／C4 类名已移除、A5 背景回到常态 |
| 450ms 弹簧 | A7 `transition-duration 0.45s`（改前 `all / 0s`） |
| 双反馈的另一通道（toast） | A8 真剪贴板 `readText()` 逐字 = 该卡 `<pre>` 原文；A9 单次点击恰 1 枚 toast |

## 4. 无浏览器时显式失败（不得静默变绿）

三重保证：

1. **复制失败路径零加类**：CDP D 面（clipboard reject ＋ `execCommand` 假）实测 `firstOn=null`（31 个采样点全程无 `copied`）＋ `danger` toast「复制失败」；单测 `B3` 同口径断言（`hasCopied === false` 且 toast 含 `danger`）。
2. **实证脚本缺浏览器即 exit 2**：`docs/research/t121-browser-evidence.mjs:80-84`——找不到 Chrome／Edge 直接 `die(2, …)`，绝不静默跳过（本机实测有浏览器，故走完整 21 断言）。
3. **单测不依赖浏览器**：`test/copy-copied-121.test.mjs` 自带最小 DOM 桩跑**真实产出文本**（无 headless 也能判成功／兜底／失败三条路径）。

## 5. 纯度口径复跑（#88 冻结面）

- 产出文本实测：`classList=false`；`var COPIED_CLASS = "copied";`；类名增删走 `addClass(btn, COPIED_CLASS)`／`removeClass(btn, COPIED_CLASS)`（`className` 字符串）。
- 守门测试（持锁）：`node --test packages/base-render/test/contract-signatures.test.mjs packages/base-render/test/help-center-js-88.test.mjs` → **54/54 pass，fail 0，exit 0**（含 `S4-1 纯度与冻结面：单 marker／单 boot／零隐式全局／零 classList／零 node:`）。
- 全 `packages/base-render` 套件 → **475/475 pass，fail 0，exit 0**（含 T27 `copy-btn copied 态变绿`、T28 `helpers 不得操作 classList`、T23、S4-1…S4-7）。
- **并发窗口内的一条瞬态红（如实登记）**：实现中途我在**产出 JS 的注释**里写了 `classList` 这个词（注释也是产出文本），命中 `helpers.includes('classList')` → `S4-1`／`T28` 共 4 条红。**我自己写的 S1 用例先抓到同一条红**，当场把注释改写为「不用 DOM 的类名列表 API」；**修复发生在 commit `d0e0546` 之前**，入仓状态干净。编排者据 #107 红队观察发来的告警已据此作废（回执见票面评论）。

## 6. 变异自证（3 处，全部 **src 级**）

统一口径：**单锁内**「变异 → `pnpm build` → 目标测试红 → 立即还原 → 重建 → 绿」，变异前后 `sha256` 逐一比对。
基线 sha256：`controls.ts 82575C2102624AAC13789D9D87797D8919553DB966E2BE73C701D0BE7BD67DCF`、`style.ts 04182D2D46410B185983558072C87BE1E08838596F18C5C1A30661BD54BEEC5F`（还原后逐一相等）。

| 变异 | 内容 | 单测（`copy-copied-121`） | CDP 实证 | 还原后 |
|---|---|---|---|---|
| **M1** | 摘掉三处 `markCopied(btn)` 调用（≡ 改前行为） | **红 5/10**（S4／B1／B2／B4／B5） | **红 7/21**（A2 A3 A6 B2 B3 C2 C3） | sha 相等 → 10/10 绿；CDP 21/21 |
| **M2** | `style.ts` helpShell `.copied` 背景 `var(--ok)` → `var(--blue)` | **红 1/10**（S3 背景必须取 `--ok`） | **红 2/21**（A3 B3，类名仍加＝证明 CSS 断言独立有鉴别力） | sha 相等 → 10/10 绿 |
| **M3** | `HELP_COPY_COPIED_MS 450` → `0` | **红 5/10**（S2 跨文件同源／B1／B2／B4／B5） | **红 7/21**（含 A6 存活时长） | sha 相等 → 10/10 绿；CDP 21/21 |

M1 同时充当**与最终 harness 同口径的「改前」对照**（页零探针、驱动侧时间线），与 §2 的改前记录互为印证。

## 7. 门禁实测（逐条 exit）

四门（持锁包装器 `node tooling/run-locked.mjs --ticket 121 -- …`；逐条声明见 §7.1，下表只给结论）：

| 门 | exit | 备注 |
|---|---|---|
| `pnpm build` | **0** | `tsc -b` 无诊断 |
| `pnpm boundaries` | **0** | 零越界 |
| `pnpm snapshot:check` | **0** | 快照未过期 |
| `pnpm publish:pre` | **0** | 四包预检通过 |

**canonical `pnpm test`（1 轮，持锁）**：runId=`301a040c-d8e7-4f76-8b99-b012b8de233b`（逐条声明见 §7.1）。

- 实测：`tests 1114 / pass 1089 / fail 25 / exit 1`（既有红，非本票引入）。
- 失败集 delta：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t121/canonical-test.log` → **`base=34 after=29 新增=0 消失=5`，exit 0**。
- 25 条失败**全部**在 `plugin-*`／`skill-*` 烟囱与 #48／#50／#81／#93 envelope 面（`dsh-*-ilife 烟囱`、`client：…`、`#50 envelope 契约…`），**`packages/base-render` 零失败**；本票新增用例（`copy-copied-121`）全绿。消失 5 条属 `docs/research/t88-delta-flake-ruling.md` §2 的**抖动**类（既有白名单条目本次通过），非本票影响。
- **并发上下文**：canonical 运行窗口内同仓在飞票 ≥4（#99 SKILL.md 文案、#106 `helpCenter.ts`、#107 收尾、#124 事故票）；`packages/skill-calorie/SKILL.md` 在我运行期间**被其他 session 改写**（frontmatter `description` 换成长唤醒词串，`git diff --numstat` = `1 1`，**非零填充**、非 `Bin … -> …`，故未按 #124 停报）；本次 canonical 的 25 条红与 `SKILL.md` 内容无关（均为 plugin/envelope 面）。
- `git status --short` 自检（跑完测试）：本票路径**零残留**（`controls.ts`／`style.ts` 已提交且 `git diff` 空；新测试与证据已入仓）；工作区仅余**他人** WIP（`packages/skill-calorie/SKILL.md`、`.changeset/t82-*`、`docs/research/t82-*`、`.tmp-*` 目录），**未被我 `git add`／提交**。

### 7.1 对账

本票全部 28 条 `RUN` 条目逐条声明如下（含**自证红轮**与**两次尝试失败**——它们**不是**门禁证据，但必须对账以免「无人声明的 RUN」）。因存在 exit≠0 的条目，使用 `--allow-nonzero`：

**对账窗口（右端封口于最后一次 `git commit` 之前）**：`--since 2026-09-09T14:30:00Z --until 2026-09-09T14:42:50Z`；实测 `matched=28/28 scoped=28 undeclared=0`，`gate-audit: PASS`（exit 0）。复核命令：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t121-copied-runtime.md --log docs/research/t121-gate-runs.log --ticket 121 --since 2026-09-09T14:30:00Z --until 2026-09-09T14:42:50Z --allow-nonzero
```

> 窗口右端之后本票仅剩一次 `git commit`（本证据 ＋ 变更集入仓），按 §2.4 只对窗口内条目做一对一，不属未声明项。

GATE-RELAX flag=--allow-nonzero reason=证据同时登记变异自证的三轮红（M1/M2/M3）、两次写测试时的红、一次 `git commit --only` 对未跟踪文件失败、一次包装器内 `pwsh` 不在子进程 PATH 导致的失败；这些条目按 §2.4.2④ **不得**充作门禁证据，此处仅作**逐条对账**，门禁结论只取上表 exit=0 的条目。

```
# 门禁证据（exit=0）
GATE-RUN runId=ddbcfbe5-f261-495b-b314-885b42dead2e cmd=pnpm build
GATE-RUN runId=491d8c46-ad89-4a4b-ba62-54d77cc703fb cmd=pnpm boundaries
GATE-RUN runId=0680ec17-a135-40dc-a9aa-a90f96196001 cmd=pnpm snapshot:check
GATE-RUN runId=0eb70746-28ba-4928-9002-23c739f9dcce cmd=pnpm publish:pre
GATE-RUN runId=301a040c-d8e7-4f76-8b99-b012b8de233b cmd=pnpm test
GATE-RUN runId=aafd82d0-a922-4043-86ec-0c13403c7813 cmd=node --test packages/base-render/test/*.test.mjs
GATE-RUN runId=e30962b2-5568-4229-a454-274319f282a8 cmd=node --test packages/base-render/test/contract-signatures.test.mjs packages/base-render/test/help-center-js-88.test.mjs
GATE-RUN runId=862cbd8c-e2c9-4184-aae4-ad790d87f103 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=8bba7584-e4f7-4e4e-9a57-2f089e49c5f8 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
# 构建轮（exit=0）
GATE-RUN runId=fda4087c-4f9c-4562-8285-d39e59c233d6 cmd=pnpm build
GATE-RUN runId=6b20c64b-9039-456d-8b65-0932c1f8c936 cmd=pnpm build
GATE-RUN runId=3b3c701e-0760-49ac-9107-45d19414a515 cmd=pnpm build
GATE-RUN runId=1926709d-a98f-4e9e-aaea-c3fbfd9275c3 cmd=pnpm build
GATE-RUN runId=3a14b0ff-11fa-46bd-b4a1-8624a54e438a cmd=pnpm build
GATE-RUN runId=a4e24910-2c7a-4aee-b27f-887e451babe1 cmd=pnpm build
# 写盘（exit=0）
GATE-RUN runId=c289cd58-6903-4608-b749-9ce7961ab77b cmd=git add packages/base-render/test/copy-copied-121.test.mjs docs/research/t121-browser-evidence.mjs
GATE-RUN runId=698baa14-d8f0-4ffc-9d72-921ab44be6bc cmd=git commit --only packages/base-render/src/controls.ts packages/base-render/src/style.ts packages/base-render/test/copy-copied-121.test.mjs docs/research/t121-browser-evidence.mjs -F .scratch/t121/commit-1.txt
# 自证红轮／尝试失败（exit≠0；非门禁证据，仅对账）
GATE-RUN runId=f2f57024-d624-47f7-a502-1f65d517d3dc cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=0252b5c6-d7d1-43b0-b2b9-7c380b81a3ab cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=c31a8006-7aa2-4cd6-bb20-d945bffca061 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=fd24c895-4d23-4709-9fb2-1adac7505439 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=b5049d25-3283-47d5-a3db-3575b28bab58 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=9801c073-0633-4f6b-9cdf-844b5394e8b7 cmd=git commit --only packages/base-render/src/controls.ts packages/base-render/src/style.ts packages/base-render/test/copy-copied-121.test.mjs docs/research/t121-browser-evidence.mjs -F .scratch/t121/commit-1.txt
GATE-RUN runId=663663f4-4e57-440c-b031-a1fbe10ca334 cmd=pwsh -NoProfile -Command "git add packages/base-render/test/copy-copied-121.test.mjs docs/research/t121-browser-evidence.mjs; git diff --cached --name-only; git commit --only packages/base-render/src/controls.ts packages/base-render/src/style.ts packages/base-render/test/copy-copied-121.test.mjs docs/research/t121-browser-evidence.mjs -F .scratch/t121/commit-1.txt"
GATE-RUN runId=d8cf36e7-aa9b-42fe-a452-79bc46f366a8 cmd=pwsh -Command "pnpm build"
GATE-RUN runId=1c7222ff-af80-4e20-8533-2e147be64739 cmd=pwsh -Command "pnpm boundaries"
GATE-RUN runId=97c51bf3-e297-4332-9dad-30230f54b441 cmd=pwsh -Command "pnpm snapshot:check"
GATE-RUN runId=fbc38eee-5469-4914-b845-4ea4cdad1f31 cmd=pwsh -Command "pnpm publish:pre"
```

**两次尝试失败的根因（记账）**：包装器子进程的 PATH 里没有 `pwsh`（实测 `'pwsh' is not recognized`），故「四门」首次尝试全部 exit 1；随后改用**单条 `pnpm <script>`** 直接交给包装器（GATE-RUN 上表 4 条 exit 0）。这不是门禁红，是**调用方式错误**，已如实登记。

## 8. 偏离记账

1. **`style.ts` helpShell 区新增（范围外但必要）**：见 §1 末段；已获编排者书面认可。
2. **回落时长 = 450ms（而非旧版 2000ms）**：票面与 `docs/visual-spec-help.md:197` 的可断言形式要求「按钮在规格时长后复原」，本票按 H-16 冻结口径取 **450ms**（旧版 F2 `:376` 的 2000ms 属 `OLD-DEVIATION`，与 D-7／D-8 同类处置）。
3. **连点不延长窗口**：第二次点击会重置一个 450ms 计时器，但**前一个计时器到期仍会移除类名**（`addClass` 幂等、`removeClass` 幂等）。单测 `B4` 把该语义**钉死为现状**（不静默改语义），如需「延长窗口」须另开票。
4. **注释与实现一致**：`controls.ts:574-578` 的产出内容契约 docstring 已同步记账本票行为；**注释里不含 `classList` 字面量**（否则会命中纯度扫描，见 §5）。

## 9. 未做／未确证

- 未验证 `copied` 类在**旧版**两个真实 HELP 实例上的对照（`calorie_html/` 两实例处置归 #94）。
- 未验证 `wakeWord`／`params` 两个静态复制按钮的**视觉**差异（本票只验 prompt 按钮；三者共用同一 `.ilife-help-shell-btn.copied` 规则，A／B 两面已覆盖规则命中）。
- 未跑 `pnpm snapshot:html:check` 的写入路径（只跑 check：`OK: 5 技能 HTML 快照 == 实际（185 件产物，changed=0）`；`tooling/**` 非本票所有权）。

## 10. 风险 top3

1. **跨票 CSS 面**：`style.ts` 是 #75／#88／#121 共同产出面，后续票若再动 helpShell 区需重跑本票 CDP 脚本（一条命令即可）。
2. **450ms 与 CSS `.45s` 的同源性靠测试守**：`copy-copied-121` 的 S2 交叉断言 + CDP A6；若有人只改一侧，单测即红（已用 M2／M3 自证鉴别力）。
3. **真实剪贴板权限**：CDP 实证依赖 `Browser.grantPermissions`（`file://`）；若某环境权限被拒，A8 会红而 A2–A7 仍可判——脚本对此有显式 WARN 行，不会静默。
