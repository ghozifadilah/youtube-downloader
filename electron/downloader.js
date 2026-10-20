const { spawn, spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

function getYtDlpPath() {
    // 1. Check if bundled yt-dlp binary exists in app or unpack dir
    const appDir = path.join(__dirname, '..');
    const potentialBundled = [
        path.join(appDir, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
        path.join(appDir.replace('app.asar', 'app.asar.unpacked'), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
    ];
    for (const p of potentialBundled) {
        if (fs.existsSync(p)) return p;
    }

    // 2. Try PATH
    try {
        const test = spawnSync('yt-dlp', ['--version'], { windowsHide: true });
        if (test.status === 0) return 'yt-dlp';
    } catch (e) {}

    // 3. Platform-specific fallbacks
    if (process.platform === 'win32') {
        try {
            const whereRes = spawnSync('where.exe', ['yt-dlp'], { encoding: 'utf8', windowsHide: true });
            if (whereRes.status === 0 && whereRes.stdout) {
                const first = whereRes.stdout.trim().split(/\r?\n/)[0];
                if (first && fs.existsSync(first)) return first;
            }
        } catch (e) {}

        const searchRoots = [
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
            path.join(process.env.APPDATA || '', 'Python'),
            path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python')
        ];

        for (const root of searchRoots) {
            if (fs.existsSync(root)) {
                try {
                    const entries = fs.readdirSync(root);
                    for (const entry of entries) {
                        const candidate = path.join(root, entry, 'Scripts', 'yt-dlp.exe');
                        if (fs.existsSync(candidate)) return candidate;
                    }
                } catch (e) {}
            }
        }
    } else {
        // macOS / Linux
        try {
            const whichRes = spawnSync('which', ['yt-dlp'], { encoding: 'utf8' });
            if (whichRes.status === 0 && whichRes.stdout) {
                const first = whichRes.stdout.trim().split(/\n/)[0];
                if (first && fs.existsSync(first)) return first;
            }
        } catch (e) {}
    }

    return 'yt-dlp';
}

function getJsRuntimeArgs() {
    try {
        const test = spawnSync('node', ['-v'], { windowsHide: true });
        if (test.status === 0) {
            return ['--js-runtimes', 'node'];
        }
    } catch (e) {}
    return [];
}

function getFfmpegBinaryPath() {
    let p = ffmpegPath;
    if (p && p.includes('app.asar')) {
        p = p.replace('app.asar', 'app.asar.unpacked');
    }
    return p;
}

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
}

async function getVideoInfo(url) {
    return new Promise((resolve, reject) => {
        const ytDlp = getYtDlpPath();
        const args = [
            ...getJsRuntimeArgs(),
            '--dump-single-json',
            '--flat-playlist',
            url
        ];

        const proc = spawn(ytDlp, args, { windowsHide: true });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', chunk => {
            stdout += chunk;
        });

        proc.stderr.on('data', chunk => {
            stderr += chunk;
        });

        proc.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`Failed to get video info (code ${code}): ${stderr || 'Unknown error'}`));
            }

            try {
                const data = JSON.parse(stdout);
                const isPlaylist = Boolean(
                    data._type === 'playlist' ||
                    (Array.isArray(data.entries) && data.entries.length > 0 && !url.includes('watch?v='))
                );

                const title = data.title || '';
                const author = data.uploader || data.channel || data.artist || '';
                let thumbnail = '';
                const duration = data.duration || 0;
                const album = data.album || '';
                const trackNumber = data.track_number || data.track || '';
                const category = (Array.isArray(data.categories) ? data.categories[0] : data.category) || '';

                if (data.id) {
                    thumbnail = `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`;
                } else if (data.thumbnails && data.thumbnails.length > 0) {
                    thumbnail = data.thumbnails[data.thumbnails.length - 1].url;
                } else if (data.thumbnail) {
                    thumbnail = data.thumbnail;
                }

                if (isPlaylist && (!thumbnail && data.entries && data.entries[0])) {
                    const firstEntry = data.entries[0];
                    if (firstEntry.id) {
                        thumbnail = `https://i.ytimg.com/vi/${firstEntry.id}/hqdefault.jpg`;
                    } else if (firstEntry.thumbnails && firstEntry.thumbnails.length > 0) {
                        thumbnail = firstEntry.thumbnails[firstEntry.thumbnails.length - 1].url;
                    }
                }

                resolve({
                    title: title || '',
                    author: author || '',
                    thumbnail: thumbnail || '',
                    duration: duration,
                    isPlaylist: isPlaylist,
                    album: album || '',
                    trackNumber: trackNumber || '',
                    category: category || ''
                });
            } catch (err) {
                reject(new Error(`Failed to parse video info: ${err.message}`));
            }
        });

        proc.on('error', err => {
            reject(new Error(`Failed to run yt-dlp: ${err.message}. Make sure yt-dlp is installed.`));
        });
    });
}

async function downloadVideo(url, outputPath, quality = 'highest', progressCallback, format = 'video') {
    return new Promise(async (resolve, reject) => {
        try {
            const ytDlp = getYtDlpPath();
            const ffmpegBinary = getFfmpegBinaryPath();

            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
            }

            const args = [
                ...getJsRuntimeArgs(),
                '--newline',
                '--windows-filenames',
                '--progress-template', 'PROGRESS:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(info.title)s',
                '--print', 'after_move:FINAL_PATH:%(filepath)s',
                '--print', 'META:%(title)s\t%(uploader)s\t%(album)s\t%(track_number)s\t%(id)s\t%(thumbnail)s'
            ];

            if (ffmpegBinary) {
                args.push('--ffmpeg-location', ffmpegBinary);
            }

            if (format === 'mp3' || quality === 'audio') {
                args.push('-f', 'bestaudio[ext=m4a]/bestaudio/best');
            } else {
                args.push('--merge-output-format', 'mp4');
                if (quality === 'highest') {
                    args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best');
                } else if (quality === '720') {
                    args.push('-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best');
                } else if (quality === '480') {
                    args.push('-f', 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best');
                } else if (quality === '360') {
                    args.push('-f', 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]/best');
                } else {
                    args.push('-f', 'bestvideo+bestaudio/best');
                }
            }

            args.push('--no-playlist');
            args.push('-o', path.join(outputPath, '%(title)s.%(ext)s'));
            args.push(url);

            const proc = spawn(ytDlp, args, { windowsHide: true });
            let finalPath = '';
            let metaTitle = '';
            let metaArtist = '';
            let metaAlbum = '';
            let metaTrack = '';
            let metaId = '';
            let metaThumb = '';
            let lastReportedTitle = '';
            let stderrOutput = '';

            proc.stdout.on('data', chunk => {
                const lines = chunk.toString().split(/\r?\n/);
                for (const line of lines) {
                    if (line.startsWith('FINAL_PATH:')) {
                        finalPath = line.substring('FINAL_PATH:'.length).trim();
                    } else if (line.startsWith('META:')) {
                        const parts = line.substring('META:'.length).split('\t');
                        metaTitle = parts[0] !== 'NA' ? parts[0] : '';
                        metaArtist = parts[1] !== 'NA' ? parts[1] : '';
                        metaAlbum = parts[2] !== 'NA' ? parts[2] : '';
                        metaTrack = parts[3] !== 'NA' ? parts[3] : '';
                        metaId = parts[4] !== 'NA' ? parts[4] : '';
                        metaThumb = parts[5] !== 'NA' ? parts[5] : '';
                    } else if (line.startsWith('PROGRESS:')) {
                        const parts = line.substring('PROGRESS:'.length).split('|');
                        const percentStr = parts[0] ? parts[0].replace('%', '').trim() : '0';
                        const downloaded = parts[1] ? parts[1].trim() : '0 MB';
                        const total = parts[2] ? parts[2].trim() : '0 MB';
                        const title = parts[3] ? parts[3].trim() : lastReportedTitle;
                        if (title) lastReportedTitle = title;

                        const percent = parseFloat(percentStr) || 0;
                        if (progressCallback) {
                            progressCallback({
                                percent: percent.toFixed(2),
                                downloaded,
                                total,
                                title: title || lastReportedTitle
                            });
                        }
                    }
                }
            });

            proc.stderr.on('data', chunk => {
                stderrOutput += chunk.toString();
            });

            proc.on('close', code => {
                if (code !== 0) {
                    return reject(new Error(`Download failed (code ${code}): ${stderrOutput || 'Unknown error'}`));
                }

                // If finalPath wasn't captured directly via FINAL_PATH
                if (!finalPath) {
                    if (metaTitle) {
                        const safeTitle = sanitizeFilename(metaTitle);
                        const possibleExts = (format === 'mp3' || quality === 'audio')
                            ? ['.m4a', '.webm', '.opus', '.mp3']
                            : ['.mp4', '.mkv', '.webm'];
                        for (const ext of possibleExts) {
                            const candidate = path.join(outputPath, `${safeTitle}${ext}`);
                            if (fs.existsSync(candidate)) {
                                finalPath = candidate;
                                break;
                            }
                        }
                    }
                }

                const resolvedThumb = metaId ? `https://i.ytimg.com/vi/${metaId}/hqdefault.jpg` : metaThumb;

                resolve({
                    filePath: finalPath,
                    title: metaTitle || lastReportedTitle || '',
                    metadata: {
                        title: metaTitle || lastReportedTitle || '',
                        artist: metaArtist || '',
                        album: metaAlbum || '',
                        trackNumber: metaTrack || '',
                        image: resolvedThumb || ''
                    }
                });
            });

            proc.on('error', err => {
                reject(new Error(`Failed to run yt-dlp: ${err.message}. Make sure yt-dlp is installed.`));
            });

        } catch (error) {
            reject(error);
        }
    });
}

async function downloadPlaylist(playlistUrl, outputPath, quality, format, playlistProgressCallback, itemProgressCallback) {
    try {
        const ytDlp = getYtDlpPath();
        const args = [
            ...getJsRuntimeArgs(),
            '--flat-playlist',
            '-J',
            playlistUrl
        ];

        const jsonOutput = await new Promise((resolve, reject) => {
            const proc = spawn(ytDlp, args, { windowsHide: true });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', c => stdout += c);
            proc.stderr.on('data', c => stderr += c);
            proc.on('close', code => {
                if (code !== 0) return reject(new Error(`Failed to read playlist: ${stderr || code}`));
                try {
                    resolve(JSON.parse(stdout));
                } catch (e) {
                    reject(new Error(`Failed to parse playlist data: ${e.message}`));
                }
            });
            proc.on('error', err => {
                reject(new Error(`Failed to run yt-dlp: ${err.message}`));
            });
        });

        const playlistTitle = jsonOutput.title || 'Playlist';
        const entries = Array.isArray(jsonOutput.entries) ? jsonOutput.entries : [];
        const total = entries.length;
        const results = [];

        if (playlistProgressCallback) {
            playlistProgressCallback({
                total,
                current: 0,
                playlistTitle
            });
        }

        for (let i = 0; i < entries.length; i++) {
            const item = entries[i];
            const itemUrl = item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null);
            if (!itemUrl) continue;

            try {
                const result = await downloadVideo(
                    itemUrl,
                    outputPath,
                    quality,
                    itemProgressCallback,
                    format
                );

                if (format === 'mp3') {
                    const { convertToMP3 } = require('./converter');
                    const mp3Path = await convertToMP3(result.filePath, result.metadata, itemProgressCallback);
                    results.push({ ...result, mp3Path, status: 'success' });
                } else {
                    results.push({ ...result, status: 'success' });
                }

                if (playlistProgressCallback) {
                    playlistProgressCallback({
                        total,
                        current: i + 1,
                        playlistTitle
                    });
                }
            } catch (error) {
                results.push({
                    title: item.title || 'Unknown Video',
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
