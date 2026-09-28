# 手部识别模型

`hand_landmarker.task` 为 MediaPipe Hand Landmarker float16 / version 1 模型包，浏览器从本地站点加载，媒体不上传。

- 官方来源：https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- SHA-256：`fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`
- 模型说明：https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker
- npm 依赖通过 npmmirror 获取；模型在国内镜像查询无结果后使用官方地址，保存在 D 盘项目内。
- WASM 和加载脚本来自锁定的 `@mediapipe/tasks-vision` npm 依赖，由 Vite 打包，无运行时 CDN 依赖。
