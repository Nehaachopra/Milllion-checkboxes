import http from 'http';
import 'dotenv/config';
import app from './app.js';
import {Server} from 'socket.io';
import { redis, publisher, subscriber } from './redis.js';
import { RateLimiterRedis } from "rate-limiter-flexible";
import connectDB from './db.js';

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    await connectDB();

    const server = http.createServer(app);

    const io = new Server(server);
    io.on('connection', (socket) => {
      console.log(`A new socket has connected: ${socket.id}`);

      const rateLimiter = new RateLimiterRedis({
        storeClient: redis,
        points: 1,
        duration: 5,
      })

      socket.on('client:updated', async(data) => {
        // console.log(await redis.keys("*"));
    
        try {
          await rateLimiter.consume(socket.id);
          try{
            if (data.checked) {
              await redis.sadd('checkboxes', data.index);
            } else {
              await redis.srem('checkboxes', data.index);
            }

            await publisher.publish("redis:updated", JSON.stringify(data));
          }
          catch(err) {
            console.error(err);
            socket.emit("server:error", { error: "Internal error" });
            return;
          }
        }
        catch(err) {
          socket.emit("server:warning", {
            error: "Too many requests. Try later.",
            index: data.index
          });
          return;
        }
      })
    })

    subscriber.subscribe('redis:updated');

    subscriber.on("message", (channel, message) => {
      if (channel !== "redis:updated") return;
      const data = JSON.parse(message);
      io.emit("server:updated", data);
    })

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } 
  
  catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}

main();