from fastapi import FastAPI, HTTPException
from http import HTTPStatus
from datetime import datetime
import logs, order_class, quereries
from pydantic import BaseModel
import sqlite3



app = FastAPI()

try:
    connection = sqlite3.connect('database.db')
    cursor = connection.cursor()
    print('DB Init!')
    cursor.execute(quereries.create_table_query)
    cursor.close()
except sqlite3.Error as error:
    print(f"Error occured: {error}")
# get beer order
@app.get('/order/{position}')
def retrieve_order(position: int):
    # check whether the position is correct
    if position >= len(logs.items):
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Order not found")
    return logs.items[position]
    

@app.post('/order')
def create_order(size: int, quantity: int):
    '''Create an order with a timestamp and add it to a queue'''
    timestamp = datetime.now()
    order = order_class.Order(timestamp, size, quantity)
    logs.items.append(order)
    return logs.items

# run the server
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)