# `dsh-home-ilife` 客户端产物缺陷：形态、证据与照抄配方

- **发现人／时刻**：发版会话（三条产品线发版），2026-09-12 15:00 前后
- **性质**：与 `#150`／`#241` 同一条通道的**产品缺陷**（不是测试口味问题）
- **为什么写在这里**：该件属居家图（`docs/skills/skill-home/`，票 `#193` 已开、进度 0%），
  本发版会话**不越界修**（先例：`#241`／`#242` 都是「发现即立据、留给归属图修」）；
  但配方与判据已实测，归属图照抄即可，不必重新调查。

---

## 1. 缺陷（一句话）

`packages/plugin-home-ilife/dist/client.js` 是 **837 B 的裸 ESM**（首行是 `/**` 注释、
正文 `import`／`export`），**不是 DSH loader 要的工厂包**。它已声明 `dsh.client.platform = web`
且 `exports["./client"]` 指向该文件 ⇒ 一旦这个包发到 npm 或装进任何 profile，
DSH 把所有插件客户端拼成**一条** `<script>` 加载，裸 ESM 在普通脚本里是语法错误 ⇒
**整条脚本解析期即死，所有插件都注册不上**（页面显示 Failed to load plugins）。`#150` 就是这么炸的。

## 2. 实测证据（发版会话现场跑，可复跑）

| 项 | 实测值 |
|---|---|
| `packages/plugin-home-ilife/dist/client.js` | **837 B**，首行 `/** dsh-home-ilife 客户端存根（P10 脚手架）…`，`loader=False`，ESM 行 **7** |
| 对照：`plugin-memo-ilife` | 12,883 B，首行 `window.__ModuleLoader__.load({` |
| 对照：`plugin-calorie` | 13,937 B，首行同上 |
| 对照：`plugin-schedule-ilife`（本会话已修） | **3,576 B**，首行同上 |
| 门禁 | `node --test test/client-bundle-48.test.mjs` → **18 pass / 3 fail**，红的 3 条**全是** `dsh-home-ilife` |

复跑命令（在 `D:\ilife`）：

```powershell
node --test test/client-bundle-48.test.mjs          # 期望修完后 21 pass / 0 fail
$f='packages\plugin-home-ilife\dist\client.js'; "{0} B" -f (Get-Item $f).Length; [System.IO.File]::ReadAllLines((Resolve-Path $f))[0]
```

## 3. 根因（三处叠加，缺一不可）

1. `packages/plugin-home-ilife/tsconfig.json` **没有** `exclude: ["src/client.ts"]`
   ⇒ `tsc -b`（含仓根 `tsc -b`）把 `client.ts` 编译成裸 ESM 直接写进 `dist/client.js`。
2. 该包**没有** `tsdown.config.ts` ⇒ 没有任何一步产出 loader 工厂包（`dist/client.js` 只有 tsdown 能产出）。
3. `package.json` 的 `build` 只写 `tsc -b` ⇒ 包级 build 也不会补上第 2 步。
4. （连带）`src/index.ts:19-20` 从 `./client.js` 做值导出与 type 导出 ⇒ 即使补了排除，
   宿主仍会把 `client.ts` 拉回 `tsc -b` 的编译程序，**把工厂包覆写回裸 ESM**（`#218` 拆雷的原话）。

## 4. 照抄配方（`plugin-schedule-ilife` 已按此修好，逐件同形）

先例提交：**`1fca032`** 的 `packages/plugin-schedule-ilife` 段（本会话）。逐件对照：

| # | 文件 | 动作 |
|---|---|---|
| 1 | `packages/plugin-home-ilife/tsconfig.json` | 加 `"exclude": ["src/client.ts"]` |
| 2 | `packages/plugin-home-ilife/tsconfig.client.json` | **新建**（`composite:false`／`noEmit:true`；`include` 写 `src/client.ts` 及其依赖 `src/slot.ts`／`src/bridge.ts`） |
| 3 | `packages/plugin-home-ilife/tsdown.config.ts` | **新建**：`PLUGIN_ID = 'dsh-home-ilife'`，其余逐字同形（entry `src/client.ts`、`format:'cjs'`、`platform:'browser'`、banner `window.__ModuleLoader__.load({ id: …, factory: (require) => {`、footer `return module.exports; } });`、intro `var module = { exports: {} }; …`、`codeSplitting:false`、`clean:false`） |
| 4 | `packages/plugin-home-ilife/src/client.ts` | 补 loader 契约两件：`export const inject: readonly string[] = [];`（空——本存根不读任何 ctx 服务，与 `package.json` 的 `dsh.client.inject: []` 同值）与 `export function apply(): void { /* 面板接线见归属票 */ }` |
| 5 | `packages/plugin-home-ilife/src/index.ts` | **删掉** `export { … } from './client.js';` 与 `export type { HostCaller } from './client.js';` 两行（宿主要不要导出客户端件：不要，见 `#218`） |
| 6 | `packages/plugin-home-ilife/package.json` | `build` 改 `npm run build:host && npm run build:client`，加 `build:host: tsc -b`／`build:client: tsdown`／`typecheck: tsc -p tsconfig.client.json`，`devDependencies` 加 `"tsdown": "0.22.14"`；随后 `pnpm install --filter dsh-home-ilife --config.minimumReleaseAge=0` 让 `.bin` 出现 tsdown |

构建与判据：

```powershell
pnpm --filter dsh-home-ilife run build        # 先删 dist 与 tsconfig.tsbuildinfo 再跑，才是强制重建
"{0} B" -f (Get-Item packages\plugin-home-ilife\dist\client.js).Length   # 期望数千字节，不是 837
[System.IO.File]::ReadAllLines((Resolve-Path packages\plugin-home-ilife\dist\client.js))[0]  # 期望 window.__ModuleLoader__.load({
node --test test/client-bundle-48.test.mjs    # 期望 21 pass / 0 fail
```

## 5. 注意事项（做的时候别踩）

- **不要**跑仓根 `pnpm build`（= `tsc -b`）：它会把**别家**（`plugin-bill-ilife`，`#241` 已立票）
  的工厂包也覆写成裸 ESM，那家装在 web profile 的 bundles 里，**整个 GUI 会起不来**。
- 归属图若只修产物、**不动版本与依赖**，则 `test/plugin-p10-{boundaries,install}.test.mjs`
  与 `packages/plugin-home-ilife/test/smoke.test.mjs:29-30` 的 `^0.1.` 断言**都不用改**
  （那几张表只在「该包进发版窗口」（总管升 `^0.2.0` ＋ 技能精确 pin）时才需要加条目）。
  一旦要发版，就照 `plugin-schedule-ilife` 的入窗改法：同批补 `WINDOW123`／`LIFEPACK123` 条目
  （否则那张表的 fallback `^0.1.0` 会直接判红）。
- `apply` 做成空实现**只**为了让产物在 loader 里是合法插件；真面板与技能提供方属 `#193`，别在这里顺手做。
- 本件与 `#241`（账单）是**同一个缺陷类**：凡 `dsh.client.platform = web` 的包，
  都必须同时具备「tsc 排除 client + tsdown 出工厂包 + 包级 build 串起来」三件，
  否则迟早按 `#150` 的形态炸。
