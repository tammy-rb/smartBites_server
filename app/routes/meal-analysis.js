import express from 'express';
import FileUpload from '../middlewares/FileUpload.js';
// make the function make the dynamic prompt,  a function send the prompt to LLM.
const router = express.Router();

// until 5 images, each image size max is 15MB.
const uploadMealImages = FileUpload('uploads/meals', ['image/jpeg', 'image/png'], 'images', 5, 15);

// Route to handle meal analysis request
router.post('/meal-analysis', uploadMealImages, async (req, res) => {
    try {
        const { mealId, additionalContent, plateDiameter } = req.body;
        
        // Validate required fields
        if (!mealId) {
            return res.status(400).json({ error: 'Meal ID is required.' });
        }

        // Get uploaded files
        const images = req.files ? req.files.map(file => file.path) : [];
        if (images.length === 0) {
            return res.status(400).json({ error: 'At least one image is required.' });
        }

        // Generate a dynamic prompt for the LLM
        const prompt = generateMealPrompt({ mealId, additionalContent, plateDiameter, images });

        // Send request to LLM (Mock function for now)
        const llmResponse = await processMealRequest(prompt);

        // Return the response to the user
        res.json({ success: true, data: llmResponse });
    } catch (error) {
        console.error('Error processing meal analysis request:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
