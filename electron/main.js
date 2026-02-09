const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { downloadVideo, downloadPlaylist, getVideoInfo } = require('./downloader');
const { convertToMP3 } = require('./converter');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#0f0f23',
        titleBarStyle: 'default',
        icon: path.join(__dirname, '../public/icon.png')
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('select-download-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-video-info', async (event, url) => {
    try {
        const info = await getVideoInfo(url);
        return { success: true, data: info };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('download-video', async (event, { url, outputPath, format, quality }) => {
    try {
        const result = await downloadVideo(url, outputPath, quality, (progress) => {
            mainWindow.webContents.send('download-progress', progress);
        });

        if (format === 'mp3') {
            const mp3Path = await convertToMP3(result.filePath, result.metadata, (progress) => {
                mainWindow.webContents.send('conversion-progress', progress);
            });
            return { success: true, filePath: mp3Path };
        }

        return { success: true, filePath: result.filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('download-playlist', async (event, { url, outputPath, format, quality }) => {
    try {
        const results = await downloadPlaylist(url, outputPath, quality, format,
            (progress) => {
                mainWindow.webContents.send('playlist-progress', progress);
            },
            (itemProgress) => {
                mainWindow.webContents.send('download-progress', itemProgress);
            }
        );
        return { success: true, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
