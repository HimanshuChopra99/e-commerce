import { Router } from 'express'
import { createCall, handleFunction } from '../controllers/retell.controller.js'

const router = Router()

router.post('/create-call', createCall)
router.post('/function',    handleFunction)

export default router