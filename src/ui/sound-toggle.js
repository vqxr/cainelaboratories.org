// sound-toggle.js — Icon-based sound toggle
import { soundManager } from '../sound.js';

export function initSoundToggle() {
    const toggle = document.getElementById('sound-toggle');
    const iconOn = document.getElementById('sound-icon-on');
    const iconOff = document.getElementById('sound-icon-off');

    if (!toggle) return;

    toggle.addEventListener('click', () => {
        if (!soundManager.initialized) {
            soundManager.init();
            soundManager.playAmbient?.();
        }

        const muted = soundManager.toggleMute?.();

        if (iconOn && iconOff) {
            iconOn.style.display = muted ? 'none' : 'block';
            iconOff.style.display = muted ? 'block' : 'none';
        }
    });
}
