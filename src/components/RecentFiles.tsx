import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecentFiles,
  removeRecentFile,
  clearRecentFiles,
  formatFileSize,
  formatDate,
  type RecentFile,
} from '../utils/recentFiles.js';
import { FileHandler } from '../fileHandler.js';

const fileHandler = new FileHandler();

export function RecentFiles() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    const recentFiles = await getRecentFiles();
    setFiles(recentFiles);
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleOpenFile = async (file: RecentFile) => {
    try {
      // Create a File object from the stored ArrayBuffer
      const blob = new Blob([file.data]);
      const fileObj = new File([blob], file.name, { type: 'application/octet-stream' });

      // Process the file
      const data = await fileHandler.processConceptFile(fileObj);

      // Navigate to viewer
      navigate('/viewer', { state: { data } });
    } catch (error) {
      console.error('Failed to open recent file:', error);
    }
  };

  const handleRemoveFile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeRecentFile(id);
    loadFiles();
  };

  const handleClearAll = async () => {
    await clearRecentFiles();
    loadFiles();
  };

  if (loading) return null;
  if (files.length === 0) return null;

  return (
    <div className="recent-files">
      <div className="recent-files-header">
        <h3>Recent Files</h3>
        <button className="clear-all-button" onClick={handleClearAll}>
          Clear All
        </button>
      </div>
      <div className="recent-files-list">
        {files.map((file) => (
          <div key={file.id} className="recent-file-item" onClick={() => handleOpenFile(file)}>
            <div className="recent-file-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="recent-file-info">
              <span className="recent-file-name">{file.name}</span>
              <span className="recent-file-meta">
                {formatFileSize(file.size)} · {formatDate(file.lastOpened)}
              </span>
            </div>
            <button
              className="recent-file-remove"
              onClick={(e) => handleRemoveFile(e, file.id)}
              title="Remove from recent files"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
