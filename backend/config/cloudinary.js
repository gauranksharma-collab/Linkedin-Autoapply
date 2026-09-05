const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadResumeToCloudinary(filePath, userId) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `linkedin-auto-apply/resumes/${userId}`,
      resource_type: "auto",
    });
    fs.unlinkSync(filePath);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw err;
  }
}

module.exports = { uploadResumeToCloudinary };
