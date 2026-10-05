import type { UserConfig } from 'tsdown';
import { fileURLToPath } from 'node:url';

/** dsh-memo-ilife client 打包：loader 工厂包（browser/CJS + 注册包裹）。
 * 逐项对标 cookbook「产物配方」（每项出处见 docs/agents/dsh-client-contract.md §2）。
 * 新单品复制本文件，只改 PLUGIN_ID 与 entry。
 */
const PLUGIN_ID = 'dsh-memo-ilife';

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
