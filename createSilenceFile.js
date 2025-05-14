const { execSync } = require('child_process')
const path = require('path')

module.exports.createSilenceFile = async function (duration, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} ${outputPath}`)
      console.log(`[${new Date().toISOString()}] Silence file created: ${outputPath}`)
      resolve()
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating silence file:`, error)
      reject(error)
    }
  })
}

