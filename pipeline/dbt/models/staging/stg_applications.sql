with src as (
  select
    cast(id as string) as application_id,
    cast(user_id as string) as user_id,
    company,
    coalesce(company_normalized, lower(company)) as company_normalized,
    role,
    role_level,
    status,
    cast(date_applied as date) as date_applied,
    cast(next_followup as date) as next_followup,
    job_url,
    location,
    notes,
    source_site,
    followup_status,
    last_followed_up_at,
    outcome_reason,
    rejection_stage,
    created_at,
    updated_at,
    status_updated_at
  from {{ source('raw', 'applications') }}
)
select * from src