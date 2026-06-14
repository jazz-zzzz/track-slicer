# Track Slicer

把演唱会录音切成规整专辑的 Claude Code 技能。给它一份带时间戳的曲目表和音频文件，它会搜索官方 setlist、规范化歌名、分轨编码、嵌入封面——输出 ALAC（拖进 Apple Music）或 FLAC（归档收藏）。

## 安装

```bash
git clone https://github.com/jazz-zzzz/track-slicer.git
cd track-slicer
npm install
```

需要 Node.js 18+ 和 ffmpeg（设 `FFMPEG_HOME` 环境变量或放在 `~/Downloads/`）。

挂接到 Claude Code：

```powershell
cmd /c rmdir "$env:USERPROFILE\.claude\skills\track-slicer"
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.claude\skills\track-slicer" `
  -Target "<你的克隆路径>\track-slicer"
```

挂接后 `git pull` 即自动更新。`npm test` 验证安装。

## 使用

### 准备素材

在 `../albums/<专辑名>/` 下放三个文件：

```
albums/SAKANAQUARIUM 2024 turn/
├── source.flac          # 完整音频（flac / m4a / mkv / mp4 / ts）
├── cover.jpg            # 封面图（jpg 或 png）
└── timestamps.md        # 手写：HH:MM:SS + 歌名，每行一首
```

### 跟 Claude Code 说

> 处理 albums/SAKANAQUARIUM 2024 turn

五步自动完成：

```
1. 收集  → 识别艺人、专辑名、音频源、时间戳、封面
2. 搜索  → 查官方 setlist，规范化专辑名和曲目名
3. 审核  → 展示差异摘要，确认后设 "approved": true
4. 构建  → 10 路并行分轨编码，输出 ALAC
5. 歌词  → 从网易云获取歌词，加 --embed 写入音频元数据
```

### 输出

```
albums/SAKANAQUARIUM 2024 turn/
├── manifest.json        ← 完整曲目清单（原始 + 规范化）
├── tracks/              ← FLAC 归档
└── ALAC/                ← 带封面的 M4A，直接拖入 Apple Music
```

## 原理

四个 CLI 命令，由 Claude Code 代你调用：

| 命令 | 用途 |
|------|------|
| `node tool.js manifest <目录>` | 解析时间戳，生成曲目草稿 |
| `node tool.js summary --manifest <路径>` | 展示审核摘要（仅差异） |
| `node tool.js build --manifest <路径>` | 按审核通过的清单分轨编码 |
| `node tool.js lyrics --manifest <路径>` | 从网易云音乐拉歌词 |

清单是核心契约。AI 填入规范化标题和证据链接，你审核后设为通过。未通过不会执行分轨。

### 参数

| 参数 | 作用 |
|------|------|
| `--no-flac` | 跳过 FLAC，仅输出 ALAC |
| `--use-refalac` | 使用 Apple 官方 refalac 编码器替代 ffmpeg 内置 |
| `--embed` | 配合 `lyrics`，将歌词写入音频文件元数据 |

## 目录结构

```
├── SKILL.md              ← 技能定义——AI 代理的行为契约
├── tool.js               ← CLI 入口（manifest / summary / build / lyrics）
├── src/
│   ├── build-album.js    ← 10 路并行构建（ffmpeg + refalac）
│   ├── discover-album.js ← 自动识别专辑目录结构
│   ├── errors.js         ← 简短错误码
│   ├── ffmpeg.js         ← ffmpeg/refalac 命令构建
│   ├── lyrics.js         ← 歌词获取（网易云 + Genius 备用）
│   ├── manifest.js       ← 清单读写（含规范化状态和曲目类型）
│   ├── normalize.js      ← 标题清洗（去翻译、识别 MC）
│   ├── parse-timestamps.js ← 时间戳 markdown 解析
│   └── verify.js         ← 输出校验
├── docs/
│   └── reference.md      ← 可信度等级、字段表、错误码、预检说明
├── tests/                ← Node 原生测试（54 个）
├── CLAUDE.md
└── AGENTS.md
```

## 限制

- 音视频源文件须用户自行提供，工具不会下载
- AAC 源转 ALAC 是透明封装，不会提升音质
- 输出始终写入新目录，原始文件不受影响
- 视频源（.mkv、.mp4）支持，通过 `-map 0:a` 提取音轨
- 必须有 `timestamps.md`，没有时间戳无法分轨
- 歌词按需从网易云获取，`--embed` 写入音频元数据
- Apple Music 对自定义嵌入歌词以静态小字显示；全屏同步歌词仅限官方曲库内容——属于平台限制

## License

[ISC](LICENSE)
