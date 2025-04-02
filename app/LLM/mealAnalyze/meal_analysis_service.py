from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain.chat_models import ChatOpenAI
import os

# Load API key from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize FastAPI app
app = FastAPI()

# Define request model
class MealAnalysisRequest(BaseModel):
    meal_description: str
    model_name: str  # Allows dynamic model switching

# Function to process LLM response
def analyze_meal(meal_description, model_name):
    llm = ChatOpenAI(model_name=model_name, openai_api_key=OPENAI_API_KEY)
    
    prompt = f"Analyze the following meal for nutritional content:\n\n{meal_description}"
    
    response = llm.predict(prompt)
    
    return response

# API endpoint to receive analysis request
@app.post("/analyze-meal")
async def analyze_meal_request(request: MealAnalysisRequest):
    try:
        result = analyze_meal(request.meal_description, request.model_name)
        return {"analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run server: uvicorn meal_analysis_service:app --reload
