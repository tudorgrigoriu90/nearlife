import * as ImagePicker from 'expo-image-picker';
import { pickNotePhoto } from './pickPhoto';

// T-348.
const picker = ImagePicker as unknown as Record<string, jest.Mock>;
beforeEach(() => jest.clearAllMocks());

describe('pickNotePhoto', () => {
  it('takes a photo with the camera once permitted, and picks one from the gallery', async () => {
    expect(await pickNotePhoto('camera')).toBe('file:///cache/camera.jpg');
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ exif: false, quality: 0.6 }));
    expect(await pickNotePhoto('library')).toBe('file:///cache/gallery.jpg');
  });

  it('gives nothing when the camera is refused, the user cancels, or the picker fails', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false });
    expect(await pickNotePhoto('camera')).toBeNull();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
    expect(await pickNotePhoto('library')).toBeNull();
    picker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('no activity'));
    expect(await pickNotePhoto('library')).toBeNull();
  });
});
