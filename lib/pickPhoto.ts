import * as ImagePicker from 'expo-image-picker';

// The photo for a field note (T-348): the camera or the gallery, one image, recompressed (quality
// 0.6) so a note photo is a few hundred kB, without its metadata in the result. The file is copied
// into the notes folder by lib/notePhotos.ts; this returns the picker's temporary file.

export type PhotoSource = 'camera' | 'library';

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  exif: false,
  allowsEditing: false,
};

/** The picked photo's temporary uri, or null when cancelled, refused or unavailable. */
export async function pickNotePhoto(source: PhotoSource): Promise<string | null> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return null;
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  } catch {
    return null;
  }
}
