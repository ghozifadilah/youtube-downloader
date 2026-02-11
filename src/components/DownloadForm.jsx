import { useState } from 'react';
import './DownloadForm.css';

function DownloadForm({ onDownload, downloadPath, onSelectPath }) {
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState('video');
    const [quality, setQuality] = useState('highest');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!url.trim()) {
            alert('Please enter a YouTube URL');
            return;
        }

        if (!downloadPath) {
            alert('Please select a download location');
            return;
        }

        setIsLoading(true);
        try {
            await onDownload(url, format, quality);
            setUrl('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="download-form-container">
            <form onSubmit={handleSubmit} className="download-form">
                <div className="form-section">
                    <label className="form-label">YouTube URL</label>
                    <input
                        type="text"
                        className="url-input"
                        placeholder="https://www.youtube.com/watch?v=... or playlist URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="form-row">
                    <div className="form-section">
                        <label className="form-label">Format</label>
                        <div className="format-options">
                            <label className={`format-option ${format === 'video' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="format"
                                    value="video"
                                    checked={format === 'video'}
                                    onChange={(e) => setFormat(e.target.value)}
                                    disabled={isLoading}
                                />
                                <span className="option-icon">🎥</span>
                                <span>Video</span>
                            </label>
                            <label className={`format-option ${format === 'mp3' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="format"
                                    value="mp3"
                                    checked={format === 'mp3'}
                                    onChange={(e) => setFormat(e.target.value)}
                                    disabled={isLoading}
                                />
                                <span className="option-icon">🎵</span>
                                <span>MP3</span>
                            </label>
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="form-label">Quality</label>
                        <select
                            className="quality-select"
                            value={quality}
                            onChange={(e) => setQuality(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="highest">Highest Quality</option>
                            <option value="720">720p</option>
                            <option value="480">480p</option>
                            <option value="360">360p</option>
                            {format === 'mp3' && <option value="audio">Audio Only (320kbps)</option>}
                        </select>
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">Download Location</label>
                    <div className="path-selector">
                        <input
                            type="text"
                            className="path-input"
                            value={downloadPath}
                            readOnly
                            placeholder="Click 'Browse' to select folder"
                        />
                        <button
                            type="button"
                            className="browse-btn"
                            onClick={onSelectPath}
                            disabled={isLoading}
                        >
                            📁 Browse
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className={`download-btn ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner"></span>
                            Processing...
                        </>
                    ) : (
                        <>
                            <span className="btn-icon">⬇️</span>
                            Download Now
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

export default DownloadForm;
