function toast(title, body, css) {
    let toast = $('#liveToast');
    toast.find('.toast-body').text(body);
    $('#toast-title').text(title);
    toast.attr('class', 'toast text-white bg-' + css);
    let bsToast = new bootstrap.Toast(toast[0]);
    bsToast.show();
}

function formatTimestamp(timestamp) {
    let date = new Date(timestamp);
    return leadingZero(date.getDay()) + '/' + leadingZero(date.getMonth()) + '/' + date.getFullYear() + ' - ' + date.getHours() + ':' + leadingZero(date.getMinutes());
}

function leadingZero(number) {
    return number < 10 ? '0' + number : number;
}