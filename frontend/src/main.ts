import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';
import { createPinia } from 'pinia';
import KidPage from './kid/KidPage.vue';
import WorldMapPage from './kid/WorldMapPage.vue';
import ThemeWorldPage from './kid/ThemeWorldPage.vue';
import VocabularyLibraryPage from './kid/VocabularyLibraryPage.vue';
import ParentPage from './parent/ParentPage.vue';
import './style.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/kid' },
    { path: '/kid', component: WorldMapPage },
    { path: '/kid/vocabulary', component: VocabularyLibraryPage },
    { path: '/kid/world/kitchen', component: KidPage },
    { path: '/kid/world/:worldId', component: ThemeWorldPage },
    { path: '/parent', component: ParentPage },
  ],
});

// The standard Vue/Vite runtime build cannot compile a template string at runtime.
// Render RouterView with h() instead so both routes mount correctly.
const app = createApp({
  name: 'AppRoot',
  render: () => h(RouterView),
});

app.use(createPinia());
app.use(router);
app.mount('#app');
