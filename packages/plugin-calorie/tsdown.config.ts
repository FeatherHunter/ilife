import type { UserConfig } from 'tsdown';

/** dsh-calorie client 打包：loader 工厂包（browser/CJS + 注册包裹）。
 * 逐项对标 cookbook「产物配方」（每项出处见 docs/agents/dsh-client-contract.md §2）。
 * 新单品复制本文件，只改 PLUGIN_ID 与 entry。
 */
const PLUGIN_ID = 'dsh-calorie';

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
