# t170 场景 09 身材照片：对账与边界

> 本文件是 [图 #159](https://github.com/FeatherHunter/ilife/issues/159) 首发票 [#170](https://github.com/FeatherHunter/ilife/issues/170) 的交付物：**10 个场景 × 底层唤醒词 × 命令 × 页面 × 工作流**四列对照表 ＋ 页面归类 ＋ 公共层增量 ＋ 结构落点。
> 口径：**以老技能的设计思想为准**（用户 2026-09-13 裁定：老技能的决策都经过审核）。老技能出处：`SKILLS\卡路里\SKILL.md:1185-1272`、`templates\body_photo_*.html`、`scripts\render_body_photo_*.py`。
> 用词照 `docs/agents/wording.md`；结构照 `docs/agents/structure.md`。

## 一、四列对照表（10 个场景）

| # | 场景（HELP 唤醒词） | 底层唤醒词 → 命令 | 产出页面 | 老技能当年怎么做的（已核准） | 新仓现状 |
|---|---|---|---|---|---|
| 1 | 存一张照片 | 记身材照 → `calorie.photo.add` | 回执页 | `render_body_photo_receipt.py --live-add <照片…> --tag <标签>`；回执**内嵌缩略图** | 回执数据齐（`buildAddReceipt`），页面无图、是片段 |
| 2 | 存照片（含备注） | 记身材照 → `calorie.photo.add`（`--note`） | 回执页 | 同上 ＋ 备注 | 同上 |
| 3 | 批量存照片 | 记身材照 → `calorie.photo.add`（多 `srcPaths`） | 回执页 | 连发多张＝批量；`items[]` 逐张状态 | 同上（逐张状态有） |
| 4 | 看身材照 | 查身材照 → `calorie.photo.list` | 画廊页 | `render_body_photo_gallery.py --days/--start/--end/--tag`；网格＋总数＋标签计数＋距上次拍照；**内嵌缩略图** | 数据齐，页面无图、是片段 |
| 5 | 对比两张照片 | 对比两张照片 → `calorie.photo.compare` | 对比页 | `--id1 --id2`；并排＋间隔天数＋跨标签警告；**内嵌** | 数据齐，页面无图、是片段 |
| 6 | 生成身材照 GIF | 生成身材照GIF → `calorie.photo.gif` | GIF 结果页（前置 GIF 规划页） | 规划页框选 → `--crops` 坐标 → **真出 GIF**，结果页内嵌 `gif_data_base64` | 规划页已有；结果页只出任务描述，不出文件 |
| 7 | 删身材照 | 删身材照 → `calorie.photo.remove` | 回执页（＋快照） | **先列候选 → 快照确认 → 回执**（物理删，不可恢复） | 一条写命令直接删；无候选、无快照 |
| 8 | 改照片标签 | 改照片标签 → `calorie.photo.tag`（`op=set`） | 回执页 | 覆盖整套（可多个）；改前/改后；**至少保留 1 个** | 回执有 `tagDiff`；无「先看原标签」的页 |
| 9 | 加照片标签 | 加照片标签 → `calorie.photo.tag`（`op=add`） | 回执页 | 追加、判重、已存在即提示 | 同上 |
| 10 | 删照片标签 | 删照片标签 → `calorie.photo.tag`（`op=remove`） | 回执页 | 移除（可多个）；删空报错，清空用「改照片标签」 | 同上 |

**命令面结论：10 个场景 ← 7 条命令，本图 0 条缺口**（老表 95 条「没有命令可执行」名单里，本场景一条都没有）。要新增命令只在两处：删身材照的候选＋快照页、GIF 合成。

## 二、老技能已核准的模块级决定（照做，不重新讨论）

| 编号 | 决定（老技能原文要点） | 出处 | 新仓现状 | 本图落点 |
|---|---|---|---|---|
| D1 | HTML **默认 base64 嵌图**（PIL 缩放到 800×1200 · q85），理由「飞书／IM／任意环境打开都能看照片，不被本地路径限制」 | `SKILL.md:1269-1271` | 反过来：「只 render 文件名 ＋ fileExists 位，不嵌 base64」 | 票 2 |
| D2 | **发图/路径双模式**；文字与图片**分离到达**处理（文字先到→等待图片；图片先到→追问上下文；**同轮所有图片＝本次要存的照片**） | `SKILL.md:1198-1210` | SKILL.md 无 | 票 4、票 6 |
| D3 | 标签**硬规则必填**，缺标签**逐张追问** | `SKILL.md:1210` | SKILL.md 无 | 票 4、票 6 |
| D4 | 多标签模型：逗号分隔、单个 ≤20 字、单张 ≤10 个；**改＝覆盖整套／加＝追加判重／删＝移除且至少保留 1 个** | `SKILL.md:1212-1215` | 命令有 `op=set/add/remove`；规则不在 SKILL.md | 票 4、票 6 |
| D5 | GIF 规划页带框选 ＋ `--crops` 坐标 schema（key＝照片 ID，value＝`[x1,y1,x2,y2]`） | `SKILL.md:1217-1231` | 规划页出参已覆盖（时长/循环/宽高/水印/转场/输出名/框选） | 票 5 |
| D6 | 删身材照三步：**先列候选 → 快照确认 → 回执** | `SKILL.md:1193` | 无 | 票 4 |
| D7 | 交付：跑完渲染**必须主动把 HTML 交给用户**，不只给路径（原文飞书优先） | `SKILL.md:1233-1265` | 新仓口径＝落盘 ＋ 回执绝对路径 | 票 6（思想保留，机制按本环境：把文件交给用户） |
| D8 | 失败也出**错误回执 HTML**（操作名／原因／关键数据／建议／复制修正 prompt／复制数据／复制日志） | `SKILL.md:1267` | 错误回执已有（`render/html.ts` 的 photo error 页），形状待对 | 票 3 |

## 三、页面归类（本图那一份，全批最后人工收口）

| 类别 | 服务场景 | 老实物 | 归谁管 |
|---|---|---|---|
| 回执页 | 1、2、3、7、8、9、10（7 个场景） | `body_photo_receipt.html`（12.5 KB，内嵌缩略图） | 卡路里公共层（回执类） |
| 画廊页 | 4 | `body_photo_gallery.html`（11.2 KB） | 卡路里公共层（照片结果类） |
| 对比页 | 5 | `body_photo_compare.html`（7.1 KB） | 卡路里公共层（照片结果类） |
| GIF 结果页 | 6 | `body_photo_gif_result.html`（6.0 KB，内嵌 GIF） | 卡路里公共层（照片结果类） |
| 预检确认页（已建） | 1、2、3（照片预检）／4、6（GIF 规划） | `body_photo_log_wizard.html`（11.3 KB）／`body_photo_gif_planner.html`（26.9 KB） | 卡里公共层（预检类） |
| 选择／快照页（本图新建） | 7、8、9、10 | `body_photo_viewer.html`（8.0 KB） | 卡路里公共层（预检类） |

## 四、结构落点（2026-09-13 重写：底座已换形状，#293 收口）

**底座这一版把「命令登记与分派」整段做完了**（#294 接缝／#295 生成物／#313 路由声明／#314 场景搬迁）。本图在此基础上做，**不新建能力目录**：

- **能力目录已存在**：`packages/skill-calorie/src/photo/`（16 件）。目录名＝HELP 一级分组英文名（`render/helpCenter.ts:73`／`triggers/index.ts:30` 同说法）；参考实现 `src/weight/`。
- **命令已搬完**：`src/photo/commands.ts` 10 条声明（**权威源**，六字段含必填 `example`）；`src/photo/routes.ts` 路由声明；对外门 `src/photo/index.ts` 出三件（命令声明 ＋ 读入口 ＋ 写入口）。`src/cli/legacy/scene-09.ts` 与 `legacy/routes/scene-09.ts` 均已清空（**只搬空、不删文件**）。
- **本图只在 `src/photo/` 内加件／改件**，文件名取子功能／操作码（既有：`store`／`gallery`／`compare`／`manage`／`wizard`／`dir`／`photo`／`photos`／`help*`）。
- **新增命令**＝改两处：`src/photo/commands.ts` ＋ `src/photo/routes.ts`（都要含可执行 `example`），再走生成链 `pnpm build → pnpm gen → pnpm build → pnpm help:build`；`src/cli/legacy/**` 与 `src/triggers/routing.ts` **零接触**；棘轮文件**不加 case**（新增命令住能力目录）。动路由声明前抢 `gate.lock` 并广播。
- **共用件**：整页装配 `src/shared/docPage.ts`、复制区 `src/shared/copyArea.ts`（已在用）；新的照片缩略图件**先住 `src/photo/`**，第二个用法出现再上移。
- **技能级件不挪**：`src/triggers/help-lookup.ts` 一类技能级入口留给整包重排那张票。
- **每票必报五步**；**票面五段固定**（目标／验收命令／不许动的东西／交付物路径／遗留出口）。
- **其余落点**：跟票文档住 `docs/skills/skill-calorie/`；过程草稿住 `.scratch/t170/`；包内一次性脚本住 `packages/skill-calorie/scripts/`。

## 五、本图票单（2026-09-13 按新底座重切：按判据切，不按目录／功能块切）

| 序 | 票 | 一条判据（能跑出真假） | 被谁阻塞 |
|---|---|---|---|
| 0 | 形状验证（最小票）：`看身材照` 一条命令切成完整文档 ＋ 复制区，其余 9 条产物不变 | 真跑 `calorie.photo.list` 断言文档头／复制区，且九页 sha256 不变 | — |
| 1 | 照片进页面（内嵌缩略图） | 三类页面 HTML 里出现 `data:image/` | 票 0 |
| 2 | 其余页面铺开（对比／GIF 结果／回执 7 条场景） | 10 条命令逐条产物都是完整文档 | 票 0、票 1 |
| 3 | 删身材照的候选与快照（新增一条只读命令） | 新命令产出含候选与 `data:image/` 的页面；`gen:check` 绿、探针 `UNACCOUNTED` 空 | 票 0、票 1 |
| 4 | 真出 GIF | 跑完磁盘多一个非空 `.gif` 且页面里嵌着它 | 票 0 |
| 5 | SKILL.md 补身材照片工作流（常驻规则 ＋ 包内披露文件） | 指针行在 ＋ 披露文件 10 个场景在册 | — |
| 6 | 真机端到端 ＋ 肉眼终审 | 用户在全新空白 session 逐条念，产物肉眼过 | 票 1–5 ＋ 装机 |

旧的「锁 · 真出口用例」一票不再单列：判据与自证随每张票走（编排纪律：要自证不要自述），另以命令自治探针为总门。
