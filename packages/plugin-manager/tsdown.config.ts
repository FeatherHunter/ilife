import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';

/** dsh-life-pack client 打包：loader 工厂包（browser/CJS + 注册包裹）。
 * 逐项对标 cookbook「产物配方」（每项出处见 docs/agents/dsh-client-contract.md §2）。
 * 新单品复制本文件，只改 PLUGIN_ID 与 entry。
 */
const PLUGIN_ID = 'dsh-life-pack';

/** 包描述文件里本件用得上的字段。 */
interface PackageManifest {
  readonly version?: unknown;
}

/** 从本包 `package.json` 取版本号（票 #986）：构建期注入产物，面板首帧即显示，不经宿主往返。
 *
 * 取不到即**构建失败**：注入值是屏上那行版本号的唯一来源（手写常量已被 #737 判定为漂移源），
 * 悄悄注入一个空串等于让面板印一行没有版本号的字，不如在这里红。
 * 「产物里的注入值 ≡ 包版本」由 `test/version-986.test.mjs` 的构建门咬住。 */
function readPackageVersion(): string {
  const manifestPath = join(dirname(fileURLToPath(import.meta.url)), 'package.json');
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as PackageManifest;
  const version = typeof manifest.version === 'string' ? manifest.version.trim() : '';
  if (version.length === 0) throw new Error('package.json 没有可用的 version：构建期注入拿不到版本号（' + manifestPath + '）');
  return version;
}

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
    // #986：版本号在构建期烙进产物（值取自本包 package.json），面板同步渲染、不等宿主。
    __LIFE_PACK_VERSION__: JSON.stringify(readPackageVersion()),
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
