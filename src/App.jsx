import { useState, useEffect } from 'react';
import './App.css';
import DownloadForm from './components/DownloadForm';
import DownloadQueue from './components/DownloadQueue';

function App() {
  const [downloads, setDownloads] = useState([]);
  const [downloadPath, setDownloadPath] = useState('');

  useEffect(() => {
    // Set up progress listeners
    if (window.electronAPI) {
      window.electronAPI.onDownloadProgress((progress) => {
        setDownloads(prev => {
          const newDownloads = [...prev];
          const current = newDownloads[newDownloads.length - 1];
          if (current) {
            current.progress = parseFloat(progress.percent);
            current.downloaded = progress.downloaded;
            current.total = progress.total;
            current.status = 'downloading';
          }
          return newDownloads;
        });
      });

      window.electronAPI.onConversionProgress((progress) => {
        setDownloads(prev => {
          const newDownloads = [...prev];
          const current = newDownloads[newDownloads.length - 1];
          if (current) {
            current.progress = parseFloat(progress.percent) || 0;
            current.status = 'converting';
          }
          return newDownloads;
        });
      });

      window.electronAPI.onPlaylistProgress((progress) => {
        setDownloads(prev => {
          const newDownloads = [...prev];
          const playlistDownload = newDownloads.find(d => d.isPlaylist);
          if (playlistDownload) {
            playlistDownload.playlistCurrent = progress.current;
            playlistDownload.playlistTotal = progress.total;
          }
          return newDownloads;
        });
      });
    }
  }, []);

  const handleDownload = async (url, format, quality) => {
    if (!downloadPath) {
      alert('Please select a download location first!');
      return;
    }

    try {
      // Get video info first
      const infoResult = await window.electronAPI.getVideoInfo(url);

      if (!infoResult.success) {
        alert('Failed to get video info: ' + infoResult.error);
        return;
      }

      const isPlaylist = infoResult.data.isPlaylist;

      // Add to download queue
      const newDownload = {
        id: Date.now(),
        title: infoResult.data.title,
        thumbnail: infoResult.data.thumbnail,
        format,
        quality,
        progress: 0,
        status: 'pending',
        isPlaylist,
        playlistCurrent: 0,
        playlistTotal: 0
      };

      setDownloads(prev => [...prev, newDownload]);

      // Start download
      let result;
      if (isPlaylist) {
        result = await window.electronAPI.downloadPlaylist({
          url,
          outputPath: downloadPath,
          format,
          quality
        });
      } else {
        result = await window.electronAPI.downloadVideo({
          url,
          outputPath: downloadPath,
          format,
          quality
        });
      }

      if (result.success) {
        setDownloads(prev => {
          const updated = [...prev];
          const download = updated.find(d => d.id === newDownload.id);
          if (download) {
            download.status = 'completed';
            download.progress = 100;
            download.filePath = result.filePath;
          }
          return updated;
        });
      } else {
        setDownloads(prev => {
          const updated = [...prev];
          const download = updated.find(d => d.id === newDownload.id);
          if (download) {
            download.status = 'failed';
            download.error = result.error;
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: ' + error.message);
    }
  };

  const handleSelectPath = async () => {
    const path = await window.electronAPI.selectDownloadPath();
    if (path) {
      setDownloadPath(path);
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="icon">🎵</span>
            YT Downloader
          </h1>
          <p className="app-subtitle">Download YouTube videos & convert to MP3</p>
        </div>
      </div>

      <div className="app-container">
        <DownloadForm
          onDownload={handleDownload}
          downloadPath={downloadPath}
          onSelectPath={handleSelectPath}
        />

        <DownloadQueue downloads={downloads} />
      </div>
    </div>
  );
}

export default App;
