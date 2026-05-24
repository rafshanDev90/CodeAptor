import { Scenes } from 'telegraf';
import { auditScene } from './audit.scene.js';

export const stage = new Scenes.Stage([auditScene]);
