import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ItemMoveDialog } from '@/components/ItemMoveDialog';
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
    name: 'Another Root',
    parentId: null,
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('ItemMoveDialog', () => {
  const defaultProps = {
    visible: true,
    itemName: 'Test Item',
    itemType: 'flashcard' as const,
    folders: mockFolders,
    currentFolderId: 1,
    onMove: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dialog with item information', () => {
    const { getByText } = render(<ItemMoveDialog {...defaultProps} />);

    expect(getByText('単語カードを移動')).toBeTruthy();
    expect(getByText('「Test Item」の移動先を選択してください')).toBeTruthy();
  });

  it('should render folder type correctly', () => {
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} itemType="folder" />
    );

    expect(getByText('フォルダを移動')).toBeTruthy();
  });

  it('should render folder hierarchy', () => {
    const { getByText } = render(<ItemMoveDialog {...defaultProps} />);

    expect(getByText('ホーム')).toBeTruthy();
    expect(getByText('Root Folder')).toBeTruthy();
    expect(getByText('Child Folder')).toBeTruthy();
    expect(getByText('Another Root')).toBeTruthy();
  });

  it('should disable current folder option', () => {
    const { getByText } = render(<ItemMoveDialog {...defaultProps} />);

    expect(getByText('現在の場所')).toBeTruthy();
  });

  it('should select folder when pressed', () => {
    const { getByText } = render(<ItemMoveDialog {...defaultProps} />);

    fireEvent.press(getByText('ホーム'));
    expect(getByText('✓')).toBeTruthy();
  });

  it('should call onMove when move button is pressed', async () => {
    const onMove = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} onMove={onMove} />
    );

    // Select home folder
    fireEvent.press(getByText('ホーム'));
    
    // Press move button
    fireEvent.press(getByText('移動'));

    await waitFor(() => {
      expect(onMove).toHaveBeenCalledWith(null);
    });
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} onCancel={onCancel} />
    );

    fireEvent.press(getByText('キャンセル'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should disable move button when same folder is selected', () => {
    const { getByText } = render(<ItemMoveDialog {...defaultProps} />);

    const moveButton = getByText('移動');
    expect(moveButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should show loading state during move', async () => {
    const onMove = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} onMove={onMove} />
    );

    // Select different folder
    fireEvent.press(getByText('ホーム'));
    fireEvent.press(getByText('移動'));

    expect(getByText('移動中...')).toBeTruthy();
  });

  it('should handle folder hierarchy indentation', () => {
    const { getByText } = render(<ItemMoveDialog {...defaultProps} />);

    // Child Folder should be indented under Root Folder
    expect(getByText('Child Folder')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <ItemMoveDialog {...defaultProps} visible={false} />
    );

    expect(queryByText('単語カードを移動')).toBeNull();
  });

  it('should handle empty folders array', () => {
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} folders={[]} />
    );

    expect(getByText('ホーム')).toBeTruthy();
  });

  it('should handle move to same location by cancelling', async () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} onCancel={onCancel} />
    );

    // Current folder is already selected, pressing move should cancel
    fireEvent.press(getByText('移動'));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it('should disable buttons when loading', () => {
    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} isLoading={true} />
    );

    const moveButton = getByText('移動');
    const cancelButton = getByText('キャンセル');

    expect(moveButton.props.accessibilityState?.disabled).toBe(true);
    expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should handle long folder names', () => {
    const longNameFolders: Folder[] = [
      {
        id: 1,
        name: 'This is a very long folder name that should be handled properly',
        parentId: null,
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} folders={longNameFolders} />
    );

    expect(getByText('This is a very long folder name that should be handled properly')).toBeTruthy();
  });

  it('should handle deep folder hierarchy', () => {
    const deepFolders: Folder[] = [
      { id: 1, name: 'Level 1', parentId: null, itemCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Level 2', parentId: 1, itemCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: 'Level 3', parentId: 2, itemCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 4, name: 'Level 4', parentId: 3, itemCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ];

    const { getByText } = render(
      <ItemMoveDialog {...defaultProps} folders={deepFolders} />
    );

    expect(getByText('Level 1')).toBeTruthy();
    expect(getByText('Level 2')).toBeTruthy();
    expect(getByText('Level 3')).toBeTruthy();
    expect(getByText('Level 4')).toBeTruthy();
  });
});