import secrets, hashlib
from pydantic import BaseModel, Field
from server import connect_db, disconnect_db
from fastapi import Header, HTTPException

# create a token, return it to client and store the hash in the DB
def issue_token():
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash

def get_current_device(authorization: str | None = Header(None)):
    '''Perform authorization for the current device and return its tab'''

    if not authorization or not authorization.startswith("Device "):
        raise HTTPException(status_code=401, detail="Missing device token!")
    
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty device token!")
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    cursor, connection = connect_db()
    try:
        cursor.execute(
            "SELECT id, guest_id, room_id FROM devices WHERE token_hash = %s",
            (token_hash, )
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid device token!")
        device_id, guest_id, room_id = row
        return {
            "id": device_id,
            "guest_id": guest_id,
            "room_id": room_id
        }
    finally:
        disconnect_db(cursor, connection)
 