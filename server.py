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
    allow_origins=["*"],
    allow_methods=["*"],                      # allow all HTTP methods
    allow_headers=["*"],                      # allow all headers
)

def change_status(cursor, output):
    order_id = output[0]
    cursor.execute("UPDATE ORDERS SET STATUS = 'completed' WHERE ID = ?", (order_id, ))
    return

def connect_db():
    # try to connect to the database and return the cursor and connection
    try:
        connection = sqlite3.connect('database.db')
        cursor = connection.cursor()
        cursor.execute(quereries.create_table_query)
        print("Connected to DB!")
    except sqlite3.Error as error:
        print(f"Error occured: {error}")
    return cursor, connection

def disconnect_db(cursor, connection):
    # commit changes and disconnect from the database
    connection.commit()
    cursor.close()


# def manage_database(command: str, order: order_class.Order = None):
#     '''Create a connection to the database'''
#     try:
#         connection = sqlite3.connect('database.db')
#         cursor = connection.cursor()
#         cursor.execute(quereries.create_table_query)
#         print("Connected to DB!")
#     except sqlite3.Error as error:
#         print(f"Error occured: {error}")

#     # add a new order to the DB
#     if command == 'POST':
#         values = [order.id, order.userId, order.timestamp, order.size, 
#                   order.quantity, order.status]
#         cursor.execute("INSERT INTO ORDERS VALUES (?, ?, ?, ?, ?, ?)", values)

#     # retrieve the first order in a queue from DB
#     if command == 'GET':
#         cursor.execute("SELECT * FROM ORDERS WHERE STATUS = 'in_progress'")
#         output = cursor.fetchone()
#         change_status(cursor, output)
#         connection.commit()
#         cursor.close()
#         return order
#     connection.commit()
#     cursor.close()


# get beer order
@app.get('/orders/{userID}')
def retrieve_order(userID: str):
    cursor, connection = connect_db()
    try:
        cursor.execute("SELECT * FROM ORDERS WHERE USERID = ? AND STATUS = 'in_progress'",
        (userID,))
        rows = cursor.fetchall()
        orders = [
                {
                    "id": r[0],
                    "userId": r[1],
                    "timestamp": r[2],
                    "size": r[3],
                    "quantity": r[4],
                    "price": r[5],
                    "status": r[6],
                }
                for r in rows
        ]
        return orders
    finally:
        disconnect_db(cursor, connection)
    

@app.post('/order')
def create_order(orderIn: order_class.OrderIn):
    '''Create an order with a timestamp and add it to a queue'''
    cursor, connection = connect_db()
    order = order_class.Order(id=str(ulid.new()), userId=orderIn.userId, 
                              timestamp=datetime.now(), size=orderIn.size, 
                              quantity=orderIn.quantity, 
                              price = orderIn.size * orderIn.quantity)
    values = [order.id, order.userId, order.timestamp, order.size, 
                  order.quantity, order.price, order.status]
    cursor.execute("INSERT INTO ORDERS VALUES (?, ?, ?, ?, ?, ?, ?)", values)
    disconnect_db(cursor, connection)
    return order

# run the server
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)