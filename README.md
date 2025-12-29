# Spin The Wheel

A wheel-of-names style application built with Three.js for random selection with smooth 3D animations.

## Features

- **Interactive Spinning Wheel**: 3D animated wheel with smooth spinning physics
- **Customizable Names**: Add any number of participants (one per line)
- **Multiple Color Schemes**: Choose from 25+ color palettes including:
    - Diverging (Spectral, Red-Yellow-Green, etc.)
    - Qualitative (Set1, Pastel, Paired, etc.)
    - Sequential (Viridis, Plasma, Turbo, etc.)
    - Single Hue (Blues, Greens, Oranges, etc.)
- **Sound Effects**: Optional tick sounds during spin
- **Remove Winner**: Option to automatically remove the winner after each spin
- **Custom Backgrounds**: Set a background image via URL or file upload
- **Adjustable Spin Duration**: Control how long the wheel spins (0-5+ seconds)
- **Collapsible Sidebar**: Clean interface with resizable sidebar
- **Persistent Settings**: Your preferences are saved locally

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. Enter names in the sidebar (one per line)
2. Optionally customize the wheel title, colors, and other settings
3. Click **SPIN!** to spin the wheel
4. The winner will be displayed in a toast notification

## Tech Stack

- [Three.js](https://threejs.org/) - 3D graphics library
- [Chroma.js](https://gka.github.io/chroma.js/) - Color manipulation library
- [Vite](https://vitejs.dev/) - Build tool and dev server

## Scripts

| Command                | Description               |
| ---------------------- | ------------------------- |
| `npm run dev`          | Start development server  |
| `npm run build`        | Build for production      |
| `npm run preview`      | Preview production build  |
| `npm run lint`         | Run ESLint                |
| `npm run lint:fix`     | Fix ESLint issues         |
| `npm run format`       | Format code with Prettier |
| `npm run format:check` | Check code formatting     |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
