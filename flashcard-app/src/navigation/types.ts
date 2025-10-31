// Navigation types

export type RootStackParamList = {
  Main: undefined;
  CardEditor: {
    cardId?: number;
    folderId?: number | null;
  };
  ImportTSV: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Browse: undefined;
  Study: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  FolderView: {
    folderId?: number | null;
  };
  CardDetail: {
    cardId: number;
  };
};

export type BrowseStackParamList = {
  Search: undefined;
  SearchResults: {
    query: string;
  };
};

export type StudyStackParamList = {
  StudyMode: {
    folderId?: number | null;
  };
  StudySession: {
    cardIds: number[];
    folderId?: number | null;
    settings?: import('../types').StudySettings;
  };
  StudyResult: {
    result: import('../types').StudyResult;
    sessionDuration: number;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}