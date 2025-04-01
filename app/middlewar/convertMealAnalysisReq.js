import MealAnalysisDL from "../DL/meal_analysis_req.dl.js"
import path from 'path';

const PATH_TO_FILES = 'uploads/meals_analysis_req/';

export default async function convertMealAnalysisRequest(req, res, next) {
    try {
        // Validate required fields
        if (!req.body.weight_after || !req.body.person_id) {
            return res.status(400).json({ error: 'Missing required fields: weight_after or person_id' });
        }

        // Check if products data is provided
        if (!req.body.products_sku || !req.body.products_weights) {
            return res.status(400).json({ error: 'Missing required fields: products_sku or products_weights' });
        }

        // Parse meal data
        const { 
            description = null, 
            weight_after, 
            person_id,
            products_sku,
            products_weights
        } = req.body;

        // Process SKUs and weights
        const skuList = products_sku.replace(/"/g, '').split(',').map(sku => sku.trim());
        const weightList = products_weights.replace(/"/g, '').split(',').map(weight => parseFloat(weight.trim()));
        console.log(skuList)

        // Validate weights and SKUs match
        if (skuList.length !== weightList.length) {
            return res.status(400).json({ error: 'Products SKUs and weights must have the same number of items' });
        }

        // Get image files
        const mealImages = req.files ?? [];

        // Check if two images (before and after) are provided
        if (mealImages.length < 2) {
            return res.status(400).json({ error: 'Missing required images: before and after meal pictures' });
        }

        // Extract file paths
        const picture_before = PATH_TO_FILES + mealImages[0].filename;
        const picture_after = PATH_TO_FILES + mealImages[1].filename;

        // Fetch product details from database
        const products = await MealAnalysisDL.getProductsBySkuList(skuList);
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'No products found with the provided SKUs' });
        }

        // Create product objects with weights from request
        const productsWithWeights = products.map((product, index) => ({
            ...product,
            weight_in_req: weightList[index] || 0
        }));

        // Calculate weight_before as sum of all product weights
        const weight_before = weightList.reduce((sum, weight) => sum + weight, 0);

        // Create the analysis request object
        const analysisRequest = {
            weight_before,
            weight_after: parseFloat(weight_after),
            person_id,
            description,
            picture_before,
            picture_after,
            products: productsWithWeights
        };

        // Attach to request for the next middleware/controller
        req.analysisRequest = analysisRequest;
        console.log(analysisRequest)
        next();
    } catch (error) {
        console.error('Error in convertMealAnalysisRequest middleware:', error);
        res.status(500).json({ error: 'Error processing meal analysis request', details: error.message });
    }
}
