var grid;
var words;
var clues;
function calculateCSS() {
    let width = Math.floor(window.innerWidth / (Number(cols) + 1));
    if (width > 80)
        width = 80;
    $('#board_div').css("grid-template-columns", "repeat(" + cols + ", " + width + "px)");
    $('#board_div').css("grid-template-rows", "repeat(" + rows + ", " + width + "px)");
    $('#board_div').css("font-size", width / 2 + "px");
}

var used_letters;
function fillCrypto() {
    words = [];
    clues = [];
    grid = createGrid();
    fillHorizontal(0);
}
function fillCrypto2() {
    calculateCSS();
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let l = grid[i][j];
            if (!l)
                grid[i][j] = '⬛';
        }
    }
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let l = grid[i][j];
            let div = $('<div>');
            if (l != '⬛') {
                div.append($('<span class="l">'));
                div.data('l', l);
                div.attr('l', l);
                div.addClass('l');
            } else {
                div.html(l);
                div.addClass('b');
            }
            div.data('i', i * cols + j);
            div.data('x', j);
            div.data('y', i);
            $('#board_div').append(div);
        }
    }

    let divs = $('#board_div div').toArray();
    let ii = 1;
    words.forEach(w => {
        for (let i = 0; i < w.w.length; i++) {
            let div = divs[(w.row + w.v * i) * cols + (w.col + (1 - w.v) * i)];
            div = $(div);
            let rbr = ii;
            if (i == 0) {
                if (!div.data('rbr')) {
                    div.data('rbr', ii);
                    div.append($('<span class="rbr">' + rbr + '</span>'))
                    ii++;
                } else {
                    rbr = div.data('rbr');
                }
                let word = w.w.join('');
                setTimeout((w, rbr) => {

                    $.ajax({
                        type: 'GET',
                        url: 'https://api.dictionaryapi.dev/api/v2/entries/en/' + word,
                        dataType: 'json',
                        success: (data) => {
                            let definition = data[0].meanings[0].definitions[0].definition;
                            let clue = { rbr: rbr, w: w, def: definition };
                            clues.push(clue);
                        },
                        error: (data) => {
                            let definition = "Unknown word";
                            let clue = { rbr: rbr, w: w, def: definition };
                            clues.push(clue);
                        }
                    });
                }, 10, w, rbr);
            }
            div.addClass(rbr + '_' + w.v);
        }
    })
    $("#hints").css("display", "flex");
    fillClues();
}

function fillClues() {
    if (clues.length != words.length) {
        setTimeout(fillClues, 10);
        return;
    }
    $("#clues").empty();
    clues.sort((a, b) => a.rbr - b.rbr);
    clues.forEach(clue => {
        let div = $('<div>');
        let text = clue.rbr;
        if (clue.w.v)
            text += 'v. '
        else
            text += 'h. '
        text += clue.def;
        div.html(text);
        div.data("clue", clue)
        $("#clues").append(div)
    })
    $('#loading').hide();
}
function fillHorizontal(d) {
    let row = d / 2;
    let pattern = '';
    let c = 0;
    let start = 0;
    let i = 0;
    while (row < rows && i < cols) {
        if (grid[row][i] != '⬛') {
            pattern += grid[row][i] || '.';
            c++;
            i++;
            if (c < letters && i < cols)
                continue;
        }
        if (c < 4) { // any 2-3 letters will be ok
            i++;
            if (i >= cols) { // stop appeared at the end
                break;
            }
            pattern = '';
            c = 0;
            start = i;
            continue;
        }
        if (!pattern.includes('.') && cols - i < 4) {
            break;
        }
        let r = makeRegex(pattern);
        let filtered = dw.filter(w => w.match(r));
        filtered.sort(randomsort);
        let ok;
        if (filtered.length) {
            let word = cdl(filtered[0]);
            for (let iii = 0; iii < word.length; iii++) {
                grid[row][start + iii] = word[iii];
            }
            words.push({ v: 0, row: row, col: start, w: word })
            if (start + word.length < cols)
                grid[row][start + word.length] = '⬛';
            i = start + word.length + 1;
            start = i;
            ok = true;
        }
        if (ok) {
            pattern = '';
            c = 0;
            continue;
        }
        i = placeBSRow(row, start)
        start = i;
        pattern = '';
        c = 0;
        continue;
    }

    if (Math.floor((d + 1) / 2) < Math.max(rows, cols)) {
        setTimeout(() => {
            fillVertical(d + 1);
        })
        return;
    }
    return;
}

function placeBSRow(row, start) {
    let i;
    for (i = start; i < cols; i++) {
        if (!grid[row][i] || grid[row][i] == '⬛')
            break;
    }
    grid[row][i] = '⬛';
    return i + 1;
}
function placeBSCol(col, start) {
    let i;
    for (i = start; i < cols; i++) {
        if (!grid[i][col] || !grid[i][col] == '⬛')
            break;
    }
    grid[i][col] = '⬛';
    return i + 1;
}

function fillVertical(d) {
    let col = Math.floor(d / 2);
    let pattern = '';
    let c = 0;
    let start = 0;
    let i = 0;
    while (col < cols && i < rows) {
        if (grid[i][col] != '⬛') {
            pattern += grid[i][col] || '.';
            c++;
            i++;
            if (c < letters && i < rows)
                continue;
        }
        if (c < 4) { // any 2-3 letters will be ok
            i++;
            if (i >= rows) { // stop appeared at the end
                break;
            }
            pattern = '';
            c = 0;
            start = i;
            continue;
        }
        if (!pattern.includes('.') && rows - i < 4) {
            break;
        }
        let r = makeRegex(pattern);
        let filtered = dw.filter(w => w.match(r));
        filtered.sort(randomsort);
        let ok;
        if (filtered.length) {
            let word = cdl(filtered[0]);
            for (let iii = 0; iii < word.length; iii++) {
                grid[start + iii][col] = word[iii];
            }
            words.push({ v: 1, row: start, col: col, w: word })
            if (start + word.length < rows)
                grid[start + word.length][col] = '⬛';
            i = start + word.length + 1;
            start = i;
            ok = true;
        }
        if (ok) {
            pattern = '';
            c = 0;
            continue;
        }
        i = placeBSCol(col, start)
        start = i;
        pattern = '';
        c = 0;
        continue;
    }
    if (Math.floor((d + 1) / 2) < Math.max(rows, cols)) {
        setTimeout(() => {
            fillHorizontal(d + 1);
        });
        return;
    }
    console.table(grid);
    fillCrypto2()
}

function makeRegex(pattern) {
    console.log(pattern);
    let tmp = pattern.split('');
    let result = '';
    let nc = 0, ndot = 0;
    tmp.forEach(c => {
        if (c != '.') {
            if (ndot != 0) {
                if (ndot == 1) {
                    result += '.';
                    nc++;
                } else {
                    result += '.{' + ndot + '}'
                    nc += ndot;
                }
                ndot = 0;
            }
            result += c;
            nc++;
        } else
            ndot++;
    });
    if (ndot != 0) {
        let min = 0;
        if (nc < 4)
            min = 4 - nc;
        result += '.{' + min + ',' + ndot + '}'
    }
    result = '^' + result + '$';
    const regex = new RegExp(result, 'g');
    return regex;
}

function createGrid() {
    let grid = new Array(rows); //create 2 dimensional array for letter grid
    for (let i = 0; i < rows; i++) {
        grid[i] = new Array(cols);
    }
    return grid;
}

function cloneGrid(g) {
    let grid = new Array(rows); //create 2 dimensional array for letter grid
    for (let i = 0; i < rows; i++) {
        grid[i] = new Array(cols);
        for (let j = 0; j < cols; j++) {
            grid[i][j] = g[i][j] || '';
        }
    }
    return grid;
}