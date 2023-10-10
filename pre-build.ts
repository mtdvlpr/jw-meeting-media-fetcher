const path = require('path')
const fs = require('fs-extra')
const fluentFfmpegPath = path.join(
  __dirname,
  'node_modules',
  'fluent-ffmpeg',
  'lib',
)

// Fix for: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573
fs.copySync(fluentFfmpegPath, fluentFfmpegPath + '-cov')
