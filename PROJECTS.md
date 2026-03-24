# G-Code & Programmatic CAD — Project Knowledge Base

## Overview

This document catalogs Kyle Grover's projects, tools, and knowledge in the space of programmatic G-code generation, 3D printing simulation, pen plotter art, and SDF-based CAD. The projects span multiple languages (TypeScript, Python, Rust, C/C++) and range from libraries to desktop apps to web platforms.

---

## FLAGSHIP PROJECTS

### py2g — Browser-Based Python-to-GCode IDE
- **URL**: https://py2g.com (JS sibling: js2g.com)
- **Repo**: https://github.com/kylegrover/py2g
- **Status**: Active development (updated today)
- **Stack**: Next.js 15, React 19, Tauri 2, Monaco Editor, WebGPU, PostgreSQL/Prisma
- **Description**: Full-featured web app (and desktop variant) that lets users write Python code in the browser to generate G-code for 3D printing/CNC. Uses FullControl for high-level abstractions. Features include OAuth auth, AI-assisted coding via MonacoPilot, WebGPU-powered 3D visualization, and a Tauri desktop app with bundled Python (`uv` sidecar).
- **Key Features**:
  - Browser-based Python IDE — no local install needed
  - FullControl library integration for G-code generation
  - Desktop app with per-sketch virtual environments
  - Real-time 3D visualization via WebGPU (@use-gpu)
  - AI code assistance

### fullcontrol-js — TypeScript Port of FullControl
- **Repo**: https://github.com/kylegrover/fullcontrol-js
- **Status**: Active development (updated yesterday), 100% parity with Python v0.1.2
- **Stack**: TypeScript 5.4, ES2020, dual ESM/CJS
- **npm**: `fullcontrol-js`
- **Description**: Complete TypeScript rewrite of the Python FullControl library. Browser-first, Node-compatible. Converts high-level design steps (Points, Printer settings, Extruder configs) into G-code and 3D visualization data.
- **Key Features**:
  - 23 automated parity tests (20 G-code, 3 visualization) — all passing
  - Rich geometry helpers: shapes, arcs, transforms, waves, segmentation
  - 20+ printer device profiles (Prusa, Creality, Voron, BambuLab, Ultimaker)
  - Volumetric extrusion accounting
  - Zero external dependencies
  - Tree-shakeable with full TypeDoc API reference

### SDFVR — VR SDF Modeling Tool
- **Repo**: https://github.com/kylegrover/sdfvr
- **Status**: Active development (updated today)
- **Stack**: C++17, OpenXR, OpenGL, GLSL
- **Description**: VR-native Signed Distance Function modeling tool. GPU raymarching renders SDF geometry as fullscreen quads per eye. Create, move, and sculpt 3D shapes using VR controllers with real-time visual feedback.
- **Key Features**:
  - GPU raymarching with dynamic GLSL shader compilation
  - Dual-hand interaction: grab, scale, rotate
  - GPU picking (no CPU raycasting needed)
  - Multiple view modes: Lambert + soft shadows + AO + specular
  - JSON save/load with session restore
  - Real-time parameter adjustment (radius, smoothing)
  - Desktop mirror window for debugging

---

## SIMULATION & ANALYSIS

### volco — 3D Printing Voxel Simulator
- **Repo**: https://github.com/kylegrover/volco
- **Status**: Active (grid-flow-solver branch, Nov 2025)
- **Stack**: Python, NumPy, SciPy, scikit-image, Trimesh
- **Description**: VOLCO (VOLume COnserving) simulates the 3D printing process in voxelized space. Takes G-code input and predicts the final printed shape using volume-conserving physics. Outputs voxel matrices or STL meshes via marching cubes.
- **Key Features**:
  - Volume-conserving material deposition physics
  - Acceleration-aware simulation
  - FEA (Finite Element Analysis) module for structural analysis
  - Configurable voxel/step size, preview mode
  - Research-backed (2 published papers)

### volcogui — Desktop GUI for Volco
- **Repo**: https://github.com/kylegrover/volcogui
- **Status**: v0.3.2-beta, standalone Windows executable available
- **Stack**: Python, PyQt6, PyVista/VTK
- **Description**: Cross-platform desktop GUI for the Volco simulator. Drag-and-drop G-code import, parameter configuration, background simulation with progress tracking, and interactive 3D STL visualization.
- **Key Features**:
  - Drag-and-drop G-code import
  - Real-time progress tracking
  - Interactive 3D viewer (PyVista)
  - Dark theme, responsive layout
  - Test mode (works without Volco installed)

---

## FULLCONTROL ECOSYSTEM

### fullcontrol-editor-tauri — Desktop GCode Editor
- **Repo**: https://github.com/kylegrover/fullcontrol-editor-tauri
- **Status**: Prototype (May 2025)
- **Stack**: Tauri, React, TypeScript, Rust, Pyodide
- **Description**: Cross-platform desktop G-code editor built with Tauri. Integrates Python via Pyodide for running FullControl scripts in a sandboxed environment.

### fullcontrol-ide — FullControl IDE for Windows
- **Repo**: https://github.com/kylegrover/fullcontrol-ide
- **Status**: Functional (last updated Jan 2024)
- **Stack**: Python, PyInstaller, gunicorn
- **Description**: Desktop application for FullControl G-code design. Downloadable Windows executables. Includes visualization (yagv5 dark mode) and import/export.

### fullcontrol-rs — Rust Implementation of FullControl
- **Status**: Experimental (Aug 2024)
- **Stack**: Rust, egui, rustpython-vm, syntect
- **Description**: Rust port of FullControl with egui GUI framework. Supports Python script execution via embedded RustPython interpreter, syntax highlighting, and file dialogs.

### fullcontrol-scripts — Test Scripts
- **Description**: Collection of test scripts and experiments for FullControl workflows.

### gcodejs — TypeScript GCode Generator
- **Status**: Early prototype (Oct 2023)
- **Stack**: TypeScript
- **Description**: Lightweight G-code generator library for 3D printing, inspired by FullControl XYZ. Predecessor/experiment that led to fullcontrol-js.

---

## PEN PLOTTER & VECTOR ART

### oneliner — Image to Single-Line Drawing
- **Repo**: https://github.com/kylegrover/oneliner
- **Status**: Functional (web-ui branch)
- **Stack**: Rust
- **Description**: Converts images to single continuous line drawings using sub-pixel edge detection (Canny/Devernay), minimum spanning tree, and Euler tour optimization. Outputs plotter-friendly vector paths.

### idraw-extensions — Inkscape Extensions for iDraw Plotter
- **Repo**: https://github.com/kylegrover/idraw-extensions
- **Status**: Functional (Aug 2023)
- **Stack**: Python, C/C++, Inkscape INX
- **Description**: Suite of Inkscape extensions for controlling iDraw plotters (AxiDraw variant). Includes hatch fill, text rendering, SVG reordering, and plotter control. iDraw uses 16T GT2 timing belt for 0.01mm positioning precision and supports laser engraving.

### devernay_1.0 — Sub-Pixel Edge Detection
- **Repo**: https://github.com/kylegrover/devernay_1.0
- **Status**: Stable reference implementation
- **Stack**: ANSI C89
- **Description**: Implementation of the Canny/Devernay sub-pixel edge detection algorithm. Published in Image Processing On Line (2017). Outputs detected edges as contours in TXT, PDF, or SVG. Used as a dependency by the oneliner project.

### plotbot — AI Art Generation Platform
- **Status**: Functional (reference/historical)
- **Stack**: Python, Discord bot
- **Description**: Discord bot for AI-powered art generation. Orchestrates multi-step image creation using DALL-E and Stable Diffusion (DreamStudio/RunPod). While not directly G-code related, represents the creative/generative art pipeline.

---

## RELATED PROJECTS (Outside gcode/ folder)

### raymarch-algo-compare — Raymarching Benchmark Framework
- **Repo**: https://github.com/kylegrover/raymarch-algo-compare
- **Stack**: Python, GLSL
- **Description**: Modular framework for benchmarking raymarching strategies on SDF scenes. Related to the rendering techniques used in SDFVR.

---

## KEY CONCEPTS & KNOWLEDGE AREAS

### Programmatic G-Code Generation
- Writing code (Python/TypeScript/Rust) to produce machine instructions instead of using GUI slicers
- FullControl paradigm: define Points, Printer settings, Extruder state → transform pipeline → G-code output
- Advantages: parametric designs, mathematical patterns, impossible-with-slicers geometries

### 3D Printing Simulation
- Voxelized space simulation with volume conservation
- Predicting printed shape vs. intended shape
- FEA for structural analysis of printed parts
- Acceleration-aware material deposition modeling

### SDF (Signed Distance Function) Modeling
- Representing 3D shapes as mathematical distance functions
- GPU raymarching for real-time rendering
- Smooth boolean operations (smooth union/subtraction)
- VR-native interaction for intuitive 3D sculpting

### Pen Plotter Art / Vector Generation
- Image-to-vector conversion pipelines
- Sub-pixel edge detection (Canny/Devernay)
- TSP/Euler tour optimization for single-line paths
- Inkscape extension ecosystem for plotter control
- iDraw/AxiDraw hardware integration

### Browser-Based CAD/Manufacturing
- Running Python in the browser (Pyodide)
- WebGPU for 3D visualization
- Monaco editor for code editing
- Real-time G-code preview and simulation
