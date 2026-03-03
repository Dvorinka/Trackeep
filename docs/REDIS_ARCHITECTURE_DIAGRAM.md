# Redis Architecture Diagram for Trackeep

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Web App    │  │ Browser Ext  │  │   Mobile     │  │   API Keys   │    │
│  │  (React)     │  │              │  │   (Future)   │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                                    │
                              HTTP/WebSocket
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                         LOAD BALANCER / REVERSE PROXY                       │
│                         (Nginx / Traefik - Future)                          │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
┌─────────▼─────────┐    ┌──────────▼──────────┐   ┌─────────▼─────────┐
│  Trackeep Backend │    │  Trackeep Backend   │   │  Trackeep Backend │
│    Instance 1     │◄──►│     Instance 2      │◄─►│    Instance N     │
│   (Go/Gin)        │    │    (Go/Gin)         │   │   (Go/Gin)        │
└─────────┬─────────┘    └──────────┬──────────┘   └─────────┬─────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
          ┌─────────▼──────────┐      ┌─────────────▼──────────────┐
          │      REDIS         │      │       PostgreSQL           │
          │   (Cache Layer)    │      │    (Primary Database)      │
          │                    │      │                            │
          │ ┌───────────────┐  │      │  ┌──────────────────────┐  │
          │ │   Sessions    │  │      │  │      users           │  │
          │ │   (Hash)      │  │      │  │   bookmarks          │  │
          │ ├───────────────┤  │      │  │     tasks            │  │
          │ │    Cache      │  │      │  │     notes            │  │
          │ │   (String)    │  │      │  │     files            │  │
          │ ├───────────────┤  │      │  │   messages           │  │
          │ │ Rate Limiting │  │      │  │   analytics          │  │
          │ │  (Sorted Set) │  │      │  │   marketplace        │  │
          │ ├───────────────┤  │      │  │     ...              │  │
          │ │ Leaderboards  │  │      │  └──────────────────────┘  │
          │ │  (Sorted Set) │  │      └────────────────────────────┘
          │ ├───────────────┤  │
          │ │   Pub/Sub     │  │      ┌──────────────────────────────┐
          │ │   Channels    │◄─┼──────┤  YouTube Scraper Service     │
          │ └───────────────┘  │      │       (Python)               │
          └────────────────────┘      └──────────────────────────────┘
```

## Data Flow Patterns

### 1. Session Management Flow

```
┌──────────┐     Login Request      ┌──────────────┐
│  Client  │ ─────────────────────► │   Backend    │
└──────────┘                        └──────┬───────┘
                                           │
                                           │ Create Session
                                           ▼
                                    ┌──────────────┐
                                    │    Redis     │
                                    │  tk:session  │
                                    │  :{sessionID}│
                                    └──────┬───────┘
                                           │
                                           │ Store Session Data
                                           │ (TTL: 24h)
                                           ▼
┌──────────┐     Session Cookie     ┌──────────────┐
│  Client  │ ◄───────────────────── │   Backend    │
└────┬─────┘                        └──────────────┘
     │
     │ Subsequent Requests
     │ with Session Cookie
     ▼
┌──────────┐     Validate Session   ┌──────────────┐
│  Client  │ ─────────────────────► │   Backend    │
└──────────┘                        └──────┬───────┘
                                           │
                                           │ Lookup Session
                                           ▼
                                    ┌──────────────┐
                                    │    Redis     │
                                    │  (O(1) get)  │
                                    └──────┬───────┘
                                           │
                                           │ Session Valid
                                           ▼
                                    ┌──────────────┐
                                    │   Response   │
                                    └──────────────┘
```

### 2. Caching Flow (Search Results)

```
┌──────────┐    Search Request     ┌──────────────┐
│  Client  │ ────────────────────► │   Backend    │
└──────────┘                       └──────┬───────┘
                                          │
                                          │ Check Cache
                                          ▼
                                   ┌──────────────┐
                                   │    Redis     │
                                   │  tk:search   │
                                   │  :{hash}     │
                                   └──────┬───────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                        Cache Hit                Cache Miss
                              │                       │
                              ▼                       ▼
                       ┌────────────┐        ┌────────────────┐
                       │  Return    │        │  Query         │
                       │  Cached    │        │  PostgreSQL    │
                       │  Results   │        │  (Multiple     │
                       │  (Fast)    │        │   Tables)      │
                       └────────────┘        └───────┬────────┘
                                                     │
                                                     │ Results
                                                     ▼
                                              ┌──────────────┐
                                              │   Cache      │
                                              │   Results    │
                                              │  (TTL: 5min) │
                                              └──────┬───────┘
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │   Return     │
                                              │   Results    │
                                              └──────────────┘
```

### 3. Rate Limiting Flow

```
┌──────────┐      API Request       ┌──────────────┐
│  Client  │ ─────────────────────► │   Backend    │
│ (IP: x)  │                        └──────┬───────┘
└──────────┘                               │
                                           │ Check Rate Limit
                                           ▼
                                    ┌──────────────┐
                                    │    Redis     │
                                    │  tk:rl:{IP}  │
                                    │  (Sorted Set)│
                                    └──────┬───────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                        Within Limit               Limit Exceeded
                              │                         │
                              ▼                         ▼
                       ┌────────────┐          ┌──────────────┐
                       │  Update    │          │  Return 429  │
                       │  Counter   │          │  Too Many    │
                       │  (ZADD)    │          │  Requests    │
                       └─────┬──────┘          └──────────────┘
                             │
                             ▼
                      ┌────────────┐
                      │  Process   │
                      │  Request   │
                      └────────────┘

Time Window Visualization (Sliding Window):

  T-60s    T-30s    NOW
    │        │       │
    ▼        ▼       ▼
  [req1]   [req2]  [req3]  <-- Current window
            │       │  │
           Expired  │  │
                    Valid requests counted
```

### 4. Real-Time Pub/Sub Flow (Multi-Instance)

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEBSOCKET CONNECTIONS                       │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Client 1 │    │ Client 2 │    │ Client 3 │    │ Client 4 │  │
│  │(User A)  │    │(User B)  │    │(User A)  │    │(User C)  │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       │      ┌────────┴────────┐      │               │         │
│       └─────►│   Backend 1     │◄─────┘               │         │
│              │  (Go/Gin)       │                       │         │
│              │                 │                       │         │
│              │  In-Memory Hub  │                       │         │
│              │  (Local Users)  │                       │         │
│              └────────┬────────┘                       │         │
│                       │                                │         │
│                       │        ┌──────────────┐        │         │
│                       └───────►│    Redis     │◄───────┘         │
│                                │    Pub/Sub   │                  │
│                       ┌────────┤   Channel    ├────────┐         │
│                       │        └──────────────┘        │         │
│                       │               │                │         │
│              ┌────────┴────────┐      │       ┌────────┴────────┐│
│              │   Backend 2     │◄─────┘       │   Backend 3     ││
│              │  (Go/Gin)       │              │  (Go/Gin)       ││
│              │                 │              │                 ││
│              │  In-Memory Hub  │              │  In-Memory Hub  ││
│              │  (Local Users)  │              │  (Local Users)  ││
│              └────────┬────────┘              └────────┬────────┘│
│                       │                                │         │
│              ┌────────┴────────┐              ┌────────┴────────┐│
│              │ Client 5        │              │ Client 6        ││
│              │ (User B)        │              │ (User A)        ││
│              └─────────────────┘              └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘

Message Flow:
1. Client 1 (Backend 1) sends message
2. Backend 1 stores in PostgreSQL
3. Backend 1 publishes to Redis channel
4. All backends receive message via subscription
5. Each backend forwards to connected local clients
6. All participants receive real-time update
```

### 5. Leaderboard Update Flow

```
┌──────────┐   Challenge Action    ┌──────────────┐
│  Client  │ ────────────────────► │   Backend    │
└──────────┘                       └──────┬───────┘
                                          │
                                          │ Record Score
                                          ▼
                                   ┌──────────────┐
                                   │    Redis     │
                                   │  tk:challenge│
                                   │  :{id}:lb    │
                                   │  (ZADD score)│
                                   └──────┬───────┘
                                          │
                                          │ Update Rank
                                          ▼
┌──────────┐    Get Leaderboard    ┌──────────────┐
│  Client  │ ────────────────────► │   Backend    │
└──────────┘                       └──────┬───────┘
                                          │
                                          │ ZREVRANGE
                                          ▼
                                   ┌──────────────┐
                                   │    Redis     │
                                   │  Top N Ranks │
                                   │  (O(log N))  │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Leaderboard │
                                   │   Response   │
                                   └──────────────┘

Data Structure:
┌─────────────────────────────────────────────────────┐
│  Redis Sorted Set: tk:challenge:123:leaderboard    │
├─────────────────────────────────────────────────────┤
│  Member (UserID)    │  Score     │  Rank          │
├─────────────────────┼────────────┼────────────────┤
│  42                 │  1500      │  1             │
│  17                 │  1200      │  2             │
│  89                 │  980       │  3             │
│  23                 │  750       │  4             │
│  ...                │  ...       │  ...           │
└─────────────────────┴────────────┴────────────────┘
```

## Component Interactions

### Backend Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TRACKEEP BACKEND (Go/Gin)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Session    │  │   Cache      │  │    Rate      │              │
│  │   Store      │  │  Middleware  │  │   Limiter    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                         │
│                   ┌───────▼────────┐                                │
│                   │  Redis Client  │                                │
│                   │   (go-redis)   │                                │
│                   └───────┬────────┘                                │
│                           │                                         │
│         ┌─────────────────┼─────────────────┐                       │
│         │                 │                 │                       │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                 │
│  │   String    │  │    Hash     │  │  Sorted Set │                 │
│  │  (Cache)    │  │  (Session)  │  │  (Ranking)  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │    Pub/Sub   │  │    Set       │                                │
│  │ (Real-time)  │  │  (Tracking)  │                                │
│  └──────────────┘  └──────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Fallback Strategy:
┌─────────────────────────────────────────────────────────────────────┐
│  if Redis unavailable:                                              │
│    ├─► Sessions  → Fallback to in-memory map                        │
│    ├─► Cache     → Skip cache, query DB directly                    │
│    ├─► Rate Limit→ Skip rate limiting (log warning)                 │
│    └─► Pub/Sub   → Local-only WebSocket (limited functionality)     │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Scenarios

### Scenario 1: Single Node (Development)

```
┌─────────────────────────────────────────────────────┐
│                  Docker Host                        │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   Frontend   │  │    Backend   │                │
│  │    (Nginx)   │  │   (Go/Gin)   │                │
│  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                         │
│         │                 │                         │
│         │        ┌────────┴────────┐               │
│         │        │      Redis      │               │
│         │        │  (Single Node)  │               │
│         │        └────────┬────────┘               │
│         │                 │                         │
│         │        ┌────────┴────────┐               │
│         └───────►│   PostgreSQL    │               │
│                  │  (Single Node)  │               │
│                  └─────────────────┘               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Scenario 2: High Availability (Production)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Docker Swarm / Kubernetes                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Load Balancer                               │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                 │
│         │                        │                        │                 │
│  ┌──────▼──────┐        ┌────────▼────────┐      ┌───────▼───────┐         │
│  │  Backend 1  │◄──────►│    Backend 2    │◄────►│   Backend 3   │         │
│  └──────┬──────┘        └────────┬────────┘      └───────┬───────┘         │
│         │                        │                        │                 │
│         └────────────────────────┼────────────────────────┘                 │
│                                  │                                          │
│                    ┌─────────────▼─────────────┐                           │
│                    │      Redis Sentinel       │                           │
│                    │  ┌─────┐ ┌─────┐ ┌─────┐ │                           │
│                    │  │ M1  │◄►│ R1  │◄►│ R2  │ │                           │
│                    │  └──┬──┘ └──┬──┘ └──┬──┘ │                           │
│                    │     └───────┴───────┘    │                           │
│                    │         S1  S2  S3        │                           │
│                    └───────────────────────────┘                           │
│                                  │                                          │
│                    ┌─────────────▼─────────────┐                           │
│                    │    PostgreSQL Cluster     │                           │
│                    │  ┌─────┐ ┌─────┐ ┌─────┐ │                           │
│                    │  │ P1  │◄►│ S1  │◄►│ S2  │ │                           │
│                    │  └─────┘ └─────┘ └─────┘ │                           │
│                    └───────────────────────────┘                           │
│                                                                             │
│  Legend: M=Master, R=Replica, S=Sentinel, P=Primary                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Memory Allocation Strategy

```
Redis Memory Budget (256MB Example):

┌────────────────────────────────────────────────────────────────┐
│ Total: 256MB                                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Sessions (30%)                                   77 MB   │  │
│ │ ├── Active user sessions (TTL: 24h)                      │  │
│ │ └── User session index sets                              │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Cache (50%)                                     128 MB   │  │
│ │ ├── Search results (TTL: 5m)                             │  │
│ │ ├── Analytics dashboards (TTL: 15m)                      │  │
│ │ ├── API responses (TTL: varies)                          │  │
│ │ └── AI recommendations (TTL: 1h)                         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Rate Limiting (10%)                              26 MB   │  │
│ │ ├── Per-IP tracking windows                              │  │
│ │ └── Token bucket state                                   │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Real-time / Other (10%)                          25 MB   │  │
│ │ ├── Leaderboards                                         │  │
│ │ ├── Pub/Sub buffers                                      │  │
│ │ └── Miscellaneous                                        │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

Eviction Policy: allkeys-lru
- Least Recently Used keys evicted first when memory limit reached
- Sessions have longer TTL to prevent premature eviction
- Cache entries have shorter TTL for frequent refresh
```

## Key Naming Convention

```
Hierarchical Key Structure:

┌────────────────────────────────────────────────────────────────────┐
│  Format: tk:{resource}:{id}:{attribute}:{context}                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  SESSIONS                                                          │
│  ├── tk:session:{session_id}              → SessionData (JSON)    │
│  └── tk:user:sessions:{user_id}           → Set of session IDs    │
│                                                                    │
│  CACHE                                                             │
│  ├── tk:cache:search:{user_id}:{hash}     → SearchResponse       │
│  ├── tk:cache:analytics:{user_id}:{type}  → AnalyticsData        │
│  ├── tk:cache:user:{id}:profile           → UserProfile          │
│  └── tk:cache:marketplace:trending        → TrendingItems        │
│                                                                    │
│  RATE LIMITING                                                     │
│  ├── tk:rl:{ip}:general                   → SortedSet (timestamps)│
│  ├── tk:rl:{ip}:search                    → SortedSet             │
│  ├── tk:rl:{ip}:ai                        → Token bucket state    │
│  └── tk:rl:{ip}:upload                    → Token bucket state    │
│                                                                    │
│  LEADERBOARDS                                                      │
│  ├── tk:challenge:{id}:leaderboard        → SortedSet (scores)    │
│  └── tk:marketplace:trending:{period}     → SortedSet (views)     │
│                                                                    │
│  REAL-TIME                                                         │
│  ├── tk:messages:{conversation_id}        → Pub/Sub channel       │
│  ├── tk:notifications:{user_id}           → Pub/Sub channel       │
│  └── tk:events:system                     → Pub/Sub channel       │
│                                                                    │
│  COUNTERS                                                          │
│  ├── tk:counter:views:{content_type}:{id} → Integer              │
│  └── tk:counter:downloads:{item_id}       → Integer              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Hash Function for Long Keys:
- MD5 or SHA1 for query parameters
- First 8-12 chars of hash usually sufficient
- Example: tk:cache:search:1234:a7f3d2c9b1e8
```

## Performance Characteristics

```
Operation Complexities:

┌────────────────────┬─────────────┬─────────────┬─────────────────────┐
│ Operation          │ Time (Big O)│ Memory      │ Use Case            │
├────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ GET                │ O(1)        │ O(1)        │ Session retrieval   │
│ SET                │ O(1)        │ O(1)        │ Cache storage       │
│ DEL                │ O(1)        │ O(1)        │ Cache invalidation  │
│ EXPIRE             │ O(1)        │ O(1)        │ TTL management      │
├────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ HGET               │ O(1)        │ O(1)        │ Session field get   │
│ HSET               │ O(1)        │ O(1)        │ Session field set   │
│ HGETALL            │ O(N)        │ O(N)        │ Full session read   │
├────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ ZADD               │ O(log N)    │ O(1)        │ Add score           │
│ ZREVRANGE          │ O(log N + M)│ O(M)        │ Get top N ranks     │
│ ZRANK              │ O(log N)    │ O(1)        │ Get user rank       │
│ ZSCORE             │ O(1)        │ O(1)        │ Get user score      │
├────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ PUBLISH            │ O(N+M)      │ O(1)        │ Send message        │
│ SUBSCRIBE          │ O(1)        │ O(1)        │ Listen channel      │
├────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ KEYS *             │ O(N)        │ O(N)        │ DEBUG ONLY          │
│ SCAN               │ O(1)        │ O(1)        │ Iteration           │
└────────────────────┴─────────────┴─────────────┴─────────────────────┘

N = Number of elements
M = Number of returned elements

Performance Targets:
┌────────────────────┬──────────────┬────────────────┐
│ Metric             │ Target       │ Measurement    │
├────────────────────┼──────────────┼────────────────┤
│ Cache hit latency  │ < 1ms        │ p99            │
│ Cache miss latency │ < 5ms        │ p99            │
│ Session read       │ < 2ms        │ p99            │
│ Session write      │ < 3ms        │ p99            │
│ Rate limit check   │ < 1ms        │ p99            │
│ Pub/Sub latency    │ < 5ms        │ p99            │
│ Leaderboard query  │ < 10ms       │ p99 (top 100)  │
└────────────────────┴──────────────┴────────────────┘
```

## Monitoring Points

```
Key Metrics to Track:

┌──────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE                                                   │
│ ├── Memory Usage %           Alert: > 80%                        │
│ ├── Connected Clients        Alert: > 80% of max                 │
│ ├── Blocked Clients          Alert: > 0 (indicates slow ops)     │
│ └── Uptime                   Alert: < 99.9%                      │
│                                                                  │
│ PERFORMANCE                                                      │
│ ├── Commands/sec             Track: Trending                     │
│ ├── Hit Rate %               Alert: < 80%                        │
│ ├── Miss Rate %              Track: Trending                     │
│ ├── Evicted Keys/sec         Alert: > 100/min                    │
│ └── Expired Keys/sec         Track: Trending                     │
│                                                                  │
│ ERRORS                                                           │
│ ├── Rejected Connections     Alert: > 0                          │
│ ├── Keyspace Misses          Track: vs Hits                      │
│ ├── Slow Queries (>10ms)     Alert: > 10/min                     │
│ └── Replication Lag          Alert: > 1s                         │
│                                                                  │
│ APPLICATION                                                      │
│ ├── Session Store Latency    Alert: > 5ms p99                    │
│ ├── Cache Hit Ratio          Alert: < 75%                        │
│ ├── Rate Limit Accuracy      Track: vs Expected                  │
│ └── Pub/Sub Delivery Time    Alert: > 10ms p99                   │
└──────────────────────────────────────────────────────────────────┘
```
