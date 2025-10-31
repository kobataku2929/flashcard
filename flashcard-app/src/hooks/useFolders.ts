// Folder-specific hooks

import { useMemo } from 'react';
import { useAppContext } from '@/context';
import { Folder } from '@/types';

export function useFolders() {
  const { state, actions } = useAppContext();

  // Get root folders (folders without parent)
  const rootFolders = useMemo(() => {
    return state.folders.filter(folder => !folder.parentId);
  }, [state.folders]);

  // Get subfolders for current folder
  const currentFolderSubfolders = useMemo(() => {
    const currentFolderId = state.currentFolder?.id;
    return state.folders.filter(folder => folder.parentId === currentFolderId);
  }, [state.folders, state.currentFolder]);

  // Get folders by parent ID
  const getFoldersByParent = (parentId: number | null) => {
    return state.folders.filter(folder => 
      parentId ? folder.parentId === parentId : !folder.parentId
    );
  };

  // Get folder by ID
  const getFolderById = (id: number): Folder | undefined => {
    return state.folders.find(folder => folder.id === id);
  };

  // Get folder path (breadcrumb)
  const getFolderPath = (folderId: number): Folder[] => {
    const path: Folder[] = [];
    let currentId: number | null = folderId;

    while (currentId) {
      const folder = getFolderById(currentId);
      if (!folder) break;
      
      path.unshift(folder);
      currentId = folder.parentId || null;
    }

    return path;
  };

  // Get current folder path
  const currentFolderPath = useMemo(() => {
    return state.currentFolder ? getFolderPath(state.currentFolder.id) : [];
  }, [state.currentFolder, state.folders]);

  // Check if folder has children
  const hasChildren = (folderId: number): boolean => {
    return state.folders.some(folder => folder.parentId === folderId);
  };

  // Get folder tree structure
  const folderTree = useMemo(() => {
    const buildTree = (parentId: number | null = null): Folder[] => {
      return state.folders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id),
        }));
    };

    return buildTree();
  }, [state.folders]);

  // Get folder statistics
  const folderStats = useMemo(() => {
    const total = state.folders.length;
    const rootCount = rootFolders.length;
    const maxDepth = Math.max(
      ...state.folders.map(folder => getFolderPath(folder.id).length),
      0
    );

    return {
      total,
      rootCount,
      maxDepth,
    };
  }, [state.folders, rootFolders]);

  return {
    // Data
    folders: state.folders,
    rootFolders,
    currentFolder: state.currentFolder,
    currentFolderSubfolders,
    currentFolderPath,
    folderTree,
    folderStats,
    loading: state.loading,
    error: state.error,

    // Actions
    loadFolders: actions.loadFolders,
    createFolder: actions.createFolder,
    updateFolder: actions.updateFolder,
    deleteFolder: actions.deleteFolder,
    navigateToFolder: actions.navigateToFolder,
    moveFolder: (id: number, parentId?: number) => 
      actions.moveItem(id, 'folder', parentId),

    // Utilities
    getFoldersByParent,
    getFolderById,
    getFolderPath,
    hasChildren,
  };
}