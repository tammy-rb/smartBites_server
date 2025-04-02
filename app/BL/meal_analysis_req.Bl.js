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
            
            // Prepare data for LLM - excluding weight information that will be predicted
            const llmRequestPrompt = prepareLlmPrompt(analysisRequest);
            
            // Send to LLM and get results
            //const llmResults = await MealAnalysisController.analyzeMealWithLLM(analysisRequest, llmRequestPrompt);
            
            // Compare with provided weights for verification
            //const verificationResults = MealAnalysisController.verifyResults(llmResults, analysisRequest);
            
            // Return combined results
            res.status(200).json({
                request_id: savedRequest.id,
                //llm_analysis: llmResults,
                //verification: verificationResults
            });
            
        } catch (error) {
            console.error('Error in meal analysis process:', error);
            res.status(500).json({ error: 'Error processing meal analysis', details: error.message });
        }
    }
    
    
    
}

export default MealAnalysisController;
