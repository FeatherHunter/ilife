import type { UserConfig } from 'tsdown';
import { fileURLToPath } from 'node:url';

/** dsh-schedule-ilife client 打包：loader 工厂包（browser/CJS ＋ 注册包装）。
 * 逐项对标 cookbook「产物配方」（每项出处见 docs/agents/dsh-client-contract.md §2）；
 * 与 plugin-calorie／plugin-memo-ilife／plugin-chef 的同名文件同形，只改 PLUGIN_ID 与 entry。
 *
 * 为什么必须有这一步（#150 事故复盘）：只用 `tsc -b` 产出的是裸 ESM（`import`／`export`），
 * 而 DSH 把所有插件的客户端拼成**一条** `<script>` 加载——裸 ESM 在普通脚本里是语法错误，
 * 整条脚本解析阶段即死，于是**所有**插件都注册不上（页面显示 Failed to load plugins）。
 * 本包发版前补上这一步（发版前实测 `dist/client.js` 是 841 B 的裸 ESM 存根）。
 */
const PLUGIN_ID = 'dsh-schedule-ilife';

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'cordis',
  '@deepseek-ai/dsh-client-ui-slots',
];

const clientBundle: UserConfig = {
  entry: { client: 'src/client.ts' },
  // 三印根因止血：把 dsh-life-pack 指回工作区新鲜源码，不经陈旧 node_modules（0.3.34）。
  // 不改 externals（契约要求其余一律打进包），只换解析落点；指到 src 真源，不依赖 manager 先构建。
  alias: { 'dsh-life-pack/config-panel': fileURLToPath(new URL('../plugin-manager/src/config-panel-api.ts', import.meta.url)) },
  outDir: 'dist',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(PLUGIN_ID) + ', factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    codeSplitting: false,
  },
};

export default [clientBundle] satisfies UserConfig[];
