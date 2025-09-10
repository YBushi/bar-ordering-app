import secrets, hashlib
from pydantic import BaseModel, Field

class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    room_number:str = Field(min_length=1, max_length=5)

class RegisterOut(BaseModel):
    device_token: str
    device_id: str
    guest_id: str
    room_id: str
    tab_id: str

# create a token, return it to client and store the hash in the DB
def issue_token():
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash