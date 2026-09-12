# #246 · toast 改用老技能深色毛玻璃卡面（交付对账）

> 票：#246（base-paint）。裁定：用户 2026-09-12 在场景 07 讨论中看过两版实物后选「老仓库」。
> 对比页（桌面）：`ilife-scene07\decision-3-copylog-toast.html` —— 两边的样式与结构都取自各自代码产出，不是示意图。
> 结构判据 `docs/agents/structure.md`；配色规格回填 `docs/visual-spec-blocks.md` §B-12。

## 一、影响清单（必报五步 · 第一步）与对账（第五步）

| 目录 | 文件 | 碰它的理由 | 实际 |
|---|---|---|---|
| `packages/base-render/src/` | `style.ts`（toast 区） | 配色正本只有这一处（`CONTROL_STYLE_SECTIONS` 的 `toast` 区） | 同 |
| `docs/base/base-render/`（不在管辖） | `t246-toast-dark.md`（本文件） | 交付对账与裁定记账 | 同 |
| `docs/`（不在管辖） | `visual-spec-blocks.md` §B-12 | 规格正本里原写「视觉取浅色」，须同步 | 同 |

**没有碰的**：`controls.ts`（产出标记与结构一字未动）、`spec/**`（冻结常量不动）、任何技能的页面文件。
偏差为零。

## 二、改了什么（逐值取自老仓 `公共组件/assets/base.js:75` 的 `.hm-toast` 串）

| 项 | 旧（浅色卡面） | 新（老仓深色） |
|---|---|---|
| 底色 | `var(--card)` | `rgba(28, 28, 30, .94)` ＋ `backdrop-filter: blur(20px) saturate(180%)` |
| 主字／副字 | `var(--fg)` / `var(--fg2)` | `#f0f0f0` / `#c8c8cc` |
| 收边 | `1px solid var(--line)` ＋ `var(--shadow)` | 无描边；`0 10px 32px rgba(0,0,0,.32)` ＋ `0 0 0 .5px rgba(255,255,255,.08) inset` |
| 标题 | `var(--fg)` | `#fff` |
| 徽章 ok／warn／danger | `rgba(…,.12)` ＋ 深字（`#1f8f3d`／`#b25000`／`#c0392b`） | `rgba(…,.18)` ＋ 亮字（`#4dd96b`／`#ffb340`／`#ff6961`） |
| 计数 | `var(--fg3)` | `rgba(255,255,255,.08)` 底 ＋ `#c8c8cc` |
| 关闭按钮 | `var(--soft)` ＋ `var(--blue2)` | `rgba(255,255,255,.10)` ＋ `#34c759` |
| 代码块 | `var(--soft)` ＋ `var(--fg2)` | `rgba(0,0,0,.32)` ＋ `#aeb0b8` |
| 操作按钮 | `var(--ok)` | `#4dd96b` |

**几何逐值不动**：圆角 14px、内距 `13px 14px 13px 16px`、`min-width 300`／`max-width 480`、栈间距 8px、
寿命 4500ms、同屏 5（≤820px 收 3）、`role=status`／`aria-live=polite`、「✓ 知道了」。

## 三、三处有意取舍（记账）

1. **`.ilife-toast-danger`**：旧版靠 `border-color` 表达失败，深色面没有描边 → 改成把内影那条 0.5px 细线换成
   `rgba(255, 59, 48, .45)`。失败识别仍以「❌ 图标 ＋ danger 徽章」为主（与老仓同）。
2. **动效仍走 CSS 关键帧**（`ilife-toast-in`，不依赖 JS 加 `.show`）：这是 #75 的既定修法，与老仓的 JS 加类不同，属既有偏离，本次不动。
3. **深色面用字面量而非 token**：本卡不随浅色 token 变，是本区唯一的 token 例外（写进代码注释与 §B-12）。

## 四、验收证据（都是实跑）

| 项 | 结果 |
|---|---|
| `packages/base-render` 包内测试 | **508 条全绿**（含 `style.test.mjs` 的区块规则块断言、`controls.test.mjs` 的 toast 结构与寿命断言） |
| 真页实拍 | `.scratch/current/toast-after/shot-toast.png`（`calorie.view.profile` 结果页 ＋ 点「复制日志」出的深色提示）；无脚本报错、无横向溢出 |
| 影响面 | 跨技能同批生效（calorie／bill／chef／memo／home／schedule 的页面 toast 视觉一起变）——这正是「共享样式区」的定义，用户已看过实物 |

## 五、留给下一半（需用户点头）

**运行时提示与老仓还差两处结构**：`buildSharedHelpersJs` 的 `feedback()` 成功／失败**恒用同一个图标 📋**，
失败时**不带「失败」徽章**；老仓失败提示是「❌ ＋ danger 徽章『失败』＋ 复制失败／长按选择文本手动复制」。
两侧同形化要动**页面运行时产出文本**（冻结面），且 `test/help-shell-136.test.mjs` 有 HELP 壳整体哈希，
故本票只改配色、不擅自改结构——是否补，等用户裁。
