from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks, APIRouter
from http import HTTPStatus
from datetime import datetime
import order_class as order_class
import queries as queries
from pydantic import BaseModel
import sqlite3
import ulid
import uuid
from uuid import uuid4
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import os
import psycopg2
from psycopg2 import sql
import traceback
import traceback, sys
from fastapi.responses import JSONResponse
import registration as reg

CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "https://stadium-ordering-app-1.onrender.com")
STAFF_ORIGIN  = os.getenv("STAFF_ORIGIN",  "https://bar-ordering-app.onrender.com")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials = False,
    allow_methods=["*"],                      # allow all HTTP methods
    allow_headers=["*"],                      # allow all headers
)

# client = APIRouter(prefix="/api/client", tags=["client"])
# staff  = APIRouter(prefix="/api/staff",  tags=["staff"])
# app.include_router(client)
# app.include_router(staff)

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
            msg = await ws.receive_text()
            await ws.send_text(f"echo: {msg}")
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

# helper function to run multiple sql statements
def run_ddl(cursor, ddl: str):
    for stmt in [s.strip() for s in ddl.split(";") if s.strip()]:
        cursor.execute(stmt + ";")

# connect to Postgre DB
def connect_db():
    try:
        db_url = os.getenv("DATABASE_URL")
        connection = psycopg2.connect(db_url, sslmode="require")
        cursor = connection.cursor()
        run_ddl(cursor, queries.create_drinks_table)
        run_ddl(cursor, queries.create_orders_table)
        run_ddl(cursor, queries.create_orderItems_table)
        run_ddl(cursor, queries.create_rooms_table)
        run_ddl(cursor, queries.create_tabs_table)
        run_ddl(cursor, queries.create_devices_table)
        connection.commit()
        print("Connected to DB!")
    except psycopg2.Error as error:
        print(f"Error occurred: {error}")
    return cursor, connection

def disconnect_db(cursor, connection):
    # commit changes and disconnect from the database
    try: 
        cursor.close()
    finally:
        connection.close()

@app.post('/register', response_model=reg.RegisterOut)
def register(body: reg.RegisterIn):
    token, token_hash = reg.issue_token()
    device_id = str(ulid.new())

    cursor, connection = connect_db()

    try:
        cursor.execute(
            "SELECT id FROM rooms WHERE number %s",
            (body.room_number)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Unknown room number")
        room_id = row

        # create guest id and insert into guests table
        guest_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO guests (id, name) VALUES (%s, %s) RETURNING id",
            (guest_id, body.name)
        
        )
        guest_id = cursor.fetchone()[0]

        # create device
        cursor.execute("""
                    INSERT INTO devices (id, guest_id, room_id, token_hash)
                    VALUES (%s, %%s, %s, %s)""",
                    (device_id, guest_id, room_id, token_hash)
        )
        
        # retrieve or create a tab
        cursor.execute(
            "SELECT id FROM tabs WHERE room_id = %s AND is_open = 1 LIMIT 1" 
        )
        r = cursor.fetchone()
        if r:
            tab_id = r[0]
        else:
            tab_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO tabs (id, room_id, is_open, opened_at) VALUES,
                (%s, %s, 1, CURRENT_TIMESTAMP)""",
                (tab_id, room_id)
            )
        connection.commit()

        return reg.RegisterOut(
            device_token=token,
            device_id=device_id,
            guest_id=guest_id,
            room_id=room_id,
            tab_id=tab_id
        )
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail="Registration Failed!")
    finally:
        disconnect_db(cursor, connection)



@app.patch('/orders/{orderID}')
async def change_status(orderID: str, background_tasks: BackgroundTasks):
    # change the status to completed
    cursor, connection = connect_db()
    try:
        cursor.execute("UPDATE orders SET status = 'completed' WHERE id = %s", (orderID, ))
        connection.commit()
        await ws_manager.broadcast({"type": "ORDER_STATUS", "order": "completed"})
        return {"ok": True}
    finally:
        disconnect_db(cursor, connection)

# get beer order
@app.get('/orders')
def retrieve_order(userID: Optional[str] = Query(default=None)):
    cursor, connection = connect_db()
    try:
        if userID is None:
            cursor.execute("SELECT * FROM orders WHERE status = 'in_progress' ORDER BY timestamp DESC")
        else:
            cursor.execute("SELECT * FROM orders WHERE user_id = %s AND status = 'in_progress'"
            "ORDER BY timestamp DESC", (userID,))
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
        cursor.execute(f"""
            SELECT
              oi.order_id,
              oi.drink_id,
              d.name,
              oi.qty,
              oi.price
            FROM order_items oi
            JOIN drinks d ON d.id = oi.drink_id
            WHERE oi.order_id IN %s
            ORDER BY oi.order_id, d.name
        """, (tuple(order_ids),))
        item_rows = cursor.fetchall()

        for row in item_rows:
            order_id, drink_id, name, qty, price = row
            qty = int(qty)
            price = float(price)
            line_total = qty * price
            by_id[order_id]["items"].append({
                "drinkId": drink_id,
                "name": name,
                "quantity": qty,
                "price": price,
                "line_total": line_total
            })
            by_id[order_id]["totalPrice"] = round(by_id[order_id]["totalPrice"] + line_total, 2)
        print(f"BY_ID: {by_id}")
        connection.commit()
        return list(by_id.values())
    finally:
        disconnect_db(cursor, connection)

@app.get("/health")
def health():
    return {"ok": True}
    

@app.post('/order')
async def create_order(orderIn: order_class.OrderIn):
    '''Create an order with a timestamp and add it to a queue'''
    cursor, connection = connect_db()
    
    try:
        # retrieve the prices
        drink_ids = list(orderIn.items.keys())
        if not drink_ids:
            raise HTTPException(status_code=400, detail="No items in the order!")
        
        cursor.execute("""
            SELECT id, price FROM drinks WHERE id IN %s
        """, (tuple(drink_ids),))
        rows = cursor.fetchall()
        found = {r[0]: r[1] for r in rows}
        missing = [d for d in drink_ids if d not in found]
        if missing:
            raise HTTPException(status_code=400, detail=f"Unknown drink ids: {missing}")
        
        timestamp = datetime.now().isoformat()
        order = order_class.Order(id=str(ulid.new()), userId=orderIn.userId, 
                                timestamp=timestamp)
        cursor.execute(
                "INSERT INTO orders (id, user_id, timestamp, status) VALUES (%s, %s, %s, %s)",
                (order.id, order.userId, order.timestamp, order.status)
            )

            # Prepare order_items tuples (order_id, drink_id, quantity, unit_price_cents)
        items = [
            (order.id, drink_id, int(qty), found[drink_id])
            for drink_id, qty in orderIn.items.items()
        ]

        cursor.executemany(
            """
            INSERT INTO order_items (order_id, drink_id, qty, price)
            VALUES (%s, %s, %s, %s)
            """,
            items
        )
        connection.commit()
        return order
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail={"type": e.__class__.__name__, "message": str(e)})
    finally:
        disconnect_db(cursor, connection)
    

# run the server
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)