require('dotenv').config()
const ffmpeg = require('fluent-ffmpeg')
const audioPlay = require('audio-play')
const audioLoader = require('audio-loader')
const player = require('play-sound')()
const fs = require('fs')
const path = require('path')

require('./src/convert-if-needed')

const AUDIO_FILE = process.env.AUDIO_FILE
const SEGMENT_DURATION = parseFloat(process.env.SEGMENT_DURATION || '5')
const REPEAT_EACH = parseInt(process.env.REPEAT_EACH || '2')

const OUTPUT_DIR = path.resolve(__dirname, 'output')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR)
}

function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) return reject(err)
      resolve(metadata.format.duration)
    })
  })
}

async function splitAudio(file, segmentDuration) {
  const duration = await getAudioDuration(file)
  const segments = []

  for (let i = 0; i < duration; i += segmentDuration) {
    const output = path.join(OUTPUT_DIR, `segment_${i}.mp3`)
    await new Promise((res, rej) => {
      ffmpeg(file)
        .setStartTime(i)
        .duration(segmentDuration)
        .output(output)
        .on('end', () => {
          segments.push(output)
          res()
        })
        .on('error', rej)
        .run()
    })
  }

  return segments
}

async function playSegment(segment, repeatCount) {
  const audioBuffer = await audioLoader(segment)
  for (let i = 0; i < repeatCount; i++) {
    await new Promise((resolve) => {
      const playback = audioPlay(audioBuffer, { loop: false }, resolve)
      playback.onended = resolve
    })
  }
}

(async () => {
  const segments = await splitAudio(AUDIO_FILE, SEGMENT_DURATION)
  for (const segment of segments) {
    await playSegment(segment, REPEAT_EACH)
  }

  for (const file of segments) {
    fs.unlinkSync(file)
  }

})()
