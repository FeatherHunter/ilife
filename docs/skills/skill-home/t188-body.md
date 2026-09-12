## Question

把老骨架落成仓内 typed const，照 #146 的做法：

- 内容资产机器生成（生成器住 `packages/skill-home/scripts/`），带 `--check` 字节一致校验；
- 摘要锁（SHA-256）＋与 `WAKE_TABLE` 双向对账（多少条在位／多少条有落）；
- HELP 自身的 3 条短语不进场景目录（防自指），从口径层派生。

**资产的准确形状**（票 3 `#186` 实测，字段名逐字）：

```jsonc
{ "id": "items", "icon": "🏠", "label": "物品管理",
  "subgroups": [{ "id": "items_1", "label": "录入",
    "scenes": [{ "id": "add_text", "title": "录入一件新物品", "wake_word": "录物品",
                 "status": "", "prompt_template": "…老 yaml prompt 逐字…",
                 "types": ["采集", "回执"] }] }] }
```

- 场景 `id` 取老 yaml 的 **`scenario_id`**（语义 id，73/73 唯一）；`types` 由老 yaml 的单值 `type: 采集+回执` **按 `+` 切开**成数组；二级组 `id` 照记账通式 **`<域id>_<序数>`**（`items_1`…`items_7`、…、`link_1`…`link_3`）；三层 id 都要唯一（模板把场景 id 当字典键，重名即后写覆盖前者）。
- 域顺序照老 yaml 的 `domains` 列表、二级组与场景照出现序（老 `help_center.py:77-104` 的成组规则）。
- 形状断言照记账 `packages/skill-bill/scripts/gen-wake-assets.mjs:99-118`：域 9、组 30、场景 73、id 唯一、`types` 非空且都落在模板配色表（采集／查看／结果／向导／批量／校验／选择／过程／回执／录入）内、`status` 全场同值（实测 73/73 为空串）。
- **事实源是老 yaml**（`D:\2Study\StudyNotes\SKILLS\居家管家\references\scenarios.yaml`）；**别拿老实物 HTML 当搬运源**（技能根 73 场景那份与 `.db` 59 场景那份都是旧一代产物，后者少 14 条）。
- 要一起对齐的两条（票 3 没定）：**`init_banner.prompt` 取哪条场景**（老家那条场景 id 叫 `first_use`，记账叫 `setup_init_wizard`）与 **`types` 切分后的顺序／去重规则**。资产里那条场景的最终 `id` 直接决定票 6 的取值常量。

**结构按新代码架构规则**（用户 Q8=(a)）：

- 落点（目录名取自 HELP 一级分组、英文名）**以结构设计票的裁决为准**；照抄形状，**不照抄** bill 的 `src/triggers/` 这个工种目录名；
- 文件与公开接口名取自**下一级**（子功能）；
- 被碰到的旧件**就地摆正**；
- **第一步「影响清单」与第二步「结构设计」先报用户点头**再动手；交付时报第五步「交付对账」；任何文件超告警线当场报「已超线，需要根据规则进行重构。」。

入库内容以票 2 的对账表为准。

## 进度：0%

下一步：等票 2（内容资产对账）＋结构设计票关票。
