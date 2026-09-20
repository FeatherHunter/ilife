# 新备忘录技能（packages/skill-memo-ilife）现状盘点

调查人：调查员（只读席）。调查日：本会话当刻。代码基线：工作区当刻盘上内容（未切分支、未写仓库任何文件）。
本报告是本席**唯一落盘物**（`docs/skills/skill-memo-ilife/research/new-memo-current-state.md`）。

**口径三条**（先说清，免得读的人把三类数混着看）：

- 行数一律 **LF 口径**：`readFileSync(f,'utf8')` 后数 `\n` 的个数（与 `packages/skill-memo-ilife/AGENTS.md:7` 的告警线数法同口径）。不是记事本行数，也不是文件字节数。
- 所有「30 场景」的数取自**HELP 内容资产**（`src/help/scenes/*.ts`，8 个域文件）；所有「命令 key」的数取自**出口分派层**（`src/cli/cmd_read.ts`）与**形状表**（`src/render/envelope.ts`）。这两套数**不是同一件事**，两者之间只有部分映射（见 §3 末）。
- 标 `[推断]` 的是本席按代码结构推的，不是直读到的字面；其余每条都给了「文件路径:行号」或函数名。

---

## 0. 一句话现状

新备忘录包已把「HELP 交付」（8 域／13 二级组／30 场景资产 → 共享 help 壳 → 落盘回执）与「心愿类合成写」（`src/wish/`）两条线做圆了；但 **30 个场景里只有 4 个在缺省调用下会落 HTML 产物**（批量改分类向导／完成心愿向导／心愿排期向导／同步报告），另有 **2 份模板（`memo_query`／`init_report`）零接线**，**1 个场景（`memo_init_setup`）连命令 key 都没有**；命令事实散在 5 处、`src/` 下 6 个目录里只有 `wish/` 一个合仓规铁律四（名字取自 HELP），`health.ts`／`cmd_read.ts`／`gen-help-assets.mjs` 三件超 350 行告警线。

---

## 1. HELP 的 8 域 / 13 二级组 / 30 场景完整清单

### 1.1 总表（一行一场景；出处＝该场景 `id:` 的所在行）

| # | 域 id | icon | 域 label | 二级组 id | 二级组 label | 场景 id | `wake` | `title` | `types` | 字段数 | 出处（文件:行，`id:` 行） |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | memo | 📝 | 备忘类 | memo_1 | 基础记录 | memo_add_basic | 记备忘 | 添加一条备忘笔记 | 采集+回执 | 4 | `src/help/scenes/memo.ts:33` |
| 2 | memo | 📝 | 备忘类 | memo_1 | 基础记录 | memo_update_basic | 改备忘 | 修改已有笔记 | 采集+回执 | 4 | `src/help/scenes/memo.ts:48` |
| 3 | memo | 📝 | 备忘类 | memo_1 | 基础记录 | memo_delete_basic | 删备忘 | 删除笔记 | 采集+回执 | 3 | `src/help/scenes/memo.ts:62` |
| 4 | memo | 📝 | 备忘类 | memo_2 | 分类调整 | memo_change_category_single | 备忘改分类 | 修改单条笔记的顶层分类 | 采集+回执 | 3 | `src/help/scenes/memo.ts:81` |
| 5 | memo | 📝 | 备忘类 | memo_2 | 分类调整 | memo_change_subcategory | 备忘改子分类 | 修改单条笔记的子分类 | 采集+回执 | 2 | `src/help/scenes/memo.ts:94` |
| 6 | memo | 📝 | 备忘类 | memo_2 | 分类调整 | memo_batch_change_category | 备忘改分类 | 批量改分类(网页向导) | 向导+采集+回执 | 3 | `src/help/scenes/memo.ts:107` |
| 7 | search | 🔍 | 查找类 | search_1 | 基础查找 | memo_search_keyword | 搜备忘 | 按关键词搜索笔记 | 查看+回执 | 4 | `src/help/scenes/search.ts:33` |
| 8 | search | 🔍 | 查找类 | search_1 | 基础查找 | memo_search_alias | 查备忘 | 搜备忘的别名(同义触发) | 查看+回执 | 1 | `src/help/scenes/search.ts:47` |
| 9 | search | 🔍 | 查找类 | search_1 | 基础查找 | memo_get_detail | 看备忘 | 查看单条笔记详情 | 查看+回执 | 1 | `src/help/scenes/search.ts:58` |
| 10 | search | 🔍 | 查找类 | search_2 | 时间查找 | memo_search_by_date | 按时间搜备忘 | 按日期范围搜索笔记 | 查看+回执 | 3 | `src/help/scenes/search.ts:75` |
| 11 | search | 🔍 | 查找类 | search_3 | 分类查找 | memo_search_wish | 查心愿 | 查所有心愿(自动带分类过滤) | 查看+回执 | 2 | `src/help/scenes/search.ts:94` |
| 12 | search | 🔍 | 查找类 | search_3 | 分类查找 | memo_search_checkin | 查打卡 | 查所有打卡记录 | 查看+回执 | 1 | `src/help/scenes/search.ts:106` |
| 13 | search | 🔍 | 查找类 | search_3 | 分类查找 | memo_search_mood | 查情绪 | 查所有情绪日记 | 查看+回执 | 1 | `src/help/scenes/search.ts:117` |
| 14 | remind | ⏰ | 提醒类 | remind_1 | 创建提醒 | memo_remind_with_note | 记提醒 | 添加笔记 + 设置提醒(两步合一) | 采集+回执 | 4 | `src/help/scenes/remind.ts:33` |
| 15 | remind | ⏰ | 提醒类 | remind_1 | 创建提醒 | memo_remind_existing | 设提醒 | 给已有笔记加提醒 | 采集+回执 | 5 | `src/help/scenes/remind.ts:47` |
| 16 | remind | ⏰ | 提醒类 | remind_2 | 查看提醒 | memo_reminders_active | 看提醒 | 查看所有有效提醒 | 查看+回执 | 1 | `src/help/scenes/remind.ts:68` |
| 17 | remind | ⏰ | 提醒类 | remind_2 | 查看提醒 | memo_completed_reminders | 查已提醒备忘 | 查询已触发的提醒与对应打卡 | 查看+回执 | 0 | `src/help/scenes/remind.ts:80` |
| 18 | wish | 🎯 | 心愿类 | wish_1 | 心愿推进 | memo_complete_wish | 完成心愿 | 把心愿标记为已完成(转成打卡记录) | 向导+采集+回执 | 2 | `src/help/scenes/wish.ts:33` |
| 19 | wish | 🎯 | 心愿类 | wish_1 | 心愿推进 | memo_wish_schedule | 心愿排期 | 给心愿设排期日期(同步到飞书) | 向导+采集+回执 | 2 | `src/help/scenes/wish.ts:46` |
| 20 | wish | 🎯 | 心愿类 | wish_2 | 心愿管理 | memo_add_wish | 记心愿 | 快速添加心愿(自动心愿分类) | 采集+回执 | 4 | `src/help/scenes/wish.ts:64` |
| 21 | wish | 🎯 | 心愿类 | wish_2 | 心愿管理 | memo_delete_wish | 删心愿 | 删心愿(自动心愿分类过滤) | 采集+回执 | 1 | `src/help/scenes/wish.ts:78` |
| 22 | wish | 🎯 | 心愿类 | wish_2 | 心愿管理 | memo_update_wish | 改心愿 | 改心愿(自动心愿分类过滤) | 采集+回执 | 2 | `src/help/scenes/wish.ts:89` |
| 23 | checkin | ✅ | 打卡类 | checkin_1 | 基础 | memo_add_checkin | 记打卡 | 快速添加打卡(自动打卡分类) | 采集+回执 | 3 | `src/help/scenes/checkin.ts:33` |
| 24 | checkin | ✅ | 打卡类 | checkin_1 | 基础 | memo_delete_checkin | 删打卡 | 删打卡(自动打卡分类过滤) | 采集+回执 | 1 | `src/help/scenes/checkin.ts:46` |
| 25 | checkin | ✅ | 打卡类 | checkin_1 | 基础 | memo_update_checkin | 改打卡 | 改打卡(自动打卡分类过滤) | 采集+回执 | 2 | `src/help/scenes/checkin.ts:57` |
| 26 | mood | 💭 | 情绪类 | mood_1 | 基础 | memo_add_mood | 记情绪 | 快速添加情绪日记(自动情绪日记分类) | 采集+回执 | 2 | `src/help/scenes/mood.ts:33` |
| 27 | mood | 💭 | 情绪类 | mood_1 | 基础 | memo_delete_mood | 删情绪 | 删情绪(自动情绪日记分类过滤) | 采集+回执 | 1 | `src/help/scenes/mood.ts:46` |
| 28 | mood | 💭 | 情绪类 | mood_1 | 基础 | memo_update_mood | 改情绪 | 改情绪(自动情绪日记分类过滤) | 采集+回执 | 2 | `src/help/scenes/mood.ts:58` |
| 29 | sync | 🔄 | 同步类 | sync_1 | 基础 | memo_sync_feishu | 备忘录同步 | 备忘录 ↔ 飞书双向对账 | 查看+回执 | 0 | `src/help/scenes/sync.ts:33` |
| 30 | init | 🚀 | 初始化类 | init_1 | 基础 | memo_init_setup | 首次使用 | 初始化备忘录(首次使用引导) | 向导+采集+回执 | 0 | `src/help/scenes/init.ts:33` |

域级声明（`id`／`icon`／`label` 三键）的出处：`scenes/memo.ts:24-26`、`search.ts:24-26`、`remind.ts:24-26`、`wish.ts:24-26`、`checkin.ts:24-26`、`mood.ts:24-26`、`sync.ts:24-26`、`init.ts:24-26`。
二级组 id 的出处：`memo.ts:29`（memo_1）／`:77`（memo_2）；`search.ts:29`／`:71`／`:90`；`remind.ts:29`／`:64`；`wish.ts:29`／`:60`；`checkin.ts:29`；`mood.ts:29`；`sync.ts:29`；`init.ts:29`。
组装件（8 域 → 全量 `groups` ＋ 域级索引）：`src/help/sceneData.ts:42-51`（`MEMO_HELP_GROUPS`）与 `:54-64`（`buildHelpSceneIndex()`）；数据世代 `"1.3.0"` 住 `sceneData.ts:39`。

**结构断言由生成器钉死**（`scripts/gen-help-assets.mjs:301-341` 的 `assertShape()`）：域数＝8／二级组数＝13／label 为「基础」的兜底组＝4／场景数＝30／场景 id 唯一数＝30／清洗后字段数＝64／清洗后仍带字段的场景数＝27／types 原子合计 64（回执 30＋采集 20＋查看 10＋向导 4）。本席逐文件复核与之一致。
`types` 里**没有**「选择」这个词（`gen-help-assets.mjs:322`）。

### 1.2 逐场景明细：`prompt`（`prompt_template` 逐字）＋ `hint`／`editableFields`

说明：`prompt_template` 是多行文本，本报告用代码块给出**逐字**内容（表格里塞多行会丢换行）。`hint` 只存在于 `editable_fields[]` 的每一项上，故与 `editableFields` 同表列出；`dimension`＝老 yaml 的字段名列表，即本表 `name` 那一列的合称。`required` 实测**全部为 `false`**（`gen-help-assets.mjs:333` 断言「required 非 false 即 fail」）。

#### 域 1 `memo`（备忘类，2 组／6 场景）

**#1 `memo_add_basic`**（`memo.ts:33-46`，wake＝记备忘，title＝添加一条备忘笔记，types＝采集+回执，`aliases:["记一条","添加笔记"]` 在 `:45`）

```text
请帮我记一条备忘(唤醒词:记备忘):

请按以下格式填写你的参数:

  内  容: _____________ (你想记的话)
  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)
  子分类: _____________ (选填,2 字简短描述,如"工作")
  附  件: _____________ (选填,文件名,如 receipt.jpg)

期望效果:
  AI 创建一条备忘,告诉你 ID 和创建时间。心愿类还会自动建飞书任务。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| category | 分类 | 备忘(默认) / 心愿 / 打卡 / 情绪日记 | "" | false |
| sub_category | 子分类 | 自由文本,AI 智能推断 1 个 2 字 | "" | false |
| media | 附件 | 可选附件(图片/音频/视频) | "" | false |
| due | 排期日期 | 仅心愿生效,YYYY-MM-DD | "" | false |

**#2 `memo_update_basic`**（`memo.ts:48-60`）

```text
请帮我修改一条已有的备忘(唤醒词:改备忘):

请按以下格式填写你的参数:

  笔记 ID: _____________ (数字,如 15)
  新内容: _____________ (改后的话)
  新分类: _____________ (选填,备忘/心愿/打卡/情绪日记)
  新子分类: _____________ (选填,2 字简短)

期望效果:
  AI 更新这条备忘的内容,告诉你修改后的结果。心愿类会同步飞书任务标题。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 必填,数字 ID | "" | false |
| content | 内容 | 新内容(可选) | "" | false |
| category | 分类 | 新顶层分类(可选) | "" | false |
| sub_category | 子分类 | 新子分类(可选) | "" | false |

**#3 `memo_delete_basic`**（`memo.ts:62-73`）

```text
请帮我删除一条或多条备忘(唤醒词:删备忘):

请按以下格式填写你的参数:

  笔记 ID: _____________ (可多个,空格分隔,如"15 18 22")

期望效果:
  AI 删除这些备忘并告诉你改动了几条;有关联提醒时 AI 会先确认。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 必填,数字 ID,可多个 | "" | false |
| with_reminders | 连同关联提醒一起删 | 是否连同关联提醒一起删(默认否,有提醒则报错) | "" | false |
| true | 跳过二次确认 | 跳过二次确认 | "" | false |

**#4 `memo_change_category_single`**（`memo.ts:81-92`）

```text
请帮我修改单条备忘的顶层分类(唤醒词:备忘改分类,单条):

请按以下格式填写你的参数:

  笔记 ID: _____________ (数字,如 15)
  新分类: _____________ (备忘/心愿/打卡/情绪日记)

期望效果:
  AI 改这条备忘的顶层分类;子分类不会被改动(它是内容的细分)。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 必填,数字 ID | "" | false |
| category | 分类 | 目标分类(备忘/心愿/打卡/情绪日记) | "" | false |
| bulk_indicator | 批量判定 | 多条一起改时,写「都」或「全部」 | "" | false |

**#5 `memo_change_subcategory`**（`memo.ts:94-105`，`aliases:["改子分类"]` 在 `:104`）

```text
请帮我修改单条备忘的子分类(唤醒词:备忘改子分类):

请按以下格式填写你的参数:

  笔记 ID: _____________ (数字,如 15)
  新子分类: _____________ (2 字简短,如"工作";留空=清除)

期望效果:
  AI 修改或清除这条备忘的子分类,适用于所有顶层分类。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 必填,数字 ID | "" | false |
| sub_category | 子分类 | 新子分类(2 字自由文本,留空即清除) | "" | false |

**#6 `memo_batch_change_category`**（`memo.ts:107-119`，`aliases:["批量改分类"]` 在 `:118`）

```text
请帮我批量改分类(唤醒词:备忘改分类 · 批量场景):

请按以下格式填写你的参数:

  原分类: _____________ (备忘/心愿/打卡/情绪日记)
  目标分类: _____________ (建议目标,可在网页上改)

期望效果:
  AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类 → 采纳复制 → AI 逐条改分类。
  注:子分类不会被改动。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| from_category | 原分类 | 原分类 | "" | false |
| to_category | 目标分类 | 建议目标分类(网页上可改) | "" | false |
| bulk_indicator | 批量判定 | 一次改多条(原话含「都/全部/多个 ID」) | "" | false |

#### 域 2 `search`（查找类，3 组／7 场景）

**#7 `memo_search_keyword`**（`search.ts:33-45`）

```text
请帮我搜备忘录(唤醒词:搜备忘):

请按以下格式填写你的参数:

  关键词: _____________ (搜的内容,如"咖啡")
  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)
  子分类: _____________ (选填,2 字简短)
  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)

期望效果:
  AI 列出含关键词的所有笔记。并生成可视化搜索结果页。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| keyword | 关键词 | 搜索词 | "" | false |
| category | 分类 | 顶层分类过滤(可选) | "" | false |
| sub_category | 子分类 | 子分类过滤(可选) | "" | false |
| due | 排期日期 | 按排期日期过滤(可选,YYYY-MM-DD) | "" | false |

**#8 `memo_search_alias`**（`search.ts:47-56`）

```text
请帮我查备忘录(唤醒词:查备忘):

请按以下格式填写你的参数:

  关键词: _____________ (搜的内容)

期望效果:
  AI 搜索含关键词的笔记,并生成可视化结果页。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| keyword | 关键词 | 搜索词 | "" | false |

**#9 `memo_get_detail`**（`search.ts:58-67`）

```text
请帮我查看某条备忘的详情(唤醒词:看备忘):

请按以下格式填写你的参数:

  笔记 ID: _____________ (数字,如 15)

期望效果:
  AI 显示这条备忘的全部内容。并生成详情页。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 必填,数字 ID | "" | false |

**#10 `memo_search_by_date`**（`search.ts:75-86`）

```text
请帮我按时间范围搜索备忘录(唤醒词:按时间搜备忘):

请按以下格式填写你的参数:

  开始日期: _____________ (YYYY-MM-DD,如 2026-07-01)
  结束日期: _____________ (YYYY-MM-DD,如 2026-07-07)
  分  类:    _____________ (选填,备忘/心愿/打卡/情绪日记)

期望效果:
  AI 列出该日期范围内的所有笔记,按创建时间倒序。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| start | 开始日期 | 开始日期 YYYY-MM-DD | "" | false |
| end | 结束日期 | 结束日期 YYYY-MM-DD | "" | false |
| category | 分类 | 顶层分类过滤 | "" | false |

**#11 `memo_search_wish`**（`search.ts:94-104`）

```text
请帮我查看心愿(唤醒词:查心愿):

请按以下格式填写你的参数:

  关键词: _____________ (选填,搜的内容)
  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)

期望效果:
  AI 自动按"心愿"分类过滤。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| keyword | 关键词 | 搜索词(可选) | "" | false |
| due | 排期日期 | 按排期日期过滤 | "" | false |

**#12 `memo_search_checkin`**（`search.ts:106-115`）

```text
请帮我查看打卡记录(唤醒词:查打卡):

请按以下格式填写你的参数:

  关键词: _____________ (选填,搜的内容)

期望效果:
  AI 自动按"打卡"分类过滤,列出结果。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| keyword | 关键词 | 搜索词(可选) | "" | false |

**#13 `memo_search_mood`**（`search.ts:117-127`，`aliases:["查情绪日记"]` 在 `:126`）

```text
请帮我查看情绪日记(唤醒词:查情绪):

请按以下格式填写你的参数:

  关键词: _____________ (选填,搜的内容)

期望效果:
  AI 自动按"情绪日记"分类过滤,列出结果。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| keyword | 关键词 | 搜索词(可选) | "" | false |

#### 域 3 `remind`（提醒类，2 组／4 场景）

**#14 `memo_remind_with_note`**（`remind.ts:33-45`）

```text
请帮我记一条提醒(唤醒词:记提醒 · 两步合一:添笔记 + 设提醒):

请按以下格式填写你的参数:

  笔记内容: _____________ (要提醒的事)
  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)
  重复类型: _____________ (选填,一次性/每天/每周/每月/每年)
  重复规则: _____________ (选填,如每天="09:00",每周="5 17:00")

期望效果:
  AI 先创建笔记,再创建关联提醒,到点自动推送提醒。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| content | 内容 | 笔记内容 | "" | false |
| remind_at | 提醒时间 | 提醒时间 YYYY-MM-DD HH:MM | "" | false |
| repeat_type | 重复类型 | 一次性(默认)/每天/每周/每月/每年 | "" | false |
| repeat_rule | 重复规则 | 重复规则(每天:HH:MM / 每周:W HH:MM / 每月:D HH:MM / 每年:MM-DD HH:MM) | "" | false |

**#15 `memo_remind_existing`**（`remind.ts:47-60`）

```text
请帮我给已有笔记加提醒(唤醒词:设提醒):

请按以下格式填写你的参数:

  笔记 ID: _____________ (数字,如 15)
  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)
  提醒内容: _____________ (选填,如"该跑步了")
  重复类型: _____________ (选填,默认"一次性")
  重复规则: _____________ (选填,见格式说明)

期望效果:
  AI 创建提醒,可关联或独立存在。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| note_id | 笔记 ID | 笔记 ID(可选,可不关联具体笔记) | "" | false |
| remind_at | 提醒时间 | 提醒时间 | "" | false |
| content | 内容 | 提醒内容 | "" | false |
| repeat_type | 重复类型 | 重复类型(默认一次性) | "" | false |
| repeat_rule | 重复规则 | 重复规则 | "" | false |

**#16 `memo_reminders_active`**（`remind.ts:68-78`，`aliases:["查提醒"]` 在 `:77`）

```text
请帮我查看有效提醒(唤醒词:看提醒):

请按以下格式填写你的参数:

  状  态: _____________ (选填,默认只看有效提醒)

期望效果:
  AI 按时间排序列出提醒。并生成可筛选的可视化页。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| status | 提醒状态 | 有效(默认)/已废弃 | "" | false |

**#17 `memo_completed_reminders`**（`remind.ts:80-86`，**无 `editable_fields`**）

```text
请帮我查看已提醒过的备忘(唤醒词:查已提醒备忘):

无需参数,直接发送。

期望效果:
  AI 列出已触发的提醒 + 关联打卡笔记 + 触发时间。
```

#### 域 4 `wish`（心愿类，2 组／5 场景）

**#18 `memo_complete_wish`**（`wish.ts:33-44`，`aliases:["完成打卡"]` 在 `:43`）

```text
请帮我把心愿标记为已完成(唤醒词:完成心愿):

请按以下格式填写你的参数:

  心愿 ID: _____________ (数字,如 15)
  打卡内容: _____________ (选填,默认拷贝心愿原文)

期望效果:
  AI 删除该心愿并新建一条打卡记录。
  批量场景:先出一份完成向导页,你在页面上勾选 + 填打卡内容。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| ids | 笔记 ID | 心愿 ID 列表(单条或多条) | "" | false |
| content | 内容 | 打卡内容(默认拷贝心愿原文) | "" | false |

**#19 `memo_wish_schedule`**（`wish.ts:46-56`）

```text
请帮我给心愿设排期日期(唤醒词:心愿排期):

请按以下格式填写你的参数:

  心愿 ID: _____________ (数字,可多个,空格分隔,如"15 18 22")
  排期日期: _____________ (YYYY-MM-DD,如 2026-07-30)

期望效果:
  AI 设置本地排期日期,并与飞书任务同步。
  批量场景:先出一份排期向导页(可带建议日期),你在页面上微调。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| ids | 笔记 ID | 心愿 ID 列表 | "" | false |
| due | 排期日期 | 期望完成日期 YYYY-MM-DD | "" | false |

**#20 `memo_add_wish`**（`wish.ts:64-76`）

```text
请帮我快速添加心愿(唤醒词:记心愿 · 子唤醒词自动带心愿分类):

请按以下格式填写你的参数:

  内  容: _____________ (心愿内容,如"想学 Python")
  子分类: _____________ (选填,2 字简短)
  排  期: _____________ (选填,YYYY-MM-DD,放哪天完成)
  飞书任务清单: _____________ (选填,留空=我的任务)

期望效果:
  AI 创建心愿笔记,自动建飞书任务并建立关联。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| content | 内容 | 心愿内容 | "" | false |
| sub_category | 子分类 | 自由文本 | "" | false |
| due | 排期日期 | 排期日期(可选) | "" | false |
| tasklist_guid | 飞书任务清单 | 飞书任务清单 ID(可选) | "" | false |

**#21 `memo_delete_wish`**（`wish.ts:78-87`）

```text
请帮我删除心愿(唤醒词:删心愿 · 子唤醒词自动带心愿过滤):

请按以下格式填写你的参数:

  心愿 ID: _____________ (数字,如 15)

期望效果:
  AI 删除这条心愿;若有飞书任务,会自动标完成(想连它一起删掉时说「彻底删除」)。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 心愿 ID | "" | false |

**#22 `memo_update_wish`**（`wish.ts:89-99`）

```text
请帮我改心愿(唤醒词:改心愿 · 子唤醒词自动带心愿过滤):

请按以下格式填写你的参数:

  心愿 ID: _____________ (数字,如 15)
  新内容: _____________ (改后的话)

期望效果:
  AI 更新内容,飞书任务标题同步更新。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 心愿 ID | "" | false |
| content | 内容 | 新内容 | "" | false |

#### 域 5 `checkin`（打卡类，1 组／3 场景）

**#23 `memo_add_checkin`**（`checkin.ts:33-44`）

```text
请帮我快速添加打卡(唤醒词:记打卡 · 子唤醒词自动带打卡分类):

请按以下格式填写你的参数:

  内  容: _____________ (打卡内容,如"跑了 5 公里")
  子分类: _____________ (选填,2 字简短,如"跑步")
  关联提醒: _____________ (选填,提醒 ID,溯源用)

期望效果:
  AI 创建一条打卡记录。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| content | 内容 | 打卡内容 | "" | false |
| sub_category | 子分类 | 自由文本 | "" | false |
| reminder_id | 关联提醒 | 关联提醒 ID(可选,溯源用) | "" | false |

**#24 `memo_delete_checkin`**（`checkin.ts:46-55`）

```text
请帮我删除打卡(唤醒词:删打卡 · 子唤醒词自动带打卡过滤):

请按以下格式填写你的参数:

  打卡 ID: _____________ (数字,如 20)

期望效果:
  AI 删除这条打卡记录。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 打卡 ID | "" | false |

**#25 `memo_update_checkin`**（`checkin.ts:57-67`）

```text
请帮我改打卡(唤醒词:改打卡 · 子唤醒词自动带打卡过滤):

请按以下格式填写你的参数:

  打卡 ID: _____________ (数字,如 20)
  新内容: _____________ (改后的话)

期望效果:
  AI 更新这条打卡的内容。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 打卡 ID | "" | false |
| content | 内容 | 新内容 | "" | false |

#### 域 6 `mood`（情绪类，1 组／3 场景）

**#26 `memo_add_mood`**（`mood.ts:33-44`，`aliases:["记情绪日记"]` 在 `:43`）

```text
请帮我快速添加情绪日记(唤醒词:记情绪 · 子唤醒词自动带情绪日记分类):

请按以下格式填写你的参数:

  内  容: _____________ (情绪内容)
  子分类: _____________ (选填,2 字简短)

期望效果:
  AI 创建一条情绪日记。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| content | 内容 | 情绪内容 | "" | false |
| sub_category | 子分类 | 自由文本 | "" | false |

**#27 `memo_delete_mood`**（`mood.ts:46-56`，`aliases:["删情绪日记"]` 在 `:55`）

```text
请帮我删除情绪日记(唤醒词:删情绪 · 子唤醒词自动带情绪日记过滤):

请按以下格式填写你的参数:

  情绪日记 ID: _____________ (数字,如 25)

期望效果:
  AI 删除这条情绪日记。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 情绪日记 ID | "" | false |

**#28 `memo_update_mood`**（`mood.ts:58-69`，`aliases:["改情绪日记"]` 在 `:68`）

```text
请帮我改情绪日记(唤醒词:改情绪 · 子唤醒词自动带情绪日记过滤):

请按以下格式填写你的参数:

  情绪日记 ID: _____________ (数字,如 25)
  新内容: _____________ (改后的话)

期望效果:
  AI 更新这条情绪日记的内容。
```

| name | label | hint | value | required |
|---|---|---|---|---|
| id | 笔记 ID | 情绪日记 ID | "" | false |
| content | 内容 | 新内容 | "" | false |

#### 域 7 `sync`（同步类，1 组／1 场景）

**#29 `memo_sync_feishu`**（`sync.ts:33-39`，**无 `editable_fields`**）

```text
请帮我跑备忘录和飞书的双向对账(唤醒词:备忘录同步):

无需参数,直接发送。

期望效果:
  AI 执行 3 步对账:
  1. 本地补建(本地心愿还没有飞书任务 → 自动建)
  2. 反向同步完成状态(飞书已完成 → 本地标记完成)
  3. 反向同步排期日期(飞书那边改了日期 → 本地跟着改)
  并回执 11 项统计。
```

#### 域 8 `init`（初始化类，1 组／1 场景）

**#30 `memo_init_setup`**（`init.ts:33-40`，**无 `editable_fields`**，`aliases:["初始化","新手"]` 在 `:39`）

```text
请帮我初始化备忘录,我是第一次使用(唤醒词:首次使用):

无需参数,直接发送。

请按步骤帮我搭建好环境:检查并配置运行环境、数据存储(全文搜索)、飞书联动(未安装则引导我安装并授权)、配置项,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。

期望效果:
  AI 逐步引导我从零搭建环境(检测→安装/配置→验证),缺什么给具体指引,初始化数据库,生成初始化报告页,报告就绪情况。
```

### 1.3 12 条 `aliases`（只住资产、渲染时剥离，不进 HELP 载荷）

| 场景 id | aliases | 出处 |
|---|---|---|
| memo_add_basic | 记一条、添加笔记 | `memo.ts:45` |
| memo_change_subcategory | 改子分类 | `memo.ts:104` |
| memo_batch_change_category | 批量改分类 | `memo.ts:118` |
| memo_search_mood | 查情绪日记 | `search.ts:126` |
| memo_reminders_active | 查提醒 | `remind.ts:77` |
| memo_complete_wish | 完成打卡 | `wish.ts:43` |
| memo_add_mood | 记情绪日记 | `mood.ts:43` |
| memo_delete_mood | 删情绪日记 | `mood.ts:55` |
| memo_update_mood | 改情绪日记 | `mood.ts:68` |
| memo_init_setup | 初始化、新手 | `init.ts:39` |

共 10 个场景带别名、12 个词（`gen-help-assets.mjs:323-327` 断言「别名条数 12 ＋ 唯一词数 12 ＋ 与主词不撞词」）。剥离动作在 `src/help/helpFile.ts:97-107`（`toScenePayload` 逐键重建）与 `:110-121`（`toGroupsPayload`）；载荷闭集由 `help-file-228.test.mjs:62` 与 `cli-help-230.test.mjs:137` 双向钉死。

---

## 2. 30 个场景在新仓的落地状态

### 2.1 判据（先说清「有 HTML」是什么意思）

- **「有」＝缺省调用**（不带 `--html`）该场景对应的命令分支**自己会落一份 `.html` 整页**。判据是 `cmd_read.ts` 的 `dispatch()` 返回值里有没有 `deliver: { html, stem }`（`DispatchOut` 形状见 `cmd_read.ts:189-190`），以及 `main()` 里的落盘分支 `out.deliver !== undefined`（`cmd_read.ts:542-544`）。
- **落点与文件名**：`landingOf(dbPath, stem)`（`cmd_read.ts:94-96`）＝ `<库目录>/<html.dir>/<stem>_<YYYYMMDD_HHMMSS>[_N].html`，`<库目录>`＝配置 `db.dir`（`src/config.ts:29`，空串＝`~/.ilife/data/`），`<html.dir>`＝配置 `html.dir`（默认 `memo_html`，`src/help/manifest.ts:26-32`）。时间戳、同秒 `_N`（从 `_2` 起）、独占创建、绝对路径回执全在共用件 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts:339-382`）。
- **显式 `--html <路径>`** 是另一条路：任何 key 都能落一份**`<section …>` 分节片段**（不是整页），走 `renderEnvelopeHtml`（`cmd_read.ts:532-536`、`:545-547`）。本报告**不把这条算作「有 HTML 产物」**——它要用户显式指定路径，且产物是片段。判据：`cli.test.mjs:97-103` 实测 `memo.search --html` 落出的是 `/<section/`。
- **类型（结果型／过程型／回执型）**：过程型＝HELP `types` 含「向导」（4 条）或产物是给人勾选后把指令复制回来的交互页；结果型＝以「查看／列出去」为目的；回执型＝「采集／回执」，只回一条结果报文。

### 2.2 总表：30 行 × 状态

| # | 场景 id | 服务命令 key（分支） | 缺省出 HTML？ | 产物文件名形态 | 类型 | 判据（文件:行／函数） |
|---|---|---|---|---|---|---|
| 1 | memo_add_basic | `memo.create` | **无** | — | 回执型 | `cmd_read.ts:212-229` 只 `return { data: r.receipt, exit }`，无 `deliver` |
| 2 | memo_update_basic | `memo.update` | **无** | — | 回执型 | `cmd_read.ts:230-260` |
| 3 | memo_delete_basic | `memo.remove` | **无** | — | 回执型 | `cmd_read.ts:261-278` |
| 4 | memo_change_category_single | `memo.update`（`params.category` → `patch.category`） | **无** | — | 回执型 | `cmd_read.ts:250`、`:258-259` |
| 5 | memo_change_subcategory | `memo.update`（`params.sub` → `patch.sub_category`） | **无** | — | 回执型 | `cmd_read.ts:251` |
| 6 | memo_batch_change_category | `memo.batch`（不给 `ids` ＝收集支） | **有** | `<库目录>/memo_html/批量改分类_<YYYYMMDD_HHMMSS>[_N].html` | 过程型向导 | `cmd_read.ts:385-404`（`deliver` 在 `:403`）＋ `templates/change_category.html` |
| 7 | memo_search_keyword | `memo.search` | **无** | — | 结果型（**产物缺席**） | `cmd_read.ts:204-210`；`templates/memo_query.html` 零接线 |
| 8 | memo_search_alias | `memo.search` | **无** | — | 结果型（同上） | 同上 |
| 9 | memo_get_detail | `memo.detail` | **无** | — | 结果型（**产物缺席**） | `cmd_read.ts:211`（一行 `ok({item})`） |
| 10 | memo_search_by_date | `memo.search`（**`timeRange` 不被读**） | **无** | — | 结果型（**产物缺席**） | `cmd_read.ts:204-210` 只读 `q`／`category`／`sub`；`wish/due.ts:40-60` 只认 `due`／`dueBefore`／`dueAfter`／`hasDue` |
| 11 | memo_search_wish | `memo.wish`（列表支） | **无** | — | 结果型 | `cmd_read.ts:342-343` |
| 12 | memo_search_checkin | `memo.search`（`preset.category=打卡`） | **无** | — | 结果型 | `cmd_read.ts:204-210` ＋ `policy/wakewords.ts:37` |
| 13 | memo_search_mood | `memo.search`（`preset.category=情绪日记`） | **无** | — | 结果型 | 同上 |
| 14 | memo_remind_with_note | `memo.create`（`remindAt` 两步合一） | **无** | — | 回执型 | `cmd_read.ts:212-229` ＋ `wish/ensure.ts:81-104`（`placeReminder`） |
| 15 | memo_remind_existing | **无对应命令分支**（`memo.create` 不收 `note_id`） | **无** | — | 回执型 | `policy/crud.ts:11-16`（只认 `title`／`body`）；`cmd_read.ts:212-229` 无 `note_id` 通道；`memo.update` 只接受 `reminderId` 关联**既有**提醒（`cmd_read.ts:253`） |
| 16 | memo_reminders_active | `memo.remind`（`status` 支） | **无** | — | 结果型 | `cmd_read.ts:290-293` |
| 17 | memo_completed_reminders | `memo.remind`（**唤醒词进不到 completed 支**） | **无** | — | 结果型 | `cmd_read.ts:286-289` 要 `mode:'done'` 或 `done:true`；而 `policy/wakewords.ts:16` 给这条的 preset 是 `{done:false}` → 落到 `:290-293` 的 active 支 |
| 18 | memo_complete_wish | `memo.update{done:true}`（单条）／`memo.wish{wizard:'complete'}`（批量） | **有（仅批量支）** | `<库目录>/memo_html/心愿完成向导_<YYYYMMDD_HHMMSS>[_N].html` | 过程型向导 | `cmd_read.ts:321-340`（`deliver` 在 `:339`）；单条支在 `:238-241` 无产物 |
| 19 | memo_wish_schedule | `memo.update{ids,due}`（批量）／`memo.wish{wizard:'plan'}`（向导） | **有（向导支）** | `<库目录>/memo_html/心愿排期向导_<YYYYMMDD_HHMMSS>[_N].html` | 过程型向导 | `cmd_read.ts:299-319`（`deliver` 在 `:318`）；批量支在 `:232-235` 无产物 |
| 20 | memo_add_wish | `memo.create`（`preset.category=心愿`） | **无** | — | 回执型 | `cmd_read.ts:212-229` |
| 21 | memo_delete_wish | `memo.remove` | **无** | — | 回执型 | `cmd_read.ts:261-278` |
| 22 | memo_update_wish | `memo.update` | **无** | — | 回执型 | `cmd_read.ts:230-260` |
| 23 | memo_add_checkin | `memo.create` | **无** | — | 回执型 | 同上 |
| 24 | memo_delete_checkin | `memo.remove` | **无** | — | 回执型 | 同上 |
| 25 | memo_update_checkin | `memo.update` | **无** | — | 回执型 | 同上 |
| 26 | memo_add_mood | `memo.create` | **无** | — | 回执型 | 同上 |
| 27 | memo_delete_mood | `memo.remove` | **无** | — | 回执型 | 同上 |
| 28 | memo_update_mood | `memo.update` | **无** | — | 回执型 | 同上 |
| 29 | memo_sync_feishu | `memo.sync` | **有** | `<库目录>/memo_html/同步报告_<YYYYMMDD_HHMMSS>[_N].html` | 结果型报告 | `cmd_read.ts:345-362`（`deliver` 在 `:362`）＋ `templates/sync_report.html`；老实物同名产物在 `D:\2Study\StudyNotes\.db\memo_html\同步报告_20260809_235933.html` |
| 30 | memo_init_setup | **无任何命令 key** | **无** | — | 过程型（应为向导） | `cmd_read.ts` 全文无 init 分支（`memo.init` 不在 `MEMO_KEY_SHAPES`，`render/envelope.ts:5-21`）；`templates/init_report.html` 零接线 |

### 2.3 统计

| 项 | 条数 | 说明 |
|---|---|---|
| **有 HTML（缺省即落整页）** | **4** | #6 批量改分类向导、#18 完成心愿向导（仅批量支）、#19 心愿排期向导（仅向导支）、#29 同步报告 |
| **无 HTML** | **26** | 其中 #30 连命令都没有；#15 无对应命令分支；#7／#8／#10 的结果页模板 `memo_query.html` 存在但零接线 |
| 出页用的模板 | 4／6 | 被接线：`change_category`、`wish_complete`、`wish_plan`、`sync_report` |
| 零接线模板 | 2／6 | `memo_query`（对应 #7／#9 的「结果页／详情页」承诺）、`init_report`（对应 #30 的「初始化报告页」承诺） |
| 出整页但**不属于 30 场景**的命令 | 3 条产物 | `memo.help.lookup` 缺省 → 共享 help 壳整页 `备忘录_HELP_<stamp>.html`；`mode:'lookup'` → `备忘录_速查表_<stamp>.html`（分节片段）；`auth step:'qr'` → `feishu_qr_<ms>.png`（`fetch/auth.ts:49-62`，不是 HTML） |

「零接线」的判据（三处都直读）：

1. `fillMemoPage(...)` 在 `src/**` 里只有 4 个调用点：`cmd_read.ts:318`／`:339`／`:362`／`:403`（grep 全包 `fillMemoPage` 得此四行）。
2. `MEMO_TEMPLATES`（`render/templates.ts:7-14`）列 6 件，`loadTemplate()`（`:19-24`）只校验名字在不在表里——**表里有不等于被用过**。
3. `templates/memo_query.html`（13,067 B）与 `templates/init_report.html`（11,478 B）在 `src/**` 无任何字符串引用；仅在 `test/render.test.mjs:48-59`（按 `MEMO_TEMPLATES` 循环查三标记）与 `tooling/skill-html-snapshot.mjs:177-180`（按模板清单逐件填页）里被读。**两者都被仓根快照门钉住**（`tooling/skill-html.snapshot.json` 的 `memo/tpl/memo_query`、`memo/tpl/init_report`），所以它们不会悄悄腐坏，只是没人用。

---

## 3. 命令登记与唤醒词

### 3.1 出口分派层登记了多少条 key

`src/cli/cmd_read.ts` 一共认 **16 条 key**，分两档（**在预检与分派层之前拦下的 4 条** ＋ **进 `dispatch()` switch 的 12 条**）：

**A 档：进 `dispatch()` switch 的 12 条**（每条的 `shape` 由 `src/render/envelope.ts:5-21` 的 `MEMO_KEY_SHAPES` 分配；`case` 行号如下）

| key | shape | `case` 行 | 吃哪些参数名（逐字，参数名以 `params.X` 出现为准） | 它吃哪些唤醒词（`policy/wakewords.ts` 的 `WAKE_TABLE`） |
|---|---|---|---|---|
| `memo.search` | list | `:204` | `q`、`category`、`sub`；另经 `dueMatches` 吃 `due`／`dueBefore`／`dueAfter`／`hasDue`（`wish/due.ts:33-38`） | 按时间搜备忘、搜备忘、查备忘、查打卡、查情绪日记（5） |
| `memo.detail` | detail | `:211` | `id` | 看备忘（1） |
| `memo.create` | receipt | `:212` | `title`、`body`、`category`、`sub`、`media`、`remindAt`、`repeatType`、`repeatRule`、`due` | 设提醒、记提醒、记一条、添加笔记、记心愿、记打卡、记情绪日记（7） |
| `memo.update` | receipt | `:230` | `ids`、`due`、`id`、`done`、`title`、`body`、`category`、`sub`、`media`、`reminderId`（`remindAt` 一律 `fail(2)`，见 `:255`） | 改子分类、完成心愿、改心愿、改打卡、改情绪日记、删心愿、删打卡、删情绪日记（8） |
| `memo.remove` | receipt | `:261` | `mode`、`id`、`confirm`、`withReminders`、`purge` | 废弃提醒（1） |
| `memo.remind` | list | `:279` | `mode`、`due`、`done`、`status` | 查已提醒备忘、看提醒、查提醒（3） |
| `memo.wish` | list | `:295` | `wizard`、`ids`、`all`、`suggestDue`、`onlyOverdue`、`content`；列表支另吃 `due`／`dueBefore`／`dueAfter`／`hasDue` | 心愿排期、查心愿（2） |
| `memo.sync` | receipt | `:345` | 无（`reconcileWishes(db)` 零参） | **无唤醒词** |
| `memo.batch` | receipt | `:364` | `fromCategory`、`toCategory`、`ids` | 批量改分类（1） |
| `memo.auth` | receipt | `:406` | `step`、`brand`、`url`、`outDir`、`deviceCode`、`domain`、`dryRun` | 飞书授权（1） |
| `memo.stats` | stat | `:442` | 无 | **无唤醒词** |
| `memo.help.lookup` | list | `:450`（**故意 `fail(1)`**，真处理在 `dispatchHelp()`，`cmd_read.ts:148-182`，开库之前） | `mode`、`q`、`reuseHours`（＋ CLI 级 `--html`／`--timeout`，`parseArgs` `:457-469`） | **无唤醒词**（入口是 SKILL.md 的「备忘录 HELP」这个纯短语，不进 `WAKE_TABLE`） |

`default:` 分支 `fail(3, '未知 memo key：' + key)`（`cmd_read.ts:453`）；`memoShapeFor()` 在更早处已用 `MEMO_KEY_SHAPES` 拦一道（`cmd_read.ts:498` → `render/envelope.ts:23-27`）。

**B 档：在预检／形状表／开库之前拦下的 4 条**（都不是唤醒词命令，不进 HELP、不进 `MEMO_KEY_SHAPES`）

| key | 唯一定义地 | 拦截点 | 参数 |
|---|---|---|---|
| `memo.config.read` | `src/cli/config.ts:18` | `cmd_read.ts:481-484`（`isConfigKey`） | 无 |
| `memo.config.write` | `src/cli/config.ts:19` | 同上 | `values` |
| `memo.config.reset` | `src/cli/config.ts:20` | 同上 | 无 |
| `memo.config.check` | `src/cli/health.ts:15` | `cmd_read.ts:487-490`（`isHealthCheckKey`） | 无（`runHealthCheckKey(key)` 只吃 key） |

这 4 条的形状理由写在 `src/cli/config.ts:1-11` 与 `src/cli/health.ts:1-9`：它们是设置页（插件）专用出口，不进唤醒词表。

### 3.2 唤醒词表住哪、有多少条

- **住 `src/policy/wakewords.ts`**（本包口径层），类型 `WakeEntry { phrase; key; needs?; preset? }` 见 `:11`。
- 表 = **17 条字面量**（`wakewords.ts:15-31`）＋ **12 条从 `WAKE_TOPS` 展开**（`:34-39` 的 for 循环 × `src/policy/category.ts:9-14` 的 12 个键）＝ **29 条**。本席用编译产物实测：`WAKE_TABLE.length === 29`。
- 分布（实测）：`memo.update` 8、`memo.create` 7、`memo.search` 5、`memo.remind` 3、`memo.wish` 2、`memo.batch` 1、`memo.auth` 1、`memo.remove` 1、`memo.detail` 1 ⇒ 9 个 key 有唤醒词，**3 个 key（`memo.sync`／`memo.stats`／`memo.help.lookup`）零唤醒词**。
- 最长匹配：`SORTED`（`wakewords.ts:42`）按 `phrase.length` 降序找第一个 `text.includes(...)`，为了「批量改分类」不落进「改子分类」；`routeWakeword()` 在 `:44-54`，缺槽位抛 `POLICY_MISSING_SLOT`。
- 派生消费者：`src/help/lookup.ts:31-39`（`buildHelpLookup()` → 29 行速查）＋ `scripts/build-help.mjs:13-21`（注入 `SKILL.md` 的 `<!-- HELP-AUTO-START -->` 块）＋ `cmd_read.ts:138-146`（`buildLookupItems()`，给 `mode:'lookup'` 与 `q` 两支）。

**注意两处数**：`SKILL.md:82` 写「28 条唤醒词」，而实际注入块是 **29 行**（`SKILL.md:44-72`）、`help/lookup.ts:30` 的注释写「29 短语：17 显式 + 12 子唤醒词」。**`SKILL.md:82` 的 28 是陈旧数**（本席以 `buildHelpLookup()` 实测 29 为准）；它不是机器门能拦的东西（见 §3.3）。

### 3.3 派生生成物与「命令登记纪律」的机器门

| 项 | 现场读数 | 判据 |
|---|---|---|
| `pnpm gen` 管不管本包 | **不管命令面** | 仓根 `package.json:12`：`gen` 只跑 `skill-calorie/scripts/gen-cli.mjs`、`skill-bill/scripts/gen-cli.mjs`、`tooling/skill-call-form.mjs`；备忘录无对应 `scripts/gen-cli.mjs`，全包也**没有任何 `src/<能力>/commands.ts` 或 `routes.ts`** |
| `pnpm gen:check` 管不管本包 | **管一处**：`SKILL.md` 的 `CALL-FORM` 块 | `package.json:13` 的第三条 `node tooling/skill-call-form.mjs --check`；该门扫「有 `*-cmd-read` bin ＋ 有 SKILL.md」的全部技能包（`tooling/skill-call-form.mjs:76-89`），并断言参与包恰为 6 个（`:151`）——备忘录是六分之一 |
| 本包自己的派生生成物 | 两份 | ① `scripts/build-help.mjs`（38 LF）把速查表注入 `SKILL.md` 的 `HELP-AUTO` 块，挂在 `package.json:32` 的 `build` 里（`tsc -b && node scripts/build-help.mjs`）；② `scripts/gen-help-assets.mjs`（497 LF）生成 8 个域文件 ＋ `sceneData.ts` |
| 生成物有没有机器门 | **有，但都不在 `pnpm gen:check` 里** | ① `HELP-AUTO` 块的新鲜度靠 `test/skill.test.mjs:28-34`（比对 `SKILL.md` 块与 `buildHelpBlock()` 逐字相等）；② HELP 资产的新鲜度靠 `scripts/gen-help-assets.mjs --check`（`:484-491`），**本包 test/ 里没有任何用例跑它**——全仓唯一调用点是 `docs/skills/skill-memo-ilife/t661-变异电池.mjs:75`（变异电池脚本，不在 CI 链上）。参照系：兄弟件 `packages/skill-schedule/test/help-assets.test.mjs:183` 是**在包内**打 `gen-help-assets.mjs --check` 的 |
| 有没有「命令登记纪律」要求的机器门 | **没有** | 仓规 `docs/agents/命令登记纪律.md:107-114` 要求两道门：生成物门（`pnpm gen:check`）＋棘轮（`cmd-registry-294.test.mjs`）。后者只钉 `packages/skill-calorie`（`:98`、`:112`）。本包**既无生成物门、也无棘轮**：一条命令的事实散在 5 处——`cmd_read.ts` 的 `case`／`MEMO_KEY_SHAPES`（`render/envelope.ts:5`）／`WAKE_TABLE`（`policy/wakewords.ts:14`）／`DESCS`（`help/lookup.ts:16-28`）／`cli/config.ts:17-21` 与 `cli/health.ts:15`。这正是命令登记纪律 §一 描述的「改前 6 处共用写点」形状 |

补充一条**已存在的鉴别力**：`tooling/check-boundaries.mjs:120-126` 对备忘录有一条**正向**断言（依赖闭包含 `base-paint` ＋ `src/**` 真的 import base-*），它由 `test/scaffold.test.mjs:6-8` 触发，而 `test/scaffold.test.mjs` 被本包 `package.json:33` 的 `test` 脚本包含 → 这条界门**在本包自己的 `pnpm test` 里真跑**。

---

## 4. `src/` 目录形状与解耦程度

### 4.1 逐目录（文件数／最大文件 LF／合计 LF）

| 目录 | 文件数 | 最大文件（LF） | 目录合计 LF | 职责（读件头注释得出） | 切法 |
|---|---|---|---|---|---|
| `src/`（根，散件） | 3 | `health.ts` **614** | 702 | `index.ts`（包门，5 LF，四条 `export *`）；`config.ts`（83，本技能的配置默认值表 ＋ 读／写／重置三个薄转调）；`health.ts`（614，配置体检报告） | **散件**，不在任何能力目录里 |
| `src/cli/` | 3 | `cmd_read.ts` **569** | 693 | 唯一出口（argv＋JSON＋exit）、配置三键、体检一鍵 | 工种（出口层） |
| `src/fetch/` | 11 | `db.ts` 310 | 1,282 | 「取数层」：SQLite 直连（`db.ts`）、提醒读写（`reminders.ts`）、批量改分类收集／执行（`batch.ts`）、飞书授权（`auth.ts`）、lark-cli 四门（`feishu.ts`）、飞书任务读（`tasks.ts`）／写（`taskWrite.ts`）、自检 sentinel（`sentinel.ts`）、路径（`paths.ts`）、错误（`errors.ts`）、barrel（`index.ts`） | 工种（取数层）＋**混装 6 个域的能力** |
| `src/health/` | **不存在** | — | — | 体检住 `src/health.ts`（单文件） | — |
| `src/help/` | 13 | `helpFile.ts` 220 | 1,049 | HELP 交付：`scenes/*.ts`（8 个域资产，131／123／103／90／73／71／44／43 LF）、`sceneData.ts`（64，组装）、`helpFile.ts`（220，载荷＋整页）、`manifest.ts`（42，三个命名值）、`lookup.ts`（43，速查）、`index.ts`（2，只转 `buildHelpLookup`／`lookupWake`） | 工种（HELP 面）＋资产目录 |
| `src/policy/` | 7 | `media.ts` 92 | 340 | 「口径层」：分类（`category.ts`）、提醒（`reminder.ts`）、心愿路由（`wish.ts`）、CRUD 字段政策（`crud.ts`）、附件路径（`media.ts`）、唤醒词路由（`wakewords.ts`）、barrel | 工种（口径层） |
| `src/render/` | 7 | `pages.ts` 211 | 438 | 「渲染层」：信封与形状（`envelope.ts`）、HTML 片段（`html.ts`）、数据页组装（`pages.ts`）、页面窄资产（`pageAssets.ts`）、模板装载（`templates.ts`）、错误、barrel | 工种（渲染层） |
| `src/wish/` | 10 | `ensure.ts` 264 | 819 | **心愿类能力目录**（#661／#665）：合成写（`ensure.ts`）、原子完成（`complete.ts`）、向导收集（`wizards.ts`）、反向对账（`reconcile.ts`）、排期口径（`due.ts`）、远端镜像（`taskSync.ts`／`taskRemove.ts`／`mark.ts`）、闸门（`gate.ts`）、能力门（`index.ts`，12 个名字） | **能力目录**（按功能域切） |

包门现状（`package.json:8-15` 的 `exports`）：`.`, `./fetch`, `./policy`, `./render`, `./cli`, `./package.json` 六个键。`src/index.ts` 是 `export * from` 四条（`fetch`／`policy`／`render`／`help`），实测对外 **99 个名字**；`./fetch` 的 `dist/fetch/index.js` 对外 **54** 个名字，`./policy` 21 个，`./render` 22 个，`./help` **没有子路径键**（`help/index.ts` 只给 2 个名字，只能从包根取）。

### 4.2 五条铁律逐条判

#### 铁律一 · 能力自治 —— **不合规**（3 处）

- **A1 反向依赖**：`src/fetch/sentinel.ts:11` `import type { WishReceipt } from '../wish/ensure.js';` —— 取数层反向引用上层 `wish/` 的**内部件**（且是深路径，越过 `wish/index.ts` 这道能力门）。结构标准「依赖方向：能力只往下用东西，不许反向」当场不成立。
- **A2 越门深引**：`src/cli/cmd_read.ts:38-44` 深引 `../help/manifest.js`、`../fetch/paths.js`、`../fetch/errors.js`、`../fetch/db.js`（四个内部件，绕过 3 道能力门）；`src/help/helpFile.ts:38` `import { MemoRenderError } from '../render/errors.js';`（`render/index.ts:1` 已经转出 `MemoRenderError`，这一处是绕门）。同一件 `cmd_read.ts` 对 `policy`／`wish`／`render` 三处又规规矩矩走 `index.ts`（`:30`／`:33`／`:34`）——门里门外两套走法并存。
- **A3 一个目录混装多个域的能力**：`src/fetch/` 11 件里，`batch.ts`（`fetch/batch.ts:1-5` 自述「批量改分类（#665）：收集＋执行」）按 HELP 归属是**备忘类·分类调整**（`scenes/memo.ts:77` 的二级组 `memo_2`），却住「取数层」；`auth.ts`／`feishu.ts`／`tasks.ts`／`taskWrite.ts`／`sentinel.ts` 属飞书同步面（HELP 的 `sync` 域与无场景的授权面）。判据「这个文件里的东西，是不是都只属于一个能力？」——`fetch/` 这一层整体答不上来。

#### 铁律二 · 概念唯一 —— **不合规**（4 处）

合规面先记一笔：`MEMO_KEY_SHAPES`（`render/envelope.ts:5-21`）是 key→shape 唯一处；`MEMO_HELP_GROUPS` 是 HELP 资产唯一入口；`WAKE_TABLE` 是唤醒词唯一入口（`help/lookup.ts:2` 与 `scripts/build-help.mjs:7` 都从它派生，不抄第二份）；`sceneData.ts:39` 的 `version` **不另开导出**、只随 `buildHelpSceneIndex()` 出去（`sceneData.ts:22-26` 自述）。这四条做得干净。

不合规的四处都是**「同一件事的第二份默认值」**：

- **B1**：`src/help/manifest.ts:26` `DEFAULT_HELP_HTML_DIR_NAME = 'memo_html'` 与 `src/config.ts:30` `MEMO_CONFIG_DEFAULTS.html.dir = 'memo_html'` 同值两处写。`cli-help-229.test.mjs:75-76` 干脆两条都断言（`assert.equal(DEFAULT_HELP_HTML_DIR_NAME, 'memo_html'); assert.equal(helpHtmlDirName(), 'memo_html');`）——**测试把「两处同值」当成必须成立的事**，改动时得同时改两处。
- **B2**：`src/fetch/paths.ts:10` `DEFAULT_DB_FILENAME = 'memo.db'`（库文件名默认值）与 `src/config.ts:29` `db.name = 'memo.db'`（`paths.ts:9-15` 的注释自己写明「＝改造前的代码常量（配置项 `db.name` 空串即用它）」——两个定义地靠注释维系同值）。
- **B3**：`src/fetch/auth.ts:14` `DEFAULT_QR_DIR_NAME = 'memo_feishu_qr'` 与 `src/config.ts:33` `lark.qrDir = ''`（空串＝走这个默认）。
- **B4**：`src/health.ts:52` `DB_TABLE_THRESHOLD = 2 as const`（注释写「老库 `init.sql` 两张业务表」）——「业务表有几张」这件事在 `src/fetch/db.ts:13-33` 的接口面已有一份（`MemoNote`／`MemoReminder` 两张行形状），体检件又写了一个数字。

另外记一处**有意区分、不算违规**的：npm 包版本 `0.3.0`（`package.json:3`）与 HELP 数据世代 `1.3.0`（`sceneData.ts:39`）是两个不同概念，`render/pages.ts:30-31` 明写页面上的 `skill_version` **留空**、不冒充老值。

#### 铁律三 · 改动可预告（类型上写得出形状）—— **基本合规**（1 处形式问题）

- 全包 `src/**` 里 grep **无 `any`**（只有 `unknown` 与 `Record<string, unknown>`）；`cmd_read.ts` 的 `dispatch(key: string, params: Record<string, unknown>, db: MemoDb)` 在每个 case 里逐个 `typeof`／`String()` 收窄，形状说得出。
- **C1**：`src/config.ts:60` `values: loaded.values as unknown as MemoConfigValues` —— 一处 `as unknown as` 投影。件头注释（`:54-55`）给了依据（`base-link-core` 读回来已过「键齐＋类型对」两道校验），形式上仍是「说不出口的形状」。同形的还有 `help/helpFile.ts:174` `MEMO_HELP_GROUPS as unknown as readonly GroupAsset[]`。
- 本席只读、没有事前影响清单可比对，故这一条只按「类型面」判，不判「事前／事后对账」那一半。

#### 铁律四 · 名字取自 HELP —— **不合规**（6 处；本包最硬的一处）

HELP 的 8 个一级分组 id 是 `memo`／`search`／`remind`／`wish`／`checkin`／`mood`／`sync`／`init`（§1.1 表）。`src/` 下 6 个目录里：

| 目录／文件 | 是不是 HELP 一级分组的名？ | 判 |
|---|---|---|
| `src/wish/` | **是**（＝「心愿类」的 id `wish`） | **合规**。`src/wish/index.ts:1-2` 自己把这条理由写出来了：「能力目录名取自 HELP 一级分组『心愿类』的英文 id（`src/help/scenes/wish.ts` 的 `id: "wish"`）」 |
| `src/fetch/` | **不是**（工种词「取数层」） | 违规 D1 |
| `src/policy/` | **不是**（工种词「口径层」） | 违规 D2 |
| `src/render/` | **不是**（工种词「渲染层」） | 违规 D3 |
| `src/cli/` | **不是**（工种词「出口层」） | 违规 D4 |
| `src/help/` | **不是**（8 域里没有 `help` 这个域；「HELP」是交付物名，不是分组名） | 违规 D5 |
| `src/health.ts`／`src/config.ts` | **不是**，且**不在任何能力目录里**（`src/` 第一层直接落文件） | 违规 D6（结构标准「`src/` 下第一层必须是能力名，不能是工种名」同时不成立） |

判据口径（照抄仓规）：「把目录名念给用户听，他能在 HELP 里指出这是哪一组」——`fetch`／`policy`／`render`／`cli`／`help`／`health`／`config` 七个名字，用户一个都指不出。（`help/scenes/*.ts` 的 8 个文件名＝域 id，那部分是合规的——但那是资产文件名，不是能力目录名。）

#### 铁律五 · 接口小、里面厚 —— **不合规**（3 处）

实测口子大小（用编译产物数 `Object.keys`）：

| 门 | 对外名数 | 其中「`src/` 门外零消费」 |
|---|---|---|
| 包门 `src/index.ts` | **99** | —（它是 4 条 `export *` 的并集） |
| `fetch/index.ts` | **54** | 12 个（`DEFAULT_DB_FILENAME`、`LARK_DEFAULT_TIMEOUT_MS`、`REMIND_ADVANCE_MINUTES`、`REMIND_CRON_INTERVAL_MINUTES`、`REMIND_GRACE_MINUTES`、`SENTINEL_PREFIX`、`TASK_TITLE_MAX`、`authOpenId`、`checkScope`、`getReminderRow`、`larkVersion`、`setReminderRow`） |
| `render/index.ts` | **22** | 10 个（`MEMO_HTML_MAX_BYTES`、`MEMO_PAGE_CSS`、`MEMO_PAGE_RUNTIME`、`MEMO_TEMPLATES`、`escapeHtml`、`estimateBytes`、`fillTemplate`、`loadTemplate`、`parseMemoEnvelope`、`querySnapshot`） |
| `policy/index.ts` | **21** | 9 个（`MEMO_DEFAULT_TOP`、`MEMO_TOPS`、`REMIND_REPEAT_TYPES`、`WAKE_TOPS`、`WISH_SYNC_OPS`、`contentOf`、`routeRemind`、`routeWakeword`、`routeWish`） |
| `wish/index.ts` | **12** | 2 个（`WISH_DUE_LABEL`、`normalizeDue`） |
| `help/index.ts` | **2** | 0 |

- **E1**：包门 99 个名字（`src/index.ts:2-5` 四条 `export *`）——远超「一个文件对外给的东西不多于五个」。
- **E2**：`fetch/index.ts` 给 54 个名字，而 `src/` 门外只有 42 个有消费；剩下 12 个里，只有 5 个（`DEFAULT_DB_FILENAME`／`SENTINEL_PREFIX`／`authOpenId`／`checkScope`／`larkVersion`）被 test／tooling 用到，另 7 个（`LARK_DEFAULT_TIMEOUT_MS`／`REMIND_ADVANCE_MINUTES`／`REMIND_CRON_INTERVAL_MINUTES`／`REMIND_GRACE_MINUTES`／`TASK_TITLE_MAX`／`getReminderRow`／`setReminderRow`）连测试都没取——门比消费者大一倍。
- **E3**：`render/index.ts` 与 `policy/index.ts` 同理（各 10／9 个门外零消费）；其中 `MEMO_PAGE_CSS`／`MEMO_PAGE_RUNTIME`／`querySnapshot`／`MEMO_TOPS`／`REMIND_REPEAT_TYPES`／`WAKE_TOPS` 在**整个工作区**（含测试与 tooling）也找不到门外消费者。极薄件另记：`src/help/index.ts` 2 LF（只转两个函数）、`src/policy/wish.ts` 14 LF（只给 `routeWish`＋`WISH_SYNC_OPS`，`src/` 门外零消费、只被 `test/policy.test.mjs` 取）、`src/render/errors.ts` 11 LF。

#### 结构标准 —— **1 处不合规**（超告警线）

告警线＝**350 LF**（`packages/skill-memo-ilife/AGENTS.md:7`），范围＝`src/**/*.ts` ＋ `scripts/*.mjs`。**超线 3 件**：

| 文件 | LF | 超出 | 为什么超（直读） |
|---|---|---|---|
| `src/health.ts` | **614** | +264 | 一个文件里塞了：受限 YAML 子集只读解析（`:73-86`）＋ 4 个通用检查 ＋ 4 个备忘特有检查 ＋ 写探针（`accessSync`／`writeFileSync`／`unlinkSync`，`:23` 一次 import 齐）＋ 报告装配（`buildMemoHealthReport()`，`:426`） |
| `src/cli/cmd_read.ts` | **569** | +219 | HELP 支装配（`:62-182`）＋ 12 个 case 的分派（`:202-455`）＋ 落盘与退出码（`:471-567`）三件事同住一件 |
| `scripts/gen-help-assets.mjs` | **497** | +147 | 五件事同住：事实源读取（`readPayload`／`readYamlMeta`）、两行声明表（`PROMPT_EDITS`／`TEXT_EDITS`）、字段清洗、三把摘要锁＋双向对账、文本渲染出 9 个文件 |

按第四步口径应当场报的那句：**「已超线，需要根据规则进行重构。」**（本席只读，此处只记账，不动手。）参照：`t240-resolution.md:145` 记当时 `cmd_read.ts` 是 272 LF，`t225-structure-design.md:36` 记当时本包「0 件超线」、`cmd_read.ts` 147 LF —— **两件都是本轮之后长上来的**；`gen-help-assets.mjs` 497 LF 在 `t220-orchestrator-decisions.md` 裁决 21 D3 已裁「先不拆」。

### 4.3 不合规点台账（18 条）

| 编号 | 铁律／标准 | 点名的件 | 一句话 |
|---|---|---|---|
| A1 | 铁律一 | `src/fetch/sentinel.ts:11` | 反向依赖 `wish/ensure.js`（深路径越门） |
| A2 | 铁律一 | `src/cli/cmd_read.ts:38-44`、`src/help/helpFile.ts:38` | 深引内部件，绕过 3 道能力门 |
| A3 | 铁律一 | `src/fetch/`（`batch.ts`／`auth.ts`／`feishu.ts`／`tasks.ts`／`taskWrite.ts`／`sentinel.ts`） | 一个工种目录混装 6 个域的能力 |
| B1 | 铁律二 | `src/help/manifest.ts:26` × `src/config.ts:30` | 产物目录默认值两处定义 |
| B2 | 铁律二 | `src/fetch/paths.ts` × `src/config.ts:29` | 库文件名默认值两处定义 |
| B3 | 铁律二 | `src/fetch/auth.ts:14` × `src/config.ts:33` | 二维码目录默认值两处定义 |
| B4 | 铁律二 | `src/health.ts:52` | 「业务表 2 张」第二份定义 |
| C1 | 铁律三 | `src/config.ts:60`、`src/help/helpFile.ts:174` | `as unknown as` 两处（形状投影说不太出口，有依据） |
| D1 | 铁律四 | `src/fetch/` | 工种词目录名 |
| D2 | 铁律四 | `src/policy/` | 工种词目录名 |
| D3 | 铁律四 | `src/render/` | 工种词目录名 |
| D4 | 铁律四 | `src/cli/` | 工种词目录名 |
| D5 | 铁律四 | `src/help/` | 工种词目录名（8 域里没有 `help`） |
| D6 | 铁律四＋结构标准 | `src/health.ts`、`src/config.ts` | 顶层散件，不在任何能力目录、名字不在 HELP |
| E1 | 铁律五 | `src/index.ts:2-5` | 包门 99 个名字 |
| E2 | 铁律五 | `src/fetch/index.ts` | 门 54 个名字、门外零消费 12 个（7 个连通用的都没有） |
| E3 | 铁律五 | `src/render/index.ts`、`src/policy/index.ts`、`src/help/index.ts`、`src/policy/wish.ts` | 门 22／21 个名字、门外零消费 10／9；极薄转发件占层 |
| F1 | 结构标准（告警线） | `src/health.ts` 614、`src/cli/cmd_read.ts` 569、`scripts/gen-help-assets.mjs` 497 | 三件超 350 LF |

**18 条**（A 3 ＋ B 4 ＋ C 1 ＋ D 6 ＋ E 3 ＋ F 1）。合铁律的正面记两笔：`src/wish/` 是唯一按 HELP 一级分组切出的能力目录，对外只经 `wish/index.ts`（12 个名字）；共用件的生长也对（落盘、填充、形状校验、配置读写都长在 `base-paint`／`base-link-core`，本包不自持第二份——`cli-help-229.test.mjs:84-109` 还专门钉了「包内只有一个件 import `base-paint/save-html`」）。

**另记一条不计入上面 18 条的卫生问题**：`src/cli/cmd_read.ts:39` 从 `../fetch/paths.js` 引了三个名字，其中 `resolveDbPath` 在正文**一次都没用**（本席 grep 全文：只出现在 `:39` 这一行 import 本身）。它经 `fetch/index.ts:2` 转出，是本包唯一一个「被 import 了却没人用」的出口名——按 token 口径它算「门外有消费」，按语义它是死引用。

---

## 5. 现有 6 份模板与 render 的关系

### 5.1 模板是 HTML 文件（不是 TS 里的字符串）

- **形态**：6 份 `.html` 文件住 `packages/skill-memo-ilife/templates/`，随包发布（`package.json:16-20` 的 `files` 列 `templates/*.html`）。

| 模板文件 | 字节 | 三标记齐否 | 被谁接线（命令分支） |
|---|---|---|---|
| `templates/memo_query.html` | 13,067 | 是 | **无（零接线）** |
| `templates/sync_report.html` | 18,293 | 是 | `cmd_read.ts:362`（`memo.sync`） |
| `templates/wish_plan.html` | 12,493 | 是 | `cmd_read.ts:318`（`memo.wish` `wizard:'plan'`） |
| `templates/wish_complete.html` | 11,846 | 是 | `cmd_read.ts:339`（`memo.wish` `wizard:'complete'`） |
| `templates/change_category.html` | 12,736 | 是 | `cmd_read.ts:403`（`memo.batch` 收集支） |
| `templates/init_report.html` | 11,478 | 是 | **无（零接线）** |

（「三标记」＝`<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--INJECT-DATA-->`，本席逐份实测 6/6 全含；测试也逐份断言，见 `test/render.test.mjs:48-59`。）

- **装载**：`src/render/templates.ts:7-14` 的 `MEMO_TEMPLATES` 是**名字白名单**（`as const` 元组 ＋ 派生 `MemoTemplate` 类型）；`loadTemplate(name)`（`:19-24`）先查白名单再 `readFileSync(join(templatesDir, name + '.html'), 'utf8')`，目录由 `import.meta.url` 反推（`:17`），未知模板／读不到都抛 `MemoRenderError('MEMO_TEMPLATE_MISSING')`。
- **模板源不在本包**：HELP 整页用的不是这 6 份，而是共享层 verbatim 的 `base-paint/help-shell`（`src/help/helpFile.ts:35` `renderHelpShellHtml`，A 路）；改渲染规则要改共享层的源模板再跑 `pnpm --filter base-paint gen:help-shell`（`helpFile.ts:4-5` 自述，本包一行不改）。

### 5.2 渲染入口函数（签名逐个）

| 入口 | 签名 | 住哪 | 干什么 |
|---|---|---|---|
| `pageEnvelope(input)` | `(input: { commandCn; wakeWord; sceneId; title; summary; sections; copyLog; extra?; message }) => Record<string, unknown>` | `src/render/pages.ts:32-56` | 老 `_envelope` 的换皮：`{status, data:{meta, scene:{scene_id, snapshot}, copy_log, generated_at, …extra}, message}`；`skill_version` 位**留空**（`:30-31` 说明：不冒充老版本号） |
| `querySnapshot(items)` | `(items: Row[]) => PageSnapshot` | `pages.ts:62-83` | 查询页快照（结果数／有排期／有附件／有提醒 ＋ 明细行）。**6 份模板里没有它的消费者** |
| `syncSnapshot(c)` | `(c: { backfilled; synced; dueAdded; dueOverridden; dueRemoved; skippedNoMark; skippedAlreadyDone; skippedNoLocalNote; errors }) => PageSnapshot` | `pages.ts:87-129` | 同步报告五段（完成／排期变更／补建／跳过／错误） |
| `wishPlanSnapshot(items, suggestDue, includeAll)` | `(items: Row[], suggestDue: string \| null, includeAll: boolean) => PageSnapshot` | `pages.ts:138-150` | 排期向导快照 |
| `wishCompleteSnapshot(items)` | `(items: Row[]) => PageSnapshot` | `pages.ts:153-160` | 完成向导快照 |
| `changeCategorySnapshot(items, from, to)` | `(items: Row[], from: string \| null, to: string \| null) => PageSnapshot` | `pages.ts:163-181` | 批量改分类快照 |
| `fillMemoPage(template, payload)` | `(template: string, payload: Record<string, unknown>) => string` | `pages.ts:184-197` | **整页入口**：`loadTemplate()` ＋ 共享 `fillTemplate()`（`base-paint`，`pages.ts:4`）＋ 窄资产 `MEMO_PAGE_CSS`／`MEMO_PAGE_RUNTIME`（`pageAssets.ts`）＋ `assertHtmlSize`；失败一律包成 `MemoRenderError('MEMO_PAGE_FILL')`（出口 exit 5） |
| `fillTemplate(templateText, data)` | `(templateText: string, data: unknown) => string` | `pages.ts:200-211` | 与别家技能侧同形的探针口（仓根 `tooling/skill-html-snapshot.mjs:179-180` 直调） |
| `renderEnvelopeHtml(env)` | `(env: Envelope) => string` | `src/render/html.ts:26-41` | 按 shape 出 `<section …>` **片段**（list／detail／receipt／stat／analysis／fallback）；未知形状抛 `MEMO_SHAPE_MISMATCH` |
| `renderMemoHelpHtml(data)` | `(data: ReturnType<typeof buildMemoHelpFileData>) => string` | `src/help/helpFile.ts:217-220` | HELP **整页**（走共享壳 A 路） |
| `buildMemoHelpFileData(now, opts)` | `(now: Date, opts?: { initialized?: boolean }) => {…5 必需键 ＋ contact／version／init_banner}` | `help/helpFile.ts:158-211` | 内容资产 ＋ 派生 → 全量 HELP JSON（纯函数，`now` 显式传入） |

### 5.3 产物落盘走哪个共用件、绝对路径回执在哪算

- **唯一落盘点**：共用件 `saveHtmlFile(input)`（`packages/base-render/src/output/saveHtml.ts:339-382`，出口子路径 `base-paint/save-html`）。全包**只有一处 import 它**：`src/cli/cmd_read.ts:8`，包内没有第二份（`test/cli-help-229.test.mjs:93-100` 把这条钉死：`importers.length === 1`）。
- **本包只出「落点意图」**：`landingOf(dbPath, stem)`（`cmd_read.ts:94-96`）＝ `{ dir: join(resolve(dbPath), helpHtmlDirName()), stem }`；`deliverMemoHtml({explicit, landing, html, window})`（`cmd_read.ts:110-129`）是包内**唯一**调 `saveHtmlFile` 的函数，两种态：
  - `explicit`（`--html <路径>`）→ `{dir: dirname(abs), file: basename(abs), onExists:'overwrite'}`（逐字落点、覆盖写、不递补、**不吃复用窗口**）；
  - `landing` → `{dir, stem}` ＋（可选）`{onExists:{reuse:{byAge: window}}}`；不给 `window` 时用共用件缺省 `'succession'`（带时间戳 ＋ 同秒 `_N` 递补）。
  `cmd_read.ts:107-109` 还专门写了「缺省支不许传 `onExists`」的理由（传了 `overwrite` 就退化成固定名、同秒互相覆盖）。
- **绝对路径回执在哪算**：**在共用件里**，不在本包。`receiptOf(absPath, expected?)`（`saveHtml.ts:244-251`）`return { mode: 'file', path: absPath, bytes: actual.length }`，其中 `path` 由 `resolve(input.dir)`（`:346`）＋ `join(dirAbs, name)` 得来（`:357`／`:369`／`:378`）；`bytes` 是**写后回读的实际字节数**（`:245-249`，写后回读不符即抛 `EIO`）。本包只有一处把它挂到 envelope 顶层：`cmd_read.ts:560-561`（`JSON.stringify(delivery ? {...env, delivery} : env)`，既有的五字段一字不改、序不变；`cli-help-230.test.mjs:95` 断言键序恰为 `version,skill,shape,key,data,delivery`）。
- **复用窗口**（#245）：窗口毫秒数由共用件 `helpReuseWindowOf`（`saveHtml.ts:136-141`，缺省 `HELP_REUSE_DEFAULT_HOURS = 24`）算，本包只把它翻成 exit 2（`cmd_read.ts:90`）。

---

## 6. 测试与门禁

### 6.1 包内 `package.json` scripts（逐条）

`package.json:31-34` 只有两条：

| script | 命令 | 跑什么 |
|---|---|---|
| `build` | `tsc -b && node scripts/build-help.mjs` | ① 按 `tsconfig.json` 编出 `dist/`；② 跑 `scripts/build-help.mjs`，把 `buildHelpLookup()` 渲成速查表、**重写 `SKILL.md` 的 `<!-- HELP-AUTO-START/END -->` 块**（`build-help.mjs:23-32`；`import` 时不写盘，只有直接执行才写，`:34-38`） |
| `test` | `node --test ../../test/scaffold.test.mjs test/*.test.mjs` | 仓根 `test/scaffold.test.mjs`（转调 `tooling/check-boundaries.mjs`）＋ 包内 `test/*.test.mjs` 15 个文件。**不含** `test/helpers/*.mjs`（它们是夹具，不是用例） |

**没有的 scripts**（对照兄弟件与仓根）：本包**没有** `gen`／`gen:check`／`snapshot`／`lint` 任一脚本；`tsc` 只作为 `build` 的第一步出现。仓根 `pnpm test`（仓根 `package.json:15`）把 `packages/skill-memo-ilife/test/*.test.mjs` 列进了统一测试链，并且它的第一项是仓根 `test/*.test.mjs`（含 `test/scaffold.test.mjs` ⇒ `tooling/check-boundaries.mjs` 也跑）。两处都不含 `test/helpers/*.mjs`（夹具不是用例）。

### 6.2 测试文件覆盖了哪些契约（15 个用例文件 ＋ 2 个夹具）

| 文件（LF） | 覆盖的契约 |
|---|---|
| `test/cli-help-229.test.mjs`（142） | #229／#240：`manifest` 三个命名值逐字且两支分名（`:72-80`）；**结构烟雾锁**——自持件 `src/help/memoOutput.ts` 已删、独占写三名字不再出现、包内只有一个件 import `base-paint/save-html`（`:84-109`）；`--html` 支真 spawn 的覆盖写与逐字落点（`:113-141`） |
| `test/cli-help-230.test.mjs`（287） | #230 出口五例（**只走真 spawn**）：①名字通式与扁平落点 ＋ 回执绝对路径 ＋ 域级索引载荷（8／13／30／1.3.0）＋「跑完不建库」；②产物＝共享壳前缀／后缀／标题槽逐字；③并发 6 次独占递补（`_N` 从 `_2` 起）；③b #245 缺省复用窗口；④三支互不串（HELP／速查表／`q` 零落盘）；⑤退出码矩阵 0／2／3／5 ＋ 配置件坏键 exit 1 |
| `test/help-dom-243.test.mjs`（597） | #243 渲染后 **DOM 层**锁（自写最小 DOM 桩）：①8 域／13 组／30 场景卡真的建出 DOM 节点；②初始化 6 步骤卡 `title`／`desc` 逐条在 DOM；③可见正文 7 类词全 0（`memo.`／`--html`／`memo-cmd-read`／脚本路径／待开发／无唤醒词／HELP 自身唤醒词）；④带字段的卡展开后 input 数对得上。带 `T243_MUTATE=1` 变异自证开关（`:40-42`） |
| `test/help-file-228.test.mjs`（190） | #228 载荷层 15 条：标题由共享层拼、顶层键集、`subtitle` 计数派生、`meta_blocks`／`recommendations` 不传、`aliases` 剥净（闭集 7 键）、页面不出现命令名也不标缺失、`contact` 不带 `url`、`init_banner` 的 `hidden` 单开关 ＋ `prompt` 单源取 `memo_init_setup`、裁决 20 的 B 路 schema 冲突记录、产物可复现（同参两次逐字节相同）、`formatHelpMinute` 口径、空分组抛 `missing-data` |
| `test/help-reuse-245.test.mjs`（127） | #245 复用窗口五例：一天缺省／两支都吃窗口／`reuseHours` 可换（3 小时同效、`0`＝每次新的）／坏参 exit 2 且不落盘／不吃窗口的路照旧（`--html` 覆盖、`q` 不落盘、看帮助不建库） |
| `test/wizard-pages-665.test.mjs`（193） | #665 六例：W1 排期向导／W2 完成向导（默认不勾选）／W3 批量改分类（收集出页 ＋ 执行改分类）／W4 同步报告（缺省落盘 ＋ 显式路径）／W5 授权四步形状／W6 lark 缺席 exit 4。每条都断 `delivery{mode,path,bytes}` 三件套 ＋ 落盘存在 ＋ 体积一致 |
| `test/wish-sync-661.test.mjs`（305） | #661 心愿类合成写 T1–T11：建带排期／四读数模板／建前查重（M-04）／两条有意偏离（D-22 无排期也查重、D-21 200 字截断）／五操作／批量排期／删心愿 C 口径（默认标完成、`purge` 真删）／反向对账三步 M-09（含 11 项统计）／远端不可用如实报没成／排期只对心愿生效 |
| `test/sentinel-666.test.mjs`（168） | #666 自检 D1–D6：成功链（建／改／完成／删各一次、本地零写）／`dryRun` 四门过零调用／默认路径零写／闸门关 exit 4 零调用／建失败短路无残留／删不掉时点名残留 ＋ exit 4 |
| `test/media-dir-712.test.mjs`（238） | #712 附件目录：取值口解析成绝对路径／目录内能存能读（落相对路径）／老写法兼容／目录外绝对路径被拒（exit 2）／同前缀不同目录被拒／`..` 穿出被拒／目录不存在给人话（点名 `media.dir`）／老数据不迁／不带 `media` 照旧能落／新旧规则逐条对照读数 |
| `test/config-695.test.mjs`（141） | #695 配置面：①默认值逐项等于改造前常量；②三个配置 key 走 CLI 真出口（读／写／重置，重置先留 `.bak`）；③配置真的进执行路径（改 `db.dir`／`html.dir`／`files.help` 后落点跟着变）；④测试进程缺 `ILIFE_CONFIG_DIR` 即响亮失败；⑤配置件坏键给人话（带行号与文件名）且走预检那一档 |
| `test/cli.test.mjs`（104） | 出口主干：`memo.search` 纯 JSON list／`memo.create` 回执＋落盘／更新删除闭环／完成心愿原子转换（含建侧降级 exit 4 但本地照落）／退出码 3／2／1／`memo.detail` 查无 exit 4／`--html` 落出 `<section` 片段 |
| `test/render.test.mjs`（82） | 渲染层：12 key 建 envelope 全字段可用（`Object.keys(MEMO_KEY_SHAPES).length === 12`）／坏 key 与错形状 throw／转义与超体积门／**模板 6 随包**（含 `init_report`）且共享 filler 一次填完三标记／整页信封＋快照＋填充一次成 |
| `test/policy.test.mjs`（58） | 口径层：唤醒词路由（含「批量改分类走 batch、改子分类走 update」的消歧）／无命中与缺槽位 throw／4 顶层分类 ＋ 默认备忘 ＋ sub 归一／提醒四向 ＋ 时间校验 ＋ 重复口径／心愿与 CRUD 政策 |
| `test/fetch.test.mjs`（103） | 取数层：列／取／搜（CJK 子串 ＋ 分类过滤）／坏输入 throw 不返空／lark 四门（fake CLI）／`lark.cliPath` 坏路径报错点名配置项 |
| `test/skill.test.mjs`（35） | 说明面：`SKILL.md` 含 `memo-cmd-read`／顶层分类／两标记；`buildHelpLookup()` 每条短语**真能路由回同 key**且 shape 不是 `??`；**`HELP-AUTO` 块与 `buildHelpBlock()` 逐字新鲜** |
| 夹具 `test/helpers/memo-sqlite.mjs`（62）／`config-base.mjs`（61） | 临时库（**绝不连活库**，照 `AGENTS.md:19`）＋ 配置目录隔离（`ILIFE_CONFIG_DIR`） |

**包外但在同一仓门里的覆盖**（根 `pnpm test` 会跑）：`test/memo-e2e.test.mjs`（从 `dist/index.js` 取 `buildHelpLookup`／`routeWakeword`）、`test/combos-p8.test.mjs`（读 `MEMO_KEY_SHAPES` ＋ `dist/cli/cmd_read.js`）。

### 6.3 覆盖缺口（本席实测，逐条给判据）

| 缺口 | 判据 |
|---|---|
| **`gen-help-assets.mjs --check` 没有包内用例** | 本席在 `test/` 下 grep `gen-help-assets` 得 0 命中；全仓唯一调用点是 `docs/skills/skill-memo-ilife/t661-变异电池.mjs:75`。兄弟件 `skill-schedule/test/help-assets.test.mjs:183` 有包内用例（同法可照抄）。生成器件头 `:7` 自述「**不进 build／test 管线**，事实源在仓外」——但本机**两处事实源都在盘**（`D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_20260820_162453.html`、`D:\2Study\StudyNotes\SKILLS\备忘录\references\scenarios.yaml`，本席 `Test-Path` 双 True），所以这道门今天跑得起来 |
| **`memo.config.*` 四键无包内用例** | `test/config-695.test.mjs:60-90` 只覆盖 read／write／reset 三键；`memo.config.check`（体检）与 `src/health.ts`（614 LF）在 `test/` 下 grep `memo.config.check`／`buildMemoHealthReport` 得 0 命中。体检的真实消费者是插件侧 `packages/plugin-manager/src/health-contract.ts`（`src/health.ts:9` 自述） |
| **命令清单无单一事实源、也无门** | 12 个 key 的清单在三处各写一遍（`cmd_read.ts` 的 `case`、`render/envelope.ts:5-21`、`test/render.test.mjs:5-20` 的 `GOOD` 夹具 ＋ `:24` 的 `assert.equal(…, 12)`）——第 13 条命令要改四处 |
| **唤醒词计数文里有一处陈旧** | `SKILL.md:82` 写「28 条唤醒词」，实测 `buildHelpLookup()` 29 条（`help/lookup.ts:30` 自述也是 29）。机器门拦不到它：`test/skill.test.mjs:18-27` 断的是「速查表与 `WAKE_TABLE` 等长且可路由」，不比散文里的数字 |

---

## 7. 结论

1. **HELP 这条线是圆的**：8 域／13 二级组／30 场景的资产由生成器出（`gen-help-assets.mjs`，带三把摘要锁＋两地交叉复核），渲染走共享 help 壳（A 路），落盘走共用件 `saveHtmlFile`，回执绝对路径 ＋ 字节数由共用件算；四道锁（#228 载荷／#230 真 spawn 出口／#243 DOM／#245 复用窗口）真跑在仓门里，且仓根 `snapshot:html:check` 把 6 份模板 ＋ 12 key 片段逐件 sha256 钉住。
2. **30 场景只有 4 条在缺省调用下落 HTML**：批量改分类向导、完成心愿向导（仅批量支）、心愿排期向导（向导支）、同步报告。**6 份模板里 2 份（`memo_query`／`init_report`）零接线**，对应 3 条「结果页」承诺（#7／#8／#9／#10 一类）与 1 条「初始化报告页」承诺（#30）；**#30 连命令 key 都没有**，**#15（给已有笔记加提醒）没有对应命令分支**，**#10 的 `timeRange` 参数发出去了但没人读**，**#17 的唤醒词预设 `{done:false}` 进不到「已触发」那一支**。这四条是「HELP 承诺 > 实装」的具体清单。
3. **命令登记不合仓规那份纪律**：命令事实散在 5 处、无 `src/<能力>/commands.ts`、无 per-包生成器、`pnpm gen`／`gen:check` 对命令表零覆盖（只覆盖 `SKILL.md` 的 `CALL-FORM` 块）。第 13 条命令要改四处手写文件——正是纪律 §一 想解掉的那个形状。
4. **`src/` 形状 18 条不合规**，其中铁律四（名字取自 HELP）最硬：6 个目录里只有 `src/wish/` 达标；`src/health.ts`／`src/config.ts` 是顶层散件。三件超 350 LF 告警线（`health.ts` 614／`cmd_read.ts` 569／`gen-help-assets.mjs` 497）。
5. **解耦较好的部分值得保留**：`src/wish/` 是标准的能力目录（10 件、能力门 12 个名字、`gate.ts` 把远端闸门收成一个判据）；共用件生长方向对（落盘／填充／形状校验／配置读写都在 `base-*`，本包不自持第二份，并有 #229 的结构烟雾锁钉住）；`MEMO_KEY_SHAPES`／`MEMO_HELP_GROUPS`／`WAKE_TABLE` 三处「唯一定义地」立得住。

---

## 附录 A · 本报告的取证方式

- 只读手段：`read`／`glob`／`grep`／`pwsh`（`Get-ChildItem`、`Test-Path`、`[System.IO.File]::ReadAllText` 数 `\n`）＋ 用编译产物做**只读** `import`（`node -e`，不带任何写操作；跑前设 `ILIFE_CONFIG_DIR` 指向 `%TEMP%` 的临时目录，避免读／落真实家目录配置）。
- **未做**：未 `git add`／`commit`／`switch`／`reset`；未跑 `pnpm build`／`pnpm test`／`pnpm gen`／任何生成器（`--check` 也在内，因为本席只读、且跑生成器不在本次任务范围）；未改仓库任何文件。
- 唯一写入：本报告（`docs/skills/skill-memo-ilife/research/new-memo-current-state.md`），目录由本席新建。

## 附录 B · 读这份报告时最容易踩的三个数

| 数 | 是多少 | 别混成 |
|---|---|---|
| HELP 场景 | **30**（8 域／13 二级组） | 不是命令数，也不是唤醒词数 |
| 命令 key | **16**（12 进 switch ＋ 4 在预检前拦）；其中进 `MEMO_KEY_SHAPES` 的 12 | 不是 30，也不是唤醒词数 |
| 唤醒词 | **29**（17 字面 ＋ 12 展开） | `SKILL.md:82` 写的 28 是陈旧值；9 个 key 有词，3 个 key（`memo.sync`／`memo.stats`／`memo.help.lookup`）零词 |
