const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const sharedConfig = {
  bundle: true,
  format: 'esm',
  external: ['jszip'],
  platform: 'browser',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  jsx: 'automatic',
  define: {
    'global': 'window',
    'process.env.NODE_ENV': '"production"'
  },
  inject: ['./node-shims.js'],
  alias: {
    'fs': './fs-stub.js'
  }
};

const configs = [
  {
    ...sharedConfig,
    entryPoints: ['src/main.tsx'],
    outfile: 'dist/bundle.js',
  }
];

/**
 * Copy PDF.js worker file to dist folder
 */
function copyPdfWorker() {
  const workerSrc = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');
  const workerDest = path.join(__dirname, 'dist', 'pdf.worker.mjs');

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.mkdirSync(path.join(__dirname, 'dist'));
  }

  // Copy worker file
  if (fs.existsSync(workerSrc)) {
    fs.copyFileSync(workerSrc, workerDest);
    console.log('✓ Copied PDF.js worker to dist/');
  } else {
    console.warn('⚠ PDF.js worker not found at:', workerSrc);
  }
}

/**
 * Copy CNAME file to dist folder for GitHub Pages custom domain
 */
function copyCNAME() {
  const cnameSrc = path.join(__dirname, 'CNAME');
  const cnameDest = path.join(__dirname, 'dist', 'CNAME');

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.mkdirSync(path.join(__dirname, 'dist'));
  }

  // Copy CNAME file if it exists
  if (fs.existsSync(cnameSrc)) {
    fs.copyFileSync(cnameSrc, cnameDest);
    console.log('✓ Copied CNAME to dist/');
  }
}

/**
 * Copy static files (HTML, CSS) to dist folder and fix paths for deployment
 */
function copyStaticFiles() {
  const distDir = path.join(__dirname, 'dist');

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }

  // Copy styles.css
  const stylesSrc = path.join(__dirname, 'styles.css');
  const stylesDest = path.join(distDir, 'styles.css');
  if (fs.existsSync(stylesSrc)) {
    fs.copyFileSync(stylesSrc, stylesDest);
    console.log('✓ Copied styles.css to dist/');
  }

  // Copy favicon.svg
  const faviconSrc = path.join(__dirname, 'favicon.svg');
  const faviconDest = path.join(distDir, 'favicon.svg');
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, faviconDest);
    console.log('✓ Copied favicon.svg to dist/');
  }

  // Read and modify index.html for deployment
  const indexSrc = path.join(__dirname, 'index.html');
  const indexDest = path.join(distDir, 'index.html');
  if (fs.existsSync(indexSrc)) {
    let html = fs.readFileSync(indexSrc, 'utf8');
    // Fix paths: remove 'dist/' prefix since dist becomes the root on GitHub Pages
    html = html.replace('src="dist/bundle.js"', 'src="./bundle.js"');
    html = html.replace('href="favicon.svg"', 'href="./favicon.svg"');
    html = html.replace('href="styles.css"', 'href="./styles.css"');
    fs.writeFileSync(indexDest, html);
    console.log('✓ Copied and updated index.html to dist/');
  }
}

if (isWatch) {
  copyPdfWorker();
  copyCNAME();
  copyStaticFiles();
  Promise.all(configs.map(config => esbuild.context(config))).then(contexts => {
    contexts.forEach(ctx => ctx.watch());
    console.log('Watching for changes...');
  });
} else {
  copyPdfWorker();
  copyCNAME();
  copyStaticFiles();
  Promise.all(configs.map(config => esbuild.build(config))).catch(() => process.exit(1));
}
