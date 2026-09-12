# 票 11（`#219`）真机端到端证据——私家大厨 HELP

**跑的时刻**：2026-09-12 16:11（本地）
**实机库目录**：`SKILLS_DB_PATH = D:\2Study\StudyNotes\.db`（User 级环境变量，实机取值）
**产物（本次要维护者终审的那一份）**：

```
D:\2Study\StudyNotes\.db\cook_html\help\私家大厨_HELP_20260912_161114.html   （127,154 B／2,055 LF）
```

> ⚠️ **票面订正**：本票票面原写「与老的两份 `私家大厨_HELP*.html` 并排落在同一目录 `CookHub/help/`」——那是**旧口径**。用户 2026-09-12 已把落盘位置改判为 `<SKILLS_DB_PATH>/cook_html/help/`（与 `calorie_html/`／`biscuit_accountant_html/` 等同形）。实机结果是：**老两份原封不动留在 `CookHub\help\`，新产物落 `cook_html\help\`**；「并排」只对同族的 `*_html/help/` 成立。

## 结论（机械部分）

| 判据 | 读数 | 结果 |
|---|---|---|
| 裸跑拿到文件 ＋ 绝对路径 | `exit 0`；`delivery.path` ＝ 上面那条绝对路径，`delivery.bytes=127154` | ✅ |
| 文件真的在、大小＝回执 | 实测 127,154 B（写后回读值与回执一致） | ✅ |
| **跑完不建库、也不开库** | `chef_data.db` 的 mtime 仍是 `2026-08-09T05:38:15.375Z`（跑之前就在、跑完一字未动） | ✅ |
| 老件未被动 | `CookHub\help\` 仍是 2 件、合计 164,734 B | ✅ |
| 页面＝通用 help 模板 | 与 `base-paint/help-shell` 的前后缀逐字一致（截图见下；与记账 HELP 同一套 UI） | ✅ |
| 内容齐 | 载荷 10 域／33 组／48 卡；`title=私家大厨 HELP · 能力速查`；14 张「待开发」徽章；`subtitle=10 功能域 · 48 场景 · 版本 0.1.0 · 更新于 2026-09-12 16:11` | ✅ |
| 速查支 | `--params '{"mode":"lookup"}'` ⇒ `exit 0`，落 `私家大厨_速查表_20260912_161128.html`（5,041 B，与 HELP **分名**），载荷 37 条 | ✅ |
| DSH 技能表可见 `skill-chef` | 本会话的技能清单里 `skill-chef` 的描述与 `SKILL.md` 逐字相同（说「落一份 HELP 文件并回执绝对路径」）；`plugin-chef` 提供方测试 **15/15 绿** | ✅ |

## 要维护者肉眼终审的事（本票唯一的关票条件）

1. **打开这一份**：`D:\2Study\StudyNotes\.db\cook_html\help\私家大厨_HELP_20260912_161114.html`（双击即可）。
2. 看**观感**：页头／搜索框／卡片／底部 tab（11 个 ＝ 10 域 ＋ 关于）／点开卡片出抽屉 —— 是否与**卡路里／饼干记账／居家管家**同款（同款对照件：`D:\2Study\StudyNotes\.db\biscuit_accountant_html\饼干记账_HELP_20260911_163117.html`）。
3. 看**内容**：48 张卡是否把老技能的能力讲全了（老件留档：`D:\2Study\StudyNotes\.db\CookHub\help\私家大厨_HELP_20260820_154416.html`；UI 不必与老件逐字比对——这是本图开局就定的口径）。
4. 逐项裁决历史（如 `title` 取老家原文「私家大厨 HELP · 能力速查」）与 14 张「待开发」徽章，是否**点头**。

## 本目录里有什么

| 件 | 是什么 |
|---|---|
| `run-commands.md` | 跑的命令 ＋ 原始 stdout／stderr／读数（可复现） |
| `checks.md` | 逐条核对表（含没做到／没验的，如实） |
| `help-mobile-375x900.png` | 手机视口（375×900）——首屏与底部 tab |
| `help-mobile-375.png` | 手机视口（375×2600，整屏长图） |
| `help-desktop-1440x900.png` | 桌面视口（1440×900） |
| `help-desktop-1440.png` | 桌面视口（1440×2200，整屏长图） |
| `lookup-mobile-375.png` | 速查表那一支的产物（手机视口） |
| `neighbor-bill-mobile-375.png` | 邻居同款对照：`饼干记账_HELP`（同一套 help 模板） |

**截图怎么来的**：`chrome --headless=new --screenshot --window-size=…` 直接打开上面那份实机产物（无修图、无注入脚本）。**底部 tab 的切换与卡片抽屉要人点**——Headless 截图只到首屏，交互部分正是肉眼终审要看的东西。
