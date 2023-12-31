onload = (event) => init();
var last_time = 0;
var total_time = 0;
var games = 0;
var start_time = 0;
var seed;
var startseed;
var letters;
var gamemode;
var level;
var size;
var cols;
var rows;
const VERSION = "v1.1";
function init() {
    $('#version').text(VERSION);
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
    resolve('gamemode', true);
    resolve('level', true);
    resolve('size');

    [cols, rows] = size.split('*');
    $("#gamemode").on("change", changeGame);
    $("#level").on("change", changeGame);
    $("#size").on("change", changeGame);
    changeGame();
    window.addEventListener("resize", function () {
        calculateCSS();
    }, false);
}

function changeGame() {
    gamemode = Number($("#gamemode").val());
    if (gamemode > 7)
        letters = gamemode - 3;
    else
        letters = gamemode;
    setCookie("gamemode", gamemode, 730);
    level = $("#level").val();
    setCookie("level", level, 730);
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
    stopFireworks();
    $('#continue').hide();

    startseed = seed;
    let seed_url;
    seed_url = gamemode + "-" + "-" + size + startseed;

    var url = window.location.origin + window.location.pathname + "#" + seed_url;
    $("#share-url").val(url);
    $("#seed").attr('title', startseed);
    $('#loading').css('display', 'flex');
    $('#board_div').empty();
    $('#clues').empty();
    setTimeout(() => {
        fillCrypto();
    })
    updateStats();
    start_time = Date.now();
}

function initKeyboard() {
    if (level == 4) {
        ["Š", "Đ", "Č", "Ć", "Ž", "NJ", "DŽ", "LJ"].forEach(l => $('[l="' + l + '"]').hide());
        ["Q", "W", "X", 'Y'].forEach(l => $('[l="' + l + '"]').show());
    } else {
        ["Š", "Đ", "Č", "Ć", "Ž", "NJ", "DŽ", "LJ"].forEach(l => $('[l="' + l + '"]').show());
        ["Q", "W", "X", 'Y'].forEach(l => $('[l="' + l + '"]').hide());
    }
    $("#keyboard-div").hide();
}

var click_time = 0;
function handleClick(event) {
    if (Date.now() - click_time < 100)
        return false;
    click_time = Date.now();
    let el = $(event.target);
    if(el.prop("tagName") != 'DIV')
        el = el.parent();
    if (el.hasClass('l') || el.parent().hasClass('l')) {
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
    if (solved()) {
        setTimeout(() => {
            $('#board_div > div.l').addClass('winner2');
        }, 500)

        startFireworks();
        games++;
        last_time = Math.round((Date.now() - start_time) / 1000);
        total_time += last_time;
        $('#continue').show();
    }
}

function solved() {
    return !$('#board_div > div.l span.l').toArray().find(span => {
        return span.innerText != $(span).parent().data('l');
    })
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
    if (level == 1) dw = hrdict1;
    else if (level == 2) dw = hrdict2;
    else if (level == 3) dw = hrdict3;
    else if (level == 4) dw = endict;
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

function resolve(prop, num) {
    let value = window[prop];
    if (typeof value == 'undefined') {
        value = getCookie(prop);
        if (!value) {
            value = $('#' + prop).val();
            window[prop] = value;
            return;
        }
    }
    let options = $('#' + prop + ' option');
    let values = $.map(options, function (option) {
        return option.value;
    });
    if (values.indexOf("" + value) == -1) {
        value = values[0];
    }
    if (num)
        value = Number(value);
    window[prop] = value;
    $('#' + prop).val(value);
    setCookie(prop, value, 730);
}