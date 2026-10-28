# Task Monitor World (`src/index.ts`)

This package lives in the Coopanion fork at `packages/cortico-world-codex-monitor`. It watches local Codex Desktop and Claude Desktop Code sessions. The World owns collection and notification cursors: enabling starts it, disabling stops it, and re-enabling does not replay disabled-period notifications.

## Install

Download and extract the plugin ZIP from the fork's release assets. In an unmodified Coopanion 0.2.13, open Advanced mode → Extensions → World → Local directory, select the extracted package, install, restart when prompted, and enable `codex-monitor`.

This fork already bundles the same World, disabled by default. Enable it in Worlds; do not install a second copy with the same ID. The compiled package uses the host runtime and has no third-party runtime dependencies. It needs no terminal, separate Bridge, or Node installation.

## Notifications and data

Direct bubble notifications contain one plain-text sentence of at most 50 Unicode characters, including the source name. Markdown and citation metadata are removed; failures and unverified results are retained when present. The full local answer remains available in the task panel. Model notifications request the same brief sentence.


The standalone package defaults to `model`: events, including sanitized answer excerpts, go to the configured model, which decides how to notify. This requires a model connection and may consume quota. `status` shows the task list without pushing model events. The task query tool can also place returned task data and answers in model context.

This fork injects a host-owned `BubbleSink` into the bundled World and defaults to `status`, displaying bubbles without model calls. Upstream World API 6 has no public direct pet-notification interface; installing the package in the original app does not add that interface.

The settings group controls notification mode, start notices, project names and local data roots. Empty roots use `CODEX_HOME` or `~/.codex`, and `CLAUDE_CONFIG_DIR` or `~/.claude`. Stop and restart the World after changing a root. State persists in the host data directory under `codex-monitor/`.

The collector reads session logs only. It stores task metadata and truncated, sanitized answers from new completed turns; it does not store prompts or tool arguments and does not read authentication files. Credential redaction is best effort. First activation and reactivation silently import historical state without storing historical answers.

Only directly initiated local main sessions are supported; subagent files and internally attributed turns are excluded even when they contain copied parent history. Claude coverage is the Desktop Code tab, not chat, Cowork, cloud or SSH sessions. Completion means an explicit turn end, not verified code quality. Claude completion requires either a clean Stop summary or a successful-turn Desktop session record whose last assistant UUID and post-turn result pointer both match the transcript. Missing or stale metadata remains unconfirmed. The default Desktop metadata root is the system application-data directory for Claude; `claudeDesktopHome` can override it. A custom Claude log root needs an explicit Desktop metadata root for that fallback. Permission dialogs and interrupts without a corresponding log event cannot be inferred.

## Build and distribution

From the fork root:

```sh
pnpm install --frozen-lockfile
pnpm run test:worlds
pnpm run typecheck:worlds
pnpm run pack:monitor
```

`dist/` contains the tgz, ZIP and SHA-256 checksums. Repository metadata points to this fork. npm publication and GitHub Releases are separate release actions; no public release is created by the build.

License: MIT for this package; Coopanion host changes remain AGPL-3.0-or-later. See [中文说明](README_zh.md).
