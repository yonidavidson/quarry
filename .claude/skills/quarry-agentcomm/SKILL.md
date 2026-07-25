---
name: quarry-agentcomm
description: Coordinate with other AI agents working on QUARRY through the agentcomm message bus — register a session mailbox, declare status, consume the inbox before coding, see who else is active, send task/ack/done/question messages, and hand out playtest bugs as GitHub issues. Use this at the start of every session in this repo, before claiming or reporting work, when blocked, and whenever the user mentions the bus, agentcomm, other agents, or coordinating work.
---

# Agent coordination on the bus

This repo has a message bus for AI agents. The bus is auto-detected from the git
remote (`github://yonidavidson/quarry`); override only if you must with
`AGENTCOMM_BACKEND=github://yonidavidson/quarry`.

Hooks: OpenCode uses `.opencode/plugin/agentcomm.ts` (`agentcomm hooks --harness opencode`).

## Session start — do this every time

```bash
cd "$(git rev-parse --show-toplevel)"
agentcomm register
agentcomm register --status "working #<issue> <short what>"
agentcomm inbox --json          # consume instructions BEFORE coding
agentcomm network               # who else is here + their statuses
```

The default alias is `<git-user>-<session-id>` — a mailbox unique to *this*
session. That uniqueness matters: inbox reads consume messages, so two runners
sharing an address means one steals the other's mail. Only register a stable
name with `--as` when others need to address you by role (reviewer, worker-1),
and then keep it stable. Bare commands reuse your session alias automatically.

`agentcomm describe` explains the bus; `agentcomm conventions` has the rules.

## Working the bus

- Subjects: `task` · `ack` · `done` · `revision` · `question` · `status`.
  Reply on the sender's `--thread`.
- Claim work with `register --status` plus `send --subject ack` *before* you
  start coding, so two agents don't land on the same issue.
- Keep the status current as your task changes. Stale status with no progress is
  fair game for someone else to take over.
- **Always check your inbox before reporting done** — a revision may already be
  waiting, and reporting done on top of it wastes everyone's next round.
- Stuck? Say so: `agentcomm register --status "blocked: <what you need>"`.
  Other agents' digests recruit help from that. If a digest shows someone else
  blocked and you know the answer, just send it — no need to ask the user first.
  Otherwise stay on your own task.
- One actor per mailbox. If your harness has subagents, prefer a background
  listener subagent for `wait`/inbox management (it owns the alias, or uses
  `--as <you>-bus`); keep quick sends inline.
- Route by difficulty: mechanical work → a smaller model; hard bugs →
  a smarter one, via `--subject question`.

## Handing off a playtest bug

File the issue first so there's a durable record, then assign it on the bus:

```bash
gh issue create --repo yonidavidson/quarry --title "…" --body "… repro … expected …"
agentcomm send --to <alias> --subject task --body "Fix #N: … repro … expected …"
```

For screenshot/image QA, attach the path or URL — an agent with vision reviews it.

## Closing out

```bash
agentcomm register --status "done #<n> …"
agentcomm send --to <assigner> --subject done --body "…"
```
