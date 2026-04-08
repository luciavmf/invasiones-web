# Invasiones — Web Port

Browser port of [Invasiones](https://github.com/luciavmf/invasiones), a strategy game about the British Invasions of Argentina (1806–1807), originally developed in C# as a graduation project at [UNLAM](https://www.unlam.edu.ar/).

## Requirements

- [Node.js](https://nodejs.org/) v18 or later

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens a local dev server at `http://localhost:5173` with hot reload.

## Build

```bash
npm run build
```

Compiles TypeScript and bundles everything into `dist/`.

## Preview production build

```bash
npm run preview
```

Serves the `dist/` folder locally to check the production build before deploying.

## Tech

- [Vite](https://vitejs.dev/) — build tool and dev server
- [TypeScript](https://www.typescriptlang.org/)
- [PixiJS](https://pixijs.com/) — 2D rendering
