# Installation Guide

This guide describes the requirements and installation of Timeframe on a local computer.

## Requirements

- A 64-bit Linux, macOS, or Windows computer
- Node.js **20.9 or newer** (Node.js 22 LTS is recommended)
- npm, included with Node.js
- Approximately 500 MB of free disk space for dependencies and builds
- Write access to the project directory, including `config/` and `data/`
- A modern browser such as Firefox, Chrome, Edge, or Safari

No separate SQLite server is required. The application uses the embedded `better-sqlite3` package and creates the local database itself.

The application has no user accounts, authentication, or authorization. Its
included start commands therefore listen only on `127.0.0.1`. Do not expose the
server directly to a local network or the public internet. Remote access
requires a separately configured authentication layer and is outside the scope
of this guide.

Most supported platforms receive a prebuilt `better-sqlite3` binary. If npm must compile it locally, install a C/C++ build toolchain and Python 3:

- Debian/Ubuntu: `sudo apt install build-essential python3`
- Fedora: `sudo dnf group install "Development Tools"` and `sudo dnf install python3`
- macOS: `xcode-select --install`
- Windows: install Python 3 and the **Desktop development with C++** workload from Visual Studio Build Tools

## 1. Verify Node.js and npm

```bash
node --version
npm --version
```

The Node.js version must be at least `v20.9.0`.

## 2. Obtain the project

Clone the repository, or extract the project archive into a permanent directory. Then enter that directory:

```bash
cd /path/to/track
```

All following commands must be run from the directory containing `package.json`.

## 3. Install dependencies

For a reproducible installation using the committed lock file:

```bash
npm ci
```

Use `npm install` instead only when intentionally updating dependencies or when no lock file is available.

## 4. Check the configuration

The default `config/settings.json` is:

```json
{
  "version": 1,
  "language": "hu",
  "locale": "en-US",
  "timezone": "Europe/Budapest",
  "weekStartsOn": 1,
  "workingDays": [1, 2, 3, 4, 5],
  "dailyTargetMinutes": 480,
  "lunchBreakMinutes": 30
}
```

The recommended way to change user-facing settings is through the application's **Settings** page. If the JSON file is edited manually, keep valid JSON syntax and stop the application first. Supported interface languages are `hu` and `en`; supported locales are `hu-HU` and `en-US`.

## 5. Run in development mode

```bash
npm run dev
```

Open [http://localhost:5415](http://localhost:5415). Stop the server with `Ctrl+C`.

Development mode is convenient for source-code work but is not the recommended long-running installation.

## 6. Build and run in production mode

Build once:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Open [http://localhost:5415](http://localhost:5415). Keep the terminal process running while using the application and stop it with `Ctrl+C`.

After changing source code, run `npm run build` again before restarting. Changes made through the Settings page do not require rebuilding.

## 7. Optional verification

```bash
npm test
npm run lint
npm run build
```

All commands should complete without errors.

## Data initialization

On the first request, the application creates `data/worktime.db` and the required tables. It may also create `worktime.db-wal` and `worktime.db-shm`; these are normal SQLite files and must not be deleted while the application is running.

Existing supported monthly JSON files in `data/` are migrated automatically. After successful import, their names receive the `.migrated.bak` suffix.

## Backup

Create a timestamped backup in the default `backups/` directory:

```bash
npm run backup
```

The backup uses SQLite's online backup mechanism, so it is consistent even if the application is running. Each backup directory contains `worktime.db`, `settings.json`, and a versioned `manifest.json`.

To choose an explicit destination directory:

```bash
npm run backup -- /path/to/timeframe-backup
```

The destination must not already exist. Keep a copy outside the project directory if protection against complete disk or project-directory loss is required.

## Restore

1. Stop the application with `Ctrl+C`. Restore is not supported while the application is running.
2. Run the restore command with the complete backup directory:

   ```bash
   npm run restore -- /path/to/backup-directory
   ```

3. Start the application with `npm start` and verify the restored data.

The command validates the manifest, settings, and SQLite integrity before making changes. It automatically saves the current state under `backups/pre-restore-.../`, and restores the original files if replacement fails. Do not pass an individual database file or mix SQLite sidecar files from different backups.

## Updating dependencies

```bash
npm install
npm test
npm run lint
npm run build
```

Review dependency changes and retain the updated `package-lock.json` with the project.

## Troubleshooting

### Port 5415 is already in use

Stop the process using the port, or start on another port:

```bash
npm start -- --port 5416
```

Then open `http://localhost:5416`.

### `better-sqlite3` fails to install

Confirm that the Node.js version is supported. Install the platform build tools listed under **Requirements**, remove only the generated `node_modules` directory, and run `npm ci` again. Do not remove `data/` or `config/`.

### The settings file is rejected

Validate `config/settings.json` as JSON and compare every field with the example above. Numeric values must be numbers, not quoted strings.

### The application does not show recent changes

Stop the server, run `npm run build`, and restart with `npm start`. A hard browser refresh may also be necessary.

## License

Timeframe is distributed under `AGPL-3.0-or-later`. Installing, modifying, offering it over a network, or redistributing the project is subject to the complete terms in [LICENSE](LICENSE).
