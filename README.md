# AI Research Clicker

An incremental/idle game that teaches the history of AI and machine learning research, adapted from [Particle Clicker](https://github.com/particle-clicker/particle-clicker) (built during the 2014 CERN Webfest) as an educational resource for NeurIPS.

Source: https://github.com/hamzahanif2210/ai-research-clicker

## What is it?

You run an AI research lab. Click the network diagram to generate compute, hire staff (Undergrad RAs up to Turing Award Laureates) to generate it automatically, and spend compute researching a tree of real AI/ML milestones — from the Perceptron through Backpropagation, CNNs, RNNs/LSTMs, Transformers, and up to modern LLMs. Each milestone unlocks a short educational blurb on the actual history/concept. Along the way you earn citations, buy upgrades, unlock achievements, and can toggle dark mode.

## How to play

1. On first launch, set up your lab: nickname, lab name, country, and funding currency.
2. Click the network diagram (center panel) to generate compute.
3. Hire staff from the **HR** tab so compute keeps generating on its own.
4. Spend compute in the **Research** tab to unlock the next AI/ML milestone — each one earns citations and reveals its info page.
5. Spend funding in the **Upgrades** tab to boost your staff's output.
6. Track achievements and your personal-best scoreboard from the navbar; progress autosaves, and returning players are offered "Continue" or "Start from the beginning."

## How to run

This is a static site with no build step or dependencies to install.

- **Locally:** serve the folder with any static file server and open it in a browser, e.g.:
  ```
  python3 -m http.server 8000
  ```
  then visit `http://localhost:8000/`. (Opening `index.html` directly via `file://` won't work — the game loads its JSON/data files with requests that browsers block from `file://`.)
- **Deploying (e.g. Netlify):** point it at this repo with the publish directory set to the repo root (`/`) and no build command — it's plain HTML/CSS/JS.
