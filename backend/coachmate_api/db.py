"""One database connection per request, opened on first use."""
import mysql.connector
from flask import current_app, g


def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(**current_app.config['DB'])
    return g.db


def close_db(_exception=None):
    connection = g.pop('db', None)
    if connection is not None:
        connection.close()


def query_one(sql, params=()):
    cursor = get_db().cursor(dictionary=True)
    try:
        cursor.execute(sql, params)
        return cursor.fetchone()
    finally:
        cursor.close()
