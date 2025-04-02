import MealAnalysisDL from "../DL/meal_analysis_req.dl.js";
import axios from "axios";

class MealAnalysisController {
  static async processRequest(req, res) {
    try {
      // Get the analysis request object from middleware
      const analysisRequest = req.analysisRequest;
      
      // Save the request to the database
      const savedRequest = await MealAnalysisDL.saveAnalysisRequest(analysisRequest);
      
      // Use the new makeLLMRequest function to handle Python service communication
      const llmResponse = await MealAnalysisController.makeLLMRequest(analysisRequest, "gpt-4o");
      
      // Return response
      res.status(200).json({
        request_id: savedRequest.id,
        llm_analysis: llmResponse.analysis
      });
      
    } catch (error) {
      console.error('Error in meal analysis process:', error);
      
      // Enhanced error handling
      let errorMessage = 'Error processing meal analysis';
      let errorDetails = error.message;
      let statusCode = 500;
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        // More specific error message based on status code
        if (error.response.status === 422) {
          errorMessage = 'Invalid request format for meal analysis';
          errorDetails = error.response.data.detail || error.message;
        } else if (error.response.status === 404) {
          errorMessage = 'Python service could not find required resources';
          statusCode = 404;
        }
      } else if (error.request) {
        console.error('Request:', error.request);
        errorMessage = 'Python service unavailable';
        statusCode = 503;
      }
      
      res.status(statusCode).json({ 
        error: errorMessage, 
        details: errorDetails 
      });
    }
  }

    /**
     * Makes a properly formatted request to the Python LLM service
     * @param {Object} analysisRequest - The meal analysis request object
     * @param {string} modelName - Name of the LLM model to use (default: "gpt-4-vision-preview")
     * @returns {Promise<Object>} - The LLM analysis response
     */
    static async makeLLMRequest(analysisRequest, modelName = "gpt-4-vision-preview") {
        try {
        // Ensure pictures array exists for each product
        const formattedProducts = analysisRequest.products.map(product => {
            // If pictures is undefined or null, provide an empty array
            if (!product.pictures) {
            product.pictures = [];
            }
            
            // Convert string weights to float if needed
            return {
            ...product,
            pictures: product.pictures.map(pic => ({
                ...pic,
                // Ensure numeric values are properly formatted as numbers
                weight: parseFloat(pic.weight),
                upperDiameter: parseFloat(pic.upperDiameter),
                lowerDiameter: parseFloat(pic.lowerDiameter),
                depth: parseFloat(pic.depth)
            })),
            weight_in_req: parseFloat(product.weight_in_req)
            };
        });
    
        // Create properly formatted request object
        const requestData = {
            meal_details: {
            ...analysisRequest,
            // Ensure numeric values are properly formatted as numbers
            weight_before: parseFloat(analysisRequest.weight_before),
            weight_after: parseFloat(analysisRequest.weight_after),
            // Replace backslashes with forward slashes in file paths
            picture_before: analysisRequest.picture_before.replace(/\\/g, '/'),
            picture_after: analysisRequest.picture_after.replace(/\\/g, '/'),
            products: formattedProducts
            },
            model_name: modelName
        };
    
        console.log("Sending formatted request to Python service:", JSON.stringify(requestData, null, 2));
    
        // Make request to Python service
        const response = await axios.post("http://127.0.0.1:8000/analyze-meal", requestData);
        
        return response.data;
        } catch (error) {
        console.error("Error in LLM request:", error);
        
        // Enhanced error logging
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        throw error;
        }
    }
}

export default MealAnalysisController;