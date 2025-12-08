# PairCam

Random video chat app - meet new people worldwide with instant 1-on-1 video connections.

**Live:** [paircam.live](https://paircam.live)

## Quick Start

```bash
./install-all.sh   # Install dependencies
./start-all.sh     # Start services
# Open http://localhost:5173
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** NestJS 10, Socket.io, TypeScript
- **Database:** Neon (PostgreSQL)
- **Cache:** Upstash (Redis)
- **Hosting:** Vercel + Railway
- **Payments:** Stripe

## Production Services

| Service | Provider |
|---------|----------|
| Frontend | Vercel |
| Backend | Railway |
| Database | Neon |
| Redis | Upstash |
| Payments | Stripe |
| TURN | Metered.ca |

## Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for:
- Architecture details
- API reference
- Deployment guide
- Configuration
- Troubleshooting

## Development

```bash
# Backend
cd packages/backend && npm run dev

# Frontend
cd packages/frontend && npm run dev
```

## License

MIT
