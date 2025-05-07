const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const inputFile = process.env.AUDIO_FILE
const ext = path.extname(inputFile).toLowerCase()
const isOGG = ext === '.ogg'

if (isOGG) {
  const mp3File = inputFile.replace(/\.ogg$/, '.mp3')
  const outputPath = path.resolve(mp3File)

  if (!fs.existsSync(outputPath)) {
    console.log(`🔄 Convert ${inputFile} → ${mp3File}...`)
    try {
      execSync(`ffmpeg -y -i "${inputFile}" "${mp3File}"`, { stdio: 'inherit' })
      console.log('✅ Convert finished.')
    } catch (err) {
      console.error('❌ Convert error:', err)
      process.exit(1)
    }
  } else {
    console.log('ℹ️ MP3 already exist.')
  }

  process.env.AUDIO_FILE = mp3File
}
