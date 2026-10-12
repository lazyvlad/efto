import './bootstrap';

import Alpine from 'alpinejs';
import avatarUploader from './avatar-uploader';
import gameGuard from './game-guard';
import passwordStrength from './password-strength';

window.Alpine = Alpine;

Alpine.data('avatarUploader', avatarUploader);
Alpine.data('gameGuard', gameGuard);
Alpine.data('passwordStrength', passwordStrength);

Alpine.start();
