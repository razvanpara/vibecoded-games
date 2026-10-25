window.FindItData = (() => {
const OBJECTS = Object.freeze([
    { id: "cat", name: "cat", category: "animal" },
    { id: "dog", name: "dog", category: "animal" },
    { id: "rabbit", name: "rabbit", category: "animal" },
    { id: "cow", name: "cow", category: "animal" },
    { id: "duck", name: "duck", category: "animal" },
    { id: "fish", name: "fish", category: "animal" },
    { id: "bird", name: "bird", category: "animal" },
    { id: "elephant", name: "elephant", category: "animal" },
    { id: "apple", name: "apple", category: "food" },
    { id: "banana", name: "banana", category: "food" },
    { id: "strawberry", name: "strawberry", category: "food" },
    { id: "orange", name: "orange", category: "food" },
    { id: "carrot", name: "carrot", category: "food" },
    { id: "bread", name: "bread", category: "food" },
    { id: "pear", name: "pear", category: "food" },
    { id: "watermelon", name: "watermelon", category: "food" },
    { id: "ball", name: "ball", category: "everyday" },
    { id: "car", name: "toy car", category: "everyday" },
    { id: "teddy", name: "teddy bear", category: "everyday" },
    { id: "shoe", name: "shoe", category: "everyday" },
    { id: "cup", name: "cup", category: "everyday" },
    { id: "spoon", name: "spoon", category: "everyday" },
    { id: "toothbrush", name: "toothbrush", category: "everyday" },
    { id: "book", name: "book", category: "everyday" }
]);

const QUANTITY_OBJECTS = Object.freeze(
    OBJECTS.filter(({ id }) => ["apple", "banana", "ball", "car", "fish", "duck", "cup", "strawberry"].includes(id))
);

const COLORS = Object.freeze([
    { id: "red", name: "red", nameRo: "roșie", value: "#ed6868" },
    { id: "blue", name: "blue", nameRo: "albastră", value: "#63a9df" },
    { id: "yellow", name: "yellow", nameRo: "galbenă", value: "#f2c84b" },
    { id: "green", name: "green", nameRo: "verde", value: "#66ad76" },
    { id: "orange", name: "orange", nameRo: "portocalie", value: "#ed9856" },
    { id: "purple", name: "purple", nameRo: "mov", value: "#a782cf" },
    { id: "pink", name: "pink", nameRo: "roz", value: "#e98eb5" },
    { id: "brown", name: "brown", nameRo: "maro", value: "#9b7056" },
    { id: "black", name: "black", nameRo: "neagră", value: "#4d5059" }
]);

return Object.freeze({ OBJECTS, QUANTITY_OBJECTS, COLORS });
})();
