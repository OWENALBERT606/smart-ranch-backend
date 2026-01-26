require("dotenv").config();

import express from "express";
import userRouter from "./routes/users";
import authRouter from "./routes/auth";
import farmRouter from "./routes/farms";
import farmMemberRouter from "./routes/member";
import paddockRouter from "./routes/paddocks";



const cors = require("cors");
const app = express();
app.use(cors());
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`); 
});

app.use("/api/v1", userRouter); 
app.use("/api/v1/auth",authRouter);
app.use("/api/v1/farms",farmRouter);
app.use("/api/v1/farms", farmMemberRouter);
app.use("/api/v1", paddockRouter); // Add paddock routes















