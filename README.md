# muse-launch-check

A minimal static site built end to end through the Posterity CLI (0.11.0)
as a pre-launch exercise of the full build loop:

1. `ws create` — public workspace
2. `ws clone` + `ws branch muse/site`
3. `ws push` — three files to the branch
4. `ws cr open` — change request muse/site → main
5. `ws preview publish` — live preview of the branch
6. `ws cr merge` — merge if the rules allow

Branch under test: `muse/site`
