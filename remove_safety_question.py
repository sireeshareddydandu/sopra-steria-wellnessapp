import sqlite3, json, shutil, datetime, os, sys

db = os.path.join(os.path.dirname(__file__), "data", "forms_app.sqlite3")
backup = db + ".before_remove_safety_question_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S") + ".bak"
shutil.copy2(db, backup)
print("Database backup:", backup)

conn = sqlite3.connect(db)
try:
    rows = conn.execute("SELECT id, config_json FROM form_settings").fetchall()
    targets = []
    for row_id, raw in rows:
        config = json.loads(raw)
        if any(field.get("id") == "safety_concern_details" for field in config.get("fields", [])):
            targets.append((row_id, config))

    print("Matching form configurations:", len(targets))
    if not targets:
        print("STOP: target field not found; no configuration changed.")
        sys.exit(1)

    conn.execute("BEGIN IMMEDIATE")
    for row_id, config in targets:
        config["fields"] = [
            field for field in config.get("fields", [])
            if field.get("id") != "safety_concern_details"
        ]
        conn.execute(
            "UPDATE form_settings SET config_json = ? WHERE id = ?",
            (json.dumps(config, ensure_ascii=False), row_id)
        )
    conn.commit()

    remaining = conn.execute("SELECT config_json FROM form_settings").fetchall()
    configs = [json.loads(row[0]) for row in remaining]
    removed = all(
        not any(f.get("id") == "safety_concern_details" for f in c.get("fields", []))
        for c in configs
    )
    print("Question removed:", removed)
    print("Other fields preserved:", all(len(c.get("fields", [])) == 6 for c in configs))
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()
