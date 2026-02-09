const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const nodeID3 = require('node-id3');
const axios = require('axios');

ffmpeg.setFfmpegPath(ffmpegPath);

async function getImageBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error('Failed to fetch thumbnail buffer:', error);
        return null;
    }
}

async function convertToMP3(inputPath, metadata, progressCallback) {
    return new Promise(async (resolve, reject) => {
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
            .on('end', async () => {
                try {
                    // Add metadata
                    if (metadata) {
                        const tags = {
                            title: metadata.title,
                            artist: metadata.artist,
                            album: metadata.album,
                            trackNumber: metadata.trackNumber,
                            APIC: metadata.image ? await getImageBuffer(metadata.image) : undefined
                        };

                        nodeID3.write(tags, outputPath);
                    }

                    // Delete the original video file after conversion
                    fs.unlink(inputPath, (err) => {
                        if (err) console.error('Error deleting original file:', err);
                    });
                    resolve(outputPath);
                } catch (error) {
                    reject(new Error(`Failed to write metadata: ${error.message}`));
                }
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
