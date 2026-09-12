# 备忘录 HELP 交付路径：实测证据与裁决

出处：编排会话实测（2026-09-12），服务票 4（#224）的「落盘目录要不要加一层 `help/`」与票 13（#233）的模板指纹基准。

## 裁决（本图采纳）

产物落**扁平**老目录：

```
<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html
```

**不加** `help/` 一层。

## 三条独立证据

**证据一：地图自己的 Destination 与用户原话都写扁平。** 地图正文 `## Destination` 逐字写「产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`」；Notes 的「文档与产出落点（用户 Q3=A）」逐字写「交付 HTML 落老目录 `<SKILLS_DB_PATH>/memo_html/`」。

**证据二：本图验收票 #233 的原文要求「与老实物并排」。** 票面写「生产目录真跑：`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db` 下真跑 `memo-cmd-read memo.help.lookup`，产物落老目录 `memo_html/`，与老实物并排」。加一层 `help/` 会让新产物落进子目录，与老实物不在同一层，「并排」不成立。

**证据三：两张已完工且被维护者肉眼终审「过」的同流水线地图，实际交付就是扁平的。** 实测 `D:\2Study\StudyNotes\.db`：

| 路径 | 字节 | 时间 |
|---|---|---|
| `calorie_html\卡路里_HELP_20260912_001033.html` | 297185 | 2026-09-12 00:10 |
| `biscuit_accountant_html\饼干记账_HELP_20260911_163117.html` | 129989 | 2026-09-11 16:31 |

两张图的产物都直接躺在 `<技能>_html\` 根下（实测这两个目录**没有**任何子目录）。

## 反证与为什么它不成立

- 唯一带 `help/` 层的兄弟是 `schedule_html\help\作息管家_HELP_*.html`；但其最新一件是 **2026-08-11 12:56**，属**老产线世代**，不构成仓库新管线的先例。六张兄弟目录里只有这一张有子目录：

  ```
  biscuit_accountant_html -> subdirs=[]            files=76
  calorie_html            -> subdirs=[]            files=323
  home_manager_html       -> subdirs=[]            files=18
  memo_html               -> subdirs=[]            files=207
  schedule_html           -> subdirs=[help,plan,record,replay]  files=3
  traffic_html            -> subdirs=[]            files=4
  ```

- `memo_html\` 里已有 **12 件以上**扁平实物 `备忘录_HELP_<样式时间戳>.html`（四代：`20260813_143733` 起一连串、`20260813_161545`、`20260820_150143`、`20260820_162453`）。其中 `备忘录_HELP_20260820_150143_2.html` 证明 **`_N` 递补后缀已在老实物里用过**——新管线照它落，与老实物同形。

## 顺带实测：票 13 的模板指纹基准

仓库新管线**已经交付过**，最新样件是 `calorie_html\卡路里_HELP_20260912_001033.html`（297185 B，2026-09-12 00:10）。票 13 判「由通用 help 模板渲染」时，以它为基准比对 `<title>` 派生规则／`help-data` 脚本／双断点响应式；不要拿 8 月的老实物（如 `memo_html\备忘录_HELP_20260820_162453.html`，55053 B，另一条产线）当视觉基准——地图 Notes 已立此规（用户 Q1=A）。

## 复核命令（幂等，可重跑）

```powershell
$db = "D:\2Study\StudyNotes\.db"
# 1) 六张兄弟目录有没有子目录
Get-ChildItem $db -Directory -Filter "*_html" | ForEach-Object {
  "{0} -> subdirs=[{1}]" -f $_.Name,
    ((Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) -join ',')
}
# 2) 各技能最新 HELP 交付
Get-ChildItem $db -Directory -Filter "*_html" | ForEach-Object {
  Get-ChildItem $_.FullName -Recurse -File -Filter "*HELP*" -ErrorAction SilentlyContinue
} | Sort-Object LastWriteTime -Descending | Select-Object -First 12 FullName, Length, LastWriteTime
# 3) 备忘录老实物与 _N 递补后缀
Get-ChildItem "$db\memo_html" -File | Where-Object { $_.Name -match 'HELP' } |
  Sort-Object LastWriteTime -Descending | Select-Object Name, Length, LastWriteTime
```
