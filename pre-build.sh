#!/bin/bash
# Necessary sql.js file for reading sqlight databases from JWPUB files
cp ./node_modules/sql.js/dist/sql-wasm.wasm ./src/public

# Necessary pdfjs worker file for converting PDFs to images
cp ./node_modules/pdfjs-dist/build/pdf.worker.min.js ./src/public
