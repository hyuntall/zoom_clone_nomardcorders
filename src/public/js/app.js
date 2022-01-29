const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true

let roomName;

function addMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleNicknameSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#name input");
    socket.emit("nickname", input.value);
}

function handleMessageSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName,() => {
        addMessage(`You: ${value}`);
    });
    input.value = "";
}

function showRoom(){
    welcome.hidden = true;
    room.hidden = false;
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const nameForm = room.querySelector('#name');
    const msgForm = room.querySelector("#msg");
    nameForm.addEventListener("submit", handleNicknameSubmit);
    msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event){
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user) => {
    addMessage(`${user}님이 접속하셨습니다.`);
})

socket.on("bye", (user) =>{
    addMessage(`${user}님이 떠나셨습니다.`);
})

socket.on("new_message", addMessage);