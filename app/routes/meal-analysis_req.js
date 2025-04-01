import express from 'express';
import FileUpload from "../middlewar/multerConfig.js"
import convertMealAnalysisReq from '../middlewar/convertMealAnalysisReq.js'
import MealAnalysisReq from '../BL/meal_analysis_req.Bl.js';

const router = express.Router();

// Configure file upload: up to 2 images, each 20MB max
const uploadMealImages = FileUpload('uploads/meals_analysis_req', ['image/jpeg', 'image/png'], 'images', 2, 20);

// Route to handle meal analysis request
router.post('/', uploadMealImages, convertMealAnalysisReq, MealAnalysisReq.processRequest);

export default router;
