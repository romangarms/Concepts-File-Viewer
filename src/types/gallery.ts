// Types for gallery/file browser functionality

export interface FileHandleInfo {
  name: string;              // Display name (without .concept extension)
  fullName: string;          // Full filename including extension
  fileHandle: FileSystemFileHandle;
  size: number;
  modified: number;
  thumbnail?: string;        // Base64 data URL, loaded on-demand
  isLoading?: boolean;       // True while thumbnail is being extracted
}

export interface DirectoryHandleInfo {
  name: string;
  dirHandle: FileSystemDirectoryHandle;
  fileCount?: number;        // Number of .concept files, counted on-demand
}

export interface DirectoryContents {
  files: FileHandleInfo[];
  subdirectories: DirectoryHandleInfo[];
}
