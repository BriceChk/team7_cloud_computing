// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

let socket = io();
const uploader = new SocketIOFileUpload(socket);
uploader.listenOnInput(document.getElementById("siofu_input"));
uploader.addEventListener('start', function (event) {
    socket.emit('start-upload', {
        conversationId: currentConversationId,
        fileName: event.file.name
    });
});

uploader.addEventListener('complete', function (event) {
    bootstrap.Modal.getInstance(document.getElementById('sendFileModal')).hide();
});

let username = '';
let data = {
    globalMessages: [],
    conversations: {}
};
let users = [];
let currentConversationId = 'global';

$(document).ready(() => {
    $('#chat-list-parent').on('click', '.conversation-item', function () {
        $('.conversation-item').removeClass('active');
        $(this).addClass('active').removeClass('new-message');

        currentConversationId = $(this).attr('id');
        populateMessageList();
        //TODO Show participants list
    });

    let inputUsername = $('#input-username');

    $('#btn-login').click(function () {
        // Hide past error
        $('#txt-taken-username').hide();

        // Get the input of username
        username = inputUsername.val().trim();
        let errorUsername = $('#txt-blank-username');
        // Check if it's not blank
        if (username === '') {
            errorUsername.show();
            return;
        }

        // Emit connect event to socket
        socket.emit('connect-username', {user: username, id: socket.id});
        errorUsername.hide();
    });

    inputUsername.keypress(function (ev) {
        if (ev.keyCode === 13) {
            $('#btn-login').click();
        }
    });

    $('#btn-send').click(function () {
        let inputMsg = $('#input-msg');
        let content = inputMsg.val().trim();

        if (content !== '') {
            if (currentConversationId !== 'global') {
                let conv = data.conversations[currentConversationId];
                if (conv.messages.length === 0 && conv.participants.length === 2) {
                    socket.emit('new-direct-message', {
                        id: currentConversationId,
                        participants: conv.participants,
                        content: inputMsg.val()
                    });
                    return;
                }
            }
            socket.emit('chat-message', {
                conversation: currentConversationId,
                content: inputMsg.val()
            });
        }

        inputMsg.val('');
    });

    $('#input-msg').keypress(function (ev) {
        if (ev.keyCode === 13) {
            $('#btn-send').click();
        }
    });

    $('#btn-private-message').click(function () {
        let notFoundError = $('#txt-user-not-found');
        notFoundError.hide();
        let recipient = $('#inputPMUsername').val();
        if (users.includes(recipient) && recipient !== username) {
            let participants = [recipient, username];
            participants.sort();
            let pmId = participants.join('-');
            if (pmId in data.conversations) {
                // Click on the conversation in the sidebar to load it
                $('#' + pmId).click();
            } else {
                // Create the new conversation
                data.conversations[pmId] = {
                    participants: participants,
                    messages: [],
                    name: '__private_chat__'
                }

                populateChatsList();
                $('#' + pmId).click();
                let modal = bootstrap.Modal.getInstance(document.getElementById('privateMessageModal'));
                modal.hide();
            }
        } else {
            notFoundError.show();
        }
    });

    $('#input-group-users').change(function () {
        let selected = $('#input-group-users option:selected');
        let list = $('#group-selected-user-list');

        let badge = $('<span class="badge rounded-pill bg-primary me-2">' + selected.text() + ' <i class="bi bi-x"></i></span>');
        badge.click(function () {
            $('#input-group-users').append('<option>' + badge.text() + '</option>');
            badge.remove();
            if (list.children().length < 2) {
                $('#btn-create-group').prop('disabled', true);
            }
        });
        selected.remove();

        list.append(badge);
        if (list.children().length >= 2) {
            $('#btn-create-group').prop('disabled', false);
        }
    });

    $('#btn-create-group').click(function () {
        let blankNameError = $('#txt-blank-group-name');
        let inputGroupName = $('#input-group-name');

        let groupName = inputGroupName.val().trim();
        if (groupName === '') {
            blankNameError.show();
            return;
        }
        blankNameError.hide();

        let participants = [ username ];
        $('#group-selected-user-list').children().each(function () {
            participants.push($(this).text().trim());
        });

        socket.emit('create-group', {
            name: groupName,
            participants: participants,
        });

        inputGroupName.val('');
        bootstrap.Modal.getInstance(document.getElementById('newGroupModal')).hide();
    });

    let cookie = getCookie('username');
    if (cookie) {
        inputUsername.val(cookie);
    }
});

socket.on('successful-login', function (received) {
    data = received;

    // Store username in cookie
    setCookie('username', username, '30');

    // Build conversations list
    populateChatsList();

    populateMessageList();

    // Show chat page
    $('#login-page').hide();
    $('#main-page').show();
});

socket.on('username-already-taken', function () {
    $('#txt-taken-username').show();
});

socket.on('user-list', function (data) {
    users = data;
    let userList = $('#user-list');
    let pmUserList = $('#usernameOptions');
    let groupUserList = $('#input-group-users');
    userList.empty();
    pmUserList.empty();
    groupUserList.empty();
    groupUserList.append('<option selected>Select user</option>');

    data.sort();

    for (const user of data) {
        let clone = $('#models .user-item').clone();
        clone.find('.username').text(user);
        if (user === username) {
            clone.find('a').show();
        } else {
            let option = $('<option>')
            option.attr('value', user);
            pmUserList.append(option);
            groupUserList.append($('<option>' + user + '</option>'));
        }
        userList.append(clone);
    }
});

socket.on('message', function (received) {
    let {conversationId, message} = received;

    if (conversationId === 'global') {
        data.globalMessages.push(message);
    } else {
        data.conversations[conversationId]['messages'].push(message);
    }

    if (conversationId === currentConversationId) {
        $('.messages-list').prepend(buildMessage(message));
    } else {
        //TODO New message indicator
        $('#' + conversationId).addClass('new-message');
    }
});

socket.on('new-conversation', function (received) {
    let {conversationId, conversation} = received;
    data.conversations[conversationId] = conversation;
    populateChatsList();
    populateMessageList();
    if (currentConversationId !== conversationId) {
        $('#' + conversationId).addClass('new-message');
    }
});

function logout() {
    eraseCookie('username');
    location.reload();
}

function populateChatsList() {
    let convList = $('#chat-list');
    convList.empty();

    //TODO Sort by last message timestamp & display content
    Object.keys(data.conversations).forEach(convId => {
        let conv = data.conversations[convId];
        let el = $('<div class="conversation-item"></div>');
        el.attr('id', convId);
        if (convId === currentConversationId) {
            el.addClass('active');
        }
        let name = conv.name;
        if (name === '__private_chat__') {
            // If this is a private chat between 2 persons, use the other person name as a conversation name
            name = conv.participants.filter(user => user !== username)[0];
        }
        el.text(name);
        convList.append(el);
    })
}

function populateMessageList() {
    $('#current-conv-title').text(currentConversationId === 'global' ? 'Global room' : $('#' + currentConversationId).text());

    let msgList = $('.messages-list');
    msgList.empty();
    let messages = currentConversationId === 'global' ? data.globalMessages : data.conversations[currentConversationId].messages;
    messages.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
    messages.forEach(msg => {
        msgList.append(buildMessage(msg));
    });
}

function buildMessage(message) {
    let clone = $('#models .msg').clone();
    clone.find('.msg-sender').text(message.sender);
    clone.find('.msg-content').text(message.content);
    clone.find('.msg-timestamp').text(formatTimestamp(message.timestamp));

    let css = message.sender === username ? 'msg-sent' : 'msg-received';
    clone.addClass(css);
    return clone;
}

function formatTimestamp(timestamp) {
    let date = new Date();
    date.setTime(timestamp);

    return leadingZero(date.getDay()) + '/' + leadingZero(date.getMonth()) + '/' + date.getFullYear() + ' - ' + date.getHours() + ':' + leadingZero(date.getMinutes());
}

function leadingZero(number) {
    return number < 10 ? '0' + number : number;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}