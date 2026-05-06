# Lety Build Service

Cloud compile backend for Lety. Receives Pisces Moon OS app source code,
compiles via PlatformIO, returns flash-ready `.bin` files.

**Service:** `lety-build.fluidfortune.com`  
**License:** AGPL-3.0-or-later

---

## Why Not Vercel / Cloudflare Workers?

PlatformIO compile takes 30-90 seconds. Serverless platforms time out at
10-30 seconds on free tiers. This needs a long-running container.

Recommended hosts:

| Host | Why |
|---|---|
| **Fly.io** | Machines auto-suspend when idle, pay only for usage. ~$0/mo at low traffic. |
| **Railway.app** | Similar model, slightly higher base cost. |
| **Hetzner Cloud** | $5/mo VPS. Always-on, no cold start. Best value at scale. |
| **DigitalOcean** | $4-6/mo droplet. Same as Hetzner. |
| **Self-hosted** | Free if you have a Linux box you keep on. |

---

## Quick Start (Fly.io — recommended)

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Auth
fly auth signup    # or: fly auth login

# 3. Deploy
cd backend
fly launch --name lety-build --region sjc
# Accept defaults. Fly reads Dockerfile and builds.

# 4. Set custom domain
fly certs add lety-build.fluidfortune.com
# Add CNAME at your DNS:
#   lety-build → lety-build.fly.dev
```

Total cost at low traffic: $0/month (Fly's free tier covers it).

---

## Quick Start (Hetzner / DigitalOcean / your own VPS)

```bash
# On the server (Ubuntu 24+):
git clone https://github.com/FluidFortune/lety-build.git
cd lety-build

# Build the Docker image
docker build -t lety-build .

# Run
docker run -d \
  --name lety-build \
  --restart unless-stopped \
  -p 3000:3000 \
  lety-build

# Put nginx in front for HTTPS via Let's Encrypt
# (or use Caddy which auto-handles certs)
```

---

## API

### `POST /api/build`

**Request:**
```json
{
  "source":      "void run_my_app() { ... }",
  "app_type":    "builtin",
  "app_name":    "my_app",
  "target":      "esp32s3",
  "api_version": "1.0"
}
```

**Response (success):**
```json
{
  "ok":            true,
  "binary":        "<base64-encoded .bin>",
  "binary_size":   1234567,
  "flash_address": 65536,
  "partition":     "factory"
}
```

**Response (compile error):**
```json
{
  "ok": false,
  "errors": [
    "src/lety_app.cpp:42:12: error: 'foo' was not declared in this scope",
    "src/lety_app.cpp:43:5: error: expected ';' before '}' token"
  ],
  "stage": "compile"
}
```

### `GET /api/health`

```json
{ "ok": true, "service": "lety-build", "version": "1.0.0" }
```

---

## Rate Limiting

30 builds per IP per hour. Adjust in `server.js`:

```js
const limiter = new RateLimiterMemory({ points: 30, duration: 3600 });
```

For production with auth tokens, swap `RateLimiterMemory` for
`RateLimiterRedis` and key on user ID.

---

## Security

- Source is validated before compile (size limit, forbidden patterns)
- Each build runs in an isolated temp directory
- Temp directory is force-removed after every build (success or failure)
- Source is never logged
- Compiled binaries are returned and discarded — not persisted server-side
- CORS restricted to lety.fluidfortune.com

For higher security, run the PlatformIO build inside a per-request
Docker container (gVisor or Firecracker for stronger isolation):

```js
// In buildSource, replace exec("pio", ...) with:
await exec("docker", ["run", "--rm", "--network=none",
  "-v", `${buildDir}:/build`, "lety-builder",
  "pio", "run", "-e", "esp32s3", "--project-dir", "/build"]);
```

---

## Updating the Pisces Moon Repo Template

The backend keeps a clone of the Pisces Moon repo as the build template.
When the main repo updates, refresh the backend:

```bash
# On the server
cd /opt/pisces-moon
git pull
pio pkg install -e esp32s3   # in case new deps were added

# Restart the service
docker restart lety-build
```

Or rebuild the Docker image to pick up the latest at build time.

---

## Monitoring

Tail logs:

```bash
docker logs -f lety-build
# or on Fly:
fly logs -a lety-build
```

The service logs each build with IP, app name, and result. No source
content is logged.

---

## Cost Estimate

| Traffic | Fly.io | Hetzner |
|---|---|---|
| 100 builds/day | $0 (free tier) | $5/mo |
| 1,000 builds/day | ~$3/mo | $5/mo |
| 10,000 builds/day | ~$25/mo | $5/mo (CPU saturated) |

Scaling beyond 10K builds/day means horizontal scaling. Cloudflare in
front + multiple Fly machines is the path.

---

*Pisces Moon OS · Lety Build Service · fluidfortune.com · AGPL-3.0-or-later*
