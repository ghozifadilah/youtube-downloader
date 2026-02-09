const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectDownloadPath: () => ipcRenderer.invoke('select-download-path'),

    getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),

    downloadVideo: (options) => ipcRenderer.invoke('download-video', options),

    downloadPlaylist: (options) => ipcRenderer.invoke('download-playlist', options),

    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },

    onConversionProgress: (callback) => {
        ipcRenderer.on('conversion-progress', (event, progress) => callback(progress));
    },

    onPlaylistProgress: (callback) => {
        ipcRenderer.on('playlist-progress', (event, progress) => callback(progress));
    }
});
