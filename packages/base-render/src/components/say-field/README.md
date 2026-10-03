# say-field · 一句话表单的一格

**一句话**：字段名（可带必填星）＋ 一个输入件 —— 原型 `.say-field` 的落点。
**判地**：`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>（逐字几何）。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `label` | `string` | 必填 | 字段名（必填那枚星不带在它里面） |
| `required` | `boolean` | `false` | 必填：字段名后出一枚星（**标记**；拦不拦提交由技能侧判） |
| `control` | `input \| select` | 必填 | 输入件（一格一只） |
| `name` | `string` | 可选 | `name` 属性（不给就不写这一条） |
| `value` | `string` | 可选 | 已给的取值（**照抄**；空串也算给了） |
| `options` | `{value, label}[]` | 可选 | `select` 的候选（非空；`input` 上不许给） |
| `inputType` | `text \| number \| date \| time \| tel \| email \| search` | `text` | `input` 的 `type`（`select` 上不许给） |
| `hint` | `string` | 可选 | 这一格下面的提示行（占满一整行） |
| `disabled` | `boolean` | `false` | 现在改不了（出 `disabled`） |
| `bad` | `boolean` | `false` | 现在填得不对（输入件挂 `is-bad`） |

不确定的键一律 `BlocksError`（拼错字段名不静默吞）。`select` 的 `value` 必须命中某条候选。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->

```json 示例入参
{ "label": "分类", "required": true, "control": "select", "name": "cat",
  "options": [{ "value": "", "label": "请选择分类" }, { "value": "餐饮", "label": "餐饮" }] }
```

## 出口

`renderSayField(input)` ／ `sayFieldCss()` ／ 闭集 `SAY_FIELD_CONTROLS`、`SAY_FIELD_INPUT_TYPES`、`SAY_FIELD_SLOTS` ／
类名根 `SAY_FIELD_CLASS` 与槽助手 `sayFieldSlot(slot, prefix?)`。
槽：`form`（外层容器）／`lbl`（字段名）／`req`（必填星）／`ctl`（输入件）／`hint`（提示行）。

## 样式

一格的几何逐字照判地：暖底 `#fbf7ec` ＋ 发丝线外框 ＋ 12px 圆角 ＋ 44px 触控下限；
输入件 1.5px 暖边 `#ddd0b6` ＋ 10px 圆角 ＋ 白底 `#fff`；聚焦／填错各出 2px 描边；
禁用态 `#f4efe2` 底 ＋ `#a39c8e` 字。这几颗色是本票（#1114）逐处授权的判地字面，
每一处的上一行都压着 `判地字面 · 授权照抄` 那句话；除它们以外，颜色／圆角一律经 `skinVar()` 读皮肤。

外层容器（原型 `.say-form`：一列 ＋ 10px 间距 ＋ 底距 10px）的类名由 `sayFieldSlot('form')` 给出——
本件不产出那个容器（一格只产一格），由调用方把若干格包进它里面。

## 无运行时

本件不接事件（`runtime.ts` 不存在）：校验、取值、提交都在技能侧；标记里只有读数与状态。
