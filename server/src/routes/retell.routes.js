import { Router } from "express";
import { createCall } from "../controllers/retell.controller.js";


const router = Router()

router.post("/create-call", createCall)

export default router;