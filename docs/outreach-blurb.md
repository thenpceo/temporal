I built the workflow I would want owning Support and Services Ops at Temporal: a durable escalation control plane that uses Temporal to orchestrate Pylon, Salesforce, Slack, and BigQuery without losing state when tools fail.

The key demo moment is intentional failure: BigQuery breaks, Temporal retries safely, the workflow keeps its state, and the ops dashboard remains trustworthy. That's the difference between fragile automation and support operations infrastructure.

3-minute Loom: _[add link]_
Repo: _[add link]_
