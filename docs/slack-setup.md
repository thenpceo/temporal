# Slack setup — incoming webhook (5 min) and full bot (15 min)

Two paths. Start with the webhook — it's enough for the demo. The bot path unlocks more impressive moments (slash commands, reactions, threaded updates) if you have time before the recording.

---

## Path 1: Incoming webhook (5 minutes)

This is what the code already supports. Set one env var and Slack messages go live.

### Step 1 — Create the Slack app

1. Open https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name: `Service Ops Command Center` (or anything)
4. Workspace: pick the demo workspace
5. Click **Create App**

### Step 2 — Enable incoming webhooks

1. In the left sidebar, click **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to On
3. Scroll down, click **Add New Webhook to Workspace**
4. Pick the channel you want messages to post to (`#service-ops-demo` is a good default; create it first if needed)
5. Click **Allow**
6. Copy the **Webhook URL** — looks like `https://hooks.slack.com/services/T.../B.../...`

### Step 3 — Wire it up

In `temporal-service-ops-command-center/.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

Restart the worker (`npm run temporal:worker`). Next time you seed a ticket, Slack will get the real post and you can see it in the channel during the demo.

The current adapter at `src/adapters/slack.ts` already detects the env var and POSTs JSON. No code changes needed.

### What this gives you

- One-way: workflow → Slack
- Real message in the channel the hiring manager can see during the Loom
- Demo moment: "and here it is hitting Slack live"

### What this doesn't give you

- No slash commands (`/escalate`)
- No buttons inside the message (Approve / Edit / Mark exec-visible)
- No replying-in-thread updates as the workflow progresses
- No reactions triggering signals (`👀` → mark exec-visible)

For those, go to Path 2.

---

## Path 2: Full bot (15 minutes, ~30 lines of code to add)

This unlocks the *real* "this is what support ops in Slack looks like" demo. Two-way conversation between Slack and Temporal.

### What this enables

- **Slash command**: A CSM types `/escalate acme-ai latency spike` and a workflow starts
- **Interactive buttons**: The escalation message has `[Approve draft] [Edit] [Mark exec-visible]` buttons that fire Temporal signals
- **Threaded updates**: Each new phase (triage complete, draft generated) posts as a reply in the same thread
- **Reactions = signals**: A CSM clicks 🚨 on the message → it fires `markExecVisible`

### Step 1 — Create the Slack app (same as Path 1, steps 1-2)

You'll add more features to the same app.

### Step 2 — Add bot scopes

In the app's left sidebar, **OAuth & Permissions** → **Bot Token Scopes** → add:

- `chat:write` — post messages
- `chat:write.public` — post to channels the bot isn't in (optional)
- `commands` — needed for slash commands
- `reactions:read` — needed if you want reactions to trigger signals
- `channels:history` — needed for `reactions:read` to work

Scroll up, click **Install to Workspace**, then **Allow**.

Copy the **Bot User OAuth Token** (`xoxb-...`).

### Step 3 — Add the signing secret

In **Basic Information** → **App Credentials**, copy the **Signing Secret**. You'll use it to verify Slack's webhook signatures so attackers can't forge requests.

### Step 4 — Set up the slash command

In the left sidebar, click **Slash Commands** → **Create New Command**:

- Command: `/escalate`
- Request URL: `https://<your-public-url>/api/slack/commands` (see Step 6 for tunneling)
- Short description: `Start a support escalation workflow`
- Usage hint: `<account> <issue summary>`

Save.

### Step 5 — Set up interactivity (for buttons + reactions)

In the left sidebar, click **Interactivity & Shortcuts**:

- Toggle **Interactivity** to On
- Request URL: `https://<your-public-url>/api/slack/interactions`

Save.

If you want reactions-as-signals, click **Event Subscriptions** → toggle on → Request URL: `https://<your-public-url>/api/slack/events` → under **Subscribe to bot events**, add `reaction_added`. Save.

### Step 6 — Expose your local server

Slack needs a public URL to reach your localhost. Use ngrok or Cloudflare Tunnel:

```bash
brew install ngrok    # or: brew install cloudflared
ngrok http 3000        # or: cloudflared tunnel --url http://localhost:3000
```

Copy the public URL (`https://abc123.ngrok.io`) and paste into the three Request URL fields in steps 4-5. **Re-paste it every time you restart the tunnel** — the URL changes.

### Step 7 — Add the env vars

In `temporal-service-ops-command-center/.env`:

```bash
SLACK_WEBHOOK_URL=                # remove or comment out; we're using bot token instead
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_DEFAULT_CHANNEL=C0XXXXXX    # the channel ID (right-click channel → Copy → Channel ID)
```

### Step 8 — Wire the API routes

Add these three routes — about 30 lines of code total. They aren't built yet but here's the skeleton:

```ts
// src/app/api/slack/commands/route.ts
// Handles /escalate slash command → starts SupportEscalationWorkflow
export async function POST(req: Request) {
  // 1. Verify Slack signature using SLACK_SIGNING_SECRET (HMAC-SHA256)
  // 2. Parse form-encoded body: { command, text, user_name, channel_id }
  // 3. Call startSupportEscalation({ ticketId: "ticket-acme-latency-001", source: "pylon" })
  // 4. Respond 200 within 3s with a "starting workflow..." message
}

// src/app/api/slack/interactions/route.ts
// Handles button clicks on escalation messages → fires Temporal signals
export async function POST(req: Request) {
  // 1. Verify signature
  // 2. Parse JSON body (Slack sends form-encoded payload=<json>)
  // 3. action.action_id determines which signal:
  //    - "approve_draft" → signalWorkflow(wfId, "approveDraft")
  //    - "mark_exec_visible" → signalWorkflow(wfId, "markExecVisible")
  // 4. Optionally update the original message via response_url
}

// src/app/api/slack/events/route.ts
// Handles reaction_added events → fires signals
export async function POST(req: Request) {
  // 1. Handle URL verification challenge (Slack sends once when you save the URL)
  // 2. Verify signature
  // 3. If event.type === "reaction_added" and reaction matches:
  //    - 🚨 → markExecVisible
  //    - ✅ → resolveCase
  // 4. Look up the workflowId from the message's metadata or thread_ts
}
```

The signing-secret verification is the only non-trivial part — Slack signs each request with HMAC-SHA256 over `v0:<timestamp>:<body>` using the signing secret. Use [`@slack/web-api`](https://www.npmjs.com/package/@slack/web-api) for posting and [`@slack/bolt`](https://www.npmjs.com/package/@slack/bolt) if you want the framework to do signature verification for you.

### Step 9 — Update the Slack adapter to use the bot token

Replace the webhook POST in `src/adapters/slack.ts` with:

```ts
import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

await slack.chat.postMessage({
  channel: process.env.SLACK_DEFAULT_CHANNEL!,
  text: message,
  blocks: [
    // ... rich block kit with buttons:
    {
      type: "actions",
      block_id: `wf:${state.workflowId}`,
      elements: [
        { type: "button", action_id: "approve_draft", text: { type: "plain_text", text: "Approve draft" }, style: "primary" },
        { type: "button", action_id: "mark_exec_visible", text: { type: "plain_text", text: "Mark exec-visible" } },
      ],
    },
  ],
});
```

### What this gives you for the demo

- A CSM types `/escalate acme-ai` in Slack → workflow starts. Camera moves to Temporal UI showing the new workflow.
- Message arrives in Slack with `[Approve draft]` button. Click it → Temporal signal fires → workflow advances → confirmation lands in the same thread.
- The hiring manager sees that this is *the support ops surface*, not a demo dashboard.

---

## Demo recording recommendation

For the 3-minute Loom:

1. **Use Path 1** if you have <30 min before recording. Real Slack post in the channel is plenty.
2. **Use Path 2** if you can spend an evening. The slash-command-to-signal round trip is what makes hiring managers sit up.

Either way, **make sure `#service-ops-demo` is open in a Chrome tab during the recording** so the audience can see the message actually arrive.

---

## Common gotchas

- **3-second response timeout on slash commands.** Slack expects a 200 within 3 seconds. Don't start the Temporal workflow synchronously and wait for it — respond immediately with `{ "text": "Starting workflow..." }` and fire-and-forget the workflow start.
- **ngrok URL rotates on free tier.** Pay $8/mo for a static subdomain, or use Cloudflare Tunnel (free, static URL).
- **Reactions fire one event per click and one per un-click.** Filter on `event.type === "reaction_added"`, not `reaction_changed`.
- **Channel IDs vs names.** Use the channel ID (`C0XXXXXX`) in `chat.postMessage`, not the name (`#service-ops-demo`). Some workspaces with retention policies reject name-based posts.
- **Don't commit `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET`.** They're in `.gitignore` via `.env` but double-check.

---

## What we already have

The code at `src/adapters/slack.ts` already:
- Detects `SLACK_WEBHOOK_URL` and POSTs to it if set
- Falls back to logging the message to stdout if no webhook
- Formats the message with risk label, SLA, account tier, recommended action, workflow link

So Path 1 needs zero code changes — just the env var. Path 2 needs the 3 API routes plus the bot-token migration in the adapter.
