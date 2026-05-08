# Album Extractor

一个 [Claude Code](https://claude.ai/code) skill——把演唱会录音变成规范的专辑曲目。对它说「处理这张专辑」，它搜索官方曲目表、切分音频、嵌入封面和歌词，输出 FLAC + ALAC。

---

## 目录

- [安装](#安装)
- [使用](#使用)
- [原理](#原理)
- [项目结构](#项目结构)
- [限制](#限制)
- [许可证](#许可证)

## 安装

```bash
git clone https://github.com/jazz-zzzz/album-extractor.git
cd album-extractor
npm install
```

**前置依赖：** [Node.js](https://nodejs.org/) ≥ 18、[ffmpeg](https://ffmpeg.org/)（设置 `FFMPEG_HOME` 或放 `~/Downloads/`）。

克隆后架设 junction，Claude Code 即可加载此 skill：

```powershell
cmd /c rmdir "$env:USERPROFILE\.claude\skills\album-extractor"
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.claude\skills\album-extractor" `
  -Target "<你的克隆路径>\album-extractor"
```

`git pull` 后 skill 自动更新，无需额外操作。

验证安装：

```bash
npm test
```

## 使用

### 准备材料

在 `../albums/<专辑名>/` 下放三个文件：

```
albums/SAKANAQUARIUM 2024 turn/
├── source.flac          # 完整音频（flac / m4a / mkv / mp4 / ts）
├── cover.jpg            # 封面（≥ 1000×1000）
└── timestamps.md        # 手写时间戳，每行 HH:MM:SS + 曲名
```

### 跟 Claude Code 对话

打开终端，进入 albums 所在目录，说一句：

> 处理 albums/SAKANAQUARIUM\ 2024\ turn

Claude Code 会自动执行四步：

```
1. 收集    → 识别音频、封面、时间戳，询问是否需要歌词
2. 研究    → 搜索官方曲目表，规范化专辑名和每一首曲名
3. 审查    → 展示曲目清单让你确认，确认后设为 approved
4. 构建    → 10-worker 并行切分编码，输出 FLAC + ALAC
```

### 你会得到

```
albums/SAKANAQUARIUM 2024 turn/
├── manifest.json        ← 完整的曲目清单（保留原始 + 规范化后）
├── tracks/              ← FLAC 无损存档
│   ├── 01_Ame(B).flac
│   └── ...
└── ALAC/                ← 带封面和内嵌歌词，拖入 Apple Music 即用
    ├── 01_Ame(B).m4a
    └── ...
```

## 原理

底层两条 CLI 命令，Claude Code 代你执行：

| 命令 | 作用 |
|------|------|
| `node tool.js manifest <album-dir> [--online]` | 解析时间戳，生成可审查的 manifest.json |
| `node tool.js build --manifest <path>` | 读取已审批的 manifest，并行切分 + 编码 |

**Manifest 是人与 AI 之间的契约。** AI 填入规范化的曲名和证据 URL，人审核后设 `"approved": true`，构建才执行。

### 适用场景

| 你有 | 得到 |
|------|------|
| 无损音频 + 时间戳 + 封面 | ALAC（Apple Music 即拖即用）+ FLAC（存档） |
| 视频源（蓝光 / MKV / TS） | 自动提取音频轨 → 同上 |
| 已有歌词想嵌入 | 每首嵌入静态歌词文本 |
| 完全不想联网 | 不加 `--online`，离线切分 |

**不支持：** 没有时间戳的录音、已经分轨的录音室专辑、LRC 时间轴同步。

### Manifest 关键字段

| 字段 | 说明 |
|------|------|
| `approved` | 设为 `true` 后构建命令才生效 |
| `tracks[].rawTitle` | 时间戳原文，不可修改 |
| `tracks[].normalizedTitle` | 从官方曲目表匹配的规范曲名 |
| `tracks[].evidenceUrl` | 曲名来源 URL |
| `tracks[].isNonMusic` | MC / 谈话段落标记 |
| `tracks[].lyricText` | 静态歌词，无则 `null` |

## 项目结构

```
├── SKILL.md          ← Skill 定义，AI agent 的行为契约
├── tool.js           ← CLI 入口
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

- 不修改原始文件，输出全部写入新目录
- FLAC ↔ ALAC 是容器转换，无质量损失
- 必须有 `timestamps.md`
- 视频源若音频轨为有损编码（AAC / Opus）会提示
- 歌词仅静态文本，不含 LRC 时间同步

## 许可证

[ISC](LICENSE)
