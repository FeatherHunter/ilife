#!/usr/bin/env node
/** t768 尺寸读数（抛弃式探针，入仓只为让设计文档 §8.2 的读数可复跑）。
 *
 * 量什么：1280 桌面档下，三页原型里那几个「肉眼说不清、必须量」的数——
 *   · 各块的**渲染宽**（表格／折叠卡／动作行／正文段）：回答「同一页是不是有两种版心」；
 *   · 折叠卡与展开卡的高（46 vs 174）：回答「未展开的步骤卡是不是和展开的同高」；
 *   · 读数卡进度条的轨道与填充（850×6／425×6）：回答「填充条有没有溢出卡片」；
 *   · 眉标／页标题／正文的**计算字号与颜色**：回答「眉标层级是不是被压平」。
 *
 * 用法：`node docs/skills/skill-chef/t768-尺寸读数.mjs`（先跑一次 `t768-原型.mjs` 出页）。
 * 依赖：本机 headless Chrome／Edge；只读产物，不写仓内文件。
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withBrowser } from './t768-质量门.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const OUT = resolve(ROOT, '.scratch', 't768');
const F = (n) => resolve(OUT, n);
const PROBE = `(function(){
  var root=document.querySelector('[data-variant]:not([hidden])')||document;
  var q=function(s){var e=root.querySelector(s);if(!e)return null;var r=e.getBoundingClientRect();
    var cs=getComputedStyle(e);return {w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left),
      fs:cs.fontSize,c:cs.color,cls:String(e.className||'').slice(0,60)}};
  var cards=[].filter.call(root.querySelectorAll('.ilife-block-disclosure'),function(c){return true});
  var open=cards.filter(function(c){return c.open});
  return { table:q('.ilife-block-data-table'), disclosure:q('.ilife-block-disclosure'),
    cardH:cards.map(function(c){return Math.round(c.getBoundingClientRect().height)}),
    openH:open.map(function(c){return Math.round(c.getBoundingClientRect().height)}),
    kpiBar:q('.ilife-block-kpi-card-bar'), kpiFill:q('.ilife-block-kpi-card-bar-fill'),
    eyebrow:q('.ilife-block-page-shell-eyebrow'), title:q('.ilife-block-page-shell-title'),
    body:q('.ilife-block-page-shell-body'), prose:q('.v768-prose'), actionBar:q('.ilife-action-bar') };})()`;

const rows = await withBrowser(async ({ s, sleep }) => {
  const out = [];
  const look = async (file, q) => {
    await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(F(file)).href + q });
    for (let i = 0; i < 60; i += 1) { const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true }); if (r.result && r.result.value === true) break; await sleep(50); }
    await sleep(200);
    const r = await s('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    out.push({ label: file + q, v: r.result.value });
  };
  await look('结果型.html', '');        // 四列食材表：直挂正文 ⇒ 满铺
  await look('结果型.html', '?variant=C'); // 同版心档：宽块也收回中间列
  await look('过程型.html', '');        // 表格在折叠件里 ⇒ 跟着 880
  await look('过程型.html', '?variant=C'); // 双栏：左栏 380／右栏 836
  return out;
});
if (rows.error !== undefined) { console.log('RESULT: ABORT :: ' + rows.error); process.exit(2); }
for (const r of rows) {
  const v = r.v;
  console.log('=== ' + r.label);
  console.log('  表格块 ' + JSON.stringify(v.table));
  console.log('  折叠卡 ' + JSON.stringify(v.disclosure) + '  逐卡高 ' + JSON.stringify(v.cardH) + ' 展开卡高 ' + JSON.stringify(v.openH));
  console.log('  KPI 轨道 ' + JSON.stringify(v.kpiBar) + ' 填充 ' + JSON.stringify(v.kpiFill));
  console.log('  眉标 ' + JSON.stringify(v.eyebrow) + ' 页标题 ' + JSON.stringify(v.title));
  console.log('  版心 ' + JSON.stringify(v.body) + ' 正文段 ' + JSON.stringify(v.prose) + ' 动作行 ' + JSON.stringify(v.actionBar));
}
