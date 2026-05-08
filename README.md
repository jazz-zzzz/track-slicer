# Album Extractor

把演唱会录音切成规范的专辑曲目。输入一份音频 + 手写时间戳，输出带封面和元数据的 FLAC / ALAC。

---

## 目录

- [解决什么问题](#解决什么问题)
- [使用场景](#使用场景)
- [安装](#安装)
- [快速开始](#快速开始)
- [命令详解](#命令详解)
- [Manifest 字段说明](#manifest-字段说明)
- [作为 Claude Code Skill 使用](#作为-claude-code-skill-使用)
- [项目结构](#项目结构)
- [限制](#限制)
- [许可证](#许可证)

## 解决什么问题

你有整场演唱会的录音，也手写了每首歌的开始时间，但——

- 曲名是凭记忆写的，不一定对
- 手动 ffmpeg 切几十首歌太累
- 切出来的文件没封面、没标签，Apple Music 不认

Album Extractor 把这三件事自动化：**搜索官方曲目表 → 生成可审查的曲目清单 → 一键切分编码**。

## 使用场景

| 场景 | 输入 | 输出 |
|------|------|------|
| 无损音频 + 时间戳 → Apple Music | `source.flac` + `timestamps.md` + `cover.jpg` | `ALAC/*.m4a`（带封面，即拖即用） |
| 无损音频 → 本地存档 | `source.flac` + `timestamps.md` | `tracks/*.flac`（无损，留作母本） |
| 视频源（蓝光/TS/MKV） | `source.mkv` + `timestamps.md` + `cover.jpg` | 自动提取音频轨 → FLAC + ALAC |
| 已有歌词想嵌入 | 以上 + 歌词文件（`.lrc` / `.txt`） | 每首曲目嵌入静态歌词文本 |
| 完全离线（不联网） | 本地材料，不加 `--online` | 跳过在线搜索，仅用本地清洗 |

**不支持：** 没有时间戳的录音、录音室专辑（已经分好轨的）、纯歌词 LRC 时间轴同步。

## 安装

```bash
git clone https://github.com/jazz-zzzz/album-extractor.git
cd album-extractor
npm install
```

**前置依赖：**

- [Node.js](https://nodejs.org/) ≥ 18
- [ffmpeg](https://ffmpeg.org/) — 设置 `FFMPEG_HOME` 环境变量指向 ffmpeg 所在目录，或放 `ffmpeg.exe` 到 `~/Downloads/`

验证安装：

```bash
node tool.js          # 应输出用法提示
npm test              # 全部测试通过
```

## 快速开始

### 第一步：准备材料

在 `../albums/<专辑名>/` 下放入：

```
albums/SAKANAQUARIUM 2024 turn/
├── source.flac          # 完整音频文件
├── cover.jpg            # 封面图（建议 ≥ 1000×1000）
└── timestamps.md        # 手写时间戳
```

`timestamps.md` 格式自由，每行包含 `HH:MM:SS` 和曲名即可。曲名可以模糊，后续会自动规范化：

```markdown
00:02:34 Ame(B)
00:07:02 陽炎
00:11:49 アイデンティティ
00:22:05 青い
01:56:56 MC
02:05:49 白波トップウォーター
02:19:00 シャンディガフ
```

> MC 段落也会被切分出来——不会丢掉。标签里会标记 `isNonMusic: true`。

### 第二步：生成 Manifest

```bash
node tool.js manifest "../albums/SAKANAQUARIUM 2024 turn" --online
```

这条命令会：
1. 自动发现目录中的音频文件、封面、时间戳
2. 解析时间戳，切出每首歌的开始位置
3. 若指定 `--online`，会通过 Genius 搜索歌词
4. 生成 `manifest.json`，包含每首歌的原始曲名和待确认的规范化曲名

**不必指定 `--online`** 如果只是想快速本地切分。不加此标志则跳过联网搜索，只做本地清洗。

### 第三步：审查 Manifest

打开生成的 `manifest.json`，检查每一项：

```json
{
  "artist": "サカナクション",
  "albumTitle": "SAKANAQUARIUM 2024 turn",
  "approved": false,
  "tracks": [
    {
      "rawTitle": "Ame(B)",
      "normalizedTitle": "Ame(B)",
      "evidenceUrl": "https://...",
      "startTime": "00:02:34",
      "isNonMusic": false,
      "notes": ""
    }
  ]
}
```

关键操作：
- 核对每首歌的 `normalizedTitle` 是否正确
- 若 AI 未能匹配，手动填入正确标题
- 确认无误后，将 `"approved"` 设为 `true`

### 第四步：构建

```bash
node tool.js build --manifest "../albums/SAKANAQUARIUM 2024 turn/manifest.json"
```

构建过程：
- 10-worker 并行处理，每首歌同时出 FLAC 和 ALAC
- FLAC → `tracks/`，无损压缩级别 8
- ALAC → `ALAC/`，封面以 `attached_pic` disposition 嵌入，Apple Music 可识别
- 歌词（如有）嵌入为静态文本标签
- 覆盖式输出——重复运行会刷新所有文件

输出结构：

```
albums/SAKANAQUARIUM 2024 turn/
├── source.flac
├── cover.jpg
├── timestamps.md
├── manifest.json
├── tracks/
│   ├── 01_Ame(B).flac
│   ├── 02_陽炎.flac
│   └── ...
└── ALAC/
    ├── 01_Ame(B).m4a
    ├── 02_陽炎.m4a
    └── ...
```

### 第五步：导入 Apple Music（可选）

```bash
cp -r "../albums/SAKANAQUARIUM 2024 turn/ALAC/"*.m4a \
  "$HOME/Music/Apple Music/Media/Automatically Add to Apple Music/"
```

macOS 上 Apple Music 会自动导入该文件夹中的文件。Windows 用户手动拖入即可。

## 命令详解

### `manifest` — 生成曲目清单

```
node tool.js manifest <album-dir> [--artist <name>] [--online]
node tool.js manifest --artist <name> --album <title> --source <path> --timestamps <path> --cover <path> [--output <dir>] [--online]
```

两种模式：

| 模式 | 用法 | 说明 |
|------|------|------|
| 目录模式 | `manifest <album-dir>` | 自动发现目录中所有素材 |
| 显式模式 | `manifest --artist ... --album ... --source ...` | 手动指定每个文件的路径 |

参数：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--artist` | 显式模式必填 | 艺人名 |
| `--album` | 显式模式必填 | 专辑名 |
| `--source` | 显式模式必填 | 音频/视频文件路径 |
| `--timestamps` | 显式模式必填 | timestamps.md 路径 |
| `--cover` | 显式模式必填 | 封面图路径 |
| `--output` | 选填 | 输出目录（默认：源文件同目录） |
| `--online` | 选填 | 启用 Genius 搜索。不加则离线模式 |

### `build` — 切分并编码

```
node tool.js build --manifest <manifest.json>
```

前置条件：manifest 中 `"approved": true`。未审批的 manifest 构建会报错退出。

## Manifest 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `approved` | boolean | 构建前必须为 `true` |
| `artist` | string | 艺人名 |
| `albumTitle` | string | 专辑标题 |
| `albumEvidenceUrl` | string \| null | 官方专辑标题来源 URL |
| `year` | number \| null | 演出年份 |
| `wantsLyrics` | boolean | 是否尝试嵌入歌词 |
| `notes` | string | 专辑级备注 |
| `tracks[].rawTitle` | string | 时间戳原文，不可修改 |
| `tracks[].normalizedTitle` | string | 规范化后的曲名 |
| `tracks[].startTime` | string | 开始时间 `HH:MM:SS` |
| `tracks[].endTime` | string \| null | 结束时间（下一首的开始） |
| `tracks[].isNonMusic` | boolean | MC / 谈话标记 |
| `tracks[].evidenceUrl` | string \| null | 曲名来源 URL |
| `tracks[].lyricText` | string \| null | 静态歌词文本 |
| `tracks[].notes` | string | 该曲目的备注/警告 |

## 作为 Claude Code Skill 使用

本仓库即是一个 [Claude Code](https://claude.ai/code) skill。克隆后创建 junction：

```powershell
# 删除旧链接（如有）
cmd /c rmdir "$env:USERPROFILE\.claude\skills\album-extractor"

# 创建新 junction 指向本地仓库
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.claude\skills\album-extractor" `
  -Target "<你克隆到的路径>\album-extractor"
```

之后在任何目录打开 Claude Code，说「处理 albums/ 下这张专辑」即可触发。`git pull` 后 skill 自动更新。

## 项目结构

```
├── SKILL.md          ← Skill 定义，AI agent 的行为契约
├── tool.js           ← CLI 入口（manifest / build）
├── src/
│   ├── build-album.js    ← 10-worker 并行构建
│   ├── discover-album.js ← 自动发现专辑素材
│   ├── ffmpeg.js         ← ffmpeg 调用封装
│   ├── manifest.js       ← manifest 读写
│   ├── parse-timestamps.js ← 时间戳解析
│   ├── research.js       ← Genius 歌词搜索
│   └── verify.js         ← 输出校验
├── tests/
├── CLAUDE.md
└── AGENTS.md
```

## 限制

- 不修改原始文件，所有输出写入新目录
- FLAC ↔ ALAC 是容器转换，无质量损失
- 必须有 `timestamps.md`
- 视频源（`.mkv` `.mp4` `.ts` `.m2ts`）支持，但若音频轨为有损编码（AAC / Opus）会提示
- 歌词仅支持静态文本嵌入，不支持 LRC 时间同步

## 许可证

[ISC](LICENSE)
