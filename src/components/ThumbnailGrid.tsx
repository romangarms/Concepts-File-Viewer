import type { FileHandleInfo, DirectoryHandleInfo } from '../types/gallery.js';

interface ThumbnailGridProps {
  files: FileHandleInfo[];
  subdirectories: DirectoryHandleInfo[];
  onFileClick: (file: FileHandleInfo) => void;
  onDirectoryClick: (directory: DirectoryHandleInfo) => void;
}

export function ThumbnailGrid({
  files,
  subdirectories,
  onFileClick,
  onDirectoryClick,
}: ThumbnailGridProps) {
  return (
    <div className="thumbnail-grid">
      {/* Render subdirectories first */}
      {subdirectories.map(subdir => (
        <div
          key={subdir.name}
          className="thumbnail-card directory-card"
          onClick={() => onDirectoryClick(subdir)}
        >
          <div className="thumbnail-content folder-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="thumbnail-name">{subdir.name}</div>
          {subdir.fileCount !== undefined && (
            <div className="thumbnail-count">{subdir.fileCount} files</div>
          )}
        </div>
      ))}

      {/* Render files */}
      {files.map(file => (
        <div
          key={file.fullName}
          className="thumbnail-card file-card"
          onClick={() => onFileClick(file)}
        >
          <div className="thumbnail-content">
            {file.isLoading ? (
              <div className="thumbnail-loading">
                <div className="spinner"></div>
              </div>
            ) : file.thumbnail ? (
              <img src={file.thumbnail} alt={file.name} />
            ) : (
              <div className="thumbnail-placeholder">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            )}
          </div>
          <div className="thumbnail-name">{file.name}</div>
        </div>
      ))}

      {/* Empty state */}
      {files.length === 0 && subdirectories.length === 0 && (
        <div className="empty-state">
          <p>No .concept files found in this directory</p>
        </div>
      )}
    </div>
  );
}
