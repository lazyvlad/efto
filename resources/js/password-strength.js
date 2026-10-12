// Strength meter for a new password. The estimate comes from zxcvbn, which scores a password
// by how many guesses it would take an attacker (dictionary words, names, keyboard runs,
// dates, repeats) rather than by which kinds of characters it has. It is advice only: the
// server enforces the minimum length and rejects passwords found in known breaches.
// The estimator and its word lists are only downloaded once someone starts typing.

let estimator = null;

function loadEstimator() {
    estimator ??= Promise.all([
        import('@zxcvbn-ts/core'),
        import('@zxcvbn-ts/language-common'),
        import('@zxcvbn-ts/language-en'),
    ]).then(([core, common, english]) => {
        core.zxcvbnOptions.setOptions({
            dictionary: { ...common.dictionary, ...english.dictionary },
            graphs: common.adjacencyGraphs,
            translations: english.translations,
        });

        return core.zxcvbn;
    });

    return estimator;
}

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

// input: id of the password field. related: ids of fields whose contents make a password
// easy to guess (name, email). minLength: what the server requires.
export default ({ input, related = [], minLength }) => ({
    minLength,
    length: 0,
    score: null,
    hint: '',

    init() {
        const field = document.getElementById(input);
        if (!field) return;

        field.addEventListener('input', () => this.check(field));
    },

    get label() {
        return this.score === null ? '' : LABELS[this.score];
    },

    get longEnough() {
        return this.length >= this.minLength;
    },

    async check(field) {
        const password = field.value;
        this.length = [...password].length;

        if (password === '') {
            this.score = null;
            this.hint = '';
            return;
        }

        const zxcvbn = await loadEstimator();

        // Typing carried on while the word lists were loading
        if (field.value !== password) return;

        const personal = related
            .map((id) => document.getElementById(id)?.value ?? '')
            .flatMap((value) => value.split(/[\s@._-]+/))
            .filter((word) => word.length > 2);

        const result = zxcvbn(password, personal);

        this.score = result.score;
        this.hint = result.feedback.warning || result.feedback.suggestions[0] || '';

        // The estimator is lenient about passwords built from the account's own details
        const lowered = password.toLowerCase();
        if (personal.some((word) => word.length > 3 && lowered.includes(word.toLowerCase()))) {
            this.score = Math.min(this.score, 1);
            this.hint = 'Avoid using your name or email address.';
        }
    },
});
