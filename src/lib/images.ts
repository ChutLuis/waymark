import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  contentType: string;
  /** File extension matching the content type. */
  extension: string;
}

/** Opens the system photo library; null when the user cancels. */
export async function pickImage(aspect: [number, number]): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const contentType = asset.mimeType ?? 'image/jpeg';
  return {
    uri: asset.uri,
    contentType,
    extension: contentType === 'image/png' ? 'png' : 'jpg',
  };
}
