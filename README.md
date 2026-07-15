# icaruscal.github.io (original created by Drumstix42/drumstix42.github.io)

# Icarus Calculator
This is a web-based calculator tool for the survival game [Icarus](https://store.steampowered.com/app/1149460/ICARUS/). It is designed to be used as a companion tool while playing the game. It is written in [Vue.js](https://vuejs.org/) and deployed using [GitHub Pages](https://pages.github.com/).

## Running Project
If this is your first time see [Setting up Dev Environment](#setting-up-dev-environment)

Otherwise, run
```
nvm use
yarn install
yarn dev
```

Local env files are gitignored. Copy the examples once (or after pulling changes to them):
```
cp .env.development.example .env.development
cp .env.production.example .env.production
```
Adjust paths/URLs in the local copies as needed. `yarn dev` uses `.env.development`; production builds use `.env.production`.
## Updating Project files
### Extracting game files
- Download [Ue4Export](https://github.com/CrystalFerrai/Ue4Export/releases) tool
    - Ensure you have [.NET 8.0](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) installed
- Copy the `scripts/Ue4ExportFiles/*` files into the directory which you extracted the `Ue4Export` tool (Sibling of Ue4Export.exe).
- Adjust the `export.bat` file to point to your game directory.
- Execute `export.bat` from within the `UeExport` directory.
- This will produce both the json data files, as well as the image assets.

### Updating Via script
Update ItemIcons from a Ue4Export:
```
yarn update-game-assets <path/to/Ue4ExportDir/export>
```
This syncs icons from the export (using `Traits/D_Itemable.json` as the reference list) and removes any leftover raw `D_*.json` tables from `public/icarus-game/Data`.

### Data catalog (recipes, items, stations, stats + tier)
The app loads a single combined JSON (`data-catalog.json`), not the raw Ue4Export `D_*.json` tables.
```
yarn build-data-catalog <path/to/IC_Export> [prettyOutFile]
```
Writes a **pretty** file to `data/icarus-game/data-catalog.json` and a **minified** copy to `public/icarus-game/Data/data-catalog.json`.

`yarn build` / `yarn gh` re-minify from the pretty file via the Vite plugin (`yarn prepare-data-catalog`). During `yarn dev`, the pretty `data/` file is served at `/icarus-game/Data/data-catalog.json`. GitHub Pages gzip-compresses `.json` on the fly.

Each recipe has an `acquisition` field: `craft`, `shop`, or `workshop`. See [docs/icarus-game-data.md](./docs/icarus-game-data.md).

### Updating Item Icons
Prefer `yarn update-game-assets` (above). Manually: Web App base is `public/icarus-game/ItemIcons`; export source is `export/Icarus/Content/Assets/2DArt/UI/Items/Item_Icons`.

**NOTE:** The `.gitignore` file handles known image filenames which were/are too long. Simply removing the duplicated text in the file name, and manually setting them was enough to fix the issue, as the code is setup to handle partial matches as-is. (More recent versions of the game seem to have fixed the duplicate naming convention, so this might not apply anymore!)

### Updating the Web App

Once the data and image files are updated, the remaining adjustments are done within the `src\pages\Icarus.vue` file. Here we can specify the game version and the calendar date, the update notes link and week number, and the welcome/changes banner texts.


## Setting up Dev Environment
### NVM (Node Version Manager)
- Follow the instructions at [github/nvm-sh](https://github.com/nvm-sh/nvm) to install nvm
- Then run: `nvm install` or `nvm use`
### Yarn
- Before you can run yarn, you should enable: `corepack enable` which then will automatically install yarn when you run the command to the version of the repository.  See [yarnpkg install instructions](https://yarnpkg.com/getting-started/install).
- Run `yarn install` to install the dependencies.
- Copy env templates and edit for your machine:
  ```
  cp .env.development.example .env.development
  cp .env.production.example .env.production
  ```
  - `.env.development` — `VITE_GAME_ASSETS_URL` and `ICARUS_EXTRACTED_GAME_FILES_FOLDER` for local/dev
  - `.env.production` — production `VITE_GAME_ASSETS_URL` for builds / GitHub Pages
- Ensure `yarn build` executes without a problem.
