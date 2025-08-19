from fastapi import FastAPI, HTTPException
from http import HTTPStatus
from datetime import datetime
import logs, order_class, quereries
from pydantic import BaseModel
import sqlite3
import ulid
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],  # frontend URL
    allow_methods=["*"],                      # allow all HTTP methods
    allow_headers=["*"],                      # allow all headers
)

def change_status(cursor, output):
    order_id = output[0]
    cursor.execute("UPDATE ORDERS SET STATUS = 'completed' WHERE ID = ?", (order_id, ))
    return

def manage_database(command: str, order: order_class.Order = None):
    '''Create a connection to the database'''
    try:
        connection = sqlite3.connect('database.db')
        cursor = connection.cursor()
        cursor.execute(quereries.create_table_query)
        print("Connected to DB!")
    except sqlite3.Error as error:
        print(f"Error occured: {error}")

    # add a new order to the DB
    if command == 'POST':
        values = [order.id, order.timestamp, order.size, order.quantity, order.status]
        cursor.execute("INSERT INTO ORDERS VALUES (?, ?, ?, ?, ?)", values)

    # retrieve the first order in a queue from DB
    if command == 'GET':
        cursor.execute("SELECT * FROM ORDERS WHERE STATUS = 'in_progress'")
        output = cursor.fetchone()
        change_status(cursor, output)
        print(output)
    connection.commit()
    cursor.close()


# get beer order
@app.get('/order/{position}')
def retrieve_order(position: int):
    # check whether the position is correct
    if position >= len(logs.items):
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Order not found")
    manage_database('GET')
    return logs.items[position]
    

@app.post('/order')
def create_order(orderIn: order_class.OrderIn):
    print("TRIGGERED!")
    '''Create an order with a timestamp and add it to a queue'''
    order = order_class.Order(id=str(ulid.new()), timestamp=datetime.now(), 
                              size=orderIn.size, quantity=orderIn.quantity, 
                              price = orderIn.size * orderIn.quantity)
    print("ITS HERE!")
    manage_database('POST', order)
    return order

# run the server
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)