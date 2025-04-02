import base64
from pathlib import Path
from typing import Dict, Any, List
from langchain.prompts import ChatPromptTemplate

def encode_image(image_path: Path) -> str:
    """Encode an image file to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def prepare_llm_prompt(data: Dict[str, Any]) -> ChatPromptTemplate:
    """Prepare a prompt template for the LLM"""
    
    # Create a system message that explains the task
    system_template = """
    You are an expert food measurement system that analyzes meal images to determine the weight of different food items.
    
    Your task is to:
    1. Analyze before and after images of a meal
    2. Use reference product images with known weights to estimate the weight of each product in the meal
    3. Determine how much of each product was consumed
    4. Return the analysis in a structured JSON format
    
    Remember:
    - You will see the "before" and "after" images of the complete meal
    - For each product, you will see reference images of that product on a plate with known weight
    - Use the plate dimensions and visual cues to estimate portion sizes
    - The meal total weight before was {weight_before}g 
    - Your estimates should account for the full weight of the meal
    
    IMPORTANT: Return your analysis in this exact JSON structure:
    ```
    {{
      "total_estimated_weight_before": float,
      "total_estimated_weight_after": float,
      "total_estimated_consumed": float,
      "products_analysis": [
        {{
          "sku": "string",
          "name": "string",
          "estimated_weight_before": float,
          "estimated_weight_after": float,
          "estimated_consumed": float,
          "confidence": int
        }}
      ],
      "notes": "string"
    }}
    ```
    
    Provide all measurements in grams and confidence levels as integers from 1-100.
    """
    
    # Create a human message template with the images and data
    human_template = """
    ## Meal Information
    - Description: {description}
    - Total weight before: {weight_before}g
    
    ## Meal Images
    Before meal image:
    <img src="data:image/jpeg;base64,{picture_before_base64}" width="400" />
    
    After meal image:
    <img src="data:image/jpeg;base64,{picture_after_base64}" width="400" />
    
    ## Products to Analyze
    {products_info}
    
    Please analyze the images and provide weight estimates for each product before and after the meal.
    Return your response in the structured JSON format as specified.
    """
    
    # Format product information with reference images
    products_info = ""
    for product in data["products"]:
        products_info += f"### {product['name']} (SKU: {product['sku']})\n"
        
        for picture in product["pictures"]:
            products_info += f"Reference image (weight: {picture['weight']}g, plate ID: {picture['plateId']}):\n"
            products_info += f"<img src=\"data:image/jpeg;base64,{picture['image_base64']}\" width=\"300\" />\n"
            products_info += f"Plate dimensions: upper diameter: {picture['upperDiameter']}cm, " \
                           f"lower diameter: {picture['lowerDiameter']}cm, depth: {picture['depth']}cm\n\n"
    
    # Create the prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_template),
        ("human", human_template)
    ])
    
    # Format the variables in the prompt
    formatted_prompt = prompt.partial(
        weight_before=data["weight_before"],
        description=data["description"],
        picture_before_base64=data["picture_before_base64"],
        picture_after_base64=data["picture_after_base64"],
        products_info=products_info
    )
    
    return formatted_prompt





from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import os
import base64
from pathlib import Path
from io import BytesIO

from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from meal_analyzer import prepare_llm_prompt, encode_image
from langchain_community.chat_models import ChatOpenAI

app = FastAPI()



# Configuration
PUBLIC_DIR = Path("C:\\Users\\USER\\source\\repos\\smartBites\\server\\public")  # Adjust this path

# ProductPicture model with flexible types
class ProductPicture(BaseModel):
    id: int
    imageUrl: str
    weight: Optional[Union[str, float]] = None  # Allow missing or string values
    plateId: Optional[str] = None
    upperDiameter: Optional[Union[str, float]] = None
    lowerDiameter: Optional[Union[str, float]] = None
    depth: Optional[Union[str, float]] = None

# Product model (pictures can be empty)
class Product(BaseModel):
    sku: str
    name: str
    pictures: List[ProductPicture] = []  # Default to empty list
    weight_in_req: float

# MealDetails model (ensure paths and optional fields are handled correctly)
class MealDetails(BaseModel):
    weight_before: float
    weight_after: float
    person_id: str
    description: Optional[str] = None  # Allow description to be optional
    picture_before: str
    picture_after: str
    products: List[Product]

# Main request model
class AnalysisRequest(BaseModel):
    meal_details: MealDetails
    model_name: str

# Response models
class ProductAnalysisResult(BaseModel):
    sku: str
    name: str
    estimated_weight_before: float = Field(description="Estimated weight before the meal in grams")
    estimated_weight_after: float = Field(description="Estimated weight after the meal in grams")
    estimated_consumed: float = Field(description="Amount consumed in grams")
    confidence: int = Field(description="Confidence level (1-100)")

class MealAnalysisResult(BaseModel):
    total_estimated_weight_before: float = Field(description="Total weight before the meal")
    total_estimated_weight_after: float = Field(description="Total weight after the meal")
    total_estimated_consumed: float = Field(description="Total weight consumed")
    products_analysis: List[ProductAnalysisResult] = Field(description="Analysis of products")
    notes: Optional[str] = Field(description="Additional notes")

# Helper function to validate and encode image paths
def get_encoded_image(image_path: str) -> str:
    full_path = PUBLIC_DIR / image_path.replace('\\', '/')
    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {full_path}")
    return encode_image(full_path)

@app.post("/analyze-meal")
async def analyze_meal(request: Request):
    try:
        # Log request for debugging
        raw_data = await request.json()
        print("Received JSON:", raw_data)

        # Validate and parse request
        analysis_request = AnalysisRequest(**raw_data)
        meal_details = analysis_request.meal_details

        # Encode before/after images
        before_image_base64 = get_encoded_image(meal_details.picture_before)
        after_image_base64 = get_encoded_image(meal_details.picture_after)

        # Process product images
        products_with_images = []
        for product in meal_details.products:
            product_with_images = product.dict()
            product_images = []

            for picture in product.pictures:
                try:
                    picture_data = picture.dict()
                    picture_data["image_base64"] = get_encoded_image(picture.imageUrl)
                    product_images.append(picture_data)
                except HTTPException:
                    print(f"Warning: Image missing for {picture.imageUrl}, skipping...")

            product_with_images["pictures"] = product_images
            products_with_images.append(product_with_images)

        # Prepare structured data
        structured_data = {
            "weight_before": meal_details.weight_before,
            "description": meal_details.description,
            "picture_before_base64": before_image_base64,
            "picture_after_base64": after_image_base64,
            "products": products_with_images
        }

        # Prepare prompt and call LLM
        prompt = prepare_llm_prompt(structured_data)
        llm = ChatOpenAI(model_name=analysis_request.model_name, temperature=0.2)
        parser = JsonOutputParser(pydantic_object=MealAnalysisResult)
        chain = prompt | llm | parser
        analysis_result = chain.invoke({})

        return {"analysis": analysis_result}

    except Exception as e:
        print("Error processing request:", e)
        raise HTTPException(status_code=500, detail=f"Error analyzing meal: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)



import base64
from pathlib import Path
from typing import Dict, Any, List
from langchain.prompts import ChatPromptTemplate

def encode_image(image_path: Path) -> str:
    """Encode an image file to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def prepare_llm_prompt(data: Dict[str, Any]) -> ChatPromptTemplate:
    """Prepare a prompt template for the LLM"""
    
    # Create a system message that explains the task
    system_template = """
    You are an expert food measurement system that analyzes meal images to determine the weight of different food items.
    
    Your task is to:
    1. Analyze before and after images of a meal
    2. Use reference product images with known weights to estimate the weight of each product in the meal
    3. Determine how much of each product was consumed
    4. Return the analysis in a structured JSON format
    
    Remember:
    - You will see the "before" and "after" images of the complete meal
    - For each product, you will see reference images of that product on a plate with known weight
    - Use the plate dimensions and visual cues to estimate portion sizes
    - The meal total weight before was {weight_before}g 
    - Your estimates should account for the full weight of the meal
    
    IMPORTANT: Return your analysis in this exact JSON structure:
    ```
    {{
      "total_estimated_weight_before": float,
      "total_estimated_weight_after": float,
      "total_estimated_consumed": float,
      "products_analysis": [
        {{
          "sku": "string",
          "name": "string",
          "estimated_weight_before": float,
          "estimated_weight_after": float,
          "estimated_consumed": float,
          "confidence": int
        }}
      ],
      "notes": "string"
    }}
    ```
    
    Provide all measurements in grams and confidence levels as integers from 1-100.
    """
    
    # Create a human message template with the images and data
    human_template = """
    ## Meal Information
    - Description: {description}
    - Total weight before: {weight_before}g
    
    ## Meal Images
    Before meal image:
    <img src="data:image/jpeg;base64,{picture_before_base64}" width="400" />
    
    After meal image:
    <img src="data:image/jpeg;base64,{picture_after_base64}" width="400" />
    
    ## Products to Analyze
    {products_info}
    
    Please analyze the images and provide weight estimates for each product before and after the meal.
    Return your response in the structured JSON format as specified.
    """
    
    # Format product information with reference images
    products_info = ""
    for product in data["products"]:
        products_info += f"### {product['name']} (SKU: {product['sku']})\n"
        
        for picture in product["pictures"]:
            products_info += f"Reference image (weight: {picture['weight']}g, plate ID: {picture['plateId']}):\n"
            products_info += f"<img src=\"data:image/jpeg;base64,{picture['image_base64']}\" width=\"300\" />\n"
            products_info += f"Plate dimensions: upper diameter: {picture['upperDiameter']}cm, " \
                           f"lower diameter: {picture['lowerDiameter']}cm, depth: {picture['depth']}cm\n\n"
    
    # Create the prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_template),
        ("human", human_template)
    ])
    
    # Format the variables in the prompt
    formatted_prompt = prompt.partial(
        weight_before=data["weight_before"],
        description=data["description"],
        picture_before_base64=data["picture_before_base64"],
        picture_after_base64=data["picture_after_base64"],
        products_info=products_info
    )
    
    return formatted_prompt