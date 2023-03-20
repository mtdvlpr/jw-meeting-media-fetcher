#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path')
const fs = require('fs-extra')

const sqlWasmPath = path.join(
  __dirname,
  'node_modules',
  'sql.js',
  'dist',
  'sql-wasm.wasm'
)
const pdfWorkerPath = path.join(
  __dirname,
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.js'
)
const fluentFfmpegPath = path.join(
  __dirname,
  'node_modules',
  'fluent-ffmpeg',
  'lib'
)

// Necessary sql.js file for reading sqlite databases from JWPUB files
fs.copySync(sqlWasmPath, path.join(__dirname, 'src', 'public', 'sql-wasm.wasm'))

// Necessary pdfjs worker file for converting PDFs to images
fs.copySync(
  pdfWorkerPath,
  path.join(__dirname, 'src', 'public', 'pdf.worker.min.js')
)

// Fix for: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573
fs.copySync(fluentFfmpegPath, fluentFfmpegPath + '-cov')
