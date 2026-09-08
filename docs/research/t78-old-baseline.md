# #78 旧基线取证报告（只读取证 · base- 图表层与 HELP 壳）

> 取证员：只读取证子代理。工作目录 `D:\ilife`（仓库 FeatherHunter/ilife）。
> 票面：GitHub #78《base- 图表层与 HELP 壳（含 scene-data 契约）》——「图表接口按 v1.30 签名逐条对照实现」＋「scene-data 契约落地」＋「HELP 壳能被技能复用」。
> 唯一写操作：本文件。除本文件外**未写/改/删任何文件**；**未写 `D:\2Study` 下任何文件**；未执行 git 写命令；未运行构建。
> 禁读目录 `D:\2Study\StudyNotes\SKILLS\卡路里\.个人笔记不允许参考\` **全程未读取、未列举、未 grep**（该目录名仅在文件系统 glob 结果中作为同级条目名出现一次，未下钻）。

---

## 0. 结论前置

**① 8 接口全部取证完成**（`bar` / `line` / `donut` / `progress` / `combo` / `sparkline` / `gauge` / `scatter`），无一缺失。逐条签名、输入字段、默认值、输出 HTML 结构、空态、校验与报错文案见 §2，全部带 `charts.js:行号`。

**② 旧版 `charts.js` 不是「无外部依赖」**，它有两处**软全局依赖**与一处**硬全局挂载**：
- `charts.js:15` 读 `window.esc`（存在则用，否则本地兜底）→ 命中 `base.js:14` 的 `function esc(s)`；
- `charts.js:26` 读 `window.emptyState`（存在则用，否则内联兜底）→ 命中 `base.js:608` 的 `function emptyState(cfg)`；
- `charts.js:12` 与 `charts.js:335` 直接给 `window.__chartsLoaded` / `window.charts` 赋值。
这就是**禁止逐字 vendoring** 的根因：新架构冻结「禁 `window`/`globalThis` 赋值」（`packages/base-render/src/spec/charts.ts:270`）＋「类名前缀 `ilife-`」＋「样式 id `ilife-charts`」（`charts.ts:215`），而旧资产是 `hm-` 前缀（223 处 `hm-c-`）＋ `hm-charts-style`（`charts.js:47`）＋ IIFE 挂 window。

**③ 旧 HELP 壳同样不是自包含资产**：`help_template.html:519,522` 直接调用全局 `toast()`（定义在 `base.js:185`），且模板**没有** `<!--CHARTS-HELPERS-->` 标记（全文 0 处）→ **旧版「图表」与「HELP 壳」从未同页共存**。新票要求二者同页是新场景，无旧基线可对标。

**④ 「新版契约装不下旧版能力」的冲突点共 25 条**（详见 §8.2），其中 5 条属**类型级装不下**（不是实现细节）：
- `SceneInitBanner.steps` 新契约是 `readonly string[]`（`help.ts:71`），旧模板读 `st.title` / `st.desc` 对象（`help_template.html:334`）；
- `SceneRecommendation` 新契约是 `{name, reason?, wake_word?}`（`help.ts:84-88`），旧模板读 `r.desc` / `r.wake`（`help_template.html:380`）；
- `SceneContact.copy_all` 新契约是 `string`（`help.ts:81`），旧模板当布尔用（`help_template.html:368`）；
- Q11 要求的「逐场景 CLI 展示」在 `Scene`（`help.ts:36-44`）里**没有任何承载字段**（无 `cli`/`data_source`），只有 §3.5.3 一句「来自 `Scene.id` 的约定拼接」（`docs/base-paint-contract.md:836`）；
- Q11 的「变体示例」在 `Scene` 里同样无字段，被降级成 `types` 徽章变体（`base-paint-contract.md:836`）。

**⑤ 一处契约证据需更正**：`base-paint-contract.md:815` 与 `spec/help.ts:6` 称单数笔误在 `assets/help_template.html:52`，但该行是 CSS（`.sheet .s-close{...}`）。真正的单数笔误在 `docs/help-template-contract.md:51`（`"type": "采集/查看/..."`）；模板资产本身用 `s.types`（`help_template.html:224,285`），机读 schema 也用 `types`（`scene_data.schema.json:70`）。**AC-3 裁定「取 `types`」不受影响，但引证行号应改为 `docs/help-template-contract.md:51`。**

**⑥ F1／F2 独有能力共 17 条**（6 条 F1 独有 ＋ 10 条 F2 独有 ＋ 1 条 F1/F2 共有），逐条见 §5.4。Q11「取 F3 但回补 F1／F2 独有能力」的回补清单在 §9。

---

## 1. 取证对象核对

### 1.1 公共组件侧（`D:\2Study\StudyNotes\SKILLS\公共组件\`）

| 文件 | 磁盘字节 | 行数 | 取证状态 |
|---|---|---|---|
| `assets\charts.js` | 67,564 | 933 | 全量读取（4 段） |
| `assets\help_template.html` | 40,927 | 611 | 全量读取（3 段） |
| `assets\base.js` | — | — | 定点取证（`esc:14`／`emptyState:608`／`toast:185`） |
| `docs\component-contract.md` | 52,010 | 389 | §3（`:64-75`）＋ §6.5（`:199-241`）＋ §6.6（`:243-251`） |
| `docs\help-template-contract.md` | 6,807 | 105 | 全量 |
| `docs\scene-data-contract.md` | 7,264 | 171 | 全量 |
| `docs\scene_data.schema.json` | 4,818 | 110 | 全量 |
| `injector.py` | 14,849 | 309 | `:125-191`（`validate_help_data` / sanitize）＋ `:5-30,108-122`（占位符） |

**注意**：票面写 `charts.js` 约 67.6KB、`help_template.html` 约 40.9KB，与实测 67,564 B / 40,927 B 吻合。票面另称 `help_template.html` 约 40.9KB「611 行」也与实测一致。

### 1.2 卡路里侧三代 HELP（`D:\2Study\StudyNotes\SKILLS\卡路里\`）

| 代号 | 文件 | 磁盘字节 | 行数 | 版本控制 |
|---|---|---|---|---|
| **F1** | `calorie_html\卡路里_HELP_20260730_130429.html` | 65,366 | 492 | **未进版本控制**（`.gitignore:92` 命中 `卡路里/calorie_html/`） |
| **F2** | `calorie_html\卡路里_HELP_20260731_201530.html` | 73,811 | 596 | **未进版本控制**（同上） |
| **F3** | `卡路里.html`（技能根镜像） | 302,820 | 2,048 | 已跟踪（`git ls-files` 命中 `卡路里/卡路里.html`） |

未进版本控制的事实证据（只读命令输出）：

```
$ git -C 'D:\2Study\StudyNotes\SKILLS' check-ignore -v '卡路里/calorie_html/卡路里_HELP_20260730_130429.html'
.gitignore:92:卡路里/calorie_html/        卡路里/calorie_html/卡路里_HELP_20260730_130429.html
$ git -C 'D:\2Study\StudyNotes\SKILLS' ls-files --error-unmatch '卡路里/calorie_html/卡路里_HELP_20260730_130429.html'
error: pathspec ... did not match any file(s) known to git
$ git -C 'D:\2Study\StudyNotes\SKILLS' ls-files --error-unmatch '卡路里/卡路里.html'
卡路里/卡路里.html
```

F3 是 `公共组件/assets/help_template.html` 的注入产物，三处注入可对账：`卡路里.html:195`（`<script id="help-data" type="application/json">` 内联契约 JSON）、`:197`（`<!--SHARED-HELPERS-->` → `base.js`，脚本头注释见 `卡路里.html:205`）、`:200`（`<!--SHARED-CSS-->` → `base.css`，脚本头注释见 `卡路里.html:1155`）。

### 1.3 新版契约侧（`D:\ilife`，仅用于 §8 对比，非旧基线）

| 文件 | 用途 |
|---|---|
| `packages/base-render/src/spec/charts.ts` | #78 图表冻结面（272 行） |
| `packages/base-render/src/spec/help.ts` | #78 HELP 壳 + scene-data 冻结面（276 行） |
| `docs/base-paint-contract.md:747-852` | §3.5 图表层与 HELP 壳（#78） |
| `docs/research/t71-help-dissect.md` | 本仓既存 F1/F2/F3 解剖（交叉校验用） |
| `docs/research/t92-old-v130-signatures.md` | 本仓既存旧 v1.30 签名清单（交叉校验用） |

---

## 2. charts.js 8 接口逐条取证

### 2.0 公共骨架（8 接口共用的机制）

**入口守卫与命名空间**（`charts.js:11-12`、`charts.js:335`、`charts.js:933`）：

```js
(function(){
if(window.__chartsLoaded)return;window.__chartsLoaded=true;
```

```js
window.charts={
```

```js
};
})();
```

→ 幂等靠 `window.__chartsLoaded`；挂载靠 `window.charts` 赋值；整体是单文件 IIFE。**新契约禁止 window 赋值**（`spec/charts.ts:270`），故此处必须偏离。

**本地转义与数值工具**（`charts.js:15-23`）：

```js
var _esc=window.esc||function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var _num=function(v){return Number(v);};
var _isNum=function(v){return v!==null&&v!==undefined&&!isNaN(Number(v))&&String(v).trim()!=='';};
/* 数值格式化: '¥{v}' / '{v}件' / '{pct}%' / 函数 */
var _fmt=function(v,fmt){
  if(typeof fmt==='function')return fmt(v);
  if(typeof fmt==='string'&&fmt.indexOf('{v}')>=0)return fmt.replace('{v}',String(v));
  return String(v);
};
```

**空态联动**（`charts.js:25-28`）：

```js
function _empty(el,hint){
  if(typeof window.emptyState==='function'){el.innerHTML=window.emptyState({icon:'📊',text:'暂无数据',hint:hint||'有记录后自动生成图表'});}
  else{el.innerHTML='<div class="hm-c-empty">📊 暂无数据</div>';}
}
```

**结构校验**（`charts.js:29-41`，四条抛错，逐字）：

```js
function _validate(items,name,allowNull){
  if(!Array.isArray(items))throw new Error('charts.'+name+': items 必须是数组, 收到 '+(items===null?'null':typeof items));
  items.forEach(function(it,i){
    if(!it||typeof it!=='object')throw new Error('charts.'+name+': items['+i+'] 必须是对象');
    var v=it.value;
    /* 显式 null = 缺失断点（仅 line 允许）; undefined/缺失 = 结构错误 */
    var valid=(allowNull&&v===null)||_isNum(v);
    if(!valid)throw new Error('charts.'+name+': items['+i+'].value 无效（缺省/非数字）: '+JSON.stringify(v));
    if(it.label===undefined||it.label===null||String(it.label).trim()==='')throw new Error('charts.'+name+': items['+i+'].label 缺失');
  });
}
```

**参数合并语义**（`charts.js:42-43`）：`缺省用默认, 显式传值覆盖`，且**只有 `!==undefined` 才覆盖**——即显式传 `null` 也算「传了」：

```js
function _merge(def,opt){var o={};for(var k in def)o[k]=def[k];if(opt){for(var k2 in opt)if(opt[k2]!==undefined)o[k2]=opt[k2];}return o;}
```

**坐标系**（`charts.js:139-140`）：

```js
/* ═══ 共享: 折线坐标（容器零 padding, 留白在 viewBox 内）═══ */
var _W=320,_H=110,_P=14;
```

- 折线/组合/散点共用 `viewBox="0 0 320 110"` ＋ `preserveAspectRatio="none"`（`charts.js:661`、`774`、`899`）。
- donut 独立 `viewBox="0 0 120 120"`（`charts.js:716`）；gauge 独立 `viewBox="0 0 170 105"`（`charts.js:834`）；sparkline 用 `width/height` ＋ `viewBox="0 0 W H"`（`charts.js:816`）。
- **但不是「纯 viewBox」**：数据点、数值标签、刻度文字、峰谷标注、tooltip 全是 HTML 元素，用 `left/top` 百分比定位在 SVG 之上（`charts.js:560,572,583,604,618,645,649,870`）。新契约 `CHART_COORD_RULE='viewBox-only'`（`charts.ts:224`）与此**不一致**，见 §8.2-C10。
- 容器零 padding 的实测声明：`charts.js:6`「坐标唯一性（容器零 padding, 留白进 viewBox, 数据点 overlay 与线同基准）」；`vector-effect:non-scaling-stroke` 在 `charts.js:75`。

**死代码（取证发现，勿复刻）**：`_linePoints`（`charts.js:141`）与 `_polyPath`（`charts.js:153`）定义后全文再无调用（各仅 1 处出现）。

### 2.1 `charts.bar(el, items[, opt])`

**签名与入口**（`charts.js:351-357`）：

```js
  /* ═══ 柱状图: charts.bar(el, items[, opt]) ═══
   * items:[{label,value,color?}] · opt: {format, colors, singleColor, height, compact,
   *   labels(all默认|none|select), showValues(默认true), valuePosition(顶|内), yMin,yMax, grid, tooltip, animation, onclick} */
  bar:function(el,items,opt){
    if(!el)return;
    if(!Array.isArray(items))throw new Error('charts.bar: items 必须是数组, 收到 '+(items===null?'null':typeof items));
    if(!items.length){_empty(el);return;}
```

**输入字段与默认值**（`charts.js:358-360`）：

```js
    opt=_merge({format:null,colors:null,singleColor:'var(--blue,#007aff)',height:null,compact:false,
      labels:'all',showValues:true,valuePosition:'top',yMin:null,yMax:null,grid:true,tooltip:false,animation:true,onclick:null,
      stacked:false,grouped:false,segNames:null,stackMode:'percent'},opt);
```

| 字段 | 默认 | 实现状态 |
|---|---|---|
| `format` | `null` | 用于值文本与 tooltip（`charts.js:381`） |
| `colors` / `singleColor` | `null` / `'var(--blue,#007aff)'` | 取色优先级 `item.color` > `colors[i%len]` > `singleColor`（`charts.js:380`） |
| `height` | `null` | 写成 `style="--c-h:Npx"`（`charts.js:376`） |
| `labels` | `'all'` | `'all'` / `'select'`（首尾）/ 其它视为不显示（`charts.js:385-388`） |
| `showValues` | `true` | 柱顶 `.hm-c-v`（`charts.js:382`） |
| `yMin` / `yMax` | `null` | 显式域优先，否则 `min(vals,0)` / `max(vals)`（`charts.js:369-373`） |
| `tooltip` | `false` | `_bindTooltip`（`charts.js:392`） |
| `animation` | `true` | rAF×2 后写 `height`（`charts.js:390`） |
| `onclick` | `null` | 绑 `.hm-c-b,.hm-c-col`（`charts.js:391`） |
| `stacked` / `grouped` / `segNames` / `stackMode` | `false` / `false` / `null` / `'percent'` | 多值模式，见 §4.1 |
| **`compact`** | `false` | **死参数**：声明于 `:358`，全文无 `opt.compact` 读取 |
| **`grid`** | `true` | **bar 内死参数**：`:359` 声明，bar 分支无网格渲染（只有 line 读 `opt.grid`，`charts.js:493`） |
| **`valuePosition`** | `'top'` | **死参数**：声明于 `:359`，全文无 `opt.valuePosition` 读取 |

**域与柱高**（`charts.js:371-379`）：`hi===lo` 时 `hi=lo+1`（`charts.js:373`）；柱高百分比 `Math.max(2,Math.round((v-lo)/(hi-lo)*100))`——**最小 2%**，故 0 值也有可见柱。

**输出 HTML 结构**（`charts.js:383-389`）：

```js
      return '<div class="hm-c-col" data-i="'+i+'">'+valHtml+'<div class="hm-c-b" data-i="'+i+'" style="height:'+(opt.animation?0:pct)+'%;background:'+color+'"></div></div>';
```

```js
    el.innerHTML='<div class="hm-c-bar" '+hStyle+'><div class="hm-c-plot">'+plot+'</div><div class="hm-c-labels">'+labels+'</div></div>';
```

结构：`.hm-c-bar[style=--c-h:Npx]` → `.hm-c-plot` → `N×(.hm-c-col[data-i] → .hm-c-v + .hm-c-b[data-i][style=height%/background])`，再 `.hm-c-labels` → `.hm-c-l[title]`。相关 CSS：`.hm-c-bar`（`charts.js:52`，两段式 flex，标签不参与柱布局）、`.hm-c-b`（`:56`，`max-width:34px`、`min-height:2px`）。

**空态**：`!items.length` → `_empty(el)`（`charts.js:357`）；不抛错。**校验**：`_validate(items,'bar')`（`charts.js:367`，`allowNull` 未传 → `null` 不合法）。

### 2.2 `charts.line(el, items[, opt])`

**签名与入口**（`charts.js:395-400`）：

```js
  /* ═══ 折线图: charts.line(el, items[, opt]) ═══
   * items:[{label,value,color?}] value 可 null（断线）· opt 全参数（见清单 16 项 + avgLine/legend/highlightLast/markLine/markPoint/series + connectNulls 跨缺失连线 + yTicks 轴刻度 v1.15 · #333 + series[].ownScale 独立刻度 v1.17 · #334） */
  line:function(el,items,opt){
    if(!el)return;
    _validate(items,'line',true); /* 允许 null 断点 */
    if(!items.length){_empty(el);return;}
```

**输入字段与默认值（逐字，26 项）**（`charts.js:401-404`）：

```js
    opt=_merge({color:'var(--blue,#007aff)',lineWidth:2.2,dashed:false,smooth:false,showDots:true,dotSize:null,
      area:false,areaOpacity:0.12,labels:'edge',showValues:false,labelRotate:0,yMin:null,yMax:null,grid:true,
      format:null,tooltip:false,markLine:null,markPoint:false,step:false,animation:true,height:null,
      series:null,avgLine:null,legend:false,highlightLast:false,onclick:null,ondrill:null,emptyText:null,connectNulls:false,yTicks:false,band:null,fillBetween:null,highlightPoints:null},opt);
```

| 字段 | 默认 | 语义/落点 |
|---|---|---|
| `color` | `'var(--blue,#007aff)'` | 单序列主色；多序列缺省取 `_PALETTE[si%10]`（`charts.js:539`） |
| `lineWidth` | `2.2` | `stroke-width`（`charts.js:551`） |
| `dashed` | `false` | `stroke-dasharray="6 5"`（`charts.js:541`） |
| `smooth` | `false` | Catmull-Rom → 三次贝塞尔（`charts.js:178-199`） |
| `showDots` | `true` | HTML `<i class="hm-c-dot">`（`charts.js:553-562`） |
| **`dotSize`** | `null` | **死参数**：`:401` 声明，line 分支无 `opt.dotSize` 读取（仅 scatter 用，`charts.js:864`） |
| `area` / `areaOpacity` | `false` / `0.12` | 面积路径（`charts.js:169`、`546-550`） |
| `labels` | `'edge'` | `'all'` / `'select'`（首 + 峰值 + 尾）/ `'edge'`（首尾）/ 其它不渲染（`charts.js:653-656`） |
| `showValues` | `false` | `true` 时相邻标签中心距 `<26` viewBox 单位跳过（`charts.js:570`）；`'edge'` 只标首尾有效点（`charts.js:569`） |
| `labelRotate` | `0` | 旋转 X 标签（`charts.js:658`） |
| `yMin` / `yMax` | `null` | 显式域优先；全域再各外扩 `6%`（`charts.js:428-432`） |
| `grid` | `true` | 3 条水平线 `#ececf1`（`charts.js:493`） |
| `format` | `null` | 值/tooltip/刻度同一格式化器（`charts.js:503`） |
| `tooltip` | `false` | `_bindTooltip`（`charts.js:215-242`、`683`） |
| `markLine` | `null` | `{value}` 水平阈值（`:509-514`）＋ `{xValue}` 竖线（`:517-534`） |
| `markPoint` | `false` | `true` = 主序列最大点；对象 `{index|value,label,color}`（`charts.js:628-651`） |
| `step` | `false` | 阶梯线（`charts.js:543`） |
| `animation` | `true` | `getTotalLength()` 描边动画 + `transitionend` 清 `dasharray`（`charts.js:664-681`） |
| `series` | `null` | `[{name,items,color,dashed,smooth,area,ownScale}]`（`charts.js:408-409`） |
| `avgLine` | `null` | 均线窗口，收敛 `3..items.length`（`charts.js:200-201`、`414-417`） |
| `legend` | `false` | 图例；`ownScale` 时追加「各指标独立刻度」（`charts.js:587-589`、`611`） |
| `highlightLast` | `false` | 末个有效点高亮 + 值标签（`charts.js:613-623`） |
| `onclick` / `ondrill` | `null` / `null` | `ondrill` 按 X 比例映射索引（`charts.js:684`） |
| **`emptyText`** | `null` | **死参数**：`:404` 声明，全文无读取；空态走 `_empty` 固定文案 |
| `connectNulls` | `false` | `true` 跳过 null 相邻直连（`charts.js:154-168`、`180-183`） |
| `yTicks` | `false` | 数字 → `Math.max(2,Math.min(6,Math.round(n)))`（`charts.js:498`） |
| `band` | `null` | `{hi,lo}` 等长校验 + 置信带（`charts.js:422-464`） |
| `fillBetween` | `null` | `{a,b,color}` 系列索引（`charts.js:467-491`） |
| `highlightPoints` | `null` | `'turns'` / `'crossings'`（`charts.js:576-609`） |

**null 值处理（核心）**（`charts.js:153-168`）：

```js
function _polyPath(pts){var segs=[];var cur=[];pts.forEach(function(p,i){if(p[2]){if(cur.length)segs.push(cur);cur=[];}else{cur.push(p);}});if(cur.length)segs.push(cur);return segs.map(function(s){return s.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join('');}).join('');}
function _linePath(pts,connect){
  if(connect){
    /* connectNulls: 跳过 null 点不切段, 相邻有效点直接相连（首尾 null 不延伸） */
    var cur=[];
    pts.forEach(function(p){if(!p[2])cur.push(p);});
    return cur.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join('');
  }
  /* 分段: null 断点处断开, 每段独立 M/L（缺失值不跨空连线） */
  var segs=[],cur2=[];
  pts.forEach(function(p){if(p[2]){if(cur2.length)segs.push(cur2);cur2=[];}else{cur2.push(p);}});
  if(cur2.length)segs.push(cur2);
  return segs.map(function(s){
    return s.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join('');
  }).join('');
}
```

点三元组约定：`[x, y, isNull]`（`charts.js:150`、`436`）。null 点：不画点（`charts.js:555`）、不标值（`charts.js:568`）、不参与 `band`/`fillBetween` 段（`charts.js:453`、`478`）、`turns` 判定跳过（`charts.js:579`）。

**输出 HTML 结构**（`charts.js:659-663`）：

```js
    el.innerHTML='<div class="hm-c-line-wrap" '+hStyle+'>'
      +(opt.legend&&legendsHtml?'<div class="hm-c-legend">'+legendsHtml+'</div>':'')
      +'<div class="hm-c-line-svg"><svg viewBox="0 0 '+_W+' '+_H+'" preserveAspectRatio="none">'+grid+bandHtml+fbHtml+tickLines+markHtml+pathsHtml+'</svg>'+dotsHtml+valuesHtml+tickLabels+markLbl+mpHtml+'</div>'
      +(xLabels?'<div class="hm-c-line-x"'+rotStyle+'>'+xLabels+'</div>':'')
      +'</div>';
```

即：`.hm-c-line-wrap` →（可选 `.hm-c-legend`）+ `.hm-c-line-svg` → `<svg viewBox="0 0 320 110" preserveAspectRatio="none">`（网格/带/填充/刻度线/标记线/路径）+ **HTML 覆盖层**（`.hm-c-dot` / `.hm-c-vt` / `.hm-c-yt` / `.hm-c-markline-t` / `.hm-c-mp` / `.hm-c-mp-t`）→（可选 `.hm-c-line-x`）。

**空态**：`!items.length` → `_empty(el)`。**校验**：`_validate(items,'line',true)`（`charts.js:399`，**唯一允许 `value:null`**）；另有三组选项级抛错：`band` 长度（`:424`）、`fillBetween` 索引非法/越界/相同（`:470,472,473`）、两系列长度不一致（`:475`）。

### 2.3 `charts.donut(el, items[, opt])`

**签名与入口**（`charts.js:687-695`）：

```js
  /* ═══ 环形图: charts.donut(el, items[, opt]) ═══
   * opt: {format, colors, size, ringWidth, legend(right默认|bottom|none), showPercent, centerLabel, centerValue, animation} */
  donut:function(el,items,opt){
    if(!el)return;
    _validate(items,'donut');
    if(!items.length){_empty(el);return;}
    opt=_merge({format:null,colors:null,size:150,ringWidth:16,legend:'right',showPercent:true,centerLabel:'',centerValue:null,animation:true},opt);
    var total=0;items.forEach(function(it){total+=_num(it.value);});
    if(!total){_empty(el,'合计为零, 无环形数据');return;}
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `format` | `null` | 值/中心值格式化（`charts.js:708,713`） |
| `colors` | `null` | 缺省 `_PALETTE`（`charts.js:696`） |
| `size` | `150` | 只写成内联 `width/height`（`charts.js:716`） |
| `ringWidth` | `16` | 环宽，且**参与半径自适应**（`charts.js:697-700`） |
| `legend` | `'right'` | 只判 `!=='none'`（`charts.js:710`）——`'bottom'` **无独立实现**，靠 ≤720px 媒体查询变列（`charts.js:130`） |
| `showPercent` | `true` | 图例百分比（`charts.js:713`） |
| `centerLabel` / `centerValue` | `''` / `null` | 中心两行；`centerValue` 缺省 = 合计（`charts.js:707-708`） |
| `animation` | `true` | `stroke-dasharray` 过渡（`charts.js:717-725`） |

**半径自适应（#317 修复）**（`charts.js:697-700`）：

```js
    /* #317 验收修复: r 随 ringWidth 自适应(固定 r=52 时 ringWidth>16 外缘超出 viewBox 被 svg 裁切成"方框圆环")
     * 约束: 外缘 = r + ringWidth/2 ≤ 58(留 2 边距), 即 r = 60 - ringWidth/2 - 2 */
    var cx=60,cy=60;
    var r=Math.max(20,60-opt.ringWidth/2-2),c=2*Math.PI*r;
```

**输出 HTML 结构**（`charts.js:716`）：

```js
    el.innerHTML='<div class="hm-c-donut-wrap"><div class="hm-c-donut" style="width:'+opt.size+'px;height:'+opt.size+'px"><svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#ececf1" stroke-width="'+opt.ringWidth+'"/>'+segments+(centerLabel||centerValue!==''?'<text x="'+cx+'" y="'+(cy-(centerLabel?2:4))+'" text-anchor="middle" style="font-size:8px;fill:var(--fg3,#86868b)">'+centerLabel+'</text><text x="'+cx+'" y="'+(cy+(centerLabel?14:10))+'" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--fg,#1d1d1f)">'+centerValue+'</text>':'')+'</svg></div>'+legendHtml+'</div>';
```

结构：`.hm-c-donut-wrap` → `.hm-c-donut[style=width/height]` → `<svg viewBox="0 0 120 120">`（底环 `<circle stroke="#ececf1">` + N×段 `<circle stroke-dasharray stroke-dashoffset transform="rotate(-90 cx cy)">` + 两行 `<text>`）+ `.hm-c-donut-legend`（每行 `.hm-c-dl` → 色块 + 名 + 值 + 可选百分比）。

**空态**：空数组 → `_empty(el)`；**合计为 0 也走空态**并带专属 hint「合计为零, 无环形数据」（`charts.js:695`）——这是 8 接口里唯一有二级空态判定的。**校验**：`_validate(items,'donut')`（不允许 null）。

### 2.4 `charts.progress(el, pct[, opt])`

**签名与入口**（`charts.js:337-349`）：

```js
  /* ═══ 进度条: charts.progress(el, pct[, opt]) ═══
   * opt: {color, gradient, height(轨道px), showPct(默认true), animation(默认true)} */
  progress:function(el,pct,opt){
    if(!el)return;
    opt=_merge({color:'var(--blue,#007aff)',gradient:false,height:null,showPct:true,animation:true},opt);
    if(!_isNum(pct))throw new Error('charts.progress: pct 无效: '+pct);
    pct=Math.max(0,Math.min(100,_num(pct)));
    var bg=opt.gradient?'linear-gradient(90deg,'+opt.color+',#4db2ff)':opt.color;
    var th=opt.height?('height:'+opt.height+'px;'):'';
    var fill='<div class="hm-c-p-fill" style="width:'+(opt.animation?0:pct)+'%;background:'+bg+';'+(opt.height?('height:'+opt.height+'px;'):'')+'"></div>';
    el.innerHTML='<div class="hm-c-progress"><div class="hm-c-p-track" style="'+(opt.height?('height:'+opt.height+'px;'):'')+'">'+fill+'</div>'+(opt.showPct?'<div class="hm-c-p-n">'+Math.round(pct)+'%</div>':'')+'</div>';
    if(opt.animation){requestAnimationFrame(function(){requestAnimationFrame(function(){var f=el.querySelector('.hm-c-p-fill');if(f)f.style.width=pct+'%';});});}
  },
```

- **输入不是 items 而是 `pct` 数字**；`!_isNum(pct)` → 抛 `'charts.progress: pct 无效: '+pct`（`charts.js:342`）；超界收敛 `0..100`（`:343`）。
- 默认：`color='var(--blue,#007aff)'`、`gradient=false`、`height=null`、`showPct=true`、`animation=true`。
- **空态：无**（不调 `_empty`）；`pct=0` 是合法值 → 渲染空轨道 + `0%`。
- 输出结构：`.hm-c-progress` → `.hm-c-p-track[style=height]` → `.hm-c-p-fill[style=width%/background]` + `.hm-c-p-n`（`Math.round(pct)+'%'`）。
- 死变量：`:345` 的 `th` 计算后未被使用；`.hm-c-p-track` 的 `--c-th`（`charts.js:120`）全文无 JS 写入。

### 2.5 `charts.combo(el, {bars, lines}[, opt])`

**签名与入口**（`charts.js:728-738`）：

```js
  /* ═══ 柱线组合图: charts.combo(el, {bars, lines}[, opt]) ═══
   * bars/lines 同长度同 label; opt: {barColor,lineColor,format,height,y2(线用右轴),legend} */
  combo:function(el,cfg,opt){
    if(!el)return;
    if(!cfg||typeof cfg!=='object')throw new Error('charts.combo: 需要 {bars,lines} 配置对象');
    var bars=cfg.bars||[],lines=cfg.lines||[];
    if(bars.length&&lines.length&&bars.length!==lines.length)throw new Error('charts.combo: bars 与 lines 长度不一致 ('+bars.length+' vs '+lines.length+')');
    _validate(bars.length?bars:lines,'combo');
    if(!bars.length&&!lines.length){_empty(el);return;}
    var n=bars.length||lines.length;
    opt=_merge({barColor:'var(--blue,#007aff)',lineColor:'#ff9500',format:null,height:null,y2:false,legend:false,animation:true,tooltip:false,onclick:null},opt);
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `barColor` | `'var(--blue,#007aff)'` | 柱色（`charts.js:756`） |
| `lineColor` | `'#ff9500'` | 线色/点边框（`charts.js:757,775`） |
| `format` | `null` | 柱顶值文本（`charts.js:755`） |
| `height` | `null` | `--c-h`（`charts.js:739`） |
| `y2` | `false` | `true` → 线独立归一化（双轴）（`charts.js:745-746`） |
| `legend` | `false` | 固定两项「量」「趋势」（`charts.js:770-771`） |
| `animation` | `true` | 柱高过渡（`charts.js:778`） |
| `onclick` | `null` | 绑 `.hm-c-b,.hm-c-col`（`charts.js:796`） |
| **`tooltip`** | `false` | **死参数**：`:738` 声明，combo 分支全文无 `opt.tooltip` 读取（全文件仅 303/392/683/908 四处，均非 combo） |

**坐标唯一性语义**（`charts.js:742-746`）：

```js
    /* 坐标唯一性（v1.6 修复）: 柱与线共享同一 Y 轴归一化 → 线点 = 柱顶位置（趋势线连柱顶语义）
     * maxV = 所有柱值+线值的最大值; y2:true 时线独立归一化（双轴场景） */
    var maxV=Math.max(maxB,maxL);
    var barMax=opt.y2?maxB:maxV;
    var lineMax=opt.y2?maxL:maxV;
```

**输出 HTML 结构**（`charts.js:754-777`）：

```js
      cols+='<div class="hm-c-col hm-c-col-combo" data-i="'+i+'">'
        +(bars.length?'<div class="hm-c-v hm-c-v-combo" style="bottom:'+barH+'%">'+_esc(_fmt(bars[i].value,opt.format))+'</div>':'')
        +(bars.length?'<div class="hm-c-b" data-i="'+i+'" style="height:'+(opt.animation?0:barH)+'%;background:'+opt.barColor+';max-width:22px"></div>':'')
        +(lines.length?'<i class="hm-c-dot hm-c-combo-dot" data-i="'+i+'" style="left:50%;top:'+(100-dotH)+'%;border-color:'+opt.lineColor+'"></i>':'')
        +'</div>';
```

```js
    el.innerHTML='<div class="hm-c-bar hm-c-combo" '+hStyle+'>'+legend
      +'<div class="hm-c-plot" style="position:relative">'+cols
      +'<svg class="hm-c-combo-svg" viewBox="0 0 '+_W+' '+_H+'" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none">'
      +(lines.length?'<polyline points="'+poly+'" fill="none" stroke="'+opt.lineColor+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="vector-effect:non-scaling-stroke"/>':'')
      +'</svg></div>'
      +'<div class="hm-c-labels">'+labels+'</div></div>';
```

柱高/点高都 `Math.min(80,Math.max(3,…))`（`charts.js:752-753`）——**上限 80%**（给柱顶值标签留位）。线点用 `<i class="hm-c-dot hm-c-combo-dot">` 放在 `.hm-c-col-combo`（`position:relative`，`charts.js:69`）内，`left:50%` 精确落柱列中心。

**DOM 校准（纯字符串产出无法复刻的关键点）**（`charts.js:779-795`）：

```js
    /* 校准: polyline 节点 x 精确对齐各 col 实际中心（flex gap 偏移修正, 零偏差） */
    var calib=function(){
      var plot=el.querySelector('.hm-c-plot');var poly=el.querySelector('polyline');
      if(!plot||!poly)return;
      var pw=plot.getBoundingClientRect().width||1;
      var cols=el.querySelectorAll('.hm-c-col-combo');
      var pts=poly.getAttribute('points').split(' ');
      var newPts=pts.map(function(pt,i){
        var xy=pt.split(',');
        var col=cols[i];if(!col)return pt;
        var cr=col.getBoundingClientRect();
        var x=(cr.x+cr.width/2-plot.getBoundingClientRect().x)/pw*_W;
        return x.toFixed(1)+','+xy[1];
      });
      poly.setAttribute('points',newPts.join(' '));
    };
    calib();
```

**空态**：`!bars.length&&!lines.length` → `_empty(el)`（`charts.js:736`）。**校验**：`cfg` 非对象抛错、长度不一致抛错、`_validate(bars.length?bars:lines,'combo')`（**只校验其中一条非空序列**）。

### 2.6 `charts.sparkline(el, items[, opt])`

**签名与入口**（`charts.js:799-816`）：

```js
  /* ═══ 迷你趋势卡: charts.sparkline(el, items[, opt]) ═══
   * opt: {color, width, height, showValue(默认true), format} 涨绿跌红 */
  sparkline:function(el,items,opt){
    if(!el)return;
    _validate(items,'sparkline');
    if(!items.length){_empty(el);return;}
    opt=_merge({color:'var(--blue,#007aff)',width:90,height:30,showValue:true,format:null},opt);
    var vals=items.map(function(it){return _num(it.value);});
    var min=Math.min.apply(null,vals),max=Math.max.apply(null,vals);
    if(max===min){max=min+1;}
    var W=opt.width,H=opt.height,P=2;
    var pts=items.map(function(it,i){var x=P+(W-2*P)*i/(items.length-1);var y=H-P-(_num(it.value)-min)/(max-min)*(H-2*P);return [x,y];});
    var poly=pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
    var first=vals[0],last=vals[vals.length-1];
    var up=last>=first;
    var color=up?'var(--ok,#34c759)':'#ff3b30';
    var v=opt.showValue?'<span class="hm-c-sp-v '+(up?'up':'down')+'">'+_esc(_fmt(last,opt.format))+'</span>':'';
    el.innerHTML='<div class="hm-c-spark"><svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><polyline points="'+poly+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>'+v+'</div>';
  },
```

| 字段 | 默认 | 说明 |
|---|---|---|
| **`color`** | `'var(--blue,#007aff)'` | **死参数**：`:805` 声明，`:814` 被涨跌色**无条件覆盖** |
| `width` / `height` | `90` / `30` | 直接进 `<svg width height viewBox>`（`charts.js:816`） |
| `showValue` | `true` | 末值文本（`charts.js:815`） |
| `format` | `null` | 末值格式化 |

- **涨绿跌红**：`up = last >= first` → `var(--ok,#34c759)`，否则 `#ff3b30`（`charts.js:813-814`）；文本 class `up`/`down` 对应 CSS `charts.js:97-98`。
- **无坐标轴**：`viewBox` 只有 polyline，无网格/刻度/点。
- **空态**：空数组 → `_empty(el)`。
- **潜在缺陷（新实现需处置）**：`items.length === 1` 时 `x = P+(W-2P)*0/0` → **NaN**（`charts.js:810` 用 `(items.length-1)` 作除数且无 `Math.max(1,…)` 保护；对比 line 的 `charts.js:147` 有保护）。

### 2.7 `charts.gauge(el, pct[, opt])`

**签名与入口**（`charts.js:819-834`）：

```js
  /* ═══ 仪表盘: charts.gauge(el, pct[, opt]) ═══
   * opt: {label, color, size, format} 弧形进度 + 目标刻度 */
  gauge:function(el,pct,opt){
    if(!el)return;
    if(!_isNum(pct))throw new Error('charts.gauge: pct 无效: '+pct);
    pct=Math.max(0,Math.min(100,_num(pct)));
    opt=_merge({label:'',color:'var(--blue,#007aff)',size:170,format:null,animation:true},opt);
    var W=170,H=105,cx=85,cy=92,r=70;
    var angle=Math.PI; /* 180° 弧 */
    var endAngle=Math.PI*(pct/100);
    var x0=cx-r*Math.cos(angle),y0=cy-r*Math.sin(angle);
    var x1=cx-r*Math.cos(Math.PI-endAngle),y1=cy-r*Math.sin(Math.PI-endAngle);
    var large=pct>50?1:0;
    var arc='M'+x0.toFixed(1)+' '+y0.toFixed(1)+' A'+r+' '+r+' 0 '+large+' 1 '+x1.toFixed(1)+' '+y1.toFixed(1);
    var bgArc='M'+x0.toFixed(1)+' '+y0.toFixed(1)+' A'+r+' '+r+' 0 1 1 '+(cx+r).toFixed(1)+' '+cy.toFixed(1);
    el.innerHTML='<div class="hm-c-gauge" style="--g-size:'+opt.size+'px"><svg viewBox="0 0 170 105"><path d="'+bgArc+'" fill="none" stroke="#ececf1" stroke-width="12" stroke-linecap="round"/><path d="'+arc+'" fill="none" stroke="'+opt.color+'" stroke-width="12" stroke-linecap="round" style="'+(opt.animation?'stroke-dasharray:1000;stroke-dashoffset:1000;':'')+'"/></svg><div class="hm-c-gl">'+_esc(opt.label)+'</div><div class="hm-c-gv">'+_esc(opt.format?_fmt(Math.round(pct),opt.format):Math.round(pct)+'%')+'</div></div>';
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `label` | `''` | 弧下标签 `.hm-c-gl`（`charts.js:834`） |
| `color` | `'var(--blue,#007aff)'` | 前景弧色 |
| `size` | `170` | **只写 CSS 变量 `--g-size`**；SVG viewBox 固定 `0 0 170 105` |
| `format` | `null` | 有 format → 格式化 `Math.round(pct)`（**不带 `%`**）；无 → `N%` |
| `animation` | `true` | `getTotalLength()` + `stroke-dashoffset`（`charts.js:835-838`） |

- **几何常量**：`cx=85, cy=92, r=70`，180° 弧，`large=pct>50?1:0`。
- **空态：无**（`pct=0` 合法，渲染纯底弧 + `0%`）。
- **校验**：`!_isNum(pct)` → 抛 `'charts.gauge: pct 无效: '+pct`（`charts.js:823`）。
- 注意 `var W=170,H=105`（`charts.js:826`）声明后未使用（SVG 里是字面量）。

### 2.8 `charts.scatter(el, items[, opt])`

**签名与入口**（`charts.js:841-854`）：

```js
  /* ═══ 散点图: charts.scatter(el, items[, opt]) ═══
   * items:[{x, y, label?}] 双数值坐标 · opt: {color, dotSize, format, regression(默认true, 线性最小二乘),
   *   regressionColor, yTicks(默认4, 复用 line 轴刻度逻辑), labels(edge默认|all|none), tooltip, animation, height}
   * 空态/结构校验对齐其他接口: 非法 x/y 直接报错, 空数组 → emptyState; 双端自适应沿用 line 语义 */
  scatter:function(el,items,opt){
    if(!el)return;
    if(!Array.isArray(items))throw new Error('charts.scatter: items 必须是数组, 收到 '+(items===null?'null':typeof items));
    items.forEach(function(it,i){
      if(!it||typeof it!=='object')throw new Error('charts.scatter: items['+i+'] 必须是对象');
      if(!_isNum(it.x)||!_isNum(it.y))throw new Error('charts.scatter: items['+i+'].x/y 无效（缺省/非数字）: '+JSON.stringify({x:it.x,y:it.y}));
    });
    if(!items.length){_empty(el);return;}
    opt=_merge({color:'var(--blue,#007aff)',dotSize:null,format:null,regression:true,regressionColor:'#ff3b30',
      yTicks:4,labels:'edge',tooltip:false,animation:true,height:null},opt);
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `color` | `'var(--blue,#007aff)'` | 点边框色（`charts.js:870`） |
| `dotSize` | `null` | `ds = opt.dotSize||9`，非 9 时内联覆盖尺寸 + 居中 margin（`charts.js:864-865`） |
| `format` | `null` | 刻度与 tooltip 共用（`charts.js:891,922`） |
| `regression` | `true` | `!==false && items.length>=2` 才画（`charts.js:874`） |
| `regressionColor` | `'#ff3b30'` | 虚线 `5 4`（`charts.js:881`） |
| `yTicks` | **`4`** | 与 line 的 `false` 不同——注释明写理由（`charts.js:883`） |
| `labels` | `'edge'` | `'all'` / `'edge'` / `'none'`（`charts.js:895-897`） |
| `tooltip` | `false` | 最近点命中（欧氏距离，`charts.js:911-929`） |
| `animation` | `true` | 点 `opacity` 逐点延迟淡入 `i*0.02s`（`charts.js:900-907`） |
| `height` | `null` | `--c-h`（`charts.js:898`） |

- **域**：`xMax===xMin` / `yMax===yMin` 各 +1，再外扩 `6%`（`charts.js:856-859`）。
- **回归线**（`charts.js:872-882`）：线性最小二乘 `b=(nΣxy-ΣxΣy)/(nΣxx-(Σx)²)`，`denom=0` 时 `b=0`，`a=(Σy-bΣx)/n`；端点在域边界取 `xMin`/`xMax`。
- **输出结构**（`charts.js:899`）：`.hm-c-line-wrap` → `.hm-c-line-svg` → `<svg viewBox="0 0 320 110" preserveAspectRatio="none">`（刻度线 + 回归线）+ HTML 点层 + 刻度文字层 →（可选 `.hm-c-line-x`）。
- **空态**：空数组 → `_empty(el)`。**校验**：非数组抛错 + 每点 `x`/`y` 必须可转数字（`charts.js:847-851`）。

### 2.9 8 接口一致性速查

| 接口 | 输入形态 | 空态 | 结构校验 | 抛错文案前缀 |
|---|---|---|---|---|
| `bar` | `items[]` | `_empty` | `_validate` + 多值 3 条 | `charts.bar:` |
| `line` | `items[]`（允许 null） | `_empty` | `_validate(allowNull)` + band/fillBetween 5 条 | `charts.line:` |
| `donut` | `items[]` | `_empty` + 合计 0 二级空态 | `_validate` | `charts.donut:` |
| `progress` | `pct` 数字 | **无** | pct 非数 | `charts.progress:` |
| `combo` | `{bars, lines}` | `_empty` | cfg 对象 + 等长 + `_validate` | `charts.combo:` |
| `sparkline` | `items[]` | `_empty` | `_validate` | `charts.sparkline:` |
| `gauge` | `pct` 数字 | **无** | pct 非数 | `charts.gauge:` |
| `scatter` | `[{x,y,label?}]` | `_empty` | 非数组 + x/y | `charts.scatter:` |

**全部 18 条抛错文案（逐字）**：

| # | 行号 | 文案（模板串原样） |
|---|---|---|
| 1 | `charts.js:32` | `'charts.'+name+': items 必须是数组, 收到 '+(items===null?'null':typeof items)` |
| 2 | `charts.js:34` | `'charts.'+name+': items['+i+'] 必须是对象'` |
| 3 | `charts.js:38` | `'charts.'+name+': items['+i+'].value 无效（缺省/非数字）: '+JSON.stringify(v)` |
| 4 | `charts.js:39` | `'charts.'+name+': items['+i+'].label 缺失'` |
| 5 | `charts.js:249` | `'charts.bar: stacked/grouped 模式下 items['+i+'] 必须含 values 数组: '+JSON.stringify(it)` |
| 6 | `charts.js:250` | `'charts.bar: items['+i+'].values['+j+'] 无效（缺省/非数字）: '+JSON.stringify(v)` |
| 7 | `charts.js:253` | `'charts.bar: 各 item values 长度必须一致 ('+nSeg+'), items['+i+']='+it.values.length` |
| 8 | `charts.js:342` | `'charts.progress: pct 无效: '+pct` |
| 9 | `charts.js:424` | `'charts.line: band.hi/lo 长度必须与 items 等长 ('+_bandN+'), 收到 hi='+opt.band.hi.length+' lo='+opt.band.lo.length` |
| 10 | `charts.js:470` | `'charts.line: fillBetween.a/b 必须为系列索引数字'` |
| 11 | `charts.js:472` | `'charts.line: fillBetween.a/b 越界 (系列数 '+seriesList.length+', a='+fa+' b='+fb2+')'` |
| 12 | `charts.js:473` | `'charts.line: fillBetween.a/b 不能相同'` |
| 13 | `charts.js:475` | `'charts.line: fillBetween 两系列 items 长度不一致'` |
| 14 | `charts.js:732` | `'charts.combo: 需要 {bars,lines} 配置对象'` |
| 15 | `charts.js:734` | `'charts.combo: bars 与 lines 长度不一致 ('+bars.length+' vs '+lines.length+')'` |
| 16 | `charts.js:823` | `'charts.gauge: pct 无效: '+pct` |
| 17 | `charts.js:847` | `'charts.scatter: items 必须是数组, 收到 '+(items===null?'null':typeof items)` |
| 18 | `charts.js:849` / `:850` | `'charts.scatter: items['+i+'] 必须是对象'` / `'charts.scatter: items['+i+'].x/y 无效（缺省/非数字）: '+JSON.stringify({x:it.x,y:it.y})` |

> **新契约映射**：旧版抛原生 `Error` + 中文长文案，无错误码。新契约要求 `ChartError{code}`，码表 `CHART_ERROR_CODES = ['structure-invalid','pct-invalid','kind-unknown']`（`spec/charts.ts:247`）。映射：1–7、9–15、17–18 → `structure-invalid`；8、16 → `pct-invalid`；`kind-unknown` **无旧对应物**（旧版没有 kind 分派器）。

---

## 3. 全局与常量

### 3.1 调色板

`charts.js:44`（10 色 Apple 语义色，`donut` 与 `series` 取色源）：

```js
var _PALETTE=['#007aff','#34c759','#ff9500','#ff3b30','#af52de','#5ac8fa','#ffcc00','#8e8e93','#ff2d55','#00c7be'];
```

与新版 `CHART_PALETTE`（`spec/charts.ts:234-245`）**逐值一致**（新版注释亦自述「旧 charts.js:44 逐值」，`charts.ts:233`）。取色规则：`donut` 用 `palette[i%len]`（`charts.js:704,713`）；`line` 多序列用 `_PALETTE[si%10]`（`charts.js:539`、`603`）；`bar` 多值用 `colors[j%len]`（`charts.js:254`）。**单色默认**统一 `var(--blue,#007aff)`（带 fallback）。

### 3.2 断点与双端自适应

唯一媒体查询（`charts.js:123-135`）：

```js
  /* 手机 UI（≤720px · 独立一套） */
  +'@media(max-width:720px){'
  +'.hm-c-bar{height:var(--c-h,150px)}'
  +'.hm-c-bar .hm-c-b{max-width:30px}'
  +'.hm-c-bar .hm-c-labels .hm-c-l{font-size:9.5px;white-space:normal;line-height:1.25}'
  +'.hm-c-line-wrap{--c-h:150px}'
  +'.hm-c-dot{width:8px;height:8px;margin:-4px 0 0 -4px}'
  +'.hm-c-donut-wrap{flex-direction:column;gap:14px}'
  +'.hm-c-donut{width:150px;height:150px}'
  +'.hm-c-donut-legend{width:100%}'
  +'.hm-c-donut-legend .hm-c-dl{font-size:12.5px;gap:10px}'
  +'.hm-c-gauge{--g-size:150px}'
  +'}';
```

映射到新版 `CHART_BREAKPOINTS`（`spec/charts.ts:226-231`）：

| 新契约字段 | 值 | 旧证据 | 备注 |
|---|---|---|---|
| `mobileMaxPx` | `720` | `charts.js:124` | 一致 |
| `dotSizeMobilePx` | `8` | `charts.js:129` | 一致 |
| `lineHeightMobilePx` | `150` | `charts.js:128` | 一致 |
| `stackedGapPx` | `3` | `charts.js:60` `.hm-c-col-grouped{…gap:3px}` | **命名与语义不符**：该 `3px` 是 **grouped 并排子柱**的间距，`stacked` 段之间**没有 gap**（`charts.js:59` 的 `.hm-c-sg` 无 gap 声明）。见 §8.2-C14 |

桌面端缺省高度：柱/组合 `--c-h:170px`（`charts.js:52`）、折线 `--c-h:210px`（`charts.js:72`）、donut 150px（`:110`）、gauge `--g-size:170px`（`:100`）。

### 3.3 样式注入方式（style 标签 id）

`charts.js:46-49`：

```js
/* ═══ CSS 注入（全形态 · 双端自适应）═══ */
var _styleId='hm-charts-style';
if(!document.getElementById(_styleId)){
  var st=document.createElement('style');st.id=_styleId;
```

末尾 `document.head.appendChild(st);`（`charts.js:136`）。**id 幂等**（已存在则跳过）。新契约冻结 `CHARTS_STYLE_ID = 'ilife-charts'`（`spec/charts.ts:215`）——**必须改**（旧 `hm-charts-style` 与之不同）。

对比：`help_template.html` 的 CSS 是**模板内联 `<style>`（无 id）**（`help_template.html:7-168`），不参与注入 id 体系。

### 3.4 坐标系（viewBox 还是 px）

- **折线 / 组合 / 散点**：`viewBox="0 0 320 110"` ＋ `preserveAspectRatio="none"`（`charts.js:661,774,899`），几何常量 `_W=320,_H=110,_P=14`（`:140`）。
- **donut**：`viewBox="0 0 120 120"`（`:716`）；**gauge**：`viewBox="0 0 170 105"`（`:834`）；**sparkline**：`width/height` 属性 + `viewBox="0 0 W H"`（`:816`，W/H 来自 opt）。
- **混合体系**：数据点/数值/刻度/标注/tooltip 为 HTML 元素，`left/top` 用百分比定位（`charts.js:560,572,583,604,618,645,649,870`）；tooltip 与十字线还需 `getBoundingClientRect()` 实时换算（`:222-234`）。
- 因此旧版是「**SVG viewBox 路径 + HTML 百分比覆盖层**」双层体系，**不是纯 viewBox-only**（新契约 `CHART_COORD_RULE='viewBox-only'`，`charts.ts:224`）。

### 3.5 `CHART_*` 类常量

**旧版不存在任何 `CHART_*` 常量**。全文件只有 3 个模块级常量：`_PALETTE`（`:44`）、`_W/_H/_P`（`:140`）、`_styleId`（`:47`），其余都是函数内字面量（如 `Math.min(80,…)`、`6%` padding、`26` viewBox 单位、`18/82` 贴边阈值、`3` 条网格线、`r=60-ringWidth/2-2`）。

→ 新契约的 `CHART_KINDS`／`CHART_STRUCTURE_RULE`／`CHART_EMPTY_RULE`／`CHART_COORD_RULE`／`CHART_BREAKPOINTS`／`CHART_PALETTE`／`CHART_ERROR_CODES` 中，**只有 `CHART_PALETTE` 与 `CHART_BREAKPOINTS` 的 4 个数字**有旧值可对标；其余是**新造常量**（把旧代码里的隐式规则显式化）。

### 3.6 外部依赖（禁止逐字 vendoring 的根因）

| 依赖 | 旧证据 | 性质 |
|---|---|---|
| `window.esc` | `charts.js:15` 读；定义在 `base.js:14` | 软依赖（有本地兜底） |
| `window.emptyState` | `charts.js:26` 读；定义在 `base.js:608` | 软依赖（有内联兜底） |
| `window.charts` | `charts.js:335` 赋值 | **硬挂载**，新契约禁止（`charts.ts:270`） |
| `window.__chartsLoaded` | `charts.js:12` 赋值/读 | **硬挂载**，同上 |
| `hm-c-*` 类名（223 处） | `charts.js:50-135` CSS + 全部 HTML | 与 `ilife-` 前缀冲突 |
| `hm-charts-style` | `charts.js:47` | 与 `CHARTS_STYLE_ID='ilife-charts'` 冲突 |
| token CSS 变量 `--blue/--ok/--fg/--fg2/--fg3/--card` | `charts.js:50,55,67,76,87,92,97,100,103,106,113,116,120,122` | 均带 fallback，可移植 |
| DOM API | `document.`（7 处）、`getBoundingClientRect`（9 处）、`requestAnimationFrame`（16 处）、`createElement`（5 处） | 纯字符串产出后必须改写 |
| 第三方库 / canvas / node: | **0 处**（`<canvas` 0、`https://` 0、`import ` 0、`require(` 0） | 旧版已零第三方，新契约同口径 |

`charts.js` 自身**不含** `</script` 字样（0 处，`charts.js:9` 注释明写这是防 HTML 提前截断的约束），这条约束在新资产产出规则里同样成立。

---

## 4. 复合形态规则

### 4.1 combo（柱 + 线叠加）

1. **共享 Y 轴（缺省）**：`maxV = max(柱值, 线值)`，柱与线同一归一化 → 线点落在柱顶（`charts.js:742-746`）。
2. **双轴（`y2:true`）**：柱用 `maxB`、线用 `maxL` 各自归一化（`charts.js:745-746`）——新版 `ComboChartInput` **无 `y2` 字段**（`spec/charts.ts:132-136`），契约登记为「不冻结也不排除」（`base-paint-contract.md:798`）。
3. **高度钳制**：柱与点都 `Math.min(80, Math.max(3, …))`（`charts.js:752-753`）——上限 80% 给柱顶标签留位；下限 3% 保证可见。
4. **叠加方式**：柱为 flex 列（`.hm-c-col-combo`），线为**绝对定位的 `<svg class="hm-c-combo-svg">` 覆盖层**（`charts.js:774`，`pointer-events:none`），点再叠一层 HTML `<i>`（`:757`）。
5. **零偏差校准**：渲染后读 `getBoundingClientRect()` 把 polyline 各节点 X 对齐真实列中心（`charts.js:779-795`）——**纯字符串产出无法执行**。
6. **图例固定两项**：「量」「趋势」（`charts.js:770-771`），不读 `segNames`。
7. `tooltip` 选项为死参数（§2.5）。

### 4.2 gauge（弧形进度）

1. **几何**：`cx=85, cy=92, r=70`，180° 弧（`charts.js:826-833`）；`large=pct>50?1:0` 决定 `A` 命令大弧标志。
2. **底弧**固定满 180°（`bgArc`，`charts.js:833`）；前景弧按 `pct/100` 计算终点角。
3. **动画**：`stroke-dasharray/dashoffset = 1000` 初值 → `getTotalLength()` → `dashoffset = len*(1-pct/100)`（`charts.js:834-838`）。
4. **尺寸**：`opt.size` 只改 CSS 变量 `--g-size`（CSS `:100` 用 `height:calc(var(--g-size,170px)*.62)`），**SVG viewBox 不变** → 等比缩放。
5. **值文本**：有 `format` → 格式化纯数字（无 `%`）；无 → `Math.round(pct)+'%'`（`charts.js:834`）。

### 4.3 scatter（散点 + 回归线 + 轴）

1. **双数值域**：x/y 各自 min/max，退化时 +1，再各外扩 6%（`charts.js:856-859`）。
2. **回归线**：线性最小二乘，`n>=2` 且 `regression!==false`；`denom=0` 退化为水平线 `b=0`；虚线 `5 4`、宽 `1.5`、色 `#ff3b30`（`charts.js:872-882`）。
3. **Y 轴刻度**：`yTicks` **默认 4**（与 line 的 `false` 相反），理由见 `charts.js:883` 注释「读轴是散点核心用途」；收敛 `2..6`。
4. **X 标签**：`edge` 默认（首尾）/ `all` / `none`（`charts.js:895-897`）。
5. **点尺寸**：`dotSize||9`，非 9 时内联 `width/height/margin` 覆盖（`charts.js:864-865`）。
6. **tooltip**：最近点欧氏距离命中（`charts.js:911-919`）。
7. **null**：scatter 的 `x`/`y` 不允许 null（`_isNum` 校验，`charts.js:850`）——与 line 不同。

### 4.4 sparkline（迷你趋势）

1. **无坐标轴**：只有一条 polyline + 可选末值文本（`charts.js:816`）。
2. **涨绿跌红**：`last>=first` → `var(--ok,#34c759)`，否则 `#ff3b30`（`:813-814`）；**`opt.color` 被覆盖**（死参数）。
3. **padding**：`P=2`（`:809`）。
4. **退化**：`max===min` → `max=min+1`（`:808`）；**单点 → NaN**（§2.6）。

### 4.5 stacked / grouped（bar 多值模式，`_barMulti`，`charts.js:244-333`）

**统一结构**（`charts.js:244-246` 注释）：`items:[{label, values:[v1,v2,…], color?}]`——`values` 是「多段/多值」唯一真相源。

**校验（3 条抛错）**：`values` 必须是数组且非空（`:249`）；每段必须数字（`:250`）；各 item 的 `values.length` 必须一致（`:253`）。

**stacked 段高（percent 缺省 / absolute）**（`charts.js:270`）：

```js
        var pctS=(opt.stackMode==='absolute')?(maxTotal>0?Math.round(_num(v)/maxTotal*100):0):(tot>0?Math.round(_num(v)/tot*100):0);
```

- `percent`：分母 = 本柱合计 `tot`（柱内合计恒 100%）。
- `absolute`：分母 = 全局最大合计 `maxTotal`。
- **stacked 不参与 `yMin`/`yMax`**（`charts.js:259` 注释明写）。

**grouped 子柱高**（`charts.js:273`）：`Math.max(2,Math.round((v-allMin)/(allHi-allMin)*100))`——**尊重显式 Y 域**（`allMin`/`allHi` 在 `:260-261` 处理 `opt.yMin/yMax`），与单柱语义对齐。

**互斥**：`if(opt.stacked||opt.grouped)` 进多值分支（`:363`），分支内 `opt.stacked` 优先（`:269` 的 `if(opt.stacked)` 先判，否则走 grouped 的 `else`）→ 同传时 **stacked 生效**。

**图例/段名**：`segNames` 缺省 `'段1'…`（`:255`）；`legend:true` 时渲染 `.hm-c-legend`（`:286-288`）；tooltip 逐段列值与占比（`:311-314`）。

**间距**：grouped 用 `.hm-c-col-grouped{gap:3px}`（`:60`）+ `.hm-c-gw{max-width:18px}`（`:61`）；stacked 用 `.hm-c-stack{overflow:hidden}`（`:58`）**无 gap**。

**动画**：初值 0% → rAF×2 后写真实百分比（`:291-302`）。

### 4.6 anomaly（异常点标记）

仅 `line` 支持（`charts.js:557-559`）：

```js
          /* v1.22 · #341: 异常点变色 — items 每点 anomaly:true → 警示红(默认 #ff3b30), 可被点级 color 覆盖 */
          var dotCls='hm-c-dot',dotExtra='border-color:'+color;
          if(s.items[i].anomaly){dotCls+=' hm-c-dot-anomaly';dotExtra='border-color:#ff3b30;background:#ff3b30;box-shadow:0 0 0 3px rgba(255,59,48,.18)';}
```

CSS：`.hm-c-dot-hl`（`:78`）用于圈选环；anomaly 走内联 style 染红（`hm-c-dot-anomaly` 类无独立 CSS 规则，纯标记）。`bar`/`donut`/`scatter` **不支持** anomaly。

### 4.7 null 值处理总表

| 接口 | null 合法性 | 行为 |
|---|---|---|
| `line` | **允许**（`_validate(…,true)`，`charts.js:399`） | 断线（`:161-167`）；`connectNulls:true` 跨空直连（`:155-159`）；不画点/不标值；不参与 band/fillBetween 段 |
| `scatter` | **不允许** | `x`/`y` 非数直接抛错（`charts.js:850`） |
| `bar`/`donut`/`sparkline` | **不允许** | `_validate` 无 `allowNull` → 抛错（`:38`） |
| `progress`/`gauge` | 不适用 | `pct` 非数抛错 |

---

## 5. `help_template.html` 壳结构

### 5.1 区块清单（有序）

| # | 区块 | 元素/类名 | 行号 |
|---|---|---|---|
| 1 | doctype/head/title | `<title>HELP 原型 · V4 三级目录版</title>` | `:1-6` |
| 2 | 内联样式（无 id） | `<style>…</style>` | `:7-168` |
| 3 | 原型舞台外壳 | `.stage` > `.stage-title` + `.stage-sub` + `.phone` > `.screen#screen` | `:172-176` |
| 4 | Sheet 弹层（静态骨架） | `#sheetMask` + `#sheet` > `.grip` + `#sheetClose` + `.s-scroll`（`#shHead`/`#shBody`）+ `.s-actions` > `#shCopy` | `:178-189` |
| 5 | Toast 容器 | `<div class="toast" id="toast" style="display:none">` | `:191` |
| 6 | 注入管线 | `<!--INJECT-DATA-->` / `<!--SHARED-HELPERS-->` / `<!--SHARED-CSS-->` | `:195` / `:197` / `:200` |
| 7 | 数据绑定 | `var HELP = JSON.parse(document.getElementById('help-data').textContent);` + 9 个顶层键 | `:205-214` |
| 8 | 归一化层 | `normalizeScenes()`（契约 → 原型内部结构） | `:218-232` |
| 9 | 分组映射 | `GROUPS`（`key/icon/name/subgroups`） | `:233-240` |
| 10 | 扁平索引 | `ALL` + `SCENE` 字典 | `:243-252` |
| 11 | 类型徽章 | `TYPE_DEFAULT` 10 项配色表 + `typeBadgeHTML()` + `chipHTML()` | `:256-287` |
| 12 | SVG 图标库 | `SVG_ICONS`（write/calendar/chart/grid/target/rocket） | `:290-297` |
| 13 | 参数机制 | `readParams()` / `buildPrompt()` / `getMissing()` | `:305-325` |
| 14 | 主渲染 | `#screen.innerHTML`：HERO + init_banner + 搜索 + pages + tab-bar | `:329-392` |
| 14a | HERO | `.hero` > `.eyebrow` + `h1` + `.lead` + `.h-badge` + `.hero-steps` | `:330-332` |
| 14b | init_banner | `.init-banner#initBanner` > `.ib-text` + 复制按钮 + `.ib-close` + `.init-steps` | `:333-335` |
| 14c | 搜索区 | `.search-wrap` > `.search-box`（`#sB` + `#sClear`）+ `#hitC` + `#emptyC` | `:336-337` |
| 14d | 分组页容器 | `.pages#pages` > `N×.page[data-page]` | `:338-355` |
| 14e | 子功能折叠 | `.subgroup[open]` > `summary`（+`.sg-count`）+ `.sg-body` > `.grid` | `:342-352` |
| 14f | 场景卡（2 列） | `.mini[data-key]` > `.m-top`（chip/badge）+ `.m-bottom`（`.m-name` + 复制按钮） | `:344-350` |
| 14g | 关于 Tab | `.page[data-page="about"]` > 联系作者 + 版本 + 其他技能 | `:356-384` |
| 14h | 底部 Tab 栏 | `.tab-bar#tabBar` > `N×.tab[data-nav]` + 关于 | `:386-391` |
| 15 | 初始化关闭 | `#initClose` 点击隐藏横幅 | `:395-399` |
| 16 | ViewPager | `lockPagesHeight()` / `curIndex()` / `syncTab()` / Tab 点击居中 | `:411-463` |
| 17 | Sheet 交互 | `openSheet()` / `closeSheet()` / 参数实时预览 | `:473-506` |
| 18 | 卡片交互 | `.mini` 点击开 Sheet（`[data-c]` 除外） | `:509-515` |
| 19 | Toast 封装 | `showToast()` / `toastMsg()` / `doCopy()` | `:518-530` |
| 20 | 全局复制 | 事件委托 `[data-c]` + 参数校验 + 复制后**不关**弹窗 | `:533-548` |
| 21 | 搜索 | `doSearch()`（跨 Tab + 自动跳页 + 高亮 `<mark>` + 折叠组联动） | `:550-602` |
| 22 | 折叠高度校准 | `details > summary` 点击后 60ms 重算 | `:605-608` |

### 5.2 占位符与数据槽

| 占位符 | 数量规则（旧） | 模板行号 | 注入物 |
|---|---|---|---|
| `<!--INJECT-DATA-->` | 必须恰好 1（`injector.py:5`） | `:195` | scene-data JSON（`injector.py:121-122`） |
| `<!--SHARED-HELPERS-->` | 必须恰好 1（`injector.py:6`） | `:197` | `assets/base.js`（`injector.py:110`） |
| `<!--SHARED-CSS-->` | 必须恰好 1（`injector.py:7`） | `:200` | `assets/base.css`（`injector.py:114`） |
| `<!--CHARTS-HELPERS-->` | 0 或 1（`injector.py:9`、`component-contract.md:71`） | **本模板 0 处** | 图表资产（`injector.py:118-120`） |

**数据槽（9 个顶层键，模板消费情况）**（`help_template.html:205-214`）：

```js
var HELP = JSON.parse(document.getElementById('help-data').textContent);
var SKILL_NAME = HELP.skill_name || '';
var TITLE = HELP.title || '能力速查台';
var SUBTITLE = HELP.subtitle || '';
var META_BLOCKS = HELP.meta_blocks || [];
var INIT_BANNER = HELP.init_banner || null;
var CONTACT = HELP.contact || null;
var SKILL_VERSION = HELP.version || '';
var ABOUT_EXTRA = {};
var RECOMMENDATIONS = HELP.recommendations || [];
```

| 键 | 是否渲染 | 证据 |
|---|---|---|
| `skill_name` | ✅ | `:330` eyebrow |
| `title` | ✅ | `:330` h1 |
| **`subtitle`** | ❌ **声明后从不使用** | `:208` 声明；全文无 `SUBTITLE` 二次出现 |
| **`meta_blocks`** | ❌ **声明后从不使用** | `:209` 声明；全文无 `META_BLOCKS` 二次出现 |
| `init_banner` | ✅ | `:333-335`（`hidden` 可屏蔽、`closable:false` 可去关闭按钮、`steps` 数组） |
| `contact` | ✅ | `:359-373`（`items[].label/value/url` + `copy_all` 一键复制） |
| `version` | ✅ | `:375`「v{version} · HELP 模板 v4」 |
| `recommendations` | ✅ | `:377-383`（`r.name` / `r.desc` / `r.wake`） |
| `groups` | ✅ | `:233-240` → `:339-355` |
| （死变量）`ABOUT_EXTRA` | ❌ | `:213` 声明后从不使用 |

**场景卡数据映射**（`help_template.html:218-232`）：

```js
function normalizeScenes(scenes){
  return (scenes || []).map(function(s){
    return {
      id: s.id,
      name: s.title,
      chip: s.wake_word,
      types: (s.types && s.types.length ? s.types : []),
      dev: (s.status === '【待开发】'),
      prompt: s.prompt_template,
      params: (s.editable_fields || []).map(function(f){
        return { key: f.name, label: f.label, value: f.value || '', req: !!f.required, hint: f.hint || '' };
      })
    };
  });
}
```

→ 模板资产**用的是 `s.types`（复数）**（`:224`、`:285`），与 `scene_data.schema.json:70` 一致；单数 `type` 只出现在人读散文 `docs/help-template-contract.md:51`。

**类型徽章默认配色表**（`help_template.html:256-267`，10 项，未知名兜底 `查看`→蓝）：

```js
var TYPE_DEFAULT = {
  '采集':  {bg:'#e7f8ee', fg:'#1a7a3a'},
  '查看':  {bg:'#e8f2ff', fg:'#0a63ce'},
  '结果':  {bg:'#e8f2ff', fg:'#0a63ce'},
  '向导':  {bg:'#e2f7f5', fg:'#00897b'},
  '批量':  {bg:'#f3e9fb', fg:'#8e3fc9'},
  '校验':  {bg:'#e8f2ff', fg:'#0a63ce'},
  '选择':  {bg:'#e8f2ff', fg:'#0a63ce'},
  '过程':  {bg:'#e2f7f5', fg:'#00897b'},
  '回执':  {bg:'#e8f2ff', fg:'#0a63ce'},
  '录入':  {bg:'#e7f8ee', fg:'#1a7a3a'}
};
```

`status === '【待开发】'` → 追加 `.type-badge.t-dev`「待开发」徽章（`:284`），**复制按钮仍可点**（复制流程不判 `dev`）。

### 5.3 CSS 资产与 JS 交互

**CSS 资产**：模板自带 `<style>`（`:7-168`，无 id）＋ 注入的 `base.css`（`<!--SHARED-CSS-->`，`:200`）。模板 CSS 覆盖：stage/phone/screen 原型壳（`:12-19`）、hero（`:21-29`）、init-banner + init-steps（`:31-43`）、about-sec/about-row（`:45-57`）、contact-box（`:59-69`）、search-wrap/search-box/hitcount/search-empty（`:70-77`）、chip/type-badge/t-* 系列（`:78-85`）、copy-btn（`:86-88`）、mark（`:89`）、pages/page ViewPager（`:92-97`）、subgroup 折叠（`:98-105`）、grid/mini 场景卡（`:108-116`）、tab-bar/tab（`:119-130`）、sheet 弹层（`:133-157`）、≤500px 媒体查询（`:158-167`）。

**JS 交互清单**：

| 交互 | 实现 | 行号 |
|---|---|---|
| 复制（主通道） | 事件委托 `[data-c]` → `doCopy()`（`document.execCommand('copy')` + 隐藏 textarea） | `:533-548`、`:524-530` |
| 复制反馈 | `showToast()` → 全局 `toast('已复制', …)`（**来自 base.js**） | `:518-520`；`base.js:185` |
| 参数空值拦截 | `getMissing()` → `toastMsg()`「请先填写: …」 | `:323-325`、`:521-523`、`:539-544` |
| 参数实时预览 | `.pform` 的 `input` 事件重组 prompt | `:493-496`、`buildPrompt :311-322` |
| 复制后不关弹窗 | 注释「B3: 复制后不自动关弹窗」 | `:547` |
| 折叠 | 原生 `<details>`（`.subgroup[open]` 默认展开）+ 高度重算 | `:342`、`:605-608` |
| 搜索 | 跨 Tab 全量过滤 + 自动跳页 + `<mark>` 高亮 + 折叠组联动展开 + 命中计数 | `:550-602` |
| Tab 切换 | ViewPager `scrollTo` + `syncTab` + 点击项居中 | `:430-463` |
| Sheet | 点击卡片开层；遮罩/关闭按钮关层 | `:473-506`、`:509-515` |
| init_banner 关闭 | `#initClose` 隐藏 | `:395-399` |

**prompt 拼接规则**（`help_template.html:311-322`）：

```js
function buildPrompt(s, v){
  v = v || {};
  var lines = [s.prompt];
  var paramLines = [];
  (s.params || []).forEach(function(p){
    var val = (v[p.key] != null ? v[p.key] : '').trim();
    if (val) paramLines.push(p.label + ': ' + val);
  });
  if (paramLines.length) lines.push(''); /* 空行分隔 */
  lines = lines.concat(paramLines);
  return lines.join(〈换行符〉);
}
```

> 说明：`help_template.html:321` 原行末的实参是一个**转义换行序列**（源码写作反斜杠 + n 两个字面字符），本报告为满足「文档内禁字面转义序列」的书写要求，在代码块内用 `〈换行符〉` 占位标注，语义不变。
> 规则：`prompt_template` 原文 + 空行 + 每行 `label: value`。

**响应式断点**：`@media(min-width:501px)` 限宽 680px 居中 Tab 栏（`:121-123`）；`@media(max-width:500px)` 手机全屏（`.phone` 100vh、Sheet 贴底、stage 隐藏）（`:158-167`）。**注意与图表层 720px 不同**——两套断点体系（见 §8.2-C21）。

**空态**：`.search-empty#emptyC`「没有找到相关场景,换个词试试～」（`:77`、`:337`、`:599`）；**无**「0 个分组 / 0 个场景」的页面级空态（空数据会渲染出空 `.pages` + 空 Tab 栏）；`.hitcount#hitC` 显示「匹配 N 个场景」（`:597-598`）。

---

## 6. F1／F2／F3 三代差异

### 6.1 三代定位（一句话）

- **F1**（`卡路里_HELP_20260730_130429.html`，492 行）：自研模板 **2 层折叠**（分类 → 唤醒词，唤醒词内含变体折叠）；数据源旧 12 分类 / 81 唤醒词 / 112 prompt（`F1:323` 注入 JSON 的 `summary`）。
- **F2**（`卡路里_HELP_20260731_201530.html`，596 行）：自研渲染器 **4 层折叠**（分类 → 子功能 → 场景 → 详情）+ **搜索**；数据源 `merged(scene_data + _triggers.py)`，9 分类 / 80 场景（`F2:351` 注入 JSON 的 `meta`）。
- **F3**（`卡路里.html`，2,048 行）：**换架构**——`公共组件/assets/help_template.html` 参数化 + `base.js`/`base.css` 注入；10 分组 / 436 场景（`F3:195`），手机壳 + 底部 Tab 横滑 + Sheet 弹层。

### 6.2 F3 的独有能力（F1/F2 没有）

Tab 横滑 ViewPager、Sheet 弹层、`editable_fields` 参数表单 + 实时预览 + 空值拦截、`types` 多徽章（含自定义 `{text,bg,fg}`）、`status=【待开发】` 徽章、`init_banner`（含 steps）、关于 Tab（contact/version/recommendations）、全局搜索 + 命中计数 + 自动跳页 + 高亮、`types` 徽章（436 场景全量）。

### 6.3 F1／F2 独有能力（F3 没有）——Q11 回补对象

| # | 能力 | 证据（文件:行号） | 归代 |
|---|---|---|---|
| 1 | **逐场景 CLI 展示**（主 prompt 上方一行 CLI） | `F1:133`（CSS `.prompt-cli`）、`F1:452` | F1 |
| 2 | **变体示例**（`.variants-section` 容器 + 「变体 (N)」标题） | `F1:141`、`F1:454-455` | F1 |
| 3 | **变体块**（`.variant-block`：变体标签 + 变体 CLI + 变体 prompt + 独立复制按钮） | `F1:148,152,156-160`、`F1:459-467` | F1 |
| 4 | 变体计数（`.ww-count`「N变体」） | `F1:122`、`F1:448` | F1 |
| 5 | 唤醒词别名（`.ww-aliases`） | `F1:441-442,447` | F1 |
| 6 | 唤醒词描述（`.ww-desc`） | `F1:451` | F1 |
| 7 | **逐场景 CLI 展示**（`.cli`，来源 `data_source`） | `F2:427` | F2 |
| 8 | 用户意图行（`.intent` ← `user_intent`） | `F2:428` | F2 |
| 9 | `data_source` 数据源徽章（📦） | `F2:420` | F2 |
| 10 | `html_template` 模板路径徽章（🎨） | `F2:421` | F2 |
| 11 | `depends_on_external` 外部依赖标记（🔗，详情层 + 卡片层） | `F2:422`、`F2:434-436,443` | F2 |
| 12 | `data_fields` 数据字段清单（📋） | `F2:423-425` | F2 |
| 13 | `output_type` 输出类型徽章（`process/result/receipt`） | `F2:442` | F2 |
| 14 | 搜索命中计数「共 N 场景 / 匹配 M / N / 无匹配」 | `F2:582-591`、`F2:333` | F2 |
| 15 | 数据源标注位 `#dataSource` | `F2:334` | F2 |
| 16 | 页脚由 JS 数据填充（vs F1 硬编码页脚） | `F2:338` vs `F1:309` | F2 |
| 17 | 旧收尾口径「完成后给 1 句话总结,不需要过多文字解释。」 | `F1:323`、`F2:351` | F1+F2 |

**条数：17 条**（F1 独有 6 ＋ F2 独有 10 ＋ F1/F2 共有 1）。

F1 关键代码（逐字，`F1:440-467`）：

```js
function renderWordCard(t, i) {
  const aliases = (t.aliases || []).map(a =>
    `<span>${escapeHTML(a)}</span>`).join('');
  const variants = t.variants || [];
  const pm = t.main_prompt || {cli:'', text:''};
  return `<details class="word-card"><summary>` +
    `<span class="ww-name">${escapeHTML(t.wake_word)}</span>` +
    `${aliases ? `<span class="ww-aliases">${aliases}</span>` : ''}` +
    `<span class="ww-count">${variants.length ? variants.length + '变体' : ''}</span>` +
    `<button class="copy-btn copy-main" onclick="event.preventDefault(); event.stopPropagation(); copyMainPrompt(${i})">📋 复制</button>` +
    `</summary><div class="word-content">` +
    `${t.desc ? `<div class="ww-desc">${escapeHTML(t.desc)}</div>` : ''}` +
    `${pm.cli ? `<div class="prompt-cli">${escapeHTML(pm.cli)}</div>` : ''}` +
    `<div class="prompt-main">${escapeHTML(pm.text)}</div>` +
    (variants.length ? `<div class="variants-section"><div class="variants-header">变体 (${variants.length})</div>` +
      variants.map(renderVariant).join('') + `</div>` : '') +
    `</div></details>`;
}

function renderVariant(v) {
  return `<details class="variant-block">` +
    `<summary><span class="v-label">${escapeHTML(v.label)}</span></summary>` +
    `<div class="v-content">` +
    `${v.cli ? `<div class="prompt-cli">${escapeHTML(v.cli)}</div>` : ''}` +
    `<div class="prompt-main">${escapeHTML(v.prompt)}</div>` +
    `<button class="copy-btn" data-prompt="${escapeHTML(v.prompt)}">📋 复制此变体 prompt</button>` +
    `</div></details>`;
}
```

F2 关键代码（逐字，`F2:418-431`）：

```js
function renderSceneDetail(s) {
  const metaBits = [];
  if (s.data_source)     metaBits.push(`<span>📦 ${escapeHTML(s.data_source)}</span>`);
  if (s.html_template)   metaBits.push(`<span>🎨 ${escapeHTML(s.html_template)}</span>`);
  if (s.depends_on_external) metaBits.push('<span>🔗 依赖外部</span>');
  if (s.data_fields && s.data_fields.length) {
    metaBits.push(`<span>📋 ${escapeHTML(s.data_fields.join(', '))}</span>`);
  }
  const meta = metaBits.length ? `<div class="meta">${metaBits.join('')}</div>` : '';
  const cli = s.data_source ? `<div class="cli">${escapeHTML(s.data_source)}</div>` : '';
  const intent = s.user_intent ? `<div class="intent">${escapeHTML(s.user_intent)}</div>` : '';
  const prompt = s.prompt_template ? `<pre class="prompt-pre">${escapeHTML(s.prompt_template)}</pre>` : '';
  return `<div class="scene-detail">${intent}${cli}${prompt}${meta}</div>`;
}
```

F2 卡片层（逐字，`F2:433-448`）：

```js
function renderScene(s, i) {
  const extTag = s.depends_on_external
    ? '<span class="scene-ext" title="依赖外部技能/接口(P4 最后开发)">🔗</span>'
    : '';
  const empty = '';  // 让 flex gap 撑开
  return `<details class="scene-card" data-key="${escapeHTML(s.key || '')}" data-cat="${escapeHTML(s.category || '')}" data-sub="${escapeHTML(s.subfunction || '')}">` +
    `<summary>` +
      `<span class="scene-name">${escapeHTML(s.name || '')}</span>` +
      `<span class="scene-wake">${escapeHTML(s.wake_word || s.name || '')}</span>` +
      `<span class="scene-output ${escapeHTML(s.output_type || 'result')}">${escapeHTML(s.output_type || 'result')}</span>` +
      extTag +
      `<button class="copy-btn copy-main" data-prompt-index="${i}" data-wake="${escapeHTML(s.wake_word || s.name || '')}">📋 复制</button>` +
    `</summary>` +
    `<div class="scene-content">${renderSceneDetail(s)}</div>` +
    `</details>`;
}
```

### 6.4 F3 的能力缺口（量化）

对 F3（`卡路里.html`）做标记计数（只读正则统计）：

| 标记 | F1 | F2 | F3 |
|---|---|---|---|
| `prompt-cli` | 3 | 0 | **0** |
| `class="cli"` | 0 | 1 | **0** |
| `variants-section` | 2 | 0 | **0** |
| `data_source` | 0 | 84 | **0** |
| `user_intent` / `data_fields` / `html_template` / `depends_on_external` | 0 | 有 | **0** |
| `"types"` | 0 | 0 | **414** |
| `init_banner` | 0 | 0 | 1（模板声明位，数据未用） |
| `editable_fields` | 0 | 0 | 1（模板声明位，数据未用） |
| 「1 句话总结」 | 110 | 80 | **0** |
| 「三句话」 | 0 | 0 | **436** |

→ 结论：**F3 全量替换了收尾口径（436/436 用「三句话」）**，同时**彻底丢掉了逐场景 CLI 展示与变体示例**（0 处）。这与 Q11 的裁决（`base-paint-contract.md:836`「取 F3 并回补 F1／F2 的逐场景 CLI 展示与变体示例」）完全对应。

### 6.5 F1／F2 的其它结构性差异（供回补时取舍）

| 维度 | F1 | F2 | F3 |
|---|---|---|---|
| 折叠层数 | 2（分类 → 唤醒词） | 4（分类 → 子功能 → 场景 → 详情） | 2 级数据（Tab → 子功能）+ Sheet 弹层 |
| 搜索 | ❌（`F1:487` 明写「search / expandAll / collapseAll / copyAll 已删除(v2.4.10)」） | ✅ 带命中计数 | ✅ 带命中计数 |
| 页脚 | 硬编码（`F1:309`） | JS 填充（`F2:338`） | 无页脚（关于 Tab 承担） |
| 复制按钮位置 | summary 层 + 变体层 | summary 层 | 卡片层 + Sheet 层 |
| 复制实现 | `copyText(text, btn)`（`F1:475`） | 同族 | `document.execCommand` 降级（`help_template.html:524-530`） |
| 数据源 | `_triggers` 快照 | `merged(scene_data + _triggers.py)` | `_triggers.py` 唯一权威 → 契约 JSON |

---

## 7. scene-data 契约（旧版）

### 7.1 三处「旧契约」的权威关系与内部矛盾

| 载体 | 行数 | 顶层键 | 场景类型字段 | `additionalProperties` |
|---|---|---|---|---|
| `docs/scene-data-contract.md`（人读版） | 171 | 5（`skill_name/title/subtitle/meta_blocks/groups`） | `types`（`:78`） | — |
| `docs/scene_data.schema.json`（机读版） | 110 | 5（`required` 仅 3） | `types`（`:70-88`） | **顶层 `false`（`:8`）** |
| `assets/help_template.html`（运行时） | 611 | **9**（`:206-214`） | `types`（`:224,285`） | — |
| `docs/help-template-contract.md`（散文） | 105 | **9**（`:32-40`） | **`type` 单数（`:51`）** | — |

**矛盾 1（顶层键数量）**：模板消费 9 键，但旧机读 schema `additionalProperties:false`（`scene_data.schema.json:8`）只列 5 键 → 带 `init_banner`/`contact`/`version`/`recommendations` 的合法数据**会被旧 schema 拒绝**。新版已补齐（`base-paint-contract.md:816`）。

**矛盾 2（单复数）**：`types` 在 schema（`:70`）与模板（`:224`）一致；单数 `type` 只出现在散文 `docs/help-template-contract.md:51`。新版 AC-3 裁定取 `types`、不提供别名（`spec/help.ts:20`、`SCENE_TYPE_FIELD`）。

### 7.2 字段与校验规则（机读权威 + 运行时守卫）

**顶层**（`scene_data.schema.json:7-12`；`injector.py:127,138-140`）：`required = ['skill_name','title','groups']`；缺任一 → `validate_help_data` 返回 `(False, 'HELP 数据缺必填字段: …（scene-data-contract §1）')`。

**groups**（`scene_data.schema.json:27-59`；`injector.py:141-159`）：`groups[]` 必填 `id`/`label`/`subgroups`，`icon` 可选；`subgroups[]` 必填 `id`/`label`/`scenes`；三者均 `minItems:1`。

**scenes**（`scene_data.schema.json:62-108`；`injector.py:160-179`）：

| 字段 | 类型 | 必填 | 旧校验落点 |
|---|---|---|---|
| `id` | string minLength 1 | ✅ | `injector.py:163`；**唯一性** `injector.py:170-172` |
| `title` | string minLength 1 | ✅ | `injector.py:163` |
| `wake_word` | string minLength 1 | ✅ | `injector.py:163` |
| `types` | array（string 或 `{text,bg?,fg?}`） | 可选 | **旧校验器完全不校验**（`injector.py` 无 `types` 分支） |
| `status` | enum `["", "【待开发】"]` | ✅ | `injector.py:168-169` |
| `prompt_template` | string minLength 1 | ✅ | `injector.py:163` |
| `editable_fields` | array of `{name,label,value,hint?,required?}` | 可选 | `injector.py:173-179`（只校验 `name`/`label`） |

**`validate_help_data` 逐字（`injector.py:134-180`，节选关键判定）**：

```python
def validate_help_data(data):
    """scene-data 契约 v1 校验。返回 (ok, msg)。"""
    if not isinstance(data, dict):
        return False, 'HELP 数据必须是 JSON 对象'
    missing = [k for k in _HELP_REQUIRED_TOP if not data.get(k)]
    if missing:
        return False, f'HELP 数据缺必填字段: {", ".join(missing)}（scene-data-contract §1）'
    groups = data.get('groups')
    if not isinstance(groups, list) or not groups:
        return False, 'groups 必须是非空数组'
    seen = set()
    for gi, g in enumerate(groups):
        if not isinstance(g, dict) or not g.get('id') or not g.get('label'):
            return False, f'groups[{gi}] 缺 id/label'
        if g['id'] in seen:
            return False, f'分组 id 重复: {g["id"]}'
        seen.add(g['id'])
        ...
                # status 允许空串（'' = 可用），单独校验二态
                if s.get('status') not in ('', '【待开发】'):
                    return False, f'场景 {s.get("id")} status 非法: {s.get("status")}（只允许 "" / 【待开发】）'
                if s['id'] in seen:
                    return False, f'场景 id 重复: {s["id"]}'
                seen.add(s['id'])
```

**取证发现（新版必须处置）**：
- `seen` 是**同一个集合**同时装 group id 与 scene id（`injector.py:144,148-150,170-172`）→ group 与 scene 同名会被误判 `duplicate-id`。新版「id 全局唯一」（`base-paint-contract.md:820`）需明确作用域。
- 旧校验**没有** `types` 校验 → 新 `types-invalid` 错误码是**新增能力**（`spec/help.ts:266`）。
- 旧校验用 `(ok, msg)` 返回，**无错误码**；新版要求 `HelpSchemaError{code, path, message}`（`spec/help.ts:271-276`）＋ 4 码 `['schema-invalid','duplicate-id','status-invalid','types-invalid']`（`:262-267`）。
- 旧校验**不校验** `icon`、`subgroups[].id` 的存在性（只校验 `label`，`injector.py:155`），但 schema 要求 `subgroups[].id` 必填（`scene_data.schema.json:44`）→ **md/schema/校验器三者口径不一致**。

**文件名 sanitize**（`injector.py:129-131,183-191`）：`help_<skill_name>.html`，只允许 `[a-zA-Z0-9_\-\u4e00-\u9fa5]+.html`；`help-template-contract.md:64-68` 另规定 `--output` 显式路径同样 sanitize 且拒绝 `..` 穿越。

### 7.3 `types` 双写法与默认配色

`scene_data-contract.md:78`：元素 = 字符串（默认配色）或 `{text, bg?, fg?}`。运行期实现 `help_template.html:268-281`；默认配色表 `:256-267`（10 项，未知名 → `查看` 蓝）。多标签建议 1~2 个最稳，3 个以上建议折叠进 Sheet（`scene-data-contract.md:97`）。

---

## 8. 新版对比结论

### 8.1 可 1:1 移植（语义等价，逐值可对标）

| 旧能力 | 旧证据 | 新落点 | 移植说明 |
|---|---|---|---|
| 10 色调色板 | `charts.js:44` | `CHART_PALETTE`（`charts.ts:234-245`） | 逐值一致 |
| 断点 4 值 | `charts.js:60,124,128,129` | `CHART_BREAKPOINTS`（`charts.ts:226-231`） | 3 值一致，`stackedGapPx` 命名待修 |
| 结构违规抛错 / 空态联动 | `charts.js:31-41,25-28` | `CHART_STRUCTURE_RULE='throw'` / `CHART_EMPTY_RULE='emptyState'` | 语义一致 |
| `pct` 非数抛错 + 超界收敛 0~100 | `charts.js:342-343,823-824` | `pct-invalid`（`charts.ts:247`、`base-paint-contract.md:788`） | 逐字对齐 |
| null 断线 + `connectNulls` | `charts.js:153-168` | `ChartItem.value: number \| null`（`charts.ts:15`）＋ `connectNulls`（`:98`） | 语义一致 |
| `smooth` Catmull-Rom 控制点公式 | `charts.js:178-199` | `smooth?`（`charts.ts:90`） | 公式可逐字移植（纯数学） |
| 6% 域 padding | `charts.js:145,432,858-859` | 选项级语义（不冻结） | 数学可移植 |
| `yTicks` 收敛 2-6 / scatter 缺省 4 | `charts.js:498,885` | `yTicks?: number \| false`（`charts.ts:97`） | 数值可移植 |
| 柱高最小 2% / combo 钳制 3~80% | `charts.js:379,752-753` | 选项级语义 | 数值可移植 |
| donut 半径自适应公式 | `charts.js:697-700` | `ringWidth?`（`charts.ts:120`） | 公式可移植 |
| 回归线最小二乘 + 缺省色 | `charts.js:872-882` | `regression?` / `regressionColor?`（`charts.ts:148-149`） | 公式与默认值可移植 |
| 标签碰撞避让 26 单位 / 贴边 18%-82% clamp | `charts.js:570,648` | 选项级语义 | 数值可移植 |
| `stackMode` percent/absolute | `charts.js:270,295` | `stackMode?: 'percent' \| 'absolute'`（`charts.ts:114`） | 一致 |
| `status` 二态 | `injector.py:168-169` | `SCENE_STATUS`（`help.ts:15`） | 逐值一致 |
| `types` 字段名 + 双写法 + 默认配色表 | `scene_data.schema.json:70-88`、`help_template.html:256-281` | `SCENE_TYPE_FIELD='types'`（`help.ts:20`）＋ `SceneTypeBadge`（`:22-26`） | 一致（AC-3） |
| `editable_fields` 形状 | `scene_data.schema.json:91-106` | `SceneEditableField`（`help.ts:28-34`） | 一致 |
| HELP 壳区块与交互（Tab/折叠/搜索/Sheet/参数预览/关于页） | `help_template.html:329-608` | §3.5.3 形态段（`base-paint-contract.md:835`） | 可复刻，类名换 `ilife-` |
| 复制后不关弹窗 / 待开发徽章仍可复制 | `help_template.html:547`、`:284` | §3.5.3 | 可复刻 |

### 8.2 因新架构约束**必须改写**（含「契约装不下旧能力」冲突点）

**A. 硬约束导致的改写（新架构红线）**

| # | 旧做法 | 旧证据 | 新约束 | 必须怎么做 |
|---|---|---|---|---|
| A1 | `charts.<k>(el, …)` 直接 `el.innerHTML=…` | `charts.js:354,389` 等 | `ChartsApi` 去 `el`，返回 `{kind,html,empty,points}`（`charts.ts:196-213`） | 全部改纯函数返回字符串 |
| A2 | 类名 `hm-c-*`（223 处） | `charts.js:50-135` 及全部 HTML | 类名前缀 `ilife-`（`base-paint-contract.md:847`） | 全量重命名 |
| A3 | 样式 id `hm-charts-style` | `charts.js:47` | `CHARTS_STYLE_ID='ilife-charts'`（`charts.ts:215`） | 改 id |
| A4 | `window.charts` / `window.__chartsLoaded` | `charts.js:12,335` | 禁 `window`/`globalThis` 赋值（`charts.ts:270`） | 改 ES 模块导出 |
| A5 | 读 `window.esc` / `window.emptyState` | `charts.js:15,26` | 自包含 + 禁 window 赋值 | 本地实现（`esc` 本地兜底可留，`emptyState` 需自带渲染） |
| A6 | 读全局 `toast()`（HELP 壳） | `help_template.html:519,522`；`base.js:185` | 复制走 `copyText(text, ports, opts?)` 单实现（`base-paint-contract.md:837`） | 壳改调冻结的复制编排 |
| A7 | 内联 `onclick` / `mousemove` 交互 | `charts.js:329,391,684,796,928`、`help_template.html:348,449` | `ChartCommonOptions.actionId`（`charts.ts:83-84`）＋「HTML 零内联脚本」（`:803`） | 交互改 actionId + 页面侧绑定 |
| A8 | 动画依赖 `getTotalLength` / rAF 写 style | `charts.js:667,837`、16 处 rAF | 纯字符串产出 | 动画下沉到 `buildChartsHelpersJs` 的页面侧脚本或纯 CSS |
| A9 | combo 用 `getBoundingClientRect()` 校准 | `charts.js:779-795` | 纯字符串、无 DOM 测量 | 改纯几何计算（或改单 SVG 坐标系） |
| A10 | 中文 `Error` 文案、无错误码 | §2.9 全表 | `ChartError{code}` 三码（`charts.ts:247`） | 文案映射到码 |
| A11 | 图表与 HELP 壳从未同页（壳无 charts 标记） | `help_template.html` 0 处 `<!--CHARTS-HELPERS-->`；`injector.py:30` | 同页为新要求 | 新壳需带标记 + `buildChartsHelpersJs` 产出 |

**B. 「新版契约装不下旧版能力」冲突点（25 条）**

| # | 冲突 | 旧证据 | 新契约 | 影响 |
|---|---|---|---|---|
| C1 | `init_banner.steps` 元素形状 | `help_template.html:334` 读 `st.title`/`st.desc` | `readonly string[]`（`help.ts:71`） | **类型装不下**；旧数据在新类型下无法表达 |
| C2 | `recommendations` 字段名 | `help_template.html:380` 读 `r.name`/`r.desc`/`r.wake` | `{name, reason?, wake_word?}`（`help.ts:84-88`） | **字段名不匹配**（`desc`→`reason`、`wake`→`wake_word`） |
| C3 | `contact.copy_all` 语义 | `help_template.html:368` 当布尔 | `copy_all?: string`（`help.ts:81`） | 语义漂移（布尔 vs 文案） |
| C4 | 旧 schema 顶层 `additionalProperties:false` 只列 5 键 | `scene_data.schema.json:8-59` | 新 schema 补齐 9 键（`help.ts:104-233`） | 旧数据需重新校验；已由新版修复 |
| C5 | `subtitle` / `meta_blocks` 模板声明但不渲染 | `help_template.html:208-209`（全文无二次使用） | §3.5.3 要求标题区渲染 `subtitle`（`base-paint-contract.md:835`）；`meta_blocks` 原样透传不渲染（`:821`） | `subtitle` 需**新写**渲染；`meta_blocks` 保持不渲染 |
| C6 | Q11「逐场景 CLI 展示」无承载字段 | `F1:452`、`F2:427` | `Scene`（`help.ts:36-44`）无 `cli`/`data_source`；仅 `base-paint-contract.md:836` 一句「来自 `Scene.id`」约定 | **能力装不下**：只能靠 id 拼 `skill.<combo>.<key>`，与 F1/F2 的「真实 CLI 字符串」不等价 |
| C7 | Q11「变体示例」无承载字段 | `F1:454-467` | 无 `variants` 字段；被降级为 `types` 徽章（`base-paint-contract.md:836`） | **能力装不下**：F1 的「主 prompt + N 变体各自 prompt/CLI/复制」无法表达 |
| C8 | 复制目标从 1 个变 3 个 | `help_template.html:348,533-548`（仅 prompt） | `HELP_COPY_TARGETS=['prompt','wakeWord','params']`（`help.ts:238`） | `wakeWord`/`params` 复制**无旧基线**（F1/F2/F3 均无） |
| C9 | `ChartOutput.points` / pct 型语义 | 无对应物 | `points` 恒 1、`pct=0` 时 `empty=false`（`base-paint-contract.md:796`） | **新造语义**，需自行定义 |
| C10 | `CHART_COORD_RULE='viewBox-only'` | 旧为「SVG viewBox + HTML 百分比覆盖层」双层（`charts.js:560,572,870`） | 纯 viewBox（`charts.ts:224`） | 点/标签/刻度/标注必须改 SVG 元素 |
| C11 | 纯字符串 + 零内联脚本 | `charts.js` 依赖 `getBoundingClientRect`(9)、rAF(16)、`createElement`(5)、`getTotalLength` | `ChartOutput.html` 纯 CSS+SVG 字符串（`charts.ts:195-201`、`:803`） | 动画/悬浮/校准**无法逐字移植** |
| C12 | 挂载方式 | `window.charts=`（`charts.js:335`） | 禁 window 赋值（`charts.ts:270`） | 模块导出 |
| C13 | 类名/样式 id 前缀 | `hm-c-*` / `hm-charts-style` | `ilife-` / `ilife-charts` | 全量重命名 |
| C14 | `stackedGapPx: 3` 命名 | `charts.js:60` 的 `gap:3px` 属 **grouped**；stacked 段无 gap（`:59`） | `CHART_BREAKPOINTS.stackedGapPx`（`charts.ts:230`） | 命名误导，建议改名或双列 |
| C15 | line 的 `dotSize` / `dotStyle` | `dotSize` 在 line 内**声明未实现**（`charts.js:401`，仅 scatter 用 `:864`）；`dotStyle` 旧版**不存在** | `LineChartOptions.dotSize?`/`dotStyle?`（`charts.ts:93-94`） | 新契约有字段但旧无行为基线 → 需自定 |
| C16 | line 的 `width` | 旧 line 只有 `height`（`charts.js:403`）；`width` 仅 sparkline 用（`:809`） | `ChartCommonOptions.width?`（`charts.ts:69`） | 新字段无旧基线 |
| C17 | `donut.centerValue` 类型 | 旧为数值并过 `_fmt`（`charts.js:708`） | `centerValue?: string`（`charts.ts:124`） | 类型收窄，需明确是否先格式化 |
| C18 | `donut.legend:'bottom'` | 旧只判 `!=='none'`（`charts.js:710`），靠 720px 媒体查询变列（`:130`） | `legend?: 'right' \| 'bottom' \| 'none'`（`charts.ts:121`） | `'bottom'` 旧无独立实现 |
| C19 | `combo.tooltip` | 旧为**死参数**（`charts.js:738` 声明无实现） | `ComboChartOptions` 继承 `tooltip?`（`charts.ts:76`） | 新票须决定「实现 or 删除」 |
| C20 | 图表与 HELP 壳同页 | 旧壳无 `<!--CHARTS-HELPERS-->`（0 处）；`injector.py:9,118-120` | 同页为新要求 | 无旧基线，属新设计 |
| C21 | 断点体系 | charts 720px（`charts.js:124`）vs 壳 500/501px（`help_template.html:121,158`） | 只冻结 `CHART_BREAKPOINTS`（`charts.ts:226`） | 壳的断点未冻结，需自定 |
| C22 | 旧壳不是自包含资产 | 依赖全局 `toast()`（`help_template.html:519,522`） | 自包含/唯一产出者规则（`charts.ts:270`、`base-paint-contract.md:811`） | 壳必须重写为走冻结编排 |
| C23 | 旧校验不校验 `types` | `injector.py` 无 types 分支 | `types-invalid`（`help.ts:266`） | 新增校验面 |
| C24 | `duplicate-id` 作用域 | `injector.py:144` 单集合混装 group/scene id | 「id 全局唯一」（`base-paint-contract.md:820`） | 需明确作用域，否则跨类型同名误判 |
| C25 | 单数笔误的引证行号 | 真笔误在 `docs/help-template-contract.md:51`；`help_template.html:52` 是 CSS | `base-paint-contract.md:815`、`spec/help.ts:6` 指错行 | 建议更正引证（裁定不变） |

### 8.3 明确**不复刻**

| # | 对象 | 证据 | 理由 |
|---|---|---|---|
| N1 | 死代码 `_linePoints` / `_polyPath` | `charts.js:141,153`（各仅 1 处出现） | 从未被调用 |
| N2 | 死参数 `compact` / `valuePosition` / line 的 `dotSize` / `emptyText` / bar 的 `grid` / combo 的 `tooltip` / sparkline 的 `color` | `charts.js:358,359,401,404,359,738,805+814` | 声明未实现或声明后被覆盖 |
| N3 | 死 CSS 变量 `--c-th`、死局部变量 `th` | `charts.js:120`、`:345` | 无写入方 |
| N4 | 死变量 `ABOUT_EXTRA`、`META_BLOCKS`（不渲染） | `help_template.html:213,209` | 无消费方 |
| N5 | 「技能自营 canvas」白名单例外 | `component-contract.md:241` | 新版 B4 明确**不移植**（`base-paint-contract.md:802`） |
| N6 | 原型演示外壳 `.stage/.stage-title/.stage-sub/.phone/.notch` | `help_template.html:12-18,172-176` | 原型舞台，非产品壳 |
| N7 | `document.execCommand('copy')` 降级通道 | `help_template.html:524-530` | 新版复制走冻结 `copyText` 双通道（`base-paint-contract.md:837`） |
| N8 | 旧版硬编码页脚 / 硬编码 stage 文案 | `F1:309`、`help_template.html:173-174` | 参数化壳不应含技能专属文案 |
| N9 | sparkline 单点 NaN 行为 | `charts.js:810` | 缺陷，不复刻；新实现需给 `Math.max(1,…)` 保护 |
| N10 | 旧 `combo.y2` 双轴 | `charts.js:738,745-746` | 新 `ComboChartInput` 无该字段；契约登记「不冻结也不排除」（`base-paint-contract.md:798`），**由 #78 决定** |

---

## 9. 复刻清单（旧版能力 → #78 施工条目）

### 9.1 复刻（语义等价，按旧行为逐字对齐）

| # | 旧版能力 | 证据 | #78 施工条目 | 理由 |
|---|---|---|---|---|
| R1 | 8 接口数据形状与 `_validate` 四类抛错 | `charts.js:31-41` | `charts.bar/line/donut/progress/combo/sparkline/gauge/scatter` + `structure-invalid` | 旧契约 §6.5「违规直接抛错」是硬行为，接口级已冻结 |
| R2 | 空数组 → `emptyState`（donut 合计 0 亦空态） | `charts.js:25-28,357,695,736,804,852` | `CHART_EMPTY_RULE='emptyState'` + `ChartOutput.empty` | 合法场景不抛错，语义一致 |
| R3 | 10 色调色板 | `charts.js:44` | `CHART_PALETTE` | 逐值一致，已冻结 |
| R4 | 4 个断点数值 | `charts.js:60,124,128,129` | `CHART_BREAKPOINTS` | 数值一致（`stackedGapPx` 命名待修，见 C14） |
| R5 | line 全参数语义（null 断线、connectNulls、smooth、step、area、band、fillBetween、markLine 横竖、markPoint、yTicks、highlightLast、ownScale、anomaly、highlightPoints、showValues 避让） | `charts.js:395-685` | `LineChartOptions` 全字段实现 | 选项级语义虽「不冻结也不排除」，但票面要求「按 v1.30 签名逐条对照」，故按旧行为实现 |
| R6 | bar 单柱/stacked/grouped 三态 + 段校验 | `charts.js:247-333,354-393` | `BarChartOptions.stacked/grouped/segNames/stackMode` | 旧版「单一真相源 `values`」设计可直接移植 |
| R7 | donut 半径自适应 + 中心两行 + 图例 | `charts.js:689-726` | `DonutChartOptions` | #317 修复公式可移植 |
| R8 | progress / gauge 的 `pct` 语义（非数抛错、超界收敛） | `charts.js:342-343,823-824` | `ProgressChartInput` / `GaugeChartInput` + `pct-invalid` | 契约逐字要求 |
| R9 | combo 共享 Y 轴（线点=柱顶）+ 高度钳制 | `charts.js:742-753` | `ComboChartInput` | 坐标语义是 combo 的核心 |
| R10 | sparkline 涨绿跌红 + 末值 | `charts.js:813-816` | `SparklineChartOptions.showValue` | 语义简单，可直译 |
| R11 | scatter 回归线 + 默认 4 条 Y 刻度 + X 标签三态 | `charts.js:872-897` | `ScatterChartOptions` | 契约 §6.5 已登记 |
| R12 | scene-data 字段与 `status` 二态、`editable_fields` 形状 | `scene_data.schema.json:62-108`、`injector.py:160-179` | `SceneData`/`Scene`/`SceneEditableField`/`SCENE_STATUS` | 逐字段一致，已冻结 |
| R13 | `types` 双写法 + 10 项默认配色表 + 未知名兜底 | `help_template.html:256-281` | `SceneTypeBadge` + 渲染期配色表 | AC-3 裁定取 `types`，配色表可逐值移植 |
| R14 | HELP 壳区块与交互（Tab/ViewPager、子功能折叠、2 列卡片、搜索+高亮+计数、Sheet、参数实时预览、复制不关弹窗、关于页、init_banner、待开发徽章） | `help_template.html:329-608` | `renderHelpShell` 产物结构 | B6 形态要求「HTML 速查台」 |
| R15 | prompt 拼接规则（原文 + 空行 + `label: value`）与空值拦截 | `help_template.html:311-325` | 壳的 `prompt_template` + `editable_fields` 渲染 | 与复制按钮契约 v2 一致 |

### 9.2 改写（能力保留，实现方式必须变）

| # | 旧版能力 | 证据 | #78 施工条目 | 理由 |
|---|---|---|---|---|
| W1 | 8 接口 `el` 直写 DOM | `charts.js:354` 等 | 去 `el`，返回 `{kind,html,empty,points}` | A1：冻结签名 |
| W2 | `hm-c-*` / `hm-charts-style` | `charts.js:50-135,47` | 全量 `ilife-*` / `ilife-charts` | A2/A3 |
| W3 | `window.charts` + `window.__chartsLoaded` + `window.esc`/`window.emptyState` | `charts.js:12,15,26,335` | ES 模块导出 + 本地 `esc`/空态渲染 | A4/A5 |
| W4 | HTML 百分比覆盖层（点/值/刻度/标注） | `charts.js:560,572,583,604,618,645,649,870` | 改为 SVG 元素（`circle`/`text`） | C10：`viewBox-only` |
| W5 | 内联 `onclick` / `mousemove` / `touchstart` | `charts.js:329,391,684,796,928` | `actionId` + 页面侧绑定（`buildChartsHelpersJs`） | A7/C11 |
| W6 | rAF 柱高动画 / `getTotalLength` 描边动画 / 点淡入 | `charts.js:390,664-681,835-838,900-907` | 下沉到 helpers JS 或纯 CSS 过渡 | A8/C11 |
| W7 | combo `getBoundingClientRect()` 校准 | `charts.js:779-795` | 纯几何计算或单坐标系重排 | A9 |
| W8 | 中文 `Error` 文案 | §2.9 全表 | `ChartError{code}` 三码映射 | A10 |
| W9 | HELP 壳全局 `toast()` / `execCommand` 复制 | `help_template.html:519-530` | 走冻结 `copyText` 单实现 | A6/N7 |
| W10 | F1/F2 的逐场景 CLI 展示 | `F1:452,463`、`F2:427` | 需先解决 C6（无承载字段）：建议 `Scene.id` 约定 + 技能侧提供 CLI 文本，或新增展示字段（归 #106） | Q11 要求回补，但契约无字段 |
| W11 | F1 的变体示例 | `F1:454-467` | 需先解决 C7：变体降级为 `types` 徽章变体；若要保留「多 prompt 变体」须新增字段 | Q11 要求回补，但契约无字段 |
| W12 | `init_banner.steps` 对象数组 | `help_template.html:334` | 修 `help.ts:71` 为 `{title, desc?}[]` 或补适配 | C1：类型装不下 |
| W13 | `recommendations` 的 `desc`/`wake` | `help_template.html:380` | 统一到 `reason`/`wake_word` 或补别名 | C2 |
| W14 | `subtitle` 渲染 | `help_template.html:208` 声明未用 | 壳标题区补渲染 | C5：新契约要求 |
| W15 | 断点两套（720 vs 500/501） | `charts.js:124`、`help_template.html:121,158` | 图表用 `CHART_BREAKPOINTS`；壳断点自定并登记 | C21 |

### 9.3 不复刻

| # | 对象 | 证据 | 理由 |
|---|---|---|---|
| X1 | 死代码 `_linePoints`/`_polyPath` | `charts.js:141,153` | 无调用 |
| X2 | 死参数 `compact`/`valuePosition`/`emptyText`/line `dotSize`/bar `grid`/combo `tooltip`/sparkline `color` | `charts.js:358,359,404,401,359,738,805+814` | 声明未实现（新契约若保留字段须自定行为） |
| X3 | 死 CSS 变量 `--c-th` / 死局部 `th` | `charts.js:120,345` | 无写入方 |
| X4 | 死变量 `ABOUT_EXTRA`、不渲染的 `META_BLOCKS` | `help_template.html:213,209` | 无消费方（`meta_blocks` 新版仍为「透传不渲染」） |
| X5 | 技能自营 canvas 白名单例外 | `component-contract.md:241` | B4 明确不移植（`base-paint-contract.md:802`） |
| X6 | 原型舞台外壳 `.stage/.phone/.notch` | `help_template.html:12-18,172-176` | 演示壳 |
| X7 | sparkline 单点 NaN | `charts.js:810` | 缺陷 |
| X8 | F1/F2 的自研渲染架构（`window.__DATA__` + 手写 `render()`） | `F1:323,325-490`、`F2:351,353-594` | 已由 Base 参数化壳取代（取 F3 架构） |
| X9 | F1/F2 的旧收尾口径「1 句话总结」 | `F1:323`、`F2:351` | F3 已全量改为「不超过三句话」（436/436），新口径以 F3 为准 |
| X10 | `combo.y2` 双轴 | `charts.js:738,745-746` | 新签名无该字段；契约登记「不冻结也不排除」，由 #78 决定（**本报告建议：不移植，先登记**） |

---

## 10. 附：取证方法与自查

- **读法**：`read` 工具分块全量读取 `charts.js`（933 行 / 4 段）、`help_template.html`（611 行 / 3 段）、两份契约 md、`scene_data.schema.json`、`spec/charts.ts`、`spec/help.ts`；F1/F2 定点读取关键区段并全量正则计数；F3 用 `grep` 做零命中验证。
- **行号口径**：全部行号来自 `read` 工具输出的行号（与文件真实行号一致）。注意 `Get-Content | Measure-Object -Line` 在无结尾换行时会少计，故本报告**不采用**该口径。
- **计数口径**：`[System.IO.File]::ReadAllText(path, UTF8)` + `[regex]::Matches` 精确计数（只读）。
- **禁读目录**：`卡路里\.个人笔记不允许参考\` 全程未读取/未列举/未 grep。
- **写操作**：仅本文件。未写 `D:\2Study` 任何文件；未执行 git 写命令；未运行构建。
- **交叉校验**：本仓既存 `docs/research/t71-help-dissect.md`、`docs/research/t92-old-v130-signatures.md` 的结论与本次一手取证一致（F1/F2/F3 定位、CLI 展示缺失、`types` 复数）。**唯一需更正**的是新版契约把单数笔误归到 `help_template.html:52`（实为 CSS 行），真笔误在 `docs/help-template-contract.md:51`。
