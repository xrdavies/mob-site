# File transfers documentation

The Files guide at `/files/` is linked from the documentation navigation. It covers selecting the remote
machine, upload/download, the shared folder (`filesDir`, default `~/mob-files`), pause/continue and mobile foreground
limits. The site is documentation, not an authenticated transfer client. No deployment is part
of this change. The [shared contract](https://github.com/xrdavies/mobd/blob/main/docs/file-transfers.md) is the implementation
reference; this feature requires clients and mobd that advertise `fileTransfers`.
