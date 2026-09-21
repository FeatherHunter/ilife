#!/usr/bin/env node
// 作息管家唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行（**缺省即落盘**：给 `delivery{mode,path,bytes}`，#843）。
import type { Envelope } from 'base-link-core';
import { REGISTRY } from './registry.js';
import type { CommandSpec, ViewOut, WriteOut } from '../shared/commandSpec.js';
import {
  ScheduleFetchError, SchedulePolicyError,
  resolveDbPath, openScheduleDb, closeScheduleDb,
} from '../fetch/index.js';
import type { ScheduleKey } from '../policy/index.js';
import {
  scheduleShapeFor, buildScheduleEnvelope, renderEnvelopeHtml, assertHtmlSize,
  loadTemplate, templateFor, fillTemplate,
  ScheduleRenderError,
} from '../render/index.js';
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
// #843 · 交付面：落盘唯一那条链（`delivery/output.ts`）＋ 文件名主体一处定义（`delivery/naming.ts`）。
import { deliverHtml, pageStemFor, type HtmlDelivery } from '../delivery/index.js';
import { resolveHelpDir } from '../help/helpPaths.js';
import { resolveHtmlDir } from '../fetch/index.js';

const DEFAULT_TIMEOUT_MS = 30000;

function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function toast(msg: string): void { console.error('TOAST: ' + msg); }
function note(msg: string): void { console.error('NOTE: ' + msg); }

/** 预检：只查 node 版本。**不再读任何环境变量**——库目录从配置文件取（#695；口径见 #675 解决评论），
 *  「没配」这件事由 `resolveDbPath()` 那一趟的配置件报错承担（测试进程要落到真实家目录即响亮失败）。 */
function preflight(): void {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
}

/** 开库跑一条非 HELP 命令：DB 已初始化提示与库句柄生命周期住这里（stderr 字节与旧 dispatch 一致）。 */
function runWithDb(spec: CommandSpec, params: Record<string, unknown>): ViewOut | WriteOut {
  const dbPath = resolveDbPath();
  const handle = openScheduleDb(dbPath);
  try {
    if (handle.initialized) note('作息 DB 已初始化：' + dbPath);
    return spec.run(params, handle);
  } finally {
    closeScheduleDb(handle);
  }
}


function parseArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  const o: { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } = { key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS };
  for (let i = 1; i < a.length; i++) {
    // `--html <路径>`＝显式落点（逐字覆盖写）；不给它＝落通式名的缺省产物（#843）。
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || o.timeout <= 0) fail(2, '--timeout 须为正数毫秒');
    }
    else fail(2, '未知参数：' + a[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.key) fail(2, '用法：schedule-cmd-read <schedule.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]（不给 --html 即落缺省产物：产物根目录下按通式命名）');
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  // #695：三个配置 key（`schedule.config.read/write/reset`）在预检与形状表之前拦下——
  // 读写配置不该要求库目录已配，它们也不进 `SCHEDULE_KEY_SHAPES`（不是唤醒词命令，见 `src/cli/config.ts`）。
  if (isConfigKey(o.key)) {
    process.stdout.write(runConfigKey(o.key, params) + '\n');
    return;
  }
  // #706 · 配置体检（`schedule.config.check`）：同样是设置页专用的只读命令，同样在预检之前拦下——
  // 它要报的正是「库在哪、通不通」，不能先要求库目录已配。只读：不建目录、不写文件、不落默认配置。
  if (isHealthCheckKey(o.key)) {
    process.stdout.write(runHealthCheckKey(o.key) + '\n');
    return;
  }
  preflight();
  try { scheduleShapeFor(o.key as ScheduleKey); } catch (e) { fail(3, (e as Error).message); }
  const key = o.key as string;
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout);
  if (typeof timer.unref === 'function') timer.unref();
  let env: Envelope | null = null;
  let delivery: HtmlDelivery | undefined;
  let exitCode = 0;
  try {
    // #203：`schedule.help.lookup` 在**开库之前**分派（只读页不建库）；其余 7 键照旧走 dispatch（内部开库）。
    // 分派只认生成的 `registry.ts`（key → 声明）：命中即走能力目录的处理函数。
    const spec: CommandSpec | undefined = REGISTRY[key];
    if (!spec) fail(3, '未知 schedule key：' + key);
    // #203：`schedule.help.lookup` 在**开库之前**走（只读页不建库）；其余键走开库分支。
    // 开库与否是基础设施事实（同配置／体检拦截口），不是命令事实，故这一个分支住出口。
    const r: ViewOut | WriteOut = key === 'schedule.help.lookup'
      ? (spec.run as (p: Record<string, unknown>) => ViewOut)(params)
      : runWithDb(spec, params);
    for (const n of ('notes' in r ? r.notes ?? [] : [])) note(n);
    env = buildScheduleEnvelope(key, r.data);
    exitCode = 'exitCode' in r ? r.exitCode ?? 0 : 0;
    const built = env;
    // 页面正文＝本包 envelope 片段（模板填充后）：`--html <路径>` 与「缺省落盘」**同一份正文**，
    // 差别只在落点（逐字 vs 通式）——同一件产物，不因落点不同换形状（#843）。
    // **#783 起的接缝**：能力目录出的**真页**（处理函数返回的 `r.html`，如写域的「记作息结果」）优先，
    // 没给才回落到本键的薄模板页——回落那一支的字节与接缝之前逐字相同（七个读键今天都走它）。
    const pageHtml = (): string => {
      if (r.html !== '') {
        assertHtmlSize(r.html);
        return r.html;
      }
      const html = fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(built));
      assertHtmlSize(html);
      return html;
    };
    const landing = 'landing' in r ? r.landing : undefined;
    // **缺省即落盘**（#843）：每个键都落一份 HTML 并回 `delivery.path` 绝对路径。
    //  - 内容＝该键自身的产物：HELP 全壳页（`r.html`，处理函数已过体积门）／其余键的模板页（`sectionHtml()`）。
    //  - 落点分家：页面落**产物根** `<库目录>/<html.dir>`；HELP 自带 `landing`（落根下的 `html.helpDir` 一支）。
    //  - 名字一处定义：页面主体＝`pageStemFor(spec)`（技能名 ＋ 命令标题），HELP 主体＝`helpFileStem()`。
    //  - `--html <路径>`＝用户逐字指定的落点，优先级最高（逐字覆盖写、不带时间戳、不递补）——
    //    它也是**唯一**能让「按定义不落盘」的键（HELP 现找 `q`）落盘的路子（#204 ⑤ 锁着）。
    const delivers = ('delivery' in r ? r.delivery : undefined) !== false || o.html !== undefined;
    const receipt = delivers
      ? deliverHtml({
        explicit: o.html,
        html: landing !== undefined ? r.html : pageHtml(),
        targetDir: landing !== undefined ? landing.targetDir : resolveHtmlDir(),
        stem: landing !== undefined ? landing.stem : pageStemFor(spec),
        ...(landing === undefined ? {} : { reuseMs: landing.reuseMs }),
      })
      : undefined;
    if (receipt !== undefined) {
      delivery = receipt;
      note('HTML 已写：' + receipt.path + '（' + receipt.bytes + ' 字节 utf8）');
    }
    clearTimeout(timer);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof SchedulePolicyError) fail(2, (e as Error).message);
    if (e instanceof ScheduleFetchError) fail(4, (e as Error).message);
    if (e instanceof ScheduleRenderError) fail(5, (e as Error).message);
    // 配置件（`base-link-core`）的报错本身就是人话（带行号与文件名）：归「预检」那一档原样交回。
    // #695 起「库目录没配」也走这条——测试进程要落到真实家目录时报 `测试缺隔离…`。
    if (/(配置文件|配置项|测试缺隔离)/.test((e as Error).message ?? '')) fail(1, (e as Error).message);
    fail(4, '取数失败：' + (e as Error).message);
  }
  // #83／#144 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
  // 合成写「没达成」（本地成了但远端没成）→ 载荷照出、退出码非 0：上层不许误以为事情办完了
  // （裁定 A6②／用户故事 6）。判定与三分格都在回执里（`achieved`／`local`／`remote`／`remoteId`）。
  if (exitCode !== 0) {
    note('这一趟没达成（补偿路径见回执 remote 字段）：exit ' + exitCode);
    process.exit(exitCode);
  }
}

void main();
