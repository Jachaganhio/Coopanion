# 任务监控 World（`src/index.ts`）

本包在 Coopanion fork 的 `packages/cortico-world-codex-monitor` 中开发，读取本机 Codex Desktop 与 Claude Desktop Code 标签页的任务日志。开启 World 即开始采集，关闭即停止；重新开启不会补弹停用期间的通知。

## 安装

从 fork 的 Release 附件下载并解压插件 ZIP。在原版 Coopanion 0.2.13 的「高级模式 → 扩展 → World → 本机目录」选择解压后的插件目录，安装并按提示重启，然后启用 `codex-monitor`。

本 fork 已内置同一个 World，默认关闭，直接在 World 列表启用即可；不要重复安装相同 ID 的插件。发布包是编译后的 JavaScript，使用宿主运行时，无第三方运行时依赖，不需要终端、独立 Bridge 或另外安装 Node。

## 提醒与数据

直接气泡提醒为一句纯文本，连同来源名称最多 50 个 Unicode 字符。移除 Markdown 和引用元数据，保留失败、尚未验证等关键信息。完整本地答复仍可在任务面板查看；模型提醒也会收到使用同一句简短文本的要求。


独立插件默认 `model`：将包含脱敏答复摘录的事件交给已配置的模型，由 Coo 判断如何提醒；需要模型连接，可能消耗额度。`status` 只显示任务列表，不投递模型提醒事件。模型调用任务查询工具时，返回的任务和答复也会进入模型上下文。

本 fork 由宿主注入 `BubbleSink`，内置装配默认 `status`，直接显示零模型气泡。上游 World API 6 没有公开的桌宠直接通知接口，单独安装插件不会为原版增加这个接口。

配置页可修改提醒方式、开始提示、项目名和日志目录。目录留空时使用 `CODEX_HOME` 或 `~/.codex`，以及 `CLAUDE_CONFIG_DIR` 或 `~/.claude`。修改目录后停用再启用。状态保存在宿主数据目录的 `codex-monitor/` 中，升级时保留。

只读取任务日志，不读取认证文件，不保存 Prompt 和工具参数。新结束轮次的答复会截断并按常见凭据模式脱敏后保存；脱敏不能覆盖全部敏感信息。首次启动及重新启用只静默导入历史状态，不保存历史答复。

仅支持本机主会话。Claude 覆盖 Code 标签页，不包含普通聊天、Cowork、云端或 SSH 会话。完成表示明确轮次结束，不代表代码质量验证通过。日志没有对应证据时，不猜测权限弹窗、取消或失败。

## 开发和发布

在 fork 根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm run test:worlds
pnpm run typecheck:worlds
pnpm run pack:monitor
```

`dist/` 输出 tgz、ZIP 和 SHA-256 校验文件。源码和包元数据都指向此 fork。构建不会自动创建 GitHub Release 或发布 npm。

本包 MIT；宿主改动继续遵守 Coopanion 的 AGPL-3.0-or-later。参见 [English](README.md)。
