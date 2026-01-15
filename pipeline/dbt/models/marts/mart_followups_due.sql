select
  application_id,
  user_id,
  company,
  role,
  status,
  next_followup,
  followup_status,
  case
    when next_followup is null then null
    when next_followup < current_date() then "overdue"
    when next_followup = current_date() then "due_today"
    when next_followup <= date_add(current_date(), interval 7 day) then "due_next_7_days"
    else "later"
  end as followup_bucket
from {{ ref('stg_applications') }}
where next_followup is not null
order by next_followup asc