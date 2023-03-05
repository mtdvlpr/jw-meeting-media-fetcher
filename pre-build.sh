#!/bin/bash
# Necessary sql.js file for reading sqlight databases from JWPUB files
cp ./node_modules/sql.js/dist/sql-wasm.wasm ./src/public

# Necessary pdfjs worker file for converting PDFs to images
cp ./node_modules/pdfjs-dist/build/pdf.worker.min.js ./src/public

# Fix for: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573
cp ./node_modules/fluent-ffmpeg/lib/ -r ./node_modules/fluent-ffmpeg/lib-cov/
