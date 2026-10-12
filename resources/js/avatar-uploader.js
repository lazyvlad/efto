// Profile image upload: pick a file, crop it to a square in the page, upload the crop.
// The cropping library is only downloaded once a file has been chosen.

// Uploaded size in pixels; the server keeps a smaller copy
const UPLOAD_SIZE = 512;

export default ({ uploadUrl, csrfToken }) => {
    // Kept out of Alpine's reactive data: the library does not survive being proxied
    let cropper = null;
    let objectUrl = null;

    return {
        cropping: false,
        busy: false,
        error: '',

        async choose(event) {
            const file = event.target.files[0];
            event.target.value = '';
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                this.error = 'That file is not an image.';
                return;
            }

            this.error = '';

            const [{ default: Cropper }] = await Promise.all([
                import('cropperjs'),
                import('cropperjs/dist/cropper.css'),
            ]);

            this.close();
            this.cropping = true;
            await this.$nextTick();

            objectUrl = URL.createObjectURL(file);
            this.$refs.image.src = objectUrl;

            cropper = new Cropper(this.$refs.image, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                background: false,
                guides: false,
                center: false,
                toggleDragModeOnDblclick: false,
            });
        },

        zoom(step) {
            cropper?.zoom(step);
        },

        rotate() {
            cropper?.rotate(90);
        },

        close() {
            cropper?.destroy();
            cropper = null;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = null;
            this.cropping = false;
        },

        async save() {
            if (!cropper || this.busy) return;

            this.busy = true;
            this.error = '';

            try {
                const canvas = cropper.getCroppedCanvas({
                    width: UPLOAD_SIZE,
                    height: UPLOAD_SIZE,
                    fillColor: '#1b1714',
                    imageSmoothingQuality: 'high',
                });
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));

                const body = new FormData();
                body.append('avatar', blob, 'avatar.jpg');

                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' },
                    body,
                });

                if (response.ok) {
                    window.location.reload();
                    return;
                }

                const data = await response.json().catch(() => null);
                this.error = data?.errors?.avatar?.[0] ?? 'The image could not be saved. Please try again.';
            } catch {
                this.error = 'The image could not be saved. Please try again.';
            }

            this.busy = false;
        },
    };
};
