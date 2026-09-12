## Question

照 #144 的做法，把「私家大厨help」这条命令的**缺省交付物**做出来。

**用户 2026-09-12 已定的四项**（不再改，直接照用）：

- 落盘目录＝`<SKILLS_DB_PATH>/cook_html/help/`（把老目录 `CookHub/` 换成 `cook_html/`，`help/` 子目录保留；与 `calorie_html/`／`biscuit_accountant_html/`／`home_manager_html/` 同形）。实机展开为 `D:\2Study\StudyNotes\.db\cook_html\help\`；
- 文件名主体＝`私家大厨_HELP`；
- 时间戳通式＝`YYYYMMDD_HHMMSS` ＋ 同秒 `_N` 递补、**绝不覆盖**（**`_N` 从 1 起步**，照老家 `align_08.py:52-65`，不照抄 bill 的 `_2`）；
- **缺省＝HELP 文件**（对 AI 说「私家大厨help」就落盘＋回执绝对路径）。

**落盘动作不再自持**：用户 2026-09-12 裁 **乙**，命名与落盘收成共用位，走 **`saveHtmlFile({ dir, stem, html, onExists? })`**（票 13 `#237`）。本票**只给自己的三个值**——目录／文件名主体／自家渲染好的整页；**不许在 `skill-chef` 里再留一份同逻辑的落盘件**。

要做的事：

- 真跑能拿到文件，产物与上面的通式逐字一致；
- 顶层回执带绝对路径（`delivery{mode,path,bytes}` 这一类）；
- **该命令在开库之前分派**（跑完不建 `.db`）——⚠️ 票 1 实测 chef 今天**说一句 help 就会建库**（`cmd_read.ts:98-99` 在 `:327` 的 help 分支**之前**就开库，实测建出 `chef_data.db` 282,624 B），本票必须把这个顺序摆正；
- 速查支走显式参数（产物名与参数名见下）；
- 端到端验收要过测试隔离守卫 `assertWritablePath`（非 tmp 路径写库须 `CHEF_FORCE_PROD=1`，见 `src/fetch/paths.ts`）。

**速查支的产物名与参数名**：老家没有这一支（老技能只有一个 HELP），卡路里给了 `卡路里_速查台_<TS>.html`、记账给了 `饼干记账_速查表_<TS>.html`。**本票自裁**，照 `onExists` 与命名通式对齐即可（票 4 不再裁这一项）。

**结构按新代码架构规则**：第一步「影响清单」与第二步「结构设计」先报用户点头；被碰到的旧件就地摆正；交付时报第五步「交付对账」；超告警线当场报。

⚠️ **本票会碰到两个已超线件**（用户 2026-09-12 定案 350 ＋ LF 口径，实测值）：`src/cli/cmd_read.ts` **LF 388**、`src/fetch/db.ts` **LF 451**。开工前须当场报「已超线，需要根据规则进行重构。」并给拆法或说明本次为什么先不拆。告警线要写进 `packages/skill-chef/AGENTS.md`（该文件今天不存在）。

顺带摆正：`packages/skill-chef/scripts/build-help.mjs:13` 从 `CHEF_KEY_SHAPES` 派生命令名，`:17` 却把「8 联动」写死——同一个数字的第二份拷贝（铁律二），本次必动这个文件，顺手改成派生。另注意该脚本从 `../dist/index.js` 导入，**必须先 build 才能跑**。

## 进度：0%

下一步：等票 12（`#236` 结构设计闸门，待用户点头）＋票 13（`#237` 共用件 saveHtmlFile）关票。
