// Database schema definitions and SQL statements

export const CREATE_FOLDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
  );
`;

export const CREATE_FLASHCARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    word_pronunciation TEXT,
    translation TEXT NOT NULL,
    translation_pronunciation TEXT,
    memo TEXT,
    folder_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );
`;

export const CREATE_STUDY_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    total_cards INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    folder_id INTEGER,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );
`;

export const CREATE_STUDY_RECORDS_TABLE = `
  CREATE TABLE IF NOT EXISTS study_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    response_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
  );
`;

// Enhanced search tables
export const CREATE_SEARCH_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    filters TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    result_count INTEGER DEFAULT 0
  );
`;

export const CREATE_SEARCH_ANALYTICS_TABLE = `
  CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_term TEXT,
    card_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    action_type TEXT DEFAULT 'search',
    FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE SET NULL
  );
`;

// Full-text search virtual table for flashcards
export const CREATE_FLASHCARDS_FTS_TABLE = `
  CREATE VIRTUAL TABLE IF NOT EXISTS flashcards_fts USING fts5(
    word, 
    translation, 
    memo, 
    word_pronunciation, 
    translation_pronunciation,
    content='flashcards',
    content_rowid='id'
  );
`;

// Indexes for better query performance
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);',
  'CREATE INDEX IF NOT EXISTS idx_flashcards_folder_id ON flashcards(folder_id);',
  'CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);',
  'CREATE INDEX IF NOT EXISTS idx_flashcards_word ON flashcards(word);',
  'CREATE INDEX IF NOT EXISTS idx_study_sessions_folder_id ON study_sessions(folder_id);',
  'CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at);',
  'CREATE INDEX IF NOT EXISTS idx_study_records_session_id ON study_records(session_id);',
  'CREATE INDEX IF NOT EXISTS idx_study_records_flashcard_id ON study_records(flashcard_id);',
  // Enhanced search indexes
  'CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp);',
  'CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);',
  'CREATE INDEX IF NOT EXISTS idx_search_analytics_term ON search_analytics(search_term);',
  'CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);',
  'CREATE INDEX IF NOT EXISTS idx_search_analytics_card_id ON search_analytics(card_id);',
];

// Triggers to automatically update the updated_at timestamp
export const CREATE_TRIGGERS = [
  `CREATE TRIGGER IF NOT EXISTS update_folders_timestamp 
   AFTER UPDATE ON folders 
   BEGIN 
     UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
   END;`,
  
  `CREATE TRIGGER IF NOT EXISTS update_flashcards_timestamp 
   AFTER UPDATE ON flashcards 
   BEGIN 
     UPDATE flashcards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
   END;`,

  // FTS triggers to keep search index in sync
  `CREATE TRIGGER IF NOT EXISTS flashcards_fts_insert 
   AFTER INSERT ON flashcards 
   BEGIN 
     INSERT INTO flashcards_fts(rowid, word, translation, memo, word_pronunciation, translation_pronunciation) 
     VALUES (NEW.id, NEW.word, NEW.translation, NEW.memo, NEW.word_pronunciation, NEW.translation_pronunciation); 
   END;`,

  `CREATE TRIGGER IF NOT EXISTS flashcards_fts_update 
   AFTER UPDATE ON flashcards 
   BEGIN 
     UPDATE flashcards_fts SET 
       word = NEW.word, 
       translation = NEW.translation, 
       memo = NEW.memo, 
       word_pronunciation = NEW.word_pronunciation, 
       translation_pronunciation = NEW.translation_pronunciation 
     WHERE rowid = NEW.id; 
   END;`,

  `CREATE TRIGGER IF NOT EXISTS flashcards_fts_delete 
   AFTER DELETE ON flashcards 
   BEGIN 
     DELETE FROM flashcards_fts WHERE rowid = OLD.id; 
   END;`,
];

export const ALL_SCHEMA_STATEMENTS = [
  CREATE_FOLDERS_TABLE,
  CREATE_FLASHCARDS_TABLE,
  CREATE_STUDY_SESSIONS_TABLE,
  CREATE_STUDY_RECORDS_TABLE,
  CREATE_SEARCH_HISTORY_TABLE,
  CREATE_SEARCH_ANALYTICS_TABLE,
  CREATE_FLASHCARDS_FTS_TABLE,
  ...CREATE_INDEXES,
  ...CREATE_TRIGGERS,
];