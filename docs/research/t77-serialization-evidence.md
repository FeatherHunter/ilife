# #77 复制文本序列化 · 证据快照

> 生成：`node docs/research/t77-serialization-evidence.mjs --out docs/research/t77-serialization-evidence.md`（先 `pnpm build`；确定性输出，重跑逐字节相同）。
> 机读真相源：`packages/base-render/src/spec/text.ts`；行为补遗：`docs/base-paint-contract.md` §3.4。
> 换行在**行内**以 `<LF>` 标出；围栏块内为**实际产出**（含真实换行）。

## 0. 口径与常量

| 项 | 值 |
|---|---|
| `COPY_FORMATS` | `text`／`json`／`csv`（缺省 `text`） |
| `SERIALIZABLE_SHAPES` | `stat`／`list`／`detail`／`analysis`／`receipt` |
| `TEXT_HEADER_TEMPLATE` | `【{skill} · {key}】` |
| `TEXT_EMPTY_PLACEHOLDER` / `LOG_UNKNOWN_PLACEHOLDER` | `未填写`／`(未知)` |
| `TEXT_SENSITIVE_MASK` | `****` |
| `TEXT_JSON_INDENT` / `TEXT_JSON_LT_RULE` | `2`／`\u003c` |
| `CSV_DIALECT` | `section,row`／`"`／`""`／LF |
| `TEXT_ERROR_CODES` | `shape-unsupported`／`structure-invalid`／`format-unknown` |

## 1. 逐 shape × 逐 format（A2／A4）

### `stat` — 投影表 `{"body":"metrics","tail":null,"csvSections":["metrics"]}`

`data`：`{"metrics":{"热量":1800,"蛋白质":92.5,"备注":null,"密码":{"text":"超级密码","sensitive":true}}}`

**`text`**（6 行）

```text
【calorie · calorie.demo】
热量: 1800
蛋白质: 92.5
备注: 未填写
****
（敏感字段已脱敏）
```

**`json`**（14 行）

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "stat",
  "key": "calorie.demo",
  "data": {
    "metrics": {
      "热量": 1800,
      "蛋白质": 92.5,
      "备注": null,
      "密码": "****"
    }
  }
}
```

**`csv`**（5 行）

```text
section,row
metrics,热量: 1800
metrics,蛋白质: 92.5
metrics,备注: 
metrics,****
```

### `list` — 投影表 `{"body":"items","tail":"total","csvSections":["items","total"]}`

`data`：`{"items":["第一条",42,{"name":"对象项"},{"text":"超级密码","sensitive":true}],"total":4}`

**`text`**（7 行）

```text
【calorie · calorie.demo】
第一条
42
{"name":"对象项"}
****
（敏感字段已脱敏）
total: 4
```

**`json`**（17 行）

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "list",
  "key": "calorie.demo",
  "data": {
    "items": [
      "第一条",
      42,
      {
        "name": "对象项"
      },
      "****"
    ],
    "total": 4
  }
}
```

**`csv`**（6 行）

```text
section,row
items,第一条
items,42
items,"{""name"":""对象项""}"
items,****
total,total: 4
```

### `detail` — 投影表 `{"body":"item","tail":null,"csvSections":["item"]}`

`data`：`{"item":{"名称":"台灯","价格":199,"备注":null,"备注2":"a,b","备注3":"say \"hi\""}}`

**`text`**（6 行）

```text
【calorie · calorie.demo】
名称: 台灯
价格: 199
备注: 未填写
备注2: a,b
备注3: say "hi"
```

**`json`**（15 行）

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "detail",
  "key": "calorie.demo",
  "data": {
    "item": {
      "名称": "台灯",
      "价格": 199,
      "备注": null,
      "备注2": "a,b",
      "备注3": "say \"hi\""
    }
  }
}
```

**`csv`**（6 行）

```text
section,row
item,名称: 台灯
item,价格: 199
item,备注: 
item,"备注2: a,b"
item,"备注3: say ""hi"""
```

### `receipt` — 投影表 `{"body":"ok","tail":"message","csvSections":["status","message"]}`

`data`：`{"ok":false,"message":"金额格式错误"}`

**`text`**（3 行）

```text
【calorie · calorie.demo】
ok: false
message: 金额格式错误
```

**`json`**（10 行）

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "receipt",
  "key": "calorie.demo",
  "data": {
    "ok": false,
    "message": "金额格式错误"
  }
}
```

**`csv`**（3 行）

```text
section,row
status,ok: false
message,message: 金额格式错误
```

### `analysis` — 投影表 `{"body":"summary","tail":null,"csvSections":["summary"]}`

`data`：`{"summary":"本周热量偏高 </script> <b>"}`

**`text`**（2 行）

```text
【calorie · calorie.demo】
summary: 本周热量偏高 </script> <b>
```

**`json`**（9 行）

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "analysis",
  "key": "calorie.demo",
  "data": {
    "summary": "本周热量偏高 \u003c/script> \u003cb>"
  }
}
```

**`csv`**（2 行）

```text
section,row
summary,summary: 本周热量偏高 </script> <b>
```

## 1.5 `undefined` 归一与空产出恒非空（FX-77-1／FX-77-6）

`json` 口径把 `undefined` 属性**归一为 `null` 并保留键**（`JSON.stringify` 默认会**丢键**，与「空值保留 `null`、键不省略」冲突）→ 同一输入的三 format **键集／行数一一对应**；输出头行**恒存在**（空 `title` 视同缺省、空 `skill`／`key` 按空串替换），故产出恒非空。

### `detail.item` 含 `undefined`

`item`：`{"a":null,"b":"","d":0}`；输入键集 `a`／`b`／`c`／`d`（`JSON.stringify` 展示时即丢掉 `undefined` 属性——正是本项要证的行为）

**`text`**

```text
【calorie · calorie.demo】
a: 未填写
b: 未填写
c: 未填写
d: 0
```

**`json`**

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "detail",
  "key": "calorie.demo",
  "data": {
    "item": {
      "a": null,
      "b": "",
      "c": null,
      "d": 0
    }
  }
}
```

**`csv`**

```text
section,row
item,a: 
item,b: 
item,c: 
item,d: 0
```

### `stat.metrics` 含 `undefined`

`metrics`：`{"b":null}`；输入键集 `a`／`b`（`JSON.stringify` 展示时即丢掉 `undefined` 属性——正是本项要证的行为）

**`text`**

```text
【calorie · calorie.demo】
a: 未填写
b: 未填写
```

**`json`**

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "stat",
  "key": "calorie.demo",
  "data": {
    "metrics": {
      "a": null,
      "b": null
    }
  }
}
```

**`csv`**

```text
section,row
metrics,a: 
metrics,b: 
```

### envelope 缺 `key`（五字段存在性归 #74，本处只证 json 不丢键）

**`text`**

```text
【calorie · 】
a: 1
```

**`json`**

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "stat",
  "key": null,
  "data": {
    "metrics": {
      "a": 1
    }
  }
}
```

**`csv`**

```text
section,row
metrics,a: 1
```

### 空产出反例（V3 洞 1）：三 format 均非空 ＋ 不触发 `copyText` 空串短路

| 诱因 | format | 产出（`vis`） | 长度 | `copyText` |
|---|---|---|---|---|
| 空投影体（`metrics:{}`） | `text` | `【calorie · calorie.demo】` | 24 | ok（fallback） |
| 空投影体（`metrics:{}`） | `json` | `{<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "stat",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "metrics": {}<LF>  }<LF>}` | 125 | ok（fallback） |
| 空投影体（`metrics:{}`） | `csv` | `section,row` | 11 | ok（fallback） |
| 空 title（`title: ''`） | `text` | `【calorie · calorie.demo】` | 24 | ok（fallback） |
| 空 title（`title: ''`） | `json` | `{<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "detail",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "item": {}<LF>  }<LF>}` | 124 | ok（fallback） |
| 空 title（`title: ''`） | `csv` | `section,row` | 11 | ok（fallback） |
| 空 `skill`／`key` | `text` | `【 · 】` | 5 | ok（fallback） |
| 空 `skill`／`key` | `json` | `{<LF>  "version": "0.1.0",<LF>  "skill": "",<LF>  "shape": "stat",<LF>  "key": "",<LF>  "data": {<LF>    "metrics": {}<LF>  }<LF>}` | 106 | ok（fallback） |
| 空 `skill`／`key` | `csv` | `section,row` | 11 | ok（fallback） |

## 2. 6 段日志 × 3 个 format（A3）

段序恒按 `LOG_SECTIONS`；数据源恒按 `LOG_SECTION_SOURCES`（`scene` ← envelope，其余 ← `copyLog.*`）。

| 段序 | 段名 | 标题（`LOG_SECTION_TITLES`） | 数据源（`LOG_SECTION_SOURCES`） |
|---|---|---|---|
| 1 | `scene` | 场景标识 | `envelope` |
| 2 | `thinking` | AI 思考链 | `copyLog.thinking` |
| 3 | `dataStructure` | 数据结构 | `copyLog.dataStructure` |
| 4 | `callChain` | 调用链 | `copyLog.callChain` |
| 5 | `timestampVersion` | 时间戳版本 | `copyLog.timestamp` |
| 6 | `exception` | 异常 | `copyLog.exception` |

### `copyLog` 齐全

**`text`**

```text
场景标识
calorie.calorie.demo（list）
AI 思考链
先查库再算
数据结构
items[]
调用链
read → rank
时间戳版本
2026-01-02T03:04:05
异常
无
```

**`json`**

```text
{
  "scene": "calorie.calorie.demo（list）",
  "thinking": "先查库再算",
  "dataStructure": "items[]",
  "callChain": "read → rank",
  "timestampVersion": "2026-01-02T03:04:05",
  "exception": "无"
}
```

**`csv`**

```text
section,row
scene,calorie.calorie.demo（list）
thinking,先查库再算
dataStructure,items[]
callChain,read → rank
timestampVersion,2026-01-02T03:04:05
exception,无
```

### `copyLog` 缺省

**`text`**

```text
场景标识
calorie.calorie.demo（list）
AI 思考链
(未知)
数据结构
(未知)
调用链
(未知)
时间戳版本
(未知)
异常
(未知)
```

**`json`**

```text
{
  "scene": "calorie.calorie.demo（list）",
  "thinking": null,
  "dataStructure": null,
  "callChain": null,
  "timestampVersion": null,
  "exception": null
}
```

**`csv`**

```text
section,row
scene,calorie.calorie.demo（list）
thinking,
dataStructure,
callChain,
timestampVersion,
exception,
```

### 空值口径分层实证（`text` 写占位符／`json` 写 `null`／`csv` 写空串）

同一份 `data`（含空值）与同一份缺段日志，三 format 并排：

| format | 数据空值（`item.空值 = null`） | 日志缺段（`exception` 缺省） |
|---|---|---|
| `text` | `空值: 未填写` | `(未知)` |
| `json` | `null` | `null` |
| `csv` | `item,空值: ` | `exception,` |

## 3. 敏感行判定与掩码（A5）

判定只看源值的 `sensitive` 是否为**字面** `true`（不看文本内容、不做真值判定）；掩码恒为 `****`。

| `sensitive` 取值 | 判为敏感行？ | `text` 产出 | `json` 值 | `csv` row 列 |
|---|---|---|---|---|
| `true` | **是** | `****` ／ `（敏感字段已脱敏）` | `"****"` | `metrics,****` |
| `1` | 否 | `pwd: {"text":"超级密码","sensitive":1}` | `{"text":"超级密码","sensitive":1}` | `metrics,"pwd: {""text"":""超级密码"",""sensitive"":1}"` |
| `"yes"` | 否 | `pwd: {"text":"超级密码","sensitive":"yes"}` | `{"text":"超级密码","sensitive":"yes"}` | `metrics,"pwd: {""text"":""超级密码"",""sensitive"":""yes""}"` |
| `"true"` | 否 | `pwd: {"text":"超级密码","sensitive":"true"}` | `{"text":"超级密码","sensitive":"true"}` | `metrics,"pwd: {""text"":""超级密码"",""sensitive"":""true""}"` |
| `{}` | 否 | `pwd: {"text":"超级密码","sensitive":{}}` | `{"text":"超级密码","sensitive":{}}` | `metrics,"pwd: {""text"":""超级密码"",""sensitive"":{}}"` |
| `[]` | 否 | `pwd: {"text":"超级密码","sensitive":[]}` | `{"text":"超级密码","sensitive":[]}` | `metrics,"pwd: {""text"":""超级密码"",""sensitive"":[]}"` |
| `null` | 否 | `pwd: {"text":"超级密码","sensitive":null}` | `{"text":"超级密码","sensitive":null}` | `metrics,"pwd: {""text"":""超级密码"",""sensitive"":null}"` |

三 format 掩码实证（`stat.metrics = { 账号, 密码: {text, sensitive:true} }`）：

```text
【calorie · calorie.demo】
账号: a
****
（敏感字段已脱敏）
```

```text
{
  "version": "0.1.0",
  "skill": "calorie",
  "shape": "stat",
  "key": "calorie.demo",
  "data": {
    "metrics": {
      "账号": "a",
      "密码": "****"
    }
  }
}
```

```text
section,row
metrics,账号: a
metrics,****
```

## 4. 三个错误码逐码可达（A6）

失败一律抛错（不返空、不降级）；判定次序：`format-unknown` → `shape-unsupported` → `structure-invalid`。

| code | 触发输入 | 实际 `name` | 实际 `message` | 有返回值？ |
|---|---|---|---|---|
| `shape-unsupported` | envelope.shape = fallback | `TextError` | shape 不进复制文本：string fallback（可序列化：stat、list、detail、analysis、receipt） | 无（已抛错） |
| `shape-unsupported` | envelope.shape = bogus（闭集外） | `TextError` | shape 不进复制文本：string bogus（可序列化：stat、list、detail、analysis、receipt） | 无（已抛错） |
| `structure-invalid` | stat 缺 metrics | `TextError` | stat 形缺 metrics 对象（EnvelopeDataByShape.stat） | 无（已抛错） |
| `structure-invalid` | list.items 非数组 | `TextError` | list 形 items 必须是数组（EnvelopeDataByShape.list） | 无（已抛错） |
| `structure-invalid` | receipt 缺 message | `TextError` | receipt 形缺 ok（boolean）／message（string）（EnvelopeDataByShape.receipt） | 无（已抛错） |
| `structure-invalid` | analysis.summary 空串 | `TextError` | analysis 形缺非空 summary（EnvelopeDataByShape.analysis） | 无（已抛错） |
| `structure-invalid` | title 非字符串 | `TextError` | title 必须是字符串，实为 number 42 | 无（已抛错） |
| `structure-invalid` | buildLogText：data 不符 shape（U14 同口径） | `TextError` | stat 形缺 metrics 对象（EnvelopeDataByShape.stat） | 无（已抛错） |
| `format-unknown` | buildDataText：format = yaml | `TextError` | format 不在 COPY_FORMATS 内：string yaml（允许：text、json、csv） | 无（已抛错） |
| `format-unknown` | buildLogText：format = yaml | `TextError` | format 不在 COPY_FORMATS 内：string yaml（允许：text、json、csv） | 无（已抛错） |

## 5. 断言清单（任一不成立即 exit 1）

共 215 条，失败 0 条。

| # | 结果 | 断言 | 实测／期望 |
|---|---|---|---|
| 1 | PASS | stat：text 首行 = TEXT_HEADER_TEMPLATE 替换位 | 实测 【calorie · calorie.demo】，期望 【calorie · calorie.demo】 |
| 2 | PASS | stat：text 不转 HTML（零 HTML 实体） | — |
| 3 | PASS | analysis：含 `</script>` 的值在 text 口径原样出现 | — |
| 4 | PASS | stat：json 键名 = envelope 五字段原样 | 实测 ["version","skill","shape","key","data"]，期望 ["version","skill","shape","key","data"] |
| 5 | PASS | stat：json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍 | 缩进序列 [0,2,2,2,2,2,4,6,6,6,6,4,2,0] |
| 6 | PASS | stat：json 逐行缩进层级逐字节等于 TEXT_JSON_INDENT 规范序列化 | 实测 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "stat",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "metrics": {<LF>      "热量": 1800,<LF>      "蛋白质": 92.5,<LF>      "备注": null,<LF>      "密码": "****"<LF>    }<LF>  }<LF>}，期望 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "stat",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "metrics": {<LF>      "热量": 1800,<LF>      "蛋白质": 92.5,<LF>      "备注": null,<LF>      "密码": "****"<LF>    }<LF>  }<LF>} |
| 7 | PASS | stat：json 无裸 `<`（\u003c 规则） | — |
| 8 | PASS | stat：json data 含投影表 body 字段 | — |
| 9 | PASS | stat：csv 表头 = CSV_DIALECT.header | 实测 section,row，期望 section,row |
| 10 | PASS | stat：csv 无输出头 | — |
| 11 | PASS | stat：csv 两列语义 | — |
| 12 | PASS | list：text 首行 = TEXT_HEADER_TEMPLATE 替换位 | 实测 【calorie · calorie.demo】，期望 【calorie · calorie.demo】 |
| 13 | PASS | list：text 不转 HTML（零 HTML 实体） | — |
| 14 | PASS | analysis：含 `</script>` 的值在 text 口径原样出现 | — |
| 15 | PASS | list：json 键名 = envelope 五字段原样 | 实测 ["version","skill","shape","key","data"]，期望 ["version","skill","shape","key","data"] |
| 16 | PASS | list：json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍 | 缩进序列 [0,2,2,2,2,2,4,6,6,6,8,6,6,4,4,2,0] |
| 17 | PASS | list：json 逐行缩进层级逐字节等于 TEXT_JSON_INDENT 规范序列化 | 实测 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "list",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "items": [<LF>      "第一条",<LF>      42,<LF>      {<LF>        "name": "对象项"<LF>      },<LF>      "****"<LF>    ],<LF>    "total": 4<LF>  }<LF>}，期望 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "list",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "items": [<LF>      "第一条",<LF>      42,<LF>      {<LF>        "name": "对象项"<LF>      },<LF>      "****"<LF>    ],<LF>    "total": 4<LF>  }<LF>} |
| 18 | PASS | list：json 无裸 `<`（\u003c 规则） | — |
| 19 | PASS | list：json data 含投影表 body 字段 | — |
| 20 | PASS | list：csv 表头 = CSV_DIALECT.header | 实测 section,row，期望 section,row |
| 21 | PASS | list：csv 无输出头 | — |
| 22 | PASS | list：csv 两列语义 | — |
| 23 | PASS | detail：text 首行 = TEXT_HEADER_TEMPLATE 替换位 | 实测 【calorie · calorie.demo】，期望 【calorie · calorie.demo】 |
| 24 | PASS | detail：text 不转 HTML（零 HTML 实体） | — |
| 25 | PASS | analysis：含 `</script>` 的值在 text 口径原样出现 | — |
| 26 | PASS | detail：json 键名 = envelope 五字段原样 | 实测 ["version","skill","shape","key","data"]，期望 ["version","skill","shape","key","data"] |
| 27 | PASS | detail：json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍 | 缩进序列 [0,2,2,2,2,2,4,6,6,6,6,6,4,2,0] |
| 28 | PASS | detail：json 逐行缩进层级逐字节等于 TEXT_JSON_INDENT 规范序列化 | 实测 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "detail",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "item": {<LF>      "名称": "台灯",<LF>      "价格": 199,<LF>      "备注": null,<LF>      "备注2": "a,b",<LF>      "备注3": "say \"hi\""<LF>    }<LF>  }<LF>}，期望 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "detail",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "item": {<LF>      "名称": "台灯",<LF>      "价格": 199,<LF>      "备注": null,<LF>      "备注2": "a,b",<LF>      "备注3": "say \"hi\""<LF>    }<LF>  }<LF>} |
| 29 | PASS | detail：json 无裸 `<`（\u003c 规则） | — |
| 30 | PASS | detail：json data 含投影表 body 字段 | — |
| 31 | PASS | detail：csv 表头 = CSV_DIALECT.header | 实测 section,row，期望 section,row |
| 32 | PASS | detail：csv 无输出头 | — |
| 33 | PASS | detail：csv 两列语义 | — |
| 34 | PASS | receipt：text 首行 = TEXT_HEADER_TEMPLATE 替换位 | 实测 【calorie · calorie.demo】，期望 【calorie · calorie.demo】 |
| 35 | PASS | receipt：text 不转 HTML（零 HTML 实体） | — |
| 36 | PASS | analysis：含 `</script>` 的值在 text 口径原样出现 | — |
| 37 | PASS | receipt：json 键名 = envelope 五字段原样 | 实测 ["version","skill","shape","key","data"]，期望 ["version","skill","shape","key","data"] |
| 38 | PASS | receipt：json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍 | 缩进序列 [0,2,2,2,2,2,4,4,2,0] |
| 39 | PASS | receipt：json 逐行缩进层级逐字节等于 TEXT_JSON_INDENT 规范序列化 | 实测 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "receipt",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "ok": false,<LF>    "message": "金额格式错误"<LF>  }<LF>}，期望 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "receipt",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "ok": false,<LF>    "message": "金额格式错误"<LF>  }<LF>} |
| 40 | PASS | receipt：json 无裸 `<`（\u003c 规则） | — |
| 41 | PASS | receipt：json data 含投影表 body 字段 | — |
| 42 | PASS | receipt：csv 表头 = CSV_DIALECT.header | 实测 section,row，期望 section,row |
| 43 | PASS | receipt：csv 无输出头 | — |
| 44 | PASS | receipt：csv 两列语义 | — |
| 45 | PASS | analysis：text 首行 = TEXT_HEADER_TEMPLATE 替换位 | 实测 【calorie · calorie.demo】，期望 【calorie · calorie.demo】 |
| 46 | PASS | analysis：text 不转 HTML（零 HTML 实体） | — |
| 47 | PASS | analysis：含 `</script>` 的值在 text 口径原样出现 | — |
| 48 | PASS | analysis：json 键名 = envelope 五字段原样 | 实测 ["version","skill","shape","key","data"]，期望 ["version","skill","shape","key","data"] |
| 49 | PASS | analysis：json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍 | 缩进序列 [0,2,2,2,2,2,4,2,0] |
| 50 | PASS | analysis：json 逐行缩进层级逐字节等于 TEXT_JSON_INDENT 规范序列化 | 实测 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "analysis",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "summary": "本周热量偏高 \u003c/script> \u003cb>"<LF>  }<LF>}，期望 {<LF>  "version": "0.1.0",<LF>  "skill": "calorie",<LF>  "shape": "analysis",<LF>  "key": "calorie.demo",<LF>  "data": {<LF>    "summary": "本周热量偏高 \u003c/script> \u003cb>"<LF>  }<LF>} |
| 51 | PASS | analysis：json 无裸 `<`（\u003c 规则） | — |
| 52 | PASS | analysis：json data 含投影表 body 字段 | — |
| 53 | PASS | analysis：csv 表头 = CSV_DIALECT.header | 实测 section,row，期望 section,row |
| 54 | PASS | analysis：csv 无输出头 | — |
| 55 | PASS | analysis：csv 两列语义 | — |
| 56 | PASS | `detail.item` 含 `undefined`：json 键集 = 输入键集（`undefined` 保留键） | 实测 ["a","b","c","d"]，期望 ["a","b","c","d"] |
| 57 | PASS | `detail.item` 含 `undefined`：text 主体行数 = json 键数 | 实测 4，期望 4 |
| 58 | PASS | `detail.item` 含 `undefined`：csv 主体行数 = json 键数 | 实测 4，期望 4 |
| 59 | PASS | `detail.item` 含 `undefined`：每个 json 键在 text 都有对应行 | — |
| 60 | PASS | `detail.item` 含 `undefined`：每个 json 键在 csv 都有对应行（`row` 列） | — |
| 61 | PASS | `stat.metrics` 含 `undefined`：json 键集 = 输入键集（`undefined` 保留键） | 实测 ["a","b"]，期望 ["a","b"] |
| 62 | PASS | `stat.metrics` 含 `undefined`：text 主体行数 = json 键数 | 实测 2，期望 2 |
| 63 | PASS | `stat.metrics` 含 `undefined`：csv 主体行数 = json 键数 | 实测 2，期望 2 |
| 64 | PASS | `stat.metrics` 含 `undefined`：每个 json 键在 text 都有对应行 | — |
| 65 | PASS | `stat.metrics` 含 `undefined`：每个 json 键在 csv 都有对应行（`row` 列） | — |
| 66 | PASS | 嵌套对象值内的 undefined：json 保留键写 null | 实测 {"b":null,"c":1}，期望 {"b":null,"c":1} |
| 67 | PASS | 嵌套对象值内的 undefined：text 同口径不丢键 | 实测 嵌套: {"b":null,"c":1}，期望 嵌套: {"b":null,"c":1} |
| 68 | PASS | 嵌套对象值内的 undefined：csv 同口径不丢键 | 实测 item,"嵌套: {""b"":null,""c"":1}"，期望 item,"嵌套: {""b"":null,""c"":1}" |
| 69 | PASS | 缺 `key`：json 五键集不缩水 | 实测 ["version","skill","shape","key","data"]，期望 ["version","skill","shape","key","data"] |
| 70 | PASS | 缺 `key`：json 写 null（不丢键） | 实测 null，期望 null |
| 71 | PASS | 缺 `key`：text 输出头按空串渲染（行仍在） | 实测 【calorie · 】，期望 【calorie · 】 |
| 72 | PASS | 空投影体（`metrics:{}`）：text 产出非空 | — |
| 73 | PASS | 空投影体（`metrics:{}`）：text 喂 copyText 不走空串短路 | — |
| 74 | PASS | 空投影体（`metrics:{}`）：json 产出非空 | — |
| 75 | PASS | 空投影体（`metrics:{}`）：json 喂 copyText 不走空串短路 | — |
| 76 | PASS | 空投影体（`metrics:{}`）：csv 产出非空 | — |
| 77 | PASS | 空投影体（`metrics:{}`）：csv 喂 copyText 不走空串短路 | — |
| 78 | PASS | 空 title（`title: ''`）：text 产出非空 | — |
| 79 | PASS | 空 title（`title: ''`）：text 喂 copyText 不走空串短路 | — |
| 80 | PASS | 空 title（`title: ''`）：json 产出非空 | — |
| 81 | PASS | 空 title（`title: ''`）：json 喂 copyText 不走空串短路 | — |
| 82 | PASS | 空 title（`title: ''`）：csv 产出非空 | — |
| 83 | PASS | 空 title（`title: ''`）：csv 喂 copyText 不走空串短路 | — |
| 84 | PASS | 空 `skill`／`key`：text 产出非空 | — |
| 85 | PASS | 空 `skill`／`key`：text 喂 copyText 不走空串短路 | — |
| 86 | PASS | 空 `skill`／`key`：json 产出非空 | — |
| 87 | PASS | 空 `skill`／`key`：json 喂 copyText 不走空串短路 | — |
| 88 | PASS | 空 `skill`／`key`：csv 产出非空 | — |
| 89 | PASS | 空 `skill`／`key`：csv 喂 copyText 不走空串短路 | — |
| 90 | PASS | 深层 json 缩进逐级恰为 TEXT_JSON_INDENT 的倍数（2／4／6／8／10／12） | 实测 [0,2,2,2,2,2,4,6,8,10,12,10,8,6,4,2,0]，期望 [0,2,2,2,2,2,4,6,8,10,12,10,8,6,4,2,0] |
| 91 | PASS | 深层 json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍 | 缩进序列 [0,2,2,2,2,2,4,6,8,10,12,10,8,6,4,2,0] |
| 92 | PASS | `copyLog` 齐全：text 行数 = 6 段 × 2 行 | 实测 12，期望 12 |
| 93 | PASS | `copyLog` 齐全：第 1 段标题 | 实测 场景标识，期望 场景标识 |
| 94 | PASS | `copyLog` 齐全：第 1 段内容（源 envelope） | 实测 calorie.calorie.demo（list），期望 calorie.calorie.demo（list） |
| 95 | PASS | `copyLog` 齐全：第 2 段标题 | 实测 AI 思考链，期望 AI 思考链 |
| 96 | PASS | `copyLog` 齐全：第 2 段内容（源 copyLog.thinking） | 实测 先查库再算，期望 先查库再算 |
| 97 | PASS | `copyLog` 齐全：第 3 段标题 | 实测 数据结构，期望 数据结构 |
| 98 | PASS | `copyLog` 齐全：第 3 段内容（源 copyLog.dataStructure） | 实测 items[]，期望 items[] |
| 99 | PASS | `copyLog` 齐全：第 4 段标题 | 实测 调用链，期望 调用链 |
| 100 | PASS | `copyLog` 齐全：第 4 段内容（源 copyLog.callChain） | 实测 read → rank，期望 read → rank |
| 101 | PASS | `copyLog` 齐全：第 5 段标题 | 实测 时间戳版本，期望 时间戳版本 |
| 102 | PASS | `copyLog` 齐全：第 5 段内容（源 copyLog.timestamp） | 实测 2026-01-02T03:04:05，期望 2026-01-02T03:04:05 |
| 103 | PASS | `copyLog` 齐全：第 6 段标题 | 实测 异常，期望 异常 |
| 104 | PASS | `copyLog` 齐全：第 6 段内容（源 copyLog.exception） | 实测 无，期望 无 |
| 105 | PASS | `copyLog` 齐全：json 键序 = LOG_SECTIONS | 实测 ["scene","thinking","dataStructure","callChain","timestampVersion","exception"]，期望 ["scene","thinking","dataStructure","callChain","timestampVersion","exception"] |
| 106 | PASS | `copyLog` 齐全：csv 行数 = 1 表头 + 6 段 | 实测 7，期望 7 |
| 107 | PASS | `copyLog` 齐全：csv 第 1 行 section 列 | 实测 scene，期望 scene |
| 108 | PASS | `copyLog` 齐全：csv 第 2 行 section 列 | 实测 thinking，期望 thinking |
| 109 | PASS | `copyLog` 齐全：csv 第 3 行 section 列 | 实测 dataStructure，期望 dataStructure |
| 110 | PASS | `copyLog` 齐全：csv 第 4 行 section 列 | 实测 callChain，期望 callChain |
| 111 | PASS | `copyLog` 齐全：csv 第 5 行 section 列 | 实测 timestampVersion，期望 timestampVersion |
| 112 | PASS | `copyLog` 齐全：csv 第 6 行 section 列 | 实测 exception，期望 exception |
| 113 | PASS | `copyLog` 缺省：text 行数 = 6 段 × 2 行 | 实测 12，期望 12 |
| 114 | PASS | `copyLog` 缺省：第 1 段标题 | 实测 场景标识，期望 场景标识 |
| 115 | PASS | `copyLog` 缺省：第 1 段内容（源 envelope） | 实测 calorie.calorie.demo（list），期望 calorie.calorie.demo（list） |
| 116 | PASS | `copyLog` 缺省：第 2 段标题 | 实测 AI 思考链，期望 AI 思考链 |
| 117 | PASS | `copyLog` 缺省：第 2 段内容（源 copyLog.thinking） | 实测 (未知)，期望 (未知) |
| 118 | PASS | `copyLog` 缺省：第 3 段标题 | 实测 数据结构，期望 数据结构 |
| 119 | PASS | `copyLog` 缺省：第 3 段内容（源 copyLog.dataStructure） | 实测 (未知)，期望 (未知) |
| 120 | PASS | `copyLog` 缺省：第 4 段标题 | 实测 调用链，期望 调用链 |
| 121 | PASS | `copyLog` 缺省：第 4 段内容（源 copyLog.callChain） | 实测 (未知)，期望 (未知) |
| 122 | PASS | `copyLog` 缺省：第 5 段标题 | 实测 时间戳版本，期望 时间戳版本 |
| 123 | PASS | `copyLog` 缺省：第 5 段内容（源 copyLog.timestamp） | 实测 (未知)，期望 (未知) |
| 124 | PASS | `copyLog` 缺省：第 6 段标题 | 实测 异常，期望 异常 |
| 125 | PASS | `copyLog` 缺省：第 6 段内容（源 copyLog.exception） | 实测 (未知)，期望 (未知) |
| 126 | PASS | `copyLog` 缺省：json 键序 = LOG_SECTIONS | 实测 ["scene","thinking","dataStructure","callChain","timestampVersion","exception"]，期望 ["scene","thinking","dataStructure","callChain","timestampVersion","exception"] |
| 127 | PASS | `copyLog` 缺省：csv 行数 = 1 表头 + 6 段 | 实测 7，期望 7 |
| 128 | PASS | `copyLog` 缺省：csv 第 1 行 section 列 | 实测 scene，期望 scene |
| 129 | PASS | `copyLog` 缺省：csv 第 2 行 section 列 | 实测 thinking，期望 thinking |
| 130 | PASS | `copyLog` 缺省：csv 第 3 行 section 列 | 实测 dataStructure，期望 dataStructure |
| 131 | PASS | `copyLog` 缺省：csv 第 4 行 section 列 | 实测 callChain，期望 callChain |
| 132 | PASS | `copyLog` 缺省：csv 第 5 行 section 列 | 实测 timestampVersion，期望 timestampVersion |
| 133 | PASS | `copyLog` 缺省：csv 第 6 行 section 列 | 实测 exception，期望 exception |
| 134 | PASS | 数据空值：text 写「未填写」 | — |
| 135 | PASS | 数据空值：json 写 null | — |
| 136 | PASS | 数据空值：csv 写空串（标签后为空） | — |
| 137 | PASS | 日志缺段：text 写「(未知)」 | — |
| 138 | PASS | 日志缺段：json 写 null | — |
| 139 | PASS | 日志缺段：csv 写空串 | — |
| 140 | PASS | 两个占位符不串味：日志不得写「未填写」 | — |
| 141 | PASS | 两个占位符不串味：数据不得写「(未知)」 | — |
| 142 | PASS | sensitive=true 的判定只认字面 true | 实测 true，期望 true |
| 143 | PASS | sensitive=true：敏感行原文不出现／非敏感行原文必须出现 | — |
| 144 | PASS | sensitive=1 的判定只认字面 true | 实测 false，期望 false |
| 145 | PASS | sensitive=1：敏感行原文不出现／非敏感行原文必须出现 | — |
| 146 | PASS | sensitive="yes" 的判定只认字面 true | 实测 false，期望 false |
| 147 | PASS | sensitive="yes"：敏感行原文不出现／非敏感行原文必须出现 | — |
| 148 | PASS | sensitive="true" 的判定只认字面 true | 实测 false，期望 false |
| 149 | PASS | sensitive="true"：敏感行原文不出现／非敏感行原文必须出现 | — |
| 150 | PASS | sensitive={} 的判定只认字面 true | 实测 false，期望 false |
| 151 | PASS | sensitive={}：敏感行原文不出现／非敏感行原文必须出现 | — |
| 152 | PASS | sensitive=[] 的判定只认字面 true | 实测 false，期望 false |
| 153 | PASS | sensitive=[]：敏感行原文不出现／非敏感行原文必须出现 | — |
| 154 | PASS | sensitive=null 的判定只认字面 true | 实测 false，期望 false |
| 155 | PASS | sensitive=null：敏感行原文不出现／非敏感行原文必须出现 | — |
| 156 | PASS | text：掩码行恒为 TEXT_SENSITIVE_MASK | — |
| 157 | PASS | text：掩码行之后紧跟一行 textNotice | — |
| 158 | PASS | json：该键值 = mask | — |
| 159 | PASS | json：不得夹中文提示 | — |
| 160 | PASS | csv：section 列保留投影分组名 | — |
| 161 | PASS | csv：row 列 = mask | — |
| 162 | PASS | shape-unsupported：必须抛错 | — |
| 163 | PASS | shape-unsupported：不得返回任何值 | — |
| 164 | PASS | shape-unsupported：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 165 | PASS | shape-unsupported：错误码命中 | 实测 shape-unsupported，期望 shape-unsupported |
| 166 | PASS | shape-unsupported：message 可辨因 | — |
| 167 | PASS | shape-unsupported：必须抛错 | — |
| 168 | PASS | shape-unsupported：不得返回任何值 | — |
| 169 | PASS | shape-unsupported：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 170 | PASS | shape-unsupported：错误码命中 | 实测 shape-unsupported，期望 shape-unsupported |
| 171 | PASS | shape-unsupported：message 可辨因 | — |
| 172 | PASS | structure-invalid：必须抛错 | — |
| 173 | PASS | structure-invalid：不得返回任何值 | — |
| 174 | PASS | structure-invalid：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 175 | PASS | structure-invalid：错误码命中 | 实测 structure-invalid，期望 structure-invalid |
| 176 | PASS | structure-invalid：message 可辨因 | — |
| 177 | PASS | structure-invalid：必须抛错 | — |
| 178 | PASS | structure-invalid：不得返回任何值 | — |
| 179 | PASS | structure-invalid：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 180 | PASS | structure-invalid：错误码命中 | 实测 structure-invalid，期望 structure-invalid |
| 181 | PASS | structure-invalid：message 可辨因 | — |
| 182 | PASS | structure-invalid：必须抛错 | — |
| 183 | PASS | structure-invalid：不得返回任何值 | — |
| 184 | PASS | structure-invalid：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 185 | PASS | structure-invalid：错误码命中 | 实测 structure-invalid，期望 structure-invalid |
| 186 | PASS | structure-invalid：message 可辨因 | — |
| 187 | PASS | structure-invalid：必须抛错 | — |
| 188 | PASS | structure-invalid：不得返回任何值 | — |
| 189 | PASS | structure-invalid：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 190 | PASS | structure-invalid：错误码命中 | 实测 structure-invalid，期望 structure-invalid |
| 191 | PASS | structure-invalid：message 可辨因 | — |
| 192 | PASS | structure-invalid：必须抛错 | — |
| 193 | PASS | structure-invalid：不得返回任何值 | — |
| 194 | PASS | structure-invalid：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 195 | PASS | structure-invalid：错误码命中 | 实测 structure-invalid，期望 structure-invalid |
| 196 | PASS | structure-invalid：message 可辨因 | — |
| 197 | PASS | structure-invalid：必须抛错 | — |
| 198 | PASS | structure-invalid：不得返回任何值 | — |
| 199 | PASS | structure-invalid：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 200 | PASS | structure-invalid：错误码命中 | 实测 structure-invalid，期望 structure-invalid |
| 201 | PASS | structure-invalid：message 可辨因 | — |
| 202 | PASS | format-unknown：必须抛错 | — |
| 203 | PASS | format-unknown：不得返回任何值 | — |
| 204 | PASS | format-unknown：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 205 | PASS | format-unknown：错误码命中 | 实测 format-unknown，期望 format-unknown |
| 206 | PASS | format-unknown：message 可辨因 | — |
| 207 | PASS | format-unknown：必须抛错 | — |
| 208 | PASS | format-unknown：不得返回任何值 | — |
| 209 | PASS | format-unknown：错误名恒为 TextError | 实测 TextError，期望 TextError |
| 210 | PASS | format-unknown：错误码命中 | 实测 format-unknown，期望 format-unknown |
| 211 | PASS | format-unknown：message 可辨因 | — |
| 212 | PASS | 三个错误码逐码可达（TEXT_ERROR_CODES 全覆盖） | 实测 format-unknown,shape-unsupported,structure-invalid，期望 format-unknown,shape-unsupported,structure-invalid |
| 213 | PASS | 判定次序：叠加违规时首个命中 = format-unknown | 实测 format-unknown，期望 format-unknown |
| 214 | PASS | 判定次序：叠加违规时首个命中 = shape-unsupported | 实测 shape-unsupported，期望 shape-unsupported |
| 215 | PASS | 判定次序：叠加违规时首个命中 = structure-invalid | 实测 structure-invalid，期望 structure-invalid |
