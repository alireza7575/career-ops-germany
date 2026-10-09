# German-market screening rules (optional example)

Copy or merge these rules into modes/_custom.md in your own data root. Keep your identity, location policy, salary targets and role preferences in config/profile.yml and modes/_profile.md.

## Scan screening

- Run the enabled direct boards and focused search_queries in portals.yml. Agent-led web searches are separate from scan.mjs; report inaccessible or unscanned sources explicitly.
- Resolve promising aggregator listings to the employer's original posting where available. Check liveness and deduplicate against the tracker and pipeline.
- Before calling a lead suitable, compare the live job description with the candidate's approved experience, spoken languages, location policy and hard stops. An English advert does not establish that German is optional; Homeoffice does not establish fully remote work or Germany hiring eligibility.
- Preserve uncertain leads as pending. Report verified suitable roles separately from raw title-filter hits and skipped leads; never invent candidate experience.
- For shortlisted roles, consult Kununu for employer reviews and salary context. Cite the exact employer and role/location when available; treat anonymous reviews and estimates as context, not established facts about the vacancy.
