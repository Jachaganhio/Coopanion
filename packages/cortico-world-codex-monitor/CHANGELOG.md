# Changelog (`package.json`)

## 0.2.3

- Prepare the standalone npm package for the extension market with application, extra-setup, experimental and private-data tags.
- Align the packaged tool self-description with the runtime declaration.
- Document market installation and clarify that Coo decides the final wording and delivery of model notifications.

## 0.2.2

- Pin Codex rollout ownership to the first session header and exclude internally attributed turns, including copied parent history in subagent logs.
- Rescan legacy cursors and remove misattributed internal task notifications.
- Deliver live events collected during activation instead of silently baselining them away.
- Confirm Claude completion through matching Desktop result metadata when Stop hooks are absent.
- Honor model mode with a host bubble sink and preserve late or heading-only failure statements in short notices.

## 0.2.1

- Show one plain-text notification sentence within 50 Unicode characters, including the source name.
- Remove Markdown, tables, code fences, citations and presentation directives from notifications.
- Preserve negative verification in brief summaries and reformat older stored excerpts on delivery.
- Supply the same concise sentence to model notifications; retain full local answers separately.

## 0.2.0

- Collect local Codex Desktop and Claude Desktop Code task states inside the World lifecycle.
- Persist cursors, suppress historical notifications and show local task panels.
- Configure model notifications or status-only operation.
- Accept an optional host bubble sink for direct notifications.
- Build and test the package in the Coopanion fork; ship compiled JavaScript and eleven UI languages.
