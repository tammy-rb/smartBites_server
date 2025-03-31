import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); //url path of the current server
const __dirname = path.dirname(__filename); //directory path of the server

const fileHandler = {
  /**
   * Saves an uploaded file to the specified folder in the public directory.
   * @param {Object} file - The uploaded file object from Multer.
   * @param {string} folder - The folder name in /public where the file should be saved.
   * @returns {string | null} - The file path if saved successfully, otherwise null.
   */
  addFile: async (file, folder) => {
    try {
      if (!file) return null;
      //path of directory to store the new filr
      const publicPath = path.join(__dirname, '../../public', folder); 
      
      // Ensure directory exists
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }

      const filePath = path.join(publicPath, file.filename);
      // Save the file to the specified folder
      await fs.promises.writeFile(filePath, file.buffer);
      return `${folder}/${file.filename}`; // Return relative file path
    } catch (err) {
      console.error("Failed to add file:", err);
      return null;
    }
  },

  /**
   * Deletes a file from the public directory.
   * @param {string} filePath - The relative file path inside /public.
   * @returns {boolean} - True if deletion was successful, false otherwise.
   */
  deleteFile: async (filePath) => {
    try {
      if (!filePath) return false;

      const fullPath = path.join(__dirname, '../../public', filePath);
      console.log(fullPath)
      await fs.promises.unlink(fullPath);

      return true;
    } catch (err) {
      console.error(`Failed to delete file ${filePath}:`, err);
      return false;
    }
  }
};

export default fileHandler;
