import os
import dlt
from dlt.sources.sql_database.sql_database import sql_database
from dlt.sources.helpers import incremental

TABLES = [
    ("applications", "updated_at"),
    ("application_status_events", "changed_at"),
    ("application_followups", "followup_at"),
    ("application_contacts", "created_at"),
    ("application_events", "created_at"),
]

def get_supabase_conn_str() -> str:
    conn = os.environ.get("SUPABASE_DB_CONN")
    if not conn:
        raise RuntimeError("SUPABASE_DB_CONN environment variable is required.")
    return conn

def run():
    dataset = os.environ.get("BQ_DATASET_RAW", "raw_intern_tracker")

    pipeline = dlt.pipeline(
        pipeline_name="intern_tracker",
        destination="bigquery",
        dataset_name=dataset,
    )

    source = sql_database(credentials=get_supabase_conn_str())

    resources = []
    for table_name, cursor_col in TABLES:
        res = source.table(
            table_name,
            incremental=incremental(
                cursor_col,
                initial_value="1970-01-01T00:00:00Z",
            ),
        )
        resources.append(res.with_name(table_name))

    info = pipeline.run(resources)
    print(info)

if __name__ == "__main__":
    run()