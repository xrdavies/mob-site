# Agent terminology and collaboration documentation plan

Status: draft COLLAB-1, 2026-11-02. Not implemented or released.

The pinned [Mob vocabulary](https://github.com/xrdavies/mobd/blob/7db3f83c218bcf3ac7c9a3b75bbae5c3929f6c28/docs/agent-concepts.md) and
[mobd collaboration contract](https://github.com/xrdavies/mobd/blob/7db3f83c218bcf3ac7c9a3b75bbae5c3929f6c28/docs/agent-collaboration.md)
are authoritative. The website describes the Mob design and released behavior;
it does not define a separate collaboration protocol or host agent execution.

## Terminology for future public copy

| Term | Use in guides |
| --- | --- |
| Agent framework | Codex, Claude Code or Pi; the software running the agent |
| Agent | A named collaborator with a stable identity and its own context |
| Conversation / session | That agent's chat/history view; one-to-one in the initial delivery |
| Turn | One execution, which can finish while a collaboration request stays open |
| Collaboration request | A specific question/work item with attributable replies and a result |

Use “Choose an agent framework” for new-chat runtime selection and “Mention an
agent” for selecting an existing conversation. Do not describe a framework name
as the unique identity of a collaborator. Implementation compatibility names
such as `defaultAgent` are documented in the canonical vocabulary, not copied
into product prose as a second definition.

## Guide scope after release

Explain a concrete exchange: in UI agent A's chat, select Interface agent B,
ask A to confirm an API shape, observe B's clarification and final answer,
then see A continue. Screenshots must show real released clients.

Cover:

- Search by name or unique short ID; duplicate names require selection. Rename
  preserves references, while deletion makes the old link unavailable.
- A mention identifies a collaborator. The current agent sends a focused
  request when instructed; it does not broadcast the entire chat automatically.
- First delivery is between existing agents on one mobd. Frameworks can differ.
- Receipt, queued processing, clarification, final answer and user-goal completion
  are different. A result recorded before a normal turn exit is still finishing.
- Busy agents process messages at turn boundaries. One shared-desktop slot still
  works because waiting agents end their turns; notices/progress alone do not
  launch a new run. No instant-response or unlimited-parallelism claim.
- Work continues in mobd when clients disconnect; clients recover saved state.
  This does not promise delivery of mobile push notifications.
- Stop current turn, cancel a request and pause automatic continuation have
  different scopes. Interrupted or uncertain work needs explicit recovery;
  reconnecting does not blindly repeat external actions.
- Long conversations load bounded history and request detail. Agent messages
  carry necessary context and references rather than copying whole transcripts.
- Participants retain their normal permissions. Peer messages cannot grant human
  approval. Shared files/desktops still require coordination.

Use the canonical request states: `open`, `answered`, `needs_attention`,
`failed`, `cancelled`, `expired`. Explain waiting/processing as derived labels.
Do not advertise automatic agent creation, nested delegation, cross-host
collaboration, group chat, code isolation/merging or runtime steering as COLLAB-1.

## Release and repository responsibilities

This change adds repository planning documentation and a README entry only.
It does not add rendered pages, product navigation, screenshots, download
requirements or claims that collaboration is available.

After mobd and each supported client pass their shared acceptance cases,
document the minimum released versions and `agentCollaboration` capability.
Show the actual supported client matrix; do not infer mobile readiness from a
Desktop release. Link the released Mob guides and terminology, with examples
using stable identities instead of transient list numbers.

When rendered pages are added, review the relevant start/configure/remote/FAQ
copy and privacy wording for peer-message persistence and local cached copies.
Do not imply that entire conversations are automatically shared or that an
additional relay/cloud component is required for same-mobd communication.
Run the existing site build/link/content checks for that publication.

Pushing a documentation branch does not deploy Pages. Merging to main invokes
the existing Pages workflow, even if the new planning Markdown is not rendered;
the normal publication approval still applies. This plan itself is not release
evidence or an implementation test result.
