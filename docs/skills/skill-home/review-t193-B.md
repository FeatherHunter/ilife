# #193 实施产物对抗式复审（B 席：代码质量与结构纪律）

- **日期**：2026-09-12（只读复审会话）
- **对象**：`docs/skills/skill-home/t193-install-report.md`（自评「过」）及其 11 个改动件
- **方法**：定点读 ＋ 只读复跑（`node --test` 两套、`git status/diff`、`Test-Path`／`Get-Process`）。未改任何文件、未装机、未 `git add`／`commit`、未重启或杀进程。
- **裁决**：**整改后通过**。总分 **77 / 100**（A 25／B 25／C 13／D 14）。

---

## 1 已独立复现为真的部分（先立信）

| 报告断言 | 我的复核 |
|---|---|
| `dist/client.js` 3541 B、首行 loader 工厂包 | 实测 3541 B、首行 `window.__ModuleLoader__.load({` ✅ |
| `test/client-bundle-48.test.mjs` 21/0 | 复跑 21 pass／0 fail ✅ |
| `skills-provider.test.mjs` 7/7 | 复跑 7 pass／0 fail ✅ |
| `SKILL.md` 12979 B、无 BOM、LF 只有 | `12979`、首三字节 `45,45,45`、CRLF 0 ✅ |
| profile 装机（Junction＋两处配置＋备份） | Junction→`D:\ilife\packages\plugin-home-ilife`；`package.json:10/41/42`、`pnpm-lock.yaml:29-31`、两个 `.bak-t193-*` 全在位 ✅ |
| 「重启才生效」 | `pid 7404`＝`DSH Desktop` 起于 `17:19:01`，占 `43120` ✅ |
| `build-help.mjs` 按标记切片、frontmatter 原样保留 | 代码逐字如此 ✅（报告引 `:26-28`，实际 `:25-29`，无实质偏差） |

**「嵌套 YAML 子块 ⇒ 提供方返 null」这句是真的**：`skill-provider.ts:57-59` 对 frontmatter 每行只认 `^([A-Za-z0-9_-]+):`，缩进行一律 `return null`（`:59`）；`loadSkill` 返 null ⇒ `listSkills` 返 `[]`（`:93`）⇒ 宿主看不见。老家那份首行确有 `description: >`（折叠块）＋`metadata:` 子块，两个都会命中这条。

---

## 2 照抄变形逐条（bill → home）

`git diff --no-index` 逐段对照结果：**功能行零差异，无抄错、无抄漏**。

| 行 | 变形 | 判定 |
|---|---|---|
| `src/skill-provider.ts:1,:8,:12,:33` | 头注释／包名注释改 home | 必要适配 |
| 同上 `:22` `:25` | `PROVIDER_NAME='dsh-home-ilife'`／`SKILL_NAME='skill-home'` | 必要适配 |
| 同上 `:49` | 新增两行「只认扁平」注释 | 纯注释 |
| `src/dsh-ctx.ts:1-4` | 只差头注释 3 行，其余逐字同（2240→2307 B） | 必要适配 |
| `src/index.ts:42-46` | 去掉 `export type { HostCaller } from './client.js'` | 与 `plugin-schedule-ilife`／`plugin-memo-ilife` 的 `#218 拆雷` 同形；全仓 `HostCaller` 已无仓库内消费者（只有 `.scratch` 探针），删得对 |
| `tsconfig.json`／`tsconfig.client.json` | 与 schedule 同名件**逐字节相同** | ✅ |
| `tsdown.config.ts` | 只差 `PLUGIN_ID`＋注释 | ✅ |
| `package.json:41-49` | build 串、`typecheck`、`devDependencies.tsdown 0.22.14` 与 bill／schedule 逐字同 | ✅ |

未沿用错值的点也核过：`src/bridge.ts:15` 是 `SKILL_PACKAGE='skill-home'`，没有把 bill 的值抄进来。

---

## 3 7 条锁能不能锁住（反例）

四条反例，**都让 7 条全绿**：

1. `src/index.ts:32` 把那句条件抛改成无条件吞错（`if (false) throw error;`）→ 用例 5（`test/skills-provider.test.mjs:89-96`）只断言「不抛＋warn≥1」，**「他错重抛」零锁**。报告 `:25` 拿它当交付项，锁不住。
2. `src/skill-provider.ts:97` 把 `description` 换成插件内硬编码常量（只要含前 12 字与唤醒词）→ 用例 3 只比 `slice(0,12)`（`:71`）、用例 6 只比唤醒词（`:102`）⇒ **「描述取文件实测值、不在插件内硬编码第二份」这条注释（`:12`）没有锁**。
3. `src/skill-provider.ts:103` 删掉 `locator` → 用例 3 只查 `invocation`／`source`／`rank`／`resourceBase.kind`，**不查 `locator.path`**（报告 §2.3 探针却把 locator 当卖点）。
4. `src/skill-provider.ts:112` 的 `!candidate` 分支与 `control.signal` 面：用例 5 走的是「改名」路径（`:85`），桩里 `AbortController`（`:27`）从不 abort ⇒ **这两条契约面无人锁**。

结论：7 条锁住了「接线＋唯一候选＋全文＋退让不炸＋files 含 SKILL.md」，**没有锁住退让语义、描述同源地、locator、控制面**。

---

## 4 票面背离的理由：真假判定

票面「取值照老家 `name`」，实施取 `name: skill-home`。理由两半分别判：

- **「会打红 skills-cli 的 `^[a-z0-9-]+$`」——成立，但报告引的凭据错位。** 报告 §5.1 引 `test/skills-export-47.test.mjs`，而该门 `:21` 是 `PKGS = ['skill-calorie']`，**今天不覆盖 skill-home**；真红线在宿主：`@deepseek-ai/dsh-skill/lib/index.js:17` `SKILL_NAME=/^[a-z0-9]+(?:-[a-z0-9]+)*$/` 与 `:454` 的 `throw invalid skill name`。本机未装 skills-cli（不在 PATH），其本体无法就地复核。
- **「会打红提供方」——不成立。** `skill-provider.ts:69` 用的是 `/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u`，**接受中文名**；中文名是在宿主 `:454` 才抛。故 `:281` 那句「会同时打红 skills-cli 与提供方两条线」应订正为「会打红导出规则与宿主校验」。
- 取 `name: skill-home` 本身**正确**（目录名即 `skill-home`，`skills-export-47.test.mjs:46` 也要求 name＝目录名）。

---

## 5 越界检查

- `packages/skill-home/SKILL.md`：`git diff --cached` 只有**一个 hunk**（`@@ -0,0 +1,6 @@`）＋6 行头，正文一字未改 ✅。
- 本票的件（staged）：`plugin-home-ilife` 8 件、`skill-home` 2 件、`pnpm-lock.yaml`、`t193-install-report.md` ——**加一件漏报**：`docs/skills/skill-home/t193-body.md` 已被改成「进度：100% ＋ 下一步」（与报告 §6② 逐字同源）且已入索引，但 §5 末尾清单没有它。
- 别家的件（**不是本票**，现场可见）：`docs/skills/skill-chef/{t236-structure-design,t6-render-wiring}.md`（已 staged）、`packages/skill-chef/**`、`docs/skills/skill-memo-ilife/**`、`packages/base-render/{assets/help-template.html,src/helpShell.ts,src/output/saveHtml.ts,test/help-shell-136.test.mjs}`（未 staged）。
- 报告 §5.4 只点了 base-render 三件，**没点 chef 两文档已在索引里**——任何一次 `git commit` 会把它们一并带走。§5 清单用 `??` 标 5 个新件，而现场全是 `A `（已入索引），与同段「本席只按红线 git add 自己的件」自相矛盾。

## 6 必报五步与铁律自查

- **五步**：本图唯一写代码的票，报告**零字报五步**（`grep 影响清单／结构设计／交付对账` → 0 命中）。第三步实际做到；第一／二步无（`gh issue view 193 --json comments` → **0 条评论**，无用户点头记录；`map-183-body.md:22` 有「不占用户决策时间」的编排句可部分豁免）；第四步不触发（本包无 `AGENTS.md`，无告警线数字，也无超线件）；第五步只以 §5「件清单＋未碰清单」近似，未与事前清单逐行对，也未点「偏差为零」。
- **铁律一／二**：`skill-provider.ts`（129 行）与 `dsh-ctx.ts` 是 bill 同形件的整份拷贝；`BUNDLED_SKILL_RANK`／`SkillHostCtx` 等在全仓 6～7 处各一份。cookbook §12（`docs/agents/dsh-client-contract.md:166-170`）明文要求 600 内联、dsh-ctx 只作镜，且 5 件兄弟件同形 ⇒ **记一条，不算本票新欠账**，但「抄一遍不算走接口」按字面成立。
- **用词纪律**：报告 `:1,:53,:184,:186,:202,:318,:325,:355` 共 9 处「装机」、`:316,:337` 与 `t193-body.md:13` 共 3 处「落地（＝实施）」——`docs/agents/wording.md:50-51` 两个都在禁用列。

## 7 遗留风险逐条判

| 报告 §4 条目 | 判定 |
|---|---|
| ① 重启才生效 | **真坑**（pid/端口已复核）；票 11 必办 |
| ② `.dsh-module-fallback\node_modules\skill-home` 待核 | **真坑，且已可确定**：实测兄弟 5 件（bill／calorie／chef／memo／schedule）该目录**全有**，home **独缺**；链接目标 `...\plugin-home-ilife\node_modules\skill-home` 已存在 ⇒ 无需等重启就能补 |
| ③ `~/.agents/skills`「首选」 | **证据不足**：该目录实测只有 bill／calorie（陈旧拷贝）／chef／memo，而兄弟 `skill-schedule` 同样不在其中却已按提供方路装齐 ⇒ 「首选」缺对照，建议降级为「备选」 |
| ④ 端到端等票 7／8 | 真 |
| ⑤ 别跑 `dsh plugin install` | 真（手工 Junction＋手改 lock 的混合态） |
| ⑥ 别跑仓根 `pnpm build` | 真（会覆写 bill 的 loader 包，用户 GUI 正用） |

**它没意识到的坑（4 条）**：

1. **7 条锁不进任何门**：`packages/plugin-home-ilife/package.json:45` 的 `test` 只跑 `test/smoke.test.mjs`（bill 同），仓根也不跑它；且它 `import '../dist/index.js'`（`:14`）⇒ 未 build 必红、进了门也只在 build 后才有意义。这 7 条今天等于「一次性证据」。
2. **`skill-home` 的 name 没有任何门对到宿主红线**：唯一约束是字面量 `'skill-home'`（用例 3 `:57`），`test/skills-export-47.test.mjs:21` 又不含 `skill-home` ⇒ 有人把 `SKILL.md` 的 name 改成大写／下划线／中文，**全仓无一门会红**，只在宿主运行期 `dsh-skill:454` 抛。
3. **并发会话改 base-render 与票 6 渲染的联动没被连上**：`packages/base-render/{assets/help-template.html,src/helpShell.ts,src/output/saveHtml.ts}` 正在被改，而 `tooling/test/skill-html-snapshot.test.mjs:103-104` 把 `home: 21` 钉死 ⇒ 报告 §2.4「snapshot --check 均绿」是**时点结论**，票 6／票 11 复验会踩这条联动；报告只把它当「别人的在途工作」。
4. **索引里混着别家的件**（chef 两文档等），报告未提醒编排方**分区提交**，会把别人的在途改动一起提走。

---

## 8 必须整改（逐条）

1. `t193-install-report.md:1,:53,:184,:186,:202`（＋`:316,:337`／`t193-body.md:13`）：禁词「装机」「落地」换规范词。
2. `packages/plugin-home-ilife/package.json:45`：`test` 串补 `test/skills-provider.test.mjs`（或另加 `test:skills`），否则 7 条锁不在门里。
3. 报告 §5 件清单：补 `docs/skills/skill-home/t193-body.md`，并把 `??` 改成现场真实状态（`A `）。
4. 报告 §5.1 订正：「会打红提供方」删掉；真凭据改引宿主 `dsh-skill:17`／`:454`，并注明 `skills-export-47.test.mjs:21` 今天不含 `skill-home`。
5. 报告补一段「必报五步」对账（第一／二步未做、第四步不触发、第五步＝§5 清单且偏差为零）。
6. `src/index.ts:32` 的「他错重抛」补一条锁（反例见 §3-1），或把报告 `:25` 的说法撤回。
7. §4 遗留清单：②升为确定项（兄弟 5/5 有、home 独缺），③降为备选。
