const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const CONSONANTS = new Set([...CHOSEONG, 'ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ']);
const VOWELS = new Set(JUNGSEONG);

const COMPOUND_FINALS = new Map([
  ['ㄱㅅ', 'ㄳ'],
  ['ㄴㅈ', 'ㄵ'],
  ['ㄴㅎ', 'ㄶ'],
  ['ㄹㄱ', 'ㄺ'],
  ['ㄹㅁ', 'ㄻ'],
  ['ㄹㅂ', 'ㄼ'],
  ['ㄹㅅ', 'ㄽ'],
  ['ㄹㅌ', 'ㄾ'],
  ['ㄹㅍ', 'ㄿ'],
  ['ㄹㅎ', 'ㅀ'],
  ['ㅂㅅ', 'ㅄ'],
]);

const SPLIT_FINALS = new Map([
  ['ㄳ', ['ㄱ', 'ㅅ']],
  ['ㄵ', ['ㄴ', 'ㅈ']],
  ['ㄶ', ['ㄴ', 'ㅎ']],
  ['ㄺ', ['ㄹ', 'ㄱ']],
  ['ㄻ', ['ㄹ', 'ㅁ']],
  ['ㄼ', ['ㄹ', 'ㅂ']],
  ['ㄽ', ['ㄹ', 'ㅅ']],
  ['ㄾ', ['ㄹ', 'ㅌ']],
  ['ㄿ', ['ㄹ', 'ㅍ']],
  ['ㅀ', ['ㄹ', 'ㅎ']],
  ['ㅄ', ['ㅂ', 'ㅅ']],
]);

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;

function isHangulSyllable(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

function isConsonant(char) {
  return CONSONANTS.has(char);
}

function isVowel(char) {
  return VOWELS.has(char);
}

function composeSyllable(choseong, jungseong, jongseong = '') {
  const choseongIndex = CHOSEONG.indexOf(choseong);
  const jungseongIndex = JUNGSEONG.indexOf(jungseong);
  const jongseongIndex = JONGSEONG.indexOf(jongseong);

  if (choseongIndex < 0 || jungseongIndex < 0 || jongseongIndex < 0) {
    return null;
  }

  return String.fromCharCode(
    HANGUL_BASE + (choseongIndex * 21 * 28) + (jungseongIndex * 28) + jongseongIndex
  );
}

function decomposeSyllable(char) {
  if (!isHangulSyllable(char)) {
    return null;
  }

  const syllableIndex = char.charCodeAt(0) - HANGUL_BASE;
  const choseongIndex = Math.floor(syllableIndex / (21 * 28));
  const jungseongIndex = Math.floor((syllableIndex % (21 * 28)) / 28);
  const jongseongIndex = syllableIndex % 28;

  return {
    choseong: CHOSEONG[choseongIndex],
    jungseong: JUNGSEONG[jungseongIndex],
    jongseong: JONGSEONG[jongseongIndex],
  };
}

function combineFinal(first, second) {
  return COMPOUND_FINALS.get(`${first}${second}`) ?? null;
}

function splitFinal(finalConsonant) {
  return SPLIT_FINALS.get(finalConsonant) ?? null;
}

export function appendHangulInput(text, input) {
  if (!input) {
    return text;
  }

  if (!isConsonant(input) && !isVowel(input)) {
    return text + input;
  }

  if (!text) {
    return text + input;
  }

  const lastChar = text[text.length - 1];
  const lastSyllable = decomposeSyllable(lastChar);

  if (isVowel(input)) {
    if (isConsonant(lastChar) && CHOSEONG.includes(lastChar)) {
      const composed = composeSyllable(lastChar, input);
      return composed ? `${text.slice(0, -1)}${composed}` : `${text}${input}`;
    }

    if (lastSyllable) {
      if (lastSyllable.jongseong) {
        const split = splitFinal(lastSyllable.jongseong);

        if (split) {
          const previous = composeSyllable(lastSyllable.choseong, lastSyllable.jungseong, split[0]);
          const next = composeSyllable(split[1], input);
          return previous && next ? `${text.slice(0, -1)}${previous}${next}` : `${text}${input}`;
        }

        if (CHOSEONG.includes(lastSyllable.jongseong)) {
          const previous = composeSyllable(lastSyllable.choseong, lastSyllable.jungseong);
          const next = composeSyllable(lastSyllable.jongseong, input);
          return previous && next ? `${text.slice(0, -1)}${previous}${next}` : `${text}${input}`;
        }
      }
    }

    return `${text}${input}`;
  }

  if (lastSyllable) {
    if (!lastSyllable.jongseong && JONGSEONG.includes(input)) {
      const composed = composeSyllable(lastSyllable.choseong, lastSyllable.jungseong, input);
      return composed ? `${text.slice(0, -1)}${composed}` : `${text}${input}`;
    }

    if (lastSyllable.jongseong) {
      const combined = combineFinal(lastSyllable.jongseong, input);
      if (combined) {
        const composed = composeSyllable(lastSyllable.choseong, lastSyllable.jungseong, combined);
        return composed ? `${text.slice(0, -1)}${composed}` : `${text}${input}`;
      }
    }
  }

  return `${text}${input}`;
}

export function removeLastHangulInput(text) {
  if (!text) {
    return '';
  }

  const lastChar = text[text.length - 1];
  const lastSyllable = decomposeSyllable(lastChar);

  if (!lastSyllable) {
    return text.slice(0, -1);
  }

  if (lastSyllable.jongseong) {
    const split = splitFinal(lastSyllable.jongseong);
    const nextFinal = split ? split[0] : '';
    const recomposed = composeSyllable(lastSyllable.choseong, lastSyllable.jungseong, nextFinal);
    return recomposed ? `${text.slice(0, -1)}${recomposed}` : text.slice(0, -1);
  }

  return `${text.slice(0, -1)}${lastSyllable.choseong}`;
}
