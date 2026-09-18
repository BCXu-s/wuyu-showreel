# 吾屿工作室作品集 - 上线包

线上地址：https://bcxu-s.github.io/wuyu-showreel/

这是可以直接上传到静态网站平台的版本，视频已经压成适合网页播放的 15 秒版本。

## 本地查看

直接双击 `index.html` 即可预览。远程字体需要联网，视频均为本地文件，不依赖 `C:\吾屿工作室` 原目录。

## 最省事的发布方式

1. 打开 [Netlify Drop](https://app.netlify.com/drop)。
2. 把整个 `showreel-ready` 文件夹拖进网页。
3. 等待上传完成，平台会生成一个可分享链接。
4. 在 Site settings 里可修改站点名，或绑定自己的域名。

## GitHub Pages

1. 新建一个公开仓库。
2. 把本目录中的所有文件上传到仓库根目录。
3. 打开 `Settings -> Pages`。
4. Source 选择 `Deploy from a branch`，分支选择 `main`，目录选择 `/ (root)`。
5. 保存后等待 1 到 2 分钟，GitHub 会生成公开链接。

## 内容修改位置

- 个人介绍、姓名和邮箱：`index.html` 中 `profile` 区块。
- 作品标题、分类和文案：`index.html` 中 `project-card` 区块。
- 作品卡片顺序与视频对应关系：`index.html` 中每个 `video` 的 `src`。
- 背景轮播顺序：脚本会自动读取作品卡里的视频顺序。
- 联系方式：建议同时搜索并替换 `1608341441@qq.com`。

## 后续添加完整作品

1. 把完整视频和封面放进 `media/full/`。
2. 打开 `full-works.js`，按文件内模板增加一条记录。
3. 保存后重新提交到 GitHub，页面会自动生成“完整作品 / FULL WORKS”区域。

建议单个视频控制在 100 MB 以内，分辨率 720p 或 1080p，并使用 H.264 MP4。

## 当前文件体积

- 5 个视频均为 15 秒、H.264 / MP4、音频 AAC。
- 每个视频约 1.6 - 4.6 MB。
- 整个站点可以按普通静态网站部署，不使用数据库或服务器。
