# #190 居家 HELP 进共享命令表（子代理 H7）

## 登记了什么（逐字原文）
`packages/base-combos/combos.yaml:506-510`（calorie 块之后、memo 块之前，按 skill 字典序）：

```yaml
  - key: home.help.lookup
    skill: home
    shape: list
    title: 居家管家HELP
    cmd: skill-home
```

字段逐字同形照 `memo.help.lookup`（同文件 `:561-565`）五字段（key／skill／shape／title／cmd）；`tooling/check-combos.mjs:24` 只许这五个字段，未自创、未多字。表内计数 **111 → 112**。
**只登一条**：居家两种产物共用 `home.help.lookup` 这一把 key（缺省落 HELP 文件；`mode:"lookup"` 落速查表），故不拆两条。表里 `calorie.help.center` ＋ `calorie.help.lookup` 之所以两条，是那两种产物各有独立唤醒键，形不同不照抄。

## 两个生成器（确切命令与实际输出）
1. `node packages/base-combos/scripts/gen-present.mjs`
   输出：`present 已生成：112 键 → D:\ilife\packages\base-combos\src\present.ts`
   产物 `src/present.ts:104` 新增一行 `'home.help.lookup',`（生成物，禁手改）。
2. `node packages/base-combos/scripts/build-help.mjs`
   输出：`HELP 已注入：D:\ilife\packages\base-combos\HELP.md`
   `git diff` 显示 **HELP.md 零字节变化**：`buildHelpBlock` 只吃 channels／scenarios／fallbacks／l6_slots 四段，combos 段不进 HELP.md。照跑是纪律（漏跑即红），不是白跑。

## 补的锁（含行号与断言）
`test/combos-p8.test.mjs` 的 `it('HELP 不进运行时（发货代码无 HELP 标记计算）')`（`:138`）：
- `:144-146` runtime 数组加居家两行（同形照 memo `:142-143`）：`packages/skill-home/dist/cli/cmd_read.js` ＋ `dist/fetch/*.js`（5 个），共 6 个文件进 `HELP-AUTO` 扫描面。
- `:148-149` 新断言 `assert.ok(homeRuntime.length >= 2, '居家运行时未进扫描面：…')`：先证居家文件真在扫描面（路径写错或分支漏加＝锁静默跑不到，直接红）。
- `:150` 原断言逐文件断言不含 `HELP-AUTO`（home 的标记块只在 `SKILL.md`，不在 dist，故不误伤）。
- 既有 `:120` 那条（`present.ts == renderPresent(combosKeys(yaml))`）自动覆盖「登记了但漏跑 gen-present」。

## bridge 能否解析（只核，未动手）
`packages/plugin-home-ilife/src/bridge.ts`：`handleHostCall(key, params)`（`:66`）→ `readViaCli`（`:76-95`）是**键无关**的——只 spawn `skill-home/dist/cli/cmd_read.js <key> --params`，仅回执 key 不符才抛 `key-mismatch`。`HOST_CALL_METHOD = 'ilife.home.read'`（`:17`）是 RPC 方法名，不是键白名单；全件（含 `src/`）无第二处键清单。
实测（`SKILLS_DB_PATH` 指向临时目录，用后已删）：`node packages/skill-home/dist/cli/cmd_read.js home.help.lookup` → `exit=0`、`key=home.help.lookup`、`shape=list`、`total=91`。
结论：**登记后经 bridge 可解析，无需同批补入口**；bridge 与组合表无耦合，只要求技能 dist 已构建（`assertCliPresent`）。

## 未做与理由
- 未跑 `tsc -b`／仓根 `pnpm build`／仓根 `pnpm test`：`packages/*/dist/` 属 gitignore 产物，本票只需两个生成物；`present.ts`（tracked）已是真相源。
- 未碰 `packages/skill-home/**`、`base-render`、`skill-chef`、`skill-schedule`；未改任何 skill-* 源码。
- 未 commit、未 `git add`（文件已落盘，交编排方处理）。
