# 魔法阵导出
所有 PNG 为 1680×1460 静态快照；SVG 包含源文件 SHA-256、视图、旋转相位、周期与结果类型元数据。动画请打开本地应用。

## Dijkstra · v0.6
源文件：`../examples/dijkstra.c`。从顶点 0 出发的距离是 `0, 7, 9, 20, 20, 11`。

- `dijkstra-stack.svg/png`：主副环立体叠层。
- `dijkstra-front.svg/png`：同蓝本的正视重叠。
- `dijkstra-single.svg/png`：dijkstra 主层，包含 closest_vertex 副环。
- `dijkstra-workbench.png`：交互界面。
- `dijkstra-hands-workbench.png`：调用过程中时针暂停、分针与副环秒针的画面。

运行圈选已替换为结果类型驱动的魔法指针：中环短时针、分层函数中分针、副环短秒针全部常驻。指针随静态演示进度平滑运动，调用期间等待，返回后恢复；这不是 C 程序的实际运行耗时。

青色 main 主环为 3s，print_path 副环为 4s；金色 dijkstra 主环为 20s，closest_vertex 副环为 19s。中心均为路径/距离结果印，统一 12s。周期以 1× 为准。结果类别为可手动覆盖的启发式判断，不表示执行了代码。

主层中心为路径印；副环中心分别为 print_path 的路径印和 closest_vertex 的数值印，不再直接显示函数名。副环默认公转周期为 18s、21s，可在网页设置为 7–25s。主层距默认 160、范围 0–420；重要功能徽章按内部空白放大，使用多层细线装饰。双击项目根目录的 `启动魔法阵.cmd` 可打开交互版本。

## GCD
源文件：`../examples/gcd.c`。输入 252、105，输出 21。`gcd-sigil.svg/png` 为立体图，`gcd-workbench.png` 为界面截图。

在开发服务启动后，运行 `D:\anaconda3\python.exe tests/export_dijkstra.py` 或 `tests/export_gcd.py` 可重新导出，使用本机 Chrome，无需上传源码。
