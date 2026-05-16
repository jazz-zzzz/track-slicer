# 歌词获取方案 — 设计规格

## 目标

为 Album Extractor 添加歌词获取能力：给定已确认的歌名，从网络获取纯文本歌词，存储到专辑目录，嵌入音频文件元数据。

## 范围与约束

- 仅处理 Live/演唱会专辑（与 Album Extractor 定位一致）
- **纯文本歌词**，不启用时间同步（Live 版每场 tempo/MC 时长不同，LRC 时间轴不可靠）
- 独立步骤，在 RESEARCH + REVIEW + BUILD 全部完成之后按需执行
- `--embed` 标志将歌词写入 ALAC/FLAC 文件 `©lyr` / `LYRICS` 元数据标签

## 数据模型

### manifest.json — track 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `lyricSource` | `string \| null` | 来源标识：`netease` / `genius` / `not_found` |
| `lyricPath` | `string \| null` | 相对路径，指向 `lyrics/` 下的歌词文件 |

### 歌词文件

- 目录：`<专辑>/lyrics/`
- 命名：`{track编号前缀}-{normalizedTitle}.txt`
- 内容：纯文本歌词，UTF-8 编码。网易云 LRC 经过去时间戳、去元数据标签、去 credits（作词/作曲/编曲）处理
- TTML 文件（`{prefix}-{title}.ttml`）作为额外产物保留，供未来使用

## 搜索策略（按优先级）

### 1. 网易云音乐（主来源）

- 搜索 API：`music.163.com/api/search/get?s={artist}+{title}&type=1`
- 歌词 API：`music.163.com/api/song/lyric?os=pc&id={songId}&lv=-1&tv=-1`
- 歌词为 LRC 格式，翻译（tlyric）不会被消费
- 无需代理，国内直连
- LRC 中创作者信息（作词/作曲/编曲）自动剥离

### 2. Genius（fallback，需 HTTP_PROXY）

- URL 模式：`genius.com/{artist-slug}-{title-slug}-lyrics`
- HTML 抓取 `data-lyrics-container="true"` div

## Apple Music 歌词显示 — 已知限制（已验证）

- 用户本地导入的 `.m4a` 文件仅支持 `©lyr` **纯文本**歌词 → 显示为**小字体静态面板**
- **TTML 时间同步歌词（全屏大字体/逐行高亮）仅限 Apple Music 官方曲库内容**，通过 Transporter/iTunes Connect 渠道提交
- 本地文件无论嵌入何种格式的 TTML，Apple Music 都不会启用 Live Lyrics 模式
- `lrcToTtml()` 函数保留在代码中，供将来 Apple 政策变化或 macOS 端测试使用
- 参考：[Apple TTML 规范](https://help.apple.com/itc/videoaudioassetguide/en.lproj/itcd7579a252.html)、[StackExchange 确认](https://apple.stackexchange.com/questions/468852/can-apple-music-on-macos-display-synchronized-lyrics-embedded-in-mp3-or-aac-m4a)

## CLI

```bash
node tool.js lyrics --manifest <path> [--embed]
```

流程：
1. 读取 manifest，筛选需要歌词的 song 轨（排除 MC/Intro/已有歌词）
2. 逐首搜索网易云 → 获取歌词 → LRC 转纯文本 → 写入 `lyrics/` 目录
3. 若 `--embed`：用 ffmpeg `-c copy` 将纯文本写入音频文件元数据（`©lyr` / `LYRICS`）
4. 更新 manifest 中每轨的 `lyricSource` 和 `lyricPath`

## 已固化条件

- [x] 搜索策略（网易云为主，Genius fallback）
- [x] 纯文本歌词 + 音频嵌入
- [x] CLI `lyrics` 命令 + `--embed` 标志
- [x] 单元测试 + 集成测试（54 pass）
- [x] 创作者信息剥离
- [x] Apple Music TTML 限制已验证并文档化
