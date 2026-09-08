# #80 取证：`base-combos/HELP.md` 生成缺陷（6 行 `undefined` + L6 段为空）与键名不一致

- 票：GitHub **#80**《修 base-combos/HELP.md 生成缺陷与键名不一致》（map #63，`wayfinder:task`）
- 分支/HEAD：`master @ d624b7d`（**未提交**，改动留给编排者统一提交）
- 工作副本：`.scratch/t80/`（`HELP.before.md` = 改动前 HELP.md 原样快照；`probe-before.mjs` / `probe-snapshot.mjs` / `probe-keys.mjs` / `probe-77-vs-87.mjs` 四个只读探针）
- 结论一句话：**`undefined` 与 L6 空段是同一条段头正则缺陷的两个症状**（同一根因）；**键名不一致是另一处独立缺陷**（combos.yaml `channels` 段的键形），二者只是在同一张 HELP.md 上叠现。
- 收尾裁定（编排者 5 条）落实见 **§9**：① 注释校正 ✅；② 口径登记 ✅；③ 包内 test 脚本不动 ✅；④ p8 假阳性断言已收紧 + 变异自证 ✅；⑤ `gen-present.mjs` 同类修复保留 ✅。

---

## 0. 结论摘要（TL;DR）

| 项 | 改前 | 改后 |
|---|---|---|
| HELP.md 内 `undefined` 行 | **6** | **0** |
| L6 空位行 | `L6 空位（一期不实现，内容不记录）：。` | `L6 空位（一期不实现，内容不记录）：L6.1、L6.2、L6.3、L6.4、L6.5、L6.6。` |
| HELP.md 通道表键形 | 4 个下划线键（`calorie.view_home` 等，**非注册键**） | 15 个键全为 registry 点号键 |
| HELP.md 行数 / 字节 | 76 行 / 6867 B | 70 行 / 6672 B |
| 段头正则（根因） | `^([A-Za-z_]+):\s*$`（漏含数字段名） | `^([A-Za-z_][A-Za-z0-9_]*):\s*$` |
| 门 | **无**（旧门全绿放行缺陷；p8 的 L6 断言为假阳性） | 2 处构建期断言 + 新门 9 条单测 + **p8 旧断言收紧**，含变异自证 |
| 对外键名 | — | **零改动**（改的是说明书里展示的键，由非注册名纠正为注册名） |
| 快照 sha | `0.1.0@8641f1c694ca692a` | `0.1.0@2fc0b42170d9604a`（工具 `write-snapshot.mjs` 写，非手改） |

---

## 1. 复现（改前，命令 + 原样输出）

### 1.1 跑一遍 HELP.md 生成流程

```
PS D:\ilife> node packages\base-combos\scripts\build-help.mjs
HELP 已注入：D:\ilife\packages\base-combos\HELP.md
--- git diff --stat (HELP.md) ---
（空：HEAD 的 HELP.md 就是当前生成器的产物，不是陈旧残留）
--- 生成后 undefined 行 ---
66: - undefined：undefined（undefined）
67: - undefined：undefined（undefined）
68: - undefined：undefined（undefined）
69: - undefined：undefined（undefined）
70: - undefined：undefined（undefined）
71: - undefined：undefined（undefined）
--- L6 行 ---
73: L6 空位（一期不实现，内容不记录）：。
```

> `git diff --stat` 为空是关键：**缺陷由当前生成器稳定复现**，不是某次历史生成的脏数据。

### 1.2 纯函数探针（不落盘，`.scratch/t80/probe-before.mjs`）

```
PS D:\ilife> node .scratch\t80\probe-before.mjs
=== 1) 段头正则对照 ===
  channels:    BAD=true  GOOD=true
  scenarios:   BAD=true  GOOD=true
  fallbacks:   BAD=true  GOOD=true
  l6_slots:    BAD=false  GOOD=true
  combos.yaml 段头行号：
    5: combos:
    441: channels:
    502: scenarios:
    809: fallbacks:
    834: l6_slots:
=== 3) 统计 ===
  总行数 = 69
  undefined 行数 = 6
    - undefined：undefined（undefined）  ×6
  L6 行 = ["L6 空位（一期不实现，内容不记录）：。"]
  降级区短横线行数 = 12
```

（`BAD = ^([A-Za-z_]+):\s*$` 是改前 `build-help.mjs:18` 的写法，`GOOD` 是修后写法。）

**12 条降级行 = 6 条正常 + 6 条 `undefined`**，这是根因的直接指纹。

### 1.3 行号证据

| 证据 | 位置 | 内容 |
|---|---|---|
| 段头正则 | `packages/base-combos/scripts/build-help.mjs:18`（改前） | `const sec = ln.match(/^([A-Za-z_]+):\s*$/);` |
| 失配的段头 | `packages/base-combos/combos.yaml:834`（改前） | `l6_slots:` |
| 被吞的条目 | `packages/base-combos/combos.yaml:835-846`（改前） | `  - id: L6.1` … `  - id: L6.6` |
| 症状落点 | `packages/base-combos/HELP.md:66-71`、`:73`（改前） | 6 行 `undefined` / L6 空行 |

### 1.4 根因机制（逐行推演）

`section()` 里 `inSec` 只在**认得出段头**时才会被重写：

1. 走到 `fallbacks:` → `inSec = true`，收下 6 条降级条目；
2. 走到 `l6_slots:` → 正则因 `\d` 不匹配 → `sec` 为 `null` → **`inSec` 保持 `true`**（没有"段外"这一步）；
3. 于是 `  - id: L6.1` … `  - id: L6.6` 被当作 fallbacks 条目继续 push，落成 `{id:'L6.x', reserved:'true'}`；
4. 渲染模板 `'- ' + f.for + '：' + f.reason + '（' + f.while_degraded + '）'` 对这三个字段全是 `undefined` → **6 行 `undefined：undefined（undefined）`**；
5. 另一头：`section(yamlText, 'l6_slots')` 永远收不到任何行 → `slots = []` → `slots.map(s => s.id).join('、')` 为空串 → **L6 空位行为空**。

一个正则，两个症状。

### 1.5 为什么旧门没抓住（基线全绿）

```
PS D:\ilife> node --test test\combos-p8.test.mjs
ℹ tests 9  ℹ pass 9  ℹ fail 0
```

`test/combos-p8.test.mjs:127` 的断言是 `assert.match(text, /L6\.1/)`，而 HELP.md 末尾**注行自带** `L6.1～L6.6` 字样（改前 `HELP.md:75`），于是"生成块 L6 段为空 + 6 行 `undefined`"照样全绿。这是本票要补的门。

---

## 2. 第二条（键名不一致）的真实范围与判定

### 2.1 具体是哪些键

`combos.yaml` `channels:` 段 15 对里有 **4 对**用下划线（改前行号）：

| 改前（channels 段） | 改后 | combos 段注册键 |
|---|---|---|
| `calorie.view_home`（:446） | `calorie.view.home` | `combos.yaml:11` |
| `calorie.view_diet`（:450） | `calorie.view.diet` | `combos.yaml:16` |
| `calorie.view_exercise`（:454） | `calorie.view.exercise` | `combos.yaml:21` |
| `calorie.view_goal`（:458） | `calorie.view.goal` | `combos.yaml:26` |

其余 11 对（`calorie.today` + `memo.*` 10 键）本来就是点号键，无问题。

### 2.2 两侧的形态

- **combos 段 / `PRESENT_KEYS`**：点号 registry 键。实测 `PRESENT_KEYS.length = 87`，与 `combos.yaml` `combos` 段逐键相等（`.scratch/t80/probe-keys.mjs` 输出 `相等? true`）。合法形由 `tooling/check-combos.mjs:12` 的 `KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/` 与 `packages/skill-calorie/src/cli/keys.ts:18` 的 `COMBO_KEY_RE` 钉死——**字符集不含下划线**。
- **`channels` 段**：改前用的是 `calorie.view_home`，即 **skill-calorie 渲染层内部 `VIEW_KEYS` 的名字**（`packages/skill-calorie/src/render/envelope.ts:3`；`packages/skill-calorie/test/render-t8.test.mjs:63` 钉死 `VIEW_KEYS.home === 'calorie.view_home'`）。该内部名被明确排除在登记之外：`packages/skill-calorie/SKILL.md:34`「组合键 registry 合法点式（下划线→点）…内部 `VIEW_KEYS` 下划线键**仅渲染层复用，不直接登记**」。

### 2.3 不一致会在哪里咬人（实证）

**咬在生成物上，而且咬得实**：`HELP.md:43-46` 直接展示这 4 个键。用户/agent 照抄会拿到：

```
PS D:\ilife> node packages\skill-calorie\dist\cli\cmd_read.js calorie.view_home
ERR 3: 非法 registry key："calorie.view_home"（形如 skill.combo）
exit=3

PS D:\ilife> node packages\skill-calorie\dist\cli\cmd_read.js calorie.view.home --params {...}
ERR 2: --params 须为 JSON：…        ← 键校验已通过，只差参数
exit=2
```

即：**说明书里的 4 个键是不可直接调用的键**。同一条事实被 `packages/skill-calorie/test/cmd-read-t11.test.mjs:91` 钉死（`assert.throws(() => calorieShapeFor('calorie.view_home'), /非法 registry/)`）。查表侧（`tooling/check-combos.mjs`）改前**不咬**——`CHAN_KEY_RE` 特意放宽了下划线，所以构建期全绿（这正是缺口）。

### 2.4 与第一条是否同一根因

**不是。** 第一条是**解析层**（段头正则漏认含数字段名），第二条是**数据层**（yaml 里写错了键形）。两者互不依赖：只修正则，HELP.md 仍展示 4 个下划线键；只改键形，6 行 `undefined` 照旧。它们的共同点是"**说明书展示的键/内容与注册真相不一致**"这一类别，故被同一张票收拢。

### 2.5 方案（先取证后定：统一成点号，而非加映射层）

**决定：把 `channels` 的 4 个键统一为点号 registry 键；不加映射层。**

理由（按证据强度）：

1. 点号键是**已冻结的对外口径**：`skilllink.mjs:142` 对 combos 段每键走 `core.parseRegistryKey`；`skill-calorie/SKILL.md:34` 明文写"registry 合法点式（下划线→点）"；`docs/calorie-dual-path-acceptance.md:43`、`docs/research/t67-key-audit.md` 全用点号。
2. 下划线名**已被判为缺陷**：`docs/research/t72-shared-layer-gap.md:488` 原文"`HELP.md:43-46` 因此展示 4 个非注册键"。
3. 映射层会**制造第二个真相源**：渲染层 `VIEW_KEYS`（内部）与 registry 键（对外）的映射关系本来就存在且只在一处（`keys.ts:5-7` 注释说明），HELP 是"对外说明书"，应当印对外名；再加一层映射只会让说明书与注册表继续分叉。
4. 影响面已实测为零：`channels` 键全仓只有两处消费者——HELP 生成器（`build-help.mjs:73` 原样打印）与 `tooling/check-combos.mjs`（格式校验）。渲染层 `VIEW_KEYS` **未动**，`skill-calorie` 发货代码零改动（`git status` 可见 `packages/skill-calorie/**` 无改动）。

**对外键名变动：无。** 没有任何对外键被改名——是说明书把"内部名"换成了"本来就存在、且用户实际能调用的注册名"。

---

## 3. 修法（最小面）

### 3.1 根因修复：段头/字段正则容数字

`packages/base-combos/scripts/build-help.mjs`（改后行号）：

```js
const SEC_HEAD_RE = /^([A-Za-z_][A-Za-z0-9_]*):\s*$/;   // :15  ← 修这一条即解两个症状
const ITEM_RE     = /^  - (key|id|for): (\S+)\s*$/;      // :16
const FIELD_RE    = /^    ([A-Za-z_][A-Za-z0-9_]*): (.*?)\s*$/;  // :17
```

三份正则现在与 `tooling/check-combos.mjs:35/41/43` **同形**（后者本来就是对的写法，只有生成器漏了数字）。字段正则一并收口，避免同类失配在 `wake_word` 之类的下划线字段上再犯。

同类潜伏写法一并修：`packages/base-combos/scripts/gen-present.mjs:18`（`combosKeys` 的段头正则，当前 `combos` 段名无数字故不触发，但属同一处 bug 类）。**此项可选**，若编排者要更小的面可单独回退这一处。

### 3.2 构建期断言（2 处，生成器拒发坏产物）

`build-help.mjs`：

- `:39-44` `export function assertHelpBlock(block)` —— 块内出现 `undefined` 即 `throw`（`buildHelpBlock` 返回值走它）；
- `:46-52` `export function assertChannelKeys(channels)` —— 任一通道键不符合 registry 点号键即 `throw`；
- `:59-62` `buildHelpBlock` 内四段（`channels`/`scenarios`/`fallbacks`/`l6_slots`）**任一段解析为空即 `throw`**——这正是段头正则失配的第一征兆。

### 3.3 主守卫（让"测试导入"不再写盘）

`build-help.mjs:85-102` 改为 `runMain()` + `isMain` 守卫，写法逐字对齐 `packages/skill-memo-ilife/scripts/build-help.mjs:33-37`（#43 H1 约定）。改前 import 本模块会**顺带覆盖 HELP.md**，使"仓内 HELP.md == 生成器输出"这类断言变成自证；改后测试读到的是**仓内真实产物**，陈旧即红。

### 3.4 `channels` 键统一 + 就地注释

`packages/base-combos/combos.yaml:441-462`：4 个键改点号，并在段首加一行说明（`# #80：通道 key 一律 registry 点号键…`）。

### 3.5 查表侧收紧（构建期门）

`tooling/check-combos.mjs`：

- `:15` `const CHAN_KEY_RE = KEY_RE;` —— 通道键形与 combos 同一条 registry 正则（改前放宽下划线）；
- `:81` render-view 守卫改为 `/^calorie\.view\.(home|diet|exercise|goal)$/`（四主视图，语义与旧 `/^calorie\.view_/` 等价但按注册名写）；
- `:83-86` 新增"**通道键必须逐键在 combos 注册 + 形状对齐**"（改前只对 `skilllink-cmd` 分支做，render-view 4 键漏网）。

### 3.6 连带必改：快照 sha（工具写，非手改）

`tooling/write-snapshot.mjs:16-18` 把 `combos.yaml` 原文纳入 `packages/ilife-skills/skill.snapshot.json` 的 sha 锚。改 yaml 必然使快照过期（实测 `write-snapshot --check` 在改前绿、改 yaml 后红）：

```
snapshot file        = 0.1.0@8641f1c694ca692a
sha(HEAD combos.yaml)= 8641f1c694ca692a  (与快照一致)      ← 改前基线绿
sha(now  combos.yaml)= c595c74920c17e88  (与快照不一致)    ← 改后必须重写
FAIL: 快照过期（文件 0.1.0@8641f1c694ca692a ≠ 实际 0.1.0@c595c74920c17e88），请跑 pnpm snapshot 重写
```

**确认由工具生成、非手改**（`skill.snapshot.json` 三字段 `resolvedVersion`/`sha`/`writtenBy` 全部由工具覆写；`writtenBy` 字段值即 `tooling/write-snapshot.mjs`）。收尾时 ① 又改了 `combos.yaml:1` 注释，故再重锚一次：

```
PS D:\ilife> node tooling\write-snapshot.mjs
wrote D:\ilife\packages\ilife-skills\skill.snapshot.json 0.1.0@2fc0b42170d9604a
PS D:\ilife> node tooling\write-snapshot.mjs --check
OK: 快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）
snapshot-check exit=0
```

按工具自身口径（"快照只许构建写"）执行 `node tooling/write-snapshot.mjs` 重锚；收尾 ① 改注释后再重锚一次，终值 `0.1.0@2fc0b42170d9604a`，随后 `--check` 绿（见上方输出与 §0 表末行）。

---

## 4. 生成物前后对比

### 4.1 diff 关键段（`git --no-pager diff -U2 -- packages/base-combos/HELP.md`）

```diff
 | calorie.today | list | skilllink-cmd |
-| calorie.view_home | stat | render-view |
-| calorie.view_diet | stat | render-view |
-| calorie.view_exercise | stat | render-view |
-| calorie.view_goal | stat | render-view |
+| calorie.view.home | stat | render-view |
+| calorie.view.diet | stat | render-view |
+| calorie.view.exercise | stat | render-view |
+| calorie.view.goal | stat | render-view |
 ...
-- undefined：undefined（undefined）   ×6
-
-L6 空位（一期不实现，内容不记录）：。
+L6 空位（一期不实现，内容不记录）：L6.1、L6.2、L6.3、L6.4、L6.5、L6.6。
```

### 4.2 改后实测

```
PS D:\ilife> node packages\base-combos\scripts\build-help.mjs
HELP 已注入：D:\ilife\packages\base-combos\HELP.md
--- undefined 行 ---
(0 处)
--- L6 行 ---
67: L6 空位（一期不实现，内容不记录）：L6.1、L6.2、L6.3、L6.4、L6.5、L6.6。
--- 通道表 ---
43: | calorie.view.home | stat | render-view |
44: | calorie.view.diet | stat | render-view |
45: | calorie.view.exercise | stat | render-view |
46: | calorie.view.goal | stat | render-view |
```

### 4.3 字节体检（write 由生成器写盘，非重定向）

| 文件 | 字节 | BOM | CRLF | LF | 行数 |
|---|---|---|---|---|---|
| `packages/base-combos/HELP.md`（改后） | 6672 | False | 0 | 69 | 70 |
| `.scratch/t80/HELP.before.md`（改前快照） | 6867 | False | 0 | 75 | 76 |

---

## 5. 新增门 + 变异自证

### 5.1 门的位置

| 门 | 位置 | 触发方式 |
|---|---|---|
| 构建期断言 ×3 | `packages/base-combos/scripts/build-help.mjs:39-62` | `node scripts/build-help.mjs`（`pnpm build`）即红 |
| 单测 ×9 | `test/combos-help-80.test.mjs` | 根 `pnpm test` 的 `test/*.test.mjs` 通配自动纳入 |
| 查表门 | `tooling/check-combos.mjs:15,81,83-86` | `node tooling/check-combos.mjs`（`test/combos-p8.test.mjs:76` 已在跑） |
| **旧断言收紧** | `test/combos-p8.test.mjs:121-136`（收尾 ④） | `node --test test/combos-p8.test.mjs` |

单测覆盖：① 无 `undefined`；② L6 段六个 id 全列 + 降级区恰好 6 条且不越界；③ 合成 yaml（含数字段名，不依赖 combos.yaml 内容）必须成段；④ `assertHelpBlock` 正负例；⑤ channels 键形 + 逐键注册；⑥ `assertChannelKeys` 正负例；⑦ HELP.md 通道表键 == yaml channels 键；⑧ 仓内 HELP.md == 生成器输出；⑨ `check-combos` 全绿。

**旧断言收紧（收尾 ④）**：`test/combos-p8.test.mjs:127` 原为 `assert.match(text, /L6\.1/)`——HELP.md 尾注行自带 `L6.1～L6.6`，故生成块 L6 段为空 + 6 行 `undefined` 也全绿（假阳性）。改为对**生成块**逐行钉死：

```js
const bad = block.split('\n').filter((ln) => /undefined/.test(ln));
assert.deepEqual(bad, [], '生成块含 undefined 行：' + JSON.stringify(bad));
const l6 = block.split('\n').filter((ln) => ln.startsWith('L6 空位'));
assert.equal(l6.length, 1, 'L6 空位行缺失或重复：' + JSON.stringify(l6));
for (const id of ['L6.1', 'L6.2', 'L6.3', 'L6.4', 'L6.5', 'L6.6']) {
  assert.ok(l6[0].includes(id), 'L6 空位行漏 ' + id + '：' + l6[0]);
}
```

### 5.2 变异自证 M1：段头正则退回错误写法

```js
const SEC_HEAD_RE = /^([A-Za-z_]+):\s*$/;   // 变异：退回改前写法
```

**红（M1a：构建期守卫在场）**：

```
PS D:\ilife> node packages\base-combos\scripts\build-help.mjs
Error: combos.yaml 段解析为空：l6_slots（段头正则须容数字，见 SEC_HEAD_RE）
    at buildHelpBlock (packages/base-combos/scripts/build-help.mjs:63:29)
exit=1

PS D:\ilife> node --test test\combos-help-80.test.mjs
ℹ tests 9  ℹ pass 5  ℹ fail 4
  ✖ ① 生成块无 undefined（段头正则失配即红）
  Error: combos.yaml 段解析为空：l6_slots（段头正则须容数字，见 SEC_HEAD_RE）

PS D:\ilife> node --test test\combos-p8.test.mjs          ← 收尾 ④ 收紧后的旧门
ℹ tests 9  ℹ pass 8  ℹ fail 1
  ✖ HELP.md 块 == 构建注入输出（静态文本，36 位+15 对+6 降级+L6 空位）
```

副作用核对：变异下 HELP.md **未被写坏**（断言在 `writeFileSync` 之前抛）——`L6 空位…：L6.1、…、L6.6。` 仍在。

**红（M1c：退正则 + 临时关掉两道构建期断言，只剩 p8 断言兜底；并在变异下重新生成 HELP.md，让"块 == 生成器输出"这条旧断言也成立）**：

```
PS D:\ilife> node packages\base-combos\scripts\build-help.mjs
HELP 已注入：… build exit=0
undefined 行数=6                       ← 变异产物与原缺陷逐字一致

PS D:\ilife> node --test test\combos-p8.test.mjs
ℹ tests 9  ℹ pass 8  ℹ fail 1
  AssertionError [ERR_ASSERTION]: 生成块含 undefined 行：["- undefined：undefined（undefined）", …×6]
```

即在"旧断言全部成立"的复刻条件下，收紧后的断言仍然红——证明收尾 ④ 的断言对**原始症状**真有牙，而非只被新守卫兜住。

**还原后绿**：

```
PS D:\ilife> node packages\base-combos\scripts\build-help.mjs
HELP 已注入：… build exit=0；undefined 行数=0
67: L6 空位（一期不实现，内容不记录）：L6.1、L6.2、L6.3、L6.4、L6.5、L6.6。
PS D:\ilife> node --test test\combos-help-80.test.mjs   ℹ tests 9  pass 9  fail 0
PS D:\ilife> node --test test\combos-p8.test.mjs        ℹ tests 9  pass 9  fail 0
```

### 5.3 变异自证 M2：通道键退回下划线形

`combos.yaml` 把 `calorie.view.home` 改回 `calorie.view_home`：

**红**：

```
PS D:\ilife> node tooling\check-combos.mjs
FAIL: channels 非法 key（须 registry 点号键）：calorie.view_home
check-combos exit=3

PS D:\ilife> node --test test\combos-help-80.test.mjs
ℹ tests 9  ℹ pass 3  ℹ fail 6
  ✖ ② channels 键一律 registry 点号键（无下划线）且逐键在 combos 注册
    AssertionError: channels 键非 registry 点号键：calorie.view_home
  ✖ ③ check-combos 全绿（键形/注册一致性构建期门）
```

**还原后绿**：

```
PS D:\ilife> node tooling\check-combos.mjs
OK: combos 87 注册 + channels 15 对 + scenarios 30 + fallbacks 6 + l6 空位 6   exit=0
PS D:\ilife> node tooling\write-snapshot.mjs --check
OK: 快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）                              exit=0
PS D:\ilife> node --test test\combos-help-80.test.mjs
ℹ tests 9  ℹ pass 9  ℹ fail 0
```

---

## 6. 回归范围与结果（只跑本票相关，未跑全量 `pnpm test`）

| 命令 | 改前 | 改后（收尾终态） |
|---|---|---|
| `node tooling/check-combos.mjs` | exit 0（**放行**下划线键） | exit 0（收紧后仍绿） |
| `node tooling/check-boundaries.mjs` | `boundaries: PASS` | `boundaries: PASS` |
| `node tooling/write-snapshot.mjs --check` | exit 0（`8641f1c694ca692a`） | exit 0（`2fc0b42170d9604a`，工具重锚） |
| `node --test test/combos-help-80.test.mjs`（新增门） | — | 9/9 pass |
| `node --test test/combos-p8.test.mjs`（断言已收紧 ④） | 9/9 pass（**放行**缺陷） | 9/9 pass |
| `node --test test/combos-42.test.mjs` | — | 2/2 pass |
| `node --test test/scaffold.test.mjs`（base-combos 包内 test 脚本） | — | 2/2 pass |
| **四文件合并**：`node --test test/combos-help-80 test/combos-p8 test/combos-42 test/scaffold` | — | **tests 22 / pass 22 / fail 0** |

未跑 `pnpm test` 全量（#78 正用全量测试基线，避免互相污染）；未触碰 `packages/base-render/**`。

---

## 7. 改动文件清单（精确路径）

| 文件 | 性质 | 说明 |
|---|---|---|
| `packages/base-combos/scripts/build-help.mjs` | 修 + 门 | 段头/字段正则容数字；`assertHelpBlock`/`assertChannelKeys`/空段门；`runMain`+`isMain` 主守卫 |
| `packages/base-combos/combos.yaml` | 修 | `channels` 4 键下划线→点号；段首加口径注释；`:1` 注释"注册 11 键"→**87 键**（收尾 ①，只改注释不改数据） |
| `packages/base-combos/HELP.md` | 生成物 | 重新生成：`undefined` 6→0，L6 段补全，通道表键纠正 |
| `tooling/check-combos.mjs` | 门 | `CHAN_KEY_RE` 收紧为 `KEY_RE`；render-view 守卫改四主视图；新增"通道键须在 combos 注册 + 形状对齐" |
| `packages/base-combos/scripts/gen-present.mjs` | 同类潜伏修复（**保留**，收尾 ⑤） | 段头正则容数字（当前不触发；理由见 §9⑤） |
| `packages/ilife-skills/skill.snapshot.json` | 连带 | `0.1.0@8641f1c694ca692a` → `0.1.0@2fc0b42170d9604a`（`combos.yaml` 进 sha 锚；**工具写**） |
| `test/combos-help-80.test.mjs` | 新增门 | 9 条单测（见 5.1） |
| `test/combos-p8.test.mjs` | 旧断言收紧（收尾 ④） | `:127` 假阳性 → 逐 id + 无 `undefined`（见 5.1/5.2） |
| `docs/research/t80-help-gen-evidence.md` | 本文 | — |
| `.scratch/t80/`（未跟踪） | 工作副本 | `HELP.before.md` + 4 个只读探针 |

未触碰：`packages/base-render/**`（#78 施工中）、`.changeset/**`、`docs/base-paint-contract.md`、`docs/research/t78-*`、`docs/research/t94-*`、`fixtures/**`、`.scratch/t78/**`、`.scratch/t94/**`；未执行任何 git 写操作。

---

## 8. 收尾裁定落实（编排者 5 条）

| # | 裁定 | 落实 | 证据 |
|---|---|---|---|
| ① | `combos.yaml:1` 注释改实测口径 | ✅ 已改（只改注释） | `:1` 现为「注册 **87** 键（combos 段，P9 冻结格式；#80 按实测校正，原注释写 11 键）」；`check-combos` 实测 `combos 87 注册` |
| ② | 77 vs 87 属不同域 → 登记 | ✅ 已登记（见 §8.1） | `.scratch/t80/probe-77-vs-87.mjs` 实测 |
| ③ | 包内 test 脚本不改 | ✅ 未改 | 新门靠根 `pnpm test` 的 `test/*.test.mjs` 通配进入（已在 §6 验证） |
| ④ | p8 假阳性断言修 + 变异自证 | ✅ 已修 | `test/combos-p8.test.mjs:121-136`；M1a/M1c 红、还原绿（§5.2） |
| ⑤ | `gen-present.mjs` 同类修复保留 | ✅ 保留 | 见 §8.2 |

### 8.1 ② 口径登记：77 与 87 **属不同域**，本不相等

实测（`.scratch/t80/probe-77-vs-87.mjs`，只读）：

```
=== base-combos 侧 ===
PRESENT_KEYS.length            = 87
combos.yaml combos 段条目数    = 87
combos 段按 skill 前缀分布     = {"calorie":77,"memo":10}
PRESENT_KEYS == combos 段逐键  = true
=== skill-calorie 侧（文档 "77 键" 的出处）===
CALORIE_COMBOS 键数（读+写全量）= 77
CALORIE_WRITE_COMBOS 键数（写）  = 35
读键数（全量 - 写）              = 42
写键 ⊆ 全量                      = true
=== 两域关系 ===
calorie 注册键 ⊆ PRESENT_KEYS    = true
非 calorie 键数量                = 10
87 == 77 + 10 ?                  = true
```

结论：**两个数不是同一域的同一个量，本就不应相等**——

- **87** = `base-combos` 共享表（`combos.yaml` `combos` 段 = `PRESENT_KEYS`）条目数，覆盖 calorie 77 + memo 10（本仓当前只有这两个技能在共享表登记）；
- **77** = `skill-calorie` 自身注册表 `CALORIE_COMBOS` 键数 = 读 42 + 写 35（`packages/skill-calorie/src/cli/keys.ts`），是 87 的**真子集**。

故不列为待裁定，登记于此。

### 8.2 ⑤ `gen-present.mjs` 同类修复保留的理由

`gen-present.mjs:18` 的段头正则与 `build-help.mjs:18`（改前）**逐字相同**（`^([A-Za-z_]+):\s*$`），是同一处 bug 类。当前 `combos` 段名无数字故不触发，但一旦新增含数字的顶层段（例如未来 `l6_slots` 之外的编号段）就会重演"上一段越界吞条目"的同一故障。已一并改为 `^([A-Za-z_][A-Za-z0-9_]*):\s*$`，与 `tooling/check-combos.mjs:35` 同形；对现有 yaml 输出零变化（`test/combos-p8.test.mjs` 的 `present.ts == 代码生成输出` 仍绿）。

---

## 9. 已知问题／待裁定

1. **`packages/base-combos/package.json` 的 test 脚本未挂新门**：现只跑 `test/scaffold.test.mjs`；新门靠根 `pnpm test` 的 `test/*.test.mjs` 通配进入。按裁定 ③ **不改**（归 #95／#79）。
2. **文档口径"77 键"措辞**：`docs/research/t67-key-audit.md`、`t69-dual-path-evidence.md` 等处用"77 键"描述 calorie 注册表，与 `PRESENT_KEYS` 的 87 不是同一量（见 §8.1）。措辞本身非本票范围，未改；如需在那些文档加一句域说明，可另开票。
3. **本票未跑全量 `pnpm test`**（#78 门禁基线保护），回归面见 §6。

