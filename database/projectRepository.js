import { getDatabase } from './database';
import { deleteLocalImage } from '../services/imageStorage';

/**
 * Standard project selection columns with computed cover_image_uri and artwork_count.
 */
const PROJECT_SELECT_QUERY = `
  SELECT 
    p.*,
    COALESCE(
      (SELECT pa.image_uri FROM project_artworks pa WHERE pa.project_id = p.id ORDER BY pa.sort_order ASC, pa.id ASC LIMIT 1),
      p.image_uri
    ) AS cover_image_uri,
    (SELECT COUNT(*) FROM project_artworks pa WHERE pa.project_id = p.id) AS artwork_count
  FROM projects p
`;

/**
 * Retrieves all design projects ordered by updated_at / id descending.
 */
export async function getAllProjects() {
  const db = await getDatabase();
  return await db.getAllAsync(
    `${PROJECT_SELECT_QUERY} ORDER BY p.updated_at DESC, p.id DESC`
  );
}

/**
 * Retrieves all artworks belonging to a specific project.
 */
export async function getArtworksByProjectId(projectId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM project_artworks WHERE project_id = ? ORDER BY sort_order ASC, id ASC',
    [projectId]
  );
}

/**
 * Retrieves a single project by its ID, attaching its list of artworks, colors, tasks, and notes.
 */
export async function getProjectById(id) {
  const db = await getDatabase();
  const project = await db.getFirstAsync(
    `${PROJECT_SELECT_QUERY} WHERE p.id = ?`,
    [id]
  );

  if (!project) return null;

  const artworks = await getArtworksByProjectId(id);
  const colors = await getColorsByProjectId(id);
  const tasks = await getTasksByProjectId(id);
  const notes = await getNotesByProjectId(id);
  const taskProgress = await getTaskProgress(id);

  return {
    ...project,
    artworks: artworks || [],
    colors: colors || [],
    tasks: tasks || [],
    notes: notes || [],
    taskProgress,
  };
}

/**
 * Inserts multiple artworks for a project.
 */
export async function addProjectArtworks(projectId, artworks = []) {
  if (!artworks || artworks.length === 0) return [];
  const db = await getDatabase();
  const now = new Date().toISOString();

  for (let i = 0; i < artworks.length; i++) {
    const art = artworks[i];
    const imageUri = typeof art === 'string' ? art : art.image_uri;
    const title = typeof art === 'object' && art.artwork_title ? art.artwork_title : '';
    const sortOrder = typeof art === 'object' && art.sort_order !== undefined ? art.sort_order : i;

    if (imageUri && imageUri.trim() !== '') {
      await db.runAsync(
        `INSERT INTO project_artworks (project_id, artwork_title, image_uri, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, title.trim(), imageUri.trim(), sortOrder, now]
      );
    }
  }

  return await getArtworksByProjectId(projectId);
}

/**
 * Replaces the full list of artworks for a project during editing.
 * Safely removes unused application-owned image files for deleted artworks.
 */
export async function replaceProjectArtworks(projectId, updatedArtworks = []) {
  const db = await getDatabase();
  const existingArtworks = await getArtworksByProjectId(projectId);

  // New URIs set
  const newUris = new Set(
    updatedArtworks.map((a) => (typeof a === 'string' ? a : a.image_uri)).filter(Boolean)
  );

  // Identify removed artworks and delete their local image files
  for (const oldArt of existingArtworks) {
    if (!newUris.has(oldArt.image_uri)) {
      await deleteLocalImage(oldArt.image_uri);
    }
  }

  // Clear existing rows
  await db.runAsync('DELETE FROM project_artworks WHERE project_id = ?', [projectId]);

  // Insert new rows
  await addProjectArtworks(projectId, updatedArtworks);

  // Update projects.image_uri to the first artwork's URI (or null)
  const firstArtworkUri = updatedArtworks.length > 0
    ? (typeof updatedArtworks[0] === 'string' ? updatedArtworks[0] : updatedArtworks[0].image_uri)
    : null;

  await db.runAsync(
    'UPDATE projects SET image_uri = ?, updated_at = ? WHERE id = ?',
    [firstArtworkUri, new Date().toISOString(), projectId]
  );
}

/**
 * Adds a new design project along with its optional multiple artworks.
 */
export async function addProject({
  title,
  description = '',
  category,
  software = '',
  status = 'In Progress',
  created_date = new Date().toISOString().split('T')[0],
  deadline_date = null,
  image_uri = null,
  artworks = [],
  is_favorite = 0,
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // If artworks provided, use the first artwork as primary cover image
  const primaryCover = artworks.length > 0
    ? (typeof artworks[0] === 'string' ? artworks[0] : artworks[0].image_uri)
    : image_uri;

  const cleanDeadline = deadline_date && typeof deadline_date === 'string' && deadline_date.trim() !== ''
    ? deadline_date.trim()
    : null;

  const result = await db.runAsync(
    `INSERT INTO projects (
      title, description, category, software, status,
      created_date, deadline_date, image_uri, is_favorite, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      description ? description.trim() : '',
      category,
      software ? software.trim() : '',
      status,
      created_date,
      cleanDeadline,
      primaryCover,
      is_favorite ? 1 : 0,
      now,
      now,
    ]
  );

  const newProjectId = result.lastInsertRowId;

  // If artworks were provided, insert them into project_artworks
  if (artworks && artworks.length > 0) {
    await addProjectArtworks(newProjectId, artworks);
  } else if (primaryCover && primaryCover.trim() !== '') {
    // If only single image_uri provided, create initial artwork entry
    await addProjectArtworks(newProjectId, [
      { image_uri: primaryCover, artwork_title: title.trim() }
    ]);
  }

  return newProjectId;
}

/**
 * Updates an existing project by ID, including its artworks list if provided.
 */
export async function updateProject(id, {
  title,
  description = '',
  category,
  software = '',
  status = 'In Progress',
  created_date,
  deadline_date,
  image_uri,
  artworks,
  is_favorite,
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const current = await getProjectById(id);
  if (!current) throw new Error(`Project with ID ${id} not found`);

  // Handle artworks update if provided
  if (artworks !== undefined) {
    await replaceProjectArtworks(id, artworks);
  }

  const updatedImage = artworks !== undefined && artworks.length > 0
    ? (typeof artworks[0] === 'string' ? artworks[0] : artworks[0].image_uri)
    : (image_uri !== undefined ? image_uri : current.image_uri);

  const updatedFav = is_favorite !== undefined ? (is_favorite ? 1 : 0) : current.is_favorite;
  const updatedDate = created_date !== undefined ? created_date : current.created_date;
  const updatedDeadline = deadline_date !== undefined
    ? (deadline_date && typeof deadline_date === 'string' && deadline_date.trim() !== '' ? deadline_date.trim() : null)
    : current.deadline_date;

  await db.runAsync(
    `UPDATE projects SET
      title = ?,
      description = ?,
      category = ?,
      software = ?,
      status = ?,
      created_date = ?,
      deadline_date = ?,
      image_uri = ?,
      is_favorite = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      title.trim(),
      description ? description.trim() : '',
      category,
      software ? software.trim() : '',
      status,
      updatedDate,
      updatedDeadline,
      updatedImage,
      updatedFav,
      now,
      id,
    ]
  );

  return await getProjectById(id);
}

/**
 * Deletes a project by ID and safely purges all associated artworks and their local image files.
 */
export async function deleteProject(id) {
  const db = await getDatabase();
  const project = await getProjectById(id);
  if (!project) return null;

  // Clean up all artworks' files on disk
  const artworks = await getArtworksByProjectId(id);
  for (const art of artworks) {
    if (art.image_uri) {
      await deleteLocalImage(art.image_uri);
    }
  }

  if (project.image_uri) {
    await deleteLocalImage(project.image_uri);
  }

  // Delete from project child tables and projects
  await db.runAsync('DELETE FROM project_artworks WHERE project_id = ?', [id]);
  await db.runAsync('DELETE FROM project_colors WHERE project_id = ?', [id]);
  await db.runAsync('DELETE FROM project_tasks WHERE project_id = ?', [id]);
  await db.runAsync('DELETE FROM project_notes WHERE project_id = ?', [id]);
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);

  return project;
}

/**
 * Searches projects by matching text against title, description, software, or artwork title.
 */
export async function searchProjects(query = '') {
  const db = await getDatabase();
  const cleanQuery = query.trim();
  if (!cleanQuery) return await getAllProjects();

  const pattern = `%${cleanQuery}%`;
  return await db.getAllAsync(
    `SELECT 
      p.*,
      COALESCE(
        (SELECT pa.image_uri FROM project_artworks pa WHERE pa.project_id = p.id ORDER BY pa.sort_order ASC, pa.id ASC LIMIT 1),
        p.image_uri
      ) AS cover_image_uri,
      (SELECT COUNT(*) FROM project_artworks pa WHERE pa.project_id = p.id) AS artwork_count
    FROM projects p
    WHERE p.title LIKE ? OR p.description LIKE ? OR p.software LIKE ?
       OR EXISTS (SELECT 1 FROM project_artworks pa WHERE pa.project_id = p.id AND pa.artwork_title LIKE ?)
    ORDER BY p.updated_at DESC, p.id DESC`,
    [pattern, pattern, pattern, pattern]
  );
}

/**
 * Filters projects dynamically by category, status, and search query.
 */
export async function filterProjects({ category = 'All', status = 'All', query = '' } = {}) {
  const db = await getDatabase();

  const conditions = [];
  const params = [];

  if (category && category !== 'All') {
    conditions.push('p.category = ?');
    params.push(category);
  }

  if (status && status !== 'All') {
    conditions.push('p.status = ?');
    params.push(status);
  }

  if (query && query.trim() !== '') {
    const pattern = `%${query.trim()}%`;
    conditions.push(`(
      p.title LIKE ? OR p.description LIKE ? OR p.software LIKE ?
      OR EXISTS (SELECT 1 FROM project_artworks pa WHERE pa.project_id = p.id AND pa.artwork_title LIKE ?)
    )`);
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT 
      p.*,
      COALESCE(
        (SELECT pa.image_uri FROM project_artworks pa WHERE pa.project_id = p.id ORDER BY pa.sort_order ASC, pa.id ASC LIMIT 1),
        p.image_uri
      ) AS cover_image_uri,
      (SELECT COUNT(*) FROM project_artworks pa WHERE pa.project_id = p.id) AS artwork_count
    FROM projects p
    ${whereClause}
    ORDER BY p.updated_at DESC, p.id DESC
  `;

  return await db.getAllAsync(sql, params);
}

/**
 * Toggles a project's favorite status.
 */
export async function toggleFavorite(id) {
  const db = await getDatabase();
  const project = await getProjectById(id);
  if (!project) return null;

  const newStatus = project.is_favorite === 1 ? 0 : 1;
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE projects SET is_favorite = ?, updated_at = ? WHERE id = ?',
    [newStatus, now, id]
  );

  return { ...project, is_favorite: newStatus };
}

/**
 * Retrieves all favorite projects.
 */
export async function getFavoriteProjects() {
  const db = await getDatabase();
  return await db.getAllAsync(
    `${PROJECT_SELECT_QUERY} WHERE p.is_favorite = 1 ORDER BY p.updated_at DESC, p.id DESC`
  );
}

/**
 * Computes live portfolio statistics dynamically from SQLite.
 */
export async function getProjectStatistics() {
  const db = await getDatabase();

  const totalRow = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM projects'
  );
  const completedRow = await db.getFirstAsync(
    "SELECT COUNT(*) as count FROM projects WHERE status = 'Completed'"
  );
  const inProgressRow = await db.getFirstAsync(
    "SELECT COUNT(*) as count FROM projects WHERE status = 'In Progress'"
  );
  const favoritesRow = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM projects WHERE is_favorite = 1'
  );
  const totalArtworksRow = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM project_artworks'
  );

  // Category counts
  const categoryRows = await db.getAllAsync(
    'SELECT category, COUNT(*) as count FROM projects GROUP BY category'
  );
  const categoryCounts = {};
  categoryRows.forEach(row => {
    categoryCounts[row.category] = row.count;
  });

  // Recent 5 projects
  const recentProjects = await db.getAllAsync(
    `${PROJECT_SELECT_QUERY} ORDER BY p.updated_at DESC, p.id DESC LIMIT 5`
  );

  return {
    total: totalRow?.count || 0,
    completed: completedRow?.count || 0,
    inProgress: inProgressRow?.count || 0,
    favorites: favoritesRow?.count || 0,
    totalArtworks: totalArtworksRow?.count || 0,
    categoryCounts,
    recentProjects,
  };
}

/**
 * User Preferences Helpers
 */
export async function getUserPreference(key, defaultValue = null) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT value FROM user_preferences WHERE key = ?',
    [key]
  );
  return row && row.value !== null && row.value !== undefined ? row.value : defaultValue;
}

export async function setUserPreference(key, value) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)',
    [key, value !== null && value !== undefined ? String(value) : '']
  );
}

export async function getUserName() {
  return await getUserPreference('user_name', '');
}

export async function setUserName(name) {
  const trimmed = name ? name.trim() : '';
  await setUserPreference('user_name', trimmed);
  return trimmed;
}

export async function getProfileImageUri() {
  return await getUserPreference('profile_image_uri', null);
}

export async function setProfileImageUri(uri) {
  await setUserPreference('profile_image_uri', uri || '');
  return uri || null;
}

export async function getUserProfile() {
  const [name, imageUri] = await Promise.all([
    getUserName(),
    getProfileImageUri(),
  ]);
  return {
    name: name || '',
    profileImageUri: imageUri || null,
  };
}

export async function setUserProfile({ name, profileImageUri }) {
  if (name !== undefined) {
    await setUserName(name);
  }
  if (profileImageUri !== undefined) {
    await setProfileImageUri(profileImageUri);
  }
  return await getUserProfile();
}

export async function getThemePreference() {
  const current = await getUserPreference('theme', 'light');
  // Safe migration: If existing preference was 'system' or invalid, migrate it to 'light'
  if (current === 'system' || !['light', 'dark', 'midnight'].includes(current)) {
    await setUserPreference('theme', 'light');
    return 'light';
  }
  return current;
}

export async function setThemePreference(theme) {
  const valid = ['light', 'dark', 'midnight'];
  const value = valid.includes(theme) ? theme : 'light';
  await setUserPreference('theme', value);
  return value;
}

export async function getDefaultSortPreference() {
  return await getUserPreference('default_sort', 'newest');
}

export async function setDefaultSortPreference(sort) {
  const valid = ['newest', 'oldest', 'name_asc', 'name_desc', 'updated'];
  const value = valid.includes(sort) ? sort : 'newest';
  await setUserPreference('default_sort', value);
  return value;
}

export async function getGalleryLayoutPreference() {
  return await getUserPreference('gallery_layout', 'grid');
}

export async function setGalleryLayoutPreference(layout) {
  const valid = ['grid', 'list'];
  const value = valid.includes(layout) ? layout : 'grid';
  await setUserPreference('gallery_layout', value);
  return value;
}

/* =======================================================================
 * FEATURE 1: COLOUR PALETTE REPOSITORY
 * ======================================================================= */

/**
 * Validates whether a given string is a valid 3- or 6-digit hex color code.
 */
export function isValidHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const clean = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean);
}

/**
 * Normalizes a 3-character or 6-character hex code to standard uppercase #RRGGBB.
 */
export function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') {
    throw new Error('Please enter a valid HEX colour code.');
  }
  let clean = hex.trim();
  if (!clean.startsWith('#')) {
    clean = `#${clean}`;
  }
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
    throw new Error('Invalid HEX colour code. Use format #RGB or #RRGGBB.');
  }
  if (clean.length === 4) {
    const r = clean[1];
    const g = clean[2];
    const b = clean[3];
    clean = `#${r}${r}${g}${g}${b}${b}`;
  }
  return clean.toUpperCase();
}

/**
 * Retrieves all colour swatches for a project ordered by id ascending.
 */
export async function getColorsByProjectId(projectId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM project_colors WHERE project_id = ? ORDER BY id ASC',
    [projectId]
  );
}

/**
 * Adds a new colour swatch to a project.
 */
export async function addColor({ projectId, colorName = '', hexCode }) {
  const db = await getDatabase();
  const normalizedHex = normalizeHex(hexCode);
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO project_colors (project_id, color_name, hex_code, created_at) VALUES (?, ?, ?, ?)',
    [projectId, colorName ? colorName.trim() : '', normalizedHex, now]
  );

  return await getColorsByProjectId(projectId);
}

/**
 * Updates an existing colour swatch.
 */
export async function updateColor(id, { colorName = '', hexCode }) {
  const db = await getDatabase();
  const normalizedHex = normalizeHex(hexCode);

  await db.runAsync(
    'UPDATE project_colors SET color_name = ?, hex_code = ? WHERE id = ?',
    [colorName ? colorName.trim() : '', normalizedHex, id]
  );

  return await db.getFirstAsync('SELECT * FROM project_colors WHERE id = ?', [id]);
}

/**
 * Deletes a colour swatch.
 */
export async function deleteColor(id, projectId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM project_colors WHERE id = ?', [id]);
  return await getColorsByProjectId(projectId);
}

/* =======================================================================
 * FEATURE 2: DESIGN TASK CHECKLIST & PROGRESS
 * ======================================================================= */

/**
 * Retrieves all tasks for a project ordered by is_completed ASC, id ASC.
 */
export async function getTasksByProjectId(projectId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY is_completed ASC, id ASC',
    [projectId]
  );
}

/**
 * Calculates current project task progress metrics.
 */
export async function getTaskProgress(projectId) {
  const db = await getDatabase();
  const totalRow = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM project_tasks WHERE project_id = ?',
    [projectId]
  );
  const completedRow = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM project_tasks WHERE project_id = ? AND is_completed = 1',
    [projectId]
  );

  const total = totalRow?.count || 0;
  const completed = completedRow?.count || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

/**
 * Adds a new design task to a project.
 */
export async function addTask({ projectId, title, description = '' }) {
  if (!title || !title.trim()) {
    throw new Error('Task title is required');
  }
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO project_tasks (project_id, title, description, is_completed, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    [projectId, title.trim(), description ? description.trim() : '', now, now]
  );

  return await getTasksByProjectId(projectId);
}

/**
 * Updates an existing design task.
 */
export async function updateTask(id, { title, description = '', is_completed }) {
  if (!title || !title.trim()) {
    throw new Error('Task title is required');
  }
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE project_tasks SET title = ?, description = ?, is_completed = ?, updated_at = ? WHERE id = ?',
    [title.trim(), description ? description.trim() : '', is_completed ? 1 : 0, now, id]
  );

  return await db.getFirstAsync('SELECT * FROM project_tasks WHERE id = ?', [id]);
}

/**
 * Toggles a design task's completed status.
 */
export async function toggleTaskCompletion(id) {
  const db = await getDatabase();
  const task = await db.getFirstAsync('SELECT * FROM project_tasks WHERE id = ?', [id]);
  if (!task) return null;

  const nextStatus = task.is_completed === 1 ? 0 : 1;
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE project_tasks SET is_completed = ?, updated_at = ? WHERE id = ?',
    [nextStatus, now, id]
  );

  return await db.getFirstAsync('SELECT * FROM project_tasks WHERE id = ?', [id]);
}

/**
 * Deletes a design task by id.
 */
export async function deleteTask(id, projectId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM project_tasks WHERE id = ?', [id]);
  return await getTasksByProjectId(projectId);
}

/* =======================================================================
 * FEATURE 4: PROJECT NOTES REPOSITORY
 * ======================================================================= */

/**
 * Retrieves all notes for a project ordered by updated_at DESC, id DESC.
 */
export async function getNotesByProjectId(projectId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM project_notes WHERE project_id = ? ORDER BY updated_at DESC, id DESC',
    [projectId]
  );
}

/**
 * Adds a new note to a project.
 */
export async function addNote({ projectId, title, content, noteType = 'General' }) {
  if (!title || !title.trim()) {
    throw new Error('Note title is required');
  }
  if (!content || !content.trim()) {
    throw new Error('Note content cannot be empty');
  }
  const validTypes = ['Idea', 'Feedback', 'Revision', 'General'];
  const type = validTypes.includes(noteType) ? noteType : 'General';

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO project_notes (project_id, title, content, note_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [projectId, title.trim(), content.trim(), type, now, now]
  );

  return await getNotesByProjectId(projectId);
}

/**
 * Updates an existing note.
 */
export async function updateNote(id, { title, content, noteType = 'General' }) {
  if (!title || !title.trim()) {
    throw new Error('Note title is required');
  }
  if (!content || !content.trim()) {
    throw new Error('Note content cannot be empty');
  }
  const validTypes = ['Idea', 'Feedback', 'Revision', 'General'];
  const type = validTypes.includes(noteType) ? noteType : 'General';

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE project_notes SET title = ?, content = ?, note_type = ?, updated_at = ? WHERE id = ?',
    [title.trim(), content.trim(), type, now, id]
  );

  return await db.getFirstAsync('SELECT * FROM project_notes WHERE id = ?', [id]);
}

/**
 * Deletes a note by id.
 */
export async function deleteNote(id, projectId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM project_notes WHERE id = ?', [id]);
  return await getNotesByProjectId(projectId);
}

/* =======================================================================
 * CATEGORIES MANAGEMENT REPOSITORY
 * ======================================================================= */

/**
 * Retrieves all categories with live project counts.
 */
export async function getAllCategories() {
  const db = await getDatabase();
  return await db.getAllAsync(`
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM projects p WHERE LOWER(TRIM(p.category)) = LOWER(TRIM(c.name))) as project_count
    FROM categories c
    ORDER BY c.is_custom ASC, c.name ASC
  `);
}

/**
 * Adds a new custom category.
 * Rejects duplicate names case-insensitively.
 */
export async function addCategory({
  name,
  icon = 'folder-outline',
  color = '#7C3AED',
  bgColor = '#EDE9FE',
  description = '',
}) {
  const cleanName = (name || '').trim();
  if (!cleanName) {
    throw new Error('Category name cannot be empty');
  }

  const db = await getDatabase();

  // Case-insensitive check
  const existing = await db.getFirstAsync(
    'SELECT id, name FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)',
    [cleanName]
  );
  if (existing) {
    throw new Error(`Category "${existing.name}" already exists`);
  }

  const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, bg_color, description, is_custom, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, cleanName, icon, color, bgColor, description.trim(), now]
  );

  return await getAllCategories();
}

/**
 * Renames a category and updates associated projects atomically.
 */
export async function renameCategory(id, newName) {
  const cleanName = (newName || '').trim();
  if (!cleanName) {
    throw new Error('Category name cannot be empty');
  }

  const db = await getDatabase();

  // Check collision with other categories
  const collision = await db.getFirstAsync(
    'SELECT id, name FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?',
    [cleanName, id]
  );
  if (collision) {
    throw new Error(`Category "${collision.name}" already exists`);
  }

  const current = await db.getFirstAsync('SELECT name FROM categories WHERE id = ?', [id]);
  if (!current) {
    throw new Error('Category not found');
  }
  const oldName = current.name;

  // Update category row
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [cleanName, id]);

  // Update projects referencing old category name
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE projects SET category = ?, updated_at = ? WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))',
    [cleanName, now, oldName]
  );

  return await getAllCategories();
}

/**
 * Deletes a custom category.
 * Prevents deletion if projects still belong to this category.
 */
export async function deleteCategory(id) {
  const db = await getDatabase();
  const current = await db.getFirstAsync('SELECT * FROM categories WHERE id = ?', [id]);
  if (!current) return await getAllCategories();

  // Check project count
  const countRow = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM projects WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))',
    [current.name]
  );

  const projectCount = countRow?.count || 0;
  if (projectCount > 0) {
    throw new Error(
      `Cannot delete "${current.name}" because it contains ${projectCount} ${
        projectCount === 1 ? 'project' : 'projects'
      }. Please reassign those projects to another category first.`
    );
  }

  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  return await getAllCategories();
}

/**
 * Reassigns all projects from one category to another.
 */
export async function reassignCategoryProjects(oldCategoryName, newCategoryName) {
  if (!oldCategoryName || !newCategoryName) {
    throw new Error('Both source and target categories are required for reassignment');
  }
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    'UPDATE projects SET category = ?, updated_at = ? WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))',
    [newCategoryName.trim(), now, oldCategoryName.trim()]
  );

  return result.changes;
}

/* =======================================================================
 * DATA MANAGEMENT REPOSITORY
 * ======================================================================= */

/**
 * Retrieves aggregate database summary metrics.
 */
export async function getDatabaseSummary() {
  const db = await getDatabase();
  const [projectsRow, artworksRow, notesRow, tasksRow, colorsRow] = await Promise.all([
    db.getFirstAsync('SELECT COUNT(*) as count FROM projects'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM project_artworks'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM project_notes'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM project_tasks'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM project_colors'),
  ]);

  return {
    totalProjects: projectsRow?.count || 0,
    totalArtworks: artworksRow?.count || 0,
    totalNotes: notesRow?.count || 0,
    totalTasks: tasksRow?.count || 0,
    totalColors: colorsRow?.count || 0,
  };
}

/**
 * Safely purges all project records and their image files.
 * Preserves user_preferences (name, profile picture, theme) and categories.
 */
export async function clearAllProjects() {
  const db = await getDatabase();

  // 1. Gather all local artwork image URIs to clean up files on disk
  const [artworks, projects] = await Promise.all([
    db.getAllAsync('SELECT image_uri FROM project_artworks WHERE image_uri IS NOT NULL'),
    db.getAllAsync('SELECT image_uri FROM projects WHERE image_uri IS NOT NULL'),
  ]);

  const profileImgUri = await getProfileImageUri();

  const allUris = new Set([
    ...artworks.map((a) => a.image_uri),
    ...projects.map((p) => p.image_uri),
  ]);

  // Clean up files (never delete profile image)
  for (const uri of allUris) {
    if (uri && uri !== profileImgUri) {
      await deleteLocalImage(uri);
    }
  }

  // 2. Clear tables
  await db.execAsync(`
    DELETE FROM project_notes;
    DELETE FROM project_tasks;
    DELETE FROM project_colors;
    DELETE FROM project_artworks;
    DELETE FROM projects;
  `);

  return true;
}
