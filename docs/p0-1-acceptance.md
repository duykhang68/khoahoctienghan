# P0.1 — Acceptance record

Accepted 2026-11-15 (GMT+7), based on the repository owner's explicit live UAT confirmation and the following independent technical evidence.

| Migration | Result |
|---|---|
| Engineering Foundation | #118 merged; private Worker; owner verified real data refresh |
| Google Sheets Publisher | #120 merged; private Worker; owner verified VN list after independent Sheets consent |
| Editorial Studio V2 | #121 merged; private Worker; owner verified writing and preview |
| Final security | #122 merged; CI, Pages CD and live HTTP smoke passed |

- Worker source SHA: `2f1003b76d2db7d75b15e9f2035c48028f329dcd`, Cloudflare deployed 2026-11-15 05:55:46 GMT+7; active version `d35b220e-2267-4723-a7fc-c6aa50b5ddd9` at 100%. Preview URLs disabled as observed at acceptance. Subsequent main Worker source blob unchanged.
- Main CI for #122: [43651094603](https://github.com/duykhang68/khoahoctienghan/actions/runs/43651094603), 98/98 browser and 7/7 Worker tests.
- Pages release [43651209542](https://github.com/duykhang68/khoahoctienghan/actions/runs/43651209542), prepare/deploy/verify success for `bce5573c8572c0050e8ce75417bdcde11d7a4918`.
- Live security smoke [43651476224](https://github.com/duykhang68/khoahoctienghan/actions/runs/43651476224), 23/23, SHA `64d7d303f5b682ba7ad220718cacac42a8c3849d`.
- Owner explicitly confirmed all five UAT items passed: Google login; Engineering dashboard; Sheets VN list; visual Editor writing and preview; logout and direct-route login requirement. This is owner-reported acceptance, not agent impersonation.
- Wrong-account/expired/forged/preview denial tested via signed fixture regression, live anonymous/forged HTTP tests, and disabled preview configuration. No second real Google account was used. Logout clears browser cookies, not copied stateless sessions; external access tokens are separate. These documented boundaries remain.

P0.1 accepted; proceed to P1.1 per the approved roadmap. Do not weaken security or publish private drafts.
