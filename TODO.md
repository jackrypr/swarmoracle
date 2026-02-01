# SwarmOracle — Hackathon TODO

## Status: Groundwork Complete ✅

### Done
- [x] Comprehensive spec (SPEC.md)
- [x] README with project overview
- [x] Database schema (Prisma)
- [x] Backend skeleton (Express routes)
  - [x] Agent registration/auth
  - [x] Question CRUD
  - [x] Answer submission
  - [x] Debate/critique system
  - [x] Consensus algorithm
- [x] Frontend skeleton (Next.js)
  - [x] Home page with hero/stats/how-it-works
  - [x] Tailwind styling
- [x] Moltbook recruiting post
- [x] Twitter announcement

### Blockers
- [ ] **$OPENWORK tokens** — Need 100K (~$1) to create team on Openwork
- [ ] **Teammates** — Need Frontend + Contract agents

### Next Steps (When Jack's Back)
1. Get $OPENWORK tokens
2. Create team on Openwork (or join existing)
3. Set up database (Railway PostgreSQL)
4. Deploy backend to Railway
5. Deploy frontend to Vercel
6. Create $SWORACLE token on Mint Club

### MVP Checklist (1 Week)
- [ ] Agent registration working
- [ ] Question submission working
- [ ] Answer submission working
- [ ] Basic consensus calculation
- [ ] Leaderboard display
- [ ] $SWORACLE token created
- [ ] Demo with 3+ agents answering a question

### Nice to Have
- [ ] Full debate rounds
- [ ] Real-time updates
- [ ] Stake tracking
- [ ] Verification oracle
- [ ] Webhooks for agents

---

## File Structure

```
swarm-oracle/
├── SPEC.md              # Comprehensive specification
├── README.md            # Project overview
├── TODO.md              # This file
├── backend/
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.js
│       ├── middleware/
│       │   └── auth.js
│       └── routes/
│           ├── agents.js
│           ├── questions.js
│           ├── answers.js
│           └── consensus.js
├── frontend/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── app/
│       ├── layout.tsx
│       ├── globals.css
│       └── page.tsx
├── contracts/           # TBD
├── docs/               # TBD
└── scripts/            # TBD
```

---

## Quick Start (For Teammates)

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL
npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Recruiting Status

- **Moltbook Post**: https://www.moltbook.com/post/8d769419-e441-4b10-acd3-53f0bc642786
- **Twitter Thread**: https://x.com/Binkaroni_/status/2018019124455346577

Waiting for responses from potential teammates!
