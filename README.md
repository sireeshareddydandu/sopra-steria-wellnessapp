# Workplace Wellness Ticket Management

A Flask application for employee workplace concern submissions, employee ticket tracking, a Super Admin workspace, and department-specific ticket queues.

## Included features
- Employee concern submission form and private receipt link.
- Ticket IDs by department (FAC, TRANS, FIRE, HYGIENE, ENV, OTHER).
- Employee ticket tracking using ticket ID and registered email.
- Super Admin: form configuration, all tickets, ticket updates, comments, CSV export, and clear-submissions control.
- Department Admin: read/write access to tickets in their own department only; can view employee request details, update status/priority/assignment/due date, add progress updates and comments.
- Server-side department authorization on ticket list, updates, and comments.
- SQLite schema migration adds new ticket fields without deleting existing records.
- Responsive ServiceNow-inspired ticket table.

## Run on Windows
1. Extract this folder to a normal local directory.
2. Double-click `run_windows.bat`, or run these commands in PowerShell from this folder:
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe app.py
   ```
3. Open `http://127.0.0.1:5000` for the employee form.
4. Open `http://127.0.0.1:5000/admin/login` for administrators.
5. On first run, `.env` is generated with unique credentials for the Super Admin and each department admin. Read credentials locally from `.env`; never send or commit that file.

## First-run accounts
- Super Admin username: `admin` (password generated into `.env`).
- Department usernames: `facilities_admin`, `transport_admin`, `fire_admin`, `hygiene_admin`, `environment_admin`, `other_admin` (each password generated into `.env`).
- All accounts use the same sign-in page and redirect to their allowed workspace.

Department paths: `/admin/facilities`, `/admin/transport`, `/admin/fire`, `/admin/hygiene`, `/admin/environment`, `/admin/other`.

## Important data and deployment notes
- The app stores data in `data/forms_app.sqlite3`. Back up the `data` folder before replacing or upgrading a working installation.
- This ZIP intentionally does not include `.env` or the `data` folder. Extracting it does not overwrite your existing project. To migrate existing data, stop the old app and copy your backed-up database into the new folder's `data` folder only after backing it up.
- On Render free instances, local SQLite storage may be ephemeral. Use a persistent disk or managed database before relying on the service for production tickets.
- For public deployment, use HTTPS and a production WSGI server. Set `COOKIE_SECURE=1` behind HTTPS. Keep `.env` private.
- Test with a sample ticket from each department before production use.
