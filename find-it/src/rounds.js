(() => {
const { COLORS, OBJECTS, QUANTITY_OBJECTS } = window.FindItData;

const MODES = Object.freeze(["object", "quantity", "color"]);
const CHOICE_COUNT = 9;

function createSeededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function randomIndex(length, random) {
    return Math.floor(random() * length);
}

function shuffled(items, random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const other = randomIndex(index + 1, random);
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

function chooseDifferent(items, previousId, random) {
    const alternatives = items.filter(({ id }) => id !== previousId);
    const choices = alternatives.length ? alternatives : items;
    return choices[randomIndex(choices.length, random)];
}

function makeOptions(values, answerIndex, wrap) {
    const distractors = values.filter((_, index) => index !== answerIndex);
    const ordered = shuffled(distractors, wrap.random);
    const options = [...ordered];
    const allowedPositions = Array.from({ length: options.length + 1 }, (_, index) => index)
        .filter((index) => index !== wrap.previousAnswerPosition);
    const position = allowedPositions[randomIndex(allowedPositions.length, wrap.random)];
    options.splice(position, 0, values[answerIndex]);
    return { options, answerPosition: position };
}

function shuffledAnswer(values, answer, wrap) {
    const distractors = shuffled(values.filter((value) => value.id !== answer.id), wrap.random);
    const positions = Array.from({ length: CHOICE_COUNT }, (_, index) => index)
        .filter((index) => index !== wrap.previousAnswerPosition);
    const answerPosition = positions[randomIndex(positions.length, wrap.random)];
    distractors.splice(answerPosition, 0, answer);
    return { options: distractors, answerPosition };
}

function isCorrect(round, option) {
    return Boolean(round && option) && option.value === round.answerValue;
}

function generateRound(mode, {
    random = Math.random,
    roundsCompleted = 0,
    previousTargetId = null,
    previousAnswerPosition = -1
} = {}) {
    if (!MODES.includes(mode)) throw new RangeError(`Unknown game mode: ${mode}`);
    if (typeof random !== "function") throw new TypeError("random must be a function");
    if (!Number.isInteger(roundsCompleted) || roundsCompleted < 0) throw new RangeError("roundsCompleted must be a non-negative integer");
    if (!Number.isInteger(previousAnswerPosition) || previousAnswerPosition < -1 || previousAnswerPosition >= CHOICE_COUNT) {
        throw new RangeError("previousAnswerPosition must be between -1 and 8");
    }

    const wrap = { random, previousAnswerPosition };
    if (mode === "object") {
        const target = chooseDifferent(OBJECTS, previousTargetId, random);
        const distractors = shuffled(OBJECTS.filter(({ id }) => id !== target.id), random).slice(0, CHOICE_COUNT - 1);
        const { options, answerPosition } = shuffledAnswer([...distractors, target], target, wrap);
        return {
            mode,
            target: { type: "object", object: target },
            options: options.map((object) => ({ type: "object", object, value: object.id })),
            answerValue: target.id,
            answerPosition
        };
    }

    if (mode === "quantity") {
        const target = chooseDifferent(QUANTITY_OBJECTS, previousTargetId, random);
        const maxQuantity = roundsCompleted < 4 ? 3 : 5;
        const quantity = 1 + randomIndex(maxQuantity, random);
        const distractorQuantities = Array.from({ length: CHOICE_COUNT - 1 }, () => {
            const otherQuantities = Array.from({ length: maxQuantity }, (_, index) => index + 1)
                .filter((amount) => amount !== quantity);
            return otherQuantities[randomIndex(otherQuantities.length, random)];
        });
        const positions = Array.from({ length: CHOICE_COUNT }, (_, index) => index)
            .filter((index) => index !== previousAnswerPosition);
        const answerPosition = positions[randomIndex(positions.length, random)];
        const quantities = [...distractorQuantities];
        quantities.splice(answerPosition, 0, quantity);
        return {
            mode,
            target: { type: "quantity", object: target, quantity },
            options: quantities.map((amount) => ({ type: "quantity", object: target, quantity: amount, value: amount })),
            answerValue: quantity,
            answerPosition
        };
    }

    const target = chooseDifferent(COLORS, previousTargetId, random);
    const object = OBJECTS.find(({ id }) => id === "ball");
    const { options, answerPosition } = makeOptions(COLORS, COLORS.indexOf(target), wrap);
    return {
        mode,
        target: { type: "color", object, color: target },
        options: options.map((color) => ({ type: "color", object, color, value: color.id })),
        answerValue: target.id,
        answerPosition
    };
}

window.FindItRounds = Object.freeze({ MODES, CHOICE_COUNT, createSeededRandom, generateRound, isCorrect });
})();
