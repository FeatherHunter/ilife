/** 基础信息（场景 07）· **档案变更单**渲染件（2026-09-24 用户敲定的最终样子）。
 *
 * 与旧版「档案预检」的差别（逐条对应审查结论）：
 *  · **一词一页**：只渲染本词要写的字段（旧版三套字段面同页，其中「设置档案 4 项」是「改档案 5 项」的子集）；
 *  · **值即入口**：值位走公共层组件 `renderEditableValue`（随页 `editableValue: true` 挂样式与运行时），
 *    点值就地换编辑器、进出编辑不变形（旧版是"能改但没用"的死控件）；
 *  · **后果可见**：事实条摘要（变更 N 项 ｜ 影响 每日消耗 a → b 卡/天）＋ 每行影响徽章（旧版埋在折叠表里）；
 *  · **不印中间产物**：提示词模板整段撤掉，页脚只给**一句短指令**（签发并写入＝把这句话交给 AI）；
 *  · **与原型逐处对齐**：单号行（`PF-MMDD-HHMM · 来源 · 原话 · 点值即可改`）／摘要带写全
 *    （`变更 N 项` ＋ `每日消耗 a → b 卡/天（±d，±x%）`）／脚注那句「命令与日志在回执里，这一页不摆」；
 *    卡片**下面**多一行 `复制数据／复制日志`（`copyArea` 原样，唯一比原型多的一行，用户红框指定）。
 *
 * 页内重算（改值 → 摘要／影响／指令／状态徽章跟着变）由本件产出的页内脚本承担（照包内先例
 * `workout/planEditorRuntime.ts` 那种页内运行时）：技能口径不进公共层。
 */
import { COPY_ACTION_IDS, renderActionBar, renderFactStrip } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderEditableValue } from 'base-paint/blocks';
import type { EditableValueOption } from 'base-paint/blocks';
import { ACTIVITY_LEVELS } from '../kcal.js';
import { ACTIVITY_LEVEL_LABELS, TDEE_ACTIVITY_FACTORS } from '../analysis/utils.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { nowStamp } from '../render/receipt.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { activityLabel, genderLabel } from './labels.js';
import { PROFILE_SOURCE } from './view.js';
import type { ProfileSettingView } from './setup.js';

/** 页脚「还原」那颗的 actionId（页内脚本按它绑定；不带载荷、初始禁用）。 */
export const SHEET_RESET_ACTION = 'calorie-profile-sheet-reset';
const WIZARD_KEY = 'calorie.view.profile-wizard';
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·档案变更单';

/** 三条写入词各自的页名（一词一页：页名跟着词走，旧版恒叫「档案预检」）。 */
const SHEET_TITLE: Record<string, string> = {
  设置档案: '档案设置单', 设活动量: '活动量变更单', 改档案: '档案变更单',
};
const CHANGE_KEYS: readonly string[] = ['age', 'gender', 'heightCm', 'activityLevel', 'note'];
const RAW_OF: Record<string, (p: { age: number | null; gender: string | null; height_cm: number | null; activity_level: string | null; note: string | null }) => string> = {
  heightCm: (p) => (p.height_cm === null ? '' : String(p.height_cm)),
  age: (p) => (p.age === null ? '' : String(p.age)),
  gender: (p) => p.gender ?? '',
  activityLevel: (p) => p.activity_level ?? '',
  note: (p) => p.note ?? '',
};

const SET_FIELDS = [{ camel: 'heightCm', label: '身高（cm）' }, { camel: 'age', label: '年龄' }, { camel: 'gender', label: '性别（男/女）' }, { camel: 'activityLevel', label: '活动量（久坐/轻度/中度/活跃/高度活跃）' }];
const UPDATE_FIELDS = [...SET_FIELDS, { camel: 'note', label: '备注' }];
function fieldsFor(w: string | null): readonly { camel: string; label: string }[] {
  return w === '设置档案' ? SET_FIELDS : (w === '设活动量' ? [SET_FIELDS[3] as { camel: string; label: string }] : UPDATE_FIELDS);
}

/** 单号：`PF-MMDD-HHMM`（取 `nowStamp()` 的本地时间，与原型同形状）。看不懂时间戳就退回纯数字尾巴，不编单号。 */
function sheetNo(at: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(at);
  if (m === null) return 'PF-' + at.replace(/[^0-9]/g, '').slice(0, 8);
  return 'PF-' + m[2] + m[3] + '-' + m[4] + m[5];
}

/** 摘要带「影响」那一格：`每日消耗 a → b 卡/天（±d，±x%）`（原型口径；无变化写「不变」）。 */
function tdeeText(now: number | null, next: number | null): string {
  if (now === null || next === null) return '按活动量算';
  const d = next - now;
  if (d === 0) return '每日消耗 ' + now + ' → ' + next + ' 卡/天（不变）';
  const signed = (n: number): string => (n > 0 ? '+' : '') + n;
  const pct = Math.round((d / now) * 1000) / 10;
  return '每日消耗 ' + now + ' → ' + next + ' 卡/天（' + signed(d) + '，' + signed(pct) + '%）';
}

interface SheetRow {
  key: string; label: string; unit: string; kind: 'text' | 'number' | 'select';
  options?: readonly EditableValueOption[];
  before: string; beforeRaw: string; after: string; afterRaw: string; note: string;
}

/** 字段 → 行事实（可见面写中文；活动量那行的影响由库内系数表现算，不编数）。 */
function sheetRows(v: ProfileSettingView): SheetRow[] {
  const p = v.before;
  const pick = (k: string): string => v.draft.find((d) => d.camel === k)?.value ?? '';
  return fieldsFor(v.wakeWord).map((f): SheetRow => {
    const beforeRaw = p === null ? '' : (RAW_OF[f.camel]?.(p) ?? '');
    const afterRaw = pick(f.camel) || beforeRaw;
    const row: SheetRow = {
      key: f.camel, label: f.label.replace(/（.*）$/, ''), unit: '', kind: 'text',
      beforeRaw, before: beforeRaw === '' ? '未设置' : beforeRaw,
      afterRaw, after: afterRaw === '' ? '未设置' : afterRaw, note: '',
    };
    if (f.camel === 'heightCm') { row.unit = 'cm'; row.kind = 'number'; }
    if (f.camel === 'age') { row.unit = '岁'; row.kind = 'number'; }
    if (f.camel === 'gender') {
      row.kind = 'select';
      row.options = [{ value: 'male', label: '男' }, { value: 'female', label: '女' }];
      row.before = genderLabel(beforeRaw); row.after = genderLabel(afterRaw);
      row.note = beforeRaw === afterRaw ? '不变' : '改性别';
    }
    if (f.camel === 'activityLevel') {
      row.kind = 'select';
      row.options = ACTIVITY_LEVELS.map((lv) => ({ value: lv, label: ACTIVITY_LEVEL_LABELS[lv] as string }));
      row.before = activityLabel(beforeRaw); row.after = activityLabel(afterRaw);
      row.note = beforeRaw === afterRaw ? '不变' : '影响每日消耗';
    }
    if (f.camel === 'note') row.note = '仅存档';
    return row;
  });
}

const SHEET_CSS = `<style>
.cs{border:1px solid var(--line);border-radius:6px;background:var(--card);padding:22px 24px 18px;font-variant-numeric:tabular-nums}
.cs-head{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--fg);padding-bottom:10px}
.cs-title{margin:0;font-size:20px;font-weight:700;letter-spacing:.03em}
.cs-badge{margin-left:auto;padding:3px 10px;border-radius:3px;border:1px solid var(--line);color:var(--fg3);font-size:11px;font-weight:600;letter-spacing:.06em}
/* 琥珀取原型实值（本包不定义第二套色板：要定色就写值，别引用不存在的变量名——「--orange」在本页曾是死引用）。 */
.cs-badge-dirty{border-color:#b26500;color:#b26500}
.cs-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;margin:9px 0 14px;font-size:12px;color:var(--fg3)}
.cs-meta .cs-meta-hint{color:var(--fg2)}
/* 重复的页题不印：文档壳那一行标题（与卡片抬头同名）在本页整行收掉——公共层要求 title 非空，
   所以是"传值但不显示"，不是删值。 */
.ilife-block-page-shell-title{display:none}
.cs-sum{display:flex;flex-wrap:wrap;gap:6px 22px}
.cs-diff{width:100%;border-collapse:collapse;margin:16px 0 8px;font-size:14px;table-layout:fixed}
.cs-diff th{text-align:left;font-size:11px;letter-spacing:.08em;color:var(--fg3);font-weight:600;padding:6px 10px;border-bottom:1px solid var(--line)}
.cs-diff td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}
.cs-diff td:nth-child(1){color:var(--fg2)}
.cs-diff td:nth-child(4){text-align:right}
.cs-was{color:var(--fg3)}
.cs-was-out{text-decoration:line-through}
.cs-tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:600;border:1px solid var(--line);color:var(--fg3);white-space:nowrap}
/* 有影响那一格照原型上琥珀底、去边框（原型 .cs-tag-warn；原先做成灰描边药丸是漏搬）。 */
.cs-tag-warn{color:#b26500;background:rgba(255,149,0,.12);border-color:transparent}
/* **乙案取色**（用户 2026-09-24 裁定）：值即入口 ⇒「将改为」的值**恒为蓝**（var(--blue2)，铅笔同色）；
   真的改了的那一项**再加粗**（第二档信号），配合当前值划掉与琥珀徽章，一眼分出"能改"与"要改"。
   原型原话只做了"变才上色"（.cs-now / .cs-same .cs-now），0 改动的页面会整页无彩，故按用户口径改成恒蓝。 */
.cs-diff .ilife-edit-value-text,.cs-diff .ilife-edit-value-unit{color:var(--blue2)}
.cs-diff .ilife-edit-value-pen{color:var(--blue2);opacity:.55}
.cs-diff tr[data-changed] .ilife-edit-value-text,
.cs-diff tr[data-changed] .ilife-edit-value-unit{font-weight:700}
/* 未改项折起：手机档的一行明示条（桌面不显示——桌面有宽度，"一眼看全"是对的）。 */
.cs-rest-bar{display:none}
.cs-rest-btn{width:100%;min-height:44px;padding:0 10px;border:1px dashed var(--line);border-radius:8px;
  background:transparent;color:var(--fg2);font:inherit;font-size:13px;text-align:left;cursor:pointer}
/* 摘要条：照原型——事实条收进一块浅底带 */
.cs-sum{padding:12px 14px;border-radius:4px;background:var(--soft)}
.cs-sum .ilife-block-fact-strip{margin:0;border:0;background:transparent;gap:8px 26px}
/* 摘要带照原型**一行读完**：「变更 N 项　影响 每日消耗 a → b 卡/天（±d，±x%）」。
   公共层事实条把每项排成**竖列**（标签小字在上、值在下），这里连方向一起摆回行内——原型就是这么读的。 */
.cs-sum .ilife-block-fact-strip-item{display:inline-flex;flex-direction:row;align-items:baseline;gap:8px;min-width:0}
/* label 不许被值挤着换行（手机档「影响」曾拆成「影／响」两行）：自己不缩，缩的是值。 */
.cs-sum .ilife-block-fact-strip-label{display:inline;flex:0 0 auto;white-space:nowrap;font-size:14px;font-weight:600;color:var(--fg2)}
/* 有变化那一格上琥珀（原型里叫 .cs-sum-warn） */
.cs-sum .ilife-block-fact-strip-value-warn{color:#b26500}
/* 页脚：照原型——**一行**两颗，「签发并写入」（实心深色主按钮）在左、「还原」（描边）在右，脚注一件占一行。
   两颗按钮的样式按 data-action-id 定（不依赖公共层那套类名），尺寸逐值取原型 .cs-btn：
   48 高／radius 4／padding 0 22／15px 600。 */
.cs-foot{border-top:1px solid var(--line);padding-top:16px;margin-top:16px}
.cs-foot .ilife-action-bar,
.cs-foot .ilife-action-row{display:flex;flex-direction:row-reverse;flex-wrap:wrap;align-items:center;gap:12px;
  border:0;padding:0;margin:0;justify-content:flex-end}
.cs-foot .ilife-action-bar>*,
.cs-foot .ilife-action-row>*{flex:0 0 auto}
.cs-foot [data-action-id]{box-sizing:border-box;min-height:48px;padding:0 22px;border-radius:4px;
  font-size:15px;font-weight:600;cursor:pointer}
.cs-foot [data-action-id="ilife-help-copy-prompt"]{background:var(--fg);border:1px solid var(--fg);color:#fff;letter-spacing:.06em}
.cs-foot [data-action-id="calorie-profile-sheet-reset"]{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.cs-foot [data-action-id="calorie-profile-sheet-reset"][disabled]{color:var(--fg3);cursor:not-allowed}
.cs-foot-note{flex:1 1 100%;margin:12px 0 0;font-size:12px;color:var(--fg3);line-height:1.7}
.cs-foot-note b{color:var(--fg2);font-weight:600}
.cs-copy{margin-top:12px}
.cs-copy .ilife-copy-btn{box-sizing:border-box;min-height:48px;padding:0 20px;border-radius:10px;
  border:1px solid var(--line);background:var(--card);color:var(--fg);font-size:15px;font-weight:600}
.cs-copy .ilife-copy-btn-primary{background:var(--fg);border-color:var(--fg);color:#fff;letter-spacing:.04em}
.cs-copy .ilife-copy-btn-ghost{background:var(--card);color:var(--fg)}
.cs-copy .ilife-copy-btn[disabled]{color:var(--fg3);background:var(--card)}
.cs-copy .ilife-copy-menu-wrap{position:relative}
.cs-copy .ilife-copy-menu{min-width:220px;border:1px solid var(--line);border-radius:10px;background:var(--card);
  box-shadow:0 8px 24px rgba(0,0,0,.08);overflow:hidden}
.cs-copy .ilife-copy-menu-item{min-height:44px;padding:10px 14px;font-size:14px;color:var(--fg)}
@media (max-width:640px){
  .cs{padding:16px 14px 12px}
  /* 页脚两颗按钮**手机档也同一行**（用户 2026-09-24 裁定）：主按钮在左、还原在右，与桌面同形、同尺寸。
     这一档不再走原型的「列倒序 ＋ 宽 100%」（那会把两颗叠成两行、白占一屏高度）。 */
  .cs-foot .ilife-action-bar,
  .cs-foot .ilife-action-row{flex-wrap:nowrap;gap:8px;justify-content:flex-start}
  .cs-foot .ilife-action-row>*,
  .cs-foot [data-action-id]{flex:0 0 auto;width:auto;white-space:nowrap;padding:0 16px}
  .cs-copy .ilife-copy-btn{padding:0 12px}
  /* 手机档＝**一行一字段**（用户 2026-09-24 裁定「方案二＋三合体」）：
     相同就只写一遍（「身高 176 cm ✎」），要改的才写两段（「176 cm → 180 cm ✎」），
     未改项默认折进下面那条明示条——原来每字段四行、5 个字段 20 行、整页 1542px，就是这么来的。 */
  .cs-diff,.cs-diff tbody{display:block;width:auto}
  .cs-diff thead{display:none}
  .cs-diff tr[data-row]{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;
    border-top:1px solid var(--line);padding:10px 0}
  .cs-diff tr[data-row]:first-child{border-top:0}
  .cs-diff td{border:0;padding:0;text-align:left}
  .cs-diff td:nth-child(1){flex:0 0 auto;font-size:15px;font-weight:600}
  .cs-diff td:nth-child(2){flex:0 0 auto;display:flex;align-items:baseline;gap:6px;font-size:14px;color:var(--fg3)}
  .cs-diff td:nth-child(3){flex:1 1 auto;display:flex;align-items:center;gap:6px;font-size:15px;min-width:0}
  .cs-diff td:nth-child(4){flex:0 0 auto;margin-left:auto}
  /* 没改：当前值与「将改为」是同一个数 ⇒ 当前那一格整格收掉，值只写一遍 */
  .cs-diff tr[data-row]:not([data-changed]) td:nth-child(2){display:none}
  /* 改了：当前值留着（脚本会给它划掉），两段之间一支箭头 */
  .cs-diff tr[data-changed] td:nth-child(3)::before{content:"→";flex:0 0 auto;color:var(--fg3)}
  .cs-diff td .ilife-edit-value-hit{margin-left:0;padding:0 4px}
  .cs-rest-bar{display:block}
  .cs-rest-bar td{display:block;padding:8px 0 0}
  .cs-diff:not(.cs-rest-open) tr[data-row]:not([data-changed]){display:none}
}
</style>`;

/** 页内脚本：把"改值 → 摘要／影响／指令／徽章"接上（值从组件的 `data-*` 上读，不从别处猜）。
 *  `word` 是本页的写入词：那句话里必须点**本页这个词**（原先写死「改档案」，在「设活动量」页上说错了词）。 */
function sheetScript(rows: readonly SheetRow[], bmr: number | null, nowTdee: number | null, word: string): string {
  const data = rows.map((r) => ({
    key: r.key, label: r.label, unit: r.unit, beforeRaw: r.beforeRaw, before: r.before, after: r.after,
  }));
  return '<script>\n(function(){\n'
    + '  var ROWS=' + JSON.stringify(data) + ';\n'
    + '  var WORD=' + JSON.stringify(word) + ';\n'
    + '  var FAC=' + JSON.stringify(TDEE_ACTIVITY_FACTORS) + ';\n'
    + '  var BMR=' + JSON.stringify(bmr) + ', NOW=' + JSON.stringify(nowTdee) + ';\n'
    + '  var ZH=' + JSON.stringify(Object.fromEntries(ACTIVITY_LEVELS.map((lv) => [lv, ACTIVITY_LEVEL_LABELS[lv]])))
    + ';\n  var GZ={male:"男",female:"女"};\n'
    + '  function val(k){ var n=document.querySelector(\'[data-ilife-edit="\'+k+\'"]\'); return n?n.getAttribute("data-ilife-edit-value"):""; }\n'
    + '  function shown(k,u){ var v=val(k); if (k==="activityLevel") return ZH[v]||v; if (k==="gender") return GZ[v]||v;'
    + ' return v+(u?(" "+u):""); }\n'
    + '  function changed(){ return ROWS.filter(function(r){ return val(r.key)!==r.beforeRaw; }); }\n'
    + '  function say(){ var ks=changed(); if (!ks.length) return "确认写入："+WORD+"（与库内现值一致）";'
    + ' return "确认写入："+WORD+"（"+ks.map(function(r){ return r.label+" "+shown(r.key,r.unit); }).join("、")+"）"; }\n'
    + '  function tdee(v){ var f=FAC[v]; return (BMR===null||!f)?null:Math.round(BMR*f); }\n'
    + '  function paint(){\n'
    + '    ROWS.forEach(function(r){\n'
    + '      var v=val(r.key), same=(v===r.beforeRaw);\n'
    + '      var was=document.querySelector(\'[data-was="\'+r.key+\'"]\');\n'
    + '      if (was) was.className="cs-was"+(same?"":" cs-was-out");\n'
    /* 行级状态：`data-changed` 同时管三件事——值加粗、当前值划掉、手机档"改了的行留在外面／没改的收回折起"。 */
    + '      var tr=document.querySelector(\'tr[data-row="\'+r.key+\'"]\');\n'
    + '      if (tr){ if (same) tr.removeAttribute("data-changed"); else tr.setAttribute("data-changed","1"); }\n'
    + '      var tag=document.querySelector(\'[data-tag="\'+r.key+\'"]\'); if (!tag) return;\n'
    + '      if (r.key==="activityLevel"){ var t=tdee(v), d=(t===null||NOW===null)?null:(t-NOW);\n'
    + '        tag.textContent=(d===null||d===0)?"不变":((d>0?"+":"")+d+" 卡/天");\n'
    + '        tag.className="cs-tag"+((d===null||d===0)?"":" cs-tag-warn"); }\n'
    + '      else { tag.textContent=same?"不变":(r.key==="note"?"仅存档":"每日消耗参与项"); tag.className="cs-tag"; }\n'
    + '    });\n'
    + '    var ks=changed(), lv=val("activityLevel"), t=tdee(lv); var d=(t===null||NOW===null)?null:t-NOW;\n'
    + '    var cells=document.querySelectorAll(".cs-sum .ilife-block-fact-strip-value");\n'
    + '    if (cells.length>=2){ cells[0].textContent=ks.length+" 项";\n'
    + '      var warn=(d!==null&&d!==0);\n'
    + '      cells[1].textContent=(d===null)?"按活动量算":(d===0?("每日消耗 "+NOW+" → "+t+" 卡/天（不变）")\n'
    + '        :("每日消耗 "+NOW+" → "+t+" 卡/天（"+(d>0?"+":"")+d+"，"+(d>0?"+":"")+Math.round(d/NOW*1000)/10+"%）"));\n'
    + '      cells[1].className="ilife-block-fact-strip-value"+(warn?" ilife-block-fact-strip-value-warn":""); }\n'
    + '    var badge=document.querySelector(".cs-badge");\n'
    + '    if (badge){ var all=(ks.length===ROWS.length); badge.textContent=all?"待确认":(ks.length?"已改，待签发":"无改动");'
    + ' badge.className="cs-badge"+(all?"":" cs-badge-dirty"); }\n'
    + '    var cap=document.getElementById("csSay"); if (cap) cap.textContent=say();\n'
    + '    var sign=document.querySelector(\'[data-action-id="' + CALORIE_COPY_ACTION.actionId + '"]\');\n'
    + '    if (sign) sign.setAttribute("data-t","【calorie 档案预检】"+say());\n'
    + '    var reset=document.querySelector(\'[data-action-id="' + SHEET_RESET_ACTION + '"]\');\n'
    + '    if (reset) reset.disabled=(ks.length===ROWS.length);\n'
    /* 折起条：计数与开合状态都随改随算（改了某字段，那一行当场从"收起的那些"里出来）。 */
    + '    var rest=document.querySelectorAll(\'.cs-diff tr[data-row]:not([data-changed])\').length;\n'
    + '    var bar=document.querySelector(".cs-rest-btn"), tbl=document.querySelector(".cs-diff");\n'
    + '    var open=!!(tbl && tbl.classList.contains("cs-rest-open"));\n'
    + '    if (bar){ bar.textContent=open?"收起未改项":("其余 "+rest+" 项与库里一致");'
    + ' bar.setAttribute("aria-expanded", open?"true":"false"); bar.style.display=(rest===0&&!open)?"none":""; }\n'
    + '  }\n'
    + '  var rbtn=document.querySelector(".cs-rest-btn");\n'
    + '  if (rbtn) rbtn.addEventListener("click",function(){ var tbl=document.querySelector(".cs-diff");\n'
    + '    if (!tbl) return; tbl.classList.toggle("cs-rest-open"); paint(); });\n'
    + '  document.addEventListener("ilife:edit-commit", paint);\n'
    + '  document.addEventListener("ilife:edit-cancel", paint);\n'
    + '  var reset=document.querySelector(\'[data-action-id="' + SHEET_RESET_ACTION + '"]\');\n'
    + '  if (reset) reset.addEventListener("click",function(){\n'
    + '    ROWS.forEach(function(r){ var n=document.querySelector(\'[data-ilife-edit="\'+r.key+\'"]\'); if(!n) return;\n'
    + '      n.setAttribute("data-ilife-edit-value", r.beforeRaw); n.setAttribute("data-ilife-edit-display", r.before);\n'
    + '      var t=n.querySelector(".ilife-edit-value-text"); if (t) t.textContent=r.before; });\n'
    + '    paint();\n'
    + '  });\n'
    + '  paint();\n'
    + '}());\n</script>';
}

/** 整页：单据头 ＋ 摘要 ＋ 对照表（值即可改） ＋ 依据 ＋ 页脚（签发并写入／还原）＋ 复制区（原样）。 */
export function buildChangeSheetDoc(v: ProfileSettingView): string {
  const wake = v.wakeWord ?? '';
  const rows = sheetRows(v);
  /* 「当前消耗」与表格「当前」列**必须同源**（用户 2026-09-24 裁定修）：读**库里当前活动量**那一档。
     原写法 `find(c => c.tdee !== null)` 恒命中候选列表第一档（久坐，五档都算得出消耗），
     于是 0 改动的改档案页也会报「+648」——那其实是「久坐 → 中度活动」的差。 */
  const curLevel = v.before?.activity_level ?? null;
  const cur = v.activityChoices.find((c) => c.level === curLevel) ?? v.activityChoices[0];
  const nowTdee = cur?.tdee ?? null;
  const bmr = nowTdee === null ? null : Math.round(nowTdee / (cur?.factor ?? 1.55));
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: WIZARD_KEY,
    data: {
      metrics: metricsOf({
        filledCount: v.filledCount, hasProfile: v.before ? 1 : 0,
        latestWeightKg: v.latestWeightKg, activityLevels: v.activityChoices.length,
      }),
    },
  };
  /** 那句话（页脚脚注与主按钮载荷同源）：照原型 `确认写入：<词>（<字段 新值>…）`，一字不改地由页内脚本重算。
   *  —— 词必须跟着本页走：2026-09-24 实拍里「设活动量」页说成「确认写入：改档案」，就是这里写死的。 */
  const changedRows = rows.filter((r) => r.afterRaw !== r.beforeRaw);
  const instruction = '【calorie 档案预检】确认写入：' + wake + '（'
    + (changedRows.length === 0 ? '与库内现值一致'
      : changedRows.map((r) => r.label + ' ' + r.after + (r.unit === '' ? '' : ' ' + r.unit)).join('、'))
    + '）';
  /** 改活动量之后的每日消耗（表里那一行的草稿值决定；拿不到就是 `null`，不编数）。 */
  const nextTdee = ((): number | null => {
    const lv = rows.find((r) => r.key === 'activityLevel')?.afterRaw ?? '';
    const f = (TDEE_ACTIVITY_FACTORS as Record<string, number>)[lv];
    return (bmr === null || f === undefined) ? null : Math.round(bmr * f);
  })();
  const body = [
    SHEET_CSS,
    '<div class="cs">',
    '<div class="cs-head"><h2 class="cs-title">' + (SHEET_TITLE[wake] ?? '档案变更单') + '</h2>'
      + '<span class="cs-badge">待确认</span></div>',
    /* 单号行（用户 2026-09-24 裁定）：**去掉 `·` 分隔符、去掉重复事实**——「来源 基础信息／原话」眉标与页题
       已经写着，再抄一遍只让这一行变长；留下的两件＝单据身份 ＋ 唯一的操作提示，左右各一件，窄屏自然折行。 */
    '<p class="cs-meta"><span>单号 ' + sheetNo(nowStamp()) + '</span>'
      + '<span class="cs-meta-hint">点「将改为」即可改</span></p>',
    '<div class="cs-sum">' + renderFactStrip({
      items: [
        { label: '变更', value: rows.filter((r) => r.afterRaw !== r.beforeRaw).length + ' 项' },
        { label: '影响', value: tdeeText(nowTdee, nextTdee) },
      ],
    }) + '</div>',
    '<table class="cs-diff">',
    '<colgroup><col style="width:92px"><col style="width:150px"><col><col style="width:176px"></colgroup>',
    '<thead><tr><th>字段</th><th>当前</th><th>将改为</th><th>影响</th></tr></thead><tbody>',
    rows.map((r) => '<tr data-row="' + r.key + '"><td>' + r.label + '</td>'
      + '<td><span class="cs-was" data-was="' + r.key + '">' + r.before + (r.unit === '' ? '' : ' ' + r.unit) + '</span></td>'
      + '<td>' + renderEditableValue({
        name: r.key, value: r.afterRaw, display: r.after, unit: r.unit === '' ? undefined : r.unit,
        label: r.label, kind: r.kind, options: r.options,
      }) + '</td>'
      + '<td><span class="cs-tag" data-tag="' + r.key + '">' + r.note + '</span></td></tr>').join(''),
    /* 未改项折起那一条（手机档才显示；文案与计数由页内脚本随改随算）。 */
    '<tr class="cs-rest-bar"><td colspan="4"><button type="button" class="cs-rest-btn" aria-expanded="false">'
      + '其余 ' + rows.filter((r) => r.afterRaw === r.beforeRaw).length + ' 项与库里一致</button></td></tr>',
    '</tbody></table>',
    renderCaliberLine('依据：每日消耗 ＝ 基础代谢 ' + (bmr ?? '—') + ' × 活动系数，按最近体重 '
      + (v.latestWeightKg ?? '—') + ' kg 算；运动消耗另计。'),
    '<div class="cs-foot">',
    renderActionBar({
      copyLog: { actionId: CALORIE_COPY_ACTION.actionId, label: '签发并写入', text: instruction },
      buttons: [{ label: '还原', kind: 'ghost', actionId: SHEET_RESET_ACTION, disabled: true }],
    }),
    '<p class="cs-foot-note">按下去＝把这句话交给 AI 执行：<b id="csSay">' + instruction + '</b></p>',
    '</div>',
    '</div>',
    /* 卡片**下面**那一行：两颗复制按钮（与原型唯一可见差异＝多了这一行，用户 2026-09-24 红框指定）。 */
    '<div class="cs-copy">',
    copyArea({
      // 粘贴出去的页名写中文（#238 清单 13 条）：内部命令名对用户没有意义。
      data: { envelope, title: '【calorie 档案预检】' },
      log: {
        envelope,
        copyLog: copyLog({
          command: 'calorie-cmd-read ' + WIZARD_KEY, source: PROFILE_SOURCE,
          actionAt: nowStamp(), version: DOC_VERSION,
        }),
      },
    }),
    '</div>',
    sheetScript(rows, bmr, nowTdee, wake),
  ].join('');
  void COPY_ACTION_IDS;
  void CHANGE_KEYS;
  return assembleDocPage({
    docTitle: DOC_TITLE,
    /* 文档壳那行页题与副标题**本页不印**（用户 2026-09-24 裁定：重复文字直接删）——
       卡片抬头已经写着"这是什么单"，壳再写一遍就是同一屏两个同名大字；
       但公共层 `renderPageShell` **明写 title 必须是非空字符串**（实拍跑出过
       `ERR 4: renderPageShell: input.title 必须是非空字符串`），故照实传值、由本页样式把那一行收掉（副标题直接不给）。 */
    title: SHEET_TITLE[wake] ?? '档案变更单',
    eyebrow: '基础信息 ' + wake,
    subtitle: null,
    content: body,
    pageUi: true,
    lockColumn: true,
    editableValue: true,
  });
}
