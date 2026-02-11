# YouTube Downloader & MP3 Converter

A modern desktop application built with Electron and React that allows you to download YouTube videos and convert them to MP3.

[![Download v1.0.0](https://img.shields.io/badge/Download-v1.0.0-blue?style=for-the-badge)](https://github.com/ghozifadilah/youtube-downloader/releases/tag/v1.0.0)


## Features

- 🎬 Download single YouTube videos
- 🎵 Convert videos to MP3 (320kbps)
- 📋 Download entire playlists
- ⚡ Real-time progress tracking
- 🎨 Beautiful, modern UI with dark theme
- 💾 Choose custom download location

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start the Vite dev server
npm run dev

# In a separate terminal, run Electron
npm run electron:dev
```

## Building

```bash
# Build for production
npm run electron:build
```

The built application will be in the `release` folder.

## Usage

1. Launch the application
2. Select a download location using the "Browse" button
3. Paste a YouTube video or playlist URL
4. Choose format (Video or MP3)
5. Select quality
6. Click "Download Now"

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI library
- **Vite** - Build tool
- **@distube/ytdl-core** - YouTube downloader
- **FFmpeg** - Media conversion

## License

MIT
