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

const server = http.createServer(app);
const wss = new WebSocket.Server({ server })

function handleConnection(socket) {
    console.log(socket);
}

wss.on("connection", handleConnection)

server.listen(3000, handleListen);