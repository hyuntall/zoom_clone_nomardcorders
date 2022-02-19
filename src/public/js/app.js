const socket = io();

let myName = "Admin";
let roomName;
let myPeerConnection;
let myDataChannel;
let muted = true;
let cameraOff = true;

// welcome
const welcome = document.getElementById("welcome");
const nameForm = welcome.querySelector("form");

// wating room
const watingRoom = document.getElementById("watingRoom");
const destination = watingRoom.querySelector("form");
watingRoom.hidden = true;

// chatting room
const room = document.getElementById("room");
const chatForm = room.querySelector("form");
room.hidden = true;

// webcam
const myStreamDiv = document.getElementById("myStream")
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
// peerWebCam
const peerStreamDiv = document.getElementById("peerStream")
const peerFace = document.getElementById("peerFace");
const peerMuteBtn = document.getElementById("peerMute");

// 닉네임 설정 함수
function handleNameSubmit(event){
    event.preventDefault();
    const name = nameForm.querySelector("#settingInput").value;
    myName = name;
    welcome.hidden = true;
    watingRoom.hidden = false;
    yourName = document.getElementById("yourName");
    yourName.innerText = `Hello ${myName}!!`
}

nameForm.addEventListener("submit", handleNameSubmit);

// 채팅방 생성 함수
async function showRoom(newCount){
    watingRoom.hidden = true;
    room.hidden = false;
    
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
}

// 채팅방 입장 함수
async function handleRoomSubmit(event){
    event.preventDefault();
    await getMedia();
    makeConnection();
    roomName = destination.querySelector("input").value;
    socket.emit("enter_room", roomName, myName, showRoom);
    yourName.hidden = true;
    const title = document.getElementById("title");
    title.hidden = true;
}

destination.addEventListener("submit", handleRoomSubmit);

// 메시지 전송 함수
function addMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function addMyMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    li.id = "myMessage"
    ul.appendChild(li);
}

function handleMessageSubmit(event){
    event.preventDefault();
    const input = chatForm.querySelector("input");
    const msg = input.value;
    //myDataChannel.send(msg);
    socket.emit("new_message", input.value, roomName,() => {
        addMyMessage(`You: ${msg}`);
    });
    input.value = "";
}

chatForm.addEventListener("submit", handleMessageSubmit);

// 비디오스트림
async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        myStream.getVideoTracks().forEach((track) => (track.enabled = false));
        myStream.getAudioTracks().forEach((track) => (track.enabled =false));
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
        cameraBtn.innerText = "Camera Off";
        cameraOff = false;
    } else{
        cameraBtn.innerText = "Camera On";
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

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// 피어커넥션
function handleIce(data){
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data){
    console.log("got an stream from my peer");
    console.log("Peers' Stream ", data.streams[0]);
    console.log("My Stream ", myStream);
    peerStreamDiv.hidden = false;
    peerFace.srcObject = data.streams[0];
    myStreamDiv.style.width = "50%"
}

function handleRemovePeer(){
    //myStreamDiv.style.width = "100%";
    myPeerConnection.close();
    myPeerConnection = null;
    peerStreamDiv.hidden=true;
    makeConnection();
}

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
    myStream.getTracks().forEach((track) => {
        myPeerConnection.addTrack(track, myStream)
    });
}

// socket code

socket.on("welcome", async (userName, newCount) => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", console.log);
    console.log("made data channel");
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${userName}님이 접속하셨습니다.`);
    const offer = await myPeerConnection.createOffer();
    console.log(offer);
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
    console.log("sent the offer");
})

socket.on("new_message", addMessage);

socket.on("bye", (user, newCount) =>{
    const h3 = document.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${user}님이 떠나셨습니다.`);
    handleRemovePeer();
})

socket.on("room_change", (rooms) => {
    const roomList = watingRoom.querySelector("ul");
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
    console.log(myPeerConnection);
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", console.log);
    });
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