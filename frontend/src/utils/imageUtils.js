/**
 * Cloudinary URL resolver utility.
 * The backend stores only the relative path/versioned identifier (e.g. 'v1789934033/download.jpg')
 * to keep the database clean and lightweight.
 */

export const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dvix6mmnt/image/upload/';
export const DEFAULT_AVATAR_PATH = 'v1789934033/download.jpg';
export const MAX_IMAGE_SIZE_BYTES = 100 * 1024; // 100 KB
export const MAX_IMAGE_SIZE_KB = 100;

/**
 * Resolves a relative Cloudinary path to a full URL.
 * @param {string} imagePath - e.g. 'v1789934033/download.jpg' or full URL
 * @returns {string} Fully qualified image URL
 */
export const getCloudinaryUrl = (imagePath) => {
  if (!imagePath) {
    return `${CLOUDINARY_BASE_URL}${DEFAULT_AVATAR_PATH}`;
  }
  if (
    imagePath.startsWith('http://') || 
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('blob:')
  ) {
    return imagePath;
  }
  // Remove leading slashes if any
  const cleanPath = imagePath.replace(/^\/+/, '');
  return `${CLOUDINARY_BASE_URL}${cleanPath}`;
};

/**
 * Validates whether a File object is within the 100 KB limit.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateImageSize = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const actualKb = (file.size / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size is ${actualKb} KB. Maximum allowed size is ${MAX_IMAGE_SIZE_KB} KB. Please select a compressed image under 100 KB.`
    };
  }
  return { valid: true };
};
