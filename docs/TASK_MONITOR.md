# Task monitor (`packages/cortico-world-codex-monitor/src/index.ts`)

The optional task-monitor World is developed, tested and packaged in this Coopanion fork. It is a workspace dependency of the app and is copied into packaged app runtimes by `scripts/pack.ts`. `scripts/stage.ts` compiles it before assembling the app. No sibling checkout is required.

`core/companion.ts` injects the desktop pet's `dialog()` as a bubble sink, alongside its readiness check. The World is disabled by default. Its default notification mode is `status` when this host sink is supplied and `model` when installed independently in an unmodified host. Collection, settings, task panels and state persistence live entirely in the package.

## Release routes

- **Plugin package:** run `pnpm run pack:monitor`; distribute `dist/cortico-world-codex-monitor-0.2.0.zip` and `.tgz` as assets in this fork's GitHub Releases. A plugin-specific tag such as `task-monitor-v0.2.0` keeps plugin releases distinct from the application's upstream tags.
- **Extension market:** publish this package to npm. The official index [Pal-AI-Lab/cortico-extensions](https://github.com/Pal-AI-Lab/cortico-extensions) documents npm as the extension source. A `[sync] cortico-world-codex-monitor` issue requests immediate catalog refresh after publication. Tag or certification changes are separate maintainer requests. A market listing does not require moving the source into another repository.
- **Upstream PR:** propose the optional World and host assembly to `Pal-AI-Lab/Coopanion`. This makes the direct, model-free bubble sink available as part of the host. Acceptance is an upstream product decision: current `docs/DEVELOPMENT.md` reserves ordinary app UI for bound Worlds, while third-party Worlds use model events or their own environment. No vendor/Cortico modification is included.

The npm/GitHub release and upstream PR are separate actions. Build and tests create local artifacts only. No public publication or PR has been performed.

## Validation

`pnpm run test:worlds` includes the package's parser, lifecycle, deduplication, summary and localization tests. `pnpm run typecheck:worlds` covers the source and tests. The normal application checks still apply. Installation can be checked by loading the unpacked tgz with the pinned Cortico `loadExtensions` and `dryMountWorld` in a temporary extension directory.

See the package's [English README](../packages/cortico-world-codex-monitor/README.md) and [中文说明](../packages/cortico-world-codex-monitor/README_zh.md) for operation, privacy and coverage.

## Fork validation

The fork checks `test`, `test:worlds`, `typecheck`, `typecheck:web` and `typecheck:worlds` pass. The monitor suite includes 23 tests, with eleven UI locales checked. A tgz unpacked outside the workspace passes the pinned extension loader and dry-mount checks with no warnings or failures, then collects a real temporary log and stops without HTTP access.

`pnpm run start:monitor` starts the fork's development app using `scratch/task-monitor-data`; `pnpm run create:monitor-app` creates its local macOS launcher. Existing development configuration was retained when switching the local runtime to this checkout. The generated launcher is excluded from Git.
