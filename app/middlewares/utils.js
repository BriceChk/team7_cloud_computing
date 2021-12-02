removeItemOnce = (arr, value) => {
    let index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

sanitize = (string) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return string.replace(reg, (match)=>(map[match]));
}

const wikiWords = ["albania", "germany", "andorra", "austria", "belgium", "belarus", "bulgaria", "cyprus", "croatia", "denmark", "spain", "estonia", "finland", "france", "greece", "hungary", "ireland", "iceland", "italy", "kosovo", "latvia", "liechtenstein", "lithuania", "luxembourg", "malta", "moldova", "monaco", "montenegro", "norway", "netherlands", "poland", "portugal", "romania", "uk", "russia", "serbia", "slovakia", "slovenia", "sweden", "swiss", "ukraine", "vatican", "tirana", "berlin", "vienna", "brussels", "minsk", "sarajevo", "sofia", "nicosia", "zagreb", "copenhagen", "madrid", "tallinn", "helsinki", "paris", "athens", "budapest", "dublin", "reykjavik", "rome", "pristina", "riga", "vaduz", "vilnius", "luxembourg", "skopje", "valletta", "chisinau", "monaco", "podgorica", "oslo", "amsterdam", "warsaw", "lisbon", "prague", "bucharest", "london", "moscow", "belgrade", "bratislava", "ljubljana", "stockholm", "bern", "kiev", "vatican"];

function replaceWikiWords(text) {
    let resultText = text;

    let words = text.split(' ');
    let alreadyReplaced = [];
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        if (!alreadyReplaced.includes(word) && wikiWords.includes(word.toLowerCase())) {
            alreadyReplaced.push(word);
            resultText = resultText.replaceAll(word, `<a target="_blank" href="https://en.wikipedia.org/wiki/${word.toLowerCase()}">${word}</a>`);
        }
    }

    return resultText;
}

const utils = {
    removeItemOnce,
    replaceWikiWords,
    sanitize
};
module.exports = utils;