# XAMPP / MySQL: safe next step

You confirmed that your authoritative database is **local XAMPP / MySQL**. We will treat that MySQL database as the source of truth. The SQLite files in this archive are development copies only unless you later confirm otherwise.

## Do not run these files against your real database

The following SQL files begin by dropping/recreating a database or are bulk-population scripts. Do not run them on the only copy of your real database:

- `CREATE-MYSQL-DATABASE.sql`
- `CREATE-DATABASE-SIMPLE.sql`
- `POPULATE-INFINITYFREE-FIXED.sql`
- Any seed/reset script that deletes existing records

The current PHP configuration references `essjt_school_system`, while another root-level connection file references `student_result_system`. This is a confirmed configuration inconsistency. We must inspect the live database before deciding which application connection is correct.

## Step 1 — make a full backup in phpMyAdmin

1. Start **Apache** and **MySQL** in XAMPP.
2. Open `http://localhost/phpmyadmin`.
3. Select the database that contains the current school records. Do not create or drop a database.
4. Choose **Export**.
5. Choose **Custom** and select all tables.
6. Choose SQL format. Keep structure and data selected.
7. Enable **Add DROP TABLE / VIEW / PROCEDURE / FUNCTION / EVENT statement** only if you are exporting a separate backup file for archival purposes; do not execute that backup file on the live database.
8. Export and store the `.sql` backup somewhere outside `htdocs`, preferably on another drive too.

Keep this full backup private. It may contain student personal information and password hashes. Do not post it publicly or send passwords.

## Step 2 — create a metadata-only audit report

This workspace includes `tools/mysql_readonly_audit.php`.

1. Copy the `tools` folder into your local XAMPP project folder under `htdocs`.
2. Open the file in a text editor on your computer.
3. Set the database name to the database selected in phpMyAdmin. The default is `essjt_school_system`.
4. Set the local MySQL username/password in the file on your own computer. Do not share the edited file or credentials.
5. Visit `http://localhost/<your-project-folder>/tools/mysql_readonly_audit.php`.
6. Save the displayed report as PDF or copy its contents into a text file.
7. Delete the audit PHP file from `htdocs` immediately after use.

The script only reads MySQL metadata and exact row counts. It does not display personal records and does not change the database. It is restricted to local browser requests.

## Step 3 — send back only the safe information

Please provide:
- The metadata audit report (not the full database export).
- The database name shown in phpMyAdmin.
- Whether your current XAMPP project is opened at `http://localhost/essjt/` or a different URL.

Do **not** upload the full database export yet. The schema and counts are enough to design the migration safely. We will request only the minimum additional data needed after reviewing it.

## What happens after the audit

1. Map the live MySQL tables to the rebuilt application's data model.
2. Identify missing/duplicate indexes and relationships.
3. Prepare a migration that runs on a **new staging database**, never directly on the live database.
4. Compare table counts and key relationships between source and staging.
5. Switch the application only after the checks pass and a rollback backup exists.

No migration has been run against your XAMPP database. This environment cannot directly access MySQL running on your computer.
