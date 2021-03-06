let ctx = null;
let stopper = null;

window.stop = () => {
  if (ctx !== null) {
    ctx.close();
    ctx = null;
  }
  if (stopper !== null) {
    clearTimeout(stopper);
    stopper = null;
  }
};

const clamp = (val, min, max) => val < min ? min : val > max ? max : val;

const pitchOrder = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'],
      pitches = [ ];

(() => {
  const temperament = 2 ** (1/12);
  let tone = 880;
  for (let i = 0; i >= -21; i -= 1) {
    pitches.unshift(tone);
    tone /= temperament;
  }
  tone = 880 * temperament;
  for (let octave = 0; octave <= 3; octave += 1) {
    for (let semitone = 0; semitone < 12; semitone += 1) {
      pitches.push(tone);
      tone *= temperament;
    }
  }
  for (let i = 0; i < 2; i += 1) {
    pitches.push(tone);
    tone *= temperament;
  }
})();

window.play = (song, bpm) => {
  ctx = new AudioContext();
  let buzzer = ctx.createOscillator(),
      gain = ctx.createGain();
  buzzer.connect(gain);
  gain.connect(ctx.destination);

  buzzer.type = 'square';
  buzzer.start();

  let t = 0;
  const spb = 60 / bpm;
  const jiffy = spb / 256;

  for (let note of song.matchAll(/(\d*)?(\.?\.?)([#b]?)([a-h-])([#b]?)(\d?)/gi)) {
    let [_, length, dots, mod1, noteName, mod2, octave] = note.map(x => x.toLowerCase());
    noteName = noteName.toLowerCase();
    if (noteName === 'h') {
      noteName = 'b';
    } else if (noteName === '-') {
      if (t === 0) {
        gain.gain.setValueAtTime(0.0, 0.0);
      }
      t += spb * 4 / Number(length);
      continue;
    }
    let mod = mod2 || mod1;
    if (mod === '#') {
      noteName += '#';
    }
    let noteIndex = pitchOrder.indexOf(noteName);
    if (mod === 'b') {
      noteIndex = (noteIndex + pitches.length - 1) % pitches.length;
    }
    if (octave === '') {
      octave = 1;
    } else {
      octave = clamp(Number(octave), 0, 3);
    }
    let pitch = pitches[pitchOrder.length * octave + noteIndex];

    let len = 4 / Number(length);
    if (dots === '.') {
      len *= 1.5;
    } else if (dots === '..') {
      len *= 1.75;
    }
    len *= spb;

    if (t !== 0) {
      buzzer.frequency.setValueAtTime(pitch, t - jiffy);
      gain.gain.setValueAtTime(0.0, t - jiffy);
      gain.gain.linearRampToValueAtTime(1.0, t);
    } else {
      buzzer.frequency.setValueAtTime(pitch, 0.0);
      gain.gain.setValueAtTime(1.0, 0.0);
    }
    t += 0.8 * len;
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.linearRampToValueAtTime(0.0, t + jiffy);
    t += 0.2 * len;
  }

  stopper = setTimeout(() => {
    togglePlayback();
  }, (t + 3) * 1000);
};
