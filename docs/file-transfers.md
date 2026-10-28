# File transfers documentation

Implementation branch: `feat/file-transfers`.

The Files guide at `/files/` is linked from the documentation navigation. It covers selecting the remote
machine, upload/download, the directory displayed by mobd, pause/continue and mobile foreground
limits. The site is documentation, not an authenticated transfer client. No deployment is part
of this change. The [shared contract](https://github.com/xrdavies/mobd/blob/feat/file-transfers/docs/file-transfers.md) is the implementation
reference; this feature requires clients and mobd that advertise `fileTransfers`.
