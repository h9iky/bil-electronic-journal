-- Пароли: scrypt-хеш у пользователя. NULL — демо-аккаунты сида
-- (они входят кнопкой «Демо-вход», пароль им не нужен).
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
