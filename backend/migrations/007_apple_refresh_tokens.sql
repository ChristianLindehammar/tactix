-- Apple's refresh token from the latest Apple sign-in, encrypted, so deleting the account can revoke it
ALTER TABLE user_identities
  ADD COLUMN refresh_token TEXT NULL
