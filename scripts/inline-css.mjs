/**
 * 构建后把唯一的 CSS 内联进 index.html。
 * 首屏少一次样式请求，弱网下可以省掉一个往返；脚本仍作为独立文件，保持可缓存。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const htmlPath = join(distDir, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

const assetsDir = join(distDir, 'assets');
const cssFile = readdirSync(assetsDir).find((name) => name.endsWith('.css'));

if (!cssFile) {
  console.warn('[inline-css] 未找到 CSS 文件，跳过');
  process.exit(0);
}

const css = readFileSync(join(assetsDir, cssFile), 'utf8');
const linkPattern = new RegExp(
  `<link rel="stylesheet"[^>]*href="/assets/${cssFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
);

if (!linkPattern.test(html)) {
  console.warn('[inline-css] HTML 中未找到对应的样式表引用，跳过');
  process.exit(0);
}

html = html.replace(linkPattern, `<style>${css}</style>`);
writeFileSync(htmlPath, html, 'utf8');
console.log(`[inline-css] 已内联 ${cssFile}（${css.length} 字节）`);
