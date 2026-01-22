import os
import dlt
from sqlalchemy import create_engine, text

TABLES = [
    ("applications", "updated_at"),
    ("application_status_events", "changed_at"),
    ("application_followups", "followup_at"),
    ("application_contacts", "created_at"),
    ("application_events", "created_at"),
]

def get_engine():
    conn = os.environ.get("SUPABASE_DB_CONN")
    if not conn:
        raise RuntimeError("SUPABASE_DB_CONN is required")
    return create_engine(conn)

@dlt.resource
def postgres_table(table_name: str, cursor_col: str):
    engine = get_engine()

    # Read pipeline state (watermark)
    state = dlt.current.pipeline_state()
    key = f"{table_name}_{cursor_col}_last_value"
    last_value = state.get(key, "1970-01-01T00:00:00Z")

    query = text(f"""
        SELECT *
        FROM {table_name}
        WHERE {cursor_col} > :last_value
        ORDER BY {cursor_col}
    """)

    max_seen = last_value

    with engine.connect() as conn:
        for row in conn.execute(query, {"last_value": last_value}).mappings():
            value = row[cursor_col]
            if value and value > max_seen:
                max_seen = value
            yield dict(row)

    # Persist watermark
    state[key] = max_seen

def run():
    pipeline = dlt.pipeline(
        pipeline_name="intern_tracker",
        destination="bigquery",
        dataset_name=os.environ.get("BQ_DATASET_RAW", "raw_intern_tracker"),
    )

    resources = [
        postgres_table(table, cursor)
        for table, cursor in TABLES
    ]

    info = pipeline.run(resources)
    print(info)

if __name__ == "__main__":
    run()
       
