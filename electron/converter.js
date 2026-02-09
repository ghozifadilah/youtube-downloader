const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

async function convertToMP3(inputPath, progressCallback) {
    return new Promise((resolve, reject) => {
        const outputPath = inputPath.replace(/\.[^/.]+$/, '') + '.mp3';

        ffmpeg(inputPath)
            .toFormat('mp3')
            .audioBitrate(320)
            .on('progress', (progress) => {
                if (progressCallback) {
                    progressCallback({
                        percent: progress.percent || 0,
                        currentTime: progress.timemark,
                        status: 'converting'
                    });
                }
            })
            .on('end', () => {
                // Delete the original video file after conversion
                fs.unlink(inputPath, (err) => {
                    if (err) console.error('Error deleting original file:', err);
                });
                resolve(outputPath);
            })
            .on('error', (error) => {
                reject(new Error(`Conversion failed: ${error.message}`));
            })
            .save(outputPath);
    });
}

module.exports = {
    convertToMP3
};
