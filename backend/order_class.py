from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
class OrderIn(BaseModel):
    size: float
    quantity: int
    userId: str

class Order(BaseModel):
    id: str
    userId: str
    timestamp: datetime
    size: float
    quantity: int
    price: float
    status: str="in_progress"
    