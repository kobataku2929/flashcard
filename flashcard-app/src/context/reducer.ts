// App state reducer

import { AppState, AppAction } from './types';

export const initialState: AppState = {
  flashcards: [],
  folders: [],
  currentFolder: undefined,
  loading: false,
  error: undefined,
  isInitialized: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'SET_FLASHCARDS':
      return {
        ...state,
        flashcards: action.payload,
        loading: false,
        error: undefined,
      };

    case 'ADD_FLASHCARD':
      return {
        ...state,
        flashcards: [action.payload, ...state.flashcards],
        loading: false,
        error: undefined,
      };

    case 'UPDATE_FLASHCARD':
      return {
        ...state,
        flashcards: state.flashcards.map(card =>
          card.id === action.payload.id ? action.payload.flashcard : card
        ),
        loading: false,
        error: undefined,
      };

    case 'REMOVE_FLASHCARD':
      return {
        ...state,
        flashcards: state.flashcards.filter(card => card.id !== action.payload),
        loading: false,
        error: undefined,
      };

    case 'SET_FOLDERS':
      return {
        ...state,
        folders: action.payload,
        loading: false,
        error: undefined,
      };

    case 'ADD_FOLDER':
      return {
        ...state,
        folders: [...state.folders, action.payload],
        loading: false,
        error: undefined,
      };

    case 'UPDATE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(folder =>
          folder.id === action.payload.id ? action.payload.folder : folder
        ),
        loading: false,
        error: undefined,
      };

    case 'REMOVE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter(folder => folder.id !== action.payload),
        loading: false,
        error: undefined,
      };

    case 'SET_CURRENT_FOLDER':
      return {
        ...state,
        currentFolder: action.payload,
      };

    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
      };

    case 'RESET_ALL_DATA':
      return {
        ...initialState,
        isInitialized: true,
      };

    default:
      return state;
  }
}