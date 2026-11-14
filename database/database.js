import * as SQLite from 'expo-sqlite';
import { INITIAL_PROJECTS } from './seedData';
import { CATEGORIES } from '../constants/categories';

const DB_NAME = 'designvault.db';
let dbInstance = null;

/**
 * Gets or initializes the SQLite database connection singleton.
 */
export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Initializes the database schema and seeds initial projects if empty.
 */
export async function initializeDatabase() {
  const db = await getDatabase();

  // Create tables if they don't already exist
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      software TEXT,
      status TEXT,
      created_date TEXT,
      image_uri TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS project_artworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      artwork_title TEXT,
      image_uri TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      color_name TEXT,
      hex_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      note_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT 'folder-outline',
      color TEXT DEFAULT '#7C3AED',
      bg_color TEXT DEFAULT '#EDE9FE',
      description TEXT,
      is_custom INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Migrate any existing projects.image_uri records into project_artworks (idempotent, safe)
  await db.execAsync(`
    INSERT INTO project_artworks (project_id, artwork_title, image_uri, sort_order, created_at)
    SELECT p.id, p.title, p.image_uri, 0, p.created_at
    FROM projects p
    WHERE p.image_uri IS NOT NULL
      AND TRIM(p.image_uri) != ''
      AND NOT EXISTS (
        SELECT 1 FROM project_artworks pa
        WHERE pa.project_id = p.id AND pa.image_uri = p.image_uri
      );
  `);

  // Check if initial seeding is needed
  await seedInitialProjects();
  await seedInitialCategories();
  await seedSampleFeatures();
}

/**
 * Seeds initial category records if categories table is currently empty.
 */
export async function seedInitialCategories() {
  const db = await getDatabase();
  try {
    const countRow = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
    if (countRow && countRow.count === 0) {
      const now = new Date().toISOString();
      for (const cat of CATEGORIES) {
        await db.runAsync(
          `INSERT OR IGNORE INTO categories (id, name, icon, color, bg_color, description, is_custom, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          [
            cat.id,
            cat.name,
            cat.icon || 'folder-outline',
            cat.color || '#7C3AED',
            cat.bgColor || '#EDE9FE',
            cat.description || '',
            now,
          ]
        );
      }
    }
  } catch (err) {
    console.warn('[DesignVault] Note on categories seeding:', err?.message || err);
  }
}

/**
 * Seeds sample colors, tasks, and notes for the showcase project if none exist.
 */
export async function seedSampleFeatures() {
  const db = await getDatabase();
  try {
    const colorCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM project_colors');
    if (colorCount && colorCount.count === 0) {
      const showcaseProject = await db.getFirstAsync(
        "SELECT id FROM projects WHERE title LIKE '%Artificial Vertex%' LIMIT 1"
      );
      if (showcaseProject) {
        const projectId = showcaseProject.id;
        const now = new Date().toISOString();

        // 1. Seed Showcase Colours
        const sampleColors = [
          { name: 'Dark Red', hex: '#8B0000' },
          { name: 'Pure Black', hex: '#000000' },
          { name: 'Clean White', hex: '#FFFFFF' },
          { name: 'Accent Gold', hex: '#FFD700' },
        ];
        for (const c of sampleColors) {
          await db.runAsync(
            'INSERT INTO project_colors (project_id, color_name, hex_code, created_at) VALUES (?, ?, ?, ?)',
            [projectId, c.name, c.hex, now]
          );
        }

        // 2. Seed Showcase Tasks
        const sampleTasks = [
          { title: 'Coming Soon Poster', desc: 'Teaser design with cybernetic wireframe visuals', completed: 1 },
          { title: 'Registration Open Poster', desc: 'Include QR code and registration deadline', completed: 1 },
          { title: 'Speaker Announcement Poster', desc: 'Highlight keynote speakers and topics', completed: 1 },
          { title: 'Three Days Remaining Poster', desc: 'Urgency countdown post for social media', completed: 1 },
          { title: 'One Day Remaining Poster', desc: 'Final call countdown banner', completed: 0 },
          { title: 'Final Event Poster', desc: 'Full event schedule and venue roadmap', completed: 0 },
        ];
        for (const t of sampleTasks) {
          await db.runAsync(
            'INSERT INTO project_tasks (project_id, title, description, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [projectId, t.title, t.desc, t.completed, now, now]
          );
        }

        // 3. Seed Showcase Notes
        const sampleNotes = [
          {
            title: 'Design Idea',
            type: 'Idea',
            content: 'Use a cinematic dark red theme with futuristic AI elements and neon contours.',
          },
          {
            title: 'Feedback',
            type: 'Feedback',
            content: 'Increase the visibility of the event date and make the headline typography bolder.',
          },
          {
            title: 'Revision',
            type: 'Revision',
            content: 'Update the registration poster with the newly confirmed university auditorium venue.',
          },
        ];
        for (const n of sampleNotes) {
          await db.runAsync(
            'INSERT INTO project_notes (project_id, title, content, note_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [projectId, n.title, n.content, n.type, now, now]
          );
        }
      }
    }
  } catch (err) {
    console.warn('[DesignVault] Note on sample features seeding:', err?.message || err);
  }
}

/**
 * Seeds sample records only if the projects table is currently empty.
 * Never overwrites or duplicates records on app restart.
 */
export async function seedInitialProjects() {
  const db = await getDatabase();

  const countResult = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM projects'
  );

  if (countResult && countResult.count === 0) {
    const now = new Date().toISOString();

    for (const p of INITIAL_PROJECTS) {
      await db.runAsync(
        `INSERT INTO projects (
          title, description, category, software, status,
          created_date, image_uri, is_favorite, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.title,
          p.description,
          p.category,
          p.software,
          p.status,
          p.created_date,
          p.image_uri,
          p.is_favorite,
          now,
          now,
        ]
      );
    }
  }
}

/**
 * Reset database (development / testing helper if needed).
 */
export async function resetDatabase() {
  const db = await getDatabase();
  await db.execAsync('DROP TABLE IF EXISTS projects;');
  await initializeDatabase();
}
