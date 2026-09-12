## 问题

`packages/plugin-bill-ilife` 的构建配置会让宿主的下一次构建**把它自己的客户端产物覆写成裸 ESM**，而账单插件**装在 web profile 的 bundles 里**——这正是 `#150` 那起「一处 ESM 形态错 → 所有插件注册不上 → 整个 web GUI 起不来」的同一条通道。

## 实测证据（由地图 `#220` 的复审会话在审计 `#232` 时发现，来源 `docs/skills/skill-memo-ilife/t232-review-F.md`）

1. `packages/plugin-bill-ilife/tsconfig.json` **没有 `exclude`**；
2. 同包 `src/index.ts:47` 仍有 `export type { HostCaller } from './client.js'`；
3. ⇒ `tsc -b --listFiles` 实测 **`src/client.ts` 落在宿主 `tsc -b` 的程序里**；
4. ⇒ 下一次 `tsc -b`／`pnpm -r build` 会把 `dist/client.js` 从**loader 工厂包**（现 3528 B，头是 `window.__ModuleLoader__.load({`）**覆写成裸 ESM**；
5. 而 `plugin-bill-ilife` **在 web profile 的 bundles 里** ⇒ 直接命中 `#150` 通道。

## 同一机制已经打坏两家（惰性，未爆）

`dsh-home-ilife` 与 `dsh-schedule-ilife` 的 `dist/client.js` 实测已是**裸 ESM**（`import … from './slot.js'`，无 loader 头）。它们之所以还没爆，只是因为这两个包**不在任何 profile 的 bundles 里**（`%APPDATA%\DSH Desktop\profiles` 下只有 `web`）。这也解释了 `node --test test/client-bundle-48.test.mjs` 当前基线里那 **3 ＋ 3 条红**。

## 修法（照已修好的两家）

`plugin-chef-ilife` 与 `plugin-memo-ilife` 已经是对的形态，照它们改：

1. 删掉 `src/index.ts` 里 `export type { HostCaller } from './client.js'` 这类**把 client 拉进宿主构建程序**的类型引用；
2. `tsconfig.json` 加 `exclude`（把 `src/client.ts` 一类客户端件排除出宿主构建）；
3. 改完**重打 `dist/client.js`** 并断言产物头部仍是 loader 工厂包（含 `window.__ModuleLoader__.load({`）；
4. 跑 `node --test test/client-bundle-48.test.mjs`，确认账单 3 条仍绿、且不新增红。

## 风险说明（为什么值得单独开票）

- **触发条件极普通**：任何人跑一次仓根 `tsc -b` 或 `pnpm -r build` 就可能触发，不需要动账单的代码；
- **爆炸半径大**：账单在 web profile 的 bundles 里 ⇒ 命中的是**整个 web GUI 起不来**，不是单个面板坏掉；
- **产物 git 救不回**：`dist/` 被 `.gitignore` 忽略（`git ls-files` 返 0），照 `#150` 的经验只能重建。

## 与本票无关的说明

本票由地图 `#220`（备忘录 HELP）的对抗式复审**顺带发现**，属仓库级隐患，**不在该地图的目的地内**，故单独开票、不回填该地图。
