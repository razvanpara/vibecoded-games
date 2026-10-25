const { illustration } = window.FindItArt;
const { COLORS, OBJECTS } = window.FindItData;
const { generateRound, isCorrect } = window.FindItRounds;
const LANGUAGES = window.FindItLanguages;

const targetElement = document.getElementById("target");
const choicesElement = document.getElementById("choices");
const feedbackElement = document.getElementById("feedback");
const correctCountElement = document.getElementById("correct-count");
const wrongCountElement = document.getElementById("wrong-count");
const repeatButton = document.getElementById("repeat-button");
const soundButton = document.getElementById("sound-button");
const voiceButton = document.getElementById("voice-button");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const languageButtons = [...document.querySelectorAll(".language-button")];
const LANGUAGE_COOKIE = "findItLanguage";
const VOICE_COOKIE = "findItVoice";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

let mode = "object";
let language = readLanguageCookie();
let currentRound;
let locked = false;
let muted = false;
let voiceEnabled = readVoiceCookie();
let transitionTimer = 0;
let audioContext = null;
const sessionAnswers = { correct: 0, wrong: 0 };
const completedByMode = { object: 0, quantity: 0, color: 0 };
const previousByMode = {
    object: { targetId: null, answerPosition: -1 },
    quantity: { targetId: null, answerPosition: -1 },
    color: { targetId: null, answerPosition: -1 }
};

function readLanguageCookie() {
    const match = document.cookie.match(/(?:^|;\s*)findItLanguage=(en|ro)(?:;|$)/);
    return match ? match[1] : "en";
}

function readVoiceCookie() {
    const match = document.cookie.match(/(?:^|;\s*)findItVoice=(0|1)(?:;|$)/);
    return match ? match[1] === "1" : true;
}

function text() {
    return LANGUAGES[language].ui;
}

function objectWords(object) {
    return LANGUAGES[language].objects[object.id];
}

function objectName(object) {
    return objectWords(object)[0];
}

function objectPlural(object) {
    return objectWords(object)[1];
}

function objectTargetName(object) {
    return objectWords(object)[2];
}

function numberWord(quantity, object = null) {
    const quantityWords = object && text().quantityNumbers[object.id];
    return quantityWords ? quantityWords[quantity] : text().numbers[quantity];
}

function setFeedback(message, mood = "") {
    feedbackElement.textContent = message;
    feedbackElement.classList.remove("is-happy", "is-gentle");
    if (mood) {
        void feedbackElement.offsetWidth;
        feedbackElement.classList.add(`is-${mood}`);
    }
}

function renderSessionAnswers() {
    correctCountElement.textContent = String(sessionAnswers.correct);
    wrongCountElement.textContent = String(sessionAnswers.wrong);
}

function localizedIllustration(object, color = null) {
    return illustration(object, color).replace(
        `aria-label="${object.name}"`,
        `aria-label="${objectName(object)}"`
    );
}

function renderGroup(object, quantity, target = false) {
    const items = Array.from({ length: quantity }, () => localizedIllustration(object)).join("");
    const className = target ? "target-group" : "group-art";
    const noun = quantity === 1 ? objectName(object) : objectPlural(object);
    return `<div class="${className}" data-count="${quantity}" role="img" aria-label="${quantity} ${noun}">${items}</div>`;
}

function renderTarget(round) {
    const target = round.target;
    if (target.type === "quantity") {
        targetElement.innerHTML = renderGroup(target.object, target.quantity, true);
    } else if (target.type === "color") {
        targetElement.innerHTML = localizedIllustration(target.object, target.color);
        targetElement.firstElementChild.setAttribute("aria-label", colorLabel(target.color));
    } else {
        targetElement.innerHTML = localizedIllustration(target.object);
        targetElement.firstElementChild.setAttribute("aria-label", objectName(target.object));
    }
}

function colorName(color) {
    return language === "ro" ? color.nameRo : color.name;
}

function colorLabel(color) {
    return language === "ro" ? `${objectTargetName(OBJECTS.find(({ id }) => id === "ball"))} ${colorName(color)}`
        : `${colorName(color)} ball`;
}

function optionLabel(option) {
    if (option.type === "quantity") {
        return `${option.quantity} ${option.quantity === 1 ? objectName(option.object) : objectPlural(option.object)}`;
    }
    if (option.type === "color") return colorLabel(option.color);
    return objectName(option.object);
}

function renderOption(option, index) {
    let content;
    if (option.type === "quantity") {
        content = renderGroup(option.object, option.quantity);
    } else {
        content = localizedIllustration(option.object, option.color);
    }
    return `<button class="choice" type="button" data-choice="${index}" aria-label="${optionLabel(option)}">${content}</button>`;
}

function instructionFor(round) {
    if (round.target.type === "quantity") {
        const { quantity, object } = round.target;
        return language === "ro"
            ? `Găsește ${numberWord(quantity, object)} ${quantity === 1 ? objectName(object) : objectPlural(object)}!`
            : `Find ${numberWord(quantity)} ${quantity === 1 ? objectName(object) : objectPlural(object)}!`;
    }
    if (round.target.type === "color") {
        return language === "ro" ? `Găsește ${colorLabel(round.target.color)}!` : `Find the ${colorLabel(round.target.color)}!`;
    }
    return language === "ro"
        ? `Găsește ${objectTargetName(round.target.object)}!`
        : `Find the ${objectName(round.target.object)}!`;
}

function speak(text) {
    if (muted || !voiceEnabled) return;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        setFeedback(text);
        return;
    }
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = LANGUAGES[language].ui.locale;
        utterance.rate = 0.85;
        utterance.pitch = 1.08;
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.warn("Unable to speak the game prompt.", error);
        setFeedback(text);
    }
}

function playRoundStartSound() {
    if (muted || !("AudioContext" in window)) return;
    try {
        audioContext ??= new AudioContext();
        const now = audioContext.currentTime;
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.028, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
        gain.connect(audioContext.destination);
        [523.25, 659.25].forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
            oscillator.connect(gain);
            oscillator.start(now + index * 0.12);
            oscillator.stop(now + 0.22 + index * 0.12);
        });
        if (audioContext.state === "suspended") {
            audioContext.resume().catch((error) => console.warn("Unable to resume game audio.", error));
        }
    } catch (error) {
        console.warn("Unable to play the round-start sound.", error);
    }
}

function playSuccessSound() {
    if (muted || !("AudioContext" in window)) return;
    try {
        audioContext ??= new AudioContext();
        const now = audioContext.currentTime;
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
        gain.connect(audioContext.destination);
        [659.25, 783.99].forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, now + index * 0.13);
            oscillator.connect(gain);
            oscillator.start(now + index * 0.13);
            oscillator.stop(now + 0.25 + index * 0.13);
        });
        if (audioContext.state === "suspended") {
            audioContext.resume().catch((error) => console.warn("Unable to resume game audio.", error));
        }
    } catch (error) {
        console.warn("Unable to play the success sound.", error);
    }
}

function playIncorrectSound() {
    if (muted || !("AudioContext" in window)) return;
    try {
        audioContext ??= new AudioContext();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(392, now);
        oscillator.frequency.linearRampToValueAtTime(330, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.025, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.21);
        if (audioContext.state === "suspended") {
            audioContext.resume().catch((error) => console.warn("Unable to resume game audio.", error));
        }
    } catch (error) {
        console.warn("Unable to play the retry sound.", error);
    }
}

function startRound() {
    const previous = previousByMode[mode];
    currentRound = generateRound(mode, {
        roundsCompleted: completedByMode[mode],
        previousTargetId: previous.targetId,
        previousAnswerPosition: previous.answerPosition
    });
    previous.targetId = currentRound.target.type === "color"
        ? currentRound.target.color.id
        : currentRound.target.object.id;
    previous.answerPosition = currentRound.answerPosition;
    renderTarget(currentRound);
    choicesElement.innerHTML = currentRound.options.map(renderOption).join("");
    choicesElement.querySelectorAll(".choice").forEach((button) => {
        button.addEventListener("click", () => choose(button));
    });
    setFeedback(mode === "quantity" ? text().quantityHint : mode === "color" ? text().colorHint : text().objectHint);
    playRoundStartSound();
    speak(instructionFor(currentRound));
}

function successMessage(round) {
    const ui = text();
    if (round.target.type === "quantity") {
        const { quantity, object } = round.target;
        return `${ui.yes} ${numberWord(quantity, object)} ${quantity === 1 ? objectName(object) : objectPlural(object)}!`;
    }
    if (round.target.type === "color") return `${ui.yes} ${colorName(round.target.color)}!`;
    return ui.success[Math.floor(Math.random() * ui.success.length)];
}

function speakSuccess(round) {
    if (round.target.type === "quantity") {
        const { quantity, object } = round.target;
        const count = Array.from({ length: quantity }, (_, index) => text().numbers[index + 1]).join(", ");
        speak(`${successMessage(round)} ${count}!`);
    } else {
        speak(successMessage(round));
    }
}

function choose(button) {
    if (locked) return;
    const option = currentRound.options[Number(button.dataset.choice)];
    if (!option) return;
    if (!isCorrect(currentRound, option)) {
        sessionAnswers.wrong += 1;
        renderSessionAnswers();
        button.classList.remove("is-wrong");
        void button.offsetWidth;
        button.classList.add("is-wrong");
        playIncorrectSound();
        setFeedback(text().wrong, "gentle");
        button.addEventListener("animationend", () => button.classList.remove("is-wrong"), { once: true });
        return;
    }

    locked = true;
    sessionAnswers.correct += 1;
    renderSessionAnswers();
    choicesElement.querySelectorAll(".choice").forEach((choice) => {
        choice.disabled = true;
    });
    button.classList.add("is-correct");
    completedByMode[mode] += 1;
    const message = successMessage(currentRound);
    setFeedback(message, "happy");
    playSuccessSound();
    if (currentRound.target.type === "quantity") {
        speakSuccess(currentRound);
    } else {
        speak(message);
    }
    transitionTimer = window.setTimeout(() => {
        locked = false;
        startRound();
    }, 1250);
}

function selectMode(button) {
    if (button.dataset.mode === mode) {
        speak(instructionFor(currentRound));
        return;
    }
    window.clearTimeout(transitionTimer);
    locked = false;
    mode = button.dataset.mode;
    modeButtons.forEach((modeButton) => {
        const selected = modeButton === button;
        modeButton.classList.toggle("is-active", selected);
        modeButton.setAttribute("aria-pressed", String(selected));
    });
    startRound();
}

function applyLanguage() {
    const ui = text();
    document.documentElement.lang = language;
    document.title = language === "ro" ? "Hai să găsim! — Arcade Lab" : "Find It! — Arcade Lab";
    document.querySelector('meta[name="description"]').content = language === "ro"
        ? "Un joc blând de potrivire pentru cei mici: găsește același obiect, număr sau culoare."
        : "A gentle matching game for little learners. Find the same object, amount, or color.";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = ui[element.dataset.i18n];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
        element.setAttribute("aria-label", ui[element.dataset.i18nAria]);
    });
    renderSessionAnswers();
    languageButtons.forEach((button) => {
        const selected = button.dataset.language === language;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
    soundButton.setAttribute("aria-label", muted ? ui.unmute : ui.mute);
    voiceButton.setAttribute("aria-checked", String(voiceEnabled));
    voiceButton.setAttribute("aria-label", ui.voiceSwitch);
    voiceButton.querySelector("span").textContent = voiceEnabled ? ui.voiceOn : ui.voiceOff;
    voiceButton.classList.toggle("is-off", !voiceEnabled);
    repeatButton.setAttribute("aria-label", ui.repeatAria);
    if (currentRound) {
        renderTarget(currentRound);
        choicesElement.innerHTML = currentRound.options.map(renderOption).join("");
        choicesElement.querySelectorAll(".choice").forEach((button) => {
            button.disabled = locked;
            button.addEventListener("click", () => choose(button));
        });
        setFeedback(mode === "quantity" ? ui.quantityHint : mode === "color" ? ui.colorHint : ui.objectHint);
        speak(instructionFor(currentRound));
    }
}

modeButtons.forEach((button) => button.addEventListener("click", () => selectMode(button)));
languageButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.language === language) return;
    language = button.dataset.language;
    try {
        document.cookie = `${LANGUAGE_COOKIE}=${language}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch (error) {
        console.warn("Unable to save the selected language cookie.", error);
    }
    applyLanguage();
}));
voiceButton.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    try {
        document.cookie = `${VOICE_COOKIE}=${voiceEnabled ? "1" : "0"}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch (error) {
        console.warn("Unable to save the voice preference cookie.", error);
    }
    if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    applyLanguage();
});
repeatButton.addEventListener("click", () => speak(instructionFor(currentRound)));
soundButton.addEventListener("click", () => {
    muted = !muted;
    soundButton.setAttribute("aria-pressed", String(muted));
    soundButton.setAttribute("aria-label", muted ? text().unmute : text().mute);
    if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (!muted) speak(instructionFor(currentRound));
});

if (!OBJECTS.length || !COLORS.length) throw new Error("Find It requires object and color data.");
applyLanguage();
startRound();
