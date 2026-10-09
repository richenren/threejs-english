import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({plugins:[vue(),VitePWA({registerType:'autoUpdate',manifest:{name:'3D 英语小世界',short_name:'英语小世界',start_url:'/kid',display:'standalone',theme_color:'#fbf4df',background_color:'#fbf4df'},workbox:{navigateFallback:'/index.html',runtimeCaching:[{urlPattern:({url})=>url.pathname.startsWith('/assets/'),handler:'CacheFirst',options:{cacheName:'learning-assets'}}]}})],server:{proxy:{'/api':'http://localhost:8080'}}});