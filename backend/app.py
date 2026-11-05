import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from dotenv import load_dotenv

from coachmate_api import create_app
from coachmate_api.config import db_config_from_env, plan_source_from_env, provider_audiences_from_env
from coachmate_api.mail import smtp_sender_from_env
from coachmate_api.provider_tokens import ProviderTokenVerifier, real_signing_keys

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

# Never log request headers or bodies: they carry tokens and coaches' content
log_dir = Path(os.getenv('LOG_DIRECTORY', BASE_DIR))
log_dir.mkdir(parents=True, exist_ok=True)
handler = RotatingFileHandler(log_dir / 'coachmate-api.log', maxBytes=10 * 1024 * 1024, backupCount=5)
handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s [%(module)s:%(lineno)d] %(message)s'))
logger = logging.getLogger('coachmate')
logger.setLevel(logging.INFO)
logger.addHandler(handler)
logger.propagate = False

app = create_app(
    db_config_from_env(),
    send_sign_in_code=smtp_sender_from_env(),
    provider_verifier=ProviderTokenVerifier(provider_audiences_from_env(), real_signing_keys()),
    plan_source=plan_source_from_env(),
    plan_webhook_secret=os.getenv('REVENUECAT_WEBHOOK_SECRET'),
)

if __name__ == '__main__':
    app.run(port=5000)
