# SarkariLinks

React + TypeScript public portal and Laravel 13 API, based on `SarkariLinks_Technical_SRS_React_Laravel_Docker.docx`.

**Status: public portal plus tested staff login, role/permission management, core CMS and publishing workflow. The full SRS and production acceptance remain incomplete.** Start with the [staff console walkthrough](docs/staff-console.md).

## Run on this workstation

```powershell
npm run dev
```

Open **http://127.0.0.1:5173** or **http://127.0.0.1:5173/admin**. The command starts the frontend, Laravel and scheduler using the isolated PHP 8.4 runtime already installed in `.cache/php84`. Local account credentials are in `backend/storage/app/private/local-accounts.json`. The working SQLite database has been migrated and seeded with roles. See the walkthrough for creating and publishing your first notice.

## Requirements

- Node.js 24 for frontend development.
- PHP 8.4 and Composer 2.9 for backend development/tests, or Docker Desktop with Linux containers and Compose v2.
- MySQL 8.4 and Redis 7.4 in the container environment.

The detected XAMPP PHP 8.2 cannot run Laravel 13. An isolated PHP 8.4.25 runtime has now been installed in this project's ignored cache. XAMPP was kept intact. Docker is not available on PATH.

## Frontend development

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. `/api` proxies to Laravel on `127.0.0.1:8000`. Start Laravel using the steps below. When the API is unavailable the UI shows a retry state; it never substitutes fabricated government notices.

## Backend development with PHP 8.4

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
New-Item database/database.sqlite -ItemType File -ErrorAction SilentlyContinue
php artisan migrate
php artisan serve
```

The Laravel example environment uses SQLite for a lightweight local start. Docker uses MySQL. Run `php artisan db:seed` for role/permission defaults, then `php artisan portal:create-staff EMAIL --role=administrator` to provision a staff account. Public listings begin empty; publish through the staff console.

## Docker local stack

Copy root `.env.example` to `.env`. Generate three independent random values locally: a base64-encoded 32-byte `APP_KEY` prefixed with `base64:`, plus strong `DB_PASSWORD` and `DB_ROOT_PASSWORD` values. Never commit them. A PHP 8.4 installation can generate a key with `php artisan key:generate --show` in `backend`; alternatively use `docker run --rm php:8.4-cli php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'` from a shell that preserves the PHP quotes.

```powershell
docker compose build
docker compose up -d mysql redis
docker compose run --rm php-fpm php artisan migrate --force
docker compose up -d
```

Open http://localhost:8080. Database and Redis ports are private. Migrations are explicit and never run automatically during web startup. Stop with `docker compose down`; database volumes persist. Do not use `down -v` unless intentionally deleting local data.

## Checks

```powershell
npm --prefix frontend run build
cd backend
composer validate --strict
php artisan test
vendor/bin/pint --test
```

Feature tests cover publication visibility, ownership, authentication, CSRF, granular permissions, role assignment/editing, workflow transitions, scheduling, audit immutability, filters and metadata. Browser tests cover login → author draft → reviewer publish → public detail, permission visibility and desktop/mobile overflow. Run `npm run test:browser` from the project root with Chrome installed.

## Structure

- `frontend/src/app`: public routes and UI; `src/api`: typed API boundary.
- `backend/app/Domain/Content`: content model and statuses.
- `backend/app/Application/Content`: search use case.
- `backend/app/Http`: validation, controllers and explicit public resources.
- `docker`: separate PHP and static frontend/Nginx images.
- `docs`: decisions, delivery tracking and API contract.

Public text is rendered as text, without raw HTML injection. Staff endpoints use same-origin Laravel cookie sessions and CSRF protection. Uploads and public subscriptions are not implemented yet.
