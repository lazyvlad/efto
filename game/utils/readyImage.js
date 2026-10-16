// A picture made ready to draw before it is first drawn. Drawing a freshly loaded picture onto
// the canvas makes the browser decode it there and then, inside that frame: for a creature's
// whole sheet, a frame several times too long, as one comes into view. Here it is decoded away
// from the game (createImageBitmap, or the picture's own decode()), and until then it is not
// drawn at all.
//
//   const sheet = readyImage(src);    // at once, ahead of need
//   if (sheet.source) ctx.drawImage(sheet.source, ...);

export function readyImage(src) {
    const ready = { source: null, width: 0, height: 0 };
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
        const done = source => {
            ready.source = source;
            ready.width = image.naturalWidth;
            ready.height = image.naturalHeight;
        };
        if (typeof createImageBitmap === 'function') {
            createImageBitmap(image).then(done, () => done(image));
        } else if (typeof image.decode === 'function') {
            image.decode().then(() => done(image), () => done(image));
        } else {
            done(image);
        }
    };
    image.src = src;
    return ready;
}
