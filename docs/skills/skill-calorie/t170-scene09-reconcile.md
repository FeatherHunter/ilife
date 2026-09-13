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

## 四、结构落点（照 `docs/agents/structure.md`）

- **能力目录**：`packages/skill-calorie/src/body_photo/` —— 目录名取 HELP 一级分组的英文名（`render/helpCenter.ts:73` 与 `triggers/index.ts:30` 都是 `body_photo`）；先例 `src/profile/` ← 基础信息。**建目录与它的第一件真实代码同一次提交**（不建空目录／占位）。
- **文件名取自下一级（子功能／命令操作码）**：`add.ts`／`list.ts`／`detail.ts`／`compare.ts`／`gif.ts`／`remove.ts`／`tag.ts`（照 `calorie.photo.*` 命令段，同 `src/profile/` 的 `setup.ts`／`update.ts`／`view.ts`）。英文名一律照仓内既有说法取，不自创。
- **就地摆正**：`fetch/photos.ts`、`render/photo.ts`、`render/html.ts` 的照片页面段、`render/help.ts` 的照片现找段、`render/wizardPort.ts` 两张照片预检页 —— 随各自票搬进 `src/body_photo/` 并改写引用（逐票在第一步报影响清单）。
- **技能级件不挪**：`src/triggers/help-lookup.ts`（技能级查找入口）与 `render/helpCenter.ts` 的 HELP 数据段 —— 铁律四管不到技能级落点，留给整包重排那张票。
- **共用件**：照片缩略图／GIF 合成先住 `src/body_photo/` 内；**等第二个用法出现再上移**（铁律：共用位是从第二个用法里长出来的，不是预先设计的）。
- **每票必报五步**：第一步影响清单／第二步结构设计（**新建目录层级要用户点头**）／第三步写代码／第四步超线报警／第五步交付对账。
- **其余落点**：跟票的文档住本目录（`docs/skills/skill-calorie/`）；过程草稿住 `.scratch/t170/`；包内一次性脚本住 `packages/skill-calorie/scripts/`。

## 五、本图票单

1. [#170 公共层提取与边界（本文件）](https://github.com/FeatherHunter/ilife/issues/170)
2. 照片进页面（内嵌缩略图）— `src/body_photo/`
3. 4 类页面交付（片段 → 完整文档 ＋ 复制区）
4. 写入类场景的工作流（候选／快照／原标签）
5. 真出 GIF（规划页 → 合成 → 结果页内嵌）
6. SKILL.md 补身材照片工作流（常驻规则 ＋ 包内披露文件）
7. 锁 · 10 条场景真出口用例
8. 真机端到端 ＋ 肉眼终审
