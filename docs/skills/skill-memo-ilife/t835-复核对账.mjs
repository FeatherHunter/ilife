#!/usr/bin/env node
/** #835 · 终审把每个「VLM 结论」逐条回证据复核，落一份机器可读的对账单。
 *
 * 为什么单列一件：票面第 4 步原话是「**模型是提示器不是证据**」——VLM 的每条结论都要能用
 * DOM／CSS 读数或 `文件:行` 复核；复核不了的写「未证」；模型误读的**逐条剔除并写明**。
 * 本件把逐条复核的判定落成 JSON，供 `t835-视觉终审.md` 逐条转载（生成器与报告两处不许各写一份）。
 *
 * 复核的三个证据源：
 *   a. `计算样式面.json` —— 渲染后 getBoundingClientRect／getComputedStyle 读数
 *   b. `屏上字符.json`   —— 渲染后可见文本的字符面扫描
 *   c. 产物源码 `文件:行` —— 规则或文案的实际出处
 *
 * 用法：`node docs/skills/skill-memo-ilife/t835-复核对账.mjs --json <落点>`
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const OUT = resolve(argOf('--json', 'packages/skill-memo-ilife/.scratch/t835-读数/复核对账.json'));

/** 逐条：VLM 原话 → 复核判定 → 证据 → 处置。判定四档：坐实／半坐实（真现象、非缺陷）／剔除（误读）／未证。 */
const ITEMS = [
  {
    id: 'V1',
    vlm: '「记备忘」等回执页：标签内出现**半角冒号、半角斜杠、英文数字**（`笔记编号 1`／`正文：`／`备忘 / 家务`／`已更新：1`）',
    verdict: '剔除（误读）',
    evidence: '渲染后可见文本逐页扫描（`t835-屏上字符.mjs`：34 页 ×2 档，半角标点命中 0 处）；把「记备忘」两档的可见文本原样取出，分隔处是**全角冒号 `：` U+FF1A** 与**全角斜杠 `／` U+FF0F**，屏上不存在半角版本',
    handling: '不扣分。剔除理由：模型把全角冒号/斜杠读成半角。',
  },
  {
    id: 'V2',
    vlm: '「记备忘」：`18` 在屏上出现三次（`已记一条：18`／`笔记编号 18`／`备忘 #18`）＝ 同一事实重复',
    verdict: '半坐实（真现象、非缺陷）',
    evidence: '三处确在屏上（计算样式面 `visibleText` 逐条可见）；但三处**语义不同**：页头是本次动作的计数，结果卡是记录号字段，处理结果是「本地侧对象」的指代',
    handling: '不扣分（判据 ④「同一文案 ≥2 次」与 H3「同一事实一页两处」都要求同串同义；`t869-机审.mjs` ④ 列 0 处）。记进缺陷清单的「可改可不改」一栏。',
  },
  {
    id: 'V3',
    vlm: '「改备忘」：底部「复制数据」「复制日志」按钮触摸区目测 32–36px，不到 44px（H6）',
    verdict: '剔除（误读）',
    evidence: 'DOM 实测（`t835-计算样式面.mjs`）：该页 390／1280 两档触摸目标 <44px 各 **0** 个；`fmt.json` 的 `touchSmall` 全批 390／768／1440 三档均为 **0**；`.ilife-copy-btn` 的 `min-height:44px` 住公共层 `packages/base-render/src/pageUi.ts`',
    handling: '不扣分。剔除理由：模型目测像素，与 DOM 实测不符。',
  },
  {
    id: 'V4',
    vlm: '「改备忘」：D4 跨宽自适应扣到 10/15（宽档只占左半列）',
    verdict: '剔除（误读）',
    evidence: '同一段回答的自相矛盾：该条自己写「无半角标点/无英文」且**未报横向溢出**，却仍扣 D4；DOM 实测宽档版心 980px 居中（左余 150px／右余 150px，占视口 76.6%），页内无任何元素溢出',
    handling: '不扣分。剔除理由：模型在同一份回答里自证了前提不成立。',
  },
  {
    id: 'V5',
    vlm: '「搜备忘」「看提醒」：底部三枚胶囊按钮高度目测明显小于 44px（H6）',
    verdict: '剔除（误读）',
    evidence: 'DOM 实测该两页 390／1280 触摸目标 <44px 各 0 个（全批同为 0）；旁证：全批 68 张截图无一张 <2000 字节（`t835-双档截图读数.json`），不存在截断掩盖',
    handling: '不扣分。剔除理由同 V3。',
  },
  {
    id: 'V6',
    vlm: '「看提醒」：「数据与日志」「筛选快照」两卡内容只占左侧一窄条，右侧大片空白',
    verdict: '半坐实（真现象、非缺陷）',
    evidence: 'DOM 实测：该页宽档卡片宽 1120px（占视口 87.5%）—— **卡片本身铺满**；「右侧空白」指的是卡内一排只有两个按钮，属**短内容**而非**窄容器**',
    handling: '不扣分。记进清单「可改可不改」：单排按钮行在宽档下确实偏空。',
  },
  {
    id: 'V7',
    vlm: '「看提醒」：「提醒 2026-10-01 09:00」里的半角连字符 `-` 算半角标点（H7）',
    verdict: '剔除（误读）',
    evidence: '判据 `t869-机审.mjs` 与 `t835-屏上字符.mjs` 都把**日期里的 `-`** 按允许清单放过（本件的 `isDateDash` 口径与机审 §二 同源）；同一模板的 `创建于 09-22 13:22` 亦然',
    handling: '不扣分。剔除理由：日期连字符在允许清单内。',
  },
  {
    id: 'V8',
    vlm: '「备忘改分类-批量-向导」：`已选择 8 条，共 8 条` 与勾选数可能对不上（#881 那条缺陷是否真修好）',
    verdict: '坐实（已核验修复）',
    evidence: 'headless Chrome 真点按钮读数（`.scratch/diag-881-fresh.mjs`）：点「清空选择」前 `已选择 8 条，共 8 条` → 点后 **`已选择 0 条，共 8 条`** → 点「全选」后 **`已选择 8 条，共 8 条`**',
    handling: '不扣分（计数会刷新）。这条是本票**唯一一条被独立执行路径复核掉的 VLM 提示**，处置写明在报告 §五。',
  },
  {
    id: 'V9',
    vlm: '「备忘录同步」宽档：版心只占屏宽约四成，像一条很窄的竖条，两侧空得过分',
    verdict: '坐实（真缺陷候选）',
    evidence: 'DOM 实测：宽档最宽可见块 `div.wrap.ilife-page-ui` 宽 **480px**、左余 400px／右余 400px、占视口 **37.5%**；规则出处 `packages/skill-memo-ilife/templates/sync_report.html:43-47`（`.wrap{max-width:480px}`）；老技能同一件 `D:\\2Study\\StudyNotes\\SKILLS\\备忘录\\templates\\sync_report.html:43-44` **逐字相同**',
    handling: '记进缺陷清单「要改」栏；页分按规定公式仍为 100（判据只把「破一格」记红，480px 版心不破格亦不溢出），**不据此扣分**；但如实标注为跨宽口径未覆盖的一条，留作下一张票。',
  },
  {
    id: 'V10',
    vlm: 'HELP 手册页：一级分类里有「**储钱类**」，且 `·` 中点算半角标点',
    verdict: '剔除（一处误读＋一处口径外）',
    evidence: '产物源文件逐字检索：`储钱类` **0 处**；8 个一级分类＝备忘类／查找类／提醒类／心愿类／打卡类／情绪类／同步类／初始化类（与 `memo.help.lookup` 回执的 `items` 逐条对上）。`·` 共 83 处，全部住**共享 help 模板**（`docs/skills/skill-calorie` 同源），而地图已把「HELP 自身的重构」划为 Out of scope（归 #220）',
    handling: '不扣分。剔除理由：`储钱类` 在产物里不存在（模型凭空多出一个分类名）；`·` 属共享模板且不在本图范围。',
  },
];

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  at: new Date().toISOString(),
  total: ITEMS.length,
  byVerdict: ITEMS.reduce((a, x) => { a[x.verdict] = (a[x.verdict] ?? 0) + 1; return a; }, {}),
  items: ITEMS,
}, null, 1), 'utf8');
console.log(`RESULT: ${ITEMS.length} 条 VLM 结论逐条复核落 ${OUT}`);
for (const it of ITEMS) console.log(`  ${it.id} ${it.verdict} —— ${it.vlm.slice(0, 40)}…`);
