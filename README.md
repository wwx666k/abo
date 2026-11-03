# ABO 性别身份与信息素检测

一个轻量的 H5 人格测试站点：以情景四选一为主、五点程度评价为辅，测出支配感、情绪浓度、边界感、吸引力、稳定值五个维度，并生成 ABO 身份、信息素档案与等级评定。

- 线上地址：<https://abo.luodie.dpdns.org>
- Cloudflare Pages 备用地址：<https://abo-3r4.pages.dev>

## 功能

- 三档题量：25 / 50 / 100 题
- 情景四选一 + 五点量表混合题型，五点量表约占 15%~20%
- 情景题选项分值在题目内打乱，避免靠选项顺序猜身份
- 五维加权计分、反向计分、测谎配对与信度提示
- 按主导维度强度评定 SSS+ / SSS / SS / S / A / B / C / D 等级
- 生成身份、标签、信息素、气质、关系模式、适配对象等完整报告
- 用户名进度保存：本地缓存 + 云端 KV，多设备可续答
- 个人中心：查看历史报告（最多 10 条）
- 管理后台：按用户查看全部测试与单次完整报告

## 技术栈

- Vite 5 + React 18 + TypeScript
- Tailwind CSS + Framer Motion
- Zustand（本地状态与持久化）
- Cloudflare Pages Functions + KV

## 本地运行

需要 Node.js 18+（推荐 20 / 22）。

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run typecheck   # 类型检查
npm run verify      # 题库与计分逻辑校验
npm run build       # 生产构建（输出 dist/）
npm run preview     # 预览构建结果
```

## 目录结构

```text
src/
  components/       # 图表、图标、更新日志等通用组件
  data/             # 题库、身份文案、更新日志
  pages/            # 首页 / 答题 / 结果 / 个人中心 / 后台
  store/            # Zustand 状态
  utils/            # 计分、接口、随机工具
functions/api/      # Cloudflare Pages Functions：user / admin
scripts/verify.ts   # 题库与算法校验脚本
```

## Cloudflare Pages 部署

1. 将仓库连接到 Cloudflare Pages，构建命令 `npm run build`，输出目录 `dist`。
2. 在 Pages 项目中创建 KV 命名空间，并在 Settings → Functions → KV 绑定中命名为 `ABO_KV`。
3. 在环境变量中设置后台密码 `ADMIN_PASSWORD`。
4. 推送 `main` 分支后会自动构建部署；`functions/api/*` 会作为 Pages Functions 一起发布。

## 说明

本站结果仅供娱乐与自我观察，不构成任何心理学诊断。
