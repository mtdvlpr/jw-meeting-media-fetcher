#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs-extra')

// Fix for: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573
fs.copySync(fluentFfmpegPath, fluentFfmpegPath + '-cov')
