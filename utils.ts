import Constants from 'expo-constants';

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === 'development') {
    // hostUri is set by the dev client / Expo Go and tracks the Metro server
    // actually serving this session; experienceUrl can be undefined or stale.
    const hostUri = Constants.expoConfig?.hostUri;
    const origin = hostUri
      ? `http://${hostUri}`
      : Constants.experienceUrl?.replace('exp://', 'http://');
    if (!origin) {
      throw new Error('Unable to determine the dev server origin for API routes');
    }
    return origin.concat(path);
  }

  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL environment variable is not defined',
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
};
