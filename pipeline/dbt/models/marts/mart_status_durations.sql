with events as (
  select
    application_id,
    user_id,
    to_status,
    changed_at,
    row_number() over (partition by application_id, to_status order by changed_at) as rn
  from {{ ref('stg_status_events') }}
),
first_status as (
  select application_id, user_id, changed_at as applied_at
  from events
  where to_status = 'Applied' and rn = 1
),
first_interview as (
  select application_id, changed_at as interview_at
  from events
  where to_status = 'Interview' and rn = 1
),
first_offer as (
  select application_id, changed_at as offer_at
  from events
  where to_status = 'Offer' and rn = 1
)
select
  a.application_id,
  a.user_id,
  a.company,
  a.role,
  a.date_applied,
  s.applied_at,
  i.interview_at,
  o.offer_at,
  if(i.interview_at is null or s.applied_at is null, null,
     timestamp_diff(i.interview_at, s.applied_at, day)) as days_to_interview,
  if(o.offer_at is null or s.applied_at is null, null,
     timestamp_diff(o.offer_at, s.applied_at, day)) as days_to_offer
from {{ ref('stg_applications') }} a
left join first_status s using(application_id, user_id)
left join first_interview i using(application_id)
left join first_offer o using(application_id)