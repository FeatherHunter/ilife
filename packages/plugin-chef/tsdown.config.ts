import type { UserConfig } from 'tsdown';

/** dsh-chef client 打包：loader 工厂包（browser/CJS ＋ 注册包装）。
 * 逐项对标 cookbook「产物配方」（每项出处见 docs/agents/dsh-client-contract.md §2）；
 * 与 plugin-bill-ilife 的同名文件同形，只改 PLUGIN_ID 与 entry。
 *
 * 为什么必须有这一步（#150 事故复盘）：只用 `tsc -b` 产出的是裸 ESM（`import`／`export`），
 * 而 DSH 把所有插件的客户端拼成**一条** `<script>` 加载——裸 ESM 在普通脚本里是语法错误，
 * 整条脚本解析阶段即死，于是**所有**插件都注册不上（页面显示 Failed to load plugins）。
 * #218 把 dsh-chef 装进 web profile 之前，先补上这一步。
 */
const PLUGIN_ID = 'dsh-chef';

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
