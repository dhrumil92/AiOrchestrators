# Scaling and deployment plan

The demo runs locally. This plan covers scaling to thousands of households and vendors across one state.

## 1. Planning assumptions
All figures are estimates to be replaced with real usage.

| Measure | Assumption |
|---|---|
| New requests | 10,000 a month, about 333 a day |
| Peak | 3 times the average day, about 1,000 a day |
| Active vendors | 2,000 |
| Quotes per request | 4, so 40,000 a month |
| Terrace photo | 1 per request, 3 MB |
| Voice clip | 60 seconds per request |
| AI calls per request | 7: transcript, field extraction, photo review, and 4 quote explanations |

**Result:** about 70,000 AI calls a month. At peak that is 7,000 a day, or about 12 a minute across a 10-hour day. Bursts will run higher.

## 2. Target architecture
```
Users -> CDN -> static React app
Users -> Load balancer -> API instances (stateless, 2 to 4)
                               |
              +----------------+-----------------+
              v                v                 v
       PostgreSQL        Object storage      Job queue
    primary + replica    photos              (Redis or SQS)
                                                 |
                                                 v
                                        AI workers + rate limiter
                                        Gemini / Groq
```

## 3. Database
- Move to managed PostgreSQL with backups and failover.
- Use PostGIS with a geo index, so vendors can find open requests inside a service radius.
- Index `(status, created_at)`, and foreign keys used in joins.
- Use connection pooling through PgBouncer or RDS Proxy.
- Add read replicas for vendor map traffic when needed.
- Partition or archive closed requests later. At 10,000 a month, one properly indexed PostgreSQL primary is sufficient for the expected load.

## 4. Photo storage
- Keep the same storage interface and switch from local disk to object storage.
- Browsers upload directly using short-lived signed URLs, so photos skip API servers.
- Resize photos before AI review to reduce upload size and tokens.
- Serve thumbnails through the CDN.
- Keep photos private, with signed read URLs.
- Move older photos to cheaper storage and delete them according to a set retention period.

**Growth:** 30 GB a month, or about 360 GB after a year.

## 5. Background jobs
AI calls should never hold open a web request.

1. API saves a job and returns `202 Accepted` with a job ID.
2. A worker takes the job.
3. The client polls or receives an update when complete.

Workers use retries with exponential backoff and a failed-job queue. Job keys prevent duplicates. Jobs are prioritised so interactive voice work comes before explanations.

**Not built in the demo.** AI calls run during the web request, with an in-memory rate limiter, retries and labelled fallbacks. An unused `ai_jobs` table is already in the schema. The first production step is a worker that reads it with `FOR UPDATE SKIP LOCKED`, then a move to Redis/BullMQ or SQS as volume grows.

## 6. Staying within LLM limits
Free tiers will not serve production. Published limits vary by model and plan, so check them in each provider's console.

- **Evidence from the docs:** Groq's docs list Whisper at 20 requests a minute and 2,000 a day, and two fast text models at 30 a minute and 1,000 a day. The page does not make clear which plan those figures describe. Gemini limits are shown per project in AI Studio, and daily quotas reset at midnight Pacific time.
- **Central limiter:** a token bucket per provider and model, stored in Redis, shared by all workers.
- **Queue over failure:** extra work waits rather than failing.
- **Caching:** explanations are stored by input hash. Reviews are stored per photo.
- **Batching:** explain all quotes for a request in one call, reducing 4 calls to 1. This cuts volume to about 40,000 calls a month.
- **Cheap models first:** use a small model for extraction and a stronger one only where necessary.
- **Fallback:** switch provider on failure, or show the code-only result. Core figures never need the LLM.
- **Budget guard:** alert on daily spending and stop non-essential calls at a set limit.

## 7. Hosting
Recommended: AWS Mumbai (`ap-south-1`) for low latency to Indian users and keeping data in India. The compliance position still needs review.

| Part | Service |
|---|---|
| Frontend | S3 + CloudFront |
| API and workers | ECS Fargate |
| Database | RDS PostgreSQL with PostGIS |
| Queue and rate limiter | SQS + ElastiCache Redis |
| Photos | S3 + CloudFront |
| Secrets | AWS Secrets Manager |
| Monitoring | CloudWatch + Sentry |

## 8. Rough monthly cost
Assumes 10,000 requests a month. **Infrastructure figures are planning estimates and must be checked in the AWS pricing calculator before quoting them as firm.** AI figures use published list prices checked on 1 November 2026 and assumed token counts.

| Item | Basis | Estimate |
|---|---|---|
| API and workers | 3 small containers | $100 |
| PostgreSQL | Small multi-AZ instance | $150 |
| Redis | Small node | $25 |
| Object storage and CDN | 360 GB plus delivery | $30 |
| Logs and monitoring | Basic | $30 |
| Whisper | 167 hours at $0.04 per hour | $7 |
| Photo review | Gemini Flash-Lite at $0.30/$2.50 per 1M tokens, 1,500 in + 500 out, 10,000 calls | $17 |
| Explanations | Same price, 2,000 in + 300 out, 40,000 calls | $54 |
| **Total** | | **About $415 a month** |

That is about **$0.04 per request**. Batching explanations would lower the AI line further. Gemini prices may change, so check the current price before presenting.

## 9. Reliability and security for production
- Add email verification and optional phone OTP to the existing accounts.
- Move the login lockout from server memory to Redis, so it holds across API instances.
- Verify vendors against the scheme's registered vendor list.
- Rate-limit public endpoints.
- Add audit logs for accepted quotes.
- Comply with India's DPDP Act for location, phone and photo data, with legal review.
- Version the rules config with effective dates, because tariffs and scheme rules change. Tariffs need a table per utility.
- Plan for the scheme's stated end date of 31 March 2027.

## 10. Rollout
1. **Pilot:** one city, 50 vendors, 1,000 requests. Measure actual AI calls and costs.
2. **State launch:** add worker autoscaling, PostGIS and multiple utilities.
3. **Multi-state:** add rules and tariffs per state, and more languages.
