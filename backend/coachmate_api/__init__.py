import logging
import time

import mysql.connector
from flask import Flask, jsonify

from . import accounts, exercises, plans
from .db import close_db, query_one
from .rate_limit import DEFAULT_LIMITS

logger = logging.getLogger('coachmate')

MAX_REQUEST_BYTES = 1024 * 1024


def create_app(db_config, limits=None, clock=time.time, send_sign_in_code=None, provider_verifier=None,
               plan_source=None, plan_webhook_secret=None, sign_in_code_key=None):
    app = Flask(__name__)
    app.config['DB'] = db_config
    app.config['MAX_CONTENT_LENGTH'] = MAX_REQUEST_BYTES
    app.config['RATE_LIMITS'] = limits or DEFAULT_LIMITS
    app.config['CLOCK'] = clock
    app.config['SEND_SIGN_IN_CODE'] = send_sign_in_code
    app.config['PROVIDER_VERIFIER'] = provider_verifier
    app.config['PLAN_SOURCE'] = plan_source
    app.config['PLAN_WEBHOOK_SECRET'] = plan_webhook_secret
    app.config['SIGN_IN_CODE_KEY'] = sign_in_code_key
    app.teardown_appcontext(close_db)
    app.register_blueprint(accounts.bp)
    app.register_blueprint(exercises.bp)
    app.register_blueprint(plans.bp)

    @app.get('/health')
    def health():
        query_one('SELECT 1')
        return jsonify({'status': 'ok'})

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify({'error': 'tooLarge'}), 413

    # An outage must not look like missing data: the app shows this as a load failure
    @app.errorhandler(mysql.connector.Error)
    def database_unavailable(error):
        logger.error('Database error: %s', error)
        return jsonify({'error': 'serviceUnavailable'}), 503

    return app
