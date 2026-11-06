-- A team coaches share. Its content lives in team_items, and revision counts every change to it
CREATE TABLE teams (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_teams_owner (owner_id),
  CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;

-- Who can edit a team. The owner is a member too
CREATE TABLE team_members (
  team_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(16) NOT NULL,
  joined_at DATETIME(3) NOT NULL,
  PRIMARY KEY (team_id, user_id),
  INDEX idx_team_members_user (user_id),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;

-- The team's name, players, formations and each player's place in each formation, one row each, so
-- coaches changing different things never overwrite each other. A removed item keeps its row with
-- data NULL, so other phones learn it's gone
CREATE TABLE team_items (
  team_id CHAR(36) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  item_id VARCHAR(140) NOT NULL,
  data TEXT NULL,
  revision BIGINT NOT NULL,
  updated_by CHAR(36) NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (team_id, kind, item_id),
  INDEX idx_team_items_revision (team_id, revision),
  CONSTRAINT fk_team_items_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;

-- Invite codes, shared as links. Only a hash is stored, and any number of coaches can use one until it expires
CREATE TABLE team_invites (
  code_hash CHAR(64) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  INDEX idx_team_invites_team (team_id),
  CONSTRAINT fk_team_invites_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
