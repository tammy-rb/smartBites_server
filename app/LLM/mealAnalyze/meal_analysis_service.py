# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import base64
from pathlib import Path
from io import BytesIO

from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field
from meal_analyzer import prepare_llm_prompt, encode_image

app = FastAPI()

# Configuration
PUBLIC_DIR = Path("../public")  # Adjust this to your actual public directory path

# Models for request validation
class ProductPicture(BaseModel):
    id: int
    imageUrl: str
    weight: str
    plateId: str
    upperDiameter: str
    lowerDiameter: str
    depth: str

class Product(BaseModel):
    sku: str
    name: str
    pictures: List[ProductPicture]
    weight_in_req: float

class MealDetails(BaseModel):
    weight_before: float
    weight_after: float
    person_id: str
    description: str
    picture_before: str
    picture_after: str
    products: List[Product]

class AnalysisRequest(BaseModel):
    meal_details: MealDetails
    model_name: str

class ProductAnalysisResult(BaseModel):
    sku: str
    name: str
    estimated_weight_before: float = Field(description="Estimated weight of the product before the meal in grams")
    estimated_weight_after: float = Field(description="Estimated weight of the product after the meal in grams")
    estimated_consumed: float = Field(description="Estimated amount consumed in grams")
    confidence: int = Field(description="Confidence level of the estimation (1-100)")

class MealAnalysisResult(BaseModel):
    total_estimated_weight_before: float = Field(description="Total estimated weight of all products before the meal")
    total_estimated_weight_after: float = Field(description="Total estimated weight of all products after the meal")
    total_estimated_consumed: float = Field(description="Total estimated weight consumed")
    products_analysis: List[ProductAnalysisResult] = Field(description="Analysis of each product")
    notes: Optional[str] = Field(description="Any additional notes or observations")

@app.post("/analyze-meal")
async def analyze_meal(request: AnalysisRequest):
    try:
        # Read and encode images
        meal_details = request.meal_details
        
        before_image_path = PUBLIC_DIR / meal_details.picture_before.replace('\\', '/')
        after_image_path = PUBLIC_DIR / meal_details.picture_after.replace('\\', '/')
        
        if not before_image_path.exists() or not after_image_path.exists():
            raise HTTPException(status_code=404, detail="Image files not found")
        
        before_image_base64 = encode_image(before_image_path)
        after_image_base64 = encode_image(after_image_path)
        
        # Process product reference images
        products_with_images = []
        for product in meal_details.products:
            product_with_images = product.dict()
            product_images = []
            
            for picture in product.pictures:
                picture_path = PUBLIC_DIR / picture.imageUrl.replace('\\', '/')
                if picture_path.exists():
                    picture_data = picture.dict()
                    picture_data["image_base64"] = encode_image(picture_path)
                    product_images.append(picture_data)
            
            product_with_images["pictures"] = product_images
            products_with_images.append(product_with_images)
        
        # Prepare prompt and get analysis from LLM
        structured_data = {
            "weight_before": meal_details.weight_before,
            "description": meal_details.description,
            "picture_before_base64": before_image_base64,
            "picture_after_base64": after_image_base64,
            "products": products_with_images
        }
        
        prompt = prepare_llm_prompt(structured_data)
        
        # Configure LLM based on requested model
        model_name = request.model_name
        llm = ChatOpenAI(model_name=model_name, temperature=0.2)
        
        # Setup output parser
        parser = JsonOutputParser(pydantic_object=MealAnalysisResult)
        
        # Create chain
        chain = prompt | llm | parser
        
        # Execute chain
        analysis_result = chain.invoke({})
        
        return {"analysis": analysis_result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing meal: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)