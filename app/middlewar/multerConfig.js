import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
/*
Upload files in a generic directory,
generic key,
generic valid types.
Throw an error if files are not valid.
*/

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware to filter file uploads by extension
const fileFilter = function(validExt) {
    return function(req, file, cb) {
        if (!validExt || validExt.length === 0) {
            // If no valid extensions provided, allow all file types
            cb(null, true);
        } else {
            // Check if file mimetype is in the list of allowed types
            const allowedTypes = validExt;
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                // Reject file if mimetype is not in the allowed types
                cb(new Error('Invalid file type!'), false);
            }
        }
    };
};

// Middleware to handle file uploads
const FileUpload = (folderPath, filterBy, fileKey, maxCount = 1, maxFileSize = 100) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, '../../public', folderPath);

            // Check if the directory exists
            fs.exists(uploadPath, (exists) => {
                if (!exists) {
                    // Create the directory if it doesn't exist
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath); // Set the destination directory
            });
        },
        filename: (req, file, cb) => {
            cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`); // Define how files should be named
        }
    });

    const upload = multer({
        storage: storage,
        fileFilter: fileFilter(filterBy),
        limits: { fileSize: maxFileSize * 1024 * 1024 }, //Limit file size 
    });

    // Choose the upload method based on the number of files expected
    let uploadMiddleware;
    if (maxCount === 1) {
        uploadMiddleware = upload.single(fileKey);
    } else {
        uploadMiddleware = upload.array(fileKey, maxCount); // For multiple files
    }

    // Middleware to handle multer errors and send a 400 response for file type validation failures
    const middleware = (req, res, next) => {
        uploadMiddleware(req, res, function(err) {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred (e.g., file too large, unsupported file type)
                res.status(400).send('File upload error: ' + err.message);
            } else if (err) {
                // An unexpected error occurred
                res.status(500).send('Internal server error: ' + err.message);
            } else {
                // No errors, proceed to the next middleware/route handler
                next();
            }
        });
    };

    return middleware;
};

export default FileUpload;