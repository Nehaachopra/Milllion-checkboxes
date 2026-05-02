import http from 'http';
import 'dotenv/config';
import app from './app.js';
import connectDB from './db.js';
import {verifyMail} from "./common/mail/mail.js"

const PORT = process.env.PORT || 8000;

async function main() {
  try {
    await connectDB();
    await verifyMail();

    const server = http.createServer(app);

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