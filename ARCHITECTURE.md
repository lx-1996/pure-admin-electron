# 工程架构说明

## 1. 项目定位

这是一个基于 Vue 3 + Vite + TypeScript + Electron 的桌面端管理后台模板。它在保留传统 Web 管理后台能力的同时，提供了 Electron 桌面应用能力，适合做内部系统、数据看板、运维平台等场景。

项目同时支持两种运行方式：

- 桌面端：通过 Electron 启动，使用主进程、预加载脚本和渲染进程协同工作。
- 浏览器端：直接通过 Vite 启动，复用同一套前端页面和业务逻辑。

---

## 2. 技术栈概览

- 前端框架：Vue 3 + Composition API
- 构建工具：Vite 7
- 语言：TypeScript
- 状态管理：Pinia
- 路由：Vue Router 4
- UI：Element Plus + Tailwind CSS + SCSS
- 桌面能力：Electron
- 数据请求：Axios
- 认证与权限：基于 token + 本地存储 + 动态路由
- 图表与交互：ECharts、@vueuse、Animate.css 等

---

## 3. 目录结构说明

```text
.
├── build/                     # Vite / 构建相关脚本与插件
├── dist-electron/            # Electron 构建产物
├── electron/                 # Electron 主进程、预加载脚本、Worker
│   ├── main/                 # 主进程入口与窗口管理
│   ├── preload/              # 预加载脚本
│   └── types/                # Electron 相关类型定义
├── mock/                     # mock 数据与模拟接口
├── public/                   # 静态资源与平台配置文件
├── src/                      # 渲染进程业务代码
│   ├── api/                  # 接口封装与路由相关 API
│   ├── assets/               # 资源文件（图标、图片、svg 等）
│   ├── components/           # 全局组件与复用组件
│   ├── config/               # 平台配置与全局配置读取
│   ├── directives/           # 自定义指令
│   ├── layout/               # 布局组件与布局相关逻辑
│   ├── plugins/              # 第三方插件初始化
│   ├── router/               # 路由定义与权限路由处理
│   ├── store/                # Pinia 状态管理模块
│   ├── style/                # 全局样式与主题样式
│   ├── utils/                # 通用工具函数、HTTP、权限、认证等
│   └── views/                # 页面视图模块
├── index.html                 # 前端入口 HTML
├── package.json               # 项目脚本与依赖定义
├── vite.config.ts            # Vite 配置
├── electron-builder.json5    # Electron 打包配置
└── ARCHITECTURE.md            # 本文件
```

---

## 4. 核心模块职责

### 4.1 Electron 主进程

位于 [electron/main/index.ts](electron/main/index.ts) ：

- 创建和管理 BrowserWindow 窗口。
- 设置应用菜单、全屏状态切换和开发者工具入口。
- 处理 IPC 通信，暴露主进程能力给渲染进程。
- 启动独立的 Worker 进程，用于模拟后台数据流或长期任务。

其特点是：

- 主进程负责系统级能力，如窗口、菜单、文件系统、进程管理。
- 渲染进程只负责 UI 和业务逻辑，避免把系统能力直接暴露给页面。

### 4.2 预加载脚本

位于 [electron/preload/index.ts](electron/preload/index.ts) ：

- 通过 contextBridge 暴露受控 API 给渲染进程。
- 负责加载页面初始化动画等前端展示辅助逻辑。
- 作为主进程与渲染进程之间的安全桥梁。

### 4.3 Worker 进程

位于 [electron/main/worker/worker.ts](electron/main/worker/worker.ts) ：

- 作为独立子进程运行，适合承载周期性任务或数据推送。
- 当前示例中会定时向主进程发送数据消息。
- 主进程再把消息转发给渲染进程，形成“后台任务 -> 主进程 -> 页面展示”的链路。

### 4.4 渲染进程入口

位于 [src/main.ts](src/main.ts) ：

- 创建 Vue 应用实例。
- 注册全局组件、指令、插件。
- 初始化 Pinia、Vue Router。
- 获取平台配置，并挂载应用根组件。

### 4.5 路由系统

位于 [src/router/index.ts](src/router/index.ts) 和 [src/router/modules](src/router/modules) ：

- 使用自动导入方式加载静态路由模块。
- 通过路由守卫判断是否登录、是否有权限、是否跳转到登录页或错误页。
- 支持多标签页、缓存页面、动态菜单、重定向等能力。
- 其中 [src/router/modules/remaining.ts](src/router/modules/remaining.ts) 维护登录页、403/500 页面、重定向页面等特殊路由。

### 4.6 状态管理

位于 [src/store](src/store) ：

- 使用 Pinia 管理全局状态，模块职责清晰：
  - app：侧边栏、布局、设备类型、窗口尺寸。
  - user：登录用户信息、角色、权限、登录登出逻辑。
  - permission：菜单生成、路由权限、页面缓存。
  - multiTags：多标签页状态管理。
  - settings：主题、布局、显示设置。
  - epTheme：Element Plus 主题相关配置。

### 4.7 布局与页面

位于 [src/layout](src/layout) 和 [src/views](src/views) ：

- 布局组件负责顶栏、侧边栏、内容区、标签页、设置面板等页面骨架。
- 视图目录负责具体页面，例如登录页、欢迎页、权限相关页面、错误页。

### 4.8 数据与认证

位于 [src/api](src/api) 和 [src/utils/auth.ts](src/utils/auth.ts) ：

- 使用 Axios 封装接口请求。
- 通过 Cookie + LocalStorage 管理登录 token、刷新 token 和用户信息。
- 登录后会同步到 Pinia 状态，同时更新路由权限和菜单数据。

---

## 5. 运行流程

### 5.1 开发环境启动

以桌面端开发模式为例：

1. 执行 `yarn dev`。
2. Vite 启动前端开发服务。
3. Electron 主进程创建 BrowserWindow。
4. 主进程读取环境变量，决定加载 Vite 开发地址还是打包后的静态页面。
5. 渲染进程启动 Vue 应用，初始化路由与状态管理。
6. 如果用户未登录，路由守卫会重定向到登录页；否则继续进入业务页面。

### 5.2 登录与权限流程

1. 用户在登录页提交账号信息。
2. 前端通过 API 请求获取登录结果。
3. 成功后将 token 与用户信息写入 Cookie / LocalStorage。
4. Pinia 的 user store 更新状态。
5. 路由守卫检测到登录状态后，允许进入系统页面。
6. permission store 根据静态路由与动态路由生成菜单与页面权限。

### 5.3 页面渲染流程

1. 路由匹配到目标页面。
2. 对应组件在 [src/views](src/views) 中渲染。
3. 布局组件负责输出顶部导航、侧边栏、标签页与主体内容。
4. 页面中的业务数据通过 API 层请求后端接口。
5. 数据结果反馈到组件和 Store，驱动页面刷新。

### 5.4 Electron 与 Worker 协作流程

1. Electron 主进程启动 Worker 进程。
2. Worker 周期性发送模拟数据消息。
3. 主进程监听消息，并将其转发给渲染进程。
4. 渲染进程通过 preload 暴露的接口接收消息并更新页面。

---

## 6. 构建与打包流程

### 开发构建

- `yarn dev`：桌面端开发模式。
- `yarn browser:dev`：浏览器端开发模式。

### 生产构建

- `yarn build`：构建桌面端应用并打包 Electron 安装包。
- `yarn browser:build`：构建浏览器端静态产物。

构建过程中会经过：

- Vite 处理 Vue / TS / SCSS / Tailwind / 图片等资源。
- Electron 构建插件生成主进程和预加载脚本产物。
- 通过 electron-builder 输出安装包或可分发文件。

---

## 7. 设计特点

- 采用“前端通用业务层 + Electron 桌面封装”的双模式架构。
- 路由、菜单、权限、标签页、缓存机制较完整，适合做中后台管理系统。
- 主进程与渲染进程职责清晰，便于扩展桌面能力。
- 通过 Pinia + Vue Router 的组合，能快速支撑复杂的权限控制场景。

---

## 8. 结论

这个工程本质上是一个“Vue 3 管理后台 + Electron 桌面封装”的全栈式前端项目。它的核心价值不在于单一功能，而在于提供了一套可复用的中后台管理系统骨架：

- 页面布局与主题系统
- 用户认证与权限控制
- 动态菜单与多标签页
- Electron 窗口与进程模型
- Vite 的现代化前端构建链路

对于后续二次开发，最关键的入口分别是：

- [src/main.ts](src/main.ts)：应用初始化
- [src/router/index.ts](src/router/index.ts)：路由与权限控制
- [src/store](src/store)：全局状态管理
- [electron/main/index.ts](electron/main/index.ts)：桌面端主进程
