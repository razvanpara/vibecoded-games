window.WhatIsMissingArt = (() => {
    const { PARTS } = window.WhatIsMissingData;

    function partSvg(partId, label = "") {
        const part = PARTS[partId];
        if (!part) throw new RangeError(`Missing part illustration: ${partId}`);
        return `<svg class="part-art" viewBox="0 0 100 100" role="img" aria-label="${label || part.label}">${part.art}</svg>`;
    }

    function pictureSvg(puzzle, complete = false) {
        const { part } = puzzle;
        const components = puzzle.components ?? [{ part, slot: puzzle.slot }];
        const slotContent = components.map((component) => {
            const isMissing = component.part === part;
            const content = isMissing && !complete
                ? `<g class="missing-outline">${PARTS[component.part].silhouette}</g>`
                : `<g${isMissing ? ' class="completed-piece"' : ""}>${PARTS[component.part].art}</g>`;
            return `<g transform="translate(${component.slot.x} ${component.slot.y}) scale(${component.slot.scale})">${content}</g>`;
        }).join("");
        return `<svg viewBox="0 0 240 180" role="img" aria-label="${complete ? puzzle.object : `${puzzle.object} with a missing ${PARTS[part].label}`}" ><rect x="3" y="3" width="234" height="174" rx="30" fill="#fff8ed"/>${puzzle.art}${slotContent}</svg>`;
    }

    function welcomeSvg() {
        return '<svg viewBox="0 0 240 180" role="img" aria-label="A teddy bear with a missing ear"><ellipse cx="120" cy="151" rx="70" ry="15" fill="#e7d4bc"/><ellipse cx="120" cy="112" rx="52" ry="47" fill="#c7956b" stroke="#a97854" stroke-width="5"/><circle cx="120" cy="70" r="46" fill="#d0a27c" stroke="#a97854" stroke-width="5"/><circle cx="160" cy="32" r="22" fill="#bc855e" stroke="#a97854" stroke-width="5"/><circle cx="160" cy="32" r="10" fill="#e8b9a0"/><path d="M38 49C25 37 31 11 49 12c18 1 19 25 8 37" fill="#f7e8d7" fill-opacity=".63" stroke="#d4a77f" stroke-width="4" stroke-dasharray="6 4"/><ellipse cx="120" cy="88" rx="23" ry="17" fill="#f1d3ad"/><circle cx="104" cy="62" r="4" fill="#493b45"/><circle cx="136" cy="62" r="4" fill="#493b45"/><ellipse cx="120" cy="79" rx="5" ry="4" fill="#493b45"/><path d="M114 91q6 7 12 0" fill="none" stroke="#805b50" stroke-width="3" stroke-linecap="round"/><path d="M87 116q-17 4-22 20m101-20q17 4 22 20" fill="none" stroke="#bc855e" stroke-width="14" stroke-linecap="round"/></svg>';
    }

    return Object.freeze({ partSvg, pictureSvg, welcomeSvg });
})();