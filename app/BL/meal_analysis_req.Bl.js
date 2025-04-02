import MealAnalysisDL from "../DL/meal_analysis_req.dl.js"
import axios from 'axios';
import fs from 'fs';
import prepareLlmPrompt from "../LLM/prepareLLMPrompt.js";

class MealAnalysisController {

    static async processRequest(req, res) {

        try {
            // Get the analysis request object from middleware
            const analysisRequest = req.analysisRequest;
            
            // Save the request to the database
            const savedRequest = await MealAnalysisDL.saveAnalysisRequest(analysisRequest);
            
            // Send to LLM and get results
            // Send request to Python service
            const pythonApiResponse = await axios.post("http://127.0.0.1:8000/analyze-meal", {
                meal_details: analysisRequest, // Pass the meal description
                model_name: "gpt-4"  // Change model dynamically
            });

            // Return response
            res.status(200).json({
                request_id: savedRequest.id,
                llm_analysis: pythonApiResponse.data.analysis
            });
            
        } catch (error) {
            console.error('Error in meal analysis process:', error);
            res.status(500).json({ error: 'Error processing meal analysis', details: error.message });
        }
    }
    
    
    
}

export default MealAnalysisController;
