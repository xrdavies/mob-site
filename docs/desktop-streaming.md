# Live desktop over WebRTC: website plan

Status: **draft**, branch `feat/webrtc-stream`. Design: [mobd desktop streaming](https://github.com/xrdavies/mobd/blob/feat/webrtc-stream/docs/desktop-streaming.md).

mobd stops using macOS Screen Sharing; the live desktop is streamed by mobd itself (WebRTC, with a
WebSocket fallback for Funnel and HTTPS gateways). The site changes when the apps are ready and merges
with them at release.

| Page | Change |
| --- | --- |
| `src/start.html` 03 / PERMISSIONS | Remove "turn on Screen Sharing"; keep Accessibility and Screen Recording |
| `src/start.html` 05 / PAIR | Remove Desktop sign-in; add **Live view quality: Auto / High / Low** |
| `src/start.html` remote access | Funnel and gateways use the WebSocket fallback automatically; Tailscale on the phone gives the best picture |
| `src/start.html` FAQ | Live view at the lock or login screen is not available yet; Ubuntu support is planned |
| `src/download.html` requirements | Drop Screen Sharing from "系统权限" |

Verified by `npm test`, `npm run build`, and screenshots at phone, tablet and desktop widths.
