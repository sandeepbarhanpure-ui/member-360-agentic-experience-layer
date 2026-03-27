# Offline Demo Kit

Standalone offline demo — no server required. Bundles React + Babel as local vendor JS.

## Run

```bash
bash start_demo.sh
```

Opens at `http://localhost:8000`. Works without internet access (vendor JS bundled in `vendor/`).

## Files

| File | Description |
|---|---|
| `index.html` | Demo entry point |
| `chat.html` | Chat agent demo |
| `dashboard.html` | Dashboard demo |
| `architecture.html` | Architecture diagram demo |
| `start_demo.sh` | Launch script |
| `vendor/` | Bundled React + Babel (offline-safe) |