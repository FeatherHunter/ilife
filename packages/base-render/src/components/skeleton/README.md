# skeleton · 加载骨架

**一句话**：等数据那一两秒里，照**真版式**排的一片占位 —— 上面一条**主读数大字位**＋一条副行位，下面若干条**明细行**（时间槽／两行名称位／值位），行间一条发丝线；排头一句人话说明「正在读什么、还要多久」。真数据进来时**不跳版**。

**形态**：本件只落地**形态 A「读数 ＋ 明细行骨架」**——出处＝原型墙 `.scratch/ui-组件墙/parts-09-选择与反馈.mjs` 的 48 加载骨架（2026-09 用户裁定落地的那一形态），按层规重写（原型是一次性代码：无判据、无错误处理、读的是墙稿变量）。
形态键住 `SKELETON_FORMS` 闭集（今天只有 `reading-list` 一格）——**加第二形态是往闭集里加一格，不是新开一件**。

## 何时用它（选型三条）

| 你要的 | 用 |
|---|---|
| 版式已经定了，只差数据（读库那一两秒） | **本件** |
| 数据回来了但**没有记录**（要用户做点什么） | `empty-state`（空态） |
| 读失败了（要用户重试／看原因） | `error-receipt`（错态） |
| 只是告知（「已保存」「已复制」） | `toast`（提示条） |

**不知道会出什么版式就别用本件**：骨架的全部价值是「提前把真版式占住」；瞎摆一排灰杠不如一句「正在读…」。
**行数要按真件的行数给**（`rows`）：行数给错，加载完照样跳版 —— 本件只能保证「同样行数下高度逐像素一致」。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `label` | `string` | 必填 | 正在读什么（人话，「正在读取今日饮食…」）。**非空**；这句进 `role="status"`，读屏会念 |
| `rows` | `number` | 必填 | 明细行占位几条（整数 `1..SKELETON_MAX_ROWS`＝12）；与真件行数一致才不跳版 |
| `eta` | `string` | — | 还要多久／读多少（「通常 1 秒」「共 8 条」）。不给＝排头只有那句人话 |
| `form` | `'reading-list'` | `'reading-list'` | 形态键（闭集；闭集外一律 `badInput`） |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

## 契约与不变量（判据逐条断）

1. **按真实版式排**（不是几条灰杠）：一条主读数大字位（高度＝`skinVar('fs-h1') × SKELETON_READING_SCALE`＝2.2，**与 `page-head` 的主读数同尺度**）＋ 一条副行位 ＋ `rows` 条三列明细行（时间槽／两行名称位／值位）。
2. **列对得上**：时间槽宽度直接读 `entry-rows` 的 `ENTRY_ROW_TIME_MIN_WIDTH_PX`（跨两件只有一个数字，不靠两处抄同一个值）。
3. **加载完不跳版**：行盒高 `SKELETON_ROW_HEIGHT_PX`（35px）**就是行距** —— 行间那条 `SKELETON_ROW_SEPARATOR_PX`（1px）发丝线画在行盒**里面**（`box-sizing: border-box`）；版面高度**是 `rows` 的线性式**（判据在真机上量相邻两行的 `top` 之差，并断「8 行比 3 行高出 5 × 35」）。
4. **动效只走 `opacity`**：`@keyframes ilife-block-skeleton-pulse` 的每一帧只有 `opacity` 一条声明（没有 `transform`／`width`／`left`／`background-position`）；周期 `SKELETON_PULSE_DURATION_MS`；最暗一帧 `SKELETON_PULSE_MIN_OPACITY`（不许低到看不见）。
5. **`prefers-reduced-motion: reduce` 下必须停**：`animation: none` 并换成静止可见度 `SKELETON_STILL_OPACITY`（**停住 ≠ 看不见**）。判据在真机上用 `Emulation.setEmulatedMedia` 量计算样式。
6. **两档几何**：容器宽 390 与 1280 下**零横向溢出**（`scrollWidth ≤ clientWidth`）；三列在任何一档都不重叠。
7. **三套皮肤下标记逐字节相同**：皮肤只换样式段（取值表），标记一个字节不动；占位块底色是 `color-mix(in srgb, ink 13%, surface)`（**从 token 算出来**，不写死灰值）。
8. **无障碍**：根 `aria-busy="true"`；排头 `role="status"`（只念这一句）；**全部占位块 `aria-hidden="true"`**（读屏不念十二个空盒子）。
9. **零 DOM／零内联脚本**：模块代码剥掉字面量后不出现 `document.`／`window.`／`navigator.`；标记里没有 `<script>`、没有 `on*=`。**本件没有 `runtime.ts`**：骨架不接事件、不点不动。
10. **样式只经 `skinVar()` 读皮肤**：不写手写的 `var(--ilife-…)`，不写 `:root`／`!important`，不定义新 token 名，全部 `.ilife-page-ui` 级规则 scope 在它之下；窄档只走 `@container`（判本件自己的宽度），媒体查询只判设备能力。
11. **窄档只动排头**：`@container (max-width: 420px)` 只把排头那句人话改成两台 —— **行距与列宽一律不动**（它们是「不跳版」的锚点，窄档改了就等于换版式）。

## 几何读数（调用方要在别处对齐时读这些）

| 常量 | 值 | 含义 |
|---|---|---|
| `SKELETON_ROW_HEIGHT_PX` | 35 | 行盒高 ＝ **行距**（真件明细行在同一行距下的行高；其中 1px 是行间发丝线） |
| `SKELETON_ROW_SEPARATOR_PX` | 1 | 行间发丝线的粗度（画在上面那个行盒里） |
| `SKELETON_READING_SCALE` | 2.2 | 主读数尺度（读数 ＝ 页标题 × 2.2，与 `page-head` 同） |
| `SKELETON_VALUE_SLOT_PX` | 64 | 值位列宽上限（窄档可缩，`minmax(0, 64px)`） |
| `SKELETON_MAX_ROWS` | 12 | 行数上限（超了报 `badInput`，不静默夹） |

## 常见错法

- 一排等高灰杠 —— 读的人看不出等来的是什么版式，真数据一进来「啪」地跳一下；
- 转圈圈（spinner）—— 说不出「在等什么、还要多久」，还把版面撑成一个没有形状的方块；
- 骨架行数与真件不符 —— 本件保证不了「不跳版」，剩下一半得调用方自己给对；
- 拿骨架当空态 —— 数据回来了却没有记录，那是 `empty-state` 的活（要说「还没有记录」并给下一步）；
- 给骨架挂点击／挂运行时段 —— 它只是「正在读」的样子，不是控件；
- 把动效做成 `transform` 位移或 `background-position` 之外的属性 —— 判据只放 `opacity`／`background-position` 两样，别的一样都不许动。
