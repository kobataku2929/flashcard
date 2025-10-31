import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FolderNavigator } from '@/components/FolderNavigator';
import { Folder } from '@/types';

const mockFolder: Folder = {
  id: 1,
  name: 'Test Folder',
  parentId: null,
  itemCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBreadcrumbs = [
  { id: null, name: 'ホーム' },
  { id: 1, name: 'Test Folder' },
];

describe('FolderNavigator', () => {
  const defaultProps = {
    currentFolder: mockFolder,
    breadcrumbs: mockBreadcrumbs,
    onNavigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render current folder name and item count', () => {
    const { getByText } = render(<FolderNavigator {...defaultProps} />);

    expect(getByText('Test Folder')).toBeTruthy();
    expect(getByText('5 個のアイテム')).toBeTruthy();
  });

  it('should render home when no current folder', () => {
    const { getByText } = render(
      <FolderNavigator 
        {...defaultProps} 
        currentFolder={null}
        breadcrumbs={[{ id: null, name: 'ホーム' }]}
      />
    );

    expect(getByText('ホーム')).toBeTruthy();
  });

  it('should show back button when in a folder', () => {
    const { getByText } = render(<FolderNavigator {...defaultProps} />);

    expect(getByText('‹ 戻る')).toBeTruthy();
  });

  it('should not show back button when at home', () => {
    const { queryByText } = render(
      <FolderNavigator 
        {...defaultProps} 
        currentFolder={null}
        breadcrumbs={[{ id: null, name: 'ホーム' }]}
      />
    );

    expect(queryByText('‹ 戻る')).toBeNull();
  });

  it('should call onNavigate when back button is pressed', () => {
    const onNavigate = jest.fn();
    const folderWithParent = { ...mockFolder, parentId: 2 };
    
    const { getByText } = render(
      <FolderNavigator 
        {...defaultProps} 
        currentFolder={folderWithParent}
        onNavigate={onNavigate}
      />
    );

    fireEvent.press(getByText('‹ 戻る'));
    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  it('should render breadcrumbs', () => {
    const { getByText } = render(<FolderNavigator {...defaultProps} />);

    expect(getByText('ホーム')).toBeTruthy();
    expect(getByText('Test Folder')).toBeTruthy();
  });

  it('should call onNavigate when breadcrumb is pressed', () => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <FolderNavigator {...defaultProps} onNavigate={onNavigate} />
    );

    fireEvent.press(getByText('ホーム'));
    expect(onNavigate).toHaveBeenCalledWith(null);
  });

  it('should not allow pressing active breadcrumb', () => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <FolderNavigator {...defaultProps} onNavigate={onNavigate} />
    );

    // The last breadcrumb (Test Folder) should be disabled
    const activeItem = getByText('Test Folder');
    fireEvent.press(activeItem);
    
    // Should not navigate when pressing active breadcrumb
    expect(onNavigate).not.toHaveBeenCalledWith(1);
  });

  it('should show create folder button when onCreateFolder is provided', () => {
    const onCreateFolder = jest.fn();
    const { getByText } = render(
      <FolderNavigator {...defaultProps} onCreateFolder={onCreateFolder} />
    );

    expect(getByText('📁 新しいフォルダ')).toBeTruthy();
  });

  it('should call onCreateFolder when create button is pressed', () => {
    const onCreateFolder = jest.fn();
    const { getByText } = render(
      <FolderNavigator {...defaultProps} onCreateFolder={onCreateFolder} />
    );

    fireEvent.press(getByText('📁 新しいフォルダ'));
    expect(onCreateFolder).toHaveBeenCalled();
  });

  it('should show import button when onImport is provided', () => {
    const onImport = jest.fn();
    const { getByText } = render(
      <FolderNavigator {...defaultProps} onImport={onImport} />
    );

    expect(getByText('📥 TSVインポート')).toBeTruthy();
  });

  it('should call onImport when import button is pressed', () => {
    const onImport = jest.fn();
    const { getByText } = render(
      <FolderNavigator {...defaultProps} onImport={onImport} />
    );

    fireEvent.press(getByText('📥 TSVインポート'));
    expect(onImport).toHaveBeenCalled();
  });

  it('should handle long breadcrumb paths', () => {
    const longBreadcrumbs = [
      { id: null, name: 'ホーム' },
      { id: 1, name: 'Level 1' },
      { id: 2, name: 'Level 2' },
      { id: 3, name: 'Level 3' },
      { id: 4, name: 'Current Folder' },
    ];

    const { getByText } = render(
      <FolderNavigator 
        {...defaultProps} 
        breadcrumbs={longBreadcrumbs}
      />
    );

    expect(getByText('ホーム')).toBeTruthy();
    expect(getByText('Level 1')).toBeTruthy();
    expect(getByText('Level 2')).toBeTruthy();
    expect(getByText('Level 3')).toBeTruthy();
    expect(getByText('Current Folder')).toBeTruthy();
  });

  it('should handle folder with zero items', () => {
    const emptyFolder = { ...mockFolder, itemCount: 0 };
    const { getByText } = render(
      <FolderNavigator {...defaultProps} currentFolder={emptyFolder} />
    );

    expect(getByText('0 個のアイテム')).toBeTruthy();
  });

  it('should handle folder without item count', () => {
    const folderWithoutCount = { ...mockFolder, itemCount: undefined };
    const { getByText } = render(
      <FolderNavigator {...defaultProps} currentFolder={folderWithoutCount} />
    );

    expect(getByText('0 個のアイテム')).toBeTruthy();
  });
});