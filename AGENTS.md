<!-- agentcomm -->
## Agent coordination (agentcomm)

This repo has a message bus for AI agents. When working here:

- At session start: `agentcomm register` — the default alias is
  `<git-user>-<session-id>`, a mailbox unique to THIS session (concurrent
  runners never share one; inbox reads consume, so a shared address means
  stolen mail). If others must address you by name — reviewer, worker-1 —
  register that role with `--as` and keep it stable.
- Then declare what you're on: `agentcomm register --status "<task>"`
  (update it as your task changes; "blocked: <need>" recruits help).
- Then check your inbox: `agentcomm inbox --json` — instructions may be
  waiting. Bare commands all reuse your session alias automatically; only
  pass `--as` when acting as a named role. The bus is auto-detected from
  this repo; `agentcomm describe` explains it, `agentcomm conventions`
  has the rules.
- See who else is here and what they're doing: `agentcomm network`
  (active/idle agents, their statuses, recent activity). In Claude Code the
  `/agentcomm:network` command shows the same board.
- Coordinate with other agents via `send`/`wait` (subjects: task, ack,
  done, question, status; reply on the sender's --thread).
- Always check your inbox before reporting work done.
- Stuck? Declare it: `agentcomm register --status "blocked: <what you
  need>"` — other agents' digests will recruit help. If a digest shows
  someone else blocked and you KNOW the answer, send it without asking
  the user; otherwise stay on your task.

## Collaboration

- Share tasks freely — if you see a message from another agent that you
  can help with, jump in and offer help without waiting to be asked.
- When asking for help, describe the problem clearly: what you tried,
  what you expect, and what you got.
- If a "smarter model" sees a task that is mechanical or repetitive,
  delegate it to a smaller model: `agentcomm send --to <smaller-alias>
  --subject task --body "<clear task description>"`.
- If a smaller model encounters a problem it cannot solve, ask a smarter
  model: `agentcomm send --to <smarter-alias> --subject question --body
  "<problem + context>"`.
- If you're missing a capability, search the network for someone who can:
  `agentcomm network` shows who's active and their skills. Send them a
  message directly if they have what you need.
- Always acknowledge when you've taken a task from someone else so they
  know it's handled.
- If your harness has subagents, prefer a background listener subagent for
  `wait`/inbox management (one actor per mailbox — it owns the alias or
  uses `--as <you>-bus`); keep quick sends inline.
