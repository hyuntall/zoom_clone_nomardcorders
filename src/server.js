//BackEnd에서 구동
import http from "http";
import SocketIO from "socket.io";
import express from "express";

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

//websocket 서버 생성
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) =>{
    socket["nickname"] = "Admin";
    socket.onAny((event) =>{
        console.log(`Socket Event: ${event}`);
    })
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome", socket.nickname);
    });
    socket.on("disconnecting", () =>{
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname));
    });
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("nickname", (nickname) => socket["nickname"] = nickname);
})

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);