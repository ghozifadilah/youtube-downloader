import './DownloadQueue.css';

function DownloadQueue({ downloads }) {
    if (downloads.length === 0) {
        return (
            <div className="download-queue-container">
                <div className="queue-header">
                    <h2>Download Queue</h2>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📥</div>
                    <p>No downloads yet</p>
                    <span className="empty-hint">Enter a YouTube URL above to get started</span>
                </div>
            </div>
        );
    }

    return (
        <div className="download-queue-container">
            <div className="queue-header">
                <h2>Download Queue</h2>
                <span className="queue-count">{downloads.length} item{downloads.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="queue-list">
                {downloads.map((download) => (
                    <div key={download.id} className={`queue-item ${download.status}`}>
                        <div className="item-thumbnail">
                            {download.thumbnail ? (
                                <img src={download.thumbnail} alt={download.title} />
                            ) : (
                                <div className="thumbnail-placeholder">
                                    {download.format === 'mp3' ? '🎵' : '🎬'}
                                </div>
                            )}
                        </div>

                        <div className="item-details">
                            <h3 className="item-title">{download.title}</h3>
                            <div className="item-meta">
                                <span className="meta-badge">{download.format.toUpperCase()}</span>
                                <span className="meta-quality">{download.quality}</span>
                                {download.isPlaylist && (
                                    <span className="meta-playlist">
                                        📋 Playlist ({download.playlistCurrent}/{download.playlistTotal})
                                    </span>
                                )}
                            </div>

                            {download.status === 'downloading' && (
                                <div className="progress-info">
                                    <span className="progress-text">
                                        Downloading: {download.downloaded} / {download.total}
                                    </span>
                                </div>
                            )}

                            {download.status === 'converting' && (
                                <div className="progress-info">
                                    <span className="progress-text">Converting to MP3...</span>
                                </div>
                            )}

                            {download.status === 'completed' && (
                                <div className="status-message success">
                                    ✓ Download completed
                                </div>
                            )}

                            {download.status === 'failed' && (
                                <div className="status-message error">
                                    ✗ Failed: {download.error}
                                </div>
                            )}

                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${download.progress}%` }}
                                >
                                    <div className="progress-glow"></div>
                                </div>
                                <span className="progress-percent">{Math.round(download.progress)}%</span>
                            </div>
                        </div>

                        <div className="item-status-icon">
                            {download.status === 'pending' && '⏳'}
                            {download.status === 'downloading' && '⬇️'}
                            {download.status === 'converting' && '🔄'}
                            {download.status === 'completed' && '✅'}
                            {download.status === 'failed' && '❌'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DownloadQueue;
