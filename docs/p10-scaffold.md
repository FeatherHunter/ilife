# P10 脚手架（#11 第一阶段）：7 插件骨架＋依赖＋安装口径

> 本票只做脚手架（包骨架＋依赖＋安装口径）。最小 UI 6 项可用性与 #13 六条验收为第二阶段，
> 待六技能图全关（#14/#15/#16/#17/#18/#19）再做，不在本票分支内验收。combos.yaml 不动，技能包不动。

## 包清单与依赖图（单品→总管单向）

| 目录 | npm 包 | 槽位 / order | 技能（只读消费 dist/CLI） |
|---|---|---|---|
| packages/plugin-memo-ilife | dsh-memo-ilife | ilife:memo / 70 | @feather_wch/skill-memo → packages/skill-memo/dist/cli/cmd_read.js |
| packages/plugin-calorie | dsh-calorie | ilife:calorie / 75 | @feather_wch/skill-calorie → packages/skill-calorie/dist/cli/cmd_read.js |
| packages/plugin-schedule-ilife | dsh-schedule-ilife | ilife:schedule / 80 | @feather_wch/skill-schedule → packages/skill-schedule/dist/cli/cmd_read.js |
| packages/plugin-home-ilife | dsh-home-ilife | ilife:home / 85 | @feather_wch/skill-home → packages/skill-home/dist/cli/cmd_read.js |
| packages/plugin-chef | dsh-chef | ilife:chef / 90 | @feather_wch/skill-chef（#18 未到，缺席阻断，见 deferred） |
| packages/plugin-bill-ilife | dsh-bill-ilife | ilife:cookie / 95 | @feather_wch/skill-bill → packages/skill-bill/dist/cli/cmd_read.js |
| packages/plugin-manager | dsh-life-pack | 无自有槽位（6 tab 只导航） | 不依赖单品、不 import 单品 |

依赖方向：6 单品 `dependencies: { "dsh-life-pack": "workspace:*" }`（硬依赖，非 peer）；
总管零单品依赖。单品内保留总管依赖只作本地开发兜底（P1 #2），不作为单 add 即激活的依据。

注：`dsh-bill-ilife` 供 `ilife:cookie` 槽（P3 定案 95 为 cookie，技能包沿用 bill 命名，映射在此钉死）。
卡路里子页（`ilife:calorie:diet/exercise/goal…`）只在单品主面板内导航，不占栏，不进总管表。
60 `deck:map` 为 matt 探针已占位，不动。

## better-sidebar 槽位（P3 定案）

- `registerTab`/`openTab` 写死槽位原生组件（`TAB_COMPONENT = { kind: 'native', … }`），无动态按需加载，无外嵌页。
- id 命名空间 `ilife:*`，order：70 memo / 75 calorie / 80 schedule / 85 home / 90 chef / 95 cookie。
- 缺席纯条件渲染（`tabsForPresence`/`pageOrReco` 语义），无轮询（插件 src 无任何定时器；有界重试归一由 base-render 拥有）。
- 关闭语义跟官方：菜单消失、`openTab` 拒新开、已打开保留。设置页槽位无需单独分配：一次 `registerTab`，
  边栏 + 号菜单与 DSH 设置页 side 卡片各多一项（注册表驱动）。

## 设置页 / 总管导航 / 推荐安装实现位置

- 设置页住单品包：`packages/plugin-*/src/settings.ts`（`SETTINGS_OWNER` + `SETTING_ROWS`，总开关缺省启用）。
  总管无 `src/settings.ts`（boundaries 断言钉死）。
- 总管 6 tab 只导航：`packages/plugin-manager/src/nav.ts`（`MANAGER_TABS` + `openManagerTab` 路径导航）。
  内容由单品自注册 slot 提供，总管不 import 单品页、不直调内容渲染。
- 推荐安装＋提示补装：`recoFor`/`tabsForPresence`（`kind: 'reco'` + `installCmd` + `hint` 含“补装”）。
  不许单卸总管：单品桥 `MANAGER_MISSING_HINT`（`packages/plugin-*/src/bridge.ts`）在总管缺席时指向双包补装。
- 纯 CLI 单轨：面板只经 `host.call`（`requestViaHost`/`requestReadViaHost`/`requestOpenViaHost`）→ host 桥
  `spawn` 技能 `cmd_read`（`readViaCli`/`handleHostCall`，argv+JSON+exit）。单品/总管源码禁 `import` 技能实现。
- 缺失阻断不返空：`SkillBridgeError`（missing-cli/fetch-failed/bad-json/key-mismatch）＋ `renderPage` 侧 `missing-data`，
  一律抛错，绝不返回空数组/空页。

## 安装口径（单命令双包，P1 #2）

任何单品落地时总管必须已在位导航。安装命令（两者皆直接依赖，由 reconcile 按序激活）：

```sh
dsh plugin add dsh-life-pack dsh-memo-ilife
dsh plugin add dsh-life-pack dsh-calorie
dsh plugin add dsh-life-pack dsh-schedule-ilife
dsh plugin add dsh-life-pack dsh-home-ilife
dsh plugin add dsh-life-pack dsh-chef
dsh plugin add dsh-life-pack dsh-bill-ilife
```

反例（不许）：`dsh plugin add dsh-calorie` 单加——传递依赖落盘但 reconcile 不激活总管，
profile 解析不到它（负向断言覆盖）。亦不许单卸总管（`dsh plugin remove dsh-life-pack` 留单品在位）。

安装验收以 bundles 双含为准（`packages/plugin-manager/src/install.ts`：`reconcileBundles` +
`assertDualBundles` + `assertNegativeSingleOnly`），测试见 `test/plugin-p10-install.test.mjs`（双含正向＋单加负向，6 单品逐一）。

## 边界与红线

- 真相唯一 B、纯 CLI 单轨、engines>=22.13（7 包逐一）、缺失阻断不返空。
- 技能包不动（只读消费其 dist/CLI，无反向依赖）；combos.yaml 不动（无 dsh 名渗入）。
- 装配归一仍属 base-render；插件槽位描述子形状与之对齐，脚手架期零耦合（不直连 base 包）。
- DSH 官方插件包模式照抄：`dsh.bundle.patch` + `cordis.patch.yml` insert 行 + `exports` 含 `./client` 与
  `./package.json` + `files` 含 dist 与 patch + cordis 插件 `name/inject/apply`。

## Deferred（第二阶段，不在本票分支验收）

- 最小 UI 6 项可用性（点得开）：待六技能实现齐（#14/#15/#17/#18/#19，#16 已关仍等其余），本票仅留原生组件存根与导航。
- #13 六条验收（装得上/叫得动/点得开/配得通/测得过/分得清）：待 #11 全关 + #9 收口后统一验收。
- `dsh-chef` 真实取数：待 skill-chef 落包（#18），当前桥缺席阻断（`missing-cli`），模板/HELP/DB 键全待技能侧。
- 真机挂载实测（无覆盖/无抖动/无静默 no-op）归 #4，待本脚手架合入后在主检出装机验证。
