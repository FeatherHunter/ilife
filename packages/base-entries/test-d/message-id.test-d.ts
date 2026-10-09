// test-d：类型面自证——拼错 key 编译期红（票 #1200）。
//
// 收进本包 `tsc -b` 的路：tsconfig.json 是 solution 工程，references 里挂着
// tsconfig.test-d.json（include: ["test-d"]）。本文件编不过＝本包类型面破了。
//
// 这条断言为什么站得住：`@ts-expect-error` 要求**下一行真的有错**——下面那条
// `resolve(catalog, 'zh', 'greetng')` 若不再报 TS2345，tsc 会以「未使用的
// '@ts-expect-error' 指令」把本文件判红。两个方向都红，指令空转不了。
import { defineCatalog, resolve } from '../src/index.js';
import type { MessageId } from '../src/index.js';

/** 夹具：基准语言三条 key，en 表故意少一条（en 可以缺，回退链负责兜）。 */
const catalog = defineCatalog({
  zh: { greeting: 'ZH:{name}', count: 'ZH:{n}', baseOnly: 'ZH-ONLY' },
  en: { greeting: 'EN:{name}' },
});

/** 正例：窄类型认得出基准语言表里的 key（MessageId 派生错了，这一行就编不过）。 */
export const id: MessageId<typeof catalog> = 'greeting';

/** 正例：id 从基准语言派生，故 en 缺的那条也能取（运行期走回退链落到 zh）。 */
export const fallback: string = resolve(catalog, 'en', 'count', { n: 2 });

/** 正例：插值那条路同样收窄类型。 */
export const interpolated: string = resolve(catalog, 'zh', 'greeting', { name: 'A' });

// @ts-expect-error 拼错 key（'greetng'）必须编译期红：TS2345，不是 MessageId 的成员
resolve(catalog, 'zh', 'greetng');

/** 只为让上面每条都被 tsc 真编译到（noUnusedLocals 未开，这里显式收口）。 */
export const typed = { id, fallback, interpolated } as const;
