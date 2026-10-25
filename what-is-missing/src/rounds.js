window.WhatIsMissingRounds = (() => {
    const { PARTS, PUZZLES } = window.WhatIsMissingData;
    const CHOICE_COUNT = 9;
    const DIFFICULTIES = Object.freeze(["beginner", "intermediate", "advanced"]);

    function shuffle(items, random = Math.random) {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index -= 1) {
            const other = Math.floor(random() * (index + 1));
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }

    function validatePuzzles(puzzles = PUZZLES) {
        if (!Array.isArray(puzzles) || !puzzles.length) throw new TypeError("Puzzle collection must not be empty.");
        const ids = new Set();
        puzzles.forEach((puzzle) => {
            if (!puzzle.id || ids.has(puzzle.id)) throw new Error(`Puzzle IDs must be unique: ${puzzle.id}`);
            ids.add(puzzle.id);
            if (!puzzle.object || !puzzle.instruction || !puzzle.art || !puzzle.slot) throw new Error(`Puzzle is incomplete: ${puzzle.id}`);
            if (!PARTS[puzzle.part]) throw new Error(`Puzzle has an unknown correct part: ${puzzle.id}`);
            if (puzzle.missingPart !== puzzle.part || puzzle.correctAnswer !== puzzle.part) throw new Error(`Puzzle answer does not match its missing part: ${puzzle.id}`);
            if (!DIFFICULTIES.includes(puzzle.difficulty)) throw new Error(`Puzzle has an unknown difficulty: ${puzzle.id}`);
            if (!Array.isArray(puzzle.distractors) || puzzle.distractors.length < CHOICE_COUNT - 1
                || puzzle.distractors.includes(puzzle.correctAnswer)
                || new Set(puzzle.distractors).size !== puzzle.distractors.length
                || puzzle.distractors.some((partId) => !PARTS[partId])) {
                throw new Error(`Puzzle has invalid distractors: ${puzzle.id}`);
            }
        });
        return true;
    }

    function difficultyFor(completed) {
        if (completed < 3) return "beginner";
        if (completed < 7) return "intermediate";
        return "advanced";
    }

    function generateRound({ completed = 0, recentPuzzleIds = [], previousAnswerPosition = -1, random = Math.random } = {}) {
        if (!Number.isInteger(completed) || completed < 0) throw new RangeError("completed must be a non-negative integer");
        if (typeof random !== "function") throw new TypeError("random must be a function");
        if (!Array.isArray(recentPuzzleIds)) throw new TypeError("recentPuzzleIds must be an array");
        if (!Number.isInteger(previousAnswerPosition) || previousAnswerPosition < -1 || previousAnswerPosition >= CHOICE_COUNT) {
            throw new RangeError("previousAnswerPosition must be between -1 and 8");
        }
        const difficulty = difficultyFor(completed);
        const matching = PUZZLES.filter(({ difficulty: level }) => level === difficulty);
        const pool = matching.length ? matching : PUZZLES;
        const available = pool.filter(({ id, templateId }) => !recentPuzzleIds.includes(id) && !recentPuzzleIds.includes(templateId));
        const withoutImmediateRepeat = pool.filter(({ id, templateId }) => id !== recentPuzzleIds[0] && templateId !== recentPuzzleIds[0]);
        const puzzlePool = available.length ? available : withoutImmediateRepeat.length ? withoutImmediateRepeat : pool;
        const puzzle = puzzlePool[Math.floor(random() * puzzlePool.length)];
        const distractors = shuffle(puzzle.distractors, random).slice(0, CHOICE_COUNT - 1);
        const answerPositions = Array.from({ length: CHOICE_COUNT }, (_, index) => index)
            .filter((index) => index !== previousAnswerPosition);
        const answerPosition = answerPositions[Math.floor(random() * answerPositions.length)];
        const options = distractors;
        options.splice(answerPosition, 0, puzzle.correctAnswer);
        if (options.length !== CHOICE_COUNT || options.filter((id) => id === puzzle.correctAnswer).length !== 1) {
            throw new Error(`Puzzle must have exactly one correct answer: ${puzzle.id}`);
        }
        return { puzzle, options, answerId: puzzle.correctAnswer, answerPosition };
    }

    validatePuzzles();
    return Object.freeze({ CHOICE_COUNT, difficultyFor, generateRound, validatePuzzles });
})();