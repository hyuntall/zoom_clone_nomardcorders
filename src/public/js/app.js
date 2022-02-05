const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");
const call = document.getElementById("call");

call.hidden = true;

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const peerFace = document.getElementById("peerFace");

room.hidden = true

let roomName;

let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;


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

async function showRoom(newCount){
    welcome.hidden = true;
    room.hidden = false;
    call.hidden = false;
    await getMedia();
    makeConnection();
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    const nameForm = room.querySelector('#name');
    const msgForm = room.querySelector("#msg");
    nameForm.addEventListener("submit", handleNicknameSubmit);
    msgForm.addEventListener("submit", handleMessageSubmit);
}

async function handleRoomSubmit(event){
    event.preventDefault();
    const input = form.querySelector("input");
    await showRoom()
    socket.emit("enter_room", input.value);
    roomName = input.value;
    input.value = "";
}

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId
            option.innerText = camera.label;
            if(currentCamera.label == camera.label){
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    } catch (e){
        console.log(e);
    }
    
}

async function getMedia(deviceId){
    const initialConstrains = {
        audio: true,
        video: { fancingMode: "user"},
    };
    const cameraConstrains = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstrains : initialConstrains
        );
        myFace.srcObject = myStream;
        if(!deviceId){
            await getCameras()
        }
    } catch (e){
        console.log(e);
        socket.emit("error", e.toString());
    }
}


form.addEventListener("submit", handleRoomSubmit);

function handleMuteClick(){
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    if(!muted){
        muteBtn.innerText = "UnMute";
        muted = true;
    } else{
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick(){
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    if(cameraOff){
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else{
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange(){
    await getMedia(cameraSelect.value);
    if(myPeerConnection){
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

function handleIce(data){
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data){
    console.log("got an stream from my peer");
    console.log("Peers' Stream ", data.stream);
    console.log("My Stream ", myStream);
    peerFace.srcObject = data.streams[0];
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// Socket Code


socket.on("welcome", async (user, newCount) => {
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${user}님이 접속하셨습니다.`);
    const offer = await myPeerConnection.createOffer();
    console.log(offer);
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
    console.log("sent the offer");
})

socket.on("bye", (user, newCount) =>{
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${user}님이 떠나셨습니다.`);
})

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";
    if(rooms.length === 0){
        roomList.innerHTML = "";
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});

socket.on("offer", async (offer) => {
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("receivd candidate");
    myPeerConnection.addIceCandidate(ice);
})

// RTC code
function makeConnection(){
    myPeerConnection = new RTCPeerConnection({
            iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com.19302",
                    "stun:stun1.l.google.com.19302",
                    "stun:stun2.l.google.com.19302",
                    "stun:stun3.l.google.com.19302",
                    "stun:stun4.l.google.com.19302",
                ]
            }
        ]
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("track", handleAddStream);
    myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
}