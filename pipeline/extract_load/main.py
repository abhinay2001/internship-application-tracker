import os
import dlt
from sqlalchemy import create_engine, text

TABLES = [
    "applications",
    "application_status_events",
    "application_followups",
    "application_contacts",
    "application_events",
]

def get_engine():
    conn = os.environ.get("SUPABASE_DB_CONN")
    if not conn:
        raise RuntimeError("SUPABASE_DB_CONN is required")
    return create_engine(conn)

@dlt.resource
def postgres_table(table_name: str):
    engine = get_engine()
    query = text(f"SELECT * FROM {table_name}")

    with engine.connect() as conn:
        for row in conn.execute(query).mappings():
            yield dict(row)

def run():
    pipeline = dlt.pipeline(
        pipeline_name="intern_tracker",
        destination="bigquery",
        dataset_name=os.environ.get("BQ_DATASET_RAW", "raw_intern_tracker"),
    )

    resources = [postgres_table(t) for t in TABLES]
    info = pipeline.run(resources)
    print(info)

if __name__ == "__main__":
    run()