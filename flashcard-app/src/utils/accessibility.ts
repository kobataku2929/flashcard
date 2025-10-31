/**
 * Accessibility utilities for improved user experience
 */

import { AccessibilityInfo, Platform } from 'react-native';
import React from 'react';

/**
 * Accessibility roles for different UI elements
 */
export const AccessibilityRoles = {
  BUTTON: 'button',
  LINK: 'link',
  TEXT: 'text',
  HEADER: 'header',
  IMAGE: 'image',
  LIST: 'list',
  LIST_ITEM: 'listitem',
  TAB: 'tab',
  TAB_LIST: 'tablist',
  SEARCH: 'search',
  MENU: 'menu',
  MENU_ITEM: 'menuitem',
  DIALOG: 'dialog',
  ALERT: 'alert',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SWITCH: 'switch',
  SLIDER: 'slider',
  PROGRESS_BAR: 'progressbar',
} as const;

/**
 * Accessibility traits for iOS
 */
export const AccessibilityTraits = {
  NONE: 'none',
  BUTTON: 'button',
  LINK: 'link',
  HEADER: 'header',
  SEARCH: 'search',
  IMAGE: 'image',
  SELECTED: 'selected',
  PLAYS_SOUND: 'playsSound',
  KEYBOARD_KEY: 'keyboardKey',
  STATIC_TEXT: 'staticText',
  SUMMARY_ELEMENT: 'summaryElement',
  NOT_ENABLED: 'notEnabled',
  UPDATES_FREQUENTLY: 'updatesFrequently',
  STARTS_MEDIA_SESSION: 'startsMediaSession',
  ADJUSTABLE: 'adjustable',
  ALLOWS_DIRECT_INTERACTION: 'allowsDirectInteraction',
  CAUSES_PAGE_TURN: 'causesPageTurn',
} as const;

/**
 * Common accessibility props generator
 */
export function createAccessibilityProps(options: {
  label?: string;
  hint?: string;
  role?: string;
  state?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    expanded?: boolean;
    busy?: boolean;
  };
  value?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  actions?: Array<{
    name: string;
    label?: string;
  }>;
}) {
  const {
    label,
    hint,
    role,
    state,
    value,
    actions,
  } = options;

  const props: any = {};

  // Basic accessibility props
  if (label) {
    props.accessibilityLabel = label;
  }

  if (hint) {
    props.accessibilityHint = hint;
  }

  if (role) {
    props.accessibilityRole = role;
  }

  // State information
  if (state) {
    props.accessibilityState = state;
  }

  // Value information
  if (value) {
    props.accessibilityValue = value;
  }

  // Custom actions
  if (actions) {
    props.accessibilityActions = actions;
  }

  return props;
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
  private static isScreenReaderEnabled: boolean | null = null;

  static async checkScreenReaderEnabled(): Promise<boolean> {
    try {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.isScreenReaderEnabled = isEnabled;
      return isEnabled;
    } catch (error) {
      console.warn('Failed to check screen reader status:', error);
      return false;
    }
  }

  static getScreenReaderStatus(): boolean | null {
    return this.isScreenReaderEnabled;
  }

  static announceForAccessibility(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  static setAccessibilityFocus(reactTag: number): void {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }
}

/**
 * Hook for screen reader detection
 */
export function useScreenReader() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const checkScreenReader = async () => {
      const isEnabled = await ScreenReaderUtils.checkScreenReaderEnabled();
      if (isMounted) {
        setIsScreenReaderEnabled(isEnabled);
      }
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled: boolean) => {
        if (isMounted) {
          setIsScreenReaderEnabled(isEnabled);
          ScreenReaderUtils.isScreenReaderEnabled = isEnabled;
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return {
    isScreenReaderEnabled,
    announceForAccessibility: ScreenReaderUtils.announceForAccessibility,
    setAccessibilityFocus: ScreenReaderUtils.setAccessibilityFocus,
  };
}

/**
 * Accessibility props for flashcard components
 */
export const FlashcardAccessibility = {
  card: (flashcard: { word: string; translation: string; memo?: string }) =>
    createAccessibilityProps({
      label: `単語カード: ${flashcard.word}`,
      hint: 'タップして裏面を表示',
      role: AccessibilityRoles.BUTTON,
    }),

  cardFlipped: (flashcard: { word: string; translation: string; memo?: string }) =>
    createAccessibilityProps({
      label: `単語カード裏面: ${flashcard.translation}`,
      hint: 'タップして表面を表示',
      role: AccessibilityRoles.BUTTON,
    }),

  memoButton: (hasContent: boolean) =>
    createAccessibilityProps({
      label: 'メモを表示',
      hint: hasContent ? 'メモの内容を確認できます' : 'メモはありません',
      role: AccessibilityRoles.BUTTON,
      state: { disabled: !hasContent },
    }),

  studyButton: (difficulty: 'easy' | 'medium' | 'hard') => {
    const labels = {
      easy: '簡単',
      medium: '普通',
      hard: '難しい',
    };

    return createAccessibilityProps({
      label: `${labels[difficulty]}として回答`,
      hint: `この単語を${labels[difficulty]}として記録します`,
      role: AccessibilityRoles.BUTTON,
    });
  },
};

/**
 * Accessibility props for folder components
 */
export const FolderAccessibility = {
  folder: (folder: { name: string; itemCount?: number }) =>
    createAccessibilityProps({
      label: `フォルダ: ${folder.name}`,
      hint: `${folder.itemCount || 0}個のアイテムが含まれています。タップして開く`,
      role: AccessibilityRoles.BUTTON,
    }),

  folderList: () =>
    createAccessibilityProps({
      label: 'フォルダとカードの一覧',
      role: AccessibilityRoles.LIST,
    }),

  createButton: () =>
    createAccessibilityProps({
      label: '新規作成',
      hint: '新しいフォルダまたはカードを作成',
      role: AccessibilityRoles.BUTTON,
    }),

  searchField: () =>
    createAccessibilityProps({
      label: '検索',
      hint: 'フォルダやカードを検索',
      role: AccessibilityRoles.SEARCH,
    }),
};

/**
 * Accessibility props for form components
 */
export const FormAccessibility = {
  textInput: (label: string, required: boolean = false, error?: string) =>
    createAccessibilityProps({
      label: required ? `${label} (必須)` : label,
      hint: error || undefined,
      role: AccessibilityRoles.TEXT,
      state: { disabled: false },
    }),

  submitButton: (isLoading: boolean = false) =>
    createAccessibilityProps({
      label: isLoading ? '保存中...' : '保存',
      hint: isLoading ? '処理中です' : '入力内容を保存します',
      role: AccessibilityRoles.BUTTON,
      state: { disabled: isLoading, busy: isLoading },
    }),

  cancelButton: () =>
    createAccessibilityProps({
      label: 'キャンセル',
      hint: '変更を破棄して戻ります',
      role: AccessibilityRoles.BUTTON,
    }),

  deleteButton: () =>
    createAccessibilityProps({
      label: '削除',
      hint: '警告: この操作は取り消せません',
      role: AccessibilityRoles.BUTTON,
    }),
};

/**
 * Accessibility props for navigation components
 */
export const NavigationAccessibility = {
  backButton: () =>
    createAccessibilityProps({
      label: '戻る',
      hint: '前の画面に戻ります',
      role: AccessibilityRoles.BUTTON,
    }),

  tabButton: (label: string, isSelected: boolean) =>
    createAccessibilityProps({
      label,
      hint: isSelected ? '現在選択中' : `${label}タブに切り替え`,
      role: AccessibilityRoles.TAB,
      state: { selected: isSelected },
    }),

  menuItem: (label: string, description?: string) =>
    createAccessibilityProps({
      label,
      hint: description,
      role: AccessibilityRoles.MENU_ITEM,
    }),
};

/**
 * Accessibility props for study session components
 */
export const StudyAccessibility = {
  progressBar: (current: number, total: number) =>
    createAccessibilityProps({
      label: `学習進捗: ${current}/${total}`,
      role: AccessibilityRoles.PROGRESS_BAR,
      value: {
        min: 0,
        max: total,
        now: current,
        text: `${Math.round((current / total) * 100)}%`,
      },
    }),

  scoreDisplay: (correct: number, total: number) =>
    createAccessibilityProps({
      label: `正解数: ${correct}/${total}`,
      hint: `正答率${Math.round((correct / total) * 100)}%`,
      role: AccessibilityRoles.TEXT,
    }),

  timerDisplay: (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeString = `${minutes}分${remainingSeconds}秒`;

    return createAccessibilityProps({
      label: `経過時間: ${timeString}`,
      role: AccessibilityRoles.TEXT,
    });
  },
};

/**
 * Utility for creating accessible announcements
 */
export function createAccessibilityAnnouncement(
  type: 'success' | 'error' | 'info' | 'warning',
  message: string
): void {
  const prefixes = {
    success: '成功: ',
    error: 'エラー: ',
    info: '情報: ',
    warning: '警告: ',
  };

  const announcement = prefixes[type] + message;
  ScreenReaderUtils.announceForAccessibility(announcement);
}

/**
 * Hook for managing focus
 */
export function useFocusManagement() {
  const focusRef = React.useRef<any>(null);

  const setFocus = React.useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const setAccessibilityFocus = React.useCallback(() => {
    if (focusRef.current && Platform.OS === 'ios') {
      const reactTag = focusRef.current._nativeTag;
      if (reactTag) {
        ScreenReaderUtils.setAccessibilityFocus(reactTag);
      }
    }
  }, []);

  return {
    focusRef,
    setFocus,
    setAccessibilityFocus,
  };
}

/**
 * Accessibility testing utilities
 */
export const AccessibilityTesting = {
  // Check if element has proper accessibility label
  hasAccessibilityLabel: (element: any): boolean => {
    return !!(element.props?.accessibilityLabel || element.props?.children);
  },

  // Check if interactive element has proper role
  hasProperRole: (element: any): boolean => {
    const interactiveRoles = [
      AccessibilityRoles.BUTTON,
      AccessibilityRoles.LINK,
      AccessibilityRoles.TAB,
      AccessibilityRoles.MENU_ITEM,
    ];

    return (
      element.props?.onPress &&
      interactiveRoles.includes(element.props?.accessibilityRole)
    );
  },

  // Check if form element has proper labeling
  hasProperFormLabeling: (element: any): boolean => {
    return !!(
      element.props?.accessibilityLabel ||
      element.props?.placeholder ||
      element.props?.label
    );
  },
};