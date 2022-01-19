// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

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
    return leadingZero(date.getDate()) + '/' + leadingZero(date.getMonth() + 1) + '/' + date.getFullYear() + ' - ' + date.getHours() + ':' + leadingZero(date.getMinutes());
}

function leadingZero(number) {
    return number < 10 ? '0' + number : number;
}