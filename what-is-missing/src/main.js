(() => {
    const { partSvg, pictureSvg, welcomeSvg } = window.WhatIsMissingArt;
    const { generateRound, CHOICE_COUNT } = window.WhatIsMissingRounds;
    const { PARTS } = window.WhatIsMissingData;
    const welcomeScreen = document.getElementById("welcome-screen");
    const gameScreen = document.getElementById("game-screen");
    const playButton = document.getElementById("play-button");
    const homeButton = document.getElementById("home-button");
    const voiceButton = document.getElementById("voice-button");
    const soundButton = document.getElementById("sound-button");
    const promptElement = document.getElementById("prompt");
    const pictureElement = document.getElementById("picture");
    const feedbackElement = document.getElementById("feedback");
    const choicesElement = document.getElementById("choices");
    const countElement = document.getElementById("round-count");
    const celebrationElement = document.getElementById("celebration");

    let completed = 0;
    let recentPuzzleIds = [];
    let previousAnswerPosition = -1;
    let currentRound = null;
    let locked = true;
    let muted = false;
    let voiceEnabled = false;
    let transitionTimer = 0;
    let audioContext = null;

    document.getElementById("welcome-art").innerHTML = welcomeSvg();

    function setFeedback(message, mood = "") {
        feedbackElement.textContent = message;
        feedbackElement.classList.remove("is-happy", "is-gentle");
        if (mood) {
            void feedbackElement.offsetWidth;
            feedbackElement.classList.add(`is-${mood}`);
        }
    }

    function speak(message) {
        if (!voiceEnabled || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = "en-US";
            utterance.rate = .83;
            utterance.pitch = 1.12;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn("Unable to speak the game prompt.", error);
        }
    }

    function playNotes(frequencies, duration = .42) {
        if (muted || !("AudioContext" in window)) return;
        try {
            audioContext ??= new AudioContext();
            const now = audioContext.currentTime;
            const gain = audioContext.createGain();
            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(.035, now + .025);
            gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
            gain.connect(audioContext.destination);
            frequencies.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(frequency, now + index * .12);
                oscillator.connect(gain);
                oscillator.start(now + index * .12);
                oscillator.stop(now + duration + index * .12);
            });
            if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
        } catch (error) {
            console.warn("Unable to play the game sound.", error);
        }
    }

    function renderOptions() {
        choicesElement.innerHTML = currentRound.options.map((partId, index) =>
            `<button class="choice" type="button" data-choice="${index}" aria-label="${PARTS[partId].label}">${partSvg(partId)}</button>`
        ).join("");
        choicesElement.querySelectorAll(".choice").forEach((button) => {
            button.addEventListener("click", () => choose(button));
        });
    }

    function startRound() {
        currentRound = generateRound({ completed, recentPuzzleIds, previousAnswerPosition });
        previousAnswerPosition = currentRound.answerPosition;
        recentPuzzleIds = [currentRound.puzzle.templateId, ...recentPuzzleIds].slice(0, 2);
        promptElement.textContent = currentRound.puzzle.instruction;
        pictureElement.innerHTML = pictureSvg(currentRound.puzzle);
        countElement.textContent = String(completed);
        setFeedback("Tap a piece to help!");
        renderOptions();
        locked = false;
        speak(currentRound.puzzle.instruction);
        playNotes([523.25, 659.25], .34);
    }

    function showCelebration() {
        const colors = ["#ee8bb6", "#f1c75b", "#83b879", "#77b8d0", "#f29b72"];
        celebrationElement.innerHTML = Array.from({ length: 28 }, (_, index) => {
            const color = colors[index % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * .28;
            const drift = `${Math.round(Math.random() * 140 - 70)}px`;
            return `<i class="confetti" style="left:${left}%;background:${color};animation-delay:${delay}s;--drift:${drift}"></i>`;
        }).join("");
        window.setTimeout(() => { celebrationElement.innerHTML = ""; }, 1900);
    }

    function flyPiece(button) {
        const pictureSvgElement = pictureElement.querySelector("svg");
        const optionSvg = button.querySelector("svg");
        const optionRect = optionSvg.getBoundingClientRect();
        const pictureRect = pictureSvgElement.getBoundingClientRect();
        const { slot } = currentRound.puzzle;
        const centerX = pictureRect.left + (slot.x + 50 * slot.scale) * pictureRect.width / 240;
        const centerY = pictureRect.top + (slot.y + 50 * slot.scale) * pictureRect.height / 180;
        const startX = optionRect.left + optionRect.width / 2;
        const startY = optionRect.top + optionRect.height / 2;
        const targetScale = pictureRect.width / 240 * slot.scale;
        const flight = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        flight.setAttribute("viewBox", "0 0 100 100");
        flight.setAttribute("aria-hidden", "true");
        flight.setAttribute("class", "flight-piece");
        flight.setAttribute("width", String(optionRect.width));
        flight.setAttribute("height", String(optionRect.height));
        flight.style.left = `${startX - optionRect.width / 2}px`;
        flight.style.top = `${startY - optionRect.height / 2}px`;
        flight.style.setProperty("--dx", `${centerX - startX}px`);
        flight.style.setProperty("--dy", `${centerY - startY}px`);
        flight.style.setProperty("--target-scale", String(targetScale));
        flight.innerHTML = PARTS[currentRound.answerId].art;
        document.body.append(flight);
        window.setTimeout(() => flight.remove(), 700);
    }

    function choose(button) {
        if (locked) return;
        const optionId = currentRound.options[Number(button.dataset.choice)];
        if (!optionId) return;
        if (optionId !== currentRound.answerId) {
            button.classList.remove("is-wrong");
            void button.offsetWidth;
            button.classList.add("is-wrong");
            setFeedback("Let's try again!", "gentle");
            playNotes([392, 349], .2);
            speak("Let's try again!");
            button.addEventListener("animationend", () => button.classList.remove("is-wrong"), { once: true });
            return;
        }

        locked = true;
        choicesElement.querySelectorAll("button").forEach((choice) => { choice.disabled = true; });
        button.classList.add("is-correct");
        flyPiece(button);
        setFeedback("You did it!", "happy");
        speak("You did it! Great job!");
        playNotes([659.25, 783.99, 987.77], .58);
        transitionTimer = window.setTimeout(() => {
            completed += 1;
            countElement.textContent = String(completed);
            pictureElement.innerHTML = pictureSvg(currentRound.puzzle, true);
            if (completed % 5 === 0) showCelebration();
            transitionTimer = window.setTimeout(startRound, 760);
        }, 620);
    }

    function startGame(reset = false) {
        window.clearTimeout(transitionTimer);
        if (reset) {
            completed = 0;
            recentPuzzleIds = [];
            previousAnswerPosition = -1;
        }
        welcomeScreen.hidden = true;
        gameScreen.hidden = false;
        startRound();
    }

    function goHome() {
        window.clearTimeout(transitionTimer);
        locked = true;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        gameScreen.hidden = true;
        welcomeScreen.hidden = false;
    }

    playButton.addEventListener("click", () => startGame(true));
    homeButton.addEventListener("click", goHome);
    voiceButton.addEventListener("click", () => {
        voiceEnabled = !voiceEnabled;
        voiceButton.setAttribute("aria-pressed", String(voiceEnabled));
        voiceButton.setAttribute("aria-label", voiceEnabled ? "Voice on" : "Voice off");
        voiceButton.title = voiceEnabled ? "Voice on" : "Voice off";
        if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
        if (voiceEnabled && currentRound && !gameScreen.hidden) speak(currentRound.puzzle.instruction);
    });
    soundButton.addEventListener("click", () => {
        muted = !muted;
        soundButton.setAttribute("aria-pressed", String(muted));
        soundButton.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
        soundButton.title = muted ? "Sound off" : "Sound on";
    });

    if (CHOICE_COUNT !== 9) throw new Error("What Is Missing must always have nine answer cells.");
})();