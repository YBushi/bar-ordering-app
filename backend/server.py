from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks, APIRouter
from http import HTTPStatus
from datetime import datetime
import order_class as order_class
import queries as queries
from pydantic import BaseModel
import sqlite3
import ulid
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import os

CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "https://stadium-ordering-app-1.onrender.com")
STAFF_ORIGIN  = os.getenv("STAFF_ORIGIN",  "https://bar-ordering-app.onrender.com")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_ORIGIN, STAFF_ORIGIN],
    allow_credentials = True,
    allow_methods=["*"],                      # allow all HTTP methods
    allow_headers=["*"],                      # allow all headers
)

client = APIRouter(prefix="/api/client", tags=["client"])
staff  = APIRouter(prefix="/api/staff",  tags=["staff"])
app.include_router(client)
app.include_router(staff)

class WSManager:
    def __init__(self):
        self.clients = set() # set of webSockets
    
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)
    
    def disconnect(self, ws: WebSocket):
        self.clients.discard(ws)
    
    async def send_text(self, ws: WebSocket, text: str):
        if ws in self.clients:
            await ws.send_text(text)
        else:
            print("Not sending to WS!")
    
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
        cursor.executescript(queries.create_drinks_table)
        cursor.executescript(queries.create_orders_table)
        cursor.executescript(queries.create_orderItems_table)
        print("Connected to DB!")
    except sqlite3.Error as error:
        print(f"Error occured: {error}")
    return cursor, connection

def disconnect_db(cursor, connection):
    # commit changes and disconnect from the database
    connection.commit()
    cursor.close()

@staff.patch('/orders/{orderID}')
async def change_status(orderID: str, background_tasks: BackgroundTasks):
    # change the status to completed
    cursor, connection = connect_db()
    try:
        cursor.execute("UPDATE ORDERS SET STATUS = 'completed' WHERE ID = ?", (orderID, ))
        print("BROADCASTING!")
        await ws_manager.broadcast({"type": "ORDER_STATUS", "order": "completed"})
        print("BROADCASTED!")
        return {"ok": True}
    finally:
        disconnect_db(cursor, connection)

# get beer order
@staff.get('/orders')
@client.get('/orders')
def retrieve_order(userID: Optional[str] = Query(default=None)):
    cursor, connection = connect_db()
    try:
        if userID is None:
            cursor.execute("SELECT * FROM ORDERS WHERE STATUS = 'in_progress' ORDER BY TIMESTAMP DESC")
        else:
            cursor.execute("SELECT * FROM ORDERS WHERE USER_ID = ? AND STATUS = 'in_progress'"
            "ORDER BY TIMESTAMP DESC", (userID,))
        orders_rows = cursor.fetchall()

        # if there are no orders in progress, return empty
        if not orders_rows:
            return []

        # Build map id -> order dict + collect ids
        orders = []
        by_id = {}
        order_ids = []
        for r in orders_rows:
            oid = r[0]
            order = {
                "id": oid,
                "userId": r[1],
                "timestamp": r[2],
                "status": r[3],
                "items": [],
                "totalPrice": 0,
            }
            orders.append(order)
            by_id[oid] = order
            order_ids.append(oid)
        print(order_ids)

        # 2) Fetch ALL items for those orders in one query
        placeholders = ",".join(["?"] * len(order_ids))
        cursor.execute(f"""
            SELECT
              OI.ORDER_ID,
              OI.DRINK_ID,
              D.NAME,
              OI.QTY,
              OI.PRICE
            FROM ORDER_ITEMS OI
            JOIN DRINKS D ON D.ID = OI.DRINK_ID
            WHERE OI.ORDER_ID IN ({placeholders})
            ORDER BY OI.ORDER_ID, D.NAME
        """, order_ids)
        item_rows = cursor.fetchall()
        print(f"Item rows: {item_rows}")

        for row in item_rows:
            order_id = row[0]
            qty = int(row[3])
            price = float(row[4])
            line_total = float(qty * price)
            by_id[order_id]["items"].append({
                "drinkId": row[1],
                "name": row[2],
                "quantity": qty,
                "price": price,
                "line_total": line_total
            })
            by_id[order_id]["totalPrice"] = round(by_id[order_id]["totalPrice"] + line_total, 2)
        print(f"BY_ID: {by_id}")
        return list(by_id.values())
    finally:
        disconnect_db(cursor, connection)
    

@client.post('/order')
async def create_order(orderIn: order_class.OrderIn):
    '''Create an order with a timestamp and add it to a queue'''
    cursor, connection = connect_db()
    cursor.execute("PRAGMA foreign_keys = ON") 

    # retrieve the prices
    drink_ids = list(orderIn.items.keys())

    placeholders = ",".join(["?"] * len(drink_ids))
    rows = cursor.execute(
        f"SELECT ID, PRICE FROM DRINKS WHERE ID IN ({placeholders})",
        drink_ids
    ).fetchall()
    found = {r[0]: r[1] for r in rows}
    order = order_class.Order(id=str(ulid.new()), userId=orderIn.userId, 
                              timestamp=datetime.now())
    cursor.execute(
            "INSERT INTO ORDERS (ID, USER_ID, TIMESTAMP, STATUS) VALUES (?, ?, ?, ?)",
            (order.id, order.userId, order.timestamp, order.status)
        )

        # Prepare order_items tuples (order_id, drink_id, quantity, unit_price_cents)
    items = [
        (order.id, drink_id, qty, found[drink_id])
        for drink_id, qty in orderIn.items.items()
    ]

    cursor.executemany(
        """
        INSERT INTO ORDER_ITEMS (ORDER_ID, DRINK_ID, QTY, PRICE)
        VALUES (?, ?, ?, ?)
        """,
        items
    )
    disconnect_db(cursor, connection)
    return order

# run the server
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)