import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AsyncStorageEasyModeStore,
  EASY_MODE_STORAGE_KEY,
  easyModeOn,
  parseEasyChoice,
} from './easyModeStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('easy mode choice (T-331)', () => {
  it('follows the system until the person chooses', () => {
    expect(easyModeOn(null, true)).toBe(true);
    expect(easyModeOn(null, false)).toBe(false);
    expect(easyModeOn(false, true)).toBe(false);
    expect(easyModeOn(true, false)).toBe(true);
  });

  it('reads only what it wrote; anything else is no choice', () => {
    expect(parseEasyChoice('on')).toBe(true);
    expect(parseEasyChoice('off')).toBe(false);
    expect(parseEasyChoice(null)).toBeNull();
    expect(parseEasyChoice('yes')).toBeNull();
  });

  it('keeps the choice across launches', async () => {
    await new AsyncStorageEasyModeStore().save(true);
    expect(await AsyncStorage.getItem(EASY_MODE_STORAGE_KEY)).toBe('on');
    expect(await new AsyncStorageEasyModeStore().load()).toBe(true);
  });

  it('treats a storage failure as no choice', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    expect(await new AsyncStorageEasyModeStore().load()).toBeNull();
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    await expect(new AsyncStorageEasyModeStore().save(false)).resolves.toBeUndefined();
  });
});
