/*import fs from 'fs';
import axios from 'axios';

async function analyzeMealWithLLM(analysisRequest, llmRequestPrompt) {
  try {
    // Convert the main meal images to base64
    const beforeImageBase64 = fs.readFileSync(analysisRequest.picture_before, { encoding: 'base64' });
    const afterImageBase64 = fs.readFileSync(analysisRequest.picture_after, { encoding: 'base64' });
    
    // Convert product reference images to base64
    const productsWithBase64Images = await Promise.all(analysisRequest.products.map(async product => {
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
    
    // Prepare the content array for the LLM request
    const content = [
      {
        type: "text",
        text: llmRequestPrompt
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
      }
    ];
    
    // Add each product reference image to the content array
    for (const product of productsWithBase64Images) {
      for (const pic of product.pictures) {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${pic.imageBase64}`,
            detail: "high"
          }
        });
      }
    }
    
    // Prepare the LLM payload
    const llmPayload = {
      model: process.env.LLM_MODEL || "gpt-4-vision-preview",  // Use environment variable or default
      messages: [
        {
          role: "system",
          content: "You are an AI trained to analyze food consumption. Given before and after images of a meal, and reference images of products with known weights, predict the weight of each product before and after consumption. Be accurate and detailed in your analysis."
        },
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 2000,
      temperature: 0.2,  // Lower temperature for more precise predictions
      response_format: { type: "json_object" }  // Request JSON response if model supports it
    };
    
    // Make the API call to the LLM
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',  // Use your actual endpoint
      llmPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    // Extract and parse the response
    const responseContent = response.data.choices[0].message.content;
    let parsedResponse;
    
    try {
      // First, try to parse the response directly
      parsedResponse = JSON.parse(responseContent);
    } catch (error) {
      console.error('Failed to parse LLM response as JSON directly:', error);
      
      // Try to extract JSON if it's embedded in markdown or other text
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || 
                       responseContent.match(/\{[\s\S]*\}/);
      
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
    
    // Add metadata to the response
    const enhancedResponse = {
      ...parsedResponse,
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        model_used: response.data.model,
        prompt_tokens: response.data.usage.prompt_tokens,
        completion_tokens: response.data.usage.completion_tokens,
        total_tokens: response.data.usage.total_tokens
      }
    };
    
    console.log('LLM analysis completed successfully');
    return enhancedResponse;
    
  } catch (error) {
    console.error('Error analyzing meal with LLM:', error);
    throw new Error(`Failed to analyze meal with LLM: ${error.message}`);
  }
}

// Updated prompt function to clearly indicate which images are which
function prepareLlmPrompt(analysisRequest) {
  // Base prompt with detailed instructions
  let prompt = `
# Meal Analysis Task

## Context
You are analyzing before and after images of a meal to determine how much of each product was consumed.

## Input Images
- The FIRST image shows the meal BEFORE consumption
- The SECOND image shows the meal AFTER consumption

## Products in the Meal
The meal contains the following products. For each product, you have reference images showing known weights:
`;

  // Add detailed information about each product and reference their images clearly
  let imageCounter = 3; // Start from 3 (after the two meal images)
  
  analysisRequest.products.forEach(product => {
    prompt += `
### ${product.name} (SKU: ${product.sku})
Reference images with known weights:
`;
    product.pictures.forEach(pic => {
      prompt += `- IMAGE #${imageCounter}: ${product.name} - Weight: ${pic.weight}g on plate with dimensions: upper diameter ${pic.upperDiameter}cm, lower diameter ${pic.lowerDiameter}cm, depth ${pic.depth}cm\n`;
      imageCounter++;
    });
  });

  // Add task description and expected output format
  prompt += `
## Your Task
1. Analyze the FIRST image (meal BEFORE consumption) and the SECOND image (meal AFTER consumption).
2. Using the reference product images with known weights, estimate:
   - The weight of each product BEFORE the meal (visible in the FIRST image)
   - The weight of each product AFTER the meal (remaining in the SECOND image)
3. Base your estimates on visual cues such as portion sizes, volume, and comparison with reference images.

## Expected Output Format
Provide your analysis in the following JSON format:

\`\`\`json
{
  "products": [
    {
      "sku": "PRODUCT_SKU",
      "estimated_weight_before": X.XX,
      "estimated_weight_after": Y.YY,
      "estimated_consumed": Z.ZZ
    },
    // Repeat for each product
  ],
  "total_weight": {
    "estimated_before": TOTAL_BEFORE,
    "estimated_after": TOTAL_AFTER,
    "estimated_consumed": TOTAL_CONSUMED
  },
  "confidence_level": "HIGH/MEDIUM/LOW",
  "reasoning": "Brief explanation of how you made your estimates..."
}
\`\`\`

Additional information:
- The total meal weight before was ${analysisRequest.weight_before}g (including plate)
- Description: "${analysisRequest.description || 'No description provided'}"
`;

  return prompt;
}

export { prepareLlmPrompt, analyzeMealWithLLM };
*/

function prepareLlmPrompt(analysisRequest) {
    
    // Base prompt with detailed instructions
    let prompt = `
        # Meal Analysis Task

        ## Context
        You are analyzing before and after images of a meal to determine how much of each product was consumed. 

        ## Input Images
        - Before meal image: ${analysisRequest.picture_before}
        - After meal image: ${analysisRequest.picture_after}

        ## Products in the Meal
        The meal contains the following products. For each product, you have reference images showing known weights:
        `;

    // Add detailed information about each product
    analysisRequest.products.forEach(product => {
        prompt += `
        ### ${product.name} (SKU: ${product.sku})
        Reference images with known weights:
        `;
        product.pictures.forEach(pic => {
            prompt += `- Image: ${pic.imageUrl} - Weight: ${pic.weight}g on plate with dimensions: upper diameter ${pic.upperDiameter}cm, lower diameter ${pic.lowerDiameter}cm, depth ${pic.depth}cm\n`;
        });
    });

    // Add task description and expected output format
    prompt += `
        ## Your Task
        1. Analyze the before and after meal images.
        2. Using the reference product images with known weights, estimate:
        - The weight of each product BEFORE the meal (visible in the before image)
        - The weight of each product AFTER the meal (remaining in the after image)
        3. Base your estimates on visual cues such as portion sizes, volume, and comparison with reference images.

        ## Expected Output Format
        Provide your analysis in the following JSON format:

        \`\`\`json
        {
        "products": [
            {
            "sku": "PRODUCT_SKU",
            "estimated_weight_before": X.XX,
            "estimated_weight_after": Y.YY,
            "estimated_consumed": Z.ZZ
            },
            // Repeat for each product
        ],
        "total_weight": {
            "estimated_before": TOTAL_BEFORE,
            "estimated_after": TOTAL_AFTER,
            "estimated_consumed": TOTAL_CONSUMED
        },
        "confidence_level": "HIGH/MEDIUM/LOW",
        "reasoning": "Brief explanation of how you made your estimates..."
        }
        \`\`\`

        Additional information:
        - The total meal weight before was ${analysisRequest.weight_before}g (including plate)
        - Description: "${analysisRequest.description || 'No description provided'}"
        `;

    return prompt;
}

export default prepareLlmPrompt;
