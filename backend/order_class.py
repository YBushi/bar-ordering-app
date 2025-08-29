from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from typing import Dict
class OrderIn(BaseModel):
    items: Dict[str, int]
    userId: str

class Order(BaseModel):
    id: str
    userId: str
    timestamp: datetime
    status: str="in_progress"
    