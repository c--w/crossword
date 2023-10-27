onload = (event) => init();
var last_time = 0;
var total_time = 0;
var games = 0;
var start_time = 0;
var seed;
var startseed;
var letters;
var gamemode;
var size;
var cols;
var rows;
function init() {
    let board_div = document.querySelector("#board_div");
    board_div.onclick = (event) => handleClick(event);    
    $(".key")
        .toArray()
        .forEach((key) => {
            $(key).data("l", $(key).text());
            $(key).attr("l", $(key).text());
        });
    $(".key").on("click", handleKeyClick);
    initSeed();
    if (!gamemode) {// try cookie
        gamemode = Number(getCookie("gamemode"));
        size = getCookie("size") || "12*12";
    }
    if (isNaN(gamemode)) { // try select
        gamemode = $("#gamemode").val();
        size = $("#size").val();
    }
    if (gamemode < 4)
        gamemode = 7;
    [cols, rows] = size.split('*');
    $("#gamemode").val(gamemode);
    $("#size").val(size);
    setCookie("gamemode", gamemode, 730);
    setCookie("size", size, 730);
    $("#gamemode").on("change", changeGame);
    $("#size").on("change", changeGame);
    changeGame();
    window.onresize = function () {
        if (gamemode > 7)
            calculateCSS();
    }
}

function changeGame() {
    gamemode = Number($("#gamemode").val());
    if (gamemode > 7)
        letters = gamemode - 3;
    else
        letters = gamemode;
    setCookie("gamemode", gamemode, 730);
    setup_dw();
    size = $("#size").val();
    setCookie("size", size, 730);
    [cols, rows] = size.split('*');
    [cols, rows] = [Number(cols), Number(rows)];
    last_time = 0;
    total_time = 0;
    games = 0;
    start_time = 0;
    initKeyboard();
    setBckg();
    initGame();
}

function initGame() {
    startseed = seed;
    let seed_url;
    seed_url = gamemode + "-" + "-" + size + startseed;

    var url = window.location.origin + window.location.pathname + "#" + seed_url;
    $("#share-url").val(url);
    $("#seed").attr('title', startseed);
    $('#loading').css('display', 'flex');
    $('#board_div').empty();
    setTimeout(() => {
        fillCrypto();
    })
    updateStats();
    start_time = Date.now();
}

function initKeyboard() {
    ["Š", "Đ", "Č", "Ć", "Ž", "NJ", "DŽ", "LJ"].forEach(l => $('[l="' + l + '"]').hide());
    ["Q", "W", "X", 'Y'].forEach(l => $('[l="' + l + '"]').show());
}

var click_time = 0;
function handleClick(event) {
    if (Date.now() - click_time < 100)
        return false;
    click_time = Date.now();
    let el = $(event.target);
    if (el.hasClass('l')) {
        effect(el);
        $("#board_div div").removeClass('selected')
        el.addClass('selected');
        $("#keyboard-div").css('display', 'flex');
        showKeyboard(el);
    }
}

function showKeyboard(el) {
    let scale = (window.visualViewport.width || screen.width) / screen.width;
    const target = el;
    const popover = $("#keyboard-div");
    popover.css('transform', 'scale(' + scale + ')');
    popover.css('-webkit-transform', 'scale(' + scale + ',' + scale + ')');

    const targetRect = target.offset();
    const popoverRect = popover.offset();
    let w = popover.width();
    let top = targetRect.top + target.height() - (1 - scale) * popover.height() / 2;
    let left = targetRect.left + target.width() / 2 - w / 2;
    if (left < -(1 - scale) * w / 2)
        left = -(1 - scale) * w / 2;
    if (left + w - w * (1 - scale) / 2 > screen.width)
        left = screen.width - w + w * (1 - scale) / 2;
    popover.css("top", `${top + 8}px`);
    popover.css("left", `${left}px`);
}


function handleKeyClick(event) {
    let key = $(event.target);
    $("#keyboard-div").hide();
    let l = key.data('l');
    let selected = $('#board_div div.selected span.l');
    if (key.hasClass('del')) {
        selected.text('');
    } else {
        let key_l = key.data('l');
        selected.text(key_l);
    }
}

function isStraight(el) {
    let len = undo_stack.length;
    if (len < 2)
        return true;
    let dxp = undo_stack_elem[len - 1].data('x') - undo_stack_elem[len - 2].data('x');
    let dyp = undo_stack_elem[len - 1].data('y') - undo_stack_elem[len - 2].data('y');
    let dx = el.data('x') - undo_stack_elem[len - 1].data('x');
    let dy = el.data('y') - undo_stack_elem[len - 1].data('y');
    if (dxp != dx || dyp != dy)
        return false;
    return true;
}

function isWholeWordSelected(el) {
    let len = undo_stack.length;
    if (len < 1)
        return;
    let dx = el.data('x') - undo_stack_elem[len - 1].data('x');
    let dy = el.data('y') - undo_stack_elem[len - 1].data('y');
    if (!(Math.abs(dx) > 1 && dy == 0 || dx == 0 && Math.abs(dy) > 1 || Math.abs(dx) == Math.abs(dy)))
        return;
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    let start_x = undo_stack_elem[len - 1].data('x') + dx;
    let start_y = undo_stack_elem[len - 1].data('y') + dy;
    let end_x = el.data('x');
    let end_y = el.data('y');
    var all_divs = $('.letter').toArray();
    while (start_x != end_x || start_y != end_y) {
        let ind = start_y * cols + start_x;
        let current = $(all_divs[ind]);
        current.addClass('past-selected');
        undo_stack.push(current.data('l'));
        undo_stack_elem.push(current);
        start_x += dx;
        start_y += dy;
    }
}
function reset() {
    undo_stack = [];
    undo_stack_elem = [];
    last_selected = null;
    $('.letter').removeClass('selected past-selected');
}

function rand() {
    seed++;
    let t = seed + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function initSeed() {
    if (window.location.hash) {
        let tmp = window.location.hash.substring(1).split("-");
        gamemode = Number(tmp[0])
        level = Number(tmp[1])
        size = tmp[2];
        [cols, rows] = size.split('*');
        seed = Number(tmp[3]);
        if (!isNaN(seed))
            return;
    }
    let now = new Date();
    seed = now.toISOString().replaceAll("-", "").replaceAll("T", "").replaceAll(":", "").substring(2, 12);
    seed = Number(seed + '0000');
}


var dw;
function setup_dw() {
    dw = endict;
}
function getRandomWord(length) {
    let filtered = dw.filter((word) => {
        word = cdl(word);
        if (length)
            return word.length == length;
        else
            return word.length <= letters;
    });
    let i = Math.floor(rand() * filtered.length);
    let word = filtered[i];
    return cdl(word);
}

function setBckg() {
    var color = (Math.random() * 20 + 235 << 0).toString(16) + (Math.random() * 20 + 235 << 0).toString(16) + (Math.random() * 20 + 235 << 0).toString(16);
    var url = "https://bg.siteorigin.com/api/image?2x=0&blend=40&color=%23" + color + "&intensity=10&invert=0&noise=0&pattern=" + g_patterns[Math.floor(Math.random() * g_patterns.length)];
    $('body').css('background-image', 'url(' + url + ')');
}

function effect(el) {
    el.addClass('effect');
    setTimeout((el) => el.removeClass('effect'), 100, el);
}

function updateStats() {
    $("#games").text(games);
    $("#last").text(last_time);
    $("#total").text(total_time);
    if (!games)
        return;
    let avg = Math.round(total_time / games);
    $("#avg").text(avg);
    let key = 'words' + games + '-' + gamemode + '-' + level;
    let best = localStorage.getItem(key);
    if (best) {
        best = Number(best);
        if (avg < best) {
            best = avg;
        }
    } else {
        best = avg;
    }
    localStorage.setItem(key, best);
    $("#best-games").text(games);
    $("#best").text(best);
}

function randomsort(a, b) {
    return Math.random() * 2 - 1;
}