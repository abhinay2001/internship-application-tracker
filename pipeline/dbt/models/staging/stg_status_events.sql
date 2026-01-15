select
  cast(id as string) as status_event_id,
  cast(application_id as string) as application_id,
  cast(user_id as string) as user_id,
  from_status,
  to_status,
  changed_at,
  source
from {{ source('raw', 'application_status_events') }}