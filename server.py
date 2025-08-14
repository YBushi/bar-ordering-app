from fastapi import FastAPI, HTTPException
from http import HTTPStatus
from datetime import datetime
import logs, order_class, quereries
from pydantic import BaseModel
import sqlite3

app = FastAPI()

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
        values = [order.get_id(), order.get_timestamp(), order.get_size(), order.get_quantity(), order.get_status()]
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
def create_order(size: int, quantity: int):
    '''Create an order with a timestamp and add it to a queue'''
    timestamp = datetime.now()
    order = order_class.Order(timestamp, size, quantity)
    logs.items.append(order)
    manage_database('POST', order)
    return logs.items

# run the server
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)