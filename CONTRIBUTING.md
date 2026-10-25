# Contributing to Screeps-Nooby-Typescript-Code

🎉 Thanks for your interest in contributing! This project is a learning-oriented Screeps AI written in TypeScript, focused on performance, clean architecture, and centralized task coordination.

Whether you're here to fix a bug, suggest improvements, or learn by doing — welcome!

---

## 🧠 Philosophy

This project emphasizes:
- **Explicit control**: Creeps do not make autonomous decisions; a central coordinator assigns tasks.
- **Type safety**: We rely heavily on types to catch bugs early and guide architecture.
- **Performance**: CPU efficiency matters. Avoid unnecessary `.find()` calls and re-computation.
- **Clarity over cleverness**: Prefer readable and maintainable code over obscure one-liners.

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- VS Code (recommended) with ESLint + Screeps extensions
- Screeps account and server (official or private)

### Setup

```bash
git clone https://github.com/rfsjim/Screeps-Nooby-Typescript-Code.git
cd Screeps-Nooby-Typescript-Code
npm install
```

---

## 📐 Code Style & Structure

### Style Guide
- Use `camelCase` for variables and `PascalCase` for types/classes
- Avoid magic strings; use enums or constants
- Always type your variables and function signatures
- Centralize logic that assigns tasks — creeps should **not** decide their own actions

### Type Safety Tips
- Use type guards (`isFillTask()`, etc.) to narrow types safely
- Prefer `const` over `let` when values don’t change
- Handle `null` or `undefined` cases defensively (`Game.getObjectById()` can return null!)

---

## 📦 Making Contributions
### 1. Fork & Branch
Create a new branch off main:
```bash
git checkout -b feat/short-description
```

### 2. Write Your Code
- Keep changes small and focused
- Update types and type guards as needed
- Add a test scenario or comment describing expected in-game behavior

### 3. Format & Lint
```bash
npm run lint
Format your code with Prettier if included.
```

### 4. Commit with Meaning
Use conventional commits:
```
feat(task): add fill task for containers to spawns
fix(utils): correct type guard for resource targets
```

### 5. Push and Create PR
Push to your fork and open a Pull Request. Be descriptive! Explain what it does and why.

---

## 🧪 Testing & Debugging
In Screeps, testing often means:
- Spawning creeps and checking behavior visually
- Inspecting memory, console logs, and CPU usage
- Watching task assignment and execution flow
Be careful of infinite loops, missing null checks, and pathfinding spam.

---

## 💬 Questions?
Open an issue or start a discussion! Collaboration and learning are the heart of this project.

---

## 🧠 Contributor Tips
- Want to work on something but not sure what? Check TODO comments in the code.
- Refactor as you go — just keep commits focused.
- If you break task assignment logic, don’t panic. That means you're getting deeper into the system. 🙂

Thanks again for contributing!
Happy Screeping 👾