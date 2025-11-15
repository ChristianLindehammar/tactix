# Magic Link Authentication Implementation Guide

## Overview

CoachMate uses **passwordless authentication** via magic links for a better user experience and enhanced security. Users simply enter their email address and receive a login link - no password required!

## How It Works

### User Flow

1. User opens the app and enters their email address
2. User receives an email with a login link
3. User clicks the link (opens the app automatically)
4. User is logged in immediately

### Technical Flow

```
User → Enter Email → Backend → Generate Token → Send Email
                                      ↓
User ← Logged In ← JWT Tokens ← Verify Token ← Click Link
```

## Database Schema

### `users` Table
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    subscription_tier ENUM('free', 'premium_individual', 'premium_team') DEFAULT 'free'
);
```

### `magic_links` Table
```sql
CREATE TABLE magic_links (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_email (email)
);
```

## API Endpoints

### Send Magic Link
```
POST /v1/auth/send-magic-link
Content-Type: application/json

{
  "email": "coach@example.com",
  "display_name": "John Coach"  // Optional, for new users
}

Response:
{
  "message": "Magic link sent to coach@example.com",
  "expires_in": 900  // 15 minutes
}
```

### Verify Magic Link
```
POST /v1/auth/verify-magic-link
Content-Type: application/json

{
  "token": "ml_abc123xyz789"
}

Response:
{
  "user_id": 123,
  "email": "coach@example.com",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "subscription_tier": "free",
  "is_new_user": false
}
```

## Deep Link Configuration

### iOS (app.json)
```json
{
  "expo": {
    "scheme": "coachmate",
    "ios": {
      "associatedDomains": ["applinks:coachmate.app"]
    }
  }
}
```

### Android (app.json)
```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            { "scheme": "coachmate" },
            { "scheme": "https", "host": "coachmate.app" }
          ]
        }
      ]
    }
  }
}
```

## Security Features

✅ **15-minute expiration** - Links expire quickly  
✅ **Single-use tokens** - Each token can only be used once  
✅ **Cryptographically secure** - Uses `secrets.token_urlsafe()`  
✅ **Email verification** - Proves user owns the email  
✅ **JWT tokens** - Short-lived access tokens (1 hour)  
✅ **Refresh tokens** - Long-lived refresh tokens (30 days)

## Benefits

### For Users
- No password to remember
- Faster login on mobile
- More secure (no password to steal)
- Works across devices

### For Developers
- No password reset flow needed
- Fewer support tickets
- Better conversion rates
- Simpler authentication logic

## Email Template

The magic link email includes:
- Clear call-to-action button
- Plain text link as fallback
- Expiration notice (15 minutes)
- Professional branding
- Security notice

## Testing

### Local Development
```bash
# Use a service like Mailtrap for testing emails
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_password
```

### Production
```bash
# Use a reliable email service
SMTP_HOST=smtp.sendgrid.net  # or smtp.gmail.com, etc.
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
```

## Troubleshooting

### Link doesn't open app
- Check deep link configuration in app.json
- Verify URL scheme matches
- Test with `npx uri-scheme open coachmate://auth?token=test --ios`

### Email not received
- Check spam folder
- Verify SMTP credentials
- Check email service logs
- Test with a different email provider

### Token expired
- Default expiration is 15 minutes
- User needs to request a new link
- Consider increasing expiration for testing

---

*For complete implementation details, see [MONETIZATION_ROADMAP.md](./MONETIZATION_ROADMAP.md)*

