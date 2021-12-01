// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

let socket = io();
let user = null;
let currentConversationId = 'global';
let conversations = [];
let onlineUsers = [];

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

$(document).ready(() => {

    // ====== LOGIN ======

    let inputUsername = $('#input-username');
    let inputPassword = $('#input-password');

    $('#btn-login').click(function () {
        login(inputUsername.val(), inputPassword.val());
    });

    inputPassword.keypress(function (ev) {
        if (ev.keyCode === 13) {
            $('#btn-login').click();
        }
    });

    // ====== SIGNUP ======

    let inputUsernameSignup = $('#input-username-signup');
    let inputPasswordSignup = $('#input-password-signup');

    $('#btn-signup').click(function () {
        signup(inputUsernameSignup.val(), inputPasswordSignup.val());
    });

    inputPasswordSignup.keypress(function (ev) {
        if (ev.keyCode === 13) {
            $('#btn-signup').click();
        }
    });

    // Open file selector on image click
    $('#profile-pic-preview').click(function () {
        $('#profilePicInput').click();
    })

    // Preview uploaded image
    $('#profilePicInput').change(function () {
        if (this.files && this.files[0]) {
            let reader = new FileReader();

            reader.onload = function (e) {
                let imgPreview = $('#profile-pic-preview');
                imgPreview.attr('src', e.target.result);
                imgPreview.show();
            };

            reader.readAsDataURL(this.files[0]);
        }
    });

    // ===== AUTO LOGIN ======
    let jwt = localStorage.getItem("accessToken");
    if (jwt !== null) {
        socket.emit('connect-jwt', {jwt: jwt, id: socket.id});
    }

    // ===== MESSAGE SOCKET =====

    $('#chat-list-parent').on('click', '.conversation-item', function () {
        $('.conversation-item').removeClass('active');
        $(this).addClass('active').removeClass('new-message');

        currentConversationId = $(this).attr('id');
        populateMessageList();
        //TODO Show participants list
    });

    $('#btn-send').click(function () {
        let inputMsg = $('#input-msg');
        let content = inputMsg.val().trim();

        if (content !== '') {
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
        let recipientName = $('#inputPMUsername').val();
        let recipient = getUserByUsername(recipientName);

        if (recipient && recipient._id !== user._id) {
            let participants = [recipient._id, user._id];
            participants.sort();

            let privateConv = getPrivateConvWith(recipient._id);
            console.log(privateConv);

            if (privateConv) {
                // Click on the conversation in the sidebar to load it
                $('#' + privateConv._id.toString()).click();
            } else {
                // Create the new conversation by sending a first message in it
                socket.emit('new-direct-message', {
                    participants: participants,
                });
            }

            let modal = bootstrap.Modal.getInstance(document.getElementById('privateMessageModal'));
            modal.hide();
        } else {
            notFoundError.show();
        }
    });

    $('#input-group-users').change(function () {
        let selected = $('#input-group-users option:selected');
        let list = $('#group-selected-user-list');

        let badge = $('<span class="badge rounded-pill bg-primary me-2" data-id="' + selected.attr('data-id') + '">' + selected.text() + ' <i class="bi bi-x"></i></span>');
        badge.click(function () {
            $('#input-group-users').append('<option data-id="' + badge.attr('data-id') + '">' + badge.text() + '</option>');
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

        let participants = [user._id];
        $('#group-selected-user-list').children().each(function () {
            participants.push($(this).attr('data-id'));
        });

        socket.emit('create-group', {
            name: groupName,
            participants: participants,
        });

        inputGroupName.val('');
        let modal = bootstrap.Modal.getInstance(document.getElementById('newGroupModal'));
        modal.hide();
    });
});

function login(usernameInput, passwordInput) {
    // Get the input of username
    let username = usernameInput.trim().replace(/ /g, '-');
    // Check if it's not blank
    if (username === '' || passwordInput === '') {
        toast('Error', 'Invalid credentials', 'danger');
        return;
    }

    let json = {
        username: username,
        password: passwordInput
    };

    $.post('/api/auth/signin', json)
        .done(function (data) {
            user = data;
            localStorage.setItem('accessToken', data.accessToken);
            socket.emit('connect-jwt', {jwt: data.accessToken, id: socket.id});
        })
        .fail(function (jqXHR) {
            let json = JSON.parse(jqXHR.responseText);
            toast('Error', json.message, 'danger');
        });
}

function signup(usernameInput, passwordInput) {
    // Get the input of username
    let username = usernameInput.trim().replace(/ /g, '-');
    // Check if it's not blank
    if (username === '' || passwordInput === '') {
        toast('Error', 'Invalid credentials', 'danger');
        return;
    }

    let json = {
        username: username,
        password: passwordInput
    };

    $.post('/api/auth/signup', json)
        .done(function (data) {
            console.log(data);
            toast('Success', data.message, 'success');
            $('#input-username-signup').text('');
            $('#input-password-signup').text('');
            $('#input-username').text(data.username);
        })
        .fail(function (jqXHR) {
            let json = JSON.parse(jqXHR.responseText);
            toast('Error', json.message, 'danger');
        });
}

function logout() {
    localStorage.clear();
    location.reload();
}

socket.on('successful-login', function (received) {
    conversations = received.conversations;
    user = received.user;
    toast('Success', 'You logged in as ' + user.username, 'success');

    // Build conversations list
    populateChatsList();

    populateMessageList();

    // Show chat page
    $('#login-page').hide();
    $('#main-page').show();
});

socket.on('user-list', function (data) {
    onlineUsers = data;
    let userList = $('#user-list');
    let pmUserList = $('#usernameOptions');
    let groupUserList = $('#input-group-users');
    userList.empty();
    pmUserList.empty();
    groupUserList.empty();
    groupUserList.append('<option selected>Select user</option>');

    data.sort();

    for (const u of data) {
        let clone = $('#models .user-item').clone();
        clone.find('.username').text(u.username);
        if (user._id === u._id) {
            clone.find('a').show();
        } else {
            let option = $('<option>')
            option.attr('value', u.username);
            option.attr('data-id', u._id);
            pmUserList.append(option);
            groupUserList.append($('<option data-id="' + u._id + '">' + u.username + '</option>'));
        }
        userList.append(clone);
    }
});

socket.on('message', function (received) {
    let {conversationId, message} = received;

    console.log('received message');

    getConvById(conversationId.toString()).messages.push(message);

    if (conversationId.toString() === currentConversationId) {
        $('.messages-list').prepend(buildMessage(message));
    } else {
        $('#' + conversationId).addClass('new-message');
    }
});

socket.on('new-conversation', function (received) {
    let {conversation} = received;
    conversations.push(conversation);
    populateChatsList();
    populateMessageList();
    if (currentConversationId !== conversation._id) {
        $('#' + conversation._id).addClass('new-message');
    }
});

socket.on('error', function (received) {
    console.log(received.message);
});

socket.io.on("disconnect", () => {
    toast('Disconnected', "You're disconnected from the server", 'danger');
});

socket.io.on("reconnect_attempt", () => {
    toast('Disconnected', 'Trying to reconnect...', 'danger');
});

socket.io.on("reconnect", () => {
    let jwt = localStorage.getItem("accessToken");
    if (jwt !== null) {
        socket.emit('connect-jwt', {jwt: jwt, id: socket.id});
    }
});

function getConvById(id) {
    return conversations.find(value => value._id === id);
}

function getCurrentConv() {
    return conversations.find(value => value._id === currentConversationId);
}

function getGlobalConv() {
    return conversations.find(value => value.isGlobal);
}

function getPrivateConvWith(uId) {
    return conversations.find(value => value.participants.includes(uId.toString()) && value.participants.length === 2 && !value.isGlobal);
}

function getUserByUsername(uname) {
    return onlineUsers.find(value => value.username === uname);
}

function getUserById(id) {
    let jqXHR = $.ajax({
        url: '/api/user/findById',
        data: {
            id: id
        },
        async: false,
        dataType: 'json',
        beforeSend: function (req) {
            req.setRequestHeader('x-access-token', localStorage.getItem('accessToken'));
        }
    });

    let json = JSON.parse(jqXHR.responseText);
    if (!json.username) {
        return null;
    }
    return json;
}

function populateChatsList() {
    let convList = $('#chat-list');
    convList.empty();

    //TODO Sort by last message timestamp & display content
    conversations.forEach(conv => {
        if (conv.isGlobal) {
            $('#global').attr('id', conv._id.toString());
            if (currentConversationId === 'global') {
                currentConversationId = conv._id.toString();
            }
        } else {
            let el = $('<div class="conversation-item"></div>');
            el.attr('id', conv._id.toString());
            if (conv._id === currentConversationId) {
                el.addClass('active');
            }
            let name = conv.name;
            if (name === '__private_chat__') {
                // If this is a private chat between 2 persons, use the other person name as a conversation name
                name = getUserById(conv.participants.filter(uId => uId !== user._id)[0]).username;
            }
            el.text(name);
            convList.append(el);
        }
    })
}

function populateMessageList() {
    let conv = getCurrentConv();

    $('#current-conv-title').text($('#' + conv._id).text());

    let msgList = $('.messages-list');
    msgList.empty();
    let messages = conv.messages;
    messages.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
    messages.forEach(msg => {
        msgList.append(buildMessage(msg));
    });

    let groupUserListContainer = $('#group-user-list-container');
    groupUserListContainer.hide();
    if (!conv.isGlobal) {
        if (conv.participants.length > 2) {
            groupUserListContainer.show();
            let list = $('#group-user-list');
            list.empty();
            conv.participants.forEach(pId => {
                if (pId in onlineUsers) {
                    let clone = $('#models .user-item').clone();
                    clone.find('.username').text();
                    list.append(clone);
                }
            });
        }
    }
}

function buildMessage(message) {
    if (message.isSpecial) {
        return $('<div class="special-msg">' + message.senderName + ' has ' + message.content + ' the chat</div>');
    }

    let clone = $('#models .msg').clone();
    clone.find('.msg-sender').text(message.senderName);
    clone.find('.msg-timestamp').text(formatTimestamp(message.timestamp));
    if (message.isUpload) {
        //TODO Make a better preview of files
        let parts = message.content.split('/');
        let fileName = parts[parts.length - 1];
        clone.find('.msg-content').html('<a target="_blank" href="' + message.content + '">' + fileName + '</a>');
    } else {
        clone.find('.msg-content').text(message.content);
    }

    let css = message.sender === user._id ? 'msg-sent' : 'msg-received';
    clone.addClass(css);
    return clone;
}