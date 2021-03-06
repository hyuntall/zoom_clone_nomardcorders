import http from "http";
import https from "https";
import {Server} from "socket.io";
import {instrument} from "@socket.io/admin-ui";
import express from "express";
import fs from "fs";

const app = express();

//pug를 뷰 엔진으로 설정
app.set('view engine', 'pug');
//express에 템플릿 위치 지정
app.set("views", __dirname + "/views");
// 유저에게 공유 가능한 public url 생성
app.use("/public", express.static(__dirname + "/public"));
// home.pug를 render하는 route handler
app.get("/", (req, res) => res.render("home"));
// 다른 url 사용하지 않음
app.get("/*", (req,res) => res.redirect("/"));

//letsencrypt 인증서 경로
const options = {
	ca: fs.readFileSync('../fullchain.pem'),
	key: fs.readFileSync('../privkey.pem'),
	cert: fs.readFileSync('../cert.pem')
};

//websocket 서버 생성
const httpServer = http.createServer(app);
const httpsServer = https.createServer(options, app);
const wsServer = new Server(httpsServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(wsServer, {
    auth: false,
});

function publicRooms(){
    const {
        sockets: {
            adapter: { sids, rooms },
        },
    } = wsServer;
    //const sids = wsServer.sockets.adapter.sids;
    //const rooms = ws.wsServer.sockets.adapter.rooms;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if(sids.get(key) === undefined){
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) =>{
    socket.on("enter_room", (roomName, userName, done) => {
        socket["userName"] = userName;
        socket.join(roomName);
        done(countRoom(roomName));
        socket.to(roomName).emit("welcome", socket.userName, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    });

    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.userName}: ${msg}`);
        done();
    });

    socket.on("offer", (offer, roomName) => {
        console.log
        socket.to(roomName).emit("offer", offer);
    });

    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });

    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    })

    socket.on("disconnecting", () =>{
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.userName, countRoom(room) - 1));
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    })
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
httpsServer.listen(443, handleListen);
