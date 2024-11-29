import type { IAudioMetadata } from 'music-metadata';
import type { MultimediaItem } from 'src/types';

import {
  AUDIO_EXTENSIONS,
  HEIC_EXTENSIONS,
  JWL_PLAYLIST_EXTENSIONS,
  JWPUB_EXTENSIONS,
  PDF_EXTENSIONS,
  PURE_IMG_EXTENSIONS,
  SVG_EXTENSIONS,
  VIDEO_EXTENSIONS,
  ZIP_EXTENSIONS,
} from 'src/constants/media';
import { errorCatcher } from 'src/helpers/error-catcher';

/**
 * Checks if a file is of a certain type.
 * @param filepath The path to the file.
 * @param validExtensions The valid extensions for the file type.
 * @returns The result of the check.
 */
const isFileOfType = (filepath: string, validExtensions: string[]) => {
  try {
    if (!filepath) return false;
    const fileExtension = window.electronApi.path
      .parse(filepath)
      .ext.toLowerCase()
      .slice(1);
    return validExtensions.includes(fileExtension);
  } catch (error) {
    errorCatcher(error);
    return false;
  }
};

/**
 * Checks if a file is an image.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isImage = (filepath: string) => {
  return isFileOfType(filepath, PURE_IMG_EXTENSIONS);
};

/**
 * Checks if a file is a HEIC image.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isHeic = (filepath: string) => {
  return isFileOfType(filepath, HEIC_EXTENSIONS);
};

/**
 * Checks if a file is an SVG image.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isSvg = (filepath: string) => {
  return isFileOfType(filepath, SVG_EXTENSIONS);
};

/**
 * Checks if a file is a video.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isVideo = (filepath: string) => {
  return isFileOfType(filepath, VIDEO_EXTENSIONS);
};

/**
 * Checks if a file is an audio file.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isAudio = (filepath: string) => {
  return isFileOfType(filepath, AUDIO_EXTENSIONS);
};

/**
 * Checks if a file is a PDF.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isPdf = (filepath: string) => {
  return isFileOfType(filepath, PDF_EXTENSIONS);
};

/**
 * Tests if a file is an archive.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isArchive = (filepath: string) => {
  return isFileOfType(filepath, ZIP_EXTENSIONS);
};

/**
 * Checks if a file is a JWPUB.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isJwpub = (filepath: string) => {
  return isFileOfType(filepath, JWPUB_EXTENSIONS);
};

/**
 * Checks if a file is a JW playlist.
 * @param filepath The path to the file.
 * @returns The result of the check.
 */
export const isJwPlaylist = (filepath: string) => {
  return isFileOfType(filepath, JWL_PLAYLIST_EXTENSIONS);
};

/**
 * Checks if a media item is a song.
 * @param multimediaItem The multimedia item to check.
 * @returns False if the multimedia item is not a song, otherwise the track number.
 */
export const isSong = (multimediaItem: MultimediaItem) => {
  if (
    !multimediaItem.FilePath ||
    !isVideo(multimediaItem.FilePath) ||
    !multimediaItem.Track ||
    !multimediaItem.KeySymbol?.includes('sjj')
  ) {
    return false;
  }
  return multimediaItem.Track.toString();
};

/**
 * Checks if a file is a remote file.
 * @param file The file to check.
 * @returns Weather the file is a remote file.
 */
export const isRemoteFile = (
  file: File | { filename?: string; filetype?: string; path: string },
): file is { filename?: string; filetype?: string; path: string } => {
  if (!file.path) return false;
  return file.path.startsWith('http://') || file.path.startsWith('https://');
};

/**
 * Infers the extension of a file based on its type.
 * @param filename The name of the file.
 * @param filetype The type of the file.
 * @returns The filename with the inferred extension.
 * @example
 * inferExtension('An audio file', 'audio/mpeg') // An audio file.mp3
 * inferExtension('A video', 'video/mp4') // A video.mp4
 */
export const inferExtension = async (filename: string, filetype?: string) => {
  if (!filetype) return filename;
  const { default: mime } = await import('mime');
  const extractedExtension = mime.extension(filetype);
  if (!extractedExtension) {
    return filename;
  }
  const hasExtension = /\.[0-9a-z]+$/i.test(filename);
  if (hasExtension) {
    return filename;
  }
  return `${filename}.${extractedExtension}`;
};

/**
 * Gets the metadata of a media file.
 * @param mediaPath The path to the media file.
 * @returns The metadata of the media file.
 */
export const getMetadataFromMediaPath = async (
  mediaPath: string,
): Promise<IAudioMetadata> => {
  const defaultMetadata = {
    common: {
      disk: { no: null, of: null },
      movementIndex: { no: null, of: null },
      title: '',
      track: { no: null, of: null },
    },
    format: {
      duration: 0,
      tagTypes: [],
      trackInfo: [],
    },
    native: {},
    quality: { warnings: [] },
  };
  try {
    mediaPath = window.electronApi.fileUrlToPath(mediaPath);
    if (!mediaPath || !(await window.electronApi.fs.exists(mediaPath)))
      return defaultMetadata;
    if (isFileOfType(mediaPath, ['mov'])) {
      const videoDuration =
        await window.electronApi.getVideoDuration(mediaPath);
      defaultMetadata.format.duration = videoDuration?.seconds || 0;
      return defaultMetadata;
    }
    return await window.electronApi.parseMediaFile(mediaPath);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { mediaPath, name: 'getMetadataFromMediaPath' } },
    });
    return defaultMetadata;
  }
};
