import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import { initializeDatabase } from '../database/database';
import * as repo from '../database/projectRepository';
import { deleteLocalImage } from '../services/imageStorage';
import { getThemeColors, LIGHT_COLORS } from '../constants/theme';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../constants/categories';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const deviceColorScheme = useColorScheme();

  const [projects, setProjects] = useState([]);
  const [userName, setUserNameState] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [userNameLoading, setUserNameLoading] = useState(true);

  // Settings preferences
  const [themePreference, setThemePreferenceState] = useState('system');
  const [defaultSort, setDefaultSortState] = useState('newest');
  const [galleryLayout, setGalleryLayoutState] = useState('grid');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    favorites: 0,
    totalArtworks: 0,
    categoryCounts: {},
    recentProjects: [],
  });

  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  // Dynamic Theme Calculation
  const isDark = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return deviceColorScheme === 'dark';
  }, [themePreference, deviceColorScheme]);

  const themeColors = useMemo(() => getThemeColors(isDark), [isDark]);

  const loadData = async () => {
    try {
      const [
        all,
        statistics,
        userProfile,
        themePref,
        sortPref,
        galleryPref,
        allCats,
      ] = await Promise.all([
        repo.getAllProjects(),
        repo.getProjectStatistics(),
        repo.getUserProfile(),
        repo.getThemePreference(),
        repo.getDefaultSortPreference(),
        repo.getGalleryLayoutPreference(),
        repo.getAllCategories(),
      ]);

      setProjects(all || []);
      setStats(statistics);
      setUserNameState(userProfile?.name || null);
      setProfileImageUri(userProfile?.profileImageUri || null);
      setThemePreferenceState(themePref || 'system');
      setDefaultSortState(sortPref || 'newest');
      setGalleryLayoutState(galleryPref || 'grid');

      if (allCats && allCats.length > 0) {
        setCategories(allCats);
      }
    } catch (error) {
      console.error('Error loading projects data:', error);
    }
  };

  // Initialize DB once on app mount
  const init = useCallback(async () => {
    try {
      setLoading(true);
      await initializeDatabase();
      setDbReady(true);
      await loadData();
    } catch (error) {
      console.error('Error initializing DesignVault database:', error);
    } finally {
      setLoading(false);
      setUserNameLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const refreshData = async () => {
    await loadData();
  };

  // Profile Handlers
  const handleUpdateProfile = async ({ name, profileImageUri: newImgUri }) => {
    const updated = await repo.setUserProfile({ name, profileImageUri: newImgUri });
    setUserNameState(updated.name || null);
    setProfileImageUri(updated.profileImageUri || null);
    return updated;
  };

  const handleUpdateUserName = async (name) => {
    const trimmed = name ? name.trim() : '';
    await repo.setUserName(trimmed);
    setUserNameState(trimmed || null);
    return trimmed;
  };

  const handleUpdateProfileImage = async (uri) => {
    await repo.setProfileImageUri(uri);
    setProfileImageUri(uri || null);
    return uri;
  };

  // Preferences Handlers
  const handleSetThemePreference = async (pref) => {
    const saved = await repo.setThemePreference(pref);
    setThemePreferenceState(saved);
    return saved;
  };

  const handleSetDefaultSort = async (sort) => {
    const saved = await repo.setDefaultSortPreference(sort);
    setDefaultSortState(saved);
    return saved;
  };

  const handleSetGalleryLayout = async (layout) => {
    const saved = await repo.setGalleryLayoutPreference(layout);
    setGalleryLayoutState(saved);
    return saved;
  };

  // Project CRUD Handlers
  const handleAddProject = async (projectData) => {
    const newId = await repo.addProject(projectData);
    await loadData();
    return newId;
  };

  const handleUpdateProject = async (id, projectData) => {
    const updated = await repo.updateProject(id, projectData);
    await loadData();
    return updated;
  };

  const handleDeleteProject = async (id) => {
    const deleted = await repo.deleteProject(id);
    if (deleted && deleted.image_uri) {
      await deleteLocalImage(deleted.image_uri);
    }
    await loadData();
    return deleted;
  };

  const handleToggleFavorite = async (id) => {
    const updated = await repo.toggleFavorite(id);
    await loadData();
    return updated;
  };

  // Category Handlers
  const handleAddCategory = async (catData) => {
    const updated = await repo.addCategory(catData);
    setCategories(updated);
    await loadData();
    return updated;
  };

  const handleRenameCategory = async (id, newName) => {
    const updated = await repo.renameCategory(id, newName);
    setCategories(updated);
    await loadData();
    return updated;
  };

  const handleDeleteCategory = async (id) => {
    const updated = await repo.deleteCategory(id);
    setCategories(updated);
    await loadData();
    return updated;
  };

  const handleReassignCategoryProjects = async (oldName, newName) => {
    const count = await repo.reassignCategoryProjects(oldName, newName);
    await loadData();
    return count;
  };

  // Data Management Handlers
  const handleClearAllProjects = async () => {
    await repo.clearAllProjects();
    await loadData();
    return true;
  };

  return (
    <ProjectContext.Provider
      value={{
        // Projects state & stats
        projects,
        stats,
        loading,
        dbReady,
        refreshData,
        addProject: handleAddProject,
        updateProject: handleUpdateProject,
        deleteProject: handleDeleteProject,
        toggleFavorite: handleToggleFavorite,
        getProjectById: repo.getProjectById,
        filterProjects: repo.filterProjects,

        // Profile
        userName,
        profileImageUri,
        userNameLoading,
        updateProfile: handleUpdateProfile,
        updateUserName: handleUpdateUserName,
        updateProfileImage: handleUpdateProfileImage,

        // Theme
        themePreference,
        isDark,
        themeColors,
        setThemePreference: handleSetThemePreference,

        // Preferences
        defaultSort,
        setDefaultSort: handleSetDefaultSort,
        galleryLayout,
        setGalleryLayout: handleSetGalleryLayout,

        // Categories
        categories,
        addCategory: handleAddCategory,
        renameCategory: handleRenameCategory,
        deleteCategory: handleDeleteCategory,
        reassignCategoryProjects: handleReassignCategoryProjects,

        // Data Management
        clearAllProjects: handleClearAllProjects,
        getDatabaseSummary: repo.getDatabaseSummary,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}

export function useTheme() {
  const context = useProjects();
  return {
    isDark: context.isDark,
    colors: context.themeColors,
    themePreference: context.themePreference,
    setThemePreference: context.setThemePreference,
  };
}
