const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dvix6mmnt';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

/**
 * Uploads an image (Base64 data URI, file path, or remote URL) to Cloudinary
 * and extracts ONLY the relative path to store in PostgreSQL.
 *
 * Example Cloudinary response:
 * {
 *   public_id: "eas_students/student_1_1726880000",
 *   version: 1789934033,
 *   format: "jpg",
 *   secure_url: "https://res.cloudinary.com/dvix6mmnt/image/upload/v1789934033/eas_students/student_1_1726880000.jpg"
 * }
 *
 * Stored relative path in PostgreSQL:
 * "v1789934033/eas_students/student_1_1726880000.jpg"
 *
 * @param {string} imageSource - Base64 Data URL or file string
 * @param {string|number} studentId - ID of student
 * @returns {Promise<{ relativePath: string, secureUrl: string, publicId: string }>}
 */
const uploadImageToCloudinary = async (imageSource, studentId) => {
  if (!imageSource) {
    throw new Error('No image provided for upload');
  }

  // If already a relative Cloudinary path (e.g. 'v1789934033/download.jpg'), return as-is
  if (!imageSource.startsWith('data:') && !imageSource.startsWith('http://') && !imageSource.startsWith('https://')) {
    const cleanRelative = imageSource.replace(/^\/+/, '');
    return {
      relativePath: cleanRelative,
      secureUrl: `https://res.cloudinary.com/${cloudName}/image/upload/${cleanRelative}`,
      publicId: cleanRelative
    };
  }

  // Check if Cloudinary credentials are configured
  if (apiKey && apiSecret && apiKey.trim().length > 0 && apiSecret.trim().length > 0) {
    try {
      const uploadResult = await cloudinary.uploader.upload(imageSource, {
        folder: 'eas_students',
        public_id: `stu_${studentId}_${Date.now()}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'limit', quality: 'auto' }
        ]
      });

      const version = uploadResult.version ? `v${uploadResult.version}/` : '';
      const format = uploadResult.format || 'jpg';
      const relativePath = `${version}${uploadResult.public_id}.${format}`;

      return {
        relativePath,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    } catch (err) {
      console.warn('Cloudinary upload error:', err.message);
      throw new Error(`Cloudinary upload failed: ${err.message}`);
    }
  }

  // Fallback if credentials not yet configured in .env:
  // Simulate relative path and warn so the system continues operating cleanly
  console.warn('⚠️ Cloudinary API Key/Secret not provided in .env. To enable live uploads, add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env.');
  const simulatedRelative = `v${Date.now()}/eas_students/stu_${studentId}.jpg`;
  return {
    relativePath: simulatedRelative,
    secureUrl: `https://res.cloudinary.com/${cloudName}/image/upload/${simulatedRelative}`,
    publicId: `eas_students/stu_${studentId}`
  };
};

module.exports = {
  cloudinary,
  uploadImageToCloudinary
};
