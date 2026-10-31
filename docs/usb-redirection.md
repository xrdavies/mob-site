# USB redirection documentation plan

Status: draft USB-1, 2026-11-01. Not implemented or released.

The [mobd USB design](https://github.com/xrdavies/mobd/blob/main/docs/usb-redirection.md)
is the canonical contract. Mob Desktop exports a selected local USB device and
mobd imports it through USB/IP over an authenticated, encrypted reverse tunnel,
using open-source implementations only. Do not advertise USB redirection as a
shipping Mob feature based on this planning document.

## Scope and release wording

The first receiver is Linux, with Linux/Windows exporters and a tested subset
of macOS exporters. Windows and macOS receivers are later validation milestones.
Drives, serial boards, DFU devices and debug probes are test targets, not universal
support claims. The first delivery excludes camera/audio isochronous traffic,
hubs and phone/tablet USB export/import.

The site is documentation and downloads, not an authenticated USB client or
WebUSB bridge. No USB page, marketing claim, product navigation entry or download
dependency is added to the public site by this draft. README/docs changes alone
do not mean a feature has been released. Pushing main still triggers the existing
Pages workflow even when the changed draft is not included in rendered pages.

## Future user guide

After a tested release, document:

- Supported local OS/device and remote OS/driver combinations, exact minimum
  releases, helper installation/permissions and readiness errors. Successful
  enumeration alone is not evidence of working flash/debug/storage support.
- Desktop device selection, paired destination, exclusive ownership, active-share
  status and safe release. Chat/video changes do not terminate or retarget a share;
  sleep, quit/crash, unplug, network loss and revocation can terminate it.
- Storage flush/unmount, unsafe-disconnect risk and bootloader re-enumeration.
  Reconnecting does not resume interrupted writes/flashing automatically.
- The difference between USB redirection and existing [file exchange](file-transfers.md):
  saving a download to a mounted drive is not remote USB/block-device access.
- iOS/Android can use the remote workspace but do not own or forward Desktop's
  device session. There is no mobile Share USB feature in this scope.

Use mobd's canonical support matrix and capability meaning. Do not invent a
second set of session states, promise end-to-end encryption through a terminating
gateway, require disabling system security, or recommend a proprietary backend.

## Apple release gate and links

The [mobd Apple entitlement runbook](https://github.com/xrdavies/mobd/blob/main/docs/apple-usb-entitlement.md)
owns the application for `com.apple.developer.usb.host-controller-interface` on
the receiving Mac. It includes the official references, Feedback Assistant entry
point and application materials. An existing Developer ID certificate or
notarization does not grant this capability. Do not duplicate submission status
or imply that every end user must apply; link to the maintainer-owned runbook.

Publish a macOS-import support claim only after the authorized signed package and
real hardware pass acceptance. Validate future guide links and feature wording
against the released clients/mobd using the existing site checks when rendered
pages are actually changed.
