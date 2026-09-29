// 渲染层·页内翻页共用件（#928：用户不要 N 个文件，要一页纸里翻）。
//
// 一令仍一文件：翻的是**本页已装载的行**（标签 100 行／位置 144 行），20 行一视，
// 上一页／下一页＋第X页／共Y页，纯内联脚本切 `hidden`，不请求、不跳页。
// 全库可达仍靠 q／limit 重跑一令（静态文件无服务端，页内翻不出未装载的行——这一点不伪装）。
// 在用两处：`items/pages/tag_manage.ts`（列表态）与 `space/pages/location_manage.ts`（树），
// 故住共用位；一页只调一次（脚本按 `document` 找 `[data-hmpp-*]`，同页两处会互相抢）。
// 行数少于等于一视即原样返回（无按钮无脚本，小结果不挂多余件）。

/** 一视行数（固定 20：手机一屏几眼看完，不堆成长条）。 */
export const PAGER_PER_PAGE = 20;

/** 翻页条样式（#928，随共享样式槽下发）：与各页胶囊按钮同族——44px 触摸区、白底描边、右侧页数灰字。
 *  样式住本件（谁的标记谁给样式，铁律二）；末条规则治「行被包进分组后 `.trow:last-child` 不再命中
 *  每组末行」——上一条 `.trow:last-child{border-bottom:none}` 只治不分页的那一档。 */
export const PAGER_CSS = '[data-hmpp-bar]{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}'
  + '[data-hmpp-bar] [data-hmpp]{min-height:44px;min-width:44px;padding:0 16px;border:1px solid #d2d2d7;'
  + 'border-radius:999px;background:#fff;color:#1d1d1f;font-size:13px;font-weight:700;cursor:pointer}'
  + '[data-hmpp-bar] [data-hmpp]:hover{background:#f2f4f8;border-color:#b9b9c0}'
  + '[data-hmpp-bar] [data-hmpp]:active{background:#e8ecf1}'
  + '[data-hmpp-info]{font-size:12px;color:#6e6e73;font-weight:600;margin-left:auto}'
  + '@media(max-width:720px){[data-hmpp-bar] [data-hmpp]{flex:1}}'
  + 'div[data-hmpp-page]:last-child>.trow:last-child{border-bottom:none}';

function pagerScript(): string {
  return '(function(){'
    + 'var ps=[];var els=document.querySelectorAll("[data-hmpp-page]");'
    + 'for(var i=0;i<els.length;i++)ps.push(els[i]);'
    + 'if(ps.length<2)return;var cur=0;'
    + 'var info=document.querySelector("[data-hmpp-info]");'
    + 'function show(n){cur=(n+ps.length)%ps.length;'
    + 'for(var i=0;i<ps.length;i++){if(i===cur)ps[i].removeAttribute("hidden");else ps[i].setAttribute("hidden","")} '
    + 'if(info)info.textContent="第"+(cur+1)+"页／共"+ps.length+"页"}'
    + 'var bar=document.querySelector("[data-hmpp-bar]");'
    + 'if(!bar)return;'
    + 'bar.addEventListener("click",function(e){var t=e.target;'
    + 'var b=(t&&t.closest)?t.closest("[data-hmpp]"):null;if(!b)return;'
    + 'var k=b.getAttribute("data-hmpp");if(k==="prev")show(cur-1);else if(k==="next")show(cur+1);'
    + '},true);show(0)})();';
}

/** 行 HTML 数组 → 页内翻页整块（首视第 1 页，其余 `hidden`；不够一视原样拼回）。 */
export function paginateBlocks(rows: string[], perPage: number = PAGER_PER_PAGE): string {
  if (!Number.isInteger(perPage) || perPage <= 0) perPage = PAGER_PER_PAGE;
  if (rows.length <= perPage) return rows.join('');
  const pages: string[] = [];
  for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage).join(''));
  const bodies = pages.map((b, i) =>
    '<div data-hmpp-page="' + i + '"' + (i === 0 ? '>' : ' hidden>') + b + '</div>',
  ).join('');
  const total = pages.length;
  return '<div data-hmpp-bar>'
    + '<button type="button" data-hmpp="prev">上一页</button>'
    + '<span data-hmpp-info>第1页／共' + total + '页</span>'
    + '<button type="button" data-hmpp="next">下一页</button></div>'
    + bodies
    + '<script>' + pagerScript() + '</script>';
}
