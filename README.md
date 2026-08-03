# TimeTrack

TimeTrack is a local, bilingual work-time tracker built with Next.js and SQLite. It is intended for a single person running the application on their own computer. It has no user accounts, permissions, cloud synchronization, analytics, or external database dependency.

The interface is available in Hungarian and English. The selected `hu-HU` or `en-US` date and time format is applied throughout the application instead of the browser's locale.

## Features

- Start and stop work sessions.
- Starting a break closes the current work session and records the reason for the break.
- Starting the next work session automatically closes the active break.
- Close and reopen complete workdays.
- Add or edit a daily note at any time.
- Correct historical sessions from the report view.
- Calculate net work time, daily balance, and a planned finishing time.
- Configure workdays, the daily target, and the planned lunch duration.
- View weekly and monthly reports.
- Export localized summaries and detailed records to a two-sheet Excel workbook.
- Store all work-time data locally in SQLite and all application settings in JSON.

## Quick start

For complete prerequisites and production instructions, see [INSTALL.md](INSTALL.md).

```bash
npm install
npm run dev
```

Open [http://localhost:5415](http://localhost:5415).

Both the development and production commands bind the server exclusively to
`127.0.0.1`. The application has no authentication or authorization layer, so
do not expose it directly to a local network or the public internet. Any remote
access must be placed behind a separately configured authentication layer.

## How to use the application

### Recording a workday

1. Open **Today** and select **Start work session** when work begins.
2. Select **Start break** when work is interrupted, then enter the reason for the break.
3. Select **Start work session** to resume. This automatically ends the current break.
4. Repeat these steps as needed.
5. Select **Close day** after the final work session. If the day ends during a break, the trailing break is discarded because it is no longer part of the workday.

A closed day can be reopened if it needs correction. A day cannot be edited while it is closed.

### Notes and corrections

The daily note can be edited even after the day has been closed. To correct recorded times, open **Reports**, select the relevant day, reopen it if necessary, and then add, edit, or delete sessions. Break comments and lunch-break designations can also be corrected there.

### Reports and Excel export

Open **Reports** and choose a weekly or monthly period. Select any day to open its detailed history. **Excel export** downloads a workbook containing:

1. **Days** / **Napok**: date, first start, final end, hours worked, break count, total break duration, and daily comment.
2. **Details** / **Részletek**: date, record type, start, end, elapsed hours, and comment.

The workbook language and date/time format follow the saved application settings. The current open day is omitted from the export so that incomplete data is not reported as final.

### Settings

The **Settings** page controls:

- interface language: Hungarian or English;
- date and time format: `hu-HU` or `en-US`;
- working days;
- daily target in hours;
- planned lunch duration in minutes.

Changes take effect after selecting **Save settings**.

## Local data and configuration

- Settings: `config/settings.json`
- SQLite database: `data/worktime.db`
- SQLite runtime files: `data/worktime.db-wal` and `data/worktime.db-shm`, when present

Stop the application before manually changing, copying, or restoring these files. Back up the complete `config/` and `data/` directories together. The application automatically creates its SQLite schema when needed.

The built-in command creates a timestamped, consistent backup containing both the database and settings:

```bash
npm run backup
```

Backups are written under `backups/` by default. A custom destination can be supplied with `npm run backup -- /path/to/destination`. To restore a backup, stop the application first and run:

```bash
npm run restore -- /path/to/backup-directory
```

Before replacing anything, restore automatically saves the current state to a new `backups/pre-restore-.../` directory. See [INSTALL.md](INSTALL.md) for the complete procedure.

Legacy monthly JSON data files in `data/` are imported during startup and renamed with a `.migrated.bak` suffix after a successful migration.

## Development checks

```bash
npm test
npm run lint
npm run build
```

## Versioning and releases

The application version comes from the root `package.json` and is displayed at
the bottom of the desktop sidebar. Releases follow [Semantic
Versioning](https://semver.org/) and are automated with Release Please:

- `fix:` commits produce a patch version;
- `feat:` commits produce a minor version;
- commits with `!` after the type or a `BREAKING CHANGE` footer produce a major
  version;
- `chore:` and `docs:` commits do not create a release by themselves.

Every pushed branch and every pull request targeting `main` is checked on
Node.js 22 and 24 with a clean install, lint, tests, and a production build.
After successful checks on `main`, Release Please creates or updates a release
pull request containing the version bump and `CHANGELOG.md`. Merging that pull
request creates a `vX.Y.Z` tag and a GitHub Release with source archives.

The release workflow uses the repository's built-in `GITHUB_TOKEN`. GitHub may
therefore require a maintainer to approve the CI run created for an automated
release pull request.

### Recommended GitHub branch protection

After the workflows are available on `main`, configure a branch protection
rule for `main` under **Settings → Branches**:

1. Require a pull request before merging and disallow direct pushes.
2. Require the branch to be up to date before merging.
3. Require both `CI / Node 22` and `CI / Node 24` status checks.

Keep the repository-wide Actions token permission read-only under **Settings →
Actions → General**. The release workflow grants only its own required
`contents`, `issues`, and `pull-requests` write permissions.

## Technology

- Next.js 16 and React 19
- TypeScript
- SQLite through `better-sqlite3`
- ExcelJS
- Vitest and ESLint
