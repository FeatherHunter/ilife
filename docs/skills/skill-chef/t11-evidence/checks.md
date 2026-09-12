# 票 11（`#219`）逐条核对表（含没做到 / 没验的，如实）

| # | 票面／地图要求 | 状态 | 依据 |
|---|---|---|---|
| 1 | 生产目录真跑：`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db` 裸跑 `chef.help.lookup` → 拿到绝对路径 ＋ 产物文件 | ✅ | `run-commands.md` §1；产物 `cook_html\help\私家大厨_HELP_20260912_161114.html`（127,154 B） |
| 2 | 落点与老件的关系（**票面已订正**：老件留 `CookHub\help\`，新件落 `cook_html\help\`） | ✅ | `CookHub\help\` 仍 2 件／164,734 B；`cook_html\` 是本轮新建 |
| 3 | 跑完**不建库／不开库**（票 7 的病灶在真机上的复验） | ✅ | `chef_data.db` mtime 仍是 `2026-08-09T05:38:15.375Z` |
| 4 | DSH 真机技能表可见 `skill-chef`（名＋介绍，可按需读全文） | ✅ | 本会话技能清单里 `skill-chef` 的描述与 `SKILL.md` 逐字相同（新口径「落一份 HELP 文件并回执绝对路径」）；`plugin-chef` 提供方 15/15（`list`→`get` 回路、正文含两处必需串、不带 frontmatter 头） |
| 5 | 两侧视口取图（手机 375px ＋ 桌面） | ✅（**交互部分未覆盖**） | 6 张 PNG 在本目录；`chrome --headless=new` 直开实机产物。**底部 tab 切换、卡片抽屉、搜索框这几项 Headless 到不了**——正好是肉眼终审要看的东西 |
| 6 | 确认观感与卡路里／饼干记账／居家管家**同款** | ✅ | 与 `饼干记账_HELP_20260911_163117.html` 逐区对照（页头徽章＋标题＋「N 场景 · 点击卡片查看详情并复制指令」／「找场景·复制指令·发给AI」三按钮／「搜索全部场景」／卡片 chip＋复制／底部 tab 栏）——`neighbor-bill-mobile-375.png` 与 `help-mobile-375.png` 同框可比 |
| 7 | 内容齐（10 域／33 组／48 卡 ＋ 14 张待开发徽章） | ✅ | `run-commands.md` §5（从落盘那份里 parse 载荷数出来的） |
| 8 | 速查支（显式参数）在真机也跑通、与 HELP 分名 | ✅ | `私家大厨_速查表_20260912_161128.html`（5,041 B，`total=37`） |
| 9 | **维护者肉眼终审「过」** | ⏳ **未达成** | 本票**停在 95%**，等维护者点头；人点头前不关票 |
| 10 | 证据落 `docs/skills/skill-chef/t<本票>-evidence/` | ✅ | 本目录（README／run-commands／checks ＋ 6 张图） |

## 没做到 / 没验的（如实列，不冒充）

1. **没在 DSH 面板／侧栏里点过 HELP 入口**：面板那条路属 #57 那条线；本轮只把技能表可见性与提供方回路跑通。
2. **桥缺省吃空参的问题没验**：`plugin-chef` 的 `readViaCli(key, {})` 会走缺省支 ⇒ 面板每读一次就落一份文件（设计口径如此但**无人认领**）。属插件侧的账，已记进票 8 的遗留，本轮未处置。
3. **真实 npm 安装态没验**：本轮跑的是工作区 `dist`；registry 上 `base-paint@0.3.0` 还缺 `./help-shell`／`./save-html` 两个子路径（`check-registry-exports` 报 FAIL 5 包）——**发布态出本图**，发版后该门应转绿。
4. **没跑 `tooling/check-publish.mjs`**：它要打 13 个 tarball 并在仓外 `npm install`。它对该契约键的断言（`exit 0`／回执是 JSON／`env.key===chef.help.lookup`／`env.data` 非空／`shape` 是字符串）在本次真机跑里**天然满足**（见真机 stdout），但**那道门本身没跑**——不冒充「跑了」。
5. **老件与新品没有逐字比对**：本图开局就定「UI 层不与老 HELP 逐字比对」；内容层面的对账是票 5（`#213`）的账（48/48 逐卡命中）。本轮只核对**数量与徽章数**。
6. **老技能那两份 `私家大厨_HELP*.html` 是历史产物**：`CookHub\help\` 里 2 件、字节数相同（82,367 B ×2，本地时间 08-20 那份 ＋ 一个固定名镜像件），本轮**只读**、未动。

## 复现方式（三步）

```powershell
cd D:\ilife
node node_modules/typescript/bin/tsc --build packages/skill-chef/tsconfig.json      # 只逐包
$env:SKILLS_DB_PATH='D:\2Study\StudyNotes\.db'
node packages\skill-chef\dist\cli\cmd_read.js chef.help.lookup                       # ← 产物在这里
```

> 同一分钟里再跑一次会得到 `…_2.html`（同秒递补、绝不覆盖）；这是设计，不是重复落盘。
