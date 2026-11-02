/** 渲染语言上下文（票 #1197 迁移期补的接线件，ADR-0004 §4）。
 *
 *  问题：1,214 件页面文案要按语言取词，但「语言」如果逐参数往下传，就得改遍每个渲染函数和
 *  它们的调用方——调用方散落在别的票的文件里（票面写集互不重叠），单票编译期凑不齐；
 *  base-paint 组件（各技能页共用）与技能包之间还会形成「组件等语言、调用方等组件」的环。
 *
 *  做法：把「这一次渲染用哪种语言」放进**运行期上下文**——CLI 入口解析一次语言（#1198 语言选择链），
 *  用 runWithLanguage 包住本次 dispatch；取词侧（各包 entries 的 m()）用 currentRenderLanguage()
 *  读同一个值。语言仍是运行期参数（不是编译期开关），只是经上下文传递而不是逐参下传。
 *
 *  不变量：未进入上下文时 currentRenderLanguage() 返回基准语言 zh——不启用多语言时产物逐字节不变。
 *
 *  为什么是模块级栈而不是 AsyncLocalStorage：本包**零运行时依赖**，ADR-0004 §4 的收窄规则明写
 *  公共层零依赖包「图无环、不含 node: 与第三方」；node:async_hooks 会破这条（且本包被 base-render
 *  的浏览器侧组件间接引用）。运行时模型也够用：CLI 一进程一命令、渲染是同步段，没有并发交错。
 *
 *  限制（写进契约，不许默默依赖）：同一进程里**两段异步渲染交错**时，语言会互相覆盖。
 *  本仓不存在这种调用（技能一律子进程起 CLI、测试串行）；将来若出现，必须改成注入式上下文端口
 *  （调用方把自己的上下文实现传进 resolve/evaluate），不许在这里偷偷引入 node:。
 */
import { BASE_LANGUAGE } from './catalog.js';

type Frame = { readonly language: string };

/** 渲染期上下文栈的栈顶；未进入上下文＝undefined（取基准语言）。 */
let current: Frame | undefined;

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as PromiseLike<unknown>).then === 'function';

/** 在给定语言下执行 run；run 内同步与异步调用都读到同一语言。返回值／异常原样透出。 */
export function runWithLanguage<T>(language: string, run: () => T): T {
  const frame: Frame = { language };
  const previous = current;
  current = frame;
  const restore = (): void => {
    if (current === frame) current = previous;
  };
  let out: T;
  try {
    out = run();
  } catch (error) {
    restore();
    throw error;
  }
  if (isThenable(out)) {
    // 异步回调（渲染链里可能有 await 收尾）：语言保持到 promise settle，再还原到进入前那一帧。
    return out.then(
      (value) => {
        restore();
        return value;
      },
      (error) => {
        restore();
        throw error;
      },
    ) as unknown as T;
  }
  restore();
  return out;
}

/** 当前渲染语言；未进入上下文时是基准语言 zh（不启用多语言＝逐字节不变）。 */
export function currentRenderLanguage(): string {
  return current?.language ?? BASE_LANGUAGE;
}
