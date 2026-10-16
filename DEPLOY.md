# Deployment Guide — UST × Premera Engagement Portal

## Docker (Recommended)

### Files added
| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build — Node builds, Nginx serves |
| `nginx.conf` | Nginx config with React Router & asset caching |
| `docker-compose.yml` | One-command run |
| `.dockerignore` | Keeps the image lean |

### Deploy on the Linux server

```bash
# 1. Clone / pull latest code
git clone https://github.com/vinothust/premera-engagement.git
cd premera-engagement

# 2. Build and start (runs on port 80)
docker compose up -d --build
```

**That's it.** The container builds the React app internally — no local `npm run build` needed.

### Common commands
```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Check running containers
docker ps
```

### Run on a different port (e.g. 8080)
Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:80"
```
Then run `docker compose up -d --build`.

---

## Manual Deploy (without Docker)

## 1. Build Locally (Windows)

```powershell
npm run build
```

This produces a `dist/` folder containing the static site.

---

## 2. Copy `dist/` to the Linux Server

**Using SCP:**
```bash
scp -r dist/ user@your-server-ip:/var/www/premera-portal
```

**Using rsync (recommended for re-deploys — only transfers changes):**
```bash
rsync -avz --delete dist/ user@your-server-ip:/var/www/premera-portal
```

---

## 3. Nginx Configuration (on the Linux server)

Create the site config:
```bash
sudo nano /etc/nginx/sites-available/premera-portal
```

Paste the following:
```nginx
server {
    listen 80;
    server_name your-domain.com;   # or your server IP

    root /var/www/premera-portal;
    index index.html;

    # Required for React Router (client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/premera-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. HTTPS with Let's Encrypt (Optional but Recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Certbot will automatically update the Nginx config with SSL settings and set up auto-renewal.

---

## Notes

- **Sub-path deployment** — If the app is served from a sub-path (e.g. `https://your-server.com/portal/`), add a `base` option to `vite.config.ts` before building:
  ```ts
  export default defineConfig({
    base: '/portal/',
    plugins: [react()],
  })
  ```
- **Re-deploy** — Repeat steps 1 and 2. No server restart needed (Nginx serves static files directly).
- **Firewall** — Ensure ports `80` (HTTP) and `443` (HTTPS) are open on the server.

---

## Updating the Application on the Linux Server

> Use this section whenever a new version needs to be deployed. The Docker path (recommended) and the manual path are both covered.

### Docker update (recommended)

SSH into the server and run:

```bash
cd /path/to/premera-engagement

# 1. Pull the latest code from Git
git pull

# 2. Rebuild the image and restart the container
docker compose up -d --build
```

`--build` triggers the full two-stage Docker build (Node 20 compiles the React app, nginx serves the output). The running container is replaced automatically — no downtime commands needed.

**Verify it worked:**
```bash
# Container should show "running"
docker compose ps

# Tail the last 20 log lines for errors
docker compose logs --tail=20 portal
```

**Force a clean rebuild** (use this if you changed `package.json` or suspect a stale cache):
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

### Manual update (without Docker)

If the server is running the manual nginx setup (section 3 above), do this **on your local Windows machine** first:

```powershell
# 1. Pull latest code
git pull

# 2. Build
npm run build
```

Then copy the new `dist/` to the server:

```bash
# rsync only transfers changed files — safe for repeated deploys
rsync -avz --delete dist/ user@your-server-ip:/var/www/premera-portal
```

No nginx restart is needed — nginx serves static files directly and picks up changes immediately.

---

### Troubleshooting updates

| Symptom | Fix |
|---------|-----|
| Old version still showing in browser | Hard-refresh: `Ctrl+Shift+R` (Win/Linux) or `Cmd+Shift+R` (Mac) |
| `docker compose up` exits with build error | Run `docker compose build --progress=plain` to see the full error |
| Port 8082 conflict | `sudo lsof -i :8082` to find the blocking process |
| `git pull` asks for credentials | Set up an SSH deploy key or use a personal access token |
| nginx returns 404 on page refresh | Confirm `try_files $uri $uri/ /index.html;` is in the nginx config |

---

### Quick-reference cheat sheet

```bash
# Docker — full update in two commands
cd /path/to/premera-engagement
git pull && docker compose up -d --build

# Manual — build locally then push to server
npm run build
rsync -avz --delete dist/ user@server:/var/www/premera-portal
```

---

## Sign-in, roles and first-time setup

The portal no longer logs everyone in automatically. Users sign in with their work email and a
one-time code (sent by the API's mail relay). The API repo (`premera-engagement-api`) owns all of
the configuration — see its `.env.example` and README. What matters for a deployment:

1. **Seed the first Super Admin** on the API with `SUPERADMIN_BOOTSTRAP_EMAILS=you@ust.com`. Until
   at least one Super Admin exists, nobody can get in.
2. **`APP_BASE_URL` on the API must be this site's public URL** — invite and notification emails link here.
3. **`VITE_API_BASE_URL`** (`.env.production`) must point at the API, as before.
4. The web app and API must be served so the API sees real client IPs (`TRUST_PROXY` on the API),
   otherwise the sign-in rate limit applies to the proxy as a whole.

| Role | What they see |
|---|---|
| **UST Super Admin** | Everything, including **Super Admin** (users, access requests, invitations, email notification recipients, email log) |
| **UST Stakeholder** | The whole portal, **Data Sync** (Excel upload/download/rollback) and **Activity** — no Super Admin page |
| **Premera Stakeholder** | Program Level, Risks & Issues, Feedback (submit feedback, thumbs up/down) — read-only, no Data Sync / Activity / Super Admin |

New people get access in one of two ways: they sign in with an unregistered email and **request
access** (a Super Admin approves it and picks their role), or a Super Admin **invites** them by email.

The menu hides what a role can't use, but that is only presentation — the API enforces every
permission on every request.

