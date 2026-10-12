// Landing page: the site header sits above a running game. Following a header link would
// throw the game away, so while one is underway a click on a link pauses the game and asks first.
// The game (in the frame) says whether one is underway - see window.INPUT_GAME in the game.

export default () => {
    // The link that was clicked, waiting for an answer
    let pending = null;
    let confirmed = false;

    return {
        asking: false,
        // Whether a game is underway. On phones the header and footer are hidden while it is,
        // so the game gets the whole screen (see .phone-hide in app.css).
        playing: false,

        init() {
            // The game is another page in a frame: it is asked, not listened to
            setInterval(() => {
                const game = this.game();
                this.playing = Boolean(game && game.inProgress());
            }, 400);
        },

        game() {
            try {
                return this.$refs.frame.contentWindow.INPUT_GAME ?? null;
            } catch {
                return null;
            }
        },

        intercept(event) {
            if (confirmed) return;

            const link = event.target.closest('a[href]');
            if (!link) return;

            // Opening a link in a new tab or window leaves the game alone
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || link.target === '_blank') return;

            const game = this.game();
            if (!game || !game.inProgress()) return;

            event.preventDefault();
            event.stopPropagation();

            game.pause();
            pending = link;
            this.asking = true;
            this.$nextTick(() => this.$refs.stay.focus());
        },

        stay() {
            this.asking = false;
            pending = null;
            this.$refs.frame.contentWindow.focus();
        },

        leave() {
            this.game()?.allowLeave();
            confirmed = true;
            pending.click();
        },
    };
};
