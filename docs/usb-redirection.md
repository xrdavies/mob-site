# USB redirection documentation notes

Status: USB-2, 2026-11-06. Implemented and documented at `/usb/` (USB devices): a Linux office
computer imports a device shared from Mob Desktop on macOS. A macOS office computer waits for
Apple's USB host-controller entitlement; Windows is not supported.

The [mobd USB design](https://github.com/xrdavies/mobd/blob/main/docs/usb-redirection.md)
is the canonical contract. Keep `/usb/` in line with it and with the apps on `main`.

## What `/usb/` must keep saying

- The office computer must run Linux and `sudo mobd usb setup` once; `mobd usb status` reports
  readiness. Phones neither share devices nor control shares.
- From a Mac, only devices macOS's own drivers do not hold can be shared (many debug probes,
  boards, DFU bootloaders); isochronous devices and hubs are not supported anywhere.
- Stopping detaches first; a mounted drive needs **Detach anyway**, which can lose writes.
  Quitting, unplugging, connection loss or revoked pairing cut the device off; interrupted
  writes or flashes are not resumed.
- USB sharing is not [file transfer](file-transfers.md): copying a file to a drive does not
  need it.
- Do not promise end-to-end encryption through a terminating gateway, require disabling system
  security, or say the Apple entitlement was requested or granted until mobd's
  [runbook](https://github.com/xrdavies/mobd/blob/main/docs/apple-usb-entitlement.md) records it.
