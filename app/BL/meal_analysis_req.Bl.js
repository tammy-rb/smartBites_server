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
    
    
    static verifyResults(llmResults, originalRequest) {
        // Compare LLM predicted weights with the weights provided by user
        const verification = {
            accurate: true,
            product_comparisons: []
        };
        
        // For each product, compare the predicted weight with the provided weight
        originalRequest.products.forEach(originalProduct => {
            const llmProduct = llmResults.products.find(p => p.sku === originalProduct.sku);
            
            if (llmProduct) {
                const weightDifference = Math.abs(llmProduct.predicted_weight - originalProduct.weight_in_req);
                const percentageDifference = (weightDifference / originalProduct.weight_in_req) * 100;
                
                const comparison = {
                    sku: originalProduct.sku,
                    name: originalProduct.name,
                    provided_weight: originalProduct.weight_in_req,
                    predicted_weight: llmProduct.predicted_weight,
                    difference_percentage: percentageDifference.toFixed(2)
                };
                
                // If any product is off by more than 10%, mark as inaccurate
                if (percentageDifference > 10) {
                    verification.accurate = false;
                }
                
                verification.product_comparisons.push(comparison);
            }
        });
        
        // Also verify total weight
        const predictedTotalAfter = llmResults.total_weight_after || 0;
        const actualTotalAfter = originalRequest.weight_after;
        const totalDifference = Math.abs(predictedTotalAfter - actualTotalAfter);
        const totalPercentageDifference = (totalDifference / actualTotalAfter) * 100;
        
        verification.total_weight = {
            provided: actualTotalAfter,
            predicted: predictedTotalAfter,
            difference_percentage: totalPercentageDifference.toFixed(2)
        };
        
        if (totalPercentageDifference > 10) {
            verification.accurate = false;
        }
        
        return verification;
    }

    static async getProductsBySkuList(skuList) {
        try {MealAnalysisDL.getProductsBySkuList(skuList);
        } catch (error) {
            console.error('Error fetching products by SKU list:', error);
            throw error;
        }
    }
    
    static async saveAnalysisRequest(analysisRequest) {
        try {
            return await MealAnalysisDL.saveAnalysisRequest(analysisRequest);
        } catch (error) {
            console.error('Error saving analysis request:', error);
            throw error;
        }
    }
    
    static async analyzeMealWithLLM(requestData, llmRequestPrompt ) {
        try {
            // Convert the images to base64
            const beforeImageBase64 = fs.readFileSync(requestData.picture_before, { encoding: 'base64' });
            const afterImageBase64 = fs.readFileSync(requestData.picture_after, { encoding: 'base64' });
            
            // Convert product images to base64 as well
            const productsWithBase64Images = await Promise.all(requestData.products.map(async product => {
                const imagesWithBase64 = await Promise.all(product.pictures.map(async pic => {
                    const base64 = fs.readFileSync(pic.imageUrl, { encoding: 'base64' });
                    return {
                        ...pic,
                        imageBase64: base64
                    };
                }));
                
                return {
                    ...product,
                    pictures: imagesWithBase64
                };
            }));
            
            // Prepare the request to LLM
            const llmPayload = {
                model: "your-model-name",  // Replace with your LLM model
                messages: [
                    {
                        role: "system",
                        content: `You are an AI trained to analyze food consumption. Given before and after images of a meal, 
                                 and reference images of products with known weights, predict the weight of each product 
                                 before and after consumption. Be accurate and detailed in your analysis.`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analyze the following meal. Here are the before and after images, 
                                      and reference product images with their weights. For each product in the meal,
                                      estimate its weight before and after consumption.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${beforeImageBase64}`,
                                    detail: "high"
                                }
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${afterImageBase64}`,
                                    detail: "high"
                                }
                            },
                            {
                                type: "text",
                                text: JSON.stringify({
                                    products: productsWithBase64Images.map(product => ({
                                        sku: product.sku,
                                        name: product.name,
                                        reference_images: product.pictures.map(pic => ({
                                            weight: pic.weight,
                                            plate_info: {
                                                id: pic.plateId,
                                                upperDiameter: pic.upperDiameter,
                                                lowerDiameter: pic.lowerDiameter,
                                                depth: pic.depth
                                            }
                                        }))
                                    }))
                                })
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            };
            
            // Make the API call to the LLM (adjust this based on your LLM provider)
            const response = await axios.post(
                'https://your-llm-api-endpoint.com/completions',
                llmPayload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.LLM_API_KEY}`
                    }
                }
            );
            
            // Parse the LLM response
            // This is a placeholder implementation - adjust based on your actual LLM response format
            const llmResponse = response.data;
            
            // Process and structure the LLM analysis results
            const structuredResults = MealAnalysisController.structureLlmResults(llmResponse, requestData.products);
            
            return structuredResults;
        } catch (error) {
            console.error('Error analyzing meal with LLM:', error);
            throw error;
        }
    }
    
    static structureLlmResults(llmResponse, originalProducts) {
        // This is a placeholder implementation - adjust based on your actual LLM response format
        try {
            // Assume LLM response contains structured JSON with predicted weights
            // In a real implementation, you might need to extract this from text
            const predictions = JSON.parse(llmResponse.choices[0].message.content);
            
            // Format the predictions into a structured format
            return {
                total_weight_before: predictions.total_weight_before,
                total_weight_after: predictions.total_weight_after,
                products: originalProducts.map(product => {
                    const prediction = predictions.products.find(p => p.sku === product.sku);
                    return {
                        sku: product.sku,
                        name: product.name,
                        predicted_weight: prediction ? prediction.weight : 0,
                        predicted_weight_consumed: prediction ? prediction.weight_consumed : 0
                    };
                })
            };
        } catch (error) {
            console.error('Error structuring LLM results:', error);
            // Return a basic structure if parsing fails
            return {
                total_weight_before: 0,
                total_weight_after: 0,
                products: originalProducts.map(product => ({
                    sku: product.sku,
                    name: product.name,
                    predicted_weight: 0,
                    predicted_weight_consumed: 0
                }))
            };
        }
    }

    static async analyzeMealWithLLM1(analysisRequest, llmRequestPrompt) {
        try {
            // Configure the LLM client (using OpenAI as an example)
            // You would need to import your preferred LLM client at the top of your file
            const llmClient = new OpenAIClient({
                apiKey: process.env.OPENAI_API_KEY,
                // You might want to define these in environment variables or configuration
                modelName: process.env.LLM_MODEL || 'gpt-4-vision-preview',
                temperature: 0.2, // Lower temperature for more precise predictions
                maxTokens: 2000
            });
            
            // Prepare the images for vision model processing
            const images = [
                { type: 'image_url', image_url: { url: `file://${path.resolve(analysisRequest.picture_before)}` } },
                { type: 'image_url', image_url: { url: `file://${path.resolve(analysisRequest.picture_after)}` } }
            ];
            
            // Add reference product images
            analysisRequest.products.forEach(product => {
                product.pictures.forEach(pic => {
                    images.push({
                        type: 'image_url',
                        image_url: { url: `file://${path.resolve(pic.imageUrl)}` }
                    });
                });
            });
            
            // Create the LLM message payload
            const messages = [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: llmRequestPrompt },
                        ...images
                    ]
                }
            ];
            
            console.log('Sending request to LLM...');
            
            // Send request to LLM
            const response = await llmClient.chat.completions.create({
                model: process.env.LLM_MODEL || 'gpt-4-vision-preview',
                messages,
                temperature: 0.2,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
            });
            
            // Parse the response
            const responseText = response.choices[0].message.content;
            let parsedResponse;
            
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (error) {
                console.error('Failed to parse LLM response as JSON:', error);
                
                // Attempt to extract JSON if it's embedded in markdown or other text
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                                  responseText.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    try {
                        parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    } catch (e) {
                        throw new Error('Could not parse LLM response in any format');
                    }
                } else {
                    throw new Error('LLM response did not contain valid JSON');
                }
            }
            
            // Validate the parsed response has the expected structure
            if (!parsedResponse.products || !Array.isArray(parsedResponse.products)) {
                throw new Error('LLM response missing required product analysis');
            }
            
            // Add metadata to the response
            const enhancedResponse = {
                ...parsedResponse,
                metadata: {
                    analysis_timestamp: new Date().toISOString(),
                    model_used: response.model,
                    prompt_tokens: response.usage.prompt_tokens,
                    completion_tokens: response.usage.completion_tokens,
                    total_tokens: response.usage.total_tokens
                }
            };
            
            console.log('LLM analysis completed successfully');
            return enhancedResponse;
            
        } catch (error) {
            console.error('Error in LLM analysis:', error);
            throw new Error(`Failed to analyze meal with LLM: ${error.message}`);
        }
    }
}

export default MealAnalysisController;
