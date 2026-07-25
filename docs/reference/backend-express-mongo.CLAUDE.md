# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready, modular Node.js Express IT infrastructure management application built on a "plug-and-play" boilerplate architecture. The system automatically discovers and integrates routes, cron jobs, and API documentation with zero manual configuration.

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### Modular Structure

The application uses a **feature-based modular architecture** where each module is self-contained under `src/modules/`. Modules are automatically discovered and integrated by the core system.

**Module Structure:**
```
src/modules/[module-name]/
├── [name].model.js      # Mongoose schema
├── [name].service.js    # Business logic
├── [name].controller.js # Request handlers
├── [name].routes.js     # Routes (auto-loaded at /api/[module-name])
├── [name].swagger.js    # API documentation (auto-loaded)
└── [name].jobs.js       # Cron jobs (optional, auto-loaded)
```

### Key Directories

- **`src/config.js`**: Centralized configuration - THE ONLY place `process.env` should be accessed
- **`src/core/`**: Core infrastructure (database, cache, services, dynamic loaders)
  - `router.js`: Automatically discovers and mounts `*.routes.js` files
  - `swagger.js`: Automatically generates API docs from `*.swagger.js` files
  - `app.js`: Express app setup and middleware
  - `mongo.js`, `redis.js`, `rabbitmq.js`, etc.: Core services (class-based singletons)
- **`src/middleware/`**: Shared middleware (auth, validation, upload)
- **`src/modules/`**: All application features
- **`src/utils/`**: Shared utilities

### Core Services

All core services (Mongo, Redis, RabbitMQ, Socket.IO, Cron, Sentry) are:
- Class-based singleton instances
- Opt-in via environment variables (`ENABLE_*`)
- Provide `init()`, `close()`, `isHealthy()`, and `getStats()` methods
- Services are disabled by default if `ENABLE_*` is not set to 'true'

## Critical Rules

### Configuration Management

**NEVER use `process.env` anywhere except `src/config.js`**

```javascript
// CORRECT
const config = require('../../config');
const port = config.port;

// WRONG - NEVER DO THIS
const port = process.env.PORT;
```

### Adding New Features

To add a new module (e.g., "products"):

1. Create folder: `src/modules/products/`
2. Add files: `products.model.js`, `products.service.js`, `products.controller.js`
3. Add routes: `products.routes.js` (automatically mounted at `/api/products`)
4. Add docs: `products.swagger.js` (automatically included in `/api-docs`)
5. (Optional) Add jobs: `products.jobs.js` with an `initialize()` export

**No manual registration required** - the system discovers everything automatically.

### Logging

Use Winston module-specific loggers, never `console.log`:

```javascript
const { getLogger } = require('../../core/logger');
const logger = getLogger('module.service');

logger.info('User logged in successfully');
logger.error('Token validation failed', { error: err.message });
```

HTTP requests are automatically logged via Morgan.

### Database Models

Avoid duplicate indexes in Mongoose schemas:

```javascript
// CORRECT - Use only manual index
email: {
    type: String,
    required: true
}
schema.index({ email: 1 }, { unique: true });

// WRONG - Duplicate index definition
email: {
    type: String,
    unique: true  // Don't do this if you also have schema.index()
}
```

### API Documentation

- Define module API docs in `[module].swagger.js` using JSDoc/OpenAPI 3.0 format
- Never put documentation in route files
- Access interactive docs at `/api-docs` (development mode only)

### Route Files

Routes automatically mount under `/api/[module-name]`:

```javascript
// src/modules/products/products.routes.js
const express = require('express');
const router = express.Router();

// This becomes /api/products/
router.get('/', controller.getAll);

module.exports = router;
```

### Authentication

- JWT access tokens (default: 15m, configurable)
- JWT refresh tokens (default: 7d, configurable)
- bcrypt password hashing
- Role-based authorization (user, admin)
- Auth middleware: `authenticateToken` from `src/middleware/auth.middleware.js`

### Security

- Helmet for HTTP headers
- CORS configured via `config.cors.allowedOrigins`
- Rate limiting (configurable via `config.rateLimit`)
- Input validation using express-validator
- Secure error handling (no stack traces in production)

## Application-Specific

### IT Infrastructure Management Features

This is an IT infrastructure management system with modules for:
- **firma**: Company management
- **organizasyon**: Organization management
- **proje**: Project management (with domain, server, password associations)
- **domain**: Domain name management (tracking, expiry alerts)
- **sunucu**: Server management (hosting, costs, expiry)
- **sifre**: Password/credential management (encrypted storage)
- **user**: User authentication and management

### Data Model Relationships

```
Firma (Company)
└── Organizasyon (Organization)
    └── Proje (Project)
        ├── Domain[] (Domains)
        ├── Sunucu[] (Servers)
        └── Sifre[] (Passwords)
```

### Module Schemas

**Proje (Project):**
- firma_id, organizasyon_id (required)
- ad, aciklama, durum (aktif/pasif/arsiv)
- domainler[], sunucular[], sifreler[] (ObjectId references)
- ekstra_alanlar[] (key-value pairs)

**Domain:**
- firma_id, organizasyon_id, proje_id
- domain_adi, kayit_firmasi
- bitis_tarihi, otomatik_yenileme
- ucret, para_birimi (TRY/USD/EUR)

**Sunucu (Server):**
- firma_id, organizasyon_id, proje_id
- ad, saglayici, ip_adresi, lokasyon
- ucret, para_birimi, fatura_periyodu (aylik/yillik)
- bitis_tarihi

**Sifre (Password):**
- firma_id, organizasyon_id, proje_id
- baslik, tur (ftp/db/admin/api/ozel)
- kullanici_adi, sifre (encrypted), host, port
- ek_bilgiler[] (key-value pairs)

### Password Encryption

Passwords are encrypted using AES-256-CBC with JWT_SECRET derived key:
- Auto-encrypted on save via Mongoose pre-save hook
- `/api/sifre/:id` returns data without password
- `/api/sifre/:id/reveal` returns decrypted password (logged)

### Expiry Tracking

Domain and Server modules have `/expiring` endpoints:
- `GET /api/domain/expiring?gun=30` - Domains expiring in 30 days
- `GET /api/sunucu/expiring?gun=30` - Servers expiring in 30 days

### Configuration

- `config.adminKey`: Admin authentication key
- `config.telegram.botToken`: Telegram bot integration (optional)

### First Setup

On first run, `firstSetup()` automatically creates default company and user if none exist.

## Environment Variables

Key variables (from `.env.example`):

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/dashboard_db
JWT_SECRET=<required>
JWT_REFRESH_SECRET=<required>

# Service toggles (default: false unless set to 'true')
ENABLE_SENTRY=true
ENABLE_REDIS=true
ENABLE_RABBITMQ=true
ENABLE_SOCKET_IO=true
ENABLE_CRON_JOBS=true
```

## Code Style

- Use Turkish comments and messages (as project is Turkish-language)
- All requires must be at the top of files
- Use async/await (not Promise.then)
- Use consistent error handling with try-catch
- Follow existing patterns in the codebase
