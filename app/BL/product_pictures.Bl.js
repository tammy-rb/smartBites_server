import ProductPicturesDL from "../DL/product_pictures.dl.js";
import fileHandler from "../utils/fileHandler.js";

const path_to_files = 'uploads/product_pictures/';

class ProductPicturesBL {
  static async createProductPicture(req, res) {
    try {
      // Ensure that a file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      if (!req.body.sku || !req.body.weight || !req.body.plate_id) {
        return res.status(400).json({ error: "Missing required fields: sku, weight, or plate_id" });
      }

      // Create product picture object from the request body
      const productPicture = {
        sku: req.body.sku,
        imageUrl: path_to_files + req.file.filename,
        weight: req.body.weight,
        plateId: req.body.plate_id,
      };

      // Call the DL layer to create the product picture
      const newProductPicture = await ProductPicturesDL.create(productPicture);
      res.status(201).json(newProductPicture);
    } catch (error) {
      console.error("Error creating product picture:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getProductPictureBySku(req, res) {
    try {
      const productPictures = await ProductPicturesDL.findBySku(req.params.sku.trim().toUpperCase());
      if (!productPictures || productPictures.length === 0) {
        return res.json([]);
      }
      res.json(productPictures);
    } catch (error) {
      console.error("Error fetching product picture by SKU:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getProductPictureById(req, res) {
    try {
      const productPicture = await ProductPicturesDL.findById(req.params.id);
      if (!productPicture) {
        return res.status(404).json({ error: "Product picture not found" });
      }
      res.json(productPicture);
    } catch (error) {
      console.error("Error fetching product picture by ID:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllProductPictures(req, res) {
    try {
      const productPictures = await ProductPicturesDL.getAll();
      res.json(productPictures);
    } catch (error) {
      console.error("Error fetching all product pictures:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove a product picture and its associated image file
  static async removeProductPicture(req, res) {
    try {
      const productPicture = await ProductPicturesDL.findById(req.params.id);
      if (!productPicture) {
        return res.status(404).json({ error: "Product picture not found" });
      }

      // Delete the product picture from the database
      const deleted = await ProductPicturesDL.remove(req.params.id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete product picture" });
      }
      // Delete the associated image file from the filesystem
      const fileDeleted = await fileHandler.deleteFile(productPicture.image_url);
      if (!fileDeleted) {
        console.error("Failed to delete the image file");
        return res.status(500).json({ error: "Failed to delete the image file" });
      }

      res.json({ message: "Product picture deleted successfully" });
    } catch (error) {
      console.error("Error deleting product picture:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async removeAllProductPicturesBySku(req, res) {
    try {
      const sku = req.params.sku.trim().toUpperCase();
  
      // Fetch all product pictures with the specified SKU
      const productPictures = await ProductPicturesDL.findBySku(sku);
  
      if (!productPictures || productPictures.length === 0) {
        // If no records are found, return with a success status
        return res.status(200).json({ message: "No product pictures found with the specified SKU. No action needed." });
      }
  
      // Delete each product picture and its associated image file
      const deletionResults = await Promise.all(
        productPictures.map(async (productPicture) => {
          // Delete the image file from the filesystem
          const fileDeleted = await fileHandler.deleteFile(productPicture.image_url);
          if (!fileDeleted) {
            throw new Error(`Failed to delete the image file: ${productPicture.image_url}`);
          }
  
          // Delete the product picture record from the database
          const deleted = await ProductPicturesDL.remove(productPicture.id);
          if (!deleted) {
            throw new Error(`Failed to delete the product picture with ID: ${productPicture.id}`);
          }
  
          return { message: `Product picture with SKU ${sku} and ID ${productPicture.id} deleted successfully.` };
        })
      );
  
      // Send success response with details of the deletion
      res.json({ messages: deletionResults });
  
    } catch (error) {
      console.error("Error deleting product pictures by SKU:", error);
      res.status(500).json({ error: error.message });
    }
  }
  
}
  

export default ProductPicturesBL;
