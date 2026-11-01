# Agent collaboration documentation plan

Status: architecture draft COLLAB-1, 2026-11-02. Not implemented or released.

Use the shared [Mob vocabulary](https://github.com/xrdavies/mobd/blob/ddd731dfa64c0070345d423d9ff6add507d877cd/docs/agent-concepts.md) and
[mobd architecture](https://github.com/xrdavies/mobd/blob/ddd731dfa64c0070345d423d9ff6add507d877cd/docs/agent-collaboration.md)
as the source for future guides. The website explains the feature; collaboration
runs in mobd and the agents' existing sessions.

## Explain the feature

An agent is a named conversation with its own context. Codex, Claude Code and
Pi are agent frameworks. In A's chat, the user selects B by name or short ID
and asks A to collaborate. A sends a focused request, B can ask for clarification
and return a result, and A then continues the user's task.

mobd saves and schedules the exchange. Desktop, iOS and Android show the same
progress and let users inspect or stop work. Closing a client does not stop
collaboration; reopening recovers its current state.

## Keep the scope clear

First delivery covers existing agents on one mobd, including agents using
different frameworks. Each keeps its own conversation. Execution follows the
host's resource limits; waiting agents release their execution slots. Shared
files still require coordination, and normal permissions remain in force.

Future guides should show one complete A/B exchange and its user controls.
Automatic agent creation, cross-host communication, group chat and automatic
code merging are outside this first scope.

This is a repository planning document. Publish user-facing claims and supported
client versions only after the end-to-end behavior has been implemented and
verified. No rendered website page or deployment is part of this revision.
