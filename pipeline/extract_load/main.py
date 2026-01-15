import os
import dlt
from dlt.sources.sql_database import sql_database
from dlt.sources.helpers import incremental

# Tables we want from Supabase
TABLES = [
    # current state
    ("applications", "updated_at"),
    # history / logs
    ("application_status_events", "changed_at"),
    ("application_followups", "followup_at"),
    ("application_contacts", "created_at"),
    ("application_events", "created_at"),
]

def get_supabase_conn_str() -> str:
    """
    Use the Supabase Postgres connection string (Transaction pooler is best).
    Example:
    postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres
    OR pooler:
    postgresql://postgres.<ref>:<PASSWORD>@aws-0-us-west-1.pooler.supabase.com:6543/postgres
    """
    conn = os.environ.get("SUPABASE_DB_CONN")
    if not conn:
        raise RuntimeError("SUPABASE_DB_CONN is required (Supabase Postgres connection string).")
    return conn

def run():
    # dlt will load into BigQuery dataset (schema) below
    dataset = os.environ.get("BQ_DATASET_RAW", "raw_intern_tracker")

    pipeline = dlt.pipeline(
        pipeline_name="intern_tracker",
        destination="bigquery",
        dataset_name=dataset,
    )

    source = sql_database(credentials=get_supabase_conn_str())

    resources = []
    for table_name, cursor_col in TABLES:
        # incremental: only pull new/changed rows since last run
        # initial_value ensures first run loads everything
        res = source.table(
            table_name,
            incremental=incremental(cursor_col, initial_value="1970-01-01T00:00:00Z"),
        )
        # keep table names stable in destination
        res = res.with_name(table_name)
        resources.append(res)

    load_info = pipeline.run(resources)
    print(load_info)

if __name__ == "__main__":
    run()