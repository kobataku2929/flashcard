import { renderHook, act } from '@testing-library/react-native';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { Folder } from '@/types';

const mockFolders: Folder[] = [
  {
    id: 1,
    name: 'Root Folder',
    parentId: null,
    itemCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Child Folder',
    parentId: 1,
    itemCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: 'Grandchild Folder',
    parentId: 2,
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('useFolderNavigation', () => {
  it('should initialize with home folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders })
    );

    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.currentFolder).toBeNull();
    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' }
    ]);
    expect(result.current.canNavigateUp).toBe(false);
  });

  it('should initialize with specified folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders, initialFolderId: 2 })
    );

    expect(result.current.currentFolderId).toBe(2);
    expect(result.current.currentFolder?.name).toBe('Child Folder');
    expect(result.current.canNavigateUp).toBe(true);
  });

  it('should build correct breadcrumbs for nested folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders, initialFolderId: 3 })
    );

    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' },
      { id: 1, name: 'Root Folder' },
      { id: 2, name: 'Child Folder' },
      { id: 3, name: 'Grandchild Folder' },
    ]);
  });

  it('should navigate to folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders })
    );

    act(() => {
      result.current.navigateToFolder(2);
    });

    expect(result.current.currentFolderId).toBe(2);
    expect(result.current.currentFolder?.name).toBe('Child Folder');
    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' },
      { id: 1, name: 'Root Folder' },
      { id: 2, name: 'Child Folder' },
    ]);
  });

  it('should navigate up to parent folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders, initialFolderId: 3 })
    );

    act(() => {
      result.current.navigateUp();
    });

    expect(result.current.currentFolderId).toBe(2);
    expect(result.current.currentFolder?.name).toBe('Child Folder');
  });

  it('should navigate to home', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders, initialFolderId: 2 })
    );

    act(() => {
      result.current.navigateToFolder(null);
    });

    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.currentFolder).toBeNull();
    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' }
    ]);
    expect(result.current.canNavigateUp).toBe(false);
  });

  it('should handle navigation to non-existent folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders })
    );

    act(() => {
      result.current.navigateToFolder(999);
    });

    expect(result.current.currentFolderId).toBe(999);
    expect(result.current.currentFolder).toBeNull();
    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' }
    ]);
  });

  it('should handle folder deletion by navigating to parent', () => {
    const { result, rerender } = renderHook(
      ({ folders }) => useFolderNavigation({ folders, initialFolderId: 3 }),
      { initialProps: { folders: mockFolders } }
    );

    expect(result.current.currentFolderId).toBe(3);

    // Remove the current folder
    const updatedFolders = mockFolders.filter(f => f.id !== 3);
    rerender({ folders: updatedFolders });

    expect(result.current.currentFolderId).toBe(2);
  });

  it('should handle folder deletion by navigating to home when no parent', () => {
    const { result, rerender } = renderHook(
      ({ folders }) => useFolderNavigation({ folders, initialFolderId: 1 }),
      { initialProps: { folders: mockFolders } }
    );

    expect(result.current.currentFolderId).toBe(1);

    // Remove the current folder
    const updatedFolders = mockFolders.filter(f => f.id !== 1);
    rerender({ folders: updatedFolders });

    expect(result.current.currentFolderId).toBeNull();
  });

  it('should build breadcrumbs for root folder', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: mockFolders, initialFolderId: 1 })
    );

    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' },
      { id: 1, name: 'Root Folder' },
    ]);
  });

  it('should handle empty folders array', () => {
    const { result } = renderHook(() =>
      useFolderNavigation({ folders: [] })
    );

    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.currentFolder).toBeNull();
    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' }
    ]);
  });

  it('should handle broken folder hierarchy', () => {
    const brokenFolders: Folder[] = [
      {
        id: 1,
        name: 'Orphan Folder',
        parentId: 999, // Non-existent parent
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const { result } = renderHook(() =>
      useFolderNavigation({ folders: brokenFolders, initialFolderId: 1 })
    );

    expect(result.current.breadcrumbs).toEqual([
      { id: null, name: 'ホーム' },
      { id: 1, name: 'Orphan Folder' },
    ]);
  });
});