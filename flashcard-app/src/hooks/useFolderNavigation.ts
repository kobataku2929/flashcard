import { useState, useEffect, useCallback } from 'react';
import { Folder } from '@/types';

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

interface UseFolderNavigationProps {
  folders: Folder[];
  initialFolderId?: number | null;
}

interface UseFolderNavigationReturn {
  currentFolderId: number | null;
  currentFolder: Folder | null;
  breadcrumbs: BreadcrumbItem[];
  navigateToFolder: (folderId: number | null) => void;
  navigateUp: () => void;
  canNavigateUp: boolean;
}

export const useFolderNavigation = ({
  folders,
  initialFolderId = null,
}: UseFolderNavigationProps): UseFolderNavigationReturn => {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(initialFolderId);

  // Find current folder
  const currentFolder = currentFolderId 
    ? folders.find(f => f.id === currentFolderId) || null
    : null;

  // Build breadcrumb trail
  const buildBreadcrumbs = useCallback((folderId: number | null): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always start with home
    breadcrumbs.push({ id: null, name: 'ホーム' });
    
    if (folderId === null) {
      return breadcrumbs;
    }

    // Build path from current folder to root
    const path: Folder[] = [];
    let currentId: number | null = folderId;
    
    while (currentId !== null) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      
      path.unshift(folder);
      currentId = folder.parentId ?? null;
    }

    // Add folders to breadcrumbs
    path.forEach(folder => {
      breadcrumbs.push({
        id: folder.id,
        name: folder.name,
      });
    });

    return breadcrumbs;
  }, [folders]);

  const breadcrumbs = buildBreadcrumbs(currentFolderId);

  // Navigation functions
  const navigateToFolder = useCallback((folderId: number | null) => {
    setCurrentFolderId(folderId);
  }, []);

  const navigateUp = useCallback(() => {
    if (currentFolder?.parentId !== undefined) {
      setCurrentFolderId(currentFolder.parentId);
    }
  }, [currentFolder]);

  const canNavigateUp = currentFolder !== null;

  // Update current folder when folders change
  useEffect(() => {
    if (currentFolderId && !folders.find(f => f.id === currentFolderId)) {
      // Current folder no longer exists, navigate to parent or home
      if (currentFolder?.parentId !== undefined) {
        setCurrentFolderId(currentFolder.parentId);
      } else {
        setCurrentFolderId(null);
      }
    }
  }, [folders, currentFolderId, currentFolder]);

  return {
    currentFolderId,
    currentFolder,
    breadcrumbs,
    navigateToFolder,
    navigateUp,
    canNavigateUp,
  };
};