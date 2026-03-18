import { initScene } from './scene.js';
import { initScrollManager } from './scrollManager.js';

// Boot order matters: scene first (canvas ready), then scroll (reveals hero)
initScene();
initScrollManager();
