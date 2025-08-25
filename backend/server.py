from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from http import HTTPStatus
from datetime import datetime
import order_class as order_class, quereries as quereries
from pydantic import BaseModel
import sqlite3
import ulid
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],                      # allow all HTTP methods
    allow_headers=["*"],                      # allow all headers
)

class WSManager:
    def __init__(self):
        self.clients = set() # set of webSockets
    
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)
    
    def disconnect(self, ws: WebSocket):
        self.clients.discard(ws)
    
    async def broadcast(self, payload: dict):
        dead = []
        msg = json.dumps(payload)
        for ws in list(self.clients):
            try: 
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
ws_manager = WSManager()

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    print("CONNECTING!")
    await ws_manager.connect(ws)
    try: 
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

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

@app.patch('/orders/{orderID}')
def change_status(orderID: str, background_tasks: BackgroundTasks):
    # change the status to completed
    cursor, connection = connect_db()
    try:
        cursor.execute("UPDATE ORDERS SET STATUS = 'completed' WHERE ID = ?", (orderID, ))
        print("BROADCASTING!")
        background_tasks.add_task(ws_manager.broadcast, 
                                  {"type": "ORDER_STATUS", "orderID": orderID, "status": "completed"})
        return {"ok": True}
    finally:
        disconnect_db(cursor, connection)

# get beer order
@app.get('/orders')
def retrieve_order(userID: Optional[str] = Query(default=None)):
    cursor, connection = connect_db()
    try:
        if userID is None:
            cursor.execute("SELECT * FROM ORDERS WHERE STATUS = 'in_progress'")
            rows = cursor.fetchall()
        else:
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