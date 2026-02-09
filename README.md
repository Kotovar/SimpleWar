# SimpleWar

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A Real-Time Strategy (RTS) game built with React 19, TypeScript, and modern state management.

## 🚀 Features

- **Two-player gameplay**: Human vs AI (or local multiplayer in future)
- **Resource management**: Balance population, supply, and economy
- **Unit spawning**: Deploy military units for combat
- **Building construction**: Build structures for resources and defenses
- **Procedural map generation**: Each game features a unique terrain layout
- **Pathfinding system**: Smart movement for units across the battlefield
- **Population system**: Units and buildings affect population limits

## 🛠 Tech Stack

| Category         | Technology                         |
| ---------------- | ---------------------------------- |
| Framework        | React 19.2.0 with TypeScript 5.9.3 |
| State Management | Zustand 5.0.9 with Immer           |
| Build Tool       | Vite (rolldown-vite)               |
| Architecture     | Feature-Sliced Design (FSD)        |
| Styling          | CSS Modules                        |

## 📁 Project Structure

```
src/
├── app/              # Application-level logic
│   ├── game/         # Core game logic and components
│   └── system/       # Game systems (population, economy)
├── entities/         # Business entities (units, buildings, maps)
│   ├── units/
│   ├── buildings/
│   ├── economies/
│   ├── maps/
│   └── settings/
├── features/         # Feature-specific logic
│   ├── game-loop/    # Turn-based game loop
│   ├── build/        # Building construction
│   ├── combat/       # Combat mechanics
│   ├── spawn/        # Unit/spawn logic
│   ├── pathfinding/  # Movement pathfinding
│   └── selection/    # Unit selection
├── widgets/          # Composite UI components
│   ├── map/          # Game map visualization
│   ├── game-controls/ # Controls and UI
│   └── start-game/   # Game initialization
└── shared/           # Shared code
    ├── config/       # Game configuration
    ├── lib/          # Utility functions
    └── ui/           # Reusable UI components
```

## 🏗️ Getting Started

### Prerequisites

- Node.js 22+ with npm installed

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Script        | Description                      |
| ------------- | -------------------------------- |
| `dev`         | Start Vite development server    |
| `build`       | Build production bundle          |
| `preview`     | Preview production build locally |
| `lint`        | Run ESLint                       |
| `format`      | Format code with Prettier        |
| `type-check`  | Run TypeScript type checking     |
| `fsd-check`   | Verify FSD architecture rules    |
| `lint-staged` | Run linting on staged files      |

## 📖 Key Concepts

### Game Loop

The game uses a turn-based system with phases:

- **setup**: Initial game configuration
- **inProgress**: Active gameplay
- **gameOver**: Game finished

Players take turns (Player → AI → Player...).

### Systems

- **Population System**: Tracks unit counts and building capacity
- **Economy System**: Manages resource generation and consumption
- **Map System**: Procedurally generated terrain with different cell types

### Entity Types

- **Units**: Military units with movement and combat capabilities
- **Buildings**: Structures that provide resources, population, or defenses
- **Maps**: Grid-based terrain with walkable/non-walkable cells
