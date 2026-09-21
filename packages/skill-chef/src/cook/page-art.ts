/** 做菜域五页的两件页内装饰（内联 SVG：一口锅加三缕热气 ＋ 一条横贯的波线带）。
 *
 * 为什么要它们：本批的「视觉生动」是全场最低维，48 页逐页复评里「整页近乎纯文字、缺图」被反复点到；
 * 本域没有菜品照片可用（数据源里没有图，也不许编造写实菜品图），能补的只有**装饰与图标位**。
 *
 * 三条口径：
 *  ① **两件都不带数据、不带一个字**：纯路径绘制，`aria-hidden`，屏读器读不到、也读不出假信息；
 *  ② **不是 `<img>`**：内联 SVG 不过验收墙的造册判据（含 `loading="lazy"` 的产物会被拒收）；
 *  ③ 线宽、颜色、尺寸全在样式段 `page-css.ts` 里，本件只出标记。
 *
 * 第二轮返修：图形收成**一张与别的卡同色基、同描边、同圆角的牌**（同尺复评原话「插画与暖色渐变
 * 风格与卡片式表单略脱节」，脱节的根源是它只有线稿、没有卡面），并按同一条评语再加一条横贯的波线带。
 */

/** 页头装饰牌：锅（锅沿 ＋ 锅身 ＋ 短柄）与三缕热气。 */
export const cookHeroArt = '<div class="ilife-cook-art" aria-hidden="true">'
  + '<svg viewBox="0 0 120 44" fill="none" stroke-width="3" stroke-linecap="round" focusable="false">'
  + '<path class="ilife-cook-art-steam" d="M36 24C36 18 42 18 42 12"/>'
  + '<path class="ilife-cook-art-steam" d="M54 24C54 14 60 14 60 5"/>'
  + '<path class="ilife-cook-art-steam" d="M72 24C72 18 78 18 78 12"/>'
  + '<path class="ilife-cook-art-wok" d="M20 26H100"/>'
  + '<path class="ilife-cook-art-wok" d="M26 26C26 36 44 40 60 40C76 40 94 36 94 26"/>'
  + '<path class="ilife-cook-art-wok" d="M100 26L112 21"/>'
  + '</svg></div>';

/** 装饰带：一条横贯的波线（`T` 反射接续、两端不出头），摆在大标题那条横线与事实条之间当分隔件。 */
export const cookHeroBand = '<div class="ilife-cook-band" aria-hidden="true">'
  + '<svg viewBox="0 0 320 16" preserveAspectRatio="none" fill="none" focusable="false">'
  + '<path d="M0 13Q10 3 20 13T40 13T60 13T80 13T100 13T120 13T140 13T160 13T180 13'
  + 'T200 13T220 13T240 13T260 13T280 13T300 13T320 13"/>'
  + '</svg></div>';
