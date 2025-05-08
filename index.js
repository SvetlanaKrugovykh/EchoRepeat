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
const DEBUG_LEVEL = Number(process.env.DEBUG_LEVEL) || 1
const TIMEOUT = parseInt(process.env.TIMEOUT) || 20000

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

async function playSegment(segment, repeatCount, playbackRate = 0.5) {
  try {
    if (DEBUG_LEVEL > 2) console.log(`Attempting to load segment: ${segment}`)
    const audioBuffer = await audioLoader(segment)
    if (DEBUG_LEVEL > 2) console.log(`Loaded segment: ${segment}`)

    for (let i = 0; i < repeatCount; i++) {
      if (DEBUG_LEVEL > 2) console.log(`[${new Date().toISOString()}] Playing segment: ${segment}, repeat: ${i + 1}/${repeatCount}`)
      await new Promise((resolve) => {
        const playback = audioPlay(audioBuffer, { loop: false, playbackRate })
        playback.onended = () => {
          if (DEBUG_LEVEL > 2) console.log(`[${new Date().toISOString()}] Finished playing segment: ${segment}, repeat: ${i + 1}`)
          resolve()
        }

        setTimeout(() => {
          if (DEBUG_LEVEL > 2) console.log(`[${new Date().toISOString()}] Timeout reached for segment: ${segment}, repeat: ${i + 1}`)
          resolve()
        }, TIMEOUT)
      })
    }
  } catch (error) {
    console.error(`Error playing segment: ${segment}`, error)
  }
}

(async () => {
  try {
    console.log('Starting audio processing...')
    const segments = await splitAudio(AUDIO_FILE, SEGMENT_DURATION)
    console.log(`Audio split into ${segments.length} segments.`)

    for (const segment of segments) {
      if (DEBUG_LEVEL > 2) console.log(`Processing segment: ${segment}`)
      await playSegment(segment, REPEAT_EACH, 0.2)
    }

    for (const file of segments) {
      if (DEBUG_LEVEL > 2) console.log(`Deleting segment file: ${file}`)
      fs.unlinkSync(file)
    }
    console.log('All segments played and deleted.')
  } catch (error) {
    console.error('Error in main execution:', error)
  }
})()
