const { createServer } = require("http");
const { Server } = require("socket.io");

const httpSrerver = createServer();
const io = new Server(httpSrerver, {
  cors: { origin: "*" },
});
const gamesState = [];
io.on("connection", (socket) => {
  socket.on("leave-game", () => {
    console.log("user left");
    const rooms = io.sockets.adapter.rooms;
    rooms.forEach((val, key) => {
      if (key.includes("game")) {
        if (val.has(socket.id)) {
          io.to(key).emit("game-ended", "opponent disconnected ");
          socket.leave(key);
        }
      }
    });
  });

  socket.on("join-game", () => {
    console.log("user join game");
    const rooms = io.sockets.adapter.rooms;

    let isFound = false;
    rooms.forEach((val, key) => {
      if (key.includes("game")) {
        if (val.size == 1) {
          socket.join(key);
          isFound = true;
          io.to(socket.id)
            .to(key)
            .emit("game-found", { message: `match found`, room: key });
        }
      }
    });
    if (!isFound) {
      let roomId = `game/${Math.random()
        .toString(36)
        .substring(2, 8 + 2)}`;
      socket.join(roomId);

      io.to(socket.id).emit("room-created", {
        message: `waiting for player`,
        room: roomId,
      });
    }
    //console.log(rooms);
  });

  socket.on("game-data", (data) => {
    const newState = {
      userId: socket.id,
      roomId: data.room,
      choise: data.choise,
    };
    const gameState = checkAndGetGameState(newState);
    if (gameState) {
      if (gameState.choise === newState.choise)
        socket.to(data.room).emit("game-result", {
          message: `Draw, they choose ${newState.choise}`,
        });
      else {
        if (
          (gameState.choise === "scissors" && newState.choise === "paper") ||
          (gameState.choise === "paper" && newState.choise === "rock") ||
          (gameState.choise === "rock" && newState.choise === "scissors")
        ) {
          io.to(gameState.userId).emit(
            "game-result",
            `Win, they choose ${newState.choise}`
          );
          io.to(newState.userId).emit(
            "game-result",
            `Lost, they choose ${gameState.choise}`
          );
        } else {
          io.to(newState.userId).emit(
            "game-result",
            `Win, they choose ${gameState.choise}`
          );
          io.to(gameState.userId).emit(
            "game-result",
            `Lost, they choose ${newState.choise}`
          );
        }
      }
    } else {
      gamesState.push(newState);
      io.to(socket.id).emit("game-result", "wait for other player");
    }
  });
  socket.on("disconnecting", () => {
    console.log("user disconnected");
  });
});

function checkAndGetGameState(newState) {
  for (let index = 0; index < gamesState.length; index++) {
    if (gamesState[index].roomId === newState.roomId) {
      return gamesState[index];
    }
  }
  return null;
}

httpSrerver.listen(8080, () => {
  console.log("server is on");
});
