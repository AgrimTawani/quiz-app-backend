const { Server } = require("socket.io");
const http = require("http");
const fs = require("fs");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Update to match your client origin if needed
    methods: ["GET", "POST"],
  },
});

// Store user scores in a room (you can store it in memory for simplicity)
const roomScores = {};

const getQuestions = () => {
  const rawData = fs.readFileSync("questions.json"); // Assuming the file is named 'questions.json'
  return JSON.parse(rawData); // Parse the JSON data from the file
};

io.on("connection", (socket) => {
  console.log("User connected...");

  // Handle selecting a subject and joining a room
  socket.on("select_subject", (subjectId) => {
    console.log("Selected subject:", subjectId);
    socket.join(subjectId);
    const room = io.sockets.adapter.rooms.get(subjectId);
    if (room) {
      console.log(`Number of users in room ${subjectId}: ${room.size}`);
      if (room.size >= 2) {
        io.to(subjectId).emit("room_full", true); // Notify room is full
      }
    }
    socket.emit("joined_room", `Joined room ${subjectId}`);
  });

  // Handle client requesting questions dynamically
  socket.on("request_game_questions", (data) => {
    try {
      const { room } = data;
      console.log("Request for questions received from room:", room);

      const allQuestions = getQuestions();
      const subjectQuestions = allQuestions[room] || [];

      socket.emit("game_questions", subjectQuestions);
    } catch (error) {
      console.error("Error processing game questions request:", error);
      socket.emit("error", { message: "Unable to fetch questions. Please try again." });
    }
  });

  // Handle score submission
  socket.on("submit_score", (data) => {
    const { room, score } = data;
    console.log(`Score received for room ${room}:`, score);
  
    // Store the score for this user in the room
    if (!roomScores[room]) {
      roomScores[room] = []; // Initialize array for the room if not already
    }
  
    // Add the user's score to the list
    roomScores[room].push({ socketId: socket.id, score });
  
    // Check if all players have submitted their scores
    const roomPlayers = io.sockets.adapter.rooms.get(room)?.size || 0;
    if (roomScores[room].length === roomPlayers) {
      // Log scores of both users and determine the higher score
      const [player1, player2] = roomScores[room];
      console.log(`Player 1 (ID: ${player1.socketId}) Score: ${player1.score}`);
      console.log(`Player 2 (ID: ${player2.socketId}) Score: ${player2.score}`);
  
      let resultMessage;
      if (player1.score > player2.score) {
        resultMessage = `${player1.socketId}`;
        console.log(resultMessage);
      } else if (player2.score > player1.score) {
        resultMessage = `${player2.socketId}`;
        console.log(resultMessage);
      } else {
        resultMessage = "It's a tie!";
      }
  
      // Emit the result to both players
      // Emit the result to both players in the room
    io.to(room).emit("result", { resultMessage, room });
  
      // Clear the room scores after logging the results
      roomScores[room] = [];
    }
  });
  


});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
