import Product from '../DL/product.dl.js';
import ProductPicturesDL from '../DL/product_pictures.dl.js';

class ProductCrud {
  static async createProduct(req, res) {
    try {
      // Create new product object with only SKU and name
      const product = new Product({
        sku: req.body.sku,
        name: req.body.name
      });
      // Create the product
      const newProduct = await Product.create(product);
      res.status(201).json(newProduct);
      
    } catch (error) {
      if (error.kind === "sku_exists") {
        return res.status(400).json({ error: "Product with this SKU already exists" });
      }
      console.error("Error creating product:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message });
      }
    }
  }

  static async getProductBySku(req, res) {
    try {
      const product = await Product.findBySku(req.params.sku.trim().toUpperCase());
      res.json(product);
    } catch (error) {
      if (error.kind === "not_found") {
        return res.status(404).json({ error: "Product not found" });
      }
      console.error("Error fetching product by SKU:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllProducts(req, res) {
    try {
      const { page = 1, limit = 10, sku, name } = req.query;
      const products = await Product.getAll(parseInt(page), parseInt(limit), sku, name);
      res.json(products);
    } catch (error) {
      console.error("Error fetching all products:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getProductWithPictures(req, res) {
    try {
      const sku = req.params.sku.trim().toUpperCase();
      const product = await Product.findBySku(sku);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      const pictures = await ProductPicturesDL.findBySku(sku);
      res.json({ ...product, pictures });
    } catch (error) {
      console.error("Error fetching product with pictures:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async updateProduct(req, res) {
    try {
      // Create updated product object with only name
      const updatedProduct = {
        name: req.body.name
      };

      const updated = await Product.update(req.params.sku, updatedProduct);
      res.json(updated);
    } catch (error) {
      if (error.kind === "not_found") {
        return res.status(404).json({ error: "Product not found" });
      }
      console.error("Error updating product:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async removeProduct(req, res) {
    try {
      const sku = req.params.sku.trim().toUpperCase();

      // Fetch all product pictures associated with the SKU
      const productPictures = await ProductPicturesDL.findBySku(sku);

      if (productPictures.length > 0) {
        // Delete each product picture's image file
        await Promise.all(
          productPictures.map(async (picture) => {
            const fileDeleted = await fileHandler.deleteFile(picture.image_url);
            if (!fileDeleted) {
              console.error(`Failed to delete image file: ${picture.image_url}`);
            }
          })
        );

        // Remove all product pictures from the database
        await ProductPicturesDL.removeAllBySku(sku);
      }

      // Remove the product itself
      await Product.remove(sku);

      res.json({ message: "Product and associated pictures deleted successfully" });
    } catch (error) {
      if (error.kind === "not_found") {
        return res.status(404).json({ error: "Product not found" });
      }
      console.error("Error deleting product:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default ProductCrud;