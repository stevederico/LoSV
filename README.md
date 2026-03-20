<img width="1023" height="1027" alt="screenshot" src="https://github.com/user-attachments/assets/dd4165b4-bfb3-4bb7-9248-91d540d1a02b" />

# The Legend of Silicon Valley: A Founder's Journey

A Zelda-style (SNES Link to the Past) top-down adventure game built with Three.js. Walk through a startup-themed overworld, enter buildings, talk to NPCs, and play a 10-level startup simulator — from garage to IPO.

## Play

[losv.bixbyapps.com](https://losv.bixbyapps.com)

## Controls

- **WASD / Arrow Keys** — Move
- **Space / Enter** — Interact / Advance dialogue
- **1 / 2 / 3** — Choose options in simulator
- **+/-** — Zoom in/out
- **Escape** — Pause / Exit building

## Features

- 9 buildings with unique interiors, furniture, and NPCs
- 10-level startup simulator with scoring, random events, and stat tracking (DAU, MRR, funding, team, morale, runway)
- Progression system with building unlock gates
- Inventory with 20+ collectible items
- NPC dialogue trees with choices
- localStorage save persistence

## Setup

```bash
deno install
deno run dev
```

Open `http://localhost:5173`

## Stack

- Three.js 0.150
- Vite 6.1
- Vanilla JavaScript (ES modules)

## License

MIT
