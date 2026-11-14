# Superseded release is not a software incident

Evidence: CD run 43573132530 failed at Reject stale release for 2693c5984ad7c1e51ea12a7adafa4cff92082e37; a later run 43573154760 succeeded for 7692499bf70a3dd8b1ec8378899e66c937fc1d82. Previous stale branch was rejected intentionally. New policy: classify legacy stale guard as SUPERSEDED once main advanced; current CD explicitly skips stale with summary instead of exit 1. Regression: tests/engineering.test.mjs. New CD runtime verification pending.
