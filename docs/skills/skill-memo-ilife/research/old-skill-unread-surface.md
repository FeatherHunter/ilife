# 老技能「未读面」取证（#837 第 9 条 ／ #822 的形状族输入）

**谁读**：[裁定票 #837](https://github.com/FeatherHunter/ilife/issues/837)（第 9 条「本席未读面」）与 [册子冻结 #822](https://github.com/FeatherHunter/ilife/issues/822)（形状族）。

**起因**：唤醒词对账（#821）声明「老技能 21 个子命令只按需读了附近；`script/feishu_sync.py` 与 6 份页面模板未逐行读」。这一页把这两块补上，**只补事实**。

---

## 一 老技能的**完整对外命令面**：27 条，其中**没有 auth**

| 源件 | 子命令数 | 逐条 |
|---|---|---|
| `script/memo_cli.py` | **21** | `add`／`search`／`update`／`delete`／`complete-wish`／`get`／`search-date`／`update-category`／`update-sub-category`／`set-due`／`wish-batch-plan`／`wish-complete`／`batch-update-category`／`sync-from-feishu`／`remind`／`due`／`dismiss`／`reminders`／`completed`／`init-report`／`help`（此前 #234 已逐行坐实） |
| `script/feishu_sync.py` | **6** | `check`（检测飞书 CLI 可用）／`add`（建 task）／`complete`（标完成）／`update`（改标题）／`sync-from-feishu`（反向同步）／`list-tasklists`（列 tasklist） |
| **合计** | **27** | —— |

**关键读数：27 条里没有一条叫 `auth`。** `feishu_sync.py:927` 的 `check` 只「检测飞书 CLI 是否可用」，不做授权。

另一条：`feishu_sync.py` 里搜「唤醒词／wake_word」**命中 0** —— 这个脚本**不带任何唤醒词**，纯粹是 `memo_cli.py` 的下游实现。

## 二 两个同名近似的目录，分工是明确的

```
script/     ← 命令面 ＋ 渲染 ＋ 校验（11 件）
              memo_cli.py（78 KB，21 子命令）／feishu_sync.py（39 KB，6 子命令）
              memo_render.py（26 KB，页面渲染）／init.sql（库结构）
              template_lint.py ／validate_scenarios.py（两道校验）／reminder_scheduler.py
scripts/    ← **只有一个件**：feishu_auth_helper.py（8 KB）
```

⇒ **「飞书授权」在老技能里是一件 `scripts/` 下的辅助件，不是 `script/` 下的命令。** 它连子命令身份都没有。

这条把 #837 第 1 条的两种读法**收窄成一种**：按「词／场景」读，老技能**确实没有**这条词；按「能力」读，它有的是一件**辅助脚本**（`init_app`／`poll_auth`），并且按老 `SKILL.md:370` 自述是「本 SKILL 自带」的安装流程步骤。

**两种读法都不支持把「飞书授权」当成一条独立的场景唤醒词** —— 因为 HELP 里没有这个场景卡，挂了也没有位置。

## 三 6 份模板的区块结构：**自然聚成 3 个形状族**

按各模板里出现的 class 名去重统计（这是模板自带的形状标记）：

| 模板 | 独有的形状标记 | 与他件重合的 |
|---|---|---|
| `memo_query.html` | `content`／`copy`／`grid`／`item`／`item-head`／`sr-only`／`small` | `hero`／`lead`／`meta`／`panel`／`stat`／`toolbar`／`hm-actions`／`hint` |
| `wish_plan.html` | `wish`／`wish-check` | `badge`／`ghost`／`hero`／`hint`／`hm-actions`／`kpi`／`lead`／`meta`／`panel`／`primary`／`stat`／`toolbar` |
| `wish_complete.html` | `wish`／`wish-check` | 同上（**与 `wish_plan` 的类集合逐项相同**） |
| `change_category.html` | `note-content`／`note-head`／`note-id`／`note-meta` | 同上 |
| `init_report.html` | `data-panel`／`status-card`／`status-icon`／`status-meta`／`status-sub`／`status-title`／`wrap` | `hint`／`hm-actions` |
| `sync_report.html` | `data-panel`／`detail`／`detail-body`／`err-list`／`item-content`／`item-id`／`item-list`／`item-mark`／`kpi-hint`／`kpi-label`／`kpis` | `hint`／`hm-actions`／`kpi` |

**三处可用的读数**：

1. **`hm-actions` 出现在全部 6 份** —— 那是「复制区那一排按钮」，**6 份各写了一遍**。与基线读数（`research/baseline-readings.md` §2②：同一句「复制区说明行」在 6 份里各写了一遍，分隔符命中 7 处）**指的是同一块**。⇒ 收成一个共用件是**老技能就该做没做**的事，不是新问题。
2. **自然形成 3 个形状族**：**列表／查询族**（`memo_query`）／**向导族**（`change_category` ＋ `wish_plan` ＋ `wish_complete`，三份的类集合高度重合）／**报告族**（`init_report` ＋ `sync_report`，都是「状态卡 ＋ 数据面板」）。
3. **向导族里 `wish_plan` 与 `wish_complete` 的类集合逐项相同** ⇒ 这两份本来就是**同一个形状参数化**出来的，老技能只是各存了一份。

⇒ 这条给 #822 的形状族归并提供了一个**来自老实物本身的天然分界**：不必另发明，照 3 族起步即可（64 格 ÷ 3 族的可行性由 #822 判）。

## 四 顺带坐实

- 老技能**自带两道校验**：`script/template_lint.py`（模板 lint，对应老 `docs/adr/0006-template-lint-infrastructure.md`）与 `script/validate_scenarios.py`（场景资产校验）。这解释了老技能为什么模板能保持一致 —— **新仓对应的是 `scripts/gen-help-assets.mjs --check` 那一道**，而它在新仓 `test/` 里**零调用**（沿用 #821 的读数）。
- 老技能 `script/` 下还有两个 `.bak.20260701` 备份件与一个 `tmp_add_4wishes.py`（一次性脚本）—— **都不是命令面**，别把它们的名字数进子命令。

## 五 这次仍未读的

- `script/feishu_sync.py` 的**实现细节**（只读了命令面与唤醒词命中，没逐行读三阶段拉取／去重逻辑）。新仓这边的对应实现在 `src/wish/`（`ensure.ts`／`reconcile.ts`／`taskSync.ts`），#658 已按规格落地并对拍过 —— **若后续要引老行为，以新仓那份为规格、老件为对照**。
- `script/memo_render.py` 的逐行读（#821 只读了与唤醒词有关的行）。
- 老 `备忘录.html` 实体（已判**过期**，不作渲染基准，见 #220）。
