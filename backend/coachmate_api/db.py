"""One database connection per request, opened on first use."""
import mysql.connector
from flask import current_app, g


def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(**current_app.config['DB'])
        # The default level also locks the gaps where rows don't exist yet, which makes
        # coaches creating different exercises at the same moment deadlock each other
        cursor = g.db.cursor()
        cursor.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED')
        cursor.close()
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


def query_all(sql, params=(), dictionary=True):
    cursor = get_db().cursor(dictionary=dictionary)
    try:
        cursor.execute(sql, params)
        return cursor.fetchall()
    finally:
        cursor.close()
