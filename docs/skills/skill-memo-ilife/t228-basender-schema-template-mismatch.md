## 问题

`packages/base-render` 的**通用 help 模板**与**机读 schema** 在两处对不上：模板认的字段，schema 判非法。任何用这两个键的技能都会撞上，不是备忘录独有。

由地图 `#220`（备忘录 HELP）的侦察会话在备料时实测发现，来源 `docs/skills/skill-memo-ilife/t227-datasource-recon.md`。

## 缺陷一：`contact.items[]` 闭集禁止 `url`，而模板会读 `url`

- **schema**：`packages/base-render/src/spec/help.ts:218-222`，`contact.items[]` 是 **`{label, value}` 闭集 ＋ `additionalProperties: false`** ⇒ 加 `url` 字段**必判 `schema-invalid`**（校验入口 `base-render/src/help.ts:338-362` 的 `validateSceneData`）。
- **模板**：`packages/base-render/assets/help-template.html` `:1804` 处**有读 `url` 的判断**（即模板本来就打算把联系人渲染成可点链接）。
- **后果**：**用户对备忘录 HELP 的裁定 V6=B「`contact` 补可点链接」在现 schema 下写不进去**。用户明确选了这个非推荐项，规格上却被共享校验器挡住。落点只剩两条：把链接塞进 `value`（可看不可点），或让 schema 收下 `url`。

## 缺陷二：`init_banner.steps` 三方各说各话

| 出处 | 要的形态 |
|---|---|
| **schema** `spec/help.ts:207` | **字符串数组** |
| **模板** `assets/help-template.html:1778` | **对象数组 `{title, desc}`** |
| **老生产路** `SKILLS\备忘录\script\memo_render.py:516-523` | 传的是**对象数组** |

⇒ 老备忘录的 `init_banner` payload **今天过不了校验**。用这个键的任何技能都同命。

## 建议修法（择一，须先定谁权威）

1. **以模板为准改 schema**（模板是用户肉眼看到的东西）：`contact.items[]` 收下可选 `url`；`init_banner.steps` 改成 `oneOf`（字符串 或 `{title,desc}` 对象）。
2. **以 schema 为准改模板**：删模板里读 `url` 的判断；`init_banner.steps` 按字符串数组渲染。

⚠️ 判定时的注意：`packages/base-render/assets/help-template.html` 是**生成物 `src/helpShell.ts` 的源**，改源必须跑 `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红。

## 风险说明

- 这两处是**加到共享层**的改动，会影响所有消费 `base-paint/help-shell` 的技能（卡路里／饼干记账／私家大厨／作息／备忘录）⇒ 应作为共享层缺陷单独裁决，**不要**在某一张技能地图里顺手改。
- 缺陷一直接卡住**一条已成文的用户裁定**（V6=B），优先级高于缺陷二。

## 附：逐维隔离探针实测（地图 `#220` 票 8 交付时补测，2026-09-12）

通用模板有**两条消费路**，对同一份载荷的要求**互相冲突**：

- **A 路**＝`renderHelpShellHtml`（出整页 HTML，**不做 schema 校验**）；
- **B 路**＝`renderHelpShell` → `validateSceneData` → `SCENE_DATA_SCHEMA`（**fail-closed 校验器**）。

逐维隔离实测（⚠️ 必须**逐维**测：最初把 `closable` 与 `steps` 放一起测时**先炸的是 `closable`**，差点把结论记反）：

| 载荷 | A 路 | B 路校验器 |
|---|---|---|
| `init_banner` 无 `steps`（只有 title/subtitle/button_text/prompt） | OK | OK |
| `init_banner` ＋ `closable: true` | OK | **THROW `schema-invalid` 多余字段：closable** |
| `init_banner` ＋ `hidden: false` | OK | **THROW `schema-invalid` 多余字段：hidden** |
| `init_banner` ＋ `steps` ＝ **字符串数组** | OK | OK |
| `init_banner` ＋ `steps` ＝ **对象数组 `{title,desc}`** | OK | **THROW `schema-invalid` 类型不符：期望 string，实际 object** |
| `contact` 无 `url`（老形 `{label,value}`） | OK | OK |
| `contact` ＋ `url: true` | OK | **THROW `schema-invalid` 多余字段：url** |
| `contact` ＋ `copy_all: true`（布尔） | OK | **THROW `schema-invalid` 类型不符：期望 string，实际 boolean** |
| scene ＋ `aliases` | OK | **THROW `schema-invalid` 多余字段：aliases** |

### 这张表说明的问题比原来两条更严重

**冲突不止两处，是六处**，而且是**成体系**的：schema 把 `init_banner` 与 `contact` 的子键都做成了闭集，**模板却依赖其中若干闭集外的键才能正确渲染**：

- `init_banner.hidden` 是模板**唯一的显隐开关**（`INIT_BANNER && !INIT_BANNER.hidden`）——不传则「已初始化」的差异**永远显不出来**（实测两份产物**只差这 1 字节**）；
- `init_banner.steps`：**schema 只许字符串数组，模板却读 `st.title`／`st.desc`** ⇒ 传字符串数组能过校验器但**六个步骤格文案全空**（实测：有序号、无文案，且**不是**脏字串——页面字面 `undefined` 为 0 次）；
- `contact.items[].url` 是模板把联系人渲染成 `<a>` 的判据 —— 这条**直接卡住一条已成文的用户裁定**（备忘录 HELP 的 V6=B「补可点链接」）。

### 给本票的建议

1. **先定谁权威**（这是本票的第一件事）。倾向：**以模板为准改 schema**——因为模板才是用户肉眼看到的东西，而 schema 现在的形态让「正确的页面」变成「非法的载荷」，等于把用户可见的质量判成失败。
2. 具体：`contact.items[]` 收下可选 `url`（字符串）；`init_banner` 收下 `hidden`（布尔）与 `closable`（布尔）；`init_banner.steps` 改 `oneOf`（`string[]` 或 `{title,desc}[]`）。
3. **改之前先看这条**：`packages/base-render/assets/help-template.html` 是**生成物 `src/helpShell.ts` 的源**，改源必须跑 `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红。
4. **受影响范围**：所有消费 `base-paint/help-shell` 的技能（卡路里／饼干记账／私家大厨／作息／备忘录）。备忘录当前的取边是「**A 路正确优先**」，即明知 B 路会拒也传 `hidden` 与 `{title,desc}[]`——**这正是本票要消除的错位**。

## 与本票无关的说明

本票由地图 `#220` 的侦察**顺带发现**，属共享层缺陷，**不在该地图的目的地内**，故单独开票；该地图的渲染票按「链接塞进 `value`、不动共享层」处理并已留证。
