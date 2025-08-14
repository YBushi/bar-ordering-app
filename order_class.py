import ulid
class Order:
    def __init__(self, timestamp, size, quantity, status = 'in_progress'):
        self.id = str(ulid.new())
        self.timestamp = timestamp
        self.size = size
        self.quantity = quantity
        self.price = size * quantity * 5
        self.status = status
    def get_id(self):
        return self.id
    def get_timestamp(self):
        return self.timestamp
    def get_size(self):
        return self.size
    def get_quantity(self):
        return self.quantity
    def get_price(self):
        return self.price
    def get_status(self):
        return self.status
    
    