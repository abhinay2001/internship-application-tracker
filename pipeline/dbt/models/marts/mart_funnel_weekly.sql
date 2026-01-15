with apps as (
  select
    date_trunc(date_applied, week(monday)) as week_start,
    status,
    count(*) as applications
  from {{ ref('stg_applications') }}
  group by 1,2
)
select * from apps
order by week_start desc, status