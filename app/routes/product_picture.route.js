import express from "express";
import ProductPicturesBL from "../BL/product_pictures.Bl.js";
import FileUpload from "../middlewar/multerConfig.js";

const router = express.Router();

// Middleware for file uploads (accepts only JPG/PNG images)
const uploadMiddleware = FileUpload("uploads/product_pictures", ["image/jpeg", "image/png"], "image", 1, 20);

// Create a product picture (with image upload)
router.post("/", uploadMiddleware, ProductPicturesBL.createProductPicture);

// Get a product picture by SKU
router.get("/sku/:sku", ProductPicturesBL.getProductPictureBySku);

// Get a product picture by ID
router.get("/:id", ProductPicturesBL.getProductPictureById);

// Get all product pictures
router.get("/", ProductPicturesBL.getAllProductPictures);

// Delete a product picture by ID
router.delete("/:id", ProductPicturesBL.removeProductPicture);

// Delete all product pictures by SKU
router.delete("/sku/:sku", ProductPicturesBL.removeAllProductPicturesBySku);

export default router;
