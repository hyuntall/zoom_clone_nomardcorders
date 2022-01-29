const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

function backEndDone(msg){
    console.log(msg);
}

function handleRoomSubmit(event){
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", {payload: input.value}, backEndDone);
    input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);