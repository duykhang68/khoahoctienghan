#!/usr/bin/env bash
# Owner only: apply once after exact-head CI of the engineering PR is green.
set -euo pipefail
repo=duykhang68/khoahoctienghan
command -v gh >/dev/null; command -v jq >/dev/null
[[ "$(gh api user --jq .login)" == duykhang68 ]] || { echo 'Authenticate as repository owner first.' >&2; exit 1; }
[[ "$(gh api "repos/$repo" --jq .default_branch)" == main ]] || exit 1
rules=$(gh api "repos/$repo/rulesets")
existing=$(jq -r '.[]|select(.name=="Engineering Culture 2.0 — main")|.id' <<< "$rules")
if [[ -n "$existing" ]]; then
 echo "Existing Engineering Culture ruleset $existing; inspect, do not overwrite."
elif [[ "$(jq length <<< "$rules")" != 0 ]]; then
 echo 'Other rulesets exist. Refusing to overwrite or stack rules; review first.' >&2; exit 1
else
 sha=$(gh api "repos/$repo/git/ref/heads/main" --jq .object.sha)
 app=$(gh api "repos/$repo/commits/$sha/check-runs?per_page=100" --jq '[.check_runs[]|select(.name=="Content and Astro build" and .app.slug=="github-actions" and .conclusion=="success")|.app.id]|first // empty')
 [[ "$app" =~ ^[0-9]+$ ]] || { echo 'No verified GitHub Actions check on main; stop.' >&2; exit 1; }
 jq -n --argjson app "$app" '{name:"Engineering Culture 2.0 — main",target:"branch",enforcement:"active",bypass_actors:[],conditions:{ref_name:{include:["refs/heads/main"],exclude:[]}},rules:[{type:"deletion"},{type:"non_fast_forward"},{type:"required_linear_history"},{type:"pull_request",parameters:{allowed_merge_methods:["squash"],dismiss_stale_reviews_on_push:true,require_code_owner_review:false,require_last_push_approval:false,required_approving_review_count:0,required_review_thread_resolution:true}},{type:"required_status_checks",parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:"Content and Astro build",integration_id:$app}]}}]}' | gh api -X POST "repos/$repo/rulesets" --input - --jq '{id,name,enforcement}'
fi
gh repo edit "$repo" --enable-auto-merge --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false --delete-branch-on-merge --allow-update-branch --squash-merge-commit-message pr-title --enable-secret-scanning --enable-secret-scanning-push-protection
gh api "repos/$repo/rules/branches/main" --jq 'map(.type)'
gh api "repos/$repo" --jq '{default_branch,allow_auto_merge,allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge,security_and_analysis}'
