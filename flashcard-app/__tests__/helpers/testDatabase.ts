// Test database helpers

import { DatabaseManager } from '@/database/DatabaseManager';

// Mock database for testing
export const mockDatabase = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
  closeAsync: jest.fn(),
  withTransactionAsync: jest.fn(),
};

// Mock DatabaseManager
jest.mock('@/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      getDatabase: jest.fn(() => mockDatabase),
      initialize: jest.fn(),
      isReady: jest.fn(() => true),
    })),
  },
}));

export const setupTestDatabase = async () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup default mock behaviors
  mockDatabase.execAsync.mockResolvedValue(undefined);
  mockDatabase.getAllAsync.mockResolvedValue([]);
  mockDatabase.getFirstAsync.mockResolvedValue(null);
  mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  mockDatabase.closeAsync.mockResolvedValue(undefined);
  mockDatabase.withTransactionAsync.mockImplementation(async (callback) => {
    return await callback();
  });
  
  // Setup DatabaseManager mock
  const mockDbManager = {
    getDatabase: jest.fn(() => mockDatabase),
    initialize: jest.fn(),
    isReady: jest.fn(() => true),
  };
  
  (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);
  
  return mockDatabase;
};

export const teardownTestDatabase = async () => {
  jest.clearAllMocks();
};