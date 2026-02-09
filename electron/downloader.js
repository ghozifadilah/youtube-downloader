const ytdl = require('@distube/ytdl-core');
const ytpl = require('ytpl');
const fs = require('fs');
const path = require('path');

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
}

async function getVideoInfo(url) {
    try {
        const info = await ytdl.getInfo(url);
        return {
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            thumbnail: info.videoDetails.thumbnails[0]?.url,
            duration: info.videoDetails.lengthSeconds,
            isPlaylist: url.includes('list=')
        };
    } catch (error) {
        throw new Error(`Failed to get video info: ${error.message}`);
    }
}

async function downloadVideo(url, outputPath, quality = 'highest', progressCallback) {
    return new Promise(async (resolve, reject) => {
        try {
            const info = await ytdl.getInfo(url);
            const title = sanitizeFilename(info.videoDetails.title);
            const filePath = path.join(outputPath, `${title}.mp4`);

            let format;
            if (quality === 'highest') {
                format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'audioandvideo' });
            } else if (quality === 'audio') {
                format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
            } else {
                format = ytdl.chooseFormat(info.formats, { quality: quality });
            }

            const video = ytdl(url, { format });
            const writeStream = fs.createWriteStream(filePath);

            let downloadedBytes = 0;
            const totalBytes = parseInt(format.contentLength || 0);

            video.on('progress', (chunkLength, downloaded, total) => {
                downloadedBytes = downloaded;
                const percent = (downloaded / total) * 100;

                if (progressCallback) {
                    progressCallback({
                        percent: percent.toFixed(2),
                        downloaded: (downloaded / 1024 / 1024).toFixed(2) + ' MB',
                        total: (total / 1024 / 1024).toFixed(2) + ' MB',
                        title: info.videoDetails.title
                    });
                }
            });

            video.pipe(writeStream);

            writeStream.on('finish', () => {
                resolve({ filePath, title: info.videoDetails.title });
            });

            writeStream.on('error', (error) => {
                reject(error);
            });

            video.on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
}

async function downloadPlaylist(playlistUrl, outputPath, quality, format, playlistProgressCallback, itemProgressCallback) {
    try {
        const playlist = await ytpl(playlistUrl, { limit: Infinity });
        const total = playlist.items.length;
        const results = [];

        playlistProgressCallback({
            total,
            current: 0,
            playlistTitle: playlist.title
        });

        for (let i = 0; i < playlist.items.length; i++) {
            const item = playlist.items[i];

            try {
                const result = await downloadVideo(
                    item.shortUrl,
                    outputPath,
                    quality,
                    itemProgressCallback
                );

                if (format === 'mp3') {
                    const { convertToMP3 } = require('./converter');
                    const mp3Path = await convertToMP3(result.filePath, itemProgressCallback);
                    results.push({ ...result, mp3Path, status: 'success' });
                } else {
                    results.push({ ...result, status: 'success' });
                }

                playlistProgressCallback({
                    total,
                    current: i + 1,
                    playlistTitle: playlist.title
                });

            } catch (error) {
                results.push({
                    title: item.title,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to download playlist: ${error.message}`);
    }
}

module.exports = {
    getVideoInfo,
    downloadVideo,
    downloadPlaylist
};
