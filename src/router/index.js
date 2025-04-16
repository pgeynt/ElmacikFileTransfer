import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import HistoryPage from '../views/history/HistoryPage.vue'
import SettingsPage from '../views/settings/SettingsPage.vue'
import DownloadsPage from '../views/downloads/DownloadsPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/history',
    name: 'History',
    component: HistoryPage
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage
  },
  {
    path: '/downloads',
    name: 'Downloads',
    component: DownloadsPage
  },
  {
    path: '/about',
    name: 'About',
    // Route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 