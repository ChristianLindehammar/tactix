# CoachMate Monetization & Team Collaboration Roadmap

## Executive Summary

This document outlines the monetization strategy for CoachMate, with a focus on implementing **team collaboration** as a premium subscription feature. The strategy includes a two-tier pricing model, phased implementation roadmap, and technical architecture using React Native (frontend), Python backend, and MariaDB database.

---

## 💰 Pricing Strategy

### Two-Tier Subscription Model

#### **Premium Individual** - $2.99/month or $24.99/year
- ✅ Cloud Sync & Backup
- ✅ PDF Export
- ✅ Tactics Library (20 templates per sport)
- ✅ PNG Export with Annotations
- ✅ Season Planning Tools
- ✅ Playing Time Tracker
- ❌ Team Collaboration (view-only access to shared teams)

#### **Premium Team** - $7.99/month or $69.99/year
- ✅ Everything in Premium Individual
- ✅ **Real-time Team Collaboration**
- ✅ **Invite unlimited coaching staff**
- ✅ **Automatic configuration sync**
- ✅ **Role-based permissions** (owner, editor, viewer)
- ✅ **Team activity history**
- ✅ Advanced Analytics
- ✅ Animation & Playback
- ✅ Priority support

### Why This Pricing Works
- Individual coaches get professional tools at an affordable price point
- Coaching staffs (2-5 people) share one subscription at $7.99/month
- Clear upgrade path as needs grow
- Team tier justifies higher price with collaboration + advanced features
- Competitive with market (most coaching apps charge $5-15/month)

---

## 📅 Implementation Roadmap

### **Phase 1: MVP Premium (Launch)** - 6-8 weeks
- ✅ User authentication system
- ✅ Cloud Sync & Backup (individual user data)
- ✅ PDF Export (basic)
- ✅ Tactics Library (20 templates per sport)
- ✅ In-app purchase system (Expo IAP)
- ✅ Backend API foundation

**Goal:** Launch Premium Individual tier, validate market, generate initial revenue

### **Phase 2: High-Value Individual Features** - 3-6 months post-launch
- ✅ PNG Export with Annotations
- ✅ Season Planning Tools
- ✅ Playing Time Tracker
- ✅ Enhanced PDF templates
- ✅ Offline-first sync improvements

**Goal:** Increase individual user value and retention

### **Phase 3: Team Collaboration** - 6-9 months post-launch
- ✅ Team Workspace Creation
- ✅ Real-time Sync Engine
- ✅ Invitation System (email + shareable links)
- ✅ Role-Based Access Control
- ✅ Activity Feed & History
- ✅ Conflict Resolution
- ✅ WebSocket infrastructure

**Goal:** Launch Premium Team tier, enable viral growth through team invitations

### **Phase 4: Advanced Features** - 12+ months
- ✅ Animation & Playback
- ✅ Advanced Analytics
- ✅ Drills Library
- ✅ Video integration
- ✅ Multi-team management dashboard

---

## 🏗️ Technical Architecture

### Overview
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  React Native   │◄───────►│  Python Backend  │◄───────►│   MariaDB   │
│   (Expo App)    │  REST   │   (FastAPI)      │   SQL   │  Database   │
│                 │◄───────►│                  │         │             │
└─────────────────┘ WebSocket└──────────────────┘         └─────────────┘
```

### Technology Stack

#### Frontend (React Native)
- **Framework:** Expo (React Native)
- **State Management:** React Context API
- **Local Storage:** AsyncStorage
- **HTTP Client:** fetch API or axios
- **WebSocket Client:** Socket.IO client or native WebSocket
- **Authentication:** JWT tokens stored in SecureStore

#### Backend (Python)
- **Framework:** FastAPI (recommended) or Flask
- **WebSocket:** Socket.IO or FastAPI WebSockets
- **Authentication:** JWT (PyJWT)
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Task Queue:** Celery (for background jobs)
- **Caching:** Redis (optional, for session management)

#### Database (MariaDB)
- **Version:** MariaDB 10.6+
- **Features Used:**
  - JSON columns for flexible data storage
  - Foreign keys for referential integrity
  - Indexes for performance
  - Transactions for data consistency

---

## 🗄️ Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    subscription_tier ENUM('free', 'premium_individual', 'premium_team') DEFAULT 'free',
    subscription_expires_at TIMESTAMP NULL,
    INDEX idx_email (email)
);
```

#### `magic_links`
```sql
CREATE TABLE magic_links (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,  -- NULL if user doesn't exist yet
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_email (email),
    INDEX idx_expires (expires_at)
);
```

#### `workspaces`
```sql
CREATE TABLE workspaces (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id)
);
```

#### `workspace_members`
```sql
CREATE TABLE workspace_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('owner', 'editor', 'viewer') NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by BIGINT,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_workspace_user (workspace_id, user_id),
    INDEX idx_workspace (workspace_id),
    INDEX idx_user (user_id)
);
```

#### `teams`
```sql
CREATE TABLE teams (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    workspace_id BIGINT NULL,  -- NULL for personal teams, set for shared teams
    name VARCHAR(255) NOT NULL,
    sport ENUM('soccer', 'basketball', 'hockey', 'floorball', 'bandy') NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_edited_by BIGINT NOT NULL,
    version INT DEFAULT 1,  -- For conflict resolution
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_workspace (workspace_id),
    INDEX idx_created_by (created_by)
);
```

#### `configurations`
```sql
CREATE TABLE configurations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_team (team_id)
);
```

#### `players`
```sql
CREATE TABLE players (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(50) NOT NULL,
    jersey_number INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_team (team_id)
);
```

#### `player_positions`
```sql
CREATE TABLE player_positions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    configuration_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    x_position DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000
    y_position DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000
    is_on_court BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (configuration_id) REFERENCES configurations(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY unique_config_player (configuration_id, player_id),
    INDEX idx_configuration (configuration_id),
    INDEX idx_player (player_id)
);
```

#### `sync_events` (for activity history)
```sql
CREATE TABLE sync_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    event_type ENUM('create', 'update', 'delete', 'player_add', 'player_remove', 'config_change') NOT NULL,
    event_data JSON,  -- Stores details of the change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_team_created (team_id, created_at),
    INDEX idx_user (user_id)
);
```

#### `invitations`
```sql
CREATE TABLE invitations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    workspace_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('editor', 'viewer') NOT NULL,
    invited_by BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_workspace (workspace_id),
    INDEX idx_email (email)
);
```

---

## 🔌 API Design

### Base URL
```
https://api.coachmate.app/v1
```

### Authentication
All authenticated endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Authentication (Passwordless Magic Link)

**POST /auth/send-magic-link**
```json
Request:
{
  "email": "coach@example.com",
  "display_name": "John Coach"  // Optional, only for first-time users
}

Response:
{
  "message": "Magic link sent to coach@example.com",
  "expires_in": 900  // 15 minutes in seconds
}
```

**POST /auth/verify-magic-link**
```json
Request:
{
  "token": "ml_abc123xyz789def456"
}

Response:
{
  "user_id": 123,
  "email": "coach@example.com",
  "display_name": "John Coach",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "subscription_tier": "free",
  "is_new_user": false
}

// Error response (expired or invalid token):
Status: 401 Unauthorized
{
  "error": "invalid_token",
  "message": "Magic link has expired or is invalid"
}
```

**POST /auth/refresh**
```json
Request:
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### Teams

**GET /teams**
```json
Response:
{
  "teams": [
    {
      "id": 1,
      "name": "U12 Soccer Team",
      "sport": "soccer",
      "workspace_id": null,
      "is_shared": false,
      "version": 5,
      "updated_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Varsity Basketball",
      "sport": "basketball",
      "workspace_id": 10,
      "is_shared": true,
      "version": 12,
      "updated_at": "2025-01-15T14:20:00Z"
    }
  ]
}
```

**POST /teams**
```json
Request:
{
  "name": "U14 Hockey Team",
  "sport": "hockey",
  "workspace_id": null  // null for personal team
}

Response:
{
  "id": 3,
  "name": "U14 Hockey Team",
  "sport": "hockey",
  "workspace_id": null,
  "version": 1,
  "created_at": "2025-01-15T15:00:00Z"
}
```

**GET /teams/:team_id**
```json
Response:
{
  "id": 1,
  "name": "U12 Soccer Team",
  "sport": "soccer",
  "workspace_id": null,
  "version": 5,
  "configurations": [
    {
      "id": 1,
      "name": "4-3-3 Formation",
      "is_selected": true
    },
    {
      "id": 2,
      "name": "4-4-2 Formation",
      "is_selected": false
    }
  ],
  "players": [
    {
      "id": 101,
      "name": "John Smith",
      "position": "forward",
      "jersey_number": 10
    }
  ],
  "player_positions": [
    {
      "configuration_id": 1,
      "player_id": 101,
      "x_position": 0.5,
      "y_position": 0.3,
      "is_on_court": true
    }
  ]
}
```

**PUT /teams/:team_id**
```json
Request:
{
  "name": "U12 Soccer Team - Updated",
  "version": 5  // For optimistic locking
}

Response:
{
  "id": 1,
  "name": "U12 Soccer Team - Updated",
  "version": 6,
  "updated_at": "2025-01-15T15:30:00Z"
}

// Conflict response (if version mismatch):
Status: 409 Conflict
{
  "error": "version_conflict",
  "message": "Team has been modified by another user",
  "current_version": 7,
  "your_version": 5
}
```

#### Workspaces

**POST /workspaces**
```json
Request:
{
  "name": "Coaching Staff 2025"
}

Response:
{
  "id": 10,
  "name": "Coaching Staff 2025",
  "owner_id": 123,
  "created_at": "2025-01-15T16:00:00Z"
}
```

**GET /workspaces/:workspace_id**
```json
Response:
{
  "id": 10,
  "name": "Coaching Staff 2025",
  "owner_id": 123,
  "members": [
    {
      "user_id": 123,
      "email": "head.coach@example.com",
      "display_name": "Head Coach",
      "role": "owner",
      "joined_at": "2025-01-15T16:00:00Z"
    },
    {
      "user_id": 124,
      "email": "assistant@example.com",
      "display_name": "Assistant Coach",
      "role": "editor",
      "joined_at": "2025-01-16T09:00:00Z"
    }
  ],
  "teams": [
    {
      "id": 2,
      "name": "Varsity Basketball",
      "sport": "basketball"
    }
  ]
}
```

**POST /workspaces/:workspace_id/invite**
```json
Request:
{
  "email": "newcoach@example.com",
  "role": "editor"
}

Response:
{
  "invitation_id": 50,
  "email": "newcoach@example.com",
  "token": "inv_abc123xyz789",
  "invite_link": "https://coachmate.app/invite/inv_abc123xyz789",
  "expires_at": "2025-01-22T16:00:00Z"
}
```

**POST /invitations/:token/accept**
```json
Request:
{
  "token": "inv_abc123xyz789"
}

Response:
{
  "workspace_id": 10,
  "workspace_name": "Coaching Staff 2025",
  "role": "editor"
}
```

#### Sync Events (Activity History)

**GET /teams/:team_id/events**
```json
Response:
{
  "events": [
    {
      "id": 1001,
      "user": {
        "id": 123,
        "display_name": "Head Coach"
      },
      "event_type": "player_add",
      "event_data": {
        "player_name": "John Smith",
        "position": "forward"
      },
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 1002,
      "user": {
        "id": 124,
        "display_name": "Assistant Coach"
      },
      "event_type": "config_change",
      "event_data": {
        "configuration_name": "4-3-3 Formation",
        "changes": "Updated player positions"
      },
      "created_at": "2025-01-15T11:30:00Z"
    }
  ]
}
```

---

## 🔄 Real-Time Sync Implementation

### WebSocket Architecture

#### Connection Flow
```
1. Client connects to WebSocket server
2. Client authenticates with JWT token
3. Client subscribes to team/workspace channels
4. Server pushes updates when data changes
5. Client applies updates optimistically
```

#### WebSocket Events

**Client → Server**

```javascript
// Subscribe to team updates
socket.emit('subscribe_team', { team_id: 1 });

// Unsubscribe from team
socket.emit('unsubscribe_team', { team_id: 1 });

// Send team update
socket.emit('team_update', {
  team_id: 1,
  version: 5,
  changes: {
    name: "Updated Team Name"
  }
});
```

**Server → Client**

```javascript
// Team updated by another user
socket.on('team_updated', (data) => {
  // data = {
  //   team_id: 1,
  //   version: 6,
  //   updated_by: { id: 124, display_name: "Assistant Coach" },
  //   changes: { name: "Updated Team Name" },
  //   timestamp: "2025-01-15T12:00:00Z"
  // }
});

// Player added
socket.on('player_added', (data) => {
  // data = {
  //   team_id: 1,
  //   player: { id: 105, name: "New Player", position: "midfielder" }
  // }
});

// Configuration changed
socket.on('configuration_changed', (data) => {
  // data = {
  //   team_id: 1,
  //   configuration_id: 2,
  //   player_positions: [...]
  // }
});
```

### Conflict Resolution Strategy

#### Version-Based Optimistic Locking

1. **Client makes change:**
   - Update local state immediately (optimistic update)
   - Send update to server with current version number

2. **Server validates:**
   - Check if version matches database version
   - If match: Apply change, increment version, broadcast to other clients
   - If mismatch: Return 409 Conflict with latest data

3. **Client handles conflict:**
   - Show notification: "Team was updated by [User Name]"
   - Offer options: "Keep your changes" or "Use latest version"
   - Merge changes if possible (e.g., different fields modified)

#### Example Conflict Resolution Flow

```typescript
// React Native Client Code
const updateTeamName = async (newName: string) => {
  const currentVersion = team.version;

  // Optimistic update
  setTeam(prev => ({ ...prev, name: newName }));

  try {
    const response = await fetch(`${API_URL}/teams/${team.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: newName,
        version: currentVersion
      })
    });

    if (response.status === 409) {
      // Conflict detected
      const conflict = await response.json();

      Alert.alert(
        'Team Updated',
        `This team was modified by another user. Current version: ${conflict.current_version}`,
        [
          {
            text: 'Use Latest',
            onPress: () => fetchLatestTeam()
          },
          {
            text: 'Keep Mine',
            onPress: () => forceUpdate(newName, conflict.current_version)
          }
        ]
      );
    } else {
      const updated = await response.json();
      setTeam(updated);
    }
  } catch (error) {
    // Revert optimistic update
    setTeam(prev => ({ ...prev, name: team.name }));
    Alert.alert('Error', 'Failed to update team');
  }
};
```

---

## 💻 Backend Implementation (Python + FastAPI)

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration
│   ├── database.py             # Database connection
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── workspace.py
│   │   ├── team.py
│   │   └── player.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── team.py
│   │   └── workspace.py
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── teams.py
│   │   ├── workspaces.py
│   │   └── sync.py
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── team_service.py
│   │   └── sync_service.py
│   ├── websocket/              # WebSocket handlers
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── handlers.py
│   └── utils/
│       ├── __init__.py
│       ├── jwt.py
│       └── permissions.py
├── alembic/                    # Database migrations
├── requirements.txt
└── .env
```

### Core Backend Code Examples

#### `app/config.py` - Configuration

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "coachmate"
    DB_PASSWORD: str
    DB_NAME: str = "coachmate"

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRATION_DAYS: int = 30

    # Magic Link
    MAGIC_LINK_EXPIRATION_MINUTES: int = 15

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    FROM_EMAIL: str = "noreply@coachmate.app"

    # App
    API_BASE_URL: str = "https://api.coachmate.app"
    FRONTEND_URL: str = "coachmate://auth"  # Deep link URL

    class Config:
        env_file = ".env"

settings = Settings()
```

#### `app/main.py` - FastAPI Application

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, teams, workspaces
from app.websocket.manager import websocket_endpoint
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CoachMate API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
app.include_router(teams.router, prefix="/v1/teams", tags=["teams"])
app.include_router(workspaces.router, prefix="/v1/workspaces", tags=["workspaces"])

# WebSocket endpoint
app.add_websocket_route("/ws", websocket_endpoint)

@app.get("/")
def read_root():
    return {"message": "CoachMate API v1.0.0"}
```

#### `app/database.py` - Database Connection

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

SQLALCHEMY_DATABASE_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### `app/models/user.py` - User Model

```python
from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base
import enum

class SubscriptionTier(str, enum.Enum):
    free = "free"
    premium_individual = "premium_individual"
    premium_team = "premium_team"

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    last_login_at = Column(TIMESTAMP, nullable=True)
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.free)
    subscription_expires_at = Column(TIMESTAMP, nullable=True)
```

#### `app/models/magic_link.py` - Magic Link Model

```python
from sqlalchemy import Column, BigInteger, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class MagicLink(Base):
    __tablename__ = "magic_links"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP, nullable=False, index=True)
    used_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
```

#### `app/models/team.py` - Team Model

```python
from sqlalchemy import Column, BigInteger, String, Integer, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class SportEnum(str, enum.Enum):
    soccer = "soccer"
    basketball = "basketball"
    hockey = "hockey"
    floorball = "floorball"
    bandy = "bandy"

class Team(Base):
    __tablename__ = "teams"

    id = Column(BigInteger, primary_key=True, index=True)
    workspace_id = Column(BigInteger, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    sport = Column(Enum(SportEnum), nullable=False)
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    last_edited_by = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, default=1)

    # Relationships
    workspace = relationship("Workspace", back_populates="teams")
    creator = relationship("User", foreign_keys=[created_by])
    last_editor = relationship("User", foreign_keys=[last_edited_by])
    configurations = relationship("Configuration", back_populates="team", cascade="all, delete-orphan")
    players = relationship("Player", back_populates="team", cascade="all, delete-orphan")
    sync_events = relationship("SyncEvent", back_populates="team", cascade="all, delete-orphan")
```

#### `app/api/auth.py` - Authentication Routes (Magic Link)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import SendMagicLinkRequest, VerifyMagicLinkRequest, AuthResponse
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/send-magic-link")
async def send_magic_link(
    request: SendMagicLinkRequest,
    db: Session = Depends(get_db)
):
    """Send a magic link to the user's email"""
    service = AuthService(db)

    try:
        expires_in = await service.send_magic_link(
            email=request.email,
            display_name=request.display_name
        )

        return {
            "message": f"Magic link sent to {request.email}",
            "expires_in": expires_in
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send magic link: {str(e)}"
        )

@router.post("/verify-magic-link", response_model=AuthResponse)
async def verify_magic_link(
    request: VerifyMagicLinkRequest,
    db: Session = Depends(get_db)
):
    """Verify magic link token and return JWT tokens"""
    service = AuthService(db)

    try:
        auth_data = await service.verify_magic_link(request.token)
        return auth_data
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "invalid_token",
                "message": str(e)
            }
        )

@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    service = AuthService(db)

    try:
        new_access_token = service.refresh_access_token(refresh_token)
        return {"access_token": new_access_token}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
```

#### `app/services/auth_service.py` - Authentication Service

```python
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.models.user import User
from app.models.magic_link import MagicLink
from app.utils.jwt import create_access_token, create_refresh_token, verify_token
from app.utils.email import send_magic_link_email
from app.config import settings
from datetime import datetime, timedelta
import secrets

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    async def send_magic_link(self, email: str, display_name: str = None) -> int:
        """Generate and send magic link to user's email"""
        # Check if user exists
        user = self.db.query(User).filter(User.email == email).first()

        # If user doesn't exist and display_name provided, create new user
        if not user and display_name:
            user = User(
                email=email,
                display_name=display_name
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        # Generate secure token
        token = f"ml_{secrets.token_urlsafe(32)}"

        # Calculate expiration
        expires_at = datetime.utcnow() + timedelta(
            minutes=settings.MAGIC_LINK_EXPIRATION_MINUTES
        )

        # Create magic link record
        magic_link = MagicLink(
            user_id=user.id if user else None,
            email=email,
            token=token,
            expires_at=expires_at
        )

        self.db.add(magic_link)
        self.db.commit()

        # Send email
        magic_link_url = f"{settings.FRONTEND_URL}?token={token}"
        await send_magic_link_email(email, magic_link_url)

        return settings.MAGIC_LINK_EXPIRATION_MINUTES * 60

    async def verify_magic_link(self, token: str) -> dict:
        """Verify magic link token and return user data with JWT tokens"""
        # Find magic link
        magic_link = self.db.query(MagicLink).filter(
            MagicLink.token == token
        ).first()

        if not magic_link:
            raise ValueError("Invalid magic link token")

        # Check if already used
        if magic_link.used_at:
            raise ValueError("Magic link has already been used")

        # Check if expired
        if datetime.utcnow() > magic_link.expires_at:
            raise ValueError("Magic link has expired")

        # Get or create user
        user = self.db.query(User).filter(User.email == magic_link.email).first()
        is_new_user = False

        if not user:
            # Create new user if doesn't exist
            user = User(email=magic_link.email)
            self.db.add(user)
            is_new_user = True

        # Update last login
        user.last_login_at = func.now()

        # Mark magic link as used
        magic_link.used_at = func.now()

        self.db.commit()
        self.db.refresh(user)

        # Generate JWT tokens
        access_token = create_access_token({"user_id": user.id, "email": user.email})
        refresh_token = create_refresh_token({"user_id": user.id})

        return {
            "user_id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "subscription_tier": user.subscription_tier.value,
            "is_new_user": is_new_user
        }

    def refresh_access_token(self, refresh_token: str) -> str:
        """Generate new access token from refresh token"""
        try:
            payload = verify_token(refresh_token)
            user_id = payload.get("user_id")

            if not user_id:
                raise ValueError("Invalid refresh token")

            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("User not found")

            # Generate new access token
            new_access_token = create_access_token({
                "user_id": user.id,
                "email": user.email
            })

            return new_access_token
        except Exception as e:
            raise ValueError(f"Invalid refresh token: {str(e)}")
```

#### `app/utils/email.py` - Email Sending Utility

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

async def send_magic_link_email(to_email: str, magic_link_url: str):
    """Send magic link email to user"""

    subject = "Your CoachMate Login Link"

    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{
                display: inline-block;
                padding: 12px 24px;
                background-color: #1976D2;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Welcome to CoachMate!</h2>
            <p>Click the button below to log in to your account:</p>
            <a href="{magic_link_url}" class="button">Log In to CoachMate</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1976D2;">{magic_link_url}</p>
            <p>This link will expire in {settings.MAGIC_LINK_EXPIRATION_MINUTES} minutes.</p>
            <div class="footer">
                <p>If you didn't request this login link, you can safely ignore this email.</p>
                <p>© 2025 CoachMate. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_body = f"""
    Welcome to CoachMate!

    Click this link to log in to your account:
    {magic_link_url}

    This link will expire in {settings.MAGIC_LINK_EXPIRATION_MINUTES} minutes.

    If you didn't request this login link, you can safely ignore this email.
    """

    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.FROM_EMAIL
    message["To"] = to_email

    # Attach both plain text and HTML versions
    part1 = MIMEText(text_body, "plain")
    part2 = MIMEText(html_body, "html")
    message.attach(part1)
    message.attach(part2)

    # Send email
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise
```

#### `app/api/teams.py` - Teams API Routes

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse
from app.utils.jwt import get_current_user
from app.services.team_service import TeamService
from app.websocket.manager import connection_manager

router = APIRouter()

@router.get("/", response_model=List[TeamResponse])
async def get_teams(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all teams for the current user (personal + shared)"""
    service = TeamService(db)
    teams = service.get_user_teams(current_user.id)
    return teams

@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new team"""
    service = TeamService(db)
    team = service.create_team(team_data, current_user.id)
    return team

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific team with all details"""
    service = TeamService(db)
    team = service.get_team_with_details(team_id, current_user.id)

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return team

@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a team with optimistic locking"""
    service = TeamService(db)

    try:
        team = service.update_team(team_id, team_data, current_user.id)

        # Broadcast update via WebSocket
        await connection_manager.broadcast_team_update(
            team_id=team_id,
            data={
                "team_id": team_id,
                "version": team.version,
                "updated_by": {
                    "id": current_user.id,
                    "display_name": current_user.display_name
                },
                "changes": team_data.dict(exclude_unset=True)
            }
        )

        return team
    except ValueError as e:
        if "version conflict" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "version_conflict",
                    "message": str(e),
                    "current_version": service.get_current_version(team_id)
                }
            )
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a team"""
    service = TeamService(db)
    service.delete_team(team_id, current_user.id)
    return None
```

#### `app/services/team_service.py` - Team Business Logic

```python
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.team import Team
from app.models.workspace import WorkspaceMember
from app.schemas.team import TeamCreate, TeamUpdate
from typing import List, Optional

class TeamService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_teams(self, user_id: int) -> List[Team]:
        """Get all teams accessible to the user (personal + shared)"""
        # Get teams created by user
        personal_teams = self.db.query(Team).filter(
            Team.created_by == user_id,
            Team.workspace_id.is_(None)
        ).all()

        # Get teams from workspaces user is a member of
        workspace_ids = self.db.query(WorkspaceMember.workspace_id).filter(
            WorkspaceMember.user_id == user_id
        ).all()
        workspace_ids = [w[0] for w in workspace_ids]

        shared_teams = self.db.query(Team).filter(
            Team.workspace_id.in_(workspace_ids)
        ).all() if workspace_ids else []

        return personal_teams + shared_teams

    def create_team(self, team_data: TeamCreate, user_id: int) -> Team:
        """Create a new team"""
        team = Team(
            name=team_data.name,
            sport=team_data.sport,
            workspace_id=team_data.workspace_id,
            created_by=user_id,
            last_edited_by=user_id,
            version=1
        )

        self.db.add(team)
        self.db.commit()
        self.db.refresh(team)

        return team

    def update_team(self, team_id: int, team_data: TeamUpdate, user_id: int) -> Team:
        """Update a team with optimistic locking"""
        team = self.db.query(Team).filter(Team.id == team_id).first()

        if not team:
            raise ValueError("Team not found")

        # Check version for optimistic locking
        if team_data.version and team.version != team_data.version:
            raise ValueError(
                f"Version conflict: expected {team_data.version}, "
                f"but current version is {team.version}"
            )

        # Check permissions
        if not self._user_can_edit(team, user_id):
            raise ValueError("User does not have permission to edit this team")

        # Update fields
        if team_data.name:
            team.name = team_data.name

        team.last_edited_by = user_id
        team.version += 1

        self.db.commit()
        self.db.refresh(team)

        return team

    def _user_can_edit(self, team: Team, user_id: int) -> bool:
        """Check if user has permission to edit the team"""
        # Owner can always edit
        if team.created_by == user_id:
            return True

        # Check workspace membership
        if team.workspace_id:
            member = self.db.query(WorkspaceMember).filter(
                WorkspaceMember.workspace_id == team.workspace_id,
                WorkspaceMember.user_id == user_id,
                WorkspaceMember.role.in_(["owner", "editor"])
            ).first()
            return member is not None

        return False
```

#### `app/websocket/manager.py` - WebSocket Manager

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        # Map of team_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Map of WebSocket -> user_id
        self.connection_users: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.connection_users[websocket] = user_id

    def disconnect(self, websocket: WebSocket):
        # Remove from all team subscriptions
        for team_id, connections in self.active_connections.items():
            if websocket in connections:
                connections.remove(websocket)

        # Remove user mapping
        if websocket in self.connection_users:
            del self.connection_users[websocket]

    def subscribe_to_team(self, websocket: WebSocket, team_id: int):
        if team_id not in self.active_connections:
            self.active_connections[team_id] = set()
        self.active_connections[team_id].add(websocket)

    def unsubscribe_from_team(self, websocket: WebSocket, team_id: int):
        if team_id in self.active_connections:
            self.active_connections[team_id].discard(websocket)

    async def broadcast_team_update(self, team_id: int, data: dict):
        """Broadcast update to all clients subscribed to a team"""
        if team_id not in self.active_connections:
            return

        message = json.dumps({
            "event": "team_updated",
            "data": data
        })

        disconnected = set()
        for connection in self.active_connections[team_id]:
            try:
                await connection.send_text(message)
            except:
                disconnected.add(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

connection_manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    # TODO: Authenticate user from query params or initial message
    user_id = 1  # Placeholder

    await connection_manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe_team":
                team_id = message["team_id"]
                connection_manager.subscribe_to_team(websocket, team_id)
                await websocket.send_text(json.dumps({
                    "event": "subscribed",
                    "team_id": team_id
                }))

            elif message["type"] == "unsubscribe_team":
                team_id = message["team_id"]
                connection_manager.unsubscribe_from_team(websocket, team_id)

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
```

#### `app/schemas/auth.py` - Pydantic Schemas for Auth

```python
from pydantic import BaseModel, EmailStr
from typing import Optional

class SendMagicLinkRequest(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None

class VerifyMagicLinkRequest(BaseModel):
    token: str

class AuthResponse(BaseModel):
    user_id: int
    email: str
    display_name: Optional[str]
    access_token: str
    refresh_token: str
    subscription_tier: str
    is_new_user: bool
```

#### `requirements.txt` - Python Dependencies

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pymysql==1.1.0
cryptography==42.0.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.6
pydantic==2.5.3
pydantic[email]==2.5.3
pydantic-settings==2.1.0
alembic==1.13.1
python-dotenv==1.0.0
websockets==12.0
```

---

## 📱 Frontend Implementation (React Native)

### API Service Layer

#### `services/api.ts` - API Client

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.coachmate.app/v1';

class ApiClient {
  private accessToken: string | null = null;

  async setAccessToken(token: string) {
    this.accessToken = token;
    await AsyncStorage.setItem('access_token', token);
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      this.accessToken = await AsyncStorage.getItem('access_token');
    }
    return this.accessToken;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshToken();
      // Retry request
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  async refreshToken() {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, user needs to login again
      await this.logout();
      throw new Error('Session expired');
    }

    const data = await response.json();
    await this.setAccessToken(data.access_token);
  }

  async logout() {
    this.accessToken = null;
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
  }

  // Auth endpoints
  async sendMagicLink(email: string, displayName?: string) {
    return this.request<{ message: string; expires_in: number }>(
      '/auth/send-magic-link',
      {
        method: 'POST',
        body: JSON.stringify({ email, display_name: displayName }),
      }
    );
  }

  async verifyMagicLink(token: string) {
    const data = await this.request<any>('/auth/verify-magic-link', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    await this.setAccessToken(data.access_token);
    await AsyncStorage.setItem('refresh_token', data.refresh_token);
    await AsyncStorage.setItem('user_id', data.user_id.toString());
    await AsyncStorage.setItem('user_email', data.email);

    return data;
  }

  // Team endpoints
  async getTeams() {
    return this.request<any[]>('/teams');
  }

  async getTeam(teamId: number) {
    return this.request<any>(`/teams/${teamId}`);
  }

  async createTeam(teamData: any) {
    return this.request<any>('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(teamId: number, teamData: any) {
    return this.request<any>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  // Workspace endpoints
  async createWorkspace(name: string) {
    return this.request<any>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async inviteToWorkspace(workspaceId: number, email: string, role: string) {
    return this.request<any>(`/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }
}

export const apiClient = new ApiClient();
```

#### `services/websocket.ts` - WebSocket Client

```typescript
import { apiClient } from './api';

type EventHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect() {
    const token = await apiClient.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    this.ws = new WebSocket(`wss://api.coachmate.app/ws?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  private handleMessage(message: any) {
    const { event, data } = message;
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  subscribeToTeam(teamId: number) {
    this.send('subscribe_team', { team_id: teamId });
  }

  unsubscribeFromTeam(teamId: number) {
    this.send('unsubscribe_team', { team_id: teamId });
  }
}

export const wsClient = new WebSocketClient();
```

#### `context/AuthContext.tsx` - Authentication Context (Magic Link)

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  sendMagicLink: (email: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface User {
  id: number;
  email: string;
  displayName?: string;
  subscriptionTier: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();

    // Listen for deep links (magic link callback)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userId = await AsyncStorage.getItem('user_id');
      const userEmail = await AsyncStorage.getItem('user_email');

      if (token && userId && userEmail) {
        setIsAuthenticated(true);
        setUser({
          id: parseInt(userId),
          email: userEmail,
          displayName: await AsyncStorage.getItem('user_display_name') || undefined,
          subscriptionTier: await AsyncStorage.getItem('subscription_tier') || 'free',
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepLink = async ({ url }: { url: string }) => {
    try {
      // Parse the URL to extract the token
      const { queryParams } = Linking.parse(url);
      const token = queryParams?.token as string;

      if (!token) {
        return;
      }

      setIsLoading(true);

      // Verify the magic link token
      const data = await apiClient.verifyMagicLink(token);

      // Update state
      setIsAuthenticated(true);
      setUser({
        id: data.user_id,
        email: data.email,
        displayName: data.display_name,
        subscriptionTier: data.subscription_tier,
      });

      // Store user data
      await AsyncStorage.setItem('user_display_name', data.display_name || '');
      await AsyncStorage.setItem('subscription_tier', data.subscription_tier);

      // Show welcome message for new users
      if (data.is_new_user) {
        Alert.alert(
          'Welcome to CoachMate!',
          'Your account has been created successfully.',
          [{ text: 'Get Started' }]
        );
      } else {
        Alert.alert(
          'Welcome Back!',
          'You have been logged in successfully.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'The login link is invalid or has expired. Please request a new one.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendMagicLink = async (email: string, displayName?: string) => {
    try {
      await apiClient.sendMagicLink(email, displayName);

      Alert.alert(
        'Check Your Email',
        `We've sent a login link to ${email}. Click the link in the email to log in.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to send login link. Please try again.',
        [{ text: 'OK' }]
      );
      throw error;
    }
  };

  const logout = async () => {
    await apiClient.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        sendMagicLink,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### `app/(auth)/login.tsx` - Login Screen

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { sendMagicLink } = useAuth();

  const handleSendMagicLink = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await sendMagicLink(email, displayName || undefined);
    } catch (error) {
      // Error already handled in sendMagicLink
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CoachMate</Text>
      <Text style={styles.subtitle}>
        Enter your email to receive a login link
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Your name (optional)"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSendMagicLink}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Login Link</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        We'll send you a secure login link. No password needed!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
```

#### `context/SyncContext.tsx` - Sync Context with WebSocket

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { wsClient } from '@/services/websocket';
import { apiClient } from '@/services/api';
import { Team } from '@/types/models';
import { Alert } from 'react-native';

interface SyncContextType {
  isConnected: boolean;
  syncTeam: (team: Team) => Promise<void>;
  subscribeToTeam: (teamId: number) => void;
  unsubscribeFromTeam: (teamId: number) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    const connect = async () => {
      try {
        await wsClient.connect();
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connect();

    // Listen for team updates
    wsClient.on('team_updated', handleTeamUpdate);
    wsClient.on('player_added', handlePlayerAdded);
    wsClient.on('configuration_changed', handleConfigurationChanged);

    return () => {
      wsClient.off('team_updated', handleTeamUpdate);
      wsClient.off('player_added', handlePlayerAdded);
      wsClient.off('configuration_changed', handleConfigurationChanged);
      wsClient.disconnect();
    };
  }, []);

  const handleTeamUpdate = (data: any) => {
    // Update local state with remote changes
    console.log('Team updated:', data);

    // Show notification to user
    Alert.alert(
      'Team Updated',
      `${data.updated_by.display_name} updated the team`,
      [{ text: 'OK' }]
    );

    // TODO: Update TeamContext with new data
  };

  const handlePlayerAdded = (data: any) => {
    console.log('Player added:', data);
    // TODO: Update TeamContext
  };

  const handleConfigurationChanged = (data: any) => {
    console.log('Configuration changed:', data);
    // TODO: Update TeamContext
  };

  const syncTeam = async (team: Team) => {
    try {
      await apiClient.updateTeam(parseInt(team.id), {
        name: team.name,
        version: team.version || 1,
      });
    } catch (error: any) {
      if (error.message.includes('version_conflict')) {
        Alert.alert(
          'Sync Conflict',
          'This team was updated by another user. Please refresh.',
          [{ text: 'OK' }]
        );
      } else {
        throw error;
      }
    }
  };

  const subscribeToTeam = (teamId: number) => {
    wsClient.subscribeToTeam(teamId);
  };

  const unsubscribeFromTeam = (teamId: number) => {
    wsClient.unsubscribeFromTeam(teamId);
  };

  return (
    <SyncContext.Provider
      value={{
        isConnected,
        syncTeam,
        subscribeToTeam,
        unsubscribeFromTeam,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
};
```

---

## 🚀 Deployment & Infrastructure

### Backend Deployment

#### Option 1: Docker + VPS (DigitalOcean, Linode, etc.)

**Dockerfile**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=coachmate
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=coachmate
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mariadb:10.6
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=coachmate
      - MYSQL_USER=coachmate
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  db_data:
```

#### Option 2: Managed Services

- **Backend:** Railway, Render, or Fly.io
- **Database:** PlanetScale (MySQL-compatible), AWS RDS, or DigitalOcean Managed Database
- **WebSocket:** Separate service on Railway or use Socket.IO with Redis adapter

### Database Migrations

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

### Environment Variables

**.env**
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=coachmate
DB_PASSWORD=your_secure_password
DB_NAME=coachmate

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
REFRESH_TOKEN_EXPIRATION_DAYS=30

# Magic Link
MAGIC_LINK_EXPIRATION_MINUTES=15

# App
API_BASE_URL=https://api.coachmate.app
FRONTEND_URL=coachmate://auth  # Deep link URL for mobile app

# Email (for magic links and invitations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@coachmate.app
SMTP_PASSWORD=your_smtp_password
FROM_EMAIL=noreply@coachmate.app
```

### Deep Link Configuration

#### iOS Configuration (`app.json`)

```json
{
  "expo": {
    "scheme": "coachmate",
    "ios": {
      "bundleIdentifier": "com.lindehammar-konsult.coachmate",
      "associatedDomains": [
        "applinks:coachmate.app"
      ]
    }
  }
}
```

#### Android Configuration (`app.json`)

```json
{
  "expo": {
    "android": {
      "package": "com.lindehammarkonsult.coachmate",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "coachmate.app",
              "pathPrefix": "/auth"
            },
            {
              "scheme": "coachmate"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    }
  }
}
```

#### Universal Links (iOS) - `.well-known/apple-app-site-association`

Host this file at `https://coachmate.app/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.lindehammar-konsult.coachmate",
        "paths": ["/auth/*"]
      }
    ]
  }
}
```

#### App Links (Android) - `.well-known/assetlinks.json`

Host this file at `https://coachmate.app/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.lindehammarkonsult.coachmate",
      "sha256_cert_fingerprints": [
        "YOUR_APP_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

---

## � Passwordless Authentication Flow

### Magic Link Flow Diagram

```
┌─────────────┐                 ┌──────────────┐                 ┌─────────────┐
│             │  1. Enter Email │              │  2. Generate    │             │
│  React      │────────────────>│   Python     │────────────────>│   MariaDB   │
│  Native     │                 │   Backend    │     Token       │             │
│  App        │                 │              │                 │             │
│             │                 │              │  3. Send Email  │             │
│             │                 │              │────────────────>│   SMTP      │
│             │                 │              │                 │   Server    │
│             │                 │              │                 │             │
│             │  4. Click Link  │              │                 │             │
│             │<────────────────│   Email      │                 │             │
│             │                 │              │                 │             │
│             │  5. Deep Link   │              │                 │             │
│             │    Opens App    │              │                 │             │
│             │                 │              │                 │             │
│             │  6. Verify Token│              │  7. Validate    │             │
│             │────────────────>│              │────────────────>│             │
│             │                 │              │                 │             │
│             │  8. JWT Tokens  │              │                 │             │
│             │<────────────────│              │                 │             │
│             │                 │              │                 │             │
│  Logged In  │                 │              │                 │             │
└─────────────┘                 └──────────────┘                 └─────────────┘
```

### Step-by-Step Flow

1. **User enters email** in the app (optionally with display name for new users)
2. **Backend generates token:**
   - Creates secure random token (e.g., `ml_abc123xyz789`)
   - Stores in `magic_links` table with expiration (15 minutes)
   - Associates with user if exists, or stores email for new user
3. **Backend sends email** with magic link:
   - Link format: `coachmate://auth?token=ml_abc123xyz789`
   - Or universal link: `https://coachmate.app/auth?token=ml_abc123xyz789`
4. **User clicks link** in email
5. **App opens via deep link:**
   - iOS: Universal Links or custom scheme
   - Android: App Links or custom scheme
6. **App extracts token** from URL and sends to backend
7. **Backend validates token:**
   - Checks if token exists and not expired
   - Checks if not already used
   - Creates user if doesn't exist
   - Marks token as used
8. **Backend returns JWT tokens:**
   - Access token (short-lived, 1 hour)
   - Refresh token (long-lived, 30 days)
9. **App stores tokens** and user is logged in

### Security Considerations

- **Token expiration:** Magic links expire after 15 minutes
- **Single use:** Tokens can only be used once
- **Secure generation:** Uses `secrets.token_urlsafe()` for cryptographically secure tokens
- **HTTPS only:** All API communication over HTTPS
- **JWT tokens:** Access tokens expire after 1 hour, refresh tokens after 30 days
- **Email verification:** Proves user owns the email address

### Benefits of Passwordless Auth

✅ **Better UX:** No password to remember or type on mobile
✅ **More secure:** No password to be stolen or leaked
✅ **Faster signup:** New users can sign up with just email
✅ **Mobile-friendly:** No typing complex passwords on small keyboards
✅ **Reduces support:** No "forgot password" requests
✅ **Higher conversion:** Fewer friction points in signup flow

---

## �📊 Success Metrics & KPIs

### Phase 1 Metrics (Individual Premium)
- **Conversion Rate:** 3-5% free → premium
- **Churn Rate:** <5% monthly
- **MRR Growth:** 20% month-over-month
- **Feature Usage:** Track PDF exports, cloud sync usage

### Phase 3 Metrics (Team Collaboration)
- **Viral Coefficient:** Average invitations per workspace
- **Team Tier Conversion:** % of individual users upgrading to team
- **Collaboration Activity:** Daily active collaborators
- **Workspace Size:** Average members per workspace

### Technical Metrics
- **API Response Time:** <200ms p95
- **WebSocket Latency:** <100ms
- **Sync Success Rate:** >99%
- **Database Query Performance:** <50ms p95

---

## 🎯 Next Steps

### Immediate Actions (Week 1-2)
1. ✅ Set up Python backend project structure
2. ✅ Create MariaDB database and initial schema
3. ✅ Implement authentication endpoints
4. ✅ Set up development environment with Docker

### Phase 1 Development (Week 3-8)
1. ✅ Implement core API endpoints (teams, players, configurations)
2. ✅ Build cloud sync for individual users
3. ✅ Integrate API client in React Native app
4. ✅ Implement JWT authentication in app
5. ✅ Add in-app purchase system
6. ✅ Deploy to staging environment

### Phase 3 Development (Month 6-9)
1. ✅ Implement workspace and invitation system
2. ✅ Build WebSocket infrastructure
3. ✅ Add real-time sync to React Native app
4. ✅ Implement conflict resolution UI
5. ✅ Beta test with coaching staffs
6. ✅ Launch Premium Team tier

---

## 📚 Additional Resources

### Python/FastAPI
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Alembic Migrations](https://alembic.sqlalchemy.org/)

### React Native
- [Expo Documentation](https://docs.expo.dev/)
- [React Native WebSocket](https://reactnative.dev/docs/network#websocket-support)

### Database
- [MariaDB Documentation](https://mariadb.com/kb/en/)
- [Database Design Best Practices](https://www.sqlshack.com/database-design-best-practices/)

### Deployment
- [Docker Documentation](https://docs.docker.com/)
- [Railway Deployment Guide](https://docs.railway.app/)

---

## 💡 Key Takeaways

1. **Two-tier pricing** maximizes revenue while keeping entry point affordable
2. **Team collaboration** is a killer feature that justifies premium pricing
3. **Passwordless authentication** improves UX and security with magic links
4. **Python + FastAPI + MariaDB** provides a robust, scalable backend
5. **WebSocket real-time sync** enables seamless collaboration
6. **Version-based conflict resolution** prevents data loss
7. **Deep linking** enables seamless magic link authentication on mobile
8. **Phased rollout** reduces risk and validates market demand

**The team collaboration feature could be your biggest differentiator and revenue driver!**

---

*Document Version: 1.0*
*Last Updated: 2025-01-15*
*Author: CoachMate Development Team*

