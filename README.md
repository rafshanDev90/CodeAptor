<div align="center">
  <img src="https://img.icons8.com/nolan/128/server.png" alt="Codeaptor Logo" width="80" height="80" />
  <h1>🚀 Codeaptor API &amp; Bot Infrastructure</h1>
  <p><strong>A high-performance Managed DevOps &amp; Hosting Automation platform.</strong></p>

  <p>
    <a href="https://github.com/rafshanDev90/CodeAptor"><img src="https://img.shields.io/github/stars/rafshanDev90/CodeAptor?style=for-the-badge&color=blue" alt="Stars" /></a>
    <a href="https://github.com/rafshanDev90/CodeAptor/blob/main/LICENSE"><img src="https://img.shields.io/github/license/rafshanDev90/CodeAptor?style=for-the-badge&color=green" alt="License" /></a>
    <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=for-the-badge&logo=node.js" alt="Node Version" />
    <img src="https://img.shields.io/badge/supabase-database-blueviolet?style=for-the-badge&logo=supabase" alt="Supabase Backend" />
  </p>
</div>

<hr />

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Technical Codebase Audit](#-technical-codebase-audit)
3. [Architecture & Folder Structure](#-architecture--folder-structure)
4. [Database Schema Bootstrap](#-database-schema-bootstrap)
5. [Environment Configuration](#-environment-configuration)
6. [API Route Documentation](#-api-route-documentation)
7. [Telegram Bot & Scenes Flow](#-telegram-bot--scenes-flow)
8. [Local Development & Deployment](#-local-development--deployment)

---

## 🔍 Project Overview

**Codeaptor** is a managed hosting infrastructure platform designed to bridge bare VPS hardware with containerized isolation. It exposes a **Node.js Express REST API** alongside a **Telegraf-driven Telegram Bot** to capture and manage infrastructure audit requests (leads) from users.

### Key Features
* 🌐 **REST API:** Fully structured user management endpoints and system health checks.
* 🤖 **Telegram Bot Wizard:** High-touch interface utilizing `Telegraf.Scenes` to guide users through site audit requests.
* ⚡ **Secure Webhook Routing:** Express integration enabling automated SSL-bound Webhook setup for Telegram or fallback long-polling.
* 🔒 **Supabase Integration:** Real-time data persistency for leads and users using `@supabase/supabase-js`.
* 📦 **Production Ready:** Pre-configured PM2 clustering, Docker multi-stage environment support, and standard SSL/HTTPS loading.

---

## 🛠️ Technical Codebase Audit

During our codebase review, the following architectural details, patterns, and optimization areas were identified:

### 1. Database & Schema Alignment
* **Database Driver:** Although `pg` (Postgres) and `mongoose` (MongoDB) are installed as dependencies, the application currently communicates **exclusively** with **Supabase REST/PostgreSQL** using `@supabase/supabase-js`.
* **Database Scripts:** Two SQL files exist under `/server/sql` to initialize `users` and `leads` tables. These contain appropriate indexes (e.g. `idx_users_email`, `idx_leads_status`) and PostgreSQL triggers to manage the `updated_at` columns automatically.

### 2. Telegram Webhook & SSL Fallbacks
* **Security Routing:** The Webhook route is dynamically structured based on the bot token (`/engine-gateway-${process.env.BOT_TOKEN.slice(0, 12)}`) to prevent malicious webhook spoofing.
* **Fallback Strategy:** The boot sequence in `server.js` contains robust fallback logic:
  ```
  SSL Certificates Present -> Boots HTTPS Server
  SSL Certificates Missing -> Boots HTTP Server
  
  VPS_IP Environment Set   -> Registers Webhook & Uploads Certificate
  VPS_IP Environment Empty -> Falls back to Long-polling
  ```

### 3. Log Infrastructure Audit
* **Winston Logger:** The project contains a configured logger under `src/middlewares/logger.js` mapping console outputs and error files to `./logs/`.
* **Recommendation:** The logger is currently isolated and not imported inside the HTTP server or controller exception catch blocks (which fallback to standard `console.log` / `console.error`). Integrating this across controllers will unify log tracing.

### 4. Error Handler Mechanics
* The API utilizes a structured `globalErrorHandler` mapping standard PostgreSQL/Supabase errors (like unique constraints `23505`, reference errors `23503`) to user-friendly JSON responses with the correct HTTP status codes.

---

## 📂 Architecture & Folder Structure

```ansi
server/
├── 📁 sql/                     # DB Migration SQL files
│   ├── 001_create_users.sql    # Users schema
│   └── 002_create_leads.sql    # Leads schema for Bot
├── 📁 ssl/                     # TLS/SSL certificate directory
├── 📁 src/
│   ├── 📁 config/              # App & Database Clients
│   │   ├── database.js         # Supabase connection client
│   │   └── telegram.js         # Telegraf bot configuration
│   ├── 📁 controllers/         # Request handlers
│   │   ├── bot.controller.js   # Bot command registers
│   │   ├── error.controller.js # Global error formatter
│   │   └── user.controller.js  # REST API user controller
│   ├── 📁 middlewares/         # Middleware wrappers
│   │   └── logger.js           # Winston logger (Configured)
│   ├── 📁 models/              # Models interfacing Supabase
│   │   └── User.js             # Supabase user database operations
│   ├── 📁 routes/              # Express API routers
│   │   ├── index.js            # Base root router
│   │   └── user.routes.js      # User management routes
│   ├── 📁 scenes/              # Telegraf Wizard state machines
│   │   ├── index.js            # Wizard Scene stage
│   │   └── audit.scene.js      # Site performance audit scene
│   ├── 📁 services/            # Database query services
│   │   ├── db.service.js       # Lead capture DB operations
│   │   └── user.service.js     # User business & crypt service
│   └── 📁 utils/               # App helper utilities
│       ├── AppError.js         # Custom system error wrapper
│       └── catchAsync.js       # Asynchronous error handler
├── 📄 .env                     # Local secrets configuration
├── 📄 app.js                   # Express application bootstrap
├── 📄 server.js                # Core network listener setup
├── 📄 Dockerfile               # Node-alpine docker environment
└── 📄 ecosystem.config.cjs     # PM2 cluster configuration
```

---

## 🗄️ Database Schema Bootstrap

To initialize the Supabase database schema, execute the following SQL scripts in the **Supabase SQL Editor**:

### Users Table (`001_create_users.sql`)
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Leads Table (`002_create_leads.sql`)
```sql
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  issue TEXT NOT NULL,
  contact TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'audit',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🔒 Environment Configuration

Create a `.env` file inside the `server/` directory:

```properties
# Supabase Configuration
SUPABASE_PUBLIC_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-service-role-key

# Telegram Configuration
BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# Server Settings
PORT=8443
NODE_ENV=development

# Webhook (VPS Setup only)
VPS_IP=your_vps_public_ip_here
```

---

## 🔌 API Route Documentation

All REST routes are prefixed with `/api/v1`.

### 🩺 System Health
* **`GET /health`**
  * **Description:** Check API service status and database connectivity.
  * **Success Response:** `200 OK`
    ```json
    {
      "status": "success",
      "message": "Codeaptor API is operational",
      "timestamp": "2026-05-24T11:00:00.000Z"
    }
    ```

### 👤 User Management
* **`POST /users`**
  * **Description:** Register a new platform administrator or user.
  * **Body Parameters:**
    ```json
    {
      "name": "Alex Mercer",
      "email": "alex@codeaptor.com",
      "password": "SecurePassword123",
      "role": "admin"
    }
    ```
* **`GET /users`**
  * **Description:** Paginated user retrieval.
  * **Query Params:** `?page=1&limit=20`
* **`GET /users/:id`**
  * **Description:** Fetch user details by UUID.
* **`PATCH /users/:id`**
  * **Description:** Update user fields (supports `name`, `email`, `role`, `password`).
* **`DELETE /users/:id`**
  * **Description:** Hard delete a user account.

---

## 🤖 Telegram Bot & Scenes Flow

The bot features a structured workflow logic using Telegraf Wizards to log lead information directly into the Database.

```mermaid
graph TD
    Start[/start] --> Welcome[Display Welcome Banner & Choices]
    Welcome -->|⚠️ Website Slow| Scene[Enter HOSTING_AUDIT_SCENE]
    Welcome -->|🚀 Deploy| DeploySoon[Display "Coming Soon" Alert]
    Welcome -->|📊 Speak Engineer| ContactEng[Display Engineering Username]
    
    Scene --> Q1[Query: Website URL & Performance Crash details]
    Q1 --> Q2[Query: Contact Email or Phone Number]
    Q2 --> Save[Save Lead to Supabase with Status: 'new']
    Save --> Success[Display Successful Registration Alert]
```

---

## 🚀 Local Development & Deployment

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Run Local Development (Long-polling mode)
Ensure `VPS_IP` is unset or blank in your `.env` to bypass webhook routing:
```bash
npm run dev
```

### 3. Running with PM2 (Cluster Mode)
PM2 will load the application with cluster scaling:
```bash
# Start Cluster
npm run pm2:start

# Stop Cluster
npm run pm2:stop

# Restart Cluster
npm run pm2:restart
```

### 4. Running with Docker
Build and execute isolated container instances:
```bash
# Build Image
npm run docker:build

# Run Container
npm run docker:run
```
