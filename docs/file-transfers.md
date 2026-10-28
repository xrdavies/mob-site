# File transfers documentation

Implementation branch: `feat/file-transfers`.

Add a Files guide and link it from the documentation navigation. Explain selecting the remote
machine, upload/download, the directory displayed by mobd, pause/continue and mobile foreground
limits. The site is documentation, not an authenticated transfer client. No deployment is part
of this change. The [shared contract](../../mobd/docs/file-transfers.md) is the implementation
reference; this feature requires clients and mobd that advertise `fileTransfers`.
