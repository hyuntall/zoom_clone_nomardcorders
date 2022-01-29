//BackEnd에서 구동
import http from "http";
import WebSocket from "ws";
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

const handleListen = () => console.log(`Listening on http://localhost:3000`);

//websocket 서버 생성
const server = http.createServer(app);
const wss = new WebSocket.Server({ server })

const sockets = [];

// websocket에 연결 시 이벤트
wss.on("connection", (socket) => {
    sockets.push(socket);
    socket["nickname"] = "Anon";
    console.log("Connected to Browser");
    socket.on("close", () => console.log("DIsconnected from the Browser"));
    socket.on("message", (msg) => {
        const message = JSON.parse(msg.toString());
        switch(message.type){
            case "new_message":
                sockets.forEach(aSocket => aSocket.send(`${socket["nickname"]}: ${message.payload}`));
                break;
            case "nickname":
                socket["nickname"] = message.payload;
        }
    });
});

server.listen(3000, handleListen);