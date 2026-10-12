// Brings a character's picture to life without redrawing it.
//
// The picture (one drawing of the character, with a transparent background) is laid over a
// grid, and the points of the grid are shifted a little each frame: the chest rises and falls,
// the body leans the way the character is going and the legs lift in turn, the hands come up to
// catch something, the character draws back and flashes when hit, and braces to shoot. Nothing
// above the chest is shifted on its own, so the face is never distorted.
//
// The warped grid is drawn with WebGL onto a small canvas of its own, which is then stamped onto
// the game's canvas like any picture. Without WebGL the whole picture moves as one piece (it
// bobs, leans and recoils, but the hands and legs do not move on their own).
//
// Where the arms, legs, chest and feet are differs from drawing to drawing: that is the "rig"
// each character brings (data/playerCharacters.js). Based on the movement prototype made for
// the pajama hunter; the shooting motion, the recovery from a lost WebGL context and the rigs
// were added here.
//
// It only draws. Where the player is, what they collide with and when things happen stay with
// the game: tell it what happened (collect, hit, shoot) and how fast the character is moving.

const COLUMNS = 24;
const ROWS = 30;
const RESOLUTION = 512;             // Size of the canvas the grid is drawn on

const COLLECT_SECONDS = 0.42;
const HIT_SECONDS = 0.28;
const SHOOT_SECONDS = 0.2;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
// 0 below "from", 1 above "to", a smooth step in between
const ramp = (from, to, value) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
};
// 1 at "center", falling off to either side
const around = (value, center, width) => Math.exp(-(((value - center) / width) ** 2));

const VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
        v_uv = a_uv;
        gl_Position = vec4(a_position.x * 2.0 - 1.0, 1.0 - a_position.y * 2.0, 0.0, 1.0);
    }`;

// The picture, turned towards white during the flash from a hit
const FRAGMENT_SHADER = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform float u_hit;
    void main() {
        vec4 color = texture2D(u_texture, v_uv);
        color.rgb = mix(color.rgb, vec3(color.a), u_hit * 0.35);
        gl_FragColor = color;
    }`;

export class CharacterAnimator {
    /**
     * @param {HTMLImageElement} image  The character's picture, already loaded
     * @param {object}           rig    Where the parts of that picture are (data/playerCharacters.js)
     */
    constructor(image, rig) {
        this.image = image;
        this.rig = rig;
        this.time = 0;
        this.gait = 0;          // How far through the stride
        this.move = 0;          // 0 standing still .. 1 at full speed
        this.lean = 0;          // -1 leaning left .. 1 leaning right
        this.collectTime = 0;   // Seconds left of each reaction
        this.hitTime = 0;
        this.shootTime = 0;
        // Players who ask their device for less motion get a still picture
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.canvas = document.createElement('canvas');
        this.canvas.width = RESOLUTION;
        this.canvas.height = RESOLUTION;
        this.gl = null;

        // A phone short of memory may take the WebGL context away, and may give it back
        this.canvas.addEventListener('webglcontextlost', event => {
            event.preventDefault();
            this.gl = null;
        });
        this.canvas.addEventListener('webglcontextrestored', () => this.startWebGL());

        this.startWebGL();
    }

    // Something was caught: the hands come up
    collect() {
        this.collectTime = COLLECT_SECONDS;
    }

    // The character was hurt: a step back and a flash
    hit() {
        this.hitTime = HIT_SECONDS;
    }

    // An arrow was loosed: the character braces
    shoot() {
        this.shootTime = SHOOT_SECONDS;
    }

    /**
     * Advance the animation.
     * @param {number} seconds     Time since the last call
     * @param {number} velocityX   Sideways speed, in the canvas's units per second
     * @param {number} fullSpeed   The speed that counts as moving flat out
     */
    update(seconds, velocityX, fullSpeed) {
        const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
        const speed = Number.isFinite(velocityX) ? velocityX / Math.max(1, fullSpeed) : 0;
        const ease = 1 - Math.exp(-dt * 12);

        this.time += dt;
        this.move += (clamp(Math.abs(speed), 0, 1) - this.move) * ease;
        this.lean += (clamp(speed, -1, 1) - this.lean) * ease;
        this.gait += dt * (7 + 5 * this.move);
        this.collectTime = Math.max(0, this.collectTime - dt);
        this.hitTime = Math.max(0, this.hitTime - dt);
        this.shootTime = Math.max(0, this.shootTime - dt);
    }

    // How far each motion has got, as the amounts the grid is shifted by
    pose() {
        if (this.reducedMotion) {
            return { breath: 0, bob: 0, lean: 0, step: 0, move: 0, lift: 0, recoil: 0, brace: 0, sway: 0 };
        }

        // A reaction rises and falls once over its time
        const swell = (left, total) => (left > 0 ? Math.sin((1 - left / total) * Math.PI) : 0);
        const breathing = Math.sin(this.time * Math.PI * 2 * 0.9);

        return {
            breath: breathing * 0.0025,
            bob: breathing * 0.0018 - Math.abs(Math.sin(this.gait)) * this.move * 0.003,
            lean: this.lean * 0.035,
            step: Math.sin(this.gait),
            move: this.move,
            lift: swell(this.collectTime, COLLECT_SECONDS),
            recoil: swell(this.hitTime, HIT_SECONDS),
            brace: swell(this.shootTime, SHOOT_SECONDS),
            sway: Math.sin(this.time * 3.3) * 0.004
        };
    }

    // Where the point (u, v) of the picture is drawn in this pose (0..1 across and down)
    deform(u, v, pose) {
        const { foot, chest, arms, legs, gear } = this.rig;
        let x = u;
        let y = v;

        // Nothing above the chest is shifted on its own: the face moves as one rigid piece

        // The chest rises and widens with each breath
        const body = ramp(chest.from[0], chest.from[1], v) * (1 - ramp(chest.to[0], chest.to[1], v));
        x += (u - chest.center) * pose.breath * body;
        y -= pose.breath * body;

        // The arms come up to catch, and a little to shoot
        const armBand = ramp(arms.from[0], arms.from[1], v) * (1 - ramp(arms.to[0], arms.to[1], v));
        const leftArm = around(u, arms.left.at, arms.left.width) * armBand;
        const rightArm = around(u, arms.right.at, arms.right.width) * armBand;
        const armsUp = pose.lift + pose.brace * 0.5;
        y -= (leftArm + rightArm) * armsUp * 0.030;
        x += (rightArm - leftArm) * pose.lift * 0.008;

        // The legs lift in turn as the character moves
        const legBand = ramp(legs.from[0], legs.from[1], v);
        const leftLeg = around(u, legs.left.at, legs.left.width) * legBand;
        const rightLeg = around(u, legs.right.at, legs.right.width) * legBand;
        y -= Math.max(0, pose.step) * pose.move * leftLeg * 0.009;
        y -= Math.max(0, -pose.step) * pose.move * rightLeg * 0.009;
        x += pose.step * pose.move * (leftLeg - rightLeg) * 0.004;

        // What is carried on the back sways
        x += (1 - ramp(gear.u[0], gear.u[1], u)) * (1 - ramp(gear.v[0], gear.v[1], v)) * pose.sway;

        // The whole figure leans around the feet: into the stride, and back from a hit
        const angle = pose.lean - pose.recoil * 0.025;
        const dx = x - foot.u;
        const dy = y - foot.v;
        x = foot.u + dx * Math.cos(angle) - dy * Math.sin(angle);
        y = foot.v + dx * Math.sin(angle) + dy * Math.cos(angle);

        // ...and rises and sinks: with breath and stride, down a touch to catch, to take a hit,
        // and to brace for a shot
        y += pose.bob - pose.lift * 0.003 + pose.recoil * 0.004 + pose.brace * 0.005;

        return [x, y];
    }

    // Set up the grid, the picture and the shaders. Leaves this.gl null if WebGL is not to be had.
    startWebGL() {
        const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
        if (!gl) return;

        try {
            const compile = (type, source) => {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
                return shader;
            };

            const program = gl.createProgram();
            gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
            gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
            gl.useProgram(program);

            // The grid: where each point is in the picture, and the triangles between the points
            const points = (COLUMNS + 1) * (ROWS + 1);
            this.uvs = new Float32Array(points * 2);
            this.vertices = new Float32Array(points * 2);
            for (let row = 0; row <= ROWS; row++) {
                for (let column = 0; column <= COLUMNS; column++) {
                    const index = (row * (COLUMNS + 1) + column) * 2;
                    this.uvs[index] = column / COLUMNS;
                    this.uvs[index + 1] = row / ROWS;
                }
            }

            const triangles = [];
            for (let row = 0; row < ROWS; row++) {
                for (let column = 0; column < COLUMNS; column++) {
                    const topLeft = row * (COLUMNS + 1) + column;
                    const bottomLeft = topLeft + COLUMNS + 1;
                    triangles.push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1);
                }
            }
            this.triangleCount = triangles.length;

            this.positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertices.byteLength, gl.DYNAMIC_DRAW);
            const position = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
            const uv = gl.getAttribLocation(program, 'a_uv');
            gl.enableVertexAttribArray(uv);
            gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);

            gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            this.hitUniform = gl.getUniformLocation(program, 'u_hit');
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.viewport(0, 0, RESOLUTION, RESOLUTION);
            gl.clearColor(0, 0, 0, 0);

            this.gl = gl;
        } catch (error) {
            console.warn('Player animation falls back to the plain picture:', error);
            this.gl = null;
        }
    }

    /**
     * Draw the character on the game's canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} footX   Where the feet are: the middle of them, and the ground under them
     * @param {number} footY
     * @param {number} height  Height of the whole picture as drawn (the figure does not fill all of it)
     */
    draw(ctx, footX, footY, height) {
        const { foot } = this.rig;
        const width = height * this.image.naturalWidth / this.image.naturalHeight;
        const left = footX - width * foot.u;
        const top = footY - height * foot.v;
        const pose = this.pose();

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (this.gl) {
            const gl = this.gl;
            for (let index = 0; index < this.uvs.length; index += 2) {
                const [x, y] = this.deform(this.uvs[index], this.uvs[index + 1], pose);
                this.vertices[index] = x;
                this.vertices[index + 1] = y;
            }

            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
            gl.uniform1f(this.hitUniform, this.hitTime > 0 ? Math.sin(this.hitTime * 70) * 0.5 + 0.5 : 0);
            gl.drawElements(gl.TRIANGLES, this.triangleCount, gl.UNSIGNED_SHORT, 0);

            ctx.drawImage(this.canvas, left, top, width, height);
        } else {
            // Without WebGL the picture moves as one piece
            ctx.translate(footX, footY + (pose.bob + pose.brace * 0.005) * height);
            ctx.rotate(pose.lean - pose.recoil * 0.025);
            if (this.hitTime > 0) ctx.globalAlpha *= 0.55 + 0.45 * Math.abs(Math.sin(this.hitTime * 50));
            ctx.drawImage(this.image, -width * foot.u, -height * foot.v, width, height);
        }

        ctx.restore();
    }
}
