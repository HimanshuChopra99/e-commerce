import * as retellService from '../services/retell.service.js'
import { dispatch } from '../handlers/retell-functions.js'
import { logger } from '../config/logger.js'

export const createCall = async (req, res) => {
  try {
    // 1. Safe destructuring in case req.body is undefined
    const { userId, userName } = req.body || {}

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        message: 'UserId or userName is missing',
      })
    }

    const session = await retellService.createCall(userId, userName)

    // 2. HTTP 201 is standard for creating resources (or keep 200)
    return res.status(201).json({
      success: true,
      session,
    })
  } catch (error) {
    // 3. Log the error on the server for debugging
    console.error('Error in createCall:', error)

    // Fixed syntax error here: changed )} to })
    return res.status(500).json({
      success: false,
      message: 'Failed to create call session',
      error: error.message,
    })
  }
}

export const handleFunction = async (req, res) => {
  try {
    const function_name = req.body.function_name || req.body.name || req.body.func_name
    const function_call_id = req.body.function_call_id || req.body.tool_call_id || req.body.call_id || req.body.id || req.body.call?.call_id

    if (!function_name) {
      return res.status(400).json({ error: 'function_name is required' })
    }

    const args = req.body.args || req.body.parameters || req.body.arguments || {}
    const userId = req.body.metadata?.userId || req.body.call?.metadata?.userId || req.body.userId || 'guest'

    // Console Log 1: What user send to Retell / Tool Call received
    console.log(`\n📥 [USER -> RETELL] Tool Call: "${function_name}"`)
    console.log(`   Arguments:`, JSON.stringify(args))

    const result = await dispatch(function_name, args, userId)

    // Console Log 2: What Retell reply to backend and user
    if (result?.message) {
      console.log(`🎙️ [RETELL -> USER] Spoken Response: "${result.message}"`)
    }
    console.log(`📤 [BACKEND -> RETELL] Tool Result:`, JSON.stringify(result))

    return res.status(200).json({
      function_call_id: function_call_id || 'call_id',
      result: typeof result === 'string' ? result : JSON.stringify(result),
    })
  } catch (err) {
    logger.error({ err: err.message }, '[RetellController] handleFunction error')
    return res.status(200).json({
      function_call_id: req.body?.function_call_id || req.body?.call_id || req.body?.call?.call_id || 'call_id',
      result: JSON.stringify({ success: false, message: 'Internal error. Please try again.' }),
    })
  }
}