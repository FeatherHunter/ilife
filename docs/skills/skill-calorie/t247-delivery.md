# #247 · 三格式三选一菜单：交付对账

> 票：[#247](https://github.com/FeatherHunter/ilife/issues/247)（`wayfinder:task`）。
> 裁定：**用户 2026-09-12 决策 4A「恢复老仓原样」**——点「复制数据」弹菜单，**纯文本／JSON／CSV 三选一**，
> 选中即复制该格式，并按所选格式报提示。对比页：桌面 `ilife-scene07\decision-2-copyformats.html`。
> 老仓实物：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\crud_receipt.html` 的可点版本 `2262fee1~1`。
> 影响清单与结构设计见同目录 `t247-impact-list.md`。

## 一、做了什么（一句话）

`renderActionBar` 的复制数据那颗按钮多了**三格式形态**：按钮变成「复制数据 ▾ ＋ 三选一菜单」
（三项各带一句用途提示，选中即复制该格式的文本并按格式报提示）；样式、菜单标记与开合行为全在
base-render 侧（`copyButton` 样式区 ＋ 运行时委派），卡路里侧只加了一个「开不开菜单」的开关
（`copyArea` 的 `dataFormats`，**缺省关**）。**场景 07 五张页先接**，其余 45 张页一个字节未动。

## 二、老仓逐值对照（样式与文案）

| 项 | 老仓（`crud_receipt.html`） | 本仓 | 说明 |
|---|---|---|---|
| 菜单定位 | `position:absolute; bottom:calc(100% + 8px); right:0` | 同 | 贴着「复制数据」那颗按钮（本仓多一层贴身包裹层，见 §四） |
| 尺寸 | `min-width:200px; max-width:calc(100vw - 32px); padding:6px` | 同（窄屏改视口定位，见 §四） | 老仓注释原话：「右对齐视口内，手机不超界」 |
| 收边 | `1px solid var(--border)` ＋ `box-shadow:0 8px 24px rgba(0,0,0,.14)` | `1px solid var(--line)`（本仓 token 名）＋ 同投影 | `--border` 与 `--line` 同值 `#d2d2d7` |
| 圆角 | `12px` | **`14px`（偏离 1 处，记账）** | #89 R-9 的 H-10 把全部非图表 CSS 的 `border-radius` 钉在 `{8,14,20,999px,50%}`；14px 是本仓既有卡片圆角（toast 同值），12px 会越出该闭集 |
| 菜单项 | `display:flex; justify-content:space-between; gap:14px; padding:10px 12px; border-radius:8px; font-size:13px` | 同 | `border-radius:8px` 在闭集内，原样 |
| hover | `background:var(--soft)` | 同 | |
| 用途提示 | `.fmt-item span{color:var(--fg3); font-size:11px; white-space:nowrap}` | 同（选择器改显式类名 `.copy-menu-hint`） | 后代选择器会把标签一起染成 11px 灰，故本仓显式分两颗类；跨文件类名检查也要求每个类名指得出产出者 |
| 触发按钮 | 「📋 复制数据 ▾」（`📋` 来自老仓通用按钮字形） | 「复制数据 ▾」 | 本仓菜单形态的开合器**不带 `📋`**：那枚字形在本仓归复制按钮的图标位，加上会与 toast 图标混同 |
| 三项文案 | `纯文本 / JSON / CSV` ＋ `粘贴给 AI / 自己看`·`结构化存档`·`表格导入` | 同 | 卡路里侧 `MENU_HINTS` 逐字取老仓；不给 `hints` 就不出提示行 |
| 选中后提示 | `… 数据复制成功(格式) ✓` | 「数据复制成功（格式）」＋ 详情「粘贴给 AI」 | 格式名由运行时从菜单项标签读回；失败提示照旧「复制失败 ❌＋失败徽章」 |
| 点外收起 | `document` 上「不在 `.fmt-wrap` 里就收起」 | 同效：委派里扫「开着的菜单」并收起 | 另外「点同一行别的复制按钮」也顺手收起 |
| 开合 | JS 改 `style.display` | 加 `copy-menu-open` 类（`opacity`＋`visibility` 过渡） | 用类不用内联样式：零内联脚本是本仓红线，且 `display` 切换会跳过过渡、开合时重排整页 |

## 三、验收（票面三条 ＋ 对抗式自查）

**① 三条测试落库**

| 票面要求 | 落点 | 实测 |
|---|---|---|
| 菜单三项的 `data-t` 分别是三种格式 | `base-render/test/copy-format-menu-247.test.mjs` S1（逐项与 `buildDataText` 对拍）＋ `skill-calorie/test/copy-component-179.test.mjs` ④ | 绿 |
| 选中后 toast 报所选格式 | 同上 B2（三种格式各点一遍：复制的文本是**那一项**的、提示是「数据复制成功（键）」）＋ B6（失败提示不套成功壳） | 绿 |
| 无菜单时产物逐字节不变（46 张页不破） | 同上 S6（逐字钉 `renderCopyBlock`／`renderActionBar` 的单格式产出）；`copy-component-179` ④ 第一条钉 `copyArea({title,data}) === dataCopyArea(...)`；另跑 `tooling/skill-html-snapshot.mjs --check` | 绿（见下） |

**② 46 张页不破的实证（两道）**

- **同构面**：50 处调用点全部经 `copyArea`／`dataCopyArea` → `renderCopyBlock` → `renderActionBar`；
  单格式分支的产出由 S6 逐字钉死，缺省不开菜单（`dataFormats` 不给＝走原分支），故其余页的字节不可能变。
- **仓内对账**：`node tooling/skill-html-snapshot.mjs --check` → `OK: 5 技能 HTML 快照 == 实际（186 件产物）`
  ——base-paint 是 5 个技能共享的，这条覆盖了**别的技能**没被这次改动碰到（`base-*` 文件 27 件指纹不变）。

**③ 测试与门禁**

- `packages/base-render`：**524 条全绿**（含新增 14 条）。
- `packages/skill-calorie`：**439 条 438 通过**，唯一红是 **#180 的有意防回退断言**（账目 733 条，
  改动前后同一条红，已单独核过基线与本次无关）。
- `node tooling/check-boundaries.mjs` → `boundaries: PASS`。
- `npx tsc -b packages/base-render packages/skill-calorie` → exit 0。（`pnpm build` 整体红是
  `packages/skill-chef/src/cli/cmd_read.ts` 报 `Cannot find name 'reuseWindowOfHours'`，
  属另一会话在途的活，与本次无关。）

**④ UI 两档实拍（用户肉眼验收用）**

判据：Chrome headless ＋ CDP，`file://` 打开真产物，390／1440 两档各拍「菜单开」与「选 JSON 后」两张。

| 页 | 390 | 1440 |
|---|---|---|
| 设置档案回执 | `shots/set-390-菜单开.png`／`set-390-选JSON.png` | `shots/set-1440-菜单开.png`／`set-1440-选JSON.png` |

- 横向溢出 **0 件**（两档、开菜单态）；窄屏菜单项触控目标 **44px**（0 件不足）；
  1440 档三颗复制按钮仍 40px——那是 #239 已记账、归 #238 那条待裁的口径，本次不动。
- 提示文案实测：失败路径「❌ 复制失败 ＋ 失败徽章 ＋ 长按选择文本手动复制」（headless 的 `file://` 下
  剪贴板不可用，故拍到的正是失败态）；**成功**路径「数据复制成功（json）」由单测 B2 用 DOM 桩证。

## 四、两处与老仓的**有意**不同（记账）

1. **窄屏（≤820px）改视口定位**：老仓是 `right:0` 贴着按钮组算，本仓宽档模板把按钮组压成
   `max-width:520px` 并由 `margin:auto` 居中——390 档上按钮靠左，200px 的菜单会有一半越到**屏幕左外**
   （点不到也看不到，实测 `x=-91`）。故窄屏改成「左右各留 16px、贴底一行」的浮层
   （`position:fixed; left:16px; right:16px`），恒在视口内；桌面档仍逐值照老仓（`bottom:calc(100%+8px); right:0`）。
2. **多一层贴身包裹层**（`.ilife-copy-menu-wrap`）：本仓复制按钮落在 `.action-row` 的**网格轨道**里，
   网格项默认 `justify-self:stretch` 会被撑满整行——不加这层且不写 `justify-self:start`，菜单的
   `right:0` 就贴到整行右端、离按钮远远的（实测菜单右缘到 980px，按钮右缘在 552px）。这层没有样式负担，
   只负责「菜单跟着按钮走」。

## 五、超线报警（第四步）

`packages/base-render/src/controls.ts` 与 `style.ts` 都在本包既有规模内（controls 1454 行／style 1266 行），
两包**没有新增文件**、没有新增导出、没有新增样式区：**未触发本包告警线**。
（`packages/skill-calorie/src/cli/write.ts` 等既有超线件本次一个字未动。）

## 六、剩下的（下一步）

1. **用户在 390／1440 两档肉眼验收**（`shots/*.png`，ASCII 名）——这是本票验收顺序的第 3 步。
2. 点头后按域铺其余 45 张页（票面验收顺序第 4 步）：那时要重做一次逐字节对账（本票的
   「46 张页不破」是不开菜单的实证；开了菜单的页形态会变，属**有意**变化）。
3. 未做的两条（票面已排除）：复制**日志**不给三格式（维持单格式，与老仓同）；`download`／预览不做。
