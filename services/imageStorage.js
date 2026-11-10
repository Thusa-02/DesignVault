import { File, Directory, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const IMAGES_SUBDIR = 'designvault_images';

/**
 * Gets or creates the persistent images directory using modern Expo FileSystem API.
 * Returns the Directory instance.
 */
export function getImagesDirectory() {
  const dir = new Directory(Paths.document, IMAGES_SUBDIR);
  if (!dir.exists) {
    try {
      dir.create({ intermediates: true });
    } catch (err) {
      console.warn('Could not create images directory with Directory.create():', err?.message || err);
    }
  }
  return dir;
}

/**
 * Copies a single picked asset from ImagePicker into persistent local storage.
 * Returns { image_uri: string, artwork_title: string } or null on failure.
 */
export async function saveSingleAssetLocally(asset) {
  if (!asset || !asset.uri || typeof asset.uri !== 'string') return null;

  const sourceUri = asset.uri;

  // Extract clean extension and title
  let fileExt = 'jpg';
  let defaultTitle = '';
  if (asset.fileName && asset.fileName.includes('.')) {
    const parts = asset.fileName.split('.');
    fileExt = parts[parts.length - 1];
    defaultTitle = parts.slice(0, -1).join('.').replace(/[_-]/g, ' ');
  } else if (sourceUri.includes('.')) {
    const cleanUri = sourceUri.split('?')[0];
    const ext = cleanUri.split('.').pop();
    if (ext && ext.length <= 5) fileExt = ext;
  }
  fileExt = fileExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const uniqueFileName = `dv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  // Copy using modern API with fallback
  try {
    const targetDir = getImagesDirectory();
    const destFile = new File(targetDir, uniqueFileName);
    const sourceFile = new File(sourceUri);

    await sourceFile.copy(destFile);

    console.log(`[DesignVault] Saved artwork to: ${destFile.uri}`);
    return {
      image_uri: destFile.uri,
      artwork_title: defaultTitle,
    };
  } catch (modernErr) {
    console.warn('[DesignVault] Modern copy failed, using fallback:', modernErr);
    try {
      const legacyFS = require('expo-file-system/legacy');
      const legacyDir = `${legacyFS.documentDirectory}${IMAGES_SUBDIR}/`;
      const dirInfo = await legacyFS.getInfoAsync(legacyDir);
      if (!dirInfo.exists) {
        await legacyFS.makeDirectoryAsync(legacyDir, { intermediates: true });
      }
      const legacyDest = `${legacyDir}${uniqueFileName}`;
      await legacyFS.copyAsync({ from: sourceUri, to: legacyDest });
      console.log(`[DesignVault] Saved artwork via fallback to: ${legacyDest}`);
      return {
        image_uri: legacyDest,
        artwork_title: defaultTitle,
      };
    } catch (fallbackErr) {
      throw new Error(
        `Failed copying image: ${modernErr?.message || modernErr} | Fallback: ${fallbackErr?.message || fallbackErr}`
      );
    }
  }
}

/**
 * Prompts user to pick one or more artworks from gallery and copies each to persistent storage.
 * Returns array of { image_uri, artwork_title } objects.
 */
export async function pickAndSaveArtworks() {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      console.warn('[DesignVault] Media library access denied by user');
      Alert.alert(
        'Permission Required',
        'Please grant photo gallery permissions to select artworks for your project.'
      );
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const savedList = [];
    for (const asset of result.assets) {
      try {
        const saved = await saveSingleAssetLocally(asset);
        if (saved) savedList.push(saved);
      } catch (err) {
        console.error('[DesignVault] Error saving selected artwork:', err);
      }
    }

    return savedList;
  } catch (error) {
    console.error('[DesignVault] Error picking artworks:', error);
    Alert.alert('Artwork Selection Error', `Failed to select artworks: ${error?.message || error}`);
    return [];
  }
}

/**
 * Single image picker (backward compatibility).
 */
export async function pickAndSaveImage() {
  const artworks = await pickAndSaveArtworks();
  return artworks.length > 0 ? artworks[0].image_uri : null;
}

/**
 * Safely deletes an image file if and only if it belongs to DesignVault's
 * persistent app directory. Never touches external or user gallery files.
 */
export async function deleteLocalImage(fileUri) {
  if (!fileUri || typeof fileUri !== 'string') return;

  try {
    const docUri = Paths.document.uri;
    // Strictly verify file belongs to our app storage
    if (fileUri.includes(IMAGES_SUBDIR) || fileUri.startsWith(docUri)) {
      try {
        const file = new File(fileUri);
        if (file.exists) {
          file.delete();
          console.log(`[DesignVault] Deleted local file: ${fileUri}`);
          return;
        }
      } catch (modernErr) {
        // Fallback to legacy delete
        const legacyFS = require('expo-file-system/legacy');
        const info = await legacyFS.getInfoAsync(fileUri);
        if (info.exists) {
          await legacyFS.deleteAsync(fileUri, { idempotent: true });
          console.log(`[DesignVault] Deleted local file via fallback: ${fileUri}`);
        }
      }
    }
  } catch (error) {
    console.warn(`[DesignVault] Could not delete image file [${fileUri}]:`, error?.message || error);
  }
}

/**
 * Checks if a given file URI exists on the device.
 */
export async function checkImageExists(fileUri) {
  if (!fileUri || typeof fileUri !== 'string') return false;
  try {
    const file = new File(fileUri);
    return file.exists;
  } catch {
    try {
      const legacyFS = require('expo-file-system/legacy');
      const info = await legacyFS.getInfoAsync(fileUri);
      return info.exists;
    } catch {
      return false;
    }
  }
}
