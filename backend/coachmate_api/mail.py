"""Sends sign-in codes and report notices by SMTP. Settings come from .env, and nothing here logs the code."""
import os
import smtplib
from email.message import EmailMessage

TEXTS = {
    'en': ('Your CoachMate code: {code}', 'Your sign-in code is {code}.\n\nIt works for 10 minutes. If you did not ask for it, you can ignore this email.\n'),
    'sv': ('Din kod till CoachMate: {code}', 'Din inloggningskod är {code}.\n\nDen gäller i 10 minuter. Om du inte har bett om den kan du bortse från det här mejlet.\n'),
    'fi': ('CoachMate-koodisi: {code}', 'Kirjautumiskoodisi on {code}.\n\nSe on voimassa 10 minuuttia. Jos et pyytänyt sitä, voit jättää tämän viestin huomiotta.\n'),
}


def _smtp_from_env():
    """Returns a function that sends a message, or None if mail isn't set up."""
    host = os.getenv('SMTP_HOST')
    if not host:
        return None
    port = int(os.getenv('SMTP_PORT', '587'))
    user, password = os.getenv('SMTP_USER'), os.getenv('SMTP_PASS')
    sender = os.environ['MAIL_FROM']

    def deliver(to, subject, body):
        message = EmailMessage()
        message['Subject'] = subject
        message['From'] = sender
        message['To'] = to
        message.set_content(body)
        if port == 465:
            connection = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            connection = smtplib.SMTP(host, port, timeout=15)
            connection.starttls()
        with connection:
            if user:
                connection.login(user, password)
            connection.send_message(message)

    return deliver


def smtp_sender_from_env():
    """Returns None if mail isn't set up, which the API reports as an outage."""
    deliver = _smtp_from_env()
    if deliver is None:
        return None

    def send(email, code, locale):
        subject, body = TEXTS.get(locale if isinstance(locale, str) else '', TEXTS['en'])
        deliver(email, subject.format(code=code), body.format(code=code))

    return send


def report_notifier_from_env():
    """Tells the moderator about an exercise's first report. None without MODERATOR_EMAIL or mail."""
    moderator = os.getenv('MODERATOR_EMAIL')
    deliver = _smtp_from_env()
    if not moderator or deliver is None:
        return None

    def notify(exerciseId, title, reason):
        deliver(
            moderator,
            f'CoachMate: exercise reported: {title}',
            f'Exercise {exerciseId} ("{title}") was reported.\n\nReason: {reason or "none given"}\n\n'
            'Review it with: python3 scripts/moderate.py list\n',
        )

    return notify
