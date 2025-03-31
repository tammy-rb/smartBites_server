import express from "express";
import ProductCrud from "../BL/product.Bl.js"
import FileUpload from"../middlewar/multerConfig.js"

const router = express.Router();

// Create a product (with validation & image upload)
router.post("/", ProductCrud.createProduct);

// Get a product by SKU
router.get("/sku/:sku", ProductCrud.getProductBySku);

// Get all products (optional sku and name filters)
router.get("/", ProductCrud.getAllProducts);

// Update a product 
router.put("/:sku", ProductCrud.updateProduct);

// Delete a product by sku
router.delete("/:sku", ProductCrud.removeProduct);

export default router;
