import os
import dlt
from sqlalchemy import create_engine, text
from dlt.sources.helpers import incremental

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
    inc = incremental(cursor_col, initial_value="1970-01-01T00:00:00Z")

    with engine.connect() as conn:
        query = text(f"""
            SELECT *
            FROM {table_name}
            WHERE {cursor_col} > :last_value
            ORDER BY {cursor_col}
        """)
        result = conn.execute(query, {"last_value": inc.last_value})
        for row in result.mappings():
            inc.advance(row[cursor_col])
            yield dict(row)

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