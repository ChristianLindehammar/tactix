"""The web page invite links open. Messaging apps only make web addresses tappable, so this page
hands over to the app, points coaches without it to the stores, and shows the code for typing in."""
import re
from html import escape

LANGUAGES = ('en', 'sv', 'fi')

# The menu names match the app's own translations, so the steps read the same as the screen
TEXT = {
    'en': {
        'title': 'Join a team on CoachMate',
        'invited': 'A coach invited you to plan their team together.',
        'open': 'Open in CoachMate',
        'no_app': "Don't have CoachMate yet? Install it, then come back here and tap Open in CoachMate.",
        'app_store': 'Download on the App Store',
        'google_play': 'Get it on Google Play',
        'by_hand': 'Or open CoachMate, go to Team, choose Join a team and enter this code:',
        'sign_in': "You'll be asked to sign in first. Signing in the first time creates your account.",
        'expires': 'The invite works for 7 days.',
    },
    'sv': {
        'title': 'Gå med i ett lag i CoachMate',
        'invited': 'En tränare har bjudit in dig att planera laget tillsammans.',
        'open': 'Öppna i CoachMate',
        'no_app': 'Har du inte CoachMate än? Installera appen, kom sedan tillbaka hit och tryck på Öppna i CoachMate.',
        'app_store': 'Ladda ned i App Store',
        'google_play': 'Hämta på Google Play',
        'by_hand': 'Eller öppna CoachMate, gå till Lag, välj Gå med i ett lag och skriv koden:',
        'sign_in': 'Du får logga in först. Första gången du loggar in skapas kontot.',
        'expires': 'Inbjudan gäller i 7 dagar.',
    },
    'fi': {
        'title': 'Liity joukkueeseen CoachMatessa',
        'invited': 'Valmentaja kutsui sinut suunnittelemaan joukkuetta yhdessä.',
        'open': 'Avaa CoachMatessa',
        'no_app': 'Eikö sinulla ole vielä CoachMatea? Asenna sovellus, palaa sitten tänne ja napauta Avaa CoachMatessa.',
        'app_store': 'Lataa App Storesta',
        'google_play': 'Hanki Google Playsta',
        'by_hand': 'Tai avaa CoachMate, siirry kohtaan Joukkue, valitse Liity joukkueeseen ja syötä koodi:',
        'sign_in': 'Sinua pyydetään ensin kirjautumaan. Ensimmäinen kirjautuminen luo tilin.',
        'expires': 'Kutsu on voimassa 7 päivää.',
    },
}

PAGE = '''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{smart_banner}<title>{title}</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 32px 16px; background: #f5f7f8; color: #11181c; text-align: center; }}
  main {{ max-width: 420px; margin: 0 auto; }}
  a.button {{ display: block; margin: 24px 0; padding: 14px; border-radius: 10px; background: #0a7ea4; color: #fff; text-decoration: none; font-weight: 600; }}
  a.store {{ display: block; margin: 12px 0; padding: 12px; border-radius: 10px; border: 1px solid currentColor; color: inherit; text-decoration: none; font-weight: 600; }}
  section {{ margin-top: 32px; }}
  code {{ font-size: 24px; letter-spacing: 2px; }}
  .note {{ font-size: 14px; opacity: 0.75; }}
  @media (prefers-color-scheme: dark) {{ body {{ background: #151718; color: #ecedee; }} }}
</style>
</head>
<body>
<main>
  <h1>{title}</h1>
  <p>{invited}</p>
  <a class="button" href="coachmate://join/{code}">{open}</a>
{stores}  <section>
    <p>{by_hand}</p>
    <p><code>{code}</code></p>
    <p class="note">{sign_in} {expires}</p>
  </section>
</main>
</body>
</html>
'''


def page_language(accept_languages):
    return accept_languages.best_match(LANGUAGES, default='en')


def _smart_banner(app_store_url, code):
    """Safari shows its own Open or Get banner for the app, and passes the link on once installed."""
    app_id = re.search(r'/id(\d+)', app_store_url or '')
    if not app_id:
        return ''
    return f'<meta name="apple-itunes-app" content="app-id={app_id.group(1)}, app-argument=coachmate://join/{code}">\n'


def _stores(text, store_links):
    links = [(store_links.get('ios'), text['app_store']), (store_links.get('android'), text['google_play'])]
    buttons = ''.join(f'  <a class="store" href="{escape(url)}">{label}</a>\n' for url, label in links if url)
    return f'  <p>{text["no_app"]}</p>\n{buttons}' if buttons else ''


def render_join_page(code, language, store_links):
    """The code must already be cleaned down to letters and digits."""
    text = {key: escape(value) for key, value in TEXT[language].items()}
    return PAGE.format(
        lang=language,
        code=code,
        smart_banner=_smart_banner(store_links.get('ios'), code),
        stores=_stores(text, store_links),
        **text,
    )
