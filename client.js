let socket = io();
//HTML parameters
let messages = document.getElementById('messages');
let usernames = document.getElementById('usernames');
let conversations = document.getElementById("conversations");
let form = document.getElementById('form');
let input = document.getElementById('input');
let formConversation = document.getElementById('formConversation');
let createConversation = document.getElementById("createConversation");
let ulMessages = document.getElementById("messages");
let chat = document.getElementById("chat");
let userList;
let conversationList = [];

//Popup with username parameters
let url = window.location.search;
let urlParams = new URLSearchParams(url);
let username;

//If we have the get parameter user with the value taken
if (urlParams.get("user") === "taken") {
    //Display the popup and ask to enter a new username
    popup = prompt("Username already taken, please enter another username:", "");
} else {
    //If we don't have this parameter we display the basic popup
    popup = prompt("Enter a username:", "");
}
//If the popup is empty the username will be "Anonymous user"
if (popup === '') {
    username = "Anonymous user";
} else {
    username = popup;
}

//Call the server functions 'user connected' with the username and socket id, and 'new username' to update the user list
socket.emit('user connected', {user: username, id: socket.id});
socket.emit('new username', username);

//Verify if a message is sent and call the function 'chat message'
form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

//Display the message in the chat with the username and the time
socket.on('chat message', function (data) {
    let date = new Date();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let seconds = date.getSeconds();
    let fullTime = hour + ':' + minute + ':' + seconds;

    let item = document.createElement('li');

    item.innerHTML = "<div>\n" +
        "            <span class=\"message-time\">" + fullTime + " by " + data.user + "</span>\n" +
        "        </div>\n" +
        "        <div>" + data.msg + "</div>";
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

//Display a message when a user disconnected
socket.on('user disconnected', function (msg) {
    let item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

//Display a message when a new user is connected
socket.on('user connected', function (msg) {
    let item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

//Refresh the user list
socket.on('new username', function (msg) {
    userList = msg;
    usernames.innerHTML = "";
    msg.forEach((element) => {
        let item = document.createElement('li');
        item.textContent = element;
        usernames.appendChild(item);
    });
});

//Reload the page with the parameters user=taken
socket.on('username taken', function () {
    window.location.href = "?user=taken";
});

//Create the new conversation
formConversation.addEventListener('submit', function (e) {
    e.preventDefault();
    let nameConversation = document.getElementById('nameConversation');
    let userConversationList = [];
    userConversationList.push(username);

    userList.forEach((element) => {
        if (element !== username) {
            let checkedUser = document.getElementById(element);
            if (checkedUser.checked) {
                userConversationList.push(checkedUser.value);
            }
        }
    });

    if (nameConversation.value) {
        socket.emit('new conversation', {users: userConversationList, name: nameConversation.value});
        nameConversation.value = "";
    }
});

//Add the conversation to the list and display it
socket.on('new conversation', function (msg) {
    conversationList.push(msg);
    let item = document.createElement('li');
    let button = document.createElement('button');
    button.textContent = msg.name;
    button.onclick = function () {
        showConversation(msg.name);
    };
    item.appendChild(button);
    conversations.appendChild(item);

    item = document.createElement('ul');
    item.id = msg.name;
    item.style.cssText = "display: none;";
    let form = document.createElement('form');
    form.id = "form";
    form.action = "";
    form.innerHTML = "" +
        "<input id=\"input\" autoComplete=\"off\"/>\n" +
        "                <button>Send</button>";
    item.appendChild(form);
    chat.appendChild(item);
});

function showConversation(name) {
    conversationList.forEach((element) => {
        let conv = document.getElementById(element.name);
        conv.style.display = "none";
    });
    ulMessages.style.display = "none";
    createConversation.style.display = "none";
    let ul = document.getElementById(name);
    ul.style.display = "";
}

function newConversation() {
    formConversation.innerHTML = "";
    ulMessages.style.display = "none";
    conversationList.forEach((element) => {
        let conv = document.getElementById(element.name);
        conv.style.display = "none";
    });
    createConversation.style.display = "";
    let br = document.createElement('br');

    userList.forEach((element) => {
        if (element !== username) {
            let input = document.createElement('input');
            input.type = "checkbox";
            input.id = element;
            input.name = element;
            input.value = element;
            input.textContent = element;
            createConversation.appendChild(input);
            formConversation.appendChild(input);

            let label = document.createElement('label');
            label.htmlFor = element;
            label.textContent = element;
            formConversation.appendChild(label);
            let br = document.createElement('br');
            formConversation.appendChild(br);
        }
    });

    let label = document.createElement('p');
    label.textContent = "Name of the conversation : ";
    label.style.margin = '0';
    formConversation.appendChild(label);
    let input = document.createElement('input');
    input.id = "nameConversation";
    formConversation.appendChild(input);
    formConversation.appendChild(br);

    let button = document.createElement('button');
    button.textContent = "Create";
    formConversation.appendChild(button);
}
