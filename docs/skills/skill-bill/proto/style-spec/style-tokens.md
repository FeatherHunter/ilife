# 票据纸设计语言 · style-tokens（地图 1003 / 子票 1005）

来源（冻结）：`docs/skills/skill-bill/t993-过程/bill-993-proto-receipt-7222-v5.html`（下称 receipt-v5）、
同目录 `bill-993-proto-detail-7222-v7.html`（下称 detail-v7）；
皮肤实现 `packages/base-render/src/components/skin/skins/ticket.ts`（下称 ticket.ts）；
`docs/agents/视觉验收墙.md` §6.3 是手机墙生成器形制（iframe 真产物／成对出／整体缩／几十格舒适区），
与票据纸形制无关，本文件不转录，只记此结论。

> 优先级：两原型是视觉真值；ticket.ts 是同一套语言的 token 化实现，
> 有三处为过对比度地板压深（见 §1 末），5 组原型照本文件取，
> 颜色字面以 ticket.ts 为准、形状字面以原型为准。

## 1 色板（18 色 · 与 ticket.ts `TICKET_VALUES` 一一对应，共 34 token 中的 18 色）

| token | 值 | 原型对应 | 说明／压深取舍 |
|---|---|---|---|
| `ground` | `#efe9dd` | `--bg` | 暖奶油桌底，两原型逐字节同 |
| `surface` | `#fffdf7` | `--paper` | 暖白纸面 |
| `surface-2` | `#f7f1e3` | `--paper-edge` | 次要面（entry-card 底 `#fbf7ec` 另见 §5） |
| `line` | `#e9dfcd` | `--line` | 分隔线／虚线／卡片边 |
| `edge` | `#eadfcb` | 原型无此号（纸边即 `line`） | ticket.ts 新增：比 `line` 亮一档，撕口＋裁切线同纸时不糊 |
| `ink` | `#2b2620` | `--ink` | 主墨 |
| `ink-2` | `#665f57` | `--muted:#8a8175` 压深 | 原型 muted 压桌面仅 3.17，过不了三档文字 ≥4.5；色相饱和不动、只降明度（地面 5.20）。次文字多压一档，为与 `ink-3` 拉开 |
| `ink-3` | `#736755` | `--faint:#b8ae9f` 压深 | 原型 faint 压桌面仅 1.81；压深后地面 4.57 |
| `accent` | `#b4552d` | `--accent` | 砖红主色（sec-heading 色条、tag 字） |
| `accent-text` | `#a3461f` | 原型无 | accent 的文字态（ticket.ts 新增，纸上小字用） |
| `accent-ink` | `#fffdf7` | 原型无（=纸色） | 反白字（主按钮字） |
| `accent-soft` | `#fbe4d4` | `--accent-soft:#fdf0e6` 重取 | 原型软底与 `surface-2` 只差 6 通道，过不了选中底 ≥12 通道地板；按 accent 暖淡洗重取（差 15 通道、对 `ink-3` 4.51:1）。原型两页的 `.tag` 实际不出此色，不影响冻结观感 |
| `ok` | `#1e784c` | `--green:#1f7a4d` 压深 | 原型绿压桌面 4.40 → 压到 4.52（改动肉眼不可辨） |
| `ok-soft` | `#e7f5ec` | `--green-bg`（仅 v7） | 对账底／有效章底 |
| `warn` | `#7b5010` | 原型无 | ticket.ts 新增（土黄警告档） |
| `warn-soft` | `#fbf1dc` | 原型无 | 配 `warn` |
| `danger` | `#8c2a1f` | `--red:#c0392b` 压深 | 原型红压桌面 4.50 且与 accent 只差 1.11（危险档须与主色分开）；压深后对桌面 7.04、对 accent 1.73 |
| `danger-soft` | `#f9e8e4` | 原型无 | 配 `danger`（主按钮渐变 `#d34a35→#b93222` 仍照原型字面，不在此 token 内） |

原型另有 `--pill:#f3ecdc`（eyebrow 药丸底）、点线 `#d9cdb4`、裁切虚线 `#d9cdb4`、
tag 边 `#f0d7c2`、有效章边 `#bfe3cc`：均为一次性字面，不进 token，照抄。

## 2 形状：圆角 16／投影两层／撕口齿边锯齿

| token | 值 | 用法 |
|---|---|---|
| `radius` | `16px` | 纸面 `.sheet-frame` 圆角（与 paper 皮肤的方角小票是两种材料） |
| `radius-sm` | `10px` | entry-card 内高亮行等小卡（原型 `12px/10px`：entry-card 12、check-mini 10、pay 行 10——统一收敛到 `radius-sm`，仅 entry-card 外框保留 12px 原型字面） |
| `radius-pill` | `999px` | eyebrow／tag／status 药丸 |
| `shadow` | `0 18px 50px rgba(80,60,30,.18), 0 2px 0 rgba(120,90,40,.08)` | 纸体两层柔和投影，经 `filter:drop-shadow()` 落在 `.sheet-wrap`（非 box-shadow，撕口锯齿外也吃影） |
| `shadow-pop` | `0 12px 28px rgba(80,60,30,.18)` | 复制菜单浮层 |

撕口（左右）：宽 14px，`radial-gradient(circle at 7px 10px, ground 5.5px, transparent 6px)`，
`14px×20px` 纵向平铺，右缘镜像。页脚锯齿：高 12px，
`linear-gradient(±45deg, transparent 8px, paper 0)` 以 `16px` 为瓦片双层拼、整体 `rotate(180deg)`，
两侧各留 6px。裁切线：12px 字＋两侧 `2px dashed #d9cdb4`，文案 `✂ 裁切线` 原样保留。

## 3 字号层级（结论标题／主数字／段／行／注）

| 层级 | 字面 | token 对照 |
|---|---|---|
| 纸头品牌行 | 11.5px／w700／字距 2px／`ink-2` | `fs-xs` |
| 结论标题（改后落点／账单详情） | 19px（≤390px 时 18px）／w800／行 1.4 | `fs-h2`（18px 就近） |
| 主数字 | 56px（≤390px 时 50px）／w900／字距 -1.5px／行 1，单位 18px／w800／`ink-2` | 无专用 token，一页唯一、照抄；`fs-h1`(28px) 不用于此 |
| 副题／落点注 | 12.5–13.5px／行 1.6 | `fs-sm`（13px）就近 |
| 段标题 sec-heading | 13px／w800／字距 1.5px＋左 4×14px `accent` 色条＋右英文编号 `ink-3` | `fs-sm` |
| 账本行 ledger-rows | 14px／行 1.4–1.55，左键 `ink-2`、右值 w700、中间 `2px dotted #d9cdb4` 点线下沉 5px | 正文 15px 压到 14px 是原型字面，照抄 |
| 明细／备注 | 14px／行 1.5–1.55；备注前缀 `备注 · `（`ink-3` w800）；实付行加粗＋浅底 `#fff8ee` | 同上 |
| 页注（口径／裁切／页脚） | 11.5–12px／`ink-2/ink-3` 居中 | `fs-xs`（12px） |

## 4 间距节奏

`space:16px`／`pad-x:28px`。纸内 `22px 28px 10px`（≤390px 时 `18px 22px 8px`）；
虚线分隔 `margin:14px -8px`；纸幅 `max-width:440px`；
行内 `padding:9px 0`；actions 区 `padding:14px 0 4px`；
copy 区 `margin-top:10px`、菜单 `bottom:calc(100%+8px)` 内垫 6px。

## 5 数字字体（无衬线 vs 等宽取舍）

原型是**混用**：主数字／落点值用无衬线栈＋`tabular-nums`；
时间戳（summary-time）、`.mono` 编号／时间、实付 `.amt` 用等宽栈
`ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`。
ticket.ts 把 `font / font-num / font-display` 三 token 收敛为**同一支无衬线栈**
（层次靠投影与底色块，不靠等宽数字）——这是待用户裁的三条之一（见 §8），
本规格沿用原型混用现状，5 组照原型抄。

## 6 按钮与复制菜单形态

- 主按钮：整宽 `min-height:48px`，`radius:13px`，16px／w800，
  渐变 `#d34a35→#b93222` 白字，内高光＋`0 8px 20px rgba(185,50,34,.28)`。
- 次按钮：整宽 `min-height:44px`，白底 `#ddd0b6` 1.5px 边，14.5px／w800。
- 复制菜单：浮层白底 1.5px 边 `radius:12px`＋`shadow-pop`；
  菜项整宽 `min-height:44px`，13.5px／w700＋右 11.5px 弱注，hover `#faf5e9`。
- 最小触摸目标 44px：按钮／菜单项／账本行（v7 `min-height:44px`）一致。
- 复制行为（逻辑约束，非样式）：复制数据三选一（纯文本／JSON／CSV 各自独立载荷），
  复制日志独立一颗；菜单开合 `aria-expanded`，点外关闭。

## 7 给 5 组原型的复用约束

1. **一数一处**：金额／分类／时间任一读数在纸内只印一遍
  （v7 示范：summary-head 出金额后，账本区不再重印金额／分类／时间，只印编号／账户／账本／币种／双时间戳／状态）。
2. **答案先行**：纸头＝品牌行＋一句话结论标题，结论下直接跟一页唯一大数字，
   明细与口径一律沉底。
3. **复制三选一载荷原样**：三格式文本与 `TEXT/JSON_T/CSV_T/LOG_T` 四载荷结构不变，
   只换对应场景的字段值；`复制数据 ▾` 三角字样沿用（待裁，见 §8）。
4. **退出口 HELP 式 prompt 不变**：回执面只给撤销／复制／日志动作，不加导航与新入口。
5. **纸外只留页注**：纸体外除 `.foot-note`（快照＋装配顺序＋触摸说明）不加任何区块；
   背景径向渐变＋双端 padding 照抄。

## 8 与原型不一致、仍待用户裁的三条（本文件均沿用原型现状）

| # | 分歧 | 本规格取值 | 待裁问题 |
|---|---|---|---|
| 1 | 数字字面 | 沿用原型混用（主数字无衬线＋时间戳等宽） | 是否收敛到 ticket.ts 的纯无衬线栈？ |
| 2 | 复制三角 | 沿用 `复制数据 ▾`（`▾` 字形＋`aria-expanded`） | 三角符号是否保留／换形？ |
| 3 | 品牌行 | 沿用纸内首行 `饼干记账 · <场景>`（11.5px 字距 2px） | 5 组是否保留品牌行，还是收敛为统一纸头？ |

token 表条数：34（§1 色 18＋§2 形 5＋字体栈 3＋字号 6＋间距 2，与 `TICKET_VALUES` 逐项对应）。
