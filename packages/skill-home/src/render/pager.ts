// 渲染层·页内翻页共用件（#928：用户不要 N 个文件，要一页纸里翻）。
//
// 一令仍一文件：翻的是**已装载的本页行**（标签 100 行／位置 60 行），20 行一视，
// 上一页／下一页＋第X页／共Y页＋本页M行，纯内联脚本切 `hidden`，不请求、不跳页。
// 全库可达仍靠 q／limit 重跑一令（静态文件无服务端，页内翻不出未装载的行——这一点不伪装）。
// 在用两处：`items/pages/tag_manage.ts`（列表态）与 `space/pages/location_manage.ts`（树），
// 故住共用位；一页只调一次（`hidden` 首视第 1 页，跨进程确定，落盘对账成立）。
// 行数少于等于一视即原样返回（无按钮无脚本，小结果不挂多余件）。

/** 一视行数（固定 20：手机一屏几眼看完， complaints 不堆）。 */
export const PAGER_PER_PAGE = 20;

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
