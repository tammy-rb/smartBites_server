import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';

// Load environment variables if not done elsewhere
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set this in your environment variables
});


function imageToBase64(imagePath) {
  try {
    // Get public directory from environment variable or use default fallback
    const publicDir = process.env.PUBLIC_DIR;
    
    // Log path for debugging (remove in production)
    console.log('Public directory path:', publicDir);
    console.log('Image path:', imagePath);
    
    // Remove any leading slash if present
    const cleanImagePath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Replace backslashes with forward slashes
    const normalizedPath = cleanImagePath.replace(/\\/g, '/');
    
    // Create absolute path
    const absolutePath = path.join(publicDir, normalizedPath);
    
    // Log for debugging
    console.log('Resolved absolute path:', absolutePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Image file not found at: ${absolutePath}`);
    }
    
    // Read and convert image
    const imageBuffer = fs.readFileSync(absolutePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Error converting image to base64: ${error.message}`);
    throw error;
  }
}


/**
 * Analyzes a meal using OpenAI's GPT-4 Vision
 * @param {Object} analysisRequest - The meal analysis request object
 * @param {string} prompt - The prepared LLM prompt
 * @returns {Object} - The LLM analysis results
 */
async function analyzeMealWithLLM(analysisRequest, prompt) {
    try {
      // Convert meal images to base64
      const beforeImageBase64 = imageToBase64(analysisRequest.picture_before);
      const afterImageBase64 = imageToBase64(analysisRequest.picture_after);
  
      // Convert product reference images to base64
      const productImages = [];
      for (const product of analysisRequest.products) {
        for (const pic of product.pictures) {
          productImages.push({
            imageUrl: pic.imageUrl,
            base64: imageToBase64(pic.imageUrl),
            product: product.name,
            sku: product.sku,
            weight: pic.weight
          });
        }
      }
  
      // Prepare the content array for GPT-4 Vision
      const content = [
        { 
          type: "text", 
          text: prompt 
        },
        { 
          type: "image_url", 
          image_url: { 
            url: `data:image/jpeg;base64,${beforeImageBase64}`,
            detail: "high" 
          }
        },
        { 
          type: "text", 
          text: "This is the BEFORE meal image. The total meal weight (including plate) is " + 
                analysisRequest.weight_before + "g."
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
          text: "This is the AFTER meal image. Analyze what was consumed."
        }
      ];
  
      // Add each product reference image
      for (const img of productImages) {
        content.push(
          { 
            type: "image_url", 
            image_url: { 
              url: `data:image/jpeg;base64,${img.base64}`,
              detail: "high"
            }
          },
          { 
            type: "text", 
            text: `This is a reference image for ${img.product} (SKU: ${img.sku}) with known weight of ${img.weight}g.`
          }
        );
      }
  
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview", // Use the GPT-4 Vision model
        messages: [
          {
            role: "system",
            content: "You are a precise food analysis AI that accurately estimates food weights based on visual comparison."
          },
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 1500,
        temperature: 0.2 // Lower temperature for more predictable/precise results
      });
  
      // Extract the LLM's response
      const llmResponse = response.choices[0].message.content;
      
      // Try to parse JSON from the response
      let llmResults;
      try {
        // Extract JSON if it's wrapped in markdown code blocks
        const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/) || 
                          llmResponse.match(/```\n([\s\S]*?)\n```/);
        
        if (jsonMatch && jsonMatch[1]) {
          llmResults = JSON.parse(jsonMatch[1]);
        } else {
          // If no code blocks, try to parse the whole response as JSON
          llmResults = JSON.parse(llmResponse);
        }
      } catch (error) {
        // If parsing fails, return the raw text
        console.warn('Could not parse LLM response as JSON:', error);
        llmResults = { 
          raw_response: llmResponse,
          error: "Failed to parse response as JSON"
        };
      }
  
      return llmResults;
    } catch (error) {
      console.error('Error in LLM analysis:', error);
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }
  
  /**
   * Verifies the LLM results against the provided weights
   * @param {Object} llmResults - The results from the LLM analysis
   * @param {Object} analysisRequest - The original analysis request with actual weights
   * @returns {Object} - Verification results
   */
  function verifyResults(llmResults, analysisRequest) {
    // Extract the actual weights from the request
    const actualTotalBefore = analysisRequest.weight_before;
    const actualTotalAfter = analysisRequest.weight_after;
    const actualConsumed = actualTotalBefore - actualTotalAfter;
    
    // Create a map of product SKUs to their actual weights
    const productWeights = {};
    analysisRequest.products.forEach(product => {
      productWeights[product.sku] = product.weight_in_req;
    });
    
    // Calculate accuracy percentages
    const verification = {
      total: {
        before: {
          actual: actualTotalBefore,
          estimated: llmResults.total_weight?.estimated_before,
          accuracy: calculateAccuracy(llmResults.total_weight?.estimated_before, actualTotalBefore)
        },
        after: {
          actual: actualTotalAfter,
          estimated: llmResults.total_weight?.estimated_after,
          accuracy: calculateAccuracy(llmResults.total_weight?.estimated_after, actualTotalAfter)
        },
        consumed: {
          actual: actualConsumed,
          estimated: llmResults.total_weight?.estimated_consumed,
          accuracy: calculateAccuracy(llmResults.total_weight?.estimated_consumed, actualConsumed)
        }
      },
      products: []
    };
    
    // Verify each product's weight
    if (llmResults.products && Array.isArray(llmResults.products)) {
      llmResults.products.forEach(product => {
        if (productWeights[product.sku]) {
          verification.products.push({
            sku: product.sku,
            before: {
              actual: productWeights[product.sku],
              estimated: product.estimated_weight_before,
              accuracy: calculateAccuracy(product.estimated_weight_before, productWeights[product.sku])
            }
          });
        }
      });
    }
    
    // Calculate overall accuracy
    const accuracies = verification.products.map(p => p.before.accuracy).filter(a => !isNaN(a));
    verification.overall_accuracy = accuracies.length > 0 
      ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length 
      : null;
    
    return verification;
  }
  
  /**
   * Calculate accuracy percentage 
   * @param {number} estimated - The estimated value
   * @param {number} actual - The actual value
   * @returns {number} - Accuracy percentage (0-100)
   */
  function calculateAccuracy(estimated, actual) {
    if (estimated === undefined || actual === undefined) return null;
    if (actual === 0) return estimated === 0 ? 100 : 0;
    
    const accuracy = 100 - Math.abs((estimated - actual) / actual * 100);
    return Math.max(0, Math.min(100, accuracy)); // Clamp between 0-100
  }
  
  export default {
    analyzeMealWithLLM,
    verifyResults
  };

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

  /*

Imports and Setup

import OpenAI from 'openai'; - Imports the OpenAI SDK
import fs from 'fs'; - For file system operations (reading image files)
import path from 'path'; - For resolving file paths
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); - Creates an OpenAI client using your API key (which should be stored in environment variables)

imageToBase64 Function
This utility function converts image files to base64 strings, which is required to send images to the API:

Takes a file path
Resolves to an absolute path
Reads the file as a binary buffer
Converts the buffer to a base64 string

analyzeMealWithLLM Function
This is the main function to call GPT-4 Vision:

Image Conversion:

Converts the before and after meal images to base64
Also converts all product reference images to base64


Content Preparation:

Creates an array of "content" objects combining text and images
First adds the text prompt
Then adds the before meal image with description
Then adds the after meal image with description
Finally adds each reference product image with its description


API Call:

Makes a request to OpenAI's chat completions API
Uses "gpt-4-vision-preview" model which can analyze images
Sets a system message to guide the AI's behavior
Passes all the content we prepared
Sets parameters like max_tokens (response length) and temperature (creativity level)


Response Processing:

Extracts the text response
Attempts to parse JSON from the response (handles both code blocks and raw JSON)
Falls back to returning raw text if JSON parsing fails



verifyResults Function
This function compares the AI's estimates with the actual weights:

Extracts actual weights from the request
Creates a lookup map of product SKUs to their weights
Calculates accuracy for total meal weights (before, after, consumed)
Verifies each product's weight estimation
Computes an overall accuracy score

calculateAccuracy Function
A simple utility to calculate the percentage accuracy of estimates:

Handles edge cases (undefined values, zero values)
Calculates how close the estimate is to the actual value
Returns a value between 0-100%
  */