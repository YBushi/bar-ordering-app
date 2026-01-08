from server import connect_db, disconnect_db
def delete_old_orders():
    cursor, connection = connect_db()
    cursor.execute("""
        DELETE FROM orders
        WHERE status = 'completed'
          AND timestamp < NOW() - INTERVAL '1 days';
    """)
    connection.commit()
    disconnect_db(cursor, connection)