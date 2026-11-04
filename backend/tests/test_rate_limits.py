import pytest

from coachmate_api import create_app
from tests.test_exercises import build_exercise, put

LIMITS = {'devices': (2, 3600), 'saves': (2, 3600)}


class Clock:
    def __init__(self):
        self.now = 1_800_000_000.0

    def __call__(self):
        return self.now


@pytest.fixture()
def clock():
    return Clock()


@pytest.fixture()
def limited(db_config, clock):
    return create_app(db_config, limits=LIMITS, clock=clock).test_client()


def register_from(client, address, **headers):
    return client.post('/devices', environ_base={'REMOTE_ADDR': address}, headers=headers)


class TestRegistering:
    def test_stops_an_address_at_the_limit(self, limited):
        assert register_from(limited, '203.0.113.5').status_code == 201
        assert register_from(limited, '203.0.113.5').status_code == 201

        response = register_from(limited, '203.0.113.5')

        assert response.status_code == 429
        assert response.get_json() == {'error': 'rateLimited'}

    def test_says_when_to_try_again(self, limited, clock):
        clock.now = 1_800_000_000.0 - (1_800_000_000 % 3600) + 600
        for _ in range(2):
            register_from(limited, '203.0.113.5')

        response = register_from(limited, '203.0.113.5')

        assert response.headers['Retry-After'] == '3000'

    def test_does_not_create_a_user_once_stopped(self, limited, rows):
        for _ in range(5):
            register_from(limited, '203.0.113.5')

        assert rows('SELECT COUNT(*) FROM users') == [(2,)]

    def test_leaves_other_addresses_alone(self, limited):
        for _ in range(3):
            register_from(limited, '203.0.113.5')

        assert register_from(limited, '203.0.113.6').status_code == 201

    def test_allows_more_in_the_next_window(self, limited, clock):
        for _ in range(3):
            register_from(limited, '203.0.113.5')

        clock.now += 3600

        assert register_from(limited, '203.0.113.5').status_code == 201

    def test_treats_one_ipv6_network_as_one_address(self, limited):
        register_from(limited, '2001:db8:1:1::1')
        register_from(limited, '2001:db8:1:1::2')

        assert register_from(limited, '2001:db8:1:1::3').status_code == 429
        assert register_from(limited, '2001:db8:1:2::1').status_code == 201

    def test_counts_an_ipv4_address_the_same_in_ipv6_form(self, limited):
        register_from(limited, '203.0.113.5')
        register_from(limited, '::ffff:203.0.113.5')

        assert register_from(limited, '203.0.113.5').status_code == 429

    def test_a_forged_forwarded_header_does_not_get_around_it(self, limited):
        for number in range(2):
            register_from(limited, '203.0.113.5', **{'X-Forwarded-For': f'198.51.100.{number}'})

        response = register_from(limited, '203.0.113.5', **{'X-Forwarded-For': '198.51.100.9'})

        assert response.status_code == 429

    def test_has_a_limit_by_default(self, db_config):
        client = create_app(db_config).test_client()

        codes = [register_from(client, '203.0.113.5').status_code for _ in range(21)]

        assert codes == [201] * 20 + [429]


class TestWhatIsKept:
    def test_does_not_store_the_address(self, limited, rows):
        register_from(limited, '203.0.113.5')

        assert '203.0.113.5' not in str(rows('SELECT * FROM rate_limits'))

    def test_clears_out_old_counts(self, limited, clock, rows):
        register_from(limited, '203.0.113.5')
        clock.now += 2 * 3600

        register_from(limited, '203.0.113.6')

        assert len(rows('SELECT * FROM rate_limits')) == 1


class TestSaving:
    def headers_from(self, client, address):
        token = register_from(client, address).get_json()['token']
        return {'Authorization': f'Bearer {token}'}

    def test_stops_one_install_at_the_limit(self, limited):
        me = self.headers_from(limited, '203.0.113.5')
        put(limited, build_exercise(), me)
        put(limited, build_exercise(), me)

        response = put(limited, build_exercise(), me)

        assert response.status_code == 429
        assert response.get_json() == {'error': 'rateLimited'}

    def test_leaves_other_installs_alone(self, limited):
        me = self.headers_from(limited, '203.0.113.5')
        other = self.headers_from(limited, '203.0.113.6')
        for _ in range(3):
            put(limited, build_exercise(), me)

        assert put(limited, build_exercise(), other).status_code == 200

    def test_reading_is_not_limited(self, limited):
        me = self.headers_from(limited, '203.0.113.5')
        exercise = build_exercise()
        put(limited, exercise, me)

        codes = [limited.get(f"/exercises/{exercise['id']}", headers=me).status_code for _ in range(4)]

        assert codes == [200] * 4
