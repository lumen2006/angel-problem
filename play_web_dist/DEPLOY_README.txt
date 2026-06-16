静态试玩页部署说明（无需 GitHub）
====================================

会前做一次上传 → 固定 URL 写入 fixed_play_url.txt → generate_qr.py --ppt
之后 PPT 二维码不再随 IP 变化；会场手机能上网即可（不必开 start.bat）。

────────────────────────────────────────
方案 A：Netlify Drop（推荐，只需浏览器）
────────────────────────────────────────
1. 打开 https://app.netlify.com/drop
2. 把整个 play_web_dist 文件夹拖进网页（不是只拖 index.html）
3. 几秒后得到地址，形如 https://随机名.netlify.app/
4. 用手机浏览器打开该地址，确认能正常试玩
5. 若提示「Claim site」，用邮箱注册免费账号即可保留该地址

────────────────────────────────────────
方案 B：Tiiny.host（上传 zip）
────────────────────────────────────────
1. 将 play_web_dist 文件夹打成 zip
2. 打开 https://tiiny.host 上传 zip
3. 得到形如 https://xxx.tiiny.site/ 的地址
4. 免费版可能有过期限制，会前再确认一次能否打开

────────────────────────────────────────
方案 C：Surge（命令行，需 Node.js）
────────────────────────────────────────
  cd play_web_dist
  npx --yes surge . angel-cat-play.surge.sh
按提示输入邮箱（首次使用），得到 https://angel-cat-play.surge.sh/

────────────────────────────────────────
方案 D：码云 Gitee Pages（国内网络较稳）
────────────────────────────────────────
1. 注册 https://gitee.com （免费）
2. 新建仓库 → 上传 play_web_dist 内全部文件到仓库根目录
3. 仓库「服务」→ Gitee Pages → 启动
4. 得到 https://用户名.gitee.io/仓库名/

────────────────────────────────────────
写入固定二维码
────────────────────────────────────────
在 presentation/ 目录：

  1. 复制 fixed_play_url.example.txt → fixed_play_url.txt
  2. 编辑 fixed_play_url.txt，只保留一行你的公网地址，例如：
     https://你的站点.netlify.app/
  3. python generate_qr.py --ppt
  4. python merge_all_slides.py   （若使用完整版 PPT）

注意：URL 末尾建议带 / ；不要用 http://10.x.x.x 这类局域网地址。
